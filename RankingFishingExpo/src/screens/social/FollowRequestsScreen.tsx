import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert, RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store';
import { refreshUser, decrementPendingRequestsCount, setPendingRequestsCount } from '../../store/slices/authSlice';
import { colors, spacing, typography, borderRadius } from '../../theme';
import UserRow from '../../components/social/UserRow';
import {
  fetchPendingRequests, acceptFollowRequest, declineFollowRequest,
  sendFollowRequest, getFollowStatus,
} from '../../api/follows';
import { UserSearchResult } from '../../api/users';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export default function FollowRequestsScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.auth.user);

  const [requests, setRequests] = useState<UserSearchResult[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isRefreshing, setRefreshing] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set()); // ids en cours de traitement
  const [statusById, setStatusById] = useState<Map<string, 'accepted' | 'followed_back' | 'now_following'>>(new Map());
  const statusByIdRef = useRef(statusById);
  useEffect(() => { statusByIdRef.current = statusById; }, [statusById]);
  const [error, setError] = useState<string | null>(null);

  const userId = currentUser?.id;
  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setError(null);
      const data = await fetchPendingRequests(userId);

      // Merge : on garde les lignes déjà actionnées (accepted / followed_back / now_following)
      // même si elles ne sont plus dans le fetch (car la demande a été acceptée/déclinée côté serveur).
      setRequests((prev) => {
        const dataIds = new Set(data.map((u) => u.id));
        const keptActioned = prev.filter((u) =>
          statusByIdRef.current.has(u.id) && !dataIds.has(u.id)
        );
        return [...data, ...keptActioned];
      });
      dispatch(setPendingRequestsCount(data.length));

      // Re-vérifier le statut des lignes "followed_back" → si l'autre a accepté, on passe en "now_following"
      const followedBackIds = Array.from(statusByIdRef.current.entries())
        .filter(([, s]) => s === 'followed_back')
        .map(([id]) => id);

      for (const id of followedBackIds) {
        try {
          const status = await getFollowStatus(userId, id);
          if (status === 'following') {
            setStatusById((prev) => new Map(prev).set(id, 'now_following'));
          }
        } catch { /* ignore — l'utilisateur peut quitter pendant le check */ }
      }
    } catch (e: any) {
      setError(e?.message ?? 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, dispatch]);

  // Charge à l'arrivée sur l'écran ET à chaque re-focus (pour rafraîchir les chips "Demande envoyée")
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const markPending = (id: string, on: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  };

  const removeFromList = (id: string) => {
    setRequests((prev) => prev.filter((u) => u.id !== id));
  };

  const onAccept = async (requester: UserSearchResult) => {
    if (!currentUser || pendingIds.has(requester.id)) return;
    markPending(requester.id, true);
    try {
      await acceptFollowRequest(requester.id);
      // On garde la ligne dans la liste, on change juste son statut → bouton "Suivre en retour"
      setStatusById((prev) => new Map(prev).set(requester.id, 'accepted'));
      dispatch(refreshUser(currentUser.id));
      dispatch(decrementPendingRequestsCount());
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible d\'accepter la demande');
    } finally {
      markPending(requester.id, false);
    }
  };

  const onDecline = async (requester: UserSearchResult) => {
    if (!currentUser || pendingIds.has(requester.id)) return;
    markPending(requester.id, true);
    try {
      await declineFollowRequest(requester.id);
      removeFromList(requester.id);
      dispatch(decrementPendingRequestsCount());
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible de refuser la demande');
    } finally {
      markPending(requester.id, false);
    }
  };

  const onFollowBack = async (requester: UserSearchResult) => {
    if (!currentUser || pendingIds.has(requester.id)) return;
    markPending(requester.id, true);
    try {
      await sendFollowRequest(currentUser.id, requester.id);
      setStatusById((prev) => new Map(prev).set(requester.id, 'followed_back'));
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible d\'envoyer la demande');
    } finally {
      markPending(requester.id, false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={36} color={colors.error} />
        <Text style={styles.emptyText}>{error}</Text>
      </View>
    );
  }

  if (requests.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="checkmark-done-circle-outline" size={56} color={colors.textDisabled} />
        <Text style={styles.emptyTitle}>Aucune demande en attente</Text>
        <Text style={styles.emptyText}>
          Quand un pêcheur voudra te suivre, sa demande apparaîtra ici.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      data={requests}
      keyExtractor={(u) => u.id}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListHeaderComponent={
        <Text style={styles.header}>
          {requests.length} demande{requests.length > 1 ? 's' : ''} en attente
        </Text>
      }
      renderItem={({ item }) => {
        const status = statusById.get(item.id);
        const busy = pendingIds.has(item.id);

        let rightSlot: React.ReactNode;
        if (status === 'now_following') {
          rightSlot = (
            <View style={[styles.statusChip, styles.statusChipSuccess]}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={[styles.statusChipText, styles.statusChipTextSuccess]}>Abonné(e)</Text>
            </View>
          );
        } else if (status === 'followed_back') {
          rightSlot = (
            <View style={[styles.statusChip, styles.statusChipMuted]}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.statusChipText}>Demande envoyée</Text>
            </View>
          );
        } else if (status === 'accepted') {
          rightSlot = (
            <TouchableOpacity
              style={[styles.followBackBtn, busy && { opacity: 0.6 }]}
              onPress={() => onFollowBack(item)}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={14} color="#fff" />
                  <Text style={styles.followBackText}>Suivre en retour</Text>
                </>
              )}
            </TouchableOpacity>
          );
        } else {
          rightSlot = (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnAccept]}
                onPress={() => onAccept(item)}
                disabled={busy}
                activeOpacity={0.8}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="checkmark" size={18} color="#fff" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnDecline]}
                onPress={() => onDecline(item)}
                disabled={busy}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          );
        }

        return (
          <UserRow
            user={item}
            onPress={(uid) => navigation.navigate('UserProfile', { userId: uid })}
            rightSlot={rightSlot}
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  header: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    padding: spacing.md,
    fontSize: 11,
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
  btn: {
    width: 36, height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  btnAccept: { backgroundColor: colors.primary },
  btnDecline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    minHeight: 32,
  },
  followBackText: { ...typography.caption, color: '#fff', fontWeight: '700' },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
  },
  statusChipMuted: {
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipSuccess: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success + '40',
  },
  statusChipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  statusChipTextSuccess: { color: colors.success },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, padding: spacing.lg,
    backgroundColor: colors.background,
  },
  emptyTitle: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});

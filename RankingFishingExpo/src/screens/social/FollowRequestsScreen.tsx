import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  Alert, RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store';
import { refreshUser, decrementPendingRequestsCount, setPendingRequestsCount } from '../../store/slices/authSlice';
import { colors, spacing, typography } from '../../theme';
import { Button, EmptyState, ErrorState, IconButton, Skeleton } from '../../components/ui';
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
      <View style={styles.list} accessible accessibilityLabel="Chargement des demandes" accessibilityState={{ busy: true }}>
        {Array.from({ length: 4 }, (_, i) => (
          <View key={i} style={styles.skeletonRow}>
            <Skeleton width={44} height={44} radius={22} />
            <View style={styles.skeletonText}>
              <Skeleton width="45%" height={14} />
              <Skeleton width="70%" height={12} style={styles.skeletonGap} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <ErrorState
          title="Demandes indisponibles"
          message={`${error}\nVérifie ta connexion puis réessaie.`}
          onRetry={() => { setLoading(true); load(); }}
        />
      </View>
    );
  }

  if (requests.length === 0) {
    return (
      <View style={styles.center}>
        <EmptyState
          icon="person-add-outline"
          title="Aucune demande en attente"
          message="Quand un pêcheur voudra te suivre, sa demande apparaîtra ici."
        />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      data={requests}
      keyExtractor={(u) => u.id}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
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
            <View style={styles.status} accessible accessibilityLabel="Abonné(e)">
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.statusText, styles.statusTextSuccess]}>Abonné(e)</Text>
            </View>
          );
        } else if (status === 'followed_back') {
          rightSlot = (
            <View style={styles.status} accessible accessibilityLabel="Demande envoyée">
              <Ionicons name="time-outline" size={16} color={colors.inkSecondary} />
              <Text style={styles.statusText}>Demande envoyée</Text>
            </View>
          );
        } else if (status === 'accepted') {
          rightSlot = (
            <Button
              title="Suivre en retour"
              icon="person-add-outline"
              variant="tonal"
              size="sm"
              onPress={() => onFollowBack(item)}
              loading={busy}
              disabled={busy}
            />
          );
        } else {
          rightSlot = (
            <View style={styles.actions}>
              <IconButton
                icon="close"
                variant="plain"
                color={colors.inkSecondary}
                accessibilityLabel={`Refuser la demande de ${item.username}`}
                onPress={() => onDecline(item)}
                disabled={busy}
                style={styles.declineBtn}
              />
              {busy ? (
                <View style={styles.busy}><ActivityIndicator size="small" color={colors.primary} /></View>
              ) : (
                <IconButton
                  icon="checkmark"
                  variant="filled"
                  accessibilityLabel={`Accepter la demande de ${item.username}`}
                  onPress={() => onAccept(item)}
                />
              )}
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
    ...typography.footnote,
    fontWeight: '600',
    color: colors.inkSecondary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  declineBtn: { borderWidth: 1, borderColor: colors.outline, borderRadius: 22 },
  busy: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
  statusText: { ...typography.footnote, color: colors.inkSecondary, fontWeight: '500' },
  statusTextSuccess: { color: colors.primaryDark },
  center: { flex: 1, justifyContent: 'center', backgroundColor: colors.background },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ms,
    minHeight: 64,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  skeletonText: { flex: 1 },
  skeletonGap: { marginTop: spacing.sm },
});

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';
import { fetchFollowers, fetchFollowing } from '../../api/follows';
import { UserSearchResult } from '../../api/users';
import UserRow from '../../components/social/UserRow';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui';

type Route = RouteProp<MainStackParamList, 'FollowList'>;
type Nav = NativeStackNavigationProp<MainStackParamList>;

export default function FollowListScreen() {
  const { params } = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { userId, type } = params;

  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = type === 'followers' ? await fetchFollowers(userId) : await fetchFollowing(userId);
      setUsers(data);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [userId, type]);

  useEffect(() => {
    navigation.setOptions({ title: type === 'followers' ? 'Abonnés' : 'Abonnements' });
    load();
  }, [type, navigation, load]);

  if (isLoading) {
    return (
      <View style={styles.list} accessible accessibilityLabel="Chargement" accessibilityState={{ busy: true }}>
        {Array.from({ length: 6 }, (_, i) => (
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
          title={type === 'followers' ? 'Abonnés indisponibles' : 'Abonnements indisponibles'}
          message={`${error}\nVérifie ta connexion puis réessaie.`}
          onRetry={() => { setLoading(true); load(); }}
        />
      </View>
    );
  }

  if (users.length === 0) {
    return (
      <View style={styles.center}>
        <EmptyState
          icon="people-outline"
          title={type === 'followers' ? 'Aucun abonné pour l\'instant' : 'Aucun abonnement pour l\'instant'}
          message={type === 'followers'
            ? 'Publie tes prises : les pêcheurs qui les aiment pourront te suivre.'
            : 'Cherche des pêcheurs et suis-les pour voir leurs prises dans ton fil.'}
          actionLabel={type === 'following' ? 'Trouver des pêcheurs' : undefined}
          onAction={type === 'following' ? () => navigation.navigate('UserSearch') : undefined}
        />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={users}
      keyExtractor={(u) => u.id}
      ListHeaderComponent={
        <Text style={styles.count}>
          {users.length} {type === 'followers' ? `abonné${users.length > 1 ? 's' : ''}` : `abonnement${users.length > 1 ? 's' : ''}`}
        </Text>
      }
      renderItem={({ item }) => (
        <UserRow
          user={item}
          onPress={(uid) => navigation.navigate('UserProfile', { userId: uid })}
          showChevron
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', backgroundColor: colors.background },
  count: {
    ...typography.footnote,
    fontWeight: '600',
    color: colors.inkSecondary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
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

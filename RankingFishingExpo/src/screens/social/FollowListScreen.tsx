import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';
import { fetchFollowers, fetchFollowing } from '../../api/follows';
import { UserSearchResult } from '../../api/users';
import UserRow from '../../components/social/UserRow';

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

  if (users.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="people-outline" size={48} color={colors.textDisabled} />
        <Text style={styles.emptyText}>
          {type === 'followers' ? 'Aucun abonné pour l\'instant' : 'Aucun abonnement pour l\'instant'}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={users}
      keyExtractor={(u) => u.id}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.background },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});

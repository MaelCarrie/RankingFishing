import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList } from '../../navigation/types';
import { useAppSelector } from '../../store';
import { colors, spacing, typography } from '../../theme';
import Avatar from '../../components/common/Avatar';
import { searchUsers, fetchTopUsers, UserSearchResult } from '../../api/users';

type Nav = NativeStackNavigationProp<MainStackParamList>;
const DEBOUNCE_MS = 300;

export default function UserSearchScreen() {
  const navigation = useNavigation<Nav>();
  const currentUser = useAppSelector((s) => s.auth.user);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [topUsers, setTopUsers] = useState<UserSearchResult[]>([]);
  const [isSearching, setSearching] = useState(false);
  const [isLoadingTop, setLoadingTop] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Top users on mount
  useEffect(() => {
    fetchTopUsers(10)
      .then((list) => setTopUsers(list.filter((u) => u.id !== currentUser?.id)))
      .catch(() => {})
      .finally(() => setLoadingTop(false));
  }, [currentUser?.id]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      setError(null);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchUsers(q);
        setResults(data.filter((u) => u.id !== currentUser?.id));
        setError(null);
      } catch (e: any) {
        setError(e?.message ?? 'Erreur de recherche');
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, currentUser?.id]);

  const onPressUser = useCallback((userId: string) => {
    navigation.navigate('UserProfile', { userId });
  }, [navigation]);

  const showTopUsers = query.trim().length === 0;
  const data = showTopUsers ? topUsers : results;
  const showLoader = (showTopUsers && isLoadingTop) || (!showTopUsers && isSearching);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Input */}
      <View style={styles.inputWrapper}>
        <View style={styles.inputBox}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un pêcheur..."
            placeholderTextColor={colors.textDisabled}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Section title (top users) */}
      {showTopUsers && !isLoadingTop && topUsers.length > 0 && (
        <Text style={styles.sectionTitle}>🏆 Top pêcheurs</Text>
      )}

      {/* Body */}
      {showLoader ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.error} />
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : data.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name={showTopUsers ? 'people-outline' : 'search-outline'} size={48} color={colors.textDisabled} />
          <Text style={styles.emptyText}>
            {showTopUsers
              ? 'Aucun pêcheur à afficher'
              : 'Aucun pêcheur trouvé'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => onPressUser(item.id)}
              activeOpacity={0.7}
            >
              {showTopUsers && (
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
              )}
              <Avatar
                username={item.username}
                uri={item.avatar}
                size={48}
                isPremium={item.isPremium}
              />
              <View style={styles.rowInfo}>
                <Text style={styles.rowUsername}>{item.username}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  Niveau {item.level} · {item.levelName}
                  {item.location ? ` · ${item.location}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  inputWrapper: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    height: 42,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    padding: 0,
  },

  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    fontSize: 11,
  },

  list: { paddingBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rankBadge: {
    width: 26,
    alignItems: 'center',
  },
  rankText: {
    ...typography.bodySmall,
    color: colors.secondary,
    fontWeight: '700',
  },
  rowInfo: { flex: 1 },
  rowUsername: { ...typography.h4, color: colors.textPrimary },
  rowMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});

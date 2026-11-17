import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList } from '../../navigation/types';
import { useAppSelector } from '../../store';
import { colors, spacing, typography, borderRadius, hitSlop } from '../../theme';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui';
import UserRow from '../../components/social/UserRow';
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
  const [retryKey, setRetryKey] = useState(0);
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
  }, [query, currentUser?.id, retryKey]);

  const onPressUser = useCallback((userId: string) => {
    navigation.navigate('UserProfile', { userId });
  }, [navigation]);

  const showTopUsers = query.trim().length === 0;
  const data = showTopUsers ? topUsers : results;
  const showLoader = (showTopUsers && isLoadingTop) || (!showTopUsers && isSearching);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Champ de recherche */}
      <View style={styles.inputWrapper}>
        <View style={styles.inputBox}>
          <Ionicons name="search-outline" size={18} color={colors.inkSecondary} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un pêcheur..."
            placeholderTextColor={colors.inkTertiary}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Rechercher un pêcheur"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={hitSlop}
              style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Effacer la recherche"
            >
              <Ionicons name="close-circle" size={18} color={colors.inkSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Titre de section (suggestions) */}
      {showTopUsers && !isLoadingTop && topUsers.length > 0 && (
        <Text style={styles.sectionTitle} accessibilityRole="header">Pêcheurs les plus expérimentés</Text>
      )}

      {/* Corps */}
      {showLoader ? (
        <View accessible accessibilityLabel="Recherche en cours" accessibilityState={{ busy: true }}>
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
      ) : error ? (
        <View style={styles.center}>
          <ErrorState
            title="La recherche a échoué"
            message={`${error}\nVérifie ta connexion puis réessaie.`}
            onRetry={() => setRetryKey((k) => k + 1)}
          />
        </View>
      ) : data.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            icon={showTopUsers ? 'people-outline' : 'search-outline'}
            title={showTopUsers ? 'Aucun pêcheur à afficher' : 'Aucun pêcheur trouvé'}
            message={showTopUsers
              ? 'Tape un pseudo pour trouver un pêcheur.'
              : `Aucun pseudo ne correspond à « ${query.trim()} ». Vérifie l'orthographe.`}
          />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <UserRow
              user={item}
              onPress={onPressUser}
              showChevron
              leading={showTopUsers ? (
                <Text style={styles.rankText} accessibilityLabel={`${index + 1}${index === 0 ? 'er' : 'e'}`}>
                  {index + 1}
                </Text>
              ) : undefined}
            />
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.ms,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.control,
    paddingLeft: spacing.ms,
    gap: spacing.sm,
    minHeight: 44,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.ink,
    paddingVertical: spacing.sm,
  },
  clearBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },

  sectionTitle: {
    ...typography.footnote,
    fontWeight: '600',
    color: colors.inkSecondary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },

  list: { paddingBottom: spacing.xl },
  rankText: {
    width: 24,
    textAlign: 'center',
    ...typography.callout,
    fontWeight: '600',
    color: colors.inkSecondary,
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

  center: { flex: 1, justifyContent: 'center' },
});

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, SectionList, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../theme';
import UserRow from '../social/UserRow';
import { EmptyState, ErrorState, Skeleton } from '../ui';
import { UserSearchResult, searchUsers, fetchTopUsers } from '../../api/users';
import { fetchFollowing } from '../../api/follows';

interface Props {
  currentUserId?: string;
  onSelect: (user: UserSearchResult) => void;
  // Utilisateur en cours d'ouverture (affiche un spinner sur sa ligne)
  busyUserId?: string | null;
  // Contenu affiché au-dessus des suggestions quand la recherche est vide
  emptyQueryHeader?: React.ReactElement | null;
  autoFocus?: boolean;
  placeholder?: string;
}

type Section = { title: string; data: UserSearchResult[] };

const DEBOUNCE_MS = 300;

// Recherche d'un pêcheur à qui écrire : suggestions (abonnements + top XP) ou résultats
export default function ChatUserPicker({
  currentUserId, onSelect, busyUserId, emptyQueryHeader, autoFocus = true,
  placeholder = 'Rechercher un pêcheur…',
}: Props) {
  const [query, setQuery] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const load = useCallback(async (q: string) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const notMe = (u: UserSearchResult) => u.id !== currentUserId;
      let next: Section[];
      if (q.trim()) {
        const results = (await searchUsers(q)).filter(notMe);
        next = results.length ? [{ title: 'Résultats', data: results }] : [];
      } else {
        const [following, top] = await Promise.all([
          currentUserId
            ? fetchFollowing(currentUserId).catch(() => [] as UserSearchResult[])
            : Promise.resolve([] as UserSearchResult[]),
          fetchTopUsers(10),
        ]);
        const followingIds = new Set(following.map((u) => u.id));
        next = [
          { title: 'Tes abonnements', data: following.filter(notMe) },
          { title: 'Pêcheurs populaires', data: top.filter((u) => notMe(u) && !followingIds.has(u.id)) },
        ].filter((s) => s.data.length > 0);
      }
      if (seq === requestSeq.current) setSections(next);
    } catch (e: any) {
      if (seq === requestSeq.current) setError(e?.message ?? 'Recherche impossible');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    const t = setTimeout(() => load(query), query.trim() ? DEBOUNCE_MS : 0);
    return () => clearTimeout(t);
  }, [query, load]);

  const renderEmpty = () => {
    if (loading) {
      return (
        <View accessible accessibilityLabel="Chargement" accessibilityState={{ busy: true }}>
          {Array.from({ length: 5 }, (_, i) => (
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
        <ErrorState
          title="La recherche a échoué"
          message={`${error}\nVérifie ta connexion puis réessaie.`}
          onRetry={() => load(query)}
          style={styles.state}
        />
      );
    }
    return (
      <EmptyState
        icon="search-outline"
        title={query.trim() ? 'Aucun pêcheur trouvé' : 'Personne à te suggérer'}
        message={query.trim() ? `Aucun pseudo ne correspond à « ${query.trim()} ».` : 'Tape un pseudo pour trouver un pêcheur.'}
        style={styles.state}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.inkSecondary} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor={colors.inkTertiary}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Rechercher un pêcheur"
          testID="chat-user-search-input"
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => setQuery('')}
            style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Effacer la recherche"
          >
            <Ionicons name="close-circle" size={18} color={colors.inkSecondary} />
          </Pressable>
        )}
      </View>

      <SectionList
        sections={loading && sections.length === 0 ? [] : sections}
        keyExtractor={(u) => u.id}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={!query.trim() ? emptyQueryHeader ?? null : null}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <UserRow
            user={item}
            onPress={busyUserId ? undefined : () => onSelect(item)}
            rightSlot={
              busyUserId === item.id
                ? <ActivityIndicator color={colors.primary} />
                : <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
            }
          />
        )}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.ms,
    marginHorizontal: spacing.md,
    marginVertical: spacing.ms,
    minHeight: 44,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.control,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  input: { flex: 1, ...typography.body, color: colors.ink, paddingVertical: spacing.sm },
  clearBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  list: { flexGrow: 1, paddingBottom: spacing.xl },
  sectionTitle: {
    ...typography.footnote,
    fontWeight: '600',
    color: colors.inkSecondary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  state: { paddingTop: spacing.xl },
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

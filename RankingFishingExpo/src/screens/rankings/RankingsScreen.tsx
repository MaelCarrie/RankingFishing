import React, { useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable, ScrollView, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchRankings, setType, setPeriod, setSpecies } from '../../store/slices/rankingsSlice';
import { RankingEntry, RankingType, RankingPeriod } from '../../store/types';
import { colors, spacing, typography, borderRadius, hitSlop } from '../../theme';
import { FISH_SPECIES } from '../../config/constants';
import { SegmentedControl, Chip, EmptyState, ErrorState, Skeleton, Button } from '../../components/ui';
import type { SegmentOption } from '../../components/ui';
import RankRow from '../../components/rankings/RankRow';
import Podium from '../../components/rankings/Podium';

const TYPE_OPTIONS: SegmentOption<RankingType>[] = [
  { value: 'global', label: 'Global', accessibilityLabel: 'Classement global' },
  { value: 'regional', label: 'Région', accessibilityLabel: 'Classement de ma région' },
  { value: 'species', label: 'Espèce', accessibilityLabel: 'Classement par espèce' },
  { value: 'friends', label: 'Amis', accessibilityLabel: 'Classement entre amis' },
];

// Période : filtre secondaire, en puces (le type reste le contrôle principal)
const PERIOD_OPTIONS: { value: RankingPeriod; label: string }[] = [
  { value: 'day', label: '24 h' },
  { value: 'week', label: '7 jours' },
  { value: 'month', label: '30 jours' },
  { value: 'year', label: '1 an' },
  { value: 'alltime', label: 'Total' },
];

// Les périodes sont des fenêtres glissantes (Edge Function recalculate-rankings).
const PERIOD_PHRASE: Record<RankingPeriod, string> = {
  day: 'sur les dernières 24 h',
  week: 'sur les 7 derniers jours',
  month: 'sur les 30 derniers jours',
  year: 'sur les 12 derniers mois',
  alltime: 'depuis toujours',
};

// ─── Chargement ───────────────────────────────────────────────────────────────

function RankingSkeleton() {
  return (
    <View
      style={styles.skeleton}
      testID="ranking-loading"
      accessible
      accessibilityLabel="Chargement du classement"
      accessibilityState={{ busy: true }}
    >
      {Array.from({ length: 8 }, (_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <Skeleton width={24} height={14} />
          <Skeleton width={36} height={36} radius={18} />
          <View style={styles.skeletonText}>
            <Skeleton width="55%" height={12} />
            <Skeleton width="35%" height={10} style={styles.skeletonGap} />
          </View>
          <Skeleton width={64} height={14} />
        </View>
      ))}
    </View>
  );
}

// ─── Écran ────────────────────────────────────────────────────────────────────

export default function RankingsScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const {
    entries, currentUserRank, type, period, selectedSpecies,
    isLoading, isRefreshing, error, limit,
  } = useAppSelector((s) => s.rankings);
  const userId = useAppSelector((s) => s.auth.user?.id);
  const userRegion = useAppSelector((s) => s.auth.user?.region);

  const load = useCallback(
    (refresh = false) => dispatch(fetchRankings({ type, period, refresh })),
    [dispatch, type, period]
  );

  // Recharge à chaque changement d'onglet, d'espèce, d'utilisateur ou de région
  useEffect(() => {
    load(false);
  }, [load, selectedSpecies, userId, userRegion]);

  const goToMyProfile = () => navigation.navigate('Profile', { screen: 'ProfileMain' });
  // La région se choisit dans « Modifier le profil »
  const goToEditProfile = () => (navigation.getParent?.() ?? navigation).navigate('EditProfile');
  const goToSearch = () => (navigation.getParent?.() ?? navigation).navigate('UserSearch');
  const goToNewCapture = () => navigation.navigate('NewCapture');
  const openEntry = (e: RankingEntry) => {
    if (e.isCurrentUser) goToMyProfile();
    else (navigation.getParent?.() ?? navigation).navigate('UserProfile', { userId: e.userId });
  };

  const speciesName = FISH_SPECIES.find((s) => s.id === selectedSpecies)?.nameFr ?? selectedSpecies;
  const needsRegion = type === 'regional' && !userRegion;

  const hasPodium = entries.length >= 3;
  const top3 = hasPodium ? entries.slice(0, 3) : [];
  const rest = hasPodium ? entries.slice(3) : entries;

  // Libellé de contexte sous les onglets
  let context = '';
  if (type === 'global') context = `Top ${limit ?? 100} mondial · ${PERIOD_PHRASE[period]}`;
  else if (type === 'regional') context = userRegion ? `Top ${limit ?? 50} · ${userRegion}` : 'Classement de ta région';
  else if (type === 'species') context = `Top ${limit ?? 50} · ${speciesName} · ${PERIOD_PHRASE[period]}`;
  else context = `Toi et les pêcheurs que tu suis · ${PERIOD_PHRASE[period]}`;

  const renderEmpty = () => {
    if (hasPodium) return null;
    if (type === 'friends') {
      return (
        <EmptyState
          icon="people-outline"
          title="Pas encore de classement entre amis"
          message={`Personne dans ton cercle n'a publié de capture ${PERIOD_PHRASE[period]}. Suis d'autres pêcheurs pour te comparer à eux.`}
          actionLabel="Trouver des pêcheurs"
          onAction={goToSearch}
        />
      );
    }
    return (
      <EmptyState
        icon={type === 'species' ? 'fish-outline' : type === 'regional' ? 'location-outline' : 'trophy-outline'}
        title="Aucune capture classée"
        message={
          type === 'species'
            ? `Aucune capture de ${speciesName.toLowerCase()} ${PERIOD_PHRASE[period]}. Publie la première.`
            : type === 'regional'
              ? `Aucune capture en ${userRegion} ${PERIOD_PHRASE[period]}. Publie la première.`
              : `Aucune capture ${PERIOD_PHRASE[period]}. Publie la première.`
        }
        actionLabel="Publier une capture"
        onAction={goToNewCapture}
      />
    );
  };

  const renderBody = () => {
    if (needsRegion) {
      return (
        <View style={styles.center} testID="ranking-region-empty">
          <EmptyState
            icon="location-outline"
            title="Choisis ta région"
            message="Indique ta région dans ton profil pour te mesurer aux pêcheurs près de chez toi."
            actionLabel="Choisir ma région"
            onAction={goToEditProfile}
          />
        </View>
      );
    }

    if (isLoading && entries.length === 0) return <RankingSkeleton />;

    if (error && entries.length === 0) {
      return (
        <View style={styles.center} testID="ranking-error">
          <ErrorState
            title="Impossible de charger le classement"
            message={`${error}\nVérifie ta connexion puis réessaie.`}
            onRetry={() => load(false)}
          />
        </View>
      );
    }

    return (
      <FlatList
        style={styles.flatList}
        data={rest}
        keyExtractor={(e) => e.userId}
        renderItem={({ item, index }) => (
          <RankRow entry={item} onPress={openEntry} first={index === 0} last={index === rest.length - 1} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={!!isRefreshing}
            onRefresh={() => { void load(true); }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <>
            {error ? (
              <View style={styles.inlineError} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                <Text style={styles.inlineErrorText}>Mise à jour impossible. Tire pour réessayer.</Text>
              </View>
            ) : null}
            <Podium top3={top3} onPress={openEntry} />
          </>
        }
        ListEmptyComponent={<View testID="ranking-empty">{renderEmpty()}</View>}
        ListFooterComponent={
          <>
            {type === 'friends' && entries.length === 1 && entries[0].isCurrentUser ? (
              <View style={styles.hintCard}>
                <Ionicons name="people-outline" size={20} color={colors.primary} />
                <Text style={styles.hintText}>Suis d'autres pêcheurs pour comparer tes scores aux leurs.</Text>
                <Button title="Trouver des pêcheurs" onPress={goToSearch} variant="tonal" size="sm" />
              </View>
            ) : null}
            {limit && entries.length >= limit ? (
              <Text style={styles.limitNote}>Seuls les {limit} premiers sont affichés.</Text>
            ) : null}
          </>
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  // Position de l'utilisateur toujours épinglée en bas (style Strava, issue #28),
  // qu'elle soit dans la liste affichée ou non.
  const showPinned = !needsRegion && !isLoading && !error && !!currentUserRank;
  const showNotRanked =
    !needsRegion && !isLoading && !error && !currentUserRank && entries.length > 0 && !!userId;

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <SegmentedControl
          options={TYPE_OPTIONS}
          value={type}
          onChange={(v) => dispatch(setType(v))}
          accessibilityLabel="Type de classement"
          testID="ranking-type"
        />
      </View>

      {/* Période (et espèce) : puces horizontales sous le contrôle principal */}
      <View style={styles.filters}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
          accessibilityLabel="Période du classement"
          testID="ranking-period"
        >
          {PERIOD_OPTIONS.map((p) => (
            <Chip
              key={p.value}
              label={p.label}
              selected={period === p.value}
              onPress={() => dispatch(setPeriod(p.value))}
              testID={`ranking-period-${p.value}`}
            />
          ))}
        </ScrollView>

        {type === 'species' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.chipsContent, styles.speciesContent]}
            accessibilityLabel="Espèce"
          >
            {FISH_SPECIES.map((sp) => (
              <Chip
                key={sp.id}
                label={sp.nameFr}
                selected={selectedSpecies === sp.id}
                onPress={() => dispatch(setSpecies(sp.id))}
                testID={`ranking-species-${sp.id}`}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Contexte */}
      {!needsRegion && (
        <View style={styles.contextRow}>
          <Text style={styles.contextText} numberOfLines={1}>{context}</Text>
          {type === 'regional' && (
            <Pressable
              onPress={goToEditProfile}
              style={({ pressed }) => [styles.contextLink, pressed && styles.pressed]}
              hitSlop={hitSlop}
              accessibilityRole="button"
              accessibilityLabel="Changer de région"
              testID="ranking-region-change"
            >
              <Text style={styles.contextLinkText}>Changer</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.body}>{renderBody()}</View>

      {showPinned && currentUserRank && (
        <View style={styles.pinned} testID="ranking-pinned-me">
          <RankRow entry={currentUserRank} pinned onPress={openEntry} testID="ranking-pinned-row" />
        </View>
      )}

      {showNotRanked && (
        <View style={styles.pinned} testID="ranking-pinned-unranked">
          <View style={styles.unranked}>
            <Ionicons name="fish-outline" size={20} color={colors.primary} />
            <Text style={styles.unrankedText}>
              Tu n'es pas encore classé {PERIOD_PHRASE[period]}.
            </Text>
            <Button title="Publier une prise" onPress={goToNewCapture} size="sm" variant="tonal" />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1 },
  center: { flex: 1, justifyContent: 'center' },
  flatList: { flex: 1 },
  list: { paddingBottom: spacing.lg, flexGrow: 1 },

  controls: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  filters: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderStrong,
  },
  chipsContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.ms, gap: spacing.sm },
  speciesContent: { paddingTop: 0 },
  pressed: { opacity: 0.6 },

  // Contexte
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    minHeight: 40,
  },
  contextText: { ...typography.footnote, color: colors.inkSecondary, flex: 1, fontVariant: ['tabular-nums'] },
  contextLink: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
  contextLinkText: { ...typography.subhead, color: colors.primary, fontWeight: '600' },

  limitNote: {
    ...typography.footnote,
    color: colors.inkSecondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
    fontVariant: ['tabular-nums'],
  },

  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  inlineErrorText: { ...typography.subhead, color: colors.error, flex: 1 },

  // Squelette
  skeleton: { paddingTop: spacing.sm, overflow: 'hidden' },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.ms,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  skeletonText: { flex: 1 },
  skeletonGap: { marginTop: 6 },

  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.sheet,
    backgroundColor: colors.primaryTint,
  },
  hintText: { ...typography.subhead, color: colors.ink, flex: 1 },

  // Position épinglée
  pinned: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingHorizontal: spacing.ms,
    paddingVertical: spacing.xs,
  },
  unranked: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  unrankedText: { ...typography.subhead, color: colors.ink, flex: 1 },
});

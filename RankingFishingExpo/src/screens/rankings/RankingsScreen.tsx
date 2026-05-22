import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchRankings, setType, setPeriod, setSpecies } from '../../store/slices/rankingsSlice';
import { RankingEntry, RankingType, RankingPeriod } from '../../store/types';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import Avatar from '../../components/common/Avatar';
import { formatScore, formatRank } from '../../utils/formatting';
import { FISH_SPECIES } from '../../config/constants';

const TYPE_TABS: { key: RankingType; label: string }[] = [
  { key: 'global', label: 'Global' },
  { key: 'regional', label: 'Régional' },
  { key: 'species', label: 'Par espèce' },
  { key: 'friends', label: 'Amis' },
];

const PERIOD_TABS: { key: RankingPeriod; label: string }[] = [
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'Année' },
  { key: 'alltime', label: 'All-time' },
];

const PODIUM_COLORS = ['#F9A825', '#C0C0C0', '#CD7F32'];
const PODIUM_SIZES = [72, 60, 54];

function PodiumEntry({ entry, position }: { entry: RankingEntry; position: number }) {
  const color = PODIUM_COLORS[position];
  const size = PODIUM_SIZES[position];
  return (
    <View style={[styles.podiumEntry, position === 0 && styles.podiumFirst]}>
      <Avatar username={entry.username} uri={entry.avatar} size={size} showBorder borderColor={color} />
      <View style={[styles.podiumMedal, { backgroundColor: color }]}>
        <Text style={styles.podiumRank}>{position + 1}</Text>
      </View>
      <Text style={styles.podiumName} numberOfLines={1}>{entry.username}</Text>
      <Text style={styles.podiumScore}>{formatScore(entry.score)}</Text>
    </View>
  );
}

function RankRow({ entry }: { entry: RankingEntry }) {
  const isMe = entry.isCurrentUser;
  return (
    <View style={[styles.rankRow, isMe && styles.rankRowMe]}>
      <View style={styles.rankNum}>
        <Text style={[styles.rankNumText, isMe && styles.rankNumMe]}>{formatRank(entry.rank)}</Text>
      </View>
      <Avatar username={entry.username} uri={entry.avatar} size={36} />
      <View style={styles.rankInfo}>
        <Text style={[styles.rankUsername, isMe && styles.rankUsernameMe]}>{entry.username}</Text>
        <Text style={styles.rankSub}>{entry.totalCaptures} captures · {entry.topSpecies}</Text>
      </View>
      <Text style={[styles.rankScore, isMe && styles.rankScoreMe]}>{formatScore(entry.score)}</Text>
    </View>
  );
}

function EmptyState({ type, hasRegion }: { type: RankingType; hasRegion: boolean }) {
  let icon: keyof typeof Ionicons.glyphMap = 'trophy-outline';
  let message = 'Aucun classement pour le moment.';

  if (type === 'friends') {
    icon = 'people-outline';
    message = 'Le classement entre amis arrive bientôt.';
  } else if (type === 'regional' && !hasRegion) {
    icon = 'location-outline';
    message = 'Renseignez votre région dans votre profil pour apparaître au classement régional.';
  } else if (type === 'regional') {
    icon = 'location-outline';
    message = 'Aucune capture dans votre région pour cette période.';
  } else if (type === 'species') {
    icon = 'fish-outline';
    message = 'Aucune capture pour cette espèce sur cette période.';
  }

  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={40} color={colors.textSecondary} />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export default function RankingsScreen() {
  const dispatch = useAppDispatch();
  const { entries, currentUserRank, type, period, selectedSpecies, isLoading } = useAppSelector((s) => s.rankings);
  const userRegion = useAppSelector((s) => s.auth.user?.region);

  useEffect(() => {
    dispatch(fetchRankings({ type, period }));
  }, [dispatch, type, period, selectedSpecies]);

  const hasPodium = entries.length >= 3;
  const top3 = hasPodium ? entries.slice(0, 3) : [];
  const rest = hasPodium ? entries.slice(3) : entries;

  return (
    <View style={styles.container}>
      {/* Type tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeTabs} contentContainerStyle={styles.typeTabsContent}>
        {TYPE_TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.typeTab, type === t.key && styles.typeTabActive]}
            onPress={() => dispatch(setType(t.key))}
          >
            <Text style={[styles.typeTabText, type === t.key && styles.typeTabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Period tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodTabs} contentContainerStyle={styles.typeTabsContent}>
        {PERIOD_TABS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodTab, period === p.key && styles.periodTabActive]}
            onPress={() => dispatch(setPeriod(p.key))}
          >
            <Text style={[styles.periodTabText, period === p.key && styles.periodTabTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Species selector (par espèce uniquement) */}
      {type === 'species' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.speciesTabs} contentContainerStyle={styles.typeTabsContent}>
          {FISH_SPECIES.map((sp) => (
            <TouchableOpacity
              key={sp.id}
              style={[styles.speciesTab, selectedSpecies === sp.id && styles.speciesTabActive]}
              onPress={() => dispatch(setSpecies(sp.id))}
            >
              <Text style={styles.speciesIcon}>{sp.icon}</Text>
              <Text style={[styles.speciesTabText, selectedSpecies === sp.id && styles.speciesTabTextActive]}>{sp.nameFr}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <>
          <FlatList
            style={styles.flatList}
            data={rest}
            keyExtractor={(e) => e.userId}
            renderItem={({ item }) => <RankRow entry={item} />}
            ListHeaderComponent={
              <>
                {/* Podium */}
                {top3.length === 3 && (
                  <View style={styles.podium}>
                    <PodiumEntry entry={top3[1]} position={1} />
                    <PodiumEntry entry={top3[0]} position={0} />
                    <PodiumEntry entry={top3[2]} position={2} />
                  </View>
                )}

                {rest.length > 0 && <Text style={styles.listTitle}>Classement complet</Text>}
              </>
            }
            ListEmptyComponent={entries.length === 0 ? <EmptyState type={type} hasRegion={!!userRegion} /> : null}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />

          {/* Mon rang — épinglé en bas de page */}
          {currentUserRank && (
            <View style={styles.myRankBanner}>
              <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.myRankText}>
                Mon rang : <Text style={styles.myRankValue}>{formatRank(currentUserRank.rank)}</Text>
                {'  ·  '}
                <Text style={styles.myRankValue}>{formatScore(currentUserRank.score)}</Text>
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  flatList: { flex: 1 },
  list: { paddingBottom: spacing.xxl, flexGrow: 1 },

  // Type tabs
  typeTabs: { maxHeight: 44, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  typeTabsContent: { paddingHorizontal: spacing.md, gap: spacing.xs },
  typeTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginVertical: spacing.xs,
  },
  typeTabActive: { backgroundColor: colors.primary },
  typeTabText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  typeTabTextActive: { color: '#fff' },

  // Period tabs
  periodTabs: { maxHeight: 40, backgroundColor: colors.surface },
  periodTab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  periodTabActive: { borderColor: colors.secondary, backgroundColor: colors.premiumBg },
  periodTabText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  periodTabTextActive: { color: colors.secondaryDark },

  // Species selector
  speciesTabs: { maxHeight: 44, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  speciesTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  speciesTabActive: { borderColor: colors.primary, backgroundColor: colors.surfaceVariant },
  speciesIcon: { fontSize: 14 },
  speciesTabText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  speciesTabTextActive: { color: colors.primary },

  // Empty state
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl, gap: spacing.md },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },

  // Podium
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  podiumEntry: { alignItems: 'center', flex: 1 },
  podiumFirst: { transform: [{ translateY: -12 }] },
  podiumMedal: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
    marginBottom: spacing.xs,
    zIndex: 1,
  },
  podiumRank: { color: '#fff', fontWeight: '900', fontSize: 12 },
  podiumName: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '700', textAlign: 'center' },
  podiumScore: { ...typography.caption, color: colors.secondary, fontWeight: '700' },

  listTitle: {
    ...typography.h4,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
  },

  // Rank rows
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: 6,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankRowMe: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceVariant,
  },
  rankNum: { width: 32, alignItems: 'center' },
  rankNumText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '700' },
  rankNumMe: { color: colors.primary },
  rankInfo: { flex: 1 },
  rankUsername: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '700' },
  rankUsernameMe: { color: colors.primary },
  rankSub: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  rankScore: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '700' },
  rankScoreMe: { color: colors.secondary },

  myRankBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  myRankText: { ...typography.body, color: colors.textSecondary },
  myRankValue: { color: colors.primary, fontWeight: '700' },
});

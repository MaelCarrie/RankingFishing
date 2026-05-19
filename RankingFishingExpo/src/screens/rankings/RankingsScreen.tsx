import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchRankings, setType, setPeriod } from '../../store/slices/rankingsSlice';
import { RankingEntry, RankingType, RankingPeriod } from '../../store/types';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import Avatar from '../../components/common/Avatar';
import { formatScore, formatRank } from '../../utils/formatting';

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

export default function RankingsScreen() {
  const dispatch = useAppDispatch();
  const { entries, currentUserRank, type, period, isLoading } = useAppSelector((s) => s.rankings);

  useEffect(() => {
    dispatch(fetchRankings({ type, period }));
  }, [dispatch, type, period]);

  const top3 = entries.filter((e) => !e.isCurrentUser).slice(0, 3);
  const rest = entries.filter((e) => !e.isCurrentUser).slice(3);

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

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <FlatList
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

              <Text style={styles.listTitle}>Classement complet</Text>
            </>
          }
          ListFooterComponent={
            currentUserRank ? (
              <View style={styles.myRankBanner}>
                <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.myRankText}>
                  Mon rang : <Text style={styles.myRankValue}>{formatRank(currentUserRank.rank)}</Text>
                  {'  ·  '}
                  <Text style={styles.myRankValue}>{formatScore(currentUserRank.score)}</Text>
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: spacing.xxl },

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
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  myRankText: { ...typography.body, color: colors.textSecondary },
  myRankValue: { color: colors.primary, fontWeight: '700' },
});

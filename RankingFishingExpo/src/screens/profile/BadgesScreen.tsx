import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchBadges } from '../../store/slices/badgesSlice';
import { Badge, BadgeTier } from '../../store/types';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

const TIER_COLORS: Record<BadgeTier, string> = {
  bronze: colors.bronze,
  silver: colors.silver,
  gold: colors.gold,
  platinum: '#B4E8E0',
};

const TIER_LABELS: Record<BadgeTier, string> = {
  bronze: 'Bronze',
  silver: 'Argent',
  gold: 'Or',
  platinum: 'Platine',
};

const CATEGORY_LABELS: Record<string, string> = {
  progression: '📈 Progression',
  excellence: '🏆 Excellence',
  community: '🤝 Communauté',
  seasonal: '🌸 Saisonnier',
};

function BadgeCard({ badge }: { badge: Badge }) {
  const tierColor = TIER_COLORS[badge.tier];
  return (
    <View style={[styles.card, !badge.isUnlocked && styles.cardLocked]}>
      <View style={[styles.iconContainer, { borderColor: tierColor }]}>
        <Text style={styles.icon}>{badge.icon}</Text>
        {!badge.isUnlocked && <View style={styles.iconOverlay} />}
      </View>
      <Text style={[styles.name, !badge.isUnlocked && styles.nameLocked]} numberOfLines={2}>
        {badge.name}
      </Text>
      <View style={[styles.tierChip, { backgroundColor: tierColor + '20' }]}>
        <Text style={[styles.tierText, { color: tierColor === colors.silver || tierColor === colors.gold ? colors.textPrimary : tierColor }]}>
          {TIER_LABELS[badge.tier]}
        </Text>
      </View>

      {/* Barre de progression */}
      {!badge.isUnlocked && (
        <View style={styles.progressWrapper}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${badge.progress}%`, backgroundColor: tierColor }]} />
          </View>
          <Text style={styles.progressText}>{badge.progress}%</Text>
        </View>
      )}

      {badge.isUnlocked && (
        <View style={styles.unlockedBadge}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={styles.unlockedText}>Obtenu</Text>
        </View>
      )}

      <Text style={styles.desc} numberOfLines={2}>{badge.description}</Text>
      <Text style={styles.xp}>+{badge.xpReward} XP</Text>
    </View>
  );
}

export default function BadgesScreen() {
  const dispatch = useAppDispatch();
  const { badges, isLoading } = useAppSelector((s) => s.badges);
  const { user } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (user) dispatch(fetchBadges(user.id));
  }, [dispatch, user]);

  const unlocked = badges.filter((b) => b.isUnlocked);
  const locked = badges.filter((b) => !b.isUnlocked);

  const grouped: { title: string; data: Badge[] }[] = [
    { title: 'Débloqués', data: unlocked },
    { title: 'En cours', data: locked },
  ].filter((g) => g.data.length > 0);

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Stats en tête */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{unlocked.length}</Text>
          <Text style={styles.statLabel}>Obtenus</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{badges.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{Math.round((unlocked.length / badges.length) * 100)}%</Text>
          <Text style={styles.statLabel}>Complété</Text>
        </View>
      </View>

      {grouped.map((group) => (
        <View key={group.title}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <FlatList
            data={group.data}
            keyExtractor={(b) => b.id}
            renderItem={({ item }) => <BadgeCard badge={item} />}
            numColumns={2}
            columnWrapperStyle={styles.row}
            scrollEnabled={false}
            contentContainerStyle={styles.grid}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  statsBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { ...typography.h3, color: colors.primary },
  statLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },

  groupTitle: {
    ...typography.h4,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
  },

  grid: { paddingHorizontal: spacing.sm, paddingBottom: spacing.xxl },
  row: { gap: spacing.sm, paddingHorizontal: spacing.sm },

  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLocked: { opacity: 0.7 },

  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    position: 'relative',
  },
  icon: { fontSize: 32 },
  iconOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 30,
    backgroundColor: colors.overlayLight,
  },

  name: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  nameLocked: { color: colors.textSecondary },

  tierChip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: spacing.xs,
  },
  tierText: { ...typography.caption, fontWeight: '700' },

  progressWrapper: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  progressBar: { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { ...typography.caption, color: colors.textSecondary, width: 28, textAlign: 'right' },

  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: spacing.xs,
  },
  unlockedText: { ...typography.caption, color: colors.success, fontWeight: '600' },

  desc: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 15 },
  xp: { ...typography.caption, color: colors.secondary, fontWeight: '700', marginTop: 4 },
});

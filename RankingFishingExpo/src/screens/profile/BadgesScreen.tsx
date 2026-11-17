import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { loadMyBadges } from '../../store/slices/badgesSlice';
import { Badge, BadgeCategory } from '../../store/types';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { EmptyState, ErrorState, Metric, Skeleton, formatInt } from '../../components/ui';
import BadgeIcon from '../../components/badges/BadgeIcon';
import BadgeUnlockHost from '../../components/badges/BadgeUnlockHost';
import { CATEGORY_META, TIER_TONES, badgeProgressLabel } from '../../components/badges/badgeVisuals';

const CATEGORY_ORDER: BadgeCategory[] = ['progression', 'excellence', 'community', 'seasonal'];

function formatUnlockDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }]} />
    </View>
  );
}

function BadgeRow({ badge, isNew, last }: { badge: Badge; isNew: boolean; last: boolean }) {
  const tone = TIER_TONES[badge.tier] ?? TIER_TONES.bronze;
  const detail = badgeProgressLabel(badge);
  const unlockedOn = formatUnlockDate(badge.unlockedAt);
  const a11y = badge.isUnlocked
    ? `${badge.name}, badge ${tone.label} obtenu${unlockedOn ? ` le ${unlockedOn}` : ''}. ${badge.description}. ${badge.xpReward} XP.`
    : `${badge.name}, badge ${tone.label} verrouillé, ${badge.progress} pour cent. ${detail ?? badge.target}. ${badge.description}. ${badge.xpReward} XP à gagner.`;

  return (
    <View>
      <View style={[styles.badgeRow, isNew && styles.badgeRowNew]} accessible accessibilityLabel={a11y} testID={`badge-card-${badge.id}`}>
        <BadgeIcon badge={badge} size={48} />
        <View style={styles.badgeBody}>
          <View style={styles.badgeTitleLine}>
            <Text style={[styles.name, !badge.isUnlocked && styles.nameLocked]} numberOfLines={1}>{badge.name}</Text>
            <Text style={[styles.tier, { color: badge.isUnlocked ? tone.fg : colors.inkSecondary }]}>{tone.label}</Text>
            {isNew ? <Text style={styles.newTag}>Nouveau</Text> : null}
          </View>
          <Text style={styles.desc} numberOfLines={2}>{badge.description}</Text>
          {badge.isUnlocked ? (
            <View style={styles.unlockedRow}>
              <Ionicons name="checkmark-circle-outline" size={15} color={colors.primary} />
              <Text style={styles.unlockedText}>{unlockedOn ? `Obtenu le ${unlockedOn}` : 'Obtenu'}</Text>
            </View>
          ) : (
            <View style={styles.progressBlock}>
              <View style={styles.progressHead}>
                <Text style={styles.progressDetail} numberOfLines={1}>{detail ?? badge.target}</Text>
                <Text style={styles.progressPct}>{badge.progress} %</Text>
              </View>
              <ProgressBar value={badge.progress} color={colors.secondary} />
            </View>
          )}
        </View>
        <Text style={[styles.xp, !badge.isUnlocked && styles.xpLocked]}>
          +{formatInt(badge.xpReward)}
          <Text style={styles.xpUnit}> XP</Text>
        </Text>
      </View>
      {!last ? <View style={styles.rowDivider} /> : null}
    </View>
  );
}

export default function BadgesScreen() {
  const dispatch = useAppDispatch();
  const { badges, isLoading, error, recentlyUnlockedIds } = useAppSelector((s) => s.badges);
  const userId = useAppSelector((s) => s.auth.user?.id);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (userId) await dispatch(loadMyBadges(userId));
  }, [dispatch, userId]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const recent = useMemo(() => new Set(recentlyUnlockedIds ?? []), [recentlyUnlockedIds]);
  const unlocked = badges.filter((b) => b.isUnlocked);
  const total = badges.length;
  const completion = total > 0 ? Math.round((unlocked.length / total) * 100) : 0;
  const xpEarned = unlocked.reduce((sum, b) => sum + (b.xpReward ?? 0), 0);

  // Prochain objectif : badge verrouillé le plus avancé
  const next = useMemo(
    () =>
      badges
        .filter((b) => !b.isUnlocked)
        .sort((a, b) => b.progress - a.progress || a.id.localeCompare(b.id))[0] ?? null,
    [badges]
  );

  const sections = CATEGORY_ORDER.map((cat) => ({
    cat,
    data: badges.filter((b) => b.category === cat),
  })).filter((s) => s.data.length > 0);

  // Chargement initial : squelette de la grille
  if (isLoading && badges.length === 0) {
    return (
      <View
        style={[styles.container, styles.scroll]}
        accessible
        accessibilityLabel="Chargement des badges"
        accessibilityState={{ busy: true }}
        testID="badges-loading"
      >
        <Skeleton height={96} radius={borderRadius.sheet} />
        <Skeleton height={88} radius={borderRadius.sheet} />
        <Skeleton height={240} radius={borderRadius.sheet} />
      </View>
    );
  }

  // Erreur sans données
  if (error && badges.length === 0) {
    return (
      <View style={styles.centered} testID="badges-error">
        <ErrorState
          title="Impossible de charger tes badges"
          message={`${error}\nVérifie ta connexion puis réessaie.`}
          onRetry={load}
        />
      </View>
    );
  }

  if (badges.length === 0) {
    return (
      <View style={styles.centered} testID="badges-empty">
        <EmptyState
          icon="ribbon-outline"
          title="Aucun badge pour l'instant"
          message="Publie des captures pour faire avancer tes badges : la progression apparaîtra ici."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* Synthèse */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Metric value={`${unlocked.length}`} unit={`/ ${total}`} label="Obtenus" size="md" style={styles.summaryCell} />
            <View style={styles.statDivider} />
            <Metric value={`${completion}`} unit="%" label="Complété" size="md" style={styles.summaryCell} />
            <View style={styles.statDivider} />
            <Metric value={formatInt(xpEarned)} unit="XP" label="XP gagnés" size="md" tone="gold" style={styles.summaryCell} />
          </View>
          <ProgressBar value={completion} color={colors.secondary} />
        </View>

        {error && (
          <View style={styles.inlineError}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={styles.inlineErrorText}>Mise à jour impossible, données possiblement anciennes.</Text>
          </View>
        )}

        {/* Prochain objectif */}
        {next && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Prochain objectif</Text>
            <View style={styles.sheet}>
              <BadgeRow badge={next} isNew={false} last />
            </View>
          </View>
        )}

        {sections.map(({ cat, data }) => (
          <View key={cat} style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle} accessibilityRole="header">{CATEGORY_META[cat].label}</Text>
              <Text style={styles.sectionCount}>
                {data.filter((b) => b.isUnlocked).length} / {data.length}
              </Text>
            </View>
            <View style={styles.sheet}>
              {data.map((b, i) => (
                <BadgeRow key={b.id} badge={b} isNew={recent.has(b.id)} last={i === data.length - 1} />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Célébration si le recalcul serveur vient de débloquer un badge */}
      <BadgeUnlockHost />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },

  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
  },

  summary: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sheet,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  summaryRow: { flexDirection: 'row' },
  summaryCell: { flex: 1 },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginHorizontal: spacing.ms },

  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  inlineErrorText: { ...typography.subhead, color: colors.error, flex: 1 },

  section: { gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', paddingRight: spacing.md },
  sectionTitle: { ...typography.footnote, fontWeight: '600', color: colors.inkSecondary, flex: 1, paddingHorizontal: spacing.md },
  sectionCount: { ...typography.footnote, color: colors.inkSecondary, fontVariant: ['tabular-nums'] },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sheet,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },

  badgeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.ms, padding: spacing.md },
  badgeRowNew: { backgroundColor: colors.goldTint },
  badgeBody: { flex: 1, minWidth: 0, gap: 2 },
  badgeTitleLine: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  name: { ...typography.headline, color: colors.ink, flexShrink: 1 },
  nameLocked: { color: colors.inkSecondary },
  tier: { ...typography.caption, fontWeight: '600' },
  newTag: { ...typography.caption, color: colors.goldInk, fontWeight: '700' },
  desc: { ...typography.subhead, color: colors.inkSecondary },

  unlockedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  unlockedText: { ...typography.footnote, color: colors.primaryDark, fontWeight: '500' },

  progressBlock: { alignSelf: 'stretch', gap: 4, marginTop: 6 },
  progressHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progressDetail: { ...typography.footnote, color: colors.inkSecondary, flex: 1, fontVariant: ['tabular-nums'] },
  progressPct: { ...typography.footnote, color: colors.ink, fontWeight: '600', fontVariant: ['tabular-nums'] },
  progressBar: { alignSelf: 'stretch', height: 6, backgroundColor: colors.surfaceMuted, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  xp: { ...typography.subhead, color: colors.goldInk, fontWeight: '600', fontVariant: ['tabular-nums'] },
  xpLocked: { color: colors.inkSecondary },
  xpUnit: { ...typography.caption, fontWeight: '500' },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginLeft: spacing.md + 48 + spacing.ms },
});

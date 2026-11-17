import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { UserStats } from '../../store/types';
import { colors, spacing, typography } from '../../theme';
import { Divider, Metric, Sheet, SpeciesMark, WeighInStrip, formatInt, splitWeight } from '../ui';

interface Props {
  stats: UserStats;
  /** Score de la plus grosse prise, s'il est connu (sinon « — »). */
  bestScore?: number | null;
  /** Affiche la colonne « Rang régional » (masquée si inconnue sur un profil public). */
  showRegional?: boolean;
}

function rankValue(rank: number | null | undefined): string | null {
  if (!rank) return null;
  return rank === 1 ? '1er' : `${formatInt(rank)}e`;
}

/**
 * Bloc « Records » façon fiche de pesée : poids cumulé et rangs en chiffres
 * tabulaires, puis la plus grosse prise avec sa bande de pesée.
 */
export default function ProfileRecords({ stats, bestScore, showRegional = true }: Props) {
  const total = stats.totalWeightGrams > 0 ? splitWeight(stats.totalWeightGrams) : null;
  const best = stats.biggestFish;

  return (
    <Sheet padding={false} testID="profile-records">
      <View style={styles.metrics}>
        <Metric value={total?.value} unit={total?.unit ?? 'kg'} label="Poids total" size="md" style={styles.cell} />
        <View style={styles.sep} />
        <Metric value={rankValue(stats.globalRank)} label="Rang mondial" size="md" style={styles.cell} />
        {showRegional ? (
          <>
            <View style={styles.sep} />
            <Metric value={rankValue(stats.regionalRank)} label="Rang régional" size="md" style={styles.cell} />
          </>
        ) : null}
      </View>

      <Divider />

      <View style={styles.best}>
        {best ? (
          <>
            <View style={styles.bestHead}>
              <SpeciesMark name={best.species} size={36} />
              <Text style={styles.bestTitle} numberOfLines={1}>
                Plus grosse prise<Text style={styles.bestSep}> · </Text>{best.species}
              </Text>
            </View>
            <WeighInStrip
              weightGrams={best.weightGrams}
              lengthCm={best.sizeCm}
              score={bestScore ?? null}
              size="compact"
            />
          </>
        ) : (
          <Text style={styles.emptyBest}>Pas encore de prise pesée. La plus grosse apparaîtra ici.</Text>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', paddingVertical: spacing.ms, paddingHorizontal: spacing.md },
  cell: { flex: 1 },
  sep: { width: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginHorizontal: spacing.ms },
  best: { paddingHorizontal: spacing.md, paddingTop: spacing.ms, paddingBottom: spacing.xs },
  bestHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms },
  bestTitle: { ...typography.headline, color: colors.ink, flex: 1, minWidth: 0 },
  bestSep: { color: colors.inkSecondary },
  emptyBest: { ...typography.subhead, color: colors.inkSecondary, paddingBottom: spacing.sm },
});

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, spacing } from '../../theme';
import Divider from './Divider';
import Metric from './Metric';
import { splitLength, splitScore, splitWeight } from './format';

export interface WeighInStripProps {
  /** Poids en grammes. */
  weightGrams?: number | null;
  /** Taille en centimètres. */
  lengthCm?: number | null;
  /** Score de la prise (affiché en or). */
  score?: number | null;
  /** 'lg' : poids 28 pt (fil, détail). 'compact' : 20 pt (listes, profils). */
  size?: 'lg' | 'compact';
  /** Affiche un liseré hairline au-dessus et au-dessous (dans une feuille). */
  ruled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * La signature : la bande de pesée. Poids en héros, taille à côté,
 * score en or. Les valeurs absentes affichent « — ».
 */
export default function WeighInStrip({
  weightGrams,
  lengthCm,
  score,
  size = 'lg',
  ruled = false,
  style,
  testID,
}: WeighInStripProps) {
  const w = weightGrams != null && weightGrams > 0 ? splitWeight(weightGrams) : null;
  const l = lengthCm != null && lengthCm > 0 ? splitLength(lengthCm) : null;
  const s = score != null ? splitScore(score) : null;
  const heroSize = size === 'lg' ? 'lg' : 'md';
  const sideSize = size === 'lg' ? 'md' : 'sm';

  return (
    <View testID={testID} style={style}>
      {ruled ? <Divider /> : null}
      <View style={[styles.row, size === 'compact' && styles.rowCompact]}>
        <Metric value={w?.value} unit={w?.unit ?? 'kg'} label="Poids" size={heroSize} style={styles.cellHero} />
        <Divider vertical style={styles.sep} />
        <Metric value={l?.value} unit={l?.unit ?? 'cm'} label="Taille" size={sideSize} style={styles.cell} />
        <Divider vertical style={styles.sep} />
        <Metric value={s?.value} unit={s?.unit ?? 'pts'} label="Score" size={sideSize} tone="gold" style={styles.cell} />
      </View>
      {ruled ? <Divider /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', paddingVertical: spacing.ms },
  rowCompact: { paddingVertical: spacing.sm },
  cellHero: { flex: 1.3, justifyContent: 'flex-end' },
  cell: { flex: 1, paddingLeft: spacing.ms, justifyContent: 'flex-end' },
  sep: { marginLeft: spacing.ms, backgroundColor: colors.hairline },
});

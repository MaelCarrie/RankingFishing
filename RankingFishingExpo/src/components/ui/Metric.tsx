import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, typography } from '../../theme';
import { spokenUnit } from './format';

export type MetricSize = 'lg' | 'md' | 'sm';

export interface MetricProps {
  /** Valeur déjà formatée (« 4,2 ») ou nombre. null / undefined → « — ». */
  value: string | number | null | undefined;
  unit?: string;
  label?: string;
  size?: MetricSize;
  /** 'gold' réservé à la réussite (score, XP). */
  tone?: 'ink' | 'gold' | 'primary';
  align?: 'left' | 'center' | 'right';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const VALUE_STYLE = {
  lg: typography.metricLarge,
  md: typography.metricMedium,
  sm: { fontSize: 17, fontWeight: '600' as const, lineHeight: 22, fontVariant: typography.numeric.fontVariant },
};
const UNIT_SIZE = { lg: 16, md: 14, sm: 13 };

/** Chiffre héros : valeur en chiffres tabulaires, unité plus petite en encre secondaire, libellé dessous. */
export default function Metric({ value, unit, label, size = 'lg', tone = 'ink', align = 'left', style, testID }: MetricProps) {
  const empty = value === null || value === undefined || value === '';
  const color = empty ? colors.inkTertiary : tone === 'gold' ? colors.goldInk : tone === 'primary' ? colors.primary : colors.ink;
  const text = empty ? '—' : String(value);
  const spoken = empty ? 'non renseigné' : `${text.replace(/\u202F/g, '')} ${unit ? spokenUnit(unit) : ''}`.trim();
  const alignItems = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';

  return (
    <View
      testID={testID}
      style={[{ alignItems }, style]}
      accessible
      accessibilityLabel={label ? `${label} : ${spoken}` : spoken}
    >
      <View style={styles.line}>
        <Text style={[VALUE_STYLE[size], { color }]} numberOfLines={1}>{text}</Text>
        {unit && !empty ? (
          <Text style={[styles.unit, { fontSize: UNIT_SIZE[size] }]}>{unit}</Text>
        ) : null}
      </View>
      {label ? <Text style={styles.label} numberOfLines={1}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'baseline' },
  unit: { fontWeight: '500', color: colors.inkSecondary, marginLeft: 3 },
  label: { ...typography.footnote, color: colors.inkSecondary, marginTop: 2 },
});

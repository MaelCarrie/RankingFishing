import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, medals, typography } from '../../theme';
import { formatInt } from './format';

export interface RankBadgeProps {
  rank: number;
  /** sm 28, md 32, lg 40. */
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

const DIM = { sm: 28, md: 32, lg: 40 };
const FONT = { sm: 13, md: 15, lg: 17 };

/** Numéro de rang. Top 3 : tuile or / argent / bronze sobre. Au-delà : chiffre seul. */
export default function RankBadge({ rank, size = 'md', style }: RankBadgeProps) {
  const medal = rank === 1 ? medals.gold : rank === 2 ? medals.silver : rank === 3 ? medals.bronze : null;
  const d = DIM[size];
  const label = rank === 1 ? '1er' : `${rank}e`;
  return (
    <View
      accessible
      accessibilityLabel={`Rang ${label}`}
      style={[
        styles.base,
        { minWidth: d, height: d, borderRadius: d / 2 },
        medal && { backgroundColor: medal.bg, borderColor: medal.border, borderWidth: 1.5 },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { fontSize: rank > 999 ? FONT[size] - 3 : FONT[size] },
          { color: medal ? medal.ink : colors.inkSecondary },
          medal && { fontWeight: '700' },
        ]}
        numberOfLines={1}
      >
        {formatInt(rank)}
      </Text>
    </View>
  );
}

export interface RankDeltaProps {
  /** Places gagnées (positif) ou perdues (négatif). */
  delta: number;
  style?: StyleProp<ViewStyle>;
}

/** Mouvement de rang : montée en or (réussite), descente en encre secondaire. */
export function RankDelta({ delta, style }: RankDeltaProps) {
  const up = delta > 0;
  const flat = delta === 0;
  const color = up ? colors.goldInk : colors.inkSecondary;
  const n = Math.abs(delta);
  const places = `${n} place${n > 1 ? 's' : ''}`;
  const label = flat ? 'Rang inchangé' : up ? `Gagne ${places}` : `Perd ${places}`;
  return (
    <View style={[styles.delta, style]} accessible accessibilityLabel={label}>
      {flat ? (
        <Text style={[styles.deltaText, { color }]}>—</Text>
      ) : (
        <>
          <Ionicons name={up ? 'arrow-up' : 'arrow-down'} size={13} color={color} />
          <Text style={[styles.deltaText, { color }]}>{formatInt(Math.abs(delta))}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  text: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  delta: { flexDirection: 'row', alignItems: 'center' },
  deltaText: { ...typography.footnote, fontWeight: '600', fontVariant: ['tabular-nums'], marginLeft: 1 },
});

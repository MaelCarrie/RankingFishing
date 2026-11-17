import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { RankingEntry } from '../../store/types';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Avatar, RankDelta, formatInt } from '../ui';
import { formatRank } from '../../utils/formatting';

export function formatPoints(score: number): string {
  return `${score.toLocaleString('fr-FR')} pts`;
}

function capturesLabel(n: number): string {
  return `${formatInt(n)} capture${n > 1 ? 's' : ''}`;
}

interface RankRowProps {
  entry: RankingEntry;
  onPress?: (entry: RankingEntry) => void;
  /** Variante épinglée (bas d'écran) : pas de feuille autour. */
  pinned?: boolean;
  /** Position dans la feuille de classement (coins arrondis, séparateur). */
  first?: boolean;
  last?: boolean;
  testID?: string;
}

/** Largeur fixe de la colonne de rang : les chiffres restent alignés de 1 à 999. */
export const RANK_COL = 36;
const AVATAR = 36;

// Ligne de classement dense. La ligne de l'utilisateur connecté est mise en
// avant par la teinte ET par un libellé « Toi » (jamais par la couleur seule).
export default function RankRow({ entry, onPress, pinned = false, first = false, last = false, testID }: RankRowProps) {
  const isMe = !!entry.isCurrentUser;
  const sub = [capturesLabel(entry.totalCaptures), entry.topSpecies].filter(Boolean).join(' · ');
  const delta = entry.previousRank != null ? entry.previousRank - entry.rank : null;
  const movement = delta == null ? ''
    : delta === 0 ? ', rang inchangé'
    : `, ${delta > 0 ? 'gagne' : 'perd'} ${Math.abs(delta)} place${Math.abs(delta) > 1 ? 's' : ''}`;

  return (
    <View
      style={[
        !pinned && styles.sheetSlice,
        !pinned && first && styles.sliceFirst,
        !pinned && last && styles.sliceLast,
      ]}
    >
      <Pressable
        disabled={!onPress}
        onPress={() => onPress?.(entry)}
        style={({ pressed }) => [
          styles.row,
          isMe && styles.rowMe,
          pinned && styles.rowPinned,
          pressed && styles.rowPressed,
        ]}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${formatRank(entry.rank)}, ${isMe ? 'toi, ' : ''}${entry.username}, ${formatPoints(entry.score)}, ${sub}${movement}`}
        testID={testID ?? `ranking-row-${entry.userId}`}
      >
        <Text style={[styles.rank, isMe && styles.textMe]} numberOfLines={1} adjustsFontSizeToFit>
          {formatInt(entry.rank)}
        </Text>
        <Avatar username={entry.username} uri={entry.avatar} size={AVATAR} />
        <View style={styles.info}>
          <View style={styles.nameLine}>
            <Text style={[styles.username, isMe && styles.textMe]} numberOfLines={1}>{entry.username}</Text>
            {isMe && (
              <View style={styles.meTag}>
                <Text style={styles.meTagText}>Toi</Text>
              </View>
            )}
          </View>
          <Text style={styles.sub} numberOfLines={1}>{sub}</Text>
        </View>
        <View style={styles.scoreCol}>
          <Text style={styles.score} numberOfLines={1}>
            {formatInt(entry.score)}
            <Text style={styles.unit}> pts</Text>
          </Text>
          {/* Mouvement de rang : seulement si la donnée existe (jamais inventé) */}
          {delta != null && delta !== 0 ? <RankDelta delta={delta} /> : null}
        </View>
      </Pressable>
      {!pinned && !last ? <View style={styles.divider} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sheetSlice: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  sliceFirst: { borderTopWidth: 1, borderTopLeftRadius: borderRadius.sheet, borderTopRightRadius: borderRadius.sheet },
  sliceLast: { borderBottomWidth: 1, borderBottomLeftRadius: borderRadius.sheet, borderBottomRightRadius: borderRadius.sheet },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    paddingLeft: spacing.xs,
    gap: spacing.sm,
  },
  rowPinned: { paddingLeft: spacing.xs, borderRadius: borderRadius.control },
  rowMe: { backgroundColor: colors.primaryTint },
  rowPressed: { backgroundColor: colors.pressed },
  rank: {
    width: RANK_COL,
    textAlign: 'center',
    ...typography.callout,
    fontWeight: '600',
    color: colors.inkSecondary,
    fontVariant: ['tabular-nums'],
  },
  textMe: { color: colors.primaryDark },
  info: { flex: 1, minWidth: 0 },
  scoreCol: { alignItems: 'flex-end', gap: 2 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  username: { ...typography.callout, color: colors.ink, fontWeight: '600', flexShrink: 1 },
  meTag: {
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 5,
  },
  meTagText: { ...typography.caption, color: colors.primaryDark, fontWeight: '700' },
  sub: { ...typography.footnote, color: colors.inkSecondary, marginTop: 1, fontVariant: ['tabular-nums'] },
  score: { ...typography.headline, color: colors.ink, fontVariant: ['tabular-nums'], textAlign: 'right', minWidth: 72 },
  unit: { ...typography.footnote, color: colors.inkSecondary, fontWeight: '500' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    marginLeft: spacing.xs + RANK_COL + spacing.sm + AVATAR + spacing.sm,
  },
});

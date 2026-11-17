import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { RankingEntry } from '../../store/types';
import { colors, medals, spacing, typography, borderRadius } from '../../theme';
import { Avatar, RankBadge, formatInt } from '../ui';
import { formatPoints } from './RankRow';

// Or / argent / bronze (tokens `medals`) : le chiffre reste affiché, la
// couleur n'est jamais la seule information.
const MEDAL = [medals.gold, medals.silver, medals.bronze];
const SIZES = [64, 52, 52];

function PodiumEntry({
  entry, position, onPress,
}: { entry: RankingEntry; position: number; onPress?: (e: RankingEntry) => void }) {
  const medal = MEDAL[position];
  const isMe = !!entry.isCurrentUser;
  return (
    <Pressable
      style={({ pressed }) => [styles.entry, pressed && styles.entryPressed]}
      onPress={() => onPress?.(entry)}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${position + 1}${position === 0 ? 'er' : 'e'}, ${isMe ? 'toi, ' : ''}${entry.username}, ${formatPoints(entry.score)}`}
      testID={`ranking-podium-${position + 1}`}
    >
      <View style={[styles.ring, { borderColor: medal.border, borderRadius: (SIZES[position] + 6) / 2 }]}>
        <Avatar username={entry.username} uri={entry.avatar} size={SIZES[position]} />
      </View>
      <RankBadge rank={position + 1} size="sm" style={styles.badge} />
      <View style={styles.nameLine}>
        <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>{entry.username}</Text>
      </View>
      {isMe ? <Text style={styles.me}>Toi</Text> : null}
      <Text style={[styles.score, position === 0 && styles.scoreFirst]} numberOfLines={1}>
        {formatInt(entry.score)}
        <Text style={styles.unit}> pts</Text>
      </Text>
    </Pressable>
  );
}

export default function Podium({
  top3, onPress,
}: { top3: RankingEntry[]; onPress?: (e: RankingEntry) => void }) {
  if (top3.length < 3) return null;
  return (
    <View style={styles.podium} testID="ranking-podium">
      <PodiumEntry entry={top3[1]} position={1} onPress={onPress} />
      <PodiumEntry entry={top3[0]} position={0} onPress={onPress} />
      <PodiumEntry entry={top3[2]} position={2} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.ms,
    borderRadius: borderRadius.sheet,
    paddingTop: spacing.md,
    paddingBottom: spacing.ms,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  entry: { alignItems: 'center', flex: 1, minHeight: 44, paddingHorizontal: 4, paddingVertical: spacing.xs, borderRadius: borderRadius.control },
  entryPressed: { backgroundColor: colors.pressed },
  ring: { borderWidth: 2, padding: 1 },
  badge: { marginTop: -12 },
  nameLine: { marginTop: spacing.xs, maxWidth: '100%' },
  name: { ...typography.subhead, color: colors.ink, fontWeight: '600', textAlign: 'center' },
  nameMe: { color: colors.primaryDark },
  me: { ...typography.caption, color: colors.primaryDark, fontWeight: '700' },
  score: { ...typography.callout, color: colors.ink, fontWeight: '600', marginTop: 1, fontVariant: ['tabular-nums'] },
  scoreFirst: { ...typography.headline, fontVariant: ['tabular-nums'] },
  unit: { ...typography.caption, color: colors.inkSecondary, fontWeight: '500' },
});

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../../store/types';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { FISHING_TYPE_LABELS } from '../../config/constants';
import { Avatar, XPBar, formatInt } from '../ui';

const EXPERTISE_LABELS = { beginner: 'Débutant', intermediate: 'Intermédiaire', expert: 'Expert' };

// Paliers d'XP (même table que l'ancien écran Mon profil)
const LEVEL_THRESHOLDS = [0, 200, 500, 1000, 2000, 4000, 8000];

export function levelBounds(level: number, xp: number): { levelXp: number; nextXp: number } {
  const levelXp = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextXp = LEVEL_THRESHOLDS[level] ?? Math.max(xp, levelXp + 1);
  return { levelXp, nextXp };
}

interface CounterProps {
  value: number;
  label: string;
  onPress?: () => void;
  accessibilityLabel: string;
  testID?: string;
}

function Counter({ value, label, onPress, accessibilityLabel, testID }: CounterProps) {
  const content = (
    <>
      <Text style={styles.counterValue}>{formatInt(value)}</Text>
      <Text style={styles.counterLabel} numberOfLines={1}>{label}</Text>
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.counter} accessible accessibilityLabel={accessibilityLabel} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={({ pressed }) => [styles.counter, pressed && styles.counterPressed]}
    >
      {content}
    </Pressable>
  );
}

interface Props {
  user: User;
  /** Boutons d'action (Suivre / Message) sous la bio. */
  actions?: React.ReactNode;
  /** Bandeau optionnel (demande entrante) entre l'identité et les compteurs. */
  notice?: React.ReactNode;
  onPressFollowers?: () => void;
  onPressFollowing?: () => void;
}

/**
 * En-tête de profil partagé (Mon profil et profil public) : identité,
 * progression de niveau, puis une seule rangée de compteurs réglée.
 */
export default function ProfileHeader({ user, actions, notice, onPressFollowers, onPressFollowing }: Props) {
  const { levelXp, nextXp } = levelBounds(user.level, user.xp);

  return (
    <View>
      <View style={styles.identity}>
        <Avatar username={user.username} uri={user.avatar} size={76} premium={user.isPremium} />
        <View style={styles.identityText}>
          <Text style={styles.username} numberOfLines={1}>{user.username}</Text>
          {user.location ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={colors.inkSecondary} />
              <Text style={styles.metaText} numberOfLines={1}>{user.location}</Text>
            </View>
          ) : null}
          {user.isPremium ? (
            <View style={styles.premiumTag} accessible accessibilityLabel="Membre Premium">
              <Ionicons name="star" size={11} color={colors.goldInk} />
              <Text style={styles.premiumText}>Premium</Text>
            </View>
          ) : null}
        </View>
      </View>

      {user.bio ? <Text style={styles.bio} numberOfLines={4}>{user.bio}</Text> : null}

      {user.specialties.length > 0 ? (
        <View style={styles.tags}>
          {user.specialties.map((s) => (
            <View
              key={s.type}
              style={styles.tag}
              accessible
              accessibilityLabel={`${FISHING_TYPE_LABELS[s.type]}, niveau ${EXPERTISE_LABELS[s.level]}`}
            >
              <Text style={styles.tagText}>{FISHING_TYPE_LABELS[s.type]}</Text>
              <Text style={styles.tagLevel}>{EXPERTISE_LABELS[s.level]}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {actions ? <View style={styles.actions}>{actions}</View> : null}
      {notice ? <View style={styles.notice}>{notice}</View> : null}

      <XPBar
        xp={user.xp}
        levelXp={levelXp}
        nextXp={nextXp}
        level={user.level}
        levelName={user.levelName}
        showTotal
        style={styles.xp}
      />

      <View style={styles.counters}>
        <Counter
          value={user.stats.totalCaptures}
          label="Captures"
          accessibilityLabel={`${user.stats.totalCaptures} captures`}
        />
        <View style={styles.counterSep} />
        <Counter
          value={user.followersCount}
          label="Abonnés"
          onPress={onPressFollowers}
          accessibilityLabel={`${user.followersCount} abonnés, voir la liste`}
          testID="profile-followers"
        />
        <View style={styles.counterSep} />
        <Counter
          value={user.followingCount}
          label="Abonnements"
          onPress={onPressFollowing}
          accessibilityLabel={`${user.followingCount} abonnements, voir la liste`}
          testID="profile-following"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identityText: { flex: 1, minWidth: 0, gap: 3 },
  username: { ...typography.title2, color: colors.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...typography.subhead, color: colors.inkSecondary, flexShrink: 1 },
  premiumTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    marginTop: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.goldTint,
  },
  premiumText: { ...typography.caption, color: colors.goldInk, fontWeight: '600' },
  bio: { ...typography.callout, color: colors.ink, marginTop: spacing.ms },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.ms },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  tagText: { ...typography.footnote, color: colors.ink, fontWeight: '500' },
  tagLevel: { ...typography.footnote, color: colors.inkSecondary },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  notice: { marginTop: spacing.md },
  xp: { marginTop: spacing.lg },
  counters: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  counter: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 60, paddingVertical: spacing.sm },
  counterPressed: { backgroundColor: colors.pressed },
  counterSep: { width: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginVertical: spacing.ms },
  counterValue: { ...typography.metricMedium, color: colors.ink },
  counterLabel: { ...typography.footnote, color: colors.inkSecondary, marginTop: 1 },
});

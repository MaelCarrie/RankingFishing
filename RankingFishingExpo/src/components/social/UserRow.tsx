import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { Avatar } from '../ui';
import { UserSearchResult } from '../../api/users';

interface Props {
  user: UserSearchResult;
  onPress?: (userId: string) => void;
  rightSlot?: React.ReactNode;
  showChevron?: boolean;
  /** Élément avant l'avatar (rang dans une liste « top »). */
  leading?: React.ReactNode;
}

export const USER_ROW_AVATAR = 44;

/** Ligne pêcheur : avatar, pseudo, niveau et lieu, action à droite. 64 pt de haut. */
export default function UserRow({ user, onPress, rightSlot, showChevron = false, leading }: Props) {
  const meta = [`Niveau ${user.level} · ${user.levelName}`, user.location].filter(Boolean).join(' · ');
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && onPress && styles.rowPressed]}
      onPress={() => onPress?.(user.id)}
      disabled={!onPress}
      android_ripple={onPress ? { color: colors.pressed } : undefined}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${user.username}, ${meta}`}
    >
      {leading}
      <Avatar username={user.username} uri={user.avatar} size={USER_ROW_AVATAR} premium={user.isPremium} />
      <View style={styles.info}>
        <Text style={styles.username} numberOfLines={1}>{user.username}</Text>
        <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
      </View>
      {rightSlot}
      {showChevron && !rightSlot && (
        <Ionicons name="chevron-forward" size={18} color={colors.inkTertiary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.ms,
    minHeight: 64,
    gap: spacing.ms,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  rowPressed: { backgroundColor: colors.background },
  info: { flex: 1, minWidth: 0 },
  username: { ...typography.headline, color: colors.ink },
  meta: { ...typography.footnote, color: colors.inkSecondary, marginTop: 1 },
});

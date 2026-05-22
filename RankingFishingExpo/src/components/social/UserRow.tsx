import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import Avatar from '../common/Avatar';
import { UserSearchResult } from '../../api/users';

interface Props {
  user: UserSearchResult;
  onPress?: (userId: string) => void;
  rightSlot?: React.ReactNode;
  showChevron?: boolean;
}

export default function UserRow({ user, onPress, rightSlot, showChevron = false }: Props) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress?.(user.id)}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Avatar username={user.username} uri={user.avatar} size={48} isPremium={user.isPremium} />
      <View style={styles.info}>
        <Text style={styles.username}>{user.username}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          Niveau {user.level} · {user.levelName}
          {user.location ? ` · ${user.location}` : ''}
        </Text>
      </View>
      {rightSlot}
      {showChevron && !rightSlot && (
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  info: { flex: 1 },
  username: { ...typography.h4, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});

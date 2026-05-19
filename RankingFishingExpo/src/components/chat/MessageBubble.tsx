import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '../../store/types';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { formatRelativeDate } from '../../utils/formatting';

interface Props {
  message: Message;
  isOwn: boolean;
  showSender?: boolean;
}

export default function MessageBubble({ message, isOwn, showSender = false }: Props) {
  return (
    <View style={[styles.wrapper, isOwn && styles.wrapperOwn]}>
      {showSender && !isOwn && (
        <Text style={styles.sender}>{message.senderName}</Text>
      )}
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={[styles.text, isOwn && styles.textOwn]}>{message.content}</Text>
      </View>
      <Text style={[styles.time, isOwn && styles.timeOwn]}>
        {formatRelativeDate(message.sentAt)}
        {isOwn && (
          <Text style={styles.readStatus}>{message.isRead ? '  ✓✓' : '  ✓'}</Text>
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.sm, maxWidth: '80%', alignSelf: 'flex-start' },
  wrapperOwn: { alignSelf: 'flex-end' },
  sender: { ...typography.caption, color: colors.primary, fontWeight: '700', marginBottom: 3, marginLeft: spacing.sm },
  bubble: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleOwn: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  text: { ...typography.body, color: colors.textPrimary },
  textOwn: { color: '#FFFFFF' },
  time: { ...typography.caption, color: colors.textSecondary, marginTop: 3, marginLeft: spacing.sm },
  timeOwn: { textAlign: 'right', marginRight: spacing.sm },
  readStatus: { color: colors.primary },
});

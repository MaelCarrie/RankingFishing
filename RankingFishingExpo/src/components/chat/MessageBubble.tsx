import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../../store/types';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { CAPTURE_SHARE_DEFAULT_TEXT } from '../../api/chat';
import SharedCaptureCard from './SharedCaptureCard';

interface Props {
  message: Message;
  isOwn: boolean;
  showSender?: boolean;
  onPressCapture?: (message: Message) => void;
  onPressFailed?: (message: Message) => void;
  captureLoading?: boolean;
}

export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MessageBubble({
  message, isOwn, showSender = false, onPressCapture, onPressFailed, captureLoading = false,
}: Props) {
  const isCapture = message.type === 'capture' && !!message.captureRef;
  const failed = message.status === 'failed';
  const sending = message.status === 'sending';
  // Le texte par défaut d'un partage n'apporte rien sous la carte
  const caption = isCapture && message.content === CAPTURE_SHARE_DEFAULT_TEXT ? '' : message.content;

  const body = (
    <>
      {isCapture && (
        <SharedCaptureCard
          captureRef={message.captureRef!}
          preview={message.capturePreview}
          isOwn={isOwn}
          loading={captureLoading}
          onPress={onPressCapture && !sending ? () => onPressCapture(message) : undefined}
        />
      )}
      {caption ? (
        <View
          style={[
            styles.bubble,
            isOwn ? styles.bubbleOwn : styles.bubbleOther,
            isCapture && styles.captionBubble,
            failed && styles.bubbleFailed,
          ]}
        >
          <Text style={[styles.text, isOwn && styles.textOwn]}>{caption}</Text>
        </View>
      ) : null}
    </>
  );

  return (
    <View style={[styles.wrapper, isOwn && styles.wrapperOwn]} testID={`message-${message.id}`}>
      {showSender && !isOwn && (
        <Text style={styles.sender}>{message.senderName}</Text>
      )}

      {failed && onPressFailed ? (
        <TouchableOpacity
          onPress={() => onPressFailed(message)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Message non envoyé. Toucher pour réessayer ou supprimer"
        >
          {body}
        </TouchableOpacity>
      ) : (
        body
      )}

      <View style={[styles.meta, isOwn && styles.metaOwn]}>
        {failed ? (
          <>
            <Ionicons name="alert-circle" size={13} color={colors.error} />
            <Text style={[styles.time, styles.failedText]}>Non envoyé · toucher pour réessayer</Text>
          </>
        ) : (
          <>
            <Text style={styles.time}>{formatMessageTime(message.sentAt)}</Text>
            {isOwn && (
              sending ? (
                <Ionicons name="time-outline" size={12} color={colors.textDisabled} accessibilityLabel="Envoi en cours" />
              ) : (
                <Ionicons
                  name={message.isRead ? 'checkmark-done' : 'checkmark'}
                  size={14}
                  color={message.isRead ? colors.primary : colors.textSecondary}
                  accessibilityLabel={message.isRead ? 'Lu' : 'Envoyé'}
                />
              )
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.ms, maxWidth: '80%', alignSelf: 'flex-start', alignItems: 'flex-start' },
  wrapperOwn: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  sender: { ...typography.caption, color: colors.inkSecondary, fontWeight: '600', marginBottom: 3, marginLeft: spacing.sm },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: spacing.ms + 2,
    paddingVertical: spacing.sm,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderBottomLeftRadius: 4,
  },
  bubbleOwn: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleFailed: { opacity: 0.6 },
  captionBubble: { marginTop: spacing.xs },
  text: { ...typography.body, color: colors.ink },
  textOwn: { color: '#FFFFFF' },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    marginHorizontal: spacing.sm,
  },
  metaOwn: { justifyContent: 'flex-end' },
  time: { ...typography.caption, color: colors.inkSecondary, fontVariant: ['tabular-nums'] },
  failedText: { color: colors.error, fontWeight: '600' },
});

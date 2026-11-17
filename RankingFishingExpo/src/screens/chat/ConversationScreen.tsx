import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  NativeScrollEvent, NativeSyntheticEvent,
} from 'react-native';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchMessages, sendMessage, addMessage, updateMessage, removeMessage, retryMessage,
  markConversationRead, setActiveConversation, shareCapture,
} from '../../store/slices/chatSlice';
import { fetchSharedCapture, getConversationAvatar, getConversationTitle, subscribeToMessages } from '../../api/chat';
import { ChatStackParamList, MainStackParamList, RootStackParamList } from '../../navigation/types';
import { Capture, Message } from '../../store/types';
import { colors, spacing, borderRadius, typography } from '../../theme';
import MessageBubble from '../../components/chat/MessageBubble';
import CapturePickerModal from '../../components/chat/CapturePickerModal';
import Avatar from '../../components/common/Avatar';
import { EmptyState, ErrorState } from '../../components/ui';

type Props = NativeStackScreenProps<ChatStackParamList, 'Conversation'>;
type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<ChatStackParamList, 'Conversation'>,
  CompositeNavigationProp<NativeStackNavigationProp<MainStackParamList>, NativeStackNavigationProp<RootStackParamList>>
>;

type Row =
  | { kind: 'message'; key: string; message: Message; showSender: boolean }
  | { kind: 'day'; key: string; label: string };

const EMPTY: Message[] = [];
const AT_BOTTOM_THRESHOLD = 80;

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return 'Aujourd\'hui';
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return 'Hier';
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
    ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  });
}

export default function ConversationScreen({ route }: Props) {
  const navigation = useNavigation<Nav>();
  const conversationId = route.params.conversation.id;
  const dispatch = useAppDispatch();
  const headerHeight = useHeaderHeight();
  // Pas de barre d'onglets ici : le champ repose sur la zone sûre du bas
  const insets = useSafeAreaInsets();

  const user = useAppSelector((s) => s.auth.user);
  const stored = useAppSelector((s) => s.chat.conversations.find((c) => c.id === conversationId));
  const conversation = stored ?? route.params.conversation;
  const convMessages = useAppSelector((s) => s.chat.messages[conversationId]) ?? EMPTY;
  const loading = useAppSelector((s) => s.chat.messagesLoading?.[conversationId] ?? false);
  const loadError = useAppSelector((s) => s.chat.messagesError?.[conversationId] ?? null);
  const feed = useAppSelector((s) => s.captures.feed);
  const myCaptures = useAppSelector((s) => s.captures.myCaptures);

  const [text, setText] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openingCaptureId, setOpeningCaptureId] = useState<string | null>(null);
  const [showJump, setShowJump] = useState(false);

  const listRef = useRef<FlatList<Row>>(null);
  const isFocusedRef = useRef(true);
  const isAtBottomRef = useRef(true);
  const markTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  const isGroup = conversation.type === 'group';
  const title = getConversationTitle(conversation);
  const other = conversation.otherParticipant;

  // ─── Header : nom de l'autre pêcheur + accès à son profil ───────────────────
  useLayoutEffect(() => {
    navigation.setOptions({
      title,
      headerRight: !isGroup && other
        ? () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('UserProfile', { userId: other.id })}
            style={styles.headerAvatarBtn}
            accessibilityRole="button"
            accessibilityLabel={`Voir le profil de ${other.username}`}
          >
            <Avatar username={other.username} uri={getConversationAvatar(conversation)} size={32} />
          </TouchableOpacity>
        )
        : undefined,
    });
  }, [navigation, title, isGroup, other, conversation]);

  // ─── Marquage comme lu ───────────────────────────────────────────────────────
  const markRead = useCallback(() => {
    if (markTimer.current) clearTimeout(markTimer.current);
    markTimer.current = null;
    dispatch(markConversationRead({ conversationId, userId: userIdRef.current }));
  }, [dispatch, conversationId]);

  const scheduleMarkRead = useCallback(() => {
    if (markTimer.current) clearTimeout(markTimer.current);
    markTimer.current = setTimeout(markRead, 700);
  }, [markRead]);

  // ─── Chargement + abonnement temps réel (désabonnement au démontage) ────────
  useEffect(() => {
    dispatch(fetchMessages(conversationId));

    const unsubscribe = subscribeToMessages(
      conversationId,
      (incoming) => {
        // Dédupliqué par id : l'écho de mes propres messages remplace la version optimiste
        dispatch(addMessage(incoming));
        if (incoming.senderId !== userIdRef.current && isFocusedRef.current) scheduleMarkRead();
      },
      (updated) => dispatch(updateMessage(updated))
    );

    return () => {
      unsubscribe();
      if (markTimer.current) clearTimeout(markTimer.current);
    };
  }, [dispatch, conversationId, scheduleMarkRead]);

  // Conversation active (pas de non-lus pendant qu'elle est à l'écran)
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      dispatch(setActiveConversation(conversation));
      markRead();
      return () => {
        isFocusedRef.current = false;
        dispatch(setActiveConversation(null));
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, conversationId, markRead])
  );

  // ─── Lignes de la liste (inversée : la plus récente en premier) ──────────────
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let prevDay = '';
    let prevSender = '';
    convMessages.forEach((m) => {
      const k = dayKey(m.sentAt);
      if (k !== prevDay) {
        out.push({ kind: 'day', key: `day-${k}`, label: dayLabel(m.sentAt) });
        prevDay = k;
        prevSender = '';
      }
      const isOwn = m.senderId === user?.id;
      out.push({
        kind: 'message',
        key: m.id,
        message: m,
        showSender: isGroup && !isOwn && m.senderId !== prevSender,
      });
      prevSender = m.senderId;
    });
    return out.reverse();
  }, [convMessages, user?.id, isGroup]);

  // ─── Auto-scroll sur nouveau message ─────────────────────────────────────────
  const newestId = convMessages[convMessages.length - 1]?.id;
  const newestIsOwn = convMessages[convMessages.length - 1]?.senderId === user?.id;
  useEffect(() => {
    if (!newestId) return;
    if (newestIsOwn || isAtBottomRef.current) {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      setShowJump(false);
    } else {
      setShowJump(true);
    }
  }, [newestId, newestIsOwn]);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const atBottom = e.nativeEvent.contentOffset.y < AT_BOTTOM_THRESHOLD;
    isAtBottomRef.current = atBottom;
    if (atBottom && showJump) setShowJump(false);
  }

  function jumpToBottom() {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    setShowJump(false);
  }

  // ─── Actions ────────────────────────────────────────────────────────────────
  function handleSend() {
    const content = text.trim();
    if (!content || !user) return;
    setText('');
    dispatch(sendMessage({
      conversationId,
      senderId: user.id,
      senderName: user.username,
      content,
      senderAvatar: user.avatar,
    }));
  }

  function handleShareCapture(capture: Capture) {
    setPickerOpen(false);
    if (!user) return;
    dispatch(shareCapture({
      conversationId,
      capture,
      sender: { id: user.id, username: user.username, avatar: user.avatar },
    }));
  }

  function handleFailedPress(message: Message) {
    const retry = () => dispatch(retryMessage(message));
    const remove = () => dispatch(removeMessage({ conversationId, messageId: message.id }));
    if (Platform.OS === 'web') {
      retry();
      return;
    }
    Alert.alert('Message non envoyé', 'Vérifie ta connexion puis réessaie.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: remove },
      { text: 'Réessayer', onPress: retry },
    ]);
  }

  async function handleOpenCapture(message: Message) {
    const captureId = message.captureRef?.captureId;
    if (!captureId || openingCaptureId) return;
    const local = [...feed, ...myCaptures].find((c) => c.id === captureId);
    if (local) {
      navigation.navigate('CaptureDetail', { capture: local });
      return;
    }
    setOpeningCaptureId(captureId);
    try {
      const capture = await fetchSharedCapture(captureId, user?.id);
      if (capture) navigation.navigate('CaptureDetail', { capture });
      else Alert.alert('Capture indisponible', 'Cette capture a été supprimée ou n\'est plus publique.');
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible d\'ouvrir la capture');
    } finally {
      setOpeningCaptureId(null);
    }
  }

  // ─── Rendu ──────────────────────────────────────────────────────────────────
  let body: React.ReactNode;
  if (rows.length === 0 && loading) {
    body = (
      <View style={styles.state}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  } else if (rows.length === 0 && loadError) {
    body = (
      <View style={styles.state}>
        <ErrorState
          title="Messages indisponibles"
          message={`${loadError}\nVérifie ta connexion puis réessaie.`}
          onRetry={() => dispatch(fetchMessages(conversationId))}
        />
      </View>
    );
  } else if (rows.length === 0) {
    body = (
      <View style={styles.state}>
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="Lance la discussion"
          message={isGroup ? 'Écris le premier message du groupe.' : `Dis bonjour à ${title} ou partage-lui ta dernière prise.`}
        />
      </View>
    );
  } else {
    body = (
      <FlatList
        ref={listRef}
        data={rows}
        inverted
        keyExtractor={(r) => r.key}
        renderItem={({ item }) => {
          if (item.kind === 'day') {
            return (
              <View style={styles.dayRow}>
                <Text style={styles.dayText}>{item.label}</Text>
              </View>
            );
          }
          return (
            <MessageBubble
              message={item.message}
              isOwn={item.message.senderId === user?.id}
              showSender={item.showSender}
              onPressCapture={handleOpenCapture}
              onPressFailed={handleFailedPress}
              captureLoading={openingCaptureId === item.message.captureRef?.captureId}
            />
          );
        }}
        contentContainerStyle={styles.messages}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={100}
      />
    );
  }

  const canSend = text.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <View style={styles.flex}>
        {body}
        {showJump && (
          <TouchableOpacity
            style={styles.jumpPill}
            onPress={jumpToBottom}
            accessibilityRole="button"
            accessibilityLabel="Voir les nouveaux messages"
          >
            <Ionicons name="arrow-down" size={16} color="#FFFFFF" />
            <Text style={styles.jumpText}>Nouveaux messages</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.inputBar, { paddingBottom: spacing.sm + insets.bottom }]}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Partager une capture"
          testID="chat-attach-capture"
        >
          <Ionicons name="fish-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Écris ton message…"
          placeholderTextColor={colors.textDisabled}
          multiline
          maxLength={1000}
          accessibilityLabel="Message"
          testID="chat-message-input"
        />
        <TouchableOpacity
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Envoyer"
          accessibilityState={{ disabled: !canSend }}
          testID="chat-send-button"
        >
          <Ionicons name="send" size={18} color={canSend ? '#fff' : colors.inkTertiary} />
        </TouchableOpacity>
      </View>

      <CapturePickerModal
        visible={pickerOpen}
        userId={user?.id}
        onClose={() => setPickerOpen(false)}
        onSelect={handleShareCapture}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  messages: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },

  headerAvatarBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  dayRow: { alignItems: 'center', marginVertical: spacing.ms },
  dayText: {
    ...typography.caption,
    color: colors.inkSecondary,
    fontWeight: '600',
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },

  state: { flex: 1, justifyContent: 'center' },

  jumpPill: {
    position: 'absolute',
    bottom: spacing.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  jumpText: { ...typography.bodySmall, color: '#FFFFFF', fontWeight: '700' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    gap: spacing.xs,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 16,
    color: colors.ink,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.surfaceMuted },
});

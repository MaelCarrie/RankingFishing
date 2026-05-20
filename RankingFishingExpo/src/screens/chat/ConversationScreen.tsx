import React, { useEffect, useState, useRef } from 'react';
import {
  View, FlatList, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchMessages, sendMessage, addMessage } from '../../store/slices/chatSlice';
import { subscribeToMessages } from '../../api/chat';
import { USE_MOCK_DATA } from '../../config/supabase';
import { ChatStackParamList } from '../../navigation/types';
import { Message } from '../../store/types';
import { colors, spacing, borderRadius } from '../../theme';
import MessageBubble from '../../components/chat/MessageBubble';

type Props = NativeStackScreenProps<ChatStackParamList, 'Conversation'>;

export default function ConversationScreen({ route }: Props) {
  const { conversation } = route.params;
  const dispatch = useAppDispatch();
  const { messages, isLoading } = useAppSelector((s) => s.chat);
  const { user } = useAppSelector((s) => s.auth);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<Message>>(null);
  const isGroup = conversation.type === 'group';

  const convMessages = messages[conversation.id] ?? [];

  useEffect(() => {
    dispatch(fetchMessages(conversation.id));

    // Écoute temps réel (uniquement en mode Supabase)
    if (!USE_MOCK_DATA) {
      const unsubscribe = subscribeToMessages(conversation.id, (newMessage) => {
        dispatch(addMessage(newMessage));
      });
      return () => unsubscribe();
    }
  }, [dispatch, conversation.id]);

  useEffect(() => {
    if (convMessages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [convMessages.length]);

  async function handleSend() {
    const content = text.trim();
    if (!content || !user) return;
    setText('');
    dispatch(sendMessage({
      conversationId: conversation.id,
      senderId: user.id,
      senderName: user.username,
      content,
      senderAvatar: user.avatar,
    }));
  }

  if (isLoading && convMessages.length === 0) {
    return <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={convMessages}
        keyExtractor={(m) => m.id}
        renderItem={({ item, index }) => {
          const isOwn = item.senderId === user?.id;
          const prevMsg = convMessages[index - 1];
          const showSender = isGroup && !isOwn && item.senderId !== prevMsg?.senderId;
          return <MessageBubble message={item} isOwn={isOwn} showSender={showSender} />;
        }}
        contentContainerStyle={styles.messages}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.attachBtn}>
          <Ionicons name="attach" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor={colors.textDisabled}
          multiline
          maxLength={1000}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim()}
        >
          <Ionicons name="send" size={18} color={text.trim() ? '#fff' : colors.textDisabled} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messages: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: 2 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  attachBtn: { padding: spacing.xs, marginBottom: 4 },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    fontSize: 15,
    color: colors.textPrimary,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.border },
});

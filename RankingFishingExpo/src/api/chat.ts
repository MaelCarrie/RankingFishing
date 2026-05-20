import { Conversation, Message } from '../store/types';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from './mock/data';
import { delay, generateId } from '../utils/helpers';
import { supabase, USE_MOCK_DATA } from '../config/supabase';

let mockConversations = [...MOCK_CONVERSATIONS];
const mockMessages: Record<string, Message[]> = { ...MOCK_MESSAGES };

// ─── Conversations ────────────────────────────────────────────────────────────

export async function fetchConversations(userId?: string): Promise<Conversation[]> {
  if (USE_MOCK_DATA) {
    await delay(400);
    return [...mockConversations].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  if (!userId) return [];

  const { data, error } = await supabase
    .from('conversation_participants')
    .select('unread_count, conversations(*)')
    .eq('user_id', userId)
    .order('conversations(updated_at)', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const conv = row.conversations;
    return {
      id: conv.id,
      type: conv.type,
      name: conv.name ?? undefined,
      avatar: conv.avatar_url ?? undefined,
      participantIds: [],
      participantNames: [],
      lastMessage: conv.last_message ?? null,
      unreadCount: row.unread_count ?? 0,
      updatedAt: conv.updated_at,
    } as Conversation;
  });
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  if (USE_MOCK_DATA) {
    await delay(300);
    const conv = mockConversations.find((c) => c.id === conversationId);
    if (conv) conv.unreadCount = 0;
    return mockMessages[conversationId] ?? [];
  }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('sent_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapMessage);
}

// ─── Écoute temps réel ────────────────────────────────────────────────────────

export function subscribeToMessages(
  conversationId: string,
  onNewMessage: (message: Message) => void
): () => void {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onNewMessage(mapMessage(payload.new));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── Envoyer un message ───────────────────────────────────────────────────────

export async function sendMessage(
  conversationId: string,
  senderId: string,
  senderName: string,
  content: string,
  senderAvatar?: string
): Promise<Message> {
  if (USE_MOCK_DATA) {
    await delay(200);
    const message: Message = {
      id: generateId(),
      conversationId,
      senderId,
      senderName,
      senderAvatar,
      content,
      type: 'text',
      sentAt: new Date().toISOString(),
      isRead: false,
    };

    if (!mockMessages[conversationId]) {
      mockMessages[conversationId] = [];
    }
    mockMessages[conversationId].push(message);

    const conv = mockConversations.find((c) => c.id === conversationId);
    if (conv) {
      conv.lastMessage = message;
      conv.updatedAt = message.sentAt;
    }

    return message;
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      sender_name: senderName,
      sender_avatar: senderAvatar ?? null,
      content,
      type: 'text',
      is_read: false,
    })
    .select()
    .single();

  if (error) throw error;

  // Mettre à jour lastMessage + updated_at de la conversation
  await supabase
    .from('conversations')
    .update({
      last_message: {
        senderId,
        senderName,
        content,
        sentAt: data.sent_at,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  return mapMessage(data);
}

// ─── Mapper une ligne Supabase → type Message ─────────────────────────────────

function mapMessage(row: any): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderAvatar: row.sender_avatar ?? undefined,
    content: row.content,
    type: row.type ?? 'text',
    sentAt: row.sent_at,
    isRead: row.is_read ?? false,
  };
}

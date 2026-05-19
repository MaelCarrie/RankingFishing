import { Conversation, Message } from '../store/types';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from './mock/data';
import { delay, generateId } from '../utils/helpers';
import { USE_MOCK_DATA } from '../config/firebase';

let mockConversations = [...MOCK_CONVERSATIONS];
const mockMessages: Record<string, Message[]> = { ...MOCK_MESSAGES };

export async function fetchConversations(): Promise<Conversation[]> {
  if (USE_MOCK_DATA) {
    await delay(400);
    return [...mockConversations].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
  throw new Error('Firebase non configuré');
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  if (USE_MOCK_DATA) {
    await delay(300);
    // Marquer les messages comme lus
    const conv = mockConversations.find((c) => c.id === conversationId);
    if (conv) conv.unreadCount = 0;
    return mockMessages[conversationId] ?? [];
  }
  throw new Error('Firebase non configuré');
}

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
  throw new Error('Firebase non configuré');
}

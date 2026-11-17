import {
  Capture, CaptureRef, Conversation, ConversationParticipant, Message, MessageType, SharedCapturePreview,
} from '../store/types';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from './mock/data';
import { findMockChatUser, getMockSessionUser, mockChatBus } from './mock/chatExtra';
import { fetchCaptureById } from './captures';
import { fetchTopUsers, searchUsers, UserSearchResult } from './users';
import { delay, generateId } from '../utils/helpers';
import { supabase, USE_MOCK_DATA } from '../config/supabase';

// Expéditeur d'un message (l'utilisateur connecté)
export type ChatSender = ConversationParticipant;

export interface SendMessageOptions {
  // Id généré côté client : sert de clé commune entre le message optimiste
  // et l'écho Realtime, pour ne jamais afficher deux fois le même message.
  id?: string;
  type?: MessageType;
  captureRef?: CaptureRef;
  capturePreview?: SharedCapturePreview;
}

export const CAPTURE_SHARE_DEFAULT_TEXT = 'a partagé une capture';

// ─── État mock (copie profonde pour ne pas muter mock/data.ts) ────────────────

const mockConversations: Conversation[] = MOCK_CONVERSATIONS.map((c) => ({
  ...c,
  participantIds: [...c.participantIds],
  participantNames: [...c.participantNames],
}));
const mockMessages: Record<string, Message[]> = Object.fromEntries(
  Object.entries(MOCK_MESSAGES).map(([k, list]) => [k, list.map((m) => ({ ...m }))])
);

// ─── Helpers d'affichage ──────────────────────────────────────────────────────

/** Nom à afficher pour une conversation (pseudo de l'autre pêcheur, ou nom du groupe). */
export function getConversationTitle(conv: Conversation): string {
  if (conv.displayName) return conv.displayName;
  if (conv.type === 'group') return conv.name ?? 'Groupe';
  return conv.otherParticipant?.username ?? conv.participantNames[conv.participantNames.length - 1] ?? 'Conversation';
}

/** Avatar à afficher pour une conversation. */
export function getConversationAvatar(conv: Conversation): string | undefined {
  return conv.displayAvatar ?? conv.otherParticipant?.avatar ?? conv.avatar;
}

/** Génère un UUID v4 (accepté par la colonne messages.id). */
export function createMessageId(): string {
  const c = (globalThis as any).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Construit le snapshot d'une capture pour un message de type 'capture'. */
export function buildCaptureShare(capture: Capture): { captureRef: CaptureRef; capturePreview: SharedCapturePreview } {
  return {
    captureRef: {
      captureId: capture.id,
      species: capture.species?.nameFr ?? 'Poisson',
      weightGrams: capture.weightGrams,
      sizeCm: capture.sizeCm,
    },
    capturePreview: {
      photoUrl: capture.photos[0],
      speciesIcon: capture.species?.icon,
      score: capture.score,
      ownerId: capture.userId,
      ownerUsername: capture.username,
    },
  };
}

// Complète une conversation avec ses participants résolus et son nom d'affichage
function decorateConversation(
  conv: Conversation,
  participants: ConversationParticipant[],
  myId?: string
): Conversation {
  const others = participants.filter((p) => p.id !== myId);
  const otherParticipant = conv.type === 'private' ? others[0] : undefined;
  const displayName = conv.type === 'group'
    ? conv.name ?? (others.map((p) => p.username).join(', ') || 'Groupe')
    : otherParticipant?.username ?? 'Pêcheur';
  return {
    ...conv,
    participants,
    participantIds: participants.map((p) => p.id),
    participantNames: participants.map((p) => p.username),
    otherParticipant,
    displayName,
    displayAvatar: conv.type === 'group' ? conv.avatar : otherParticipant?.avatar ?? conv.avatar,
  };
}

async function decorateMockConversation(conv: Conversation, myId: string): Promise<Conversation> {
  const participants = await Promise.all(
    conv.participantIds.map(async (id, i) =>
      (await findMockChatUser(id)) ?? { id, username: conv.participantNames[i] ?? 'Pêcheur' }
    )
  );
  return decorateConversation(conv, participants, myId);
}

function isListed(conv: Conversation): boolean {
  return conv.type === 'group' || !!conv.lastMessage;
}

// Normalise le snapshot last_message (anciens snapshots : champs partiels)
function mapLastMessage(raw: any, conversationId: string): Message {
  if (!raw) return null as unknown as Message; // le type historique n'autorise pas null
  return {
    id: raw.id ?? `last_${conversationId}`,
    conversationId: raw.conversationId ?? conversationId,
    senderId: raw.senderId ?? '',
    senderName: raw.senderName ?? '',
    senderAvatar: raw.senderAvatar ?? undefined,
    content: raw.content ?? '',
    type: raw.type ?? 'text',
    captureRef: raw.captureRef ? mapCaptureRef(raw.captureRef) : undefined,
    capturePreview: raw.captureRef ? mapCapturePreview(raw.captureRef) : undefined,
    sentAt: raw.sentAt ?? new Date(0).toISOString(),
    isRead: raw.isRead ?? false,
  };
}

function mapConversationRow(row: any, myId: string): Conversation {
  const participants: ConversationParticipant[] = (row.participants ?? []).map((p: any) => ({
    id: p.id,
    username: p.username ?? 'Pêcheur',
    avatar: p.avatar_url ?? undefined,
  }));
  const base: Conversation = {
    id: row.id,
    type: row.type ?? 'private',
    name: row.name ?? undefined,
    avatar: row.avatar_url ?? undefined,
    participantIds: [],
    participantNames: [],
    lastMessage: mapLastMessage(row.last_message, row.id),
    unreadCount: row.unread_count ?? 0,
    updatedAt: row.updated_at ?? row.created_at,
    lastReadAt: row.last_read_at ?? undefined,
  };
  return decorateConversation(base, participants, myId);
}

// ─── Conversations ────────────────────────────────────────────────────────────

export async function fetchConversations(userId?: string): Promise<Conversation[]> {
  if (USE_MOCK_DATA) {
    await delay(400);
    const myId = userId ?? (await getMockSessionUser()).id;
    const mine = mockConversations.filter((c) => isListed(c) && c.participantIds.includes(myId));
    const decorated = await Promise.all(mine.map((c) => decorateMockConversation(c, myId)));
    return decorated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  if (!userId) return [];

  // RPC SECURITY DEFINER : participants + non-lus résolus côté SQL (migration 20261117_chat.sql)
  const { data, error } = await supabase.rpc('get_my_conversations');
  if (error) throw error;
  return (data ?? []).map((row: any) => mapConversationRow(row, userId));
}

/** Récupère une seule conversation (même vide) de l'utilisateur connecté. */
export async function fetchConversation(conversationId: string, userId: string): Promise<Conversation | null> {
  if (USE_MOCK_DATA) {
    await delay(150);
    const conv = mockConversations.find((c) => c.id === conversationId && c.participantIds.includes(userId));
    return conv ? decorateMockConversation(conv, userId) : null;
  }

  const { data, error } = await supabase.rpc('get_my_conversations', { p_conversation_id: conversationId });
  if (error) throw error;
  const row = (data ?? [])[0];
  return row ? mapConversationRow(row, userId) : null;
}

/**
 * Ouvre la conversation 1:1 avec `other`, ou la crée si elle n'existe pas
 * (RPC get_or_create_direct_conversation en SECURITY DEFINER).
 */
export async function getOrCreateDirectConversation(
  me: ChatSender,
  other: ConversationParticipant
): Promise<Conversation> {
  if (me.id === other.id) throw new Error('Tu ne peux pas t\'envoyer de message à toi-même.');

  if (USE_MOCK_DATA) {
    await delay(250);
    let conv = mockConversations.find(
      (c) => c.type === 'private'
        && c.participantIds.length === 2
        && c.participantIds.includes(me.id)
        && c.participantIds.includes(other.id)
    );
    if (!conv) {
      conv = {
        id: `conv_${generateId()}`,
        type: 'private',
        avatar: other.avatar,
        participantIds: [me.id, other.id],
        participantNames: [me.username, other.username],
        lastMessage: null as unknown as Message,
        unreadCount: 0,
        updatedAt: new Date().toISOString(),
      };
      mockConversations.push(conv);
      mockMessages[conv.id] = [];
    }
    return decorateConversation(conv, [me, (await findMockChatUser(other.id)) ?? other], me.id);
  }

  const { data: conversationId, error } = await supabase.rpc('get_or_create_direct_conversation', {
    p_other: other.id,
  });
  if (error) throw error;

  const conv = await fetchConversation(conversationId as string, me.id);
  if (conv) return conv;

  // Repli : la RPC a répondu mais la relecture a échoué (ne devrait pas arriver)
  return decorateConversation(
    {
      id: conversationId as string,
      type: 'private',
      participantIds: [],
      participantNames: [],
      lastMessage: null as unknown as Message,
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
    },
    [me, other],
    me.id
  );
}

// ─── Recherche de destinataires (#33) ─────────────────────────────────────────
// Simples délégations vers users.ts (qui gère déjà son propre mode mock).

/** Recherche de pêcheurs par pseudo, sans l'utilisateur connecté. */
export async function searchChatUsers(query: string, excludeUserId?: string): Promise<UserSearchResult[]> {
  const results = await searchUsers(query);
  return excludeUserId ? results.filter((u) => u.id !== excludeUserId) : results;
}

/** Suggestions pour l'état vide de la recherche (top XP), sans l'utilisateur connecté. */
export async function fetchSuggestedChatUsers(excludeUserId?: string, limit = 10): Promise<UserSearchResult[]> {
  const top = await fetchTopUsers(limit + 1);
  return top.filter((u) => u.id !== excludeUserId).slice(0, limit);
}

// ─── Messages ─────────────────────────────────────────────────────────────────

const MESSAGES_PAGE = 200;

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  if (USE_MOCK_DATA) {
    await delay(300);
    return [...(mockMessages[conversationId] ?? [])].sort(compareMessages);
  }

  // Les 200 derniers messages, renvoyés du plus ancien au plus récent
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('sent_at', { ascending: false })
    .limit(MESSAGES_PAGE);

  if (error) throw error;
  return (data ?? []).map(mapMessage).reverse();
}

/** Marque la conversation comme lue (last_read_at = now, accusés de lecture). */
export async function markConversationRead(conversationId: string, userId?: string): Promise<void> {
  if (USE_MOCK_DATA) {
    const conv = mockConversations.find((c) => c.id === conversationId);
    if (conv) conv.unreadCount = 0;
    const myId = userId ?? (await getMockSessionUser()).id;
    (mockMessages[conversationId] ?? []).forEach((m) => {
      if (m.senderId !== myId) m.isRead = true;
    });
    return;
  }

  const { error } = await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId });
  if (error) throw error;
}

export function compareMessages(a: Message, b: Message): number {
  const diff = new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime();
  return diff !== 0 ? diff : a.id.localeCompare(b.id);
}

// ─── Écoute temps réel ────────────────────────────────────────────────────────

let channelSeq = 0;

/**
 * S'abonne aux nouveaux messages (INSERT) et aux accusés de lecture (UPDATE)
 * d'une conversation. Retourne la fonction de désabonnement (à appeler au démontage).
 */
export function subscribeToMessages(
  conversationId: string,
  onNewMessage: (message: Message) => void,
  onMessageUpdated?: (message: Message) => void
): () => void {
  if (USE_MOCK_DATA) {
    return mockChatBus.subscribe(({ kind, message }) => {
      if (message.conversationId !== conversationId) return;
      if (kind === 'insert') onNewMessage(message);
      else onMessageUpdated?.(message);
    });
  }

  // Nom de canal unique : évite de réutiliser un canal en cours de fermeture
  const channel = supabase
    .channel(`messages:${conversationId}:${++channelSeq}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onNewMessage(mapMessage(payload.new))
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onMessageUpdated?.(mapMessage(payload.new))
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * S'abonne à tous les nouveaux messages de toutes mes conversations
 * (la RLS filtre côté Supabase). Sert à la liste : aperçu + compteur de non-lus.
 */
export function subscribeToInbox(userId: string, onNewMessage: (message: Message) => void): () => void {
  if (USE_MOCK_DATA) {
    return mockChatBus.subscribe(({ kind, message }) => {
      if (kind === 'insert') onNewMessage(message);
    });
  }

  const channel = supabase
    .channel(`inbox:${userId}:${++channelSeq}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => onNewMessage(mapMessage(payload.new))
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
  senderAvatar?: string,
  options: SendMessageOptions = {}
): Promise<Message> {
  const id = options.id ?? createMessageId();
  const type: MessageType = options.type ?? 'text';
  const text = content.trim() || (type === 'capture' ? CAPTURE_SHARE_DEFAULT_TEXT : '');
  if (!text) throw new Error('Message vide');

  if (USE_MOCK_DATA) {
    await delay(200);
    const list = mockMessages[conversationId] ?? (mockMessages[conversationId] = []);
    const existing = list.find((m) => m.id === id);
    if (existing) return existing; // renvoi d'un message déjà enregistré

    const message: Message = {
      id,
      conversationId,
      senderId,
      senderName,
      senderAvatar,
      content: text,
      type,
      captureRef: options.captureRef,
      capturePreview: options.capturePreview,
      sentAt: new Date().toISOString(),
      isRead: false,
    };
    list.push(message);

    const conv = mockConversations.find((c) => c.id === conversationId);
    if (conv) {
      conv.lastMessage = message;
      conv.updatedAt = message.sentAt;
    }
    mockChatBus.emit({ kind: 'insert', message });
    return message;
  }

  // sender_name / sender_avatar / sent_at sont normalisés par le trigger SQL ;
  // conversations.last_message est mis à jour par le trigger after insert.
  const { data, error } = await supabase
    .from('messages')
    .insert({
      id,
      conversation_id: conversationId,
      sender_id: senderId,
      sender_name: senderName,
      sender_avatar: senderAvatar ?? null,
      content: text,
      type,
      capture_ref: options.captureRef ? { ...options.captureRef, ...options.capturePreview } : null,
      is_read: false,
    })
    .select()
    .single();

  if (error) {
    // Renvoi après un timeout : le message existe déjà en base, on le relit
    if (error.code === '23505') {
      const { data: existing, error: readError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', id)
        .single();
      if (!readError && existing) return mapMessage(existing);
    }
    throw error;
  }

  return mapMessage(data);
}

// ─── Partage d'une capture dans une conversation (#20) ────────────────────────

async function resolveCurrentSender(): Promise<ChatSender> {
  if (USE_MOCK_DATA) return getMockSessionUser();
  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth.user) throw new Error('Tu dois être connecté pour partager une capture.');
  const { data: row } = await supabase
    .from('users')
    .select('id, username, avatar_url')
    .eq('id', auth.user.id)
    .maybeSingle();
  return {
    id: auth.user.id,
    username: row?.username ?? 'Pêcheur',
    avatar: row?.avatar_url ?? undefined,
  };
}

/**
 * Envoie `capture` dans la conversation `conversationId` sous forme de message
 * de type 'capture' (affiché en carte compacte, tap → CaptureDetail).
 *
 * - `options.sender` : l'utilisateur connecté (sinon résolu via la session Supabase)
 * - `options.comment` : texte d'accompagnement (défaut : « a partagé une capture »)
 * - `options.id` : id client du message (pour l'UI optimiste)
 *
 * La capture doit être publiée (pas un brouillon) : le trigger SQL refuse sinon.
 * Pour que le message apparaisse aussi dans le store Redux sans attendre
 * Realtime, préférer le thunk `shareCapture` de chatSlice.
 */
export async function shareCaptureToConversation(
  conversationId: string,
  capture: Capture,
  options: { sender?: ChatSender; comment?: string; id?: string } = {}
): Promise<Message> {
  if (capture.isDraft) throw new Error('Publie ta capture avant de la partager.');
  const sender = options.sender ?? (await resolveCurrentSender());
  const { captureRef, capturePreview } = buildCaptureShare(capture);
  return sendMessage(
    conversationId,
    sender.id,
    sender.username,
    options.comment ?? '',
    sender.avatar,
    { id: options.id, type: 'capture', captureRef, capturePreview }
  );
}

/**
 * Récupère la capture complète d'un message partagé (pour ouvrir CaptureDetail).
 * Renvoie null si elle a été supprimée ou n'est plus visible.
 */
export function fetchSharedCapture(captureId: string, userId?: string): Promise<Capture | null> {
  return fetchCaptureById(captureId, userId);
}

// ─── Mapper une ligne Supabase → type Message ─────────────────────────────────

function mapCaptureRef(raw: any): CaptureRef | undefined {
  if (!raw || !raw.captureId) return undefined;
  return {
    captureId: raw.captureId,
    species: raw.species ?? 'Poisson',
    weightGrams: raw.weightGrams ?? 0,
    sizeCm: raw.sizeCm ?? 0,
  };
}

function mapCapturePreview(raw: any): SharedCapturePreview | undefined {
  if (!raw || !raw.captureId) return undefined;
  return {
    photoUrl: raw.photoUrl ?? undefined,
    speciesIcon: raw.speciesIcon ?? undefined,
    score: raw.score ?? undefined,
    ownerId: raw.ownerId ?? undefined,
    ownerUsername: raw.ownerUsername ?? undefined,
  };
}

function mapMessage(row: any): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderAvatar: row.sender_avatar ?? undefined,
    content: row.content,
    type: row.type ?? 'text',
    captureRef: mapCaptureRef(row.capture_ref),
    capturePreview: mapCapturePreview(row.capture_ref),
    sentAt: row.sent_at,
    isRead: row.is_read ?? false,
  };
}

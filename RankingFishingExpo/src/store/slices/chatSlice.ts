import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  Capture, CaptureRef, ChatState, Conversation, ConversationParticipant, Message, MessageType, SharedCapturePreview,
} from '../types';
import * as chatApi from '../../api/chat';
import type { RootState, AppDispatch } from '../index';

// ─── Helpers purs (utilisés par les reducers) ─────────────────────────────────

function sortConversations(list: Conversation[]) {
  list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/**
 * Insère ou fusionne un message (clé = id). Le message optimiste et l'écho
 * Realtime partagent le même id : on ne garde qu'une ligne, la version serveur
 * remplaçant la version locale. Retourne true si le message était inconnu.
 */
function upsertMessage(state: ChatState, msg: Message): boolean {
  const list = state.messages[msg.conversationId] ?? (state.messages[msg.conversationId] = []);
  const idx = list.findIndex((m) => m.id === msg.id);
  if (idx >= 0) {
    // Ne pas repasser un message confirmé en "sending" (écho arrivé avant le pending)
    const keepStatus = msg.status === 'sending' && !list[idx].status ? undefined : msg.status;
    list[idx] = { ...list[idx], ...msg, status: keepStatus };
  } else {
    list.push(msg);
  }
  list.sort(chatApi.compareMessages);
  return idx < 0;
}

// Met à jour l'aperçu de la conversation si `msg` est plus récent que le dernier connu
function applyPreview(conv: Conversation, msg: Message) {
  const current = conv.lastMessage;
  if (!current || current.id === msg.id || new Date(msg.sentAt).getTime() >= new Date(current.sentAt).getTime()) {
    conv.lastMessage = msg;
    if (new Date(msg.sentAt).getTime() > new Date(conv.updatedAt).getTime() || !current) {
      conv.updatedAt = msg.sentAt;
    }
  }
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await chatApi.fetchConversations(userId);
    } catch (e: any) {
      return rejectWithValue(e?.message ?? 'Impossible de charger tes conversations');
    }
  }
);

export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (conversationId: string, { rejectWithValue }) => {
    try {
      const messages = await chatApi.fetchMessages(conversationId);
      return { conversationId, messages };
    } catch (e: any) {
      return rejectWithValue(e?.message ?? 'Impossible de charger les messages');
    }
  }
);

export const markConversationRead = createAsyncThunk(
  'chat/markConversationRead',
  async (payload: { conversationId: string; userId?: string }, { rejectWithValue }) => {
    try {
      await chatApi.markConversationRead(payload.conversationId, payload.userId);
      return payload.conversationId;
    } catch (e: any) {
      return rejectWithValue(e?.message ?? 'Erreur');
    }
  }
);

/** Ouvre (ou crée) la conversation 1:1 avec `other`. */
export const openDirectConversation = createAsyncThunk(
  'chat/openDirectConversation',
  async (payload: { me: ConversationParticipant; other: ConversationParticipant }, { rejectWithValue }) => {
    try {
      return await chatApi.getOrCreateDirectConversation(payload.me, payload.other);
    } catch (e: any) {
      return rejectWithValue(e?.message ?? 'Impossible d\'ouvrir la conversation');
    }
  }
);

export interface SendMessagePayload {
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  senderAvatar?: string;
  // Réutiliser l'id d'un message en échec pour le renvoyer
  clientId?: string;
  type?: MessageType;
  captureRef?: CaptureRef;
  capturePreview?: SharedCapturePreview;
}

/**
 * Envoi optimiste : le message apparaît tout de suite (status 'sending') avec
 * un id généré côté client, puis est remplacé par la version serveur.
 */
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (payload: SendMessagePayload, { rejectWithValue, requestId }) => {
    try {
      return await chatApi.sendMessage(
        payload.conversationId,
        payload.senderId,
        payload.senderName,
        payload.content,
        payload.senderAvatar,
        {
          id: payload.clientId ?? requestId,
          type: payload.type,
          captureRef: payload.captureRef,
          capturePreview: payload.capturePreview,
        }
      );
    } catch (e: any) {
      return rejectWithValue(e?.message ?? 'Message non envoyé');
    }
  },
  { idGenerator: () => chatApi.createMessageId() }
);

/** Partage une capture dans une conversation (message de type 'capture'). */
export function shareCapture(payload: {
  conversationId: string;
  capture: Capture;
  sender: ConversationParticipant;
  comment?: string;
}) {
  const { captureRef, capturePreview } = chatApi.buildCaptureShare(payload.capture);
  return sendMessage({
    conversationId: payload.conversationId,
    senderId: payload.sender.id,
    senderName: payload.sender.username,
    senderAvatar: payload.sender.avatar,
    content: payload.comment?.trim() || chatApi.CAPTURE_SHARE_DEFAULT_TEXT,
    type: 'capture',
    captureRef,
    capturePreview,
  });
}

/** Renvoie un message en échec (même id → pas de doublon). */
export function retryMessage(message: Message) {
  return sendMessage({
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderName: message.senderName,
    senderAvatar: message.senderAvatar,
    content: message.content,
    clientId: message.id,
    type: message.type,
    captureRef: message.captureRef,
    capturePreview: message.capturePreview,
  });
}

/**
 * Message reçu via Realtime (liste ou conversation ouverte). Met à jour le fil,
 * l'aperçu et le compteur de non-lus ; recharge la liste si la conversation
 * n'est pas encore connue (nouvelle conversation démarrée par quelqu'un d'autre).
 */
export function handleIncomingMessage(message: Message) {
  return (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    const currentUserId = state.auth.user?.id;
    const known = state.chat.conversations.some((c) => c.id === message.conversationId);
    dispatch(chatSlice.actions.receiveMessage({ message, currentUserId }));
    if (!known && currentUserId) dispatch(fetchConversations(currentUserId));
  };
}

// ─── Slice ────────────────────────────────────────────────────────────────────

const initialState: ChatState = {
  conversations: [],
  activeConversation: null,
  messages: {},
  isLoading: false,
  error: null,
  messagesLoading: {},
  messagesError: {},
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveConversation(state, action: PayloadAction<Conversation | null>) {
      state.activeConversation = action.payload;
      if (action.payload) {
        const conv = state.conversations.find((c) => c.id === action.payload!.id);
        if (conv) conv.unreadCount = 0;
      }
    },
    upsertConversation(state, action: PayloadAction<Conversation>) {
      const idx = state.conversations.findIndex((c) => c.id === action.payload.id);
      if (idx >= 0) state.conversations[idx] = { ...state.conversations[idx], ...action.payload };
      else state.conversations.push(action.payload);
      sortConversations(state.conversations);
    },
    // Ajout d'un message dans le fil (dédupliqué par id)
    addMessage(state, action: PayloadAction<Message>) {
      upsertMessage(state, action.payload);
      const conv = state.conversations.find((c) => c.id === action.payload.conversationId);
      if (conv) applyPreview(conv, action.payload);
    },
    receiveMessage(state, action: PayloadAction<{ message: Message; currentUserId?: string }>) {
      const { message, currentUserId } = action.payload;
      const conv = state.conversations.find((c) => c.id === message.conversationId);
      const alreadyKnown =
        (state.messages[message.conversationId] ?? []).some((m) => m.id === message.id)
        || conv?.lastMessage?.id === message.id;

      // On n'alimente le fil que s'il a déjà été chargé (sinon fetchMessages s'en charge)
      if (state.messages[message.conversationId]) upsertMessage(state, message);

      if (conv) {
        applyPreview(conv, message);
        const isActive = state.activeConversation?.id === message.conversationId;
        if (!alreadyKnown && !isActive && message.senderId !== currentUserId) {
          conv.unreadCount = (conv.unreadCount ?? 0) + 1;
        }
        sortConversations(state.conversations);
      }
    },
    // Mise à jour Realtime (accusé de lecture)
    updateMessage(state, action: PayloadAction<Message>) {
      const list = state.messages[action.payload.conversationId];
      const idx = list?.findIndex((m) => m.id === action.payload.id) ?? -1;
      if (list && idx >= 0) list[idx] = { ...list[idx], isRead: action.payload.isRead };
    },
    removeMessage(state, action: PayloadAction<{ conversationId: string; messageId: string }>) {
      const list = state.messages[action.payload.conversationId];
      if (list) state.messages[action.payload.conversationId] = list.filter((m) => m.id !== action.payload.messageId);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        // La conversation ouverte (éventuellement encore vide) reste dans le store
        const active = state.activeConversation;
        const next = [...action.payload];
        if (active && !next.some((c) => c.id === active.id)) {
          const kept = state.conversations.find((c) => c.id === active.id);
          if (kept) next.push(kept);
        }
        if (active) {
          const conv = next.find((c) => c.id === active.id);
          if (conv) conv.unreadCount = 0;
        }
        sortConversations(next);
        state.conversations = next;
        state.isLoading = false;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Impossible de charger tes conversations';
        state.isLoading = false;
      })

      .addCase(fetchMessages.pending, (state, action) => {
        state.messagesLoading = { ...state.messagesLoading, [action.meta.arg]: true };
        state.messagesError = { ...state.messagesError, [action.meta.arg]: null };
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const { conversationId, messages } = action.payload;
        // On garde les messages locaux absents de la réponse : envois en cours / en
        // échec, et messages Realtime arrivés pendant la requête (plus récents).
        const newestServer = messages.length ? new Date(messages[messages.length - 1].sentAt).getTime() : -Infinity;
        const serverIds = new Set(messages.map((s) => s.id));
        const pending = (state.messages[conversationId] ?? []).filter(
          (m) => !serverIds.has(m.id)
            && ((m.status && m.status !== 'sent') || new Date(m.sentAt).getTime() > newestServer)
        );
        state.messages[conversationId] = [...messages, ...pending].sort(chatApi.compareMessages);
        state.messagesLoading = { ...state.messagesLoading, [conversationId]: false };
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.messagesLoading = { ...state.messagesLoading, [action.meta.arg]: false };
        state.messagesError = {
          ...state.messagesError,
          [action.meta.arg]: (action.payload as string) ?? 'Impossible de charger les messages',
        };
      })

      .addCase(markConversationRead.pending, (state, action) => {
        const conv = state.conversations.find((c) => c.id === action.meta.arg.conversationId);
        if (conv) conv.unreadCount = 0;
      })

      .addCase(openDirectConversation.fulfilled, (state, action) => {
        const idx = state.conversations.findIndex((c) => c.id === action.payload.id);
        if (idx >= 0) state.conversations[idx] = { ...state.conversations[idx], ...action.payload };
        else state.conversations.push(action.payload);
        sortConversations(state.conversations);
      })

      .addCase(sendMessage.pending, (state, action) => {
        const arg = action.meta.arg;
        const optimistic: Message = {
          id: arg.clientId ?? action.meta.requestId,
          conversationId: arg.conversationId,
          senderId: arg.senderId,
          senderName: arg.senderName,
          senderAvatar: arg.senderAvatar,
          content: arg.content,
          type: arg.type ?? 'text',
          captureRef: arg.captureRef,
          capturePreview: arg.capturePreview,
          sentAt: new Date().toISOString(),
          isRead: false,
          status: 'sending',
        };
        // Renvoi : on conserve la date d'origine du message en échec
        const existing = state.messages[arg.conversationId]?.find((m) => m.id === optimistic.id);
        if (existing) optimistic.sentAt = existing.sentAt;
        upsertMessage(state, optimistic);
        const conv = state.conversations.find((c) => c.id === arg.conversationId);
        if (conv) {
          applyPreview(conv, optimistic);
          sortConversations(state.conversations);
        }
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const msg = { ...action.payload, status: undefined };
        upsertMessage(state, msg);
        const conv = state.conversations.find((c) => c.id === msg.conversationId);
        if (conv) {
          applyPreview(conv, msg);
          sortConversations(state.conversations);
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        const arg = action.meta.arg;
        const id = arg.clientId ?? action.meta.requestId;
        const msg = state.messages[arg.conversationId]?.find((m) => m.id === id);
        if (msg) msg.status = 'failed';
      });
  },
});

export const {
  setActiveConversation, upsertConversation, addMessage, receiveMessage, updateMessage, removeMessage,
} = chatSlice.actions;

// ─── Sélecteurs ───────────────────────────────────────────────────────────────

/** Nombre total de messages non lus (pour une pastille sur l'onglet Messages). */
export const selectTotalUnread = (state: RootState) =>
  state.chat.conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

export default chatSlice.reducer;

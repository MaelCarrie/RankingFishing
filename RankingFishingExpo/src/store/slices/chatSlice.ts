import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ChatState, Conversation, Message } from '../types';
import * as chatApi from '../../api/chat';

export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async (_, { rejectWithValue }) => {
    try {
      return await chatApi.fetchConversations();
    } catch (e: any) {
      return rejectWithValue(e.message);
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
      return rejectWithValue(e.message);
    }
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (
    payload: { conversationId: string; senderId: string; senderName: string; content: string; senderAvatar?: string },
    { rejectWithValue }
  ) => {
    try {
      return await chatApi.sendMessage(
        payload.conversationId,
        payload.senderId,
        payload.senderName,
        payload.content,
        payload.senderAvatar
      );
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

const initialState: ChatState = {
  conversations: [],
  activeConversation: null,
  messages: {},
  isLoading: false,
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveConversation(state, action: PayloadAction<Conversation | null>) {
      state.activeConversation = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => { state.isLoading = true; })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.conversations = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      })

      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.messages[action.payload.conversationId] = action.payload.messages;
        // Marquer comme lu dans la liste
        const conv = state.conversations.find((c) => c.id === action.payload.conversationId);
        if (conv) conv.unreadCount = 0;
      })

      .addCase(sendMessage.fulfilled, (state, action) => {
        const msg = action.payload;
        if (!state.messages[msg.conversationId]) {
          state.messages[msg.conversationId] = [];
        }
        state.messages[msg.conversationId].push(msg);
        const conv = state.conversations.find((c) => c.id === msg.conversationId);
        if (conv) {
          conv.lastMessage = msg;
          conv.updatedAt = msg.sentAt;
        }
      });
  },
});

export const { setActiveConversation } = chatSlice.actions;
export default chatSlice.reducer;

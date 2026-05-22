import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { CapturesState, NewCaptureForm } from '../types';
import * as capturesApi from '../../api/captures';
import type { RootState } from '../index';

export const fetchFeed = createAsyncThunk('captures/fetchFeed', async (_, { rejectWithValue, getState }) => {
  try {
    const userId = (getState() as RootState).auth.user?.id;
    return await capturesApi.fetchFeed(userId);
  } catch (e: any) {
    return rejectWithValue(e.message);
  }
});

export const fetchMyCaptures = createAsyncThunk(
  'captures/fetchMine',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await capturesApi.fetchMyCaptures(userId);
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const publishCapture = createAsyncThunk(
  'captures/publish',
  async (
    payload: { userId: string; form: NewCaptureForm; username: string; userAvatar?: string },
    { rejectWithValue }
  ) => {
    try {
      return await capturesApi.publishCapture(
        payload.userId,
        payload.form,
        payload.username,
        payload.userAvatar
      );
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const toggleLike = createAsyncThunk(
  'captures/toggleLike',
  async (payload: { captureId: string; userId: string }, { rejectWithValue }) => {
    try {
      const result = await capturesApi.toggleLike(payload.captureId, payload.userId);
      return { captureId: payload.captureId, ...result };
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

const initialState: CapturesState = {
  feed: [],
  myCaptures: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
};

const capturesSlice = createSlice({
  name: 'captures',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeed.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchFeed.fulfilled, (state, action) => { state.feed = action.payload; state.isLoading = false; })
      .addCase(fetchFeed.rejected, (state, action) => { state.error = action.payload as string; state.isLoading = false; })

      .addCase(fetchMyCaptures.pending, (state) => { state.isLoading = true; })
      .addCase(fetchMyCaptures.fulfilled, (state, action) => { state.myCaptures = action.payload; state.isLoading = false; })
      .addCase(fetchMyCaptures.rejected, (state) => { state.isLoading = false; })

      .addCase(publishCapture.pending, (state) => { state.isSubmitting = true; state.error = null; })
      .addCase(publishCapture.fulfilled, (state, action) => {
        state.isSubmitting = false;
        if (!action.payload.isDraft) state.feed.unshift(action.payload);
        state.myCaptures.unshift(action.payload);
      })
      .addCase(publishCapture.rejected, (state, action) => { state.isSubmitting = false; state.error = action.payload as string; })

      .addCase(toggleLike.fulfilled, (state, action) => {
        const { captureId, likes, isLiked } = action.payload;
        for (const capture of [...state.feed, ...state.myCaptures]) {
          if (capture.id === captureId) {
            capture.likes = likes;
            capture.isLiked = isLiked;
          }
        }
      });
  },
});

export const { clearError } = capturesSlice.actions;
export default capturesSlice.reducer;

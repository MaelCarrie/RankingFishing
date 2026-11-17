import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Capture, CapturesState, NewCaptureForm } from '../types';
import * as capturesApi from '../../api/captures';
import type { RootState } from '../index';

// ─── État ─────────────────────────────────────────────────────────────────────
//
// CapturesState (store/types) est étendu ici avec l'état de pagination du feed
// (issue #18) pour ne pas multiplier les champs dans le fichier de types partagé.

export interface CapturesSliceState extends CapturesState {
  feedCursor: string | null;
  feedHasMore: boolean;
  feedLoaded: boolean; // première page reçue au moins une fois
  isRefreshing: boolean; // pull-to-refresh
  isLoadingMore: boolean; // page suivante
  feedError: string | null;
  loadMoreError: string | null;
}

function errorMessage(e: any, fallback: string): string {
  return typeof e?.message === 'string' && e.message ? e.message : fallback;
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

/** Première page du feed. `refresh: true` = pull-to-refresh (garde la liste affichée). */
export const fetchFeed = createAsyncThunk<
  capturesApi.FeedPage,
  { refresh?: boolean } | undefined,
  { state: RootState; rejectValue: string }
>('captures/fetchFeed', async (_arg, { rejectWithValue, getState }) => {
  try {
    const userId = getState().auth.user?.id;
    return await capturesApi.fetchFeedPage({ userId });
  } catch (e: any) {
    return rejectWithValue(errorMessage(e, 'Impossible de charger le fil.'));
  }
});

/** Page suivante (infinite scroll). Ignorée si un chargement est déjà en cours ou s'il n'y a plus rien. */
export const fetchMoreFeed = createAsyncThunk<
  capturesApi.FeedPage,
  void,
  { state: RootState; rejectValue: string }
>(
  'captures/fetchMoreFeed',
  async (_arg, { rejectWithValue, getState }) => {
    try {
      const state = getState();
      return await capturesApi.fetchFeedPage({
        userId: state.auth.user?.id,
        cursor: state.captures.feedCursor,
      });
    } catch (e: any) {
      return rejectWithValue(errorMessage(e, 'Impossible de charger la suite.'));
    }
  },
  {
    condition: (_arg, { getState }) => {
      const c = getState().captures;
      return c.feedLoaded && c.feedHasMore && !c.isLoadingMore && !c.isRefreshing && !!c.feedCursor;
    },
  }
);

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
      return rejectWithValue(errorMessage(e, 'La publication a échoué. Réessaie dans un instant.'));
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

export const deleteCapture = createAsyncThunk(
  'captures/delete',
  async (captureId: string, { rejectWithValue }) => {
    try {
      await capturesApi.deleteCapture(captureId);
      return captureId;
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const initialState: CapturesSliceState = {
  feed: [],
  myCaptures: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
  feedCursor: null,
  feedHasMore: true,
  feedLoaded: false,
  isRefreshing: false,
  isLoadingMore: false,
  feedError: null,
  loadMoreError: null,
};

/** Ajoute des captures en ignorant celles déjà présentes (pas de doublon). */
function appendUnique(list: Capture[], incoming: Capture[]): Capture[] {
  const seen = new Set(list.map((c) => c.id));
  const out = [...list];
  for (const c of incoming) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
}

const capturesSlice = createSlice({
  name: 'captures',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
    adjustCommentCount(state, action: PayloadAction<{ captureId: string; delta: number }>) {
      const { captureId, delta } = action.payload;
      for (const capture of [...state.feed, ...state.myCaptures]) {
        if (capture.id === captureId) {
          capture.comments = Math.max(0, capture.comments + delta);
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Première page / pull-to-refresh : remplace la liste et réinitialise le curseur
      .addCase(fetchFeed.pending, (state, action) => {
        if (action.meta.arg?.refresh) state.isRefreshing = true;
        else state.isLoading = true;
        state.feedError = null;
        state.error = null;
      })
      .addCase(fetchFeed.fulfilled, (state, action) => {
        state.feed = appendUnique([], action.payload.items);
        state.feedCursor = action.payload.nextCursor;
        state.feedHasMore = action.payload.nextCursor !== null;
        state.feedLoaded = true;
        state.isLoading = false;
        state.isRefreshing = false;
        state.loadMoreError = null;
      })
      .addCase(fetchFeed.rejected, (state, action) => {
        state.feedError = action.payload ?? 'Impossible de charger le fil.';
        state.error = state.feedError;
        state.isLoading = false;
        state.isRefreshing = false;
      })

      // Page suivante : ajout sans doublon
      .addCase(fetchMoreFeed.pending, (state) => {
        state.isLoadingMore = true;
        state.loadMoreError = null;
      })
      .addCase(fetchMoreFeed.fulfilled, (state, action) => {
        state.feed = appendUnique(state.feed, action.payload.items);
        state.feedCursor = action.payload.nextCursor;
        state.feedHasMore = action.payload.nextCursor !== null;
        state.isLoadingMore = false;
      })
      .addCase(fetchMoreFeed.rejected, (state, action) => {
        state.isLoadingMore = false;
        state.loadMoreError = action.payload ?? 'Impossible de charger la suite.';
      })

      .addCase(fetchMyCaptures.pending, (state) => { state.isLoading = true; })
      .addCase(fetchMyCaptures.fulfilled, (state, action) => { state.myCaptures = action.payload; state.isLoading = false; })
      .addCase(fetchMyCaptures.rejected, (state) => { state.isLoading = false; })

      .addCase(publishCapture.pending, (state) => { state.isSubmitting = true; state.error = null; })
      .addCase(publishCapture.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const capture = action.payload;
        if (!capture.isDraft) state.feed = appendUnique([capture], state.feed);
        state.myCaptures = appendUnique([capture], state.myCaptures);
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
      })

      .addCase(deleteCapture.fulfilled, (state, action) => {
        state.feed = state.feed.filter((c) => c.id !== action.payload);
        state.myCaptures = state.myCaptures.filter((c) => c.id !== action.payload);
      });
  },
});

export const { clearError, adjustCommentCount } = capturesSlice.actions;
export default capturesSlice.reducer;

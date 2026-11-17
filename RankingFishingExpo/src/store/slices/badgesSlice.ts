import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Badge, BadgesState } from '../types';
import type { RootState } from '../index';
import * as badgesApi from '../../api/badges';

// Chargement des badges d'un utilisateur (définitions + progression).
export const fetchBadges = createAsyncThunk(
  'badges/fetch',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await badgesApi.fetchBadges(userId);
    } catch (e: any) {
      return rejectWithValue(e?.message ?? 'Impossible de charger les badges.');
    }
  }
);

/**
 * Badges de l'utilisateur connecté, avec recalcul serveur préalable
 * (check_my_badges) : la progression liée au rang global est ainsi à jour.
 * Les badges débloqués par ce recalcul sont annoncés comme après une publication.
 */
export const loadMyBadges = createAsyncThunk(
  'badges/loadMine',
  async (userId: string, { rejectWithValue }) => {
    try {
      const unlockedIds = await badgesApi.refreshMyBadges();
      const badges = await badgesApi.fetchBadges(userId);
      const fresh = badges.filter((b) => unlockedIds.includes(b.id));
      return { badges, fresh };
    } catch (e: any) {
      return rejectWithValue(e?.message ?? 'Impossible de charger les badges.');
    }
  }
);

/**
 * À dispatcher après la publication d'une capture (non brouillon) :
 *   const since = new Date().toISOString();   // AVANT l'envoi
 *   await dispatch(publishCapture(...));
 *   dispatch(checkNewlyUnlockedBadges({ userId, since }));
 * Les badges débloqués alimentent `newlyUnlocked`, affiché par <BadgeUnlockHost />
 * (feuille signature ui/BadgeUnlockSheet, un badge à la fois).
 */
export const checkNewlyUnlockedBadges = createAsyncThunk(
  'badges/checkNewlyUnlocked',
  async (payload: { userId: string; since: string | Date }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const announced = new Set([
        ...(state.badges.recentlyUnlockedIds ?? []),
        ...(state.badges.newlyUnlocked ?? []).map((b) => b.id),
      ]);
      const unlocked = await badgesApi.fetchNewlyUnlockedBadges(payload.userId, payload.since);
      return unlocked.filter((b) => !announced.has(b.id));
    } catch (e: any) {
      // Non bloquant : la publication a réussi, seul le retour visuel est perdu.
      return rejectWithValue(e?.message ?? 'Vérification des badges impossible.');
    }
  }
);

const initialState: BadgesState = {
  badges: [],
  isLoading: false,
  error: null,
  newlyUnlocked: [],
  recentlyUnlockedIds: [],
};

function announce(state: BadgesState, fresh: Badge[]) {
  if (fresh.length === 0) return;
  const queue = state.newlyUnlocked ?? [];
  const recent = state.recentlyUnlockedIds ?? [];
  for (const b of fresh) {
    if (!queue.some((q) => q.id === b.id)) queue.push(b);
    if (!recent.includes(b.id)) recent.push(b.id);
    // Reflète immédiatement le déblocage dans la liste chargée
    const idx = state.badges.findIndex((x) => x.id === b.id);
    if (idx >= 0) state.badges[idx] = { ...state.badges[idx], ...b, isUnlocked: true, progress: 100 };
  }
  state.newlyUnlocked = queue;
  state.recentlyUnlockedIds = recent;
}

const badgesSlice = createSlice({
  name: 'badges',
  initialState,
  reducers: {
    // Ferme la célébration (tous les badges en attente sont considérés vus)
    dismissNewlyUnlocked(state) {
      state.newlyUnlocked = [];
    },
    // Ferme le badge affiché (le premier de la file) et passe au suivant
    shiftNewlyUnlocked(state) {
      state.newlyUnlocked = (state.newlyUnlocked ?? []).slice(1);
    },
    // Permet à un autre module d'annoncer des badges déjà récupérés
    announceUnlockedBadges(state, action: PayloadAction<Badge[]>) {
      announce(state, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBadges.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchBadges.fulfilled, (state, action) => {
        state.badges = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchBadges.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      })
      .addCase(loadMyBadges.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(loadMyBadges.fulfilled, (state, action) => {
        state.badges = action.payload.badges;
        state.isLoading = false;
        announce(state, action.payload.fresh);
      })
      .addCase(loadMyBadges.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      })
      .addCase(checkNewlyUnlockedBadges.fulfilled, (state, action) => {
        announce(state, action.payload);
      });
  },
});

export const { dismissNewlyUnlocked, shiftNewlyUnlocked, announceUnlockedBadges } = badgesSlice.actions;
export default badgesSlice.reducer;

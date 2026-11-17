import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RankingsState, RankingType, RankingPeriod } from '../types';
import type { RootState } from '../index';
import * as rankingsApi from '../../api/rankings';

export const fetchRankings = createAsyncThunk(
  'rankings/fetch',
  async (
    payload: { type: RankingType; period: RankingPeriod; refresh?: boolean },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as RootState;
      const user = state.auth.user;
      const region = user?.region ?? null;
      const board = await rankingsApi.fetchRankingBoard(payload.type, payload.period, {
        region: region ?? undefined,
        species: state.rankings.selectedSpecies,
        currentUser: user
          ? { id: user.id, username: user.username, avatar: user.avatar, region: user.region }
          : null,
      });
      // isCurrentUser (issue #28) : marqué dans l'API ; re-vérifié ici contre
      // l'utilisateur connecté pour ne jamais dépendre d'un champ serveur.
      const currentUserId = user?.id;
      const entries = board.entries.map((e) => ({ ...e, isCurrentUser: !!currentUserId && e.userId === currentUserId }));
      const currentUser = board.currentUser && currentUserId && board.currentUser.userId === currentUserId
        ? { ...board.currentUser, isCurrentUser: true }
        : null;
      return {
        entries,
        currentUser,
        isCurrentUserInList: !!currentUser && entries.some((e) => e.isCurrentUser),
        limit: board.limit,
        region,
      };
    } catch (e: any) {
      return rejectWithValue(e?.message ?? 'Impossible de charger le classement.');
    }
  }
);

const initialState: RankingsState = {
  entries: [],
  currentUserRank: null,
  type: 'global',
  period: 'alltime',
  selectedSpecies: 'carp',
  isLoading: false,
  error: null,
  limit: rankingsApi.RANKING_LIMITS.global,
  isCurrentUserInList: false,
  region: null,
  isRefreshing: false,
  requestId: undefined,
};

const rankingsSlice = createSlice({
  name: 'rankings',
  initialState,
  reducers: {
    setType(state, action: PayloadAction<RankingType>) { state.type = action.payload; },
    setPeriod(state, action: PayloadAction<RankingPeriod>) { state.period = action.payload; },
    setSpecies(state, action: PayloadAction<string>) { state.selectedSpecies = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRankings.pending, (state, action) => {
        state.requestId = action.meta.requestId;
        state.error = null;
        if (action.meta.arg.refresh) {
          state.isRefreshing = true;
        } else {
          state.isLoading = true;
          // Changement d'onglet : on n'affiche pas l'ancien classement sous un autre titre
          state.entries = [];
          state.currentUserRank = null;
          state.isCurrentUserInList = false;
        }
      })
      .addCase(fetchRankings.fulfilled, (state, action) => {
        // Réponse d'une requête dépassée (changement d'onglet rapide) : ignorée
        if (action.meta.requestId !== state.requestId) return;
        state.entries = action.payload.entries;
        state.currentUserRank = action.payload.currentUser;
        state.isCurrentUserInList = action.payload.isCurrentUserInList;
        state.limit = action.payload.limit;
        state.region = action.payload.region;
        state.isLoading = false;
        state.isRefreshing = false;
      })
      .addCase(fetchRankings.rejected, (state, action) => {
        if (action.meta.requestId !== state.requestId) return;
        state.error = (action.payload as string) ?? action.error.message ?? 'Erreur inconnue';
        state.isLoading = false;
        state.isRefreshing = false;
      });
  },
});

export const { setType, setPeriod, setSpecies } = rankingsSlice.actions;
export default rankingsSlice.reducer;

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RankingsState, RankingType, RankingPeriod } from '../types';
import type { RootState } from '../index';
import * as rankingsApi from '../../api/rankings';

export const fetchRankings = createAsyncThunk(
  'rankings/fetch',
  async (payload: { type: RankingType; period: RankingPeriod }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const entries = await rankingsApi.fetchRankings(payload.type, payload.period, {
        region: state.auth.user?.region,
        species: state.rankings.selectedSpecies,
      });
      const currentUserId = state.auth.user?.id;
      return entries.map((e) => ({ ...e, isCurrentUser: e.userId === currentUserId }));
    } catch (e: any) {
      return rejectWithValue(e.message);
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
      .addCase(fetchRankings.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchRankings.fulfilled, (state, action) => {
        state.entries = action.payload;
        state.currentUserRank = action.payload.find((e) => e.isCurrentUser) ?? null;
        state.isLoading = false;
      })
      .addCase(fetchRankings.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      });
  },
});

export const { setType, setPeriod, setSpecies } = rankingsSlice.actions;
export default rankingsSlice.reducer;

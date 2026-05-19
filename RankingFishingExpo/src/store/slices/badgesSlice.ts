import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { BadgesState } from '../types';
import * as badgesApi from '../../api/badges';

export const fetchBadges = createAsyncThunk(
  'badges/fetch',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await badgesApi.fetchBadges(userId);
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

const initialState: BadgesState = {
  badges: [],
  isLoading: false,
  error: null,
};

const badgesSlice = createSlice({
  name: 'badges',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBadges.pending, (state) => { state.isLoading = true; })
      .addCase(fetchBadges.fulfilled, (state, action) => {
        state.badges = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchBadges.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      });
  },
});

export default badgesSlice.reducer;

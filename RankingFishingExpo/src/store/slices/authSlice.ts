import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User } from '../types';
import * as authApi from '../../api/auth';
import { fetchPendingRequestsCount } from '../../api/follows';

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const initAuth = createAsyncThunk('auth/init', async () => {
  return await authApi.getStoredUser();
});

export const signIn = createAsyncThunk(
  'auth/signIn',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      return await authApi.signIn(credentials);
    } catch (e: any) {
      return rejectWithValue(e.message ?? 'Connexion échouée');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (data: { email: string; password: string; username: string }, { rejectWithValue }) => {
    try {
      return await authApi.register(data);
    } catch (e: any) {
      return rejectWithValue(e.message ?? 'Inscription échouée');
    }
  }
);

export const signOut = createAsyncThunk('auth/signOut', async () => {
  await authApi.signOut();
});

export const refreshUser = createAsyncThunk(
  'auth/refresh',
  async (userId: string) => {
    return await authApi.refreshAndStoreUser(userId);
  }
);

export const refreshPendingCount = createAsyncThunk(
  'auth/refreshPendingCount',
  async (userId: string) => {
    return await fetchPendingRequestsCount(userId);
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      await authApi.resetPassword(email);
    } catch (e: any) {
      return rejectWithValue(e.message ?? 'Envoi échoué');
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  pendingRequestsCount: 0,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    updateUser(state, action: PayloadAction<Partial<User>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setPendingRequestsCount(state, action: PayloadAction<number>) {
      state.pendingRequestsCount = Math.max(0, action.payload);
    },
    decrementPendingRequestsCount(state) {
      state.pendingRequestsCount = Math.max(0, state.pendingRequestsCount - 1);
    },
  },
  extraReducers: (builder) => {
    // initAuth
    builder.addCase(initAuth.fulfilled, (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.isLoading = false;
    });
    builder.addCase(initAuth.rejected, (state) => {
      state.isLoading = false;
    });

    // signIn
    builder.addCase(signIn.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(signIn.fulfilled, (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
    });
    builder.addCase(signIn.rejected, (state, action) => {
      state.error = action.payload as string;
      state.isLoading = false;
    });

    // register
    builder.addCase(register.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(register.fulfilled, (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
    });
    builder.addCase(register.rejected, (state, action) => {
      state.error = action.payload as string;
      state.isLoading = false;
    });

    // signOut
    builder.addCase(signOut.fulfilled, (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.pendingRequestsCount = 0;
    });

    // refreshUser
    builder.addCase(refreshUser.fulfilled, (state, action) => {
      state.user = action.payload;
    });

    // refreshPendingCount
    builder.addCase(refreshPendingCount.fulfilled, (state, action) => {
      state.pendingRequestsCount = action.payload;
    });
  },
});

export const {
  clearError, updateUser,
  setPendingRequestsCount, decrementPendingRequestsCount,
} = authSlice.actions;
export default authSlice.reducer;

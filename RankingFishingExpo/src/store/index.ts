import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer from './slices/authSlice';
import capturesReducer from './slices/capturesSlice';
import rankingsReducer from './slices/rankingsSlice';
import chatReducer from './slices/chatSlice';
import badgesReducer from './slices/badgesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    captures: capturesReducer,
    rankings: rankingsReducer,
    chat: chatReducer,
    badges: badgesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

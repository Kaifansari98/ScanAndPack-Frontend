import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';

// Add your slices here when ready
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// For typing
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
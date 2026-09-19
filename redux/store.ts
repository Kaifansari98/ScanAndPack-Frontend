import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import scannerPreferenceReducer from './slices/scannerPreferenceSlice';

// Add your slices here when ready
export const store = configureStore({
  reducer: {
    auth: authReducer,
    scannerPreference: scannerPreferenceReducer,
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

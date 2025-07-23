import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type User = {
  id: string;
  user_contact: string;
  vendor_id?: string;
  user_type: string;
  // Add more fields as per your backend response
};

type AuthState = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
};

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: true, // loading state while restoring session
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isLoading = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isLoading = false;
    },
    finishLoading: (state) => {
      state.isLoading = false;
    }
  },
});

export const { setCredentials, logout, finishLoading } = authSlice.actions;
export default authSlice.reducer;
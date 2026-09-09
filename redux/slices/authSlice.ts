import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface VendorInfo {
  id?: number | string;
  vendor_name?: string;
  vendor_code?: string;
  primary_contact_name?: string;
  primary_contact_email?: string;
  primary_contact_number?: string;
  logo?: string;
  logoUrl?: string;
  icon?: string;
  iconUrl?: string;
  subdomain_url?: string;
  address?: string;
  city?: string;
  gst_no?: string;
  status?: string;
  [key: string]: any;
}

export interface User {
  id: number | string;
  user_name: string;
  user_contact: string;
  user_email?: string;
  vendor_id?: number | string;
  vendor_name?: string;
  vendor?: VendorInfo | null;
  user_type?: any;
  status?: string;
  is_ho_user?: boolean;
  moduled_for_b2b?: boolean;
  logoUrl?: string;
  iconUrl?: string;
  [key: string]: any;
}

export interface AuthState {
  user: User | null;
  vendor: VendorInfo | null;
  token: string | null;
  isLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  vendor: null,
  token: null,
  isLoading: true, // loading state while restoring session
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string; vendor?: VendorInfo | null }>
    ) => {
      const user = { ...action.payload.user };

      // Extract vendor info if nested in user.vendor or provided in payload
      let vendor: VendorInfo | null = action.payload.vendor || user?.vendor || null;

      if (!vendor && (user?.vendor_id || user?.vendor_name)) {
        vendor = {
          id: user.vendor_id,
          vendor_name: user.vendor_name || (user as any).company_name || "",
        };
      }

      // Ensure user.vendor_name and user.vendor are populated on user object
      if (vendor) {
        if (vendor.vendor_name && !user.vendor_name) {
          user.vendor_name = vendor.vendor_name;
        }
        if (!user.vendor) {
          user.vendor = vendor;
        }
      }

      state.user = user;
      state.vendor = vendor;
      state.token = action.payload.token;
      state.isLoading = false;
    },
    setVendorInfo: (state, action: PayloadAction<VendorInfo>) => {
      state.vendor = action.payload;
      if (state.user) {
        state.user.vendor = action.payload;
        if (action.payload.vendor_name) {
          state.user.vendor_name = action.payload.vendor_name;
        }
      }
    },
    logout: (state) => {
      state.user = null;
      state.vendor = null;
      state.token = null;
      state.isLoading = false;
    },
    finishLoading: (state) => {
      state.isLoading = false;
    },
  },
});

export const { setCredentials, setVendorInfo, logout, finishLoading } = authSlice.actions;
export default authSlice.reducer;
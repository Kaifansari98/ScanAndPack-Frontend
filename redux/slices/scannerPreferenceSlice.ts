import { ScannerType } from "@/types/scanner";
import {
  getStoredDefaultScanner,
  removeStoredDefaultScanner,
  storeDefaultScanner,
} from "@/utils/scannerPreferenceStorage";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

interface ScannerPreferenceState {
  defaultScanner: ScannerType | null;
  isHydrated: boolean;
  isSaving: boolean;
}

const initialState: ScannerPreferenceState = {
  defaultScanner: null,
  isHydrated: false,
  isSaving: false,
};

export const hydrateScannerPreference = createAsyncThunk(
  "scannerPreference/hydrate",
  async () => getStoredDefaultScanner(),
);

export const saveDefaultScanner = createAsyncThunk(
  "scannerPreference/save",
  async (scannerType: ScannerType) => {
    await storeDefaultScanner(scannerType);
    return scannerType;
  },
);

export const resetDefaultScanner = createAsyncThunk(
  "scannerPreference/reset",
  async () => {
    await removeStoredDefaultScanner();
  },
);

const scannerPreferenceSlice = createSlice({
  name: "scannerPreference",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(hydrateScannerPreference.fulfilled, (state, action) => {
        state.defaultScanner = action.payload;
        state.isHydrated = true;
      })
      .addCase(hydrateScannerPreference.rejected, (state) => {
        state.isHydrated = true;
      })
      .addCase(saveDefaultScanner.pending, (state) => {
        state.isSaving = true;
      })
      .addCase(saveDefaultScanner.fulfilled, (state, action) => {
        state.defaultScanner = action.payload;
        state.isSaving = false;
      })
      .addCase(saveDefaultScanner.rejected, (state) => {
        state.isSaving = false;
      })
      .addCase(resetDefaultScanner.pending, (state) => {
        state.isSaving = true;
      })
      .addCase(resetDefaultScanner.fulfilled, (state) => {
        state.defaultScanner = null;
        state.isSaving = false;
      })
      .addCase(resetDefaultScanner.rejected, (state) => {
        state.isSaving = false;
      });
  },
});

export default scannerPreferenceSlice.reducer;

import { useToast } from "@/components/Notification/ToastProvider";
import {
  resetDefaultScanner,
  saveDefaultScanner,
} from "@/redux/slices/scannerPreferenceSlice";
import { AppDispatch, RootState } from "@/redux/store";
import { SCANNER_LABELS, ScannerType } from "@/types/scanner";
import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

export const useScannerPreference = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { showToast } = useToast();
  const { defaultScanner, isHydrated, isSaving } = useSelector(
    (state: RootState) => state.scannerPreference,
  );

  const savePreference = useCallback(
    async (scannerType: ScannerType, fromSettings = false) => {
      try {
        await dispatch(saveDefaultScanner(scannerType)).unwrap();
        showToast(
          "success",
          fromSettings
            ? `Default scanner changed to ${SCANNER_LABELS[scannerType]}`
            : `${SCANNER_LABELS[scannerType]} saved as default. You can change it from Settings.`,
        );
      } catch {
        showToast("error", "Failed to save default scanner");
      }
    },
    [dispatch, showToast],
  );

  const resetPreference = useCallback(async () => {
    try {
      await dispatch(resetDefaultScanner()).unwrap();
      showToast("success", "Default scanner reset");
    } catch {
      showToast("error", "Failed to reset default scanner");
    }
  }, [dispatch, showToast]);

  return {
    defaultScanner,
    isHydrated,
    isSaving,
    savePreference,
    resetPreference,
  };
};

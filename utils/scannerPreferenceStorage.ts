import { ScannerType, isScannerType } from "@/types/scanner";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const DEFAULT_SCANNER_KEY = "track_trace_default_scanner";

const getWebStorage = () => {
  if (Platform.OS !== "web" || typeof globalThis.localStorage === "undefined") {
    return null;
  }

  return globalThis.localStorage;
};

export const getStoredDefaultScanner = async (): Promise<ScannerType | null> => {
  try {
    const webStorage = getWebStorage();
    const storedValue = webStorage
      ? webStorage.getItem(DEFAULT_SCANNER_KEY)
      : await SecureStore.getItemAsync(DEFAULT_SCANNER_KEY);

    return isScannerType(storedValue) ? storedValue : null;
  } catch {
    return null;
  }
};

export const storeDefaultScanner = async (
  scannerType: ScannerType,
): Promise<void> => {
  const webStorage = getWebStorage();

  if (webStorage) {
    webStorage.setItem(DEFAULT_SCANNER_KEY, scannerType);
    return;
  }

  await SecureStore.setItemAsync(DEFAULT_SCANNER_KEY, scannerType);
};

export const removeStoredDefaultScanner = async (): Promise<void> => {
  const webStorage = getWebStorage();

  if (webStorage) {
    webStorage.removeItem(DEFAULT_SCANNER_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(DEFAULT_SCANNER_KEY);
};

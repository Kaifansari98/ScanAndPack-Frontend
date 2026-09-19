import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ToastProvider } from "@/components/Notification/ToastProvider";
import { store } from "@/redux/store";
import { hydrateScannerPreference } from "@/redux/slices/scannerPreferenceSlice";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useFonts } from "expo-font";
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
  ExpoKeepAwakeTag,
} from "expo-keep-awake";
import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import "./globals.css";

SplashScreen.preventAutoHideAsync();

const HARDWARE_SCANNER_PATH = "/hardware-scanner";
const HARDWARE_SCANNER_KEEP_AWAKE_TAG = "hardware-scanner-screen";

function ScreenWakeController() {
  const pathname = usePathname();

  useEffect(() => {
    let effectDisposed = false;

    const applyRouteWakeLock = async () => {
      // Expo's development wrapper enables this default tag globally. Release
      // it so development builds follow the same per-screen behavior as
      // production builds.
      await deactivateKeepAwake(ExpoKeepAwakeTag).catch(() => {});

      if (effectDisposed) return;

      if (pathname === HARDWARE_SCANNER_PATH) {
        await activateKeepAwakeAsync(HARDWARE_SCANNER_KEEP_AWAKE_TAG).catch(
          () => {},
        );
      } else {
        await deactivateKeepAwake(HARDWARE_SCANNER_KEEP_AWAKE_TAG).catch(
          () => {},
        );
      }
    };

    // Run after Expo's development wrapper has installed its default lock.
    const routeWakeTimer = setTimeout(() => {
      void applyRouteWakeLock();
    }, 0);

    return () => {
      effectDisposed = true;
      clearTimeout(routeWakeTimer);
      void deactivateKeepAwake(HARDWARE_SCANNER_KEEP_AWAKE_TAG).catch(
        () => {},
      );
    };
  }, [pathname]);

  return null;
}

function LayoutWrapper() {
  useEffect(() => {
    void store.dispatch(hydrateScannerPreference());
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <BottomSheetModalProvider>
          <ToastProvider>
            <SafeAreaProvider>
              <ScreenWakeController />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
              </Stack>
            </SafeAreaProvider>
          </ToastProvider>
        </BottomSheetModalProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Montserrat-Regular": require("../assets/fonts/Montserrat/Montserrat-Regular.ttf"),
    "Montserrat-Medium": require("../assets/fonts/Montserrat/Montserrat-Medium.ttf"),
    "Montserrat-SemiBold": require("../assets/fonts/Montserrat/Montserrat-SemiBold.ttf"),
    "Montserrat-Bold": require("../assets/fonts/Montserrat/Montserrat-Bold.ttf"),
    "Montserrat-Black": require("../assets/fonts/Montserrat/Montserrat-Black.ttf"),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <View onLayout={onLayoutRootView} style={{ flex: 1 }}>
      <LayoutWrapper />
    </View>
  );
}

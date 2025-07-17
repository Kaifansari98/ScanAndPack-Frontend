import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback } from "react";
import { View } from "react-native";
import "./globals.css";
import { SafeAreaView } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

const LayoutWrapper = () => {
  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }}/>
      </Stack>
    </SafeAreaView>
  );
};

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

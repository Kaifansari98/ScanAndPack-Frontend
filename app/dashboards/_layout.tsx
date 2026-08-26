import { Stack } from "expo-router";
import { View } from "react-native";

export default function DashboardLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="boxes" options={{ headerShown: false }} />
        <Stack.Screen name="boxItemsScreen" options={{ headerShown: false }} />
        <Stack.Screen name="notificaitons" options={{ headerShown: false }} />
        <Stack.Screen name="project-item-tracking" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

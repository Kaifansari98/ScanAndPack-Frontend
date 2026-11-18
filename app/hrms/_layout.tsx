import React from "react";
import { Stack } from "expo-router";
import { View } from "react-native";

export default function HrmsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

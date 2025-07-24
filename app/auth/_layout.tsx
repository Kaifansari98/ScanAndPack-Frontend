import { Stack } from "expo-router";
import { View } from "react-native";

import { useDispatch } from 'react-redux';

export default function AuthLayout() {
  const dispatch = useDispatch();



  return (
    <View className="flex-1">

        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="ResetPasswordScreen" />
        </Stack>
 
    </View>
  );
}
import { Stack } from "expo-router";
import { View } from "react-native";
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setCredentials, finishLoading } from '@/redux/slices/authSlice';
import { getSession } from '@/utils/authStorage';
import AuthGate from '@/components/AuthGate';

export default function AuthLayout() {
  const dispatch = useDispatch();

  useEffect(() => {
    const restoreSession = async () => {
      const session = await getSession();
      if (session) {
        dispatch(setCredentials(session));
      } else {
        dispatch(finishLoading());
      }
    };
    restoreSession();
  }, []);

  return (
    <View className="flex-1">
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="ResetPasswordScreen" />
        </Stack>
      </AuthGate>
    </View>
  );
}
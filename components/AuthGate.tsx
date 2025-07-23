import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useSelector((state: RootState) => state.auth);

  // While restoring session
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  // If logged in, redirect to dashboard
  if (token) {
    return <Redirect href="/dashboards/dashboard" />;
  }

  // Otherwise show the login flow
  return <>{children}</>;
}
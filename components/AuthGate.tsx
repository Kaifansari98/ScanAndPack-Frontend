import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import Loader from './generic/Loader';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useSelector((state: RootState) => state.auth);
  const [delayPassed, setDelayPassed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDelayPassed(true);
    }, 3000); // 5 second delay

    return () => clearTimeout(timer); // Cleanup
  }, []);

  // While restoring session
  if (isLoading || !delayPassed) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Loader />
      </View>
    );
  }

  // If logged in after 5 seconds, redirect
  if (token) {
    return <Redirect href="/dashboards/dashboard" />;
  }

  // Show login or welcome flow
  return <>{children}</>;
}

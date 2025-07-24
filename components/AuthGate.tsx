import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { Redirect } from "expo-router";
import { View } from "react-native";
import Loader from "./generic/Loader";
import { getSession } from "@/utils/authStorage";
import { setCredentials, finishLoading } from "@/redux/slices/authSlice";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const { token, isLoading } = useSelector((state: RootState) => state.auth);
  const [delayPassed, setDelayPassed] = useState(false);

  // 🔁 Restore session directly inside AuthGate
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const session = await getSession();
        if (session?.token && session?.user) {
          dispatch(
            setCredentials({ user: session.user, token: session.token })
          );
        }
      } catch (err) {
        console.error("Session restore error:", err);
      } finally {
        dispatch(finishLoading());
      }
    };

    restoreSession();
  }, []);

  // ⏱️ Optional artificial delay for UX polish
  useEffect(() => {
    const timer = setTimeout(() => setDelayPassed(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // 🌀 While loading session
  if (isLoading || !delayPassed) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Loader />
      </View>
    );
  }

  // ✅ Authenticated → go to dashboard
  if (token) {
    return <Redirect href="/dashboards/dashboard" />;
  }

  return <>{children}</>;
}

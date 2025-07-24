import { View, Text } from "react-native";

import WelcomeScreen from "@/screens/welcome/welcomeScreen";
import AuthGate from "@/components/AuthGate";

export default function Index() {
  return (
    <AuthGate>
      <View className="flex-1 bg-transparent">
        <WelcomeScreen />
      </View>
    </AuthGate>
  );
}

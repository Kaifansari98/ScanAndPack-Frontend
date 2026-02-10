import { View } from "react-native";

import AuthGate from "@/components/AuthGate";
import WelcomeScreen from "@/screens/welcome/welcomeScreen";

export default function Index() {
  return (
    
    <AuthGate>
      <View className="flex-1 bg-transparent">
        <WelcomeScreen />
      </View>
    </AuthGate>
  );
}

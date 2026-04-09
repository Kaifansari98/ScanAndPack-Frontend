import AuthGate from "@/components/AuthGate";
import WelcomeScreen from "@/screens/welcome/welcomeScreen";
import { View } from "react-native";

export default function Index() {
  return (
    <AuthGate>
      <View style={{ flex: 1 }}>
        <WelcomeScreen />
      </View>
    </AuthGate>
  );
}
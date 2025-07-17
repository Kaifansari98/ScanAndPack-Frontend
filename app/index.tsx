import { View, Text } from "react-native";

import WelcomeScreen from "@/screens/welcomeScreen";

export default function Index() {
  return (
    <View className="flex-1 flex-row gap-4 items-center justify-center bg-white">
     <WelcomeScreen />
    </View>
  );
}

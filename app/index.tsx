import { View, Text } from "react-native";

import WelcomeScreen from "@/screens/welcome/welcomeScreen";

export default function Index() {
  return (
    <View className="flex-1 bg-transparent">   
     <WelcomeScreen />
    </View>
  );
}
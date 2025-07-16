import { Text, View } from "react-native";
import { Apple } from "lucide-react-native";

export default function Index() {
  return (
    <View className="flex-1 flex-row gap-4 items-center justify-center bg-white">
      <Apple/>
      <Text className="text-3xl font-montserrat-regular text-sapLight-text">
        Welcome to Nativewind!
      </Text>
    </View>
  );
}
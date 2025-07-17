import { Link } from "expo-router";
import { Apple } from "lucide-react-native";
import { Text, View } from "react-native";

export default function Index() {
  return (
    <View className="flex-1 gap-4 items-center justify-center bg-white">
      <View className="flex-row items-center gap-4">
      <Apple/>
      <Text className="text-3xl font-montserrat-regular text-sapLight-text">
        Welcome to Nativewind!
      </Text>
      </View>
      <View className="bg-red-500 px-10 py-3 rounded-xl">
        <Link href="/auth/login" className="text-white font-bold">Login</Link>
      </View>
    </View>
  );
}
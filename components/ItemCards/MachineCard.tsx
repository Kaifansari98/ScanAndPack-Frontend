import { } from "@gorhom/bottom-sheet";
import { useIsFocused } from "@react-navigation/native";
import { useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image } from "react-native";

import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useToast } from "../Notification/ToastProvider";

export interface MachineData {
  id: number;
  machine_name: string;
  machine_code: string;
  machine_type: string;
  image_path: string;
  
}

interface MachineCardProps {
  machine: MachineData;
  index: number;
}

export const MachineCard = ({
  machine,
  index  
}: MachineCardProps) => {
  const router = useRouter();
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);
  const [projectWeight, setProjectWeight] = useState<number | null>(null);
  const { showToast } = useToast();

  const isFocused = useIsFocused();



  useEffect(() => {
    cardOpacity.value = withDelay(
      index * 100,
      withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      })
    );
    cardTranslateY.value = withDelay(
      index * 100,
      withSpring(0, {
        damping: 15,
        stiffness: 120,
      })
    );
  }, [index]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));


  const [permission, requestPermission] = useCameraPermissions();
 const handleTrackTraceScanPress = async (machineId: number) => {
  const navigate = () => {
    router.push({
      pathname: "/scanner-track-trace",
      params: {
        machine_id: String(machineId),
      },
    });
  };

  if (!permission || !permission.granted) {
    const newPermission = await requestPermission();
    if (newPermission?.granted) {
      navigate();
    } else {
      console.warn("Camera permission not granted");
    }
  } else {
    navigate();
  }
};



  return (
    <Pressable
  onPress={() => handleTrackTraceScanPress(machine.id)}
>
     <Animated.View
  style={[
    animatedCardStyle,
    styles.cardContainer,
    Platform.OS === "ios" ? { marginBottom: 16 } : { marginBottom: 20 },
  ]}
  className="bg-sapLight-card w-full rounded-3xl p-5 border border-gray-100"
>
  {/* Machine Image */}
  <Image
  source={
    machine.image_path
      ? { uri: machine.image_path }
      : require("@/assets/images/machine-placeholder.png")
  }
  style={styles.machineImage}
  resizeMode="cover"
/>

  {/* Title Row */}
  <View className="w-full items-center justify-center mb-4 mt-3">
  <Text className="text-sapLight-text font-montserrat-bold text-xl text-center">
    {machine.machine_name}
  </Text>
</View>
</Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  machineImage: {
    width: "100%",
    height: 140,
    borderRadius: 16,
    backgroundColor: "#f1f1f1",    
    resizeMode : "cover"

  },



});

// components/cards/ItemCard.tsx
import { LinearGradient } from "expo-linear-gradient";
import { Trash2 } from "lucide-react-native";
import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface ScanItem {
  id: number;
  unique_id: string;
  qty: number;
  item_name: string;
  category: string;
  L1: string;
  L2: string;
  L3: string;
}

interface ItemCardProps {
  item: ScanItem;
  index: number;
  status: string;
  onDelete: (id: number) => void;
  onWarnDelete: () => void;
  
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  index,
  status,
  onDelete,
  onWarnDelete,
  
}) => {
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);
  const scale = useSharedValue(1);

  useEffect(() => {
    cardOpacity.value = withDelay(
      index * 100,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
    cardTranslateY.value = withDelay(
      index * 100,
      withSpring(0, { damping: 15, stiffness: 120 })
    );
  }, [index]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }, { scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPressIn={() => (scale.value = withSpring(0.98))}
      onPressOut={() => (scale.value = withSpring(1))}
    >
      <Animated.View style={[animatedCardStyle, styles.cardContainer]}>
        <LinearGradient
          colors={["#ffffff", "#f8fafc"]}
          style={styles.cardGradient}
        >
          <View className="w-full p-5">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-sapLight-text font-montserrat-bold text-xl flex-1">
                {item.item_name}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (status !== "packed") {
                    onDelete(item.id);
                  } else {
                    onWarnDelete();
                  }
                }}
              >
                <Trash2 color="#ef4444" size={20} />
              </TouchableOpacity>
            </View>
            <View
              className="rounded-full px-3 py-1 bg-green-100 mb-4"
              style={{ alignSelf: "flex-start" }}
            >
              <Text className="text-green-700 font-montserrat-semibold text-xs capitalize">
                {item.category}
              </Text>
            </View>
            <View className="w-full flex-row justify-between items-end">
              <View className="flex-row gap-4">
                <TextBlock label="Length" value={item.L1} />
                <TextBlock label="Width" value={item.L2} />
                <TextBlock label="Thickness" value={item.L3} />
              </View>
              <View className="items-center">
                <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
                  Quantity
                </Text>
                <Text className="text-sapLight-text font-montserrat-medium text-3xl">
                  1
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

const TextBlock = ({ label, value }: { label: string; value: string }) => {
  return (
    <View>
      <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
        {label}
      </Text>
      <Text className="text-sapLight-text font-montserrat-medium text-xl">
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 16,
  },
  cardGradient: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
});

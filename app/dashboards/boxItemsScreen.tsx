import Navbar from "@/components/generic/Navbar";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { ScanLine, Trash2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { QRScanner } from "../../components/generic/QRScanner";

// Define Box interface
interface Box {
  name: string;
  items: {
    [product: string]: {
      status: string;
      qty: number;
      name: string;
      category: string;
      unitId: string;
      ls: {
        l1: number;
        l2: number;
        l3: number;
      };
    };
  }[];
}

// Item Card Component
interface ItemCardProps {
  item: {
    product: string;
    details: {
      status: string;
      qty: number;
      name: string;
      category: string;
      unitId: string;
      ls: {
        l1: number;
        l2: number;
        l3: number;
      };
    };
  };
  index: number;
}

function ItemCard({ item, index }: ItemCardProps) {
  // Animation values
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);
  const scale = useSharedValue(1);

  // Trigger animations on mount
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

  // Animated styles
  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }, { scale: scale.value }],
  }));

  const handleDelete = () => {
    console.log(`Delete item: ${item.details.name}`);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPressIn={() => {
        scale.value = withSpring(0.98);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
    >
      <Animated.View style={[animatedCardStyle, styles.cardContainer]}>
        <LinearGradient
          colors={["#ffffff", "#f8fafc"]}
          style={styles.cardGradient}
        >
          <View className="w-full p-5">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-sapLight-text font-montserrat-bold text-xl flex-1">
                {item.details.name}
              </Text>
              <View className="flex-row items-start h-full gap-2">
                <TouchableOpacity onPress={handleDelete}>
                  <Trash2 color="#ef4444" size={20} />
                </TouchableOpacity>
              </View>
            </View>
            <View className="flex-col items-start flex-1">
              <View className="rounded-full px-3 py-1 bg-green-100 mb-4">
                <Text className="text-green-700 font-montserrat-semibold text-xs">
                  {item.details.category}
                </Text>
              </View>
              <View className="w-full flex-row justify-between items-end">
                <View className="">
                  <View className="flex-row gap-4">
                    <View className="flex-col">
                      <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
                        Length
                      </Text>
                      <Text className="text-sapLight-text font-montserrat-medium text-xl">
                        {item.details.ls.l1}
                      </Text>
                    </View>
                    <View className="flex-col">
                      <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
                        Width
                      </Text>
                      <Text className="text-sapLight-text font-montserrat-medium text-xl">
                        {item.details.ls.l2}
                      </Text>
                    </View>
                    <View className="flex-col">
                      <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
                        Thickness
                      </Text>
                      <Text className="text-sapLight-text font-montserrat-medium text-xl">
                        {item.details.ls.l3}
                      </Text>
                    </View>
                  </View>
                </View>
                <View className="items-center">
                  <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
                    Quantity
                  </Text>
                  <Text className="text-sapLight-text font-montserrat-medium text-3xl">
                    {item.details.qty}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function BoxItemsScreen() {
  const { box: boxString } = useLocalSearchParams<{ box: string }>();
  const box = JSON.parse(boxString) as Box;
  const [showScanner, setShowScanner] = useState(false);

  // Flatten items for FlatList
  const flatItems = box.items.flatMap((itemObj) =>
    Object.entries(itemObj).map(([product, details]) => ({
      product,
      details,
    }))
  );

  // Animation values for title
  const titleOpacity = useSharedValue(0);
  const scanButtonScale = useSharedValue(1);

  // Trigger animations on mount
  useEffect(() => {
    titleOpacity.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  // Animated styles for title
  const animatedTitleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  // Animated styles for scan button
  const animatedScanButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scanButtonScale.value }],
  }));

  const handleScan = (data: string) => {
    console.log("Scanned data:", data);
    setShowScanner(false); // ✅ close from parent
  };

  return (
    <View className="flex-1 bg-sapLight-background">
      {showScanner ? (
        <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      ) : (
        <>
          <Navbar title={box.name} showBack={true} showSearch={true} />
          <View className="flex-1 mx-2">
            {/* Items Section */}
            <View className="mt-6 bg-white/50 rounded-2xl pb-18">
              <FlatList
                data={flatItems}
                renderItem={({ item, index }) => (
                  <ItemCard item={item} index={index} />
                )}
                keyExtractor={(item) => item.details.unitId}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
          <View style={styles.scanBtn}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setShowScanner(true)}
              onPressIn={() => {
                scanButtonScale.value = withSpring(0.95);
              }}
              onPressOut={() => {
                scanButtonScale.value = withSpring(1);
              }}
            >
              <Animated.View style={animatedScanButtonStyle}>
                <LinearGradient
                  colors={["#000000", "#222222"]}
                  style={styles.scanButton}
                >
                  <ScanLine size={28} color="#fff" />
                  <Text className="text-white font-montserrat-bold text-lg ml-3">
                    Scan Product
                  </Text>
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

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
  listContainer: {
    paddingBottom: 80,
    paddingHorizontal: 4,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scanBtn: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 25 : 16,
    right: 18,
    left: 18,
  },
});

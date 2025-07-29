import Loader from "@/components/generic/Loader";
import Navbar from "@/components/generic/Navbar";
import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import LottieView from "lottie-react-native";
import { ScanLine, Trash2 } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import ConfirmationBox from "@/components/generic/ConfirmationBox";
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
import { useSelector } from "react-redux";
import { QRScanner } from "../../components/generic/QRScanner";
import { useToast } from "@/components/Notification/ToastProvider";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { ConfirmationBottomSheet } from "@/components/bottomSheet/ConfirmationBottomSheet";

interface Box {
  name: string;
  id: number;
  project_id: number;
  vendor_id: number;
  client_id: number;
}

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

export default function BoxItemsScreen() {
  // Move all hooks to the top
  const { payload: payloadString } = useLocalSearchParams<{
    payload: string;
  }>();
  const { showToast } = useToast();
  const [showScanner, setShowScanner] = useState(false);
  const [scanItems, setScanItems] = useState<ScanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const scanButtonScale = useSharedValue(1);

  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  const deleteSheetRef = useRef<BottomSheetModal>(null);

  const user = useSelector((state: RootState) => state.auth.user);

  // useEffect(() => {
  //   if (user) {
  //     console.log("User Data:", {
  //       id: user.id,
  //       user_name: user.user_name,
  //     });
  //   }
  // }, [user]);

  // Parse payload safely
  let box: Box | null = null;
  try {
    if (payloadString) {
      box = JSON.parse(payloadString) as Box;
    }
  } catch (error) {
    console.error("Failed to parse payload:", error);
  }

  // Fetch scan items
  useEffect(() => {
    if (!box) return; // Skip fetching if box is invalid

    const fetchScanItems = async () => {
      try {
        setLoading(true);
        const { data } = await axios.post("/scan-items/by-fields", {
          project_id: box.project_id,
          vendor_id: box.vendor_id,
          client_id: box.client_id,
          box_id: box.id,
        });

        // console.log(data);

        const items =
          data?.data?.map((item: any) => ({
            ...item.project_item_details,
            id: item.id,
          })) ?? [];
        setScanItems(items);
        // console.log(
        //   "Request URL:",
        //   axios.getUri({
        //     url: "/scan-items/by-fields",
        //     method: "POST",
        //     baseURL: axios.defaults.baseURL,
        //   })
        // );
        // console.log("Request payload:", {
        //   project_id: box.project_id,
        //   vendor_id: box.vendor_id,
        //   client_id: box.client_id,
        //   box_id: box.id,
        // });
        // console.log("Request headers:", axios.defaults.headers);
      } catch (error) {
        console.log("Failed to fetch scan items:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchScanItems();
  }, [box?.project_id, box?.vendor_id, box?.client_id, box?.id]);

  const animatedScanButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scanButtonScale.value }],
  }));

  const handleScan = async (scannedData: string) => {
    console.log("Scanned data:", scannedData);
    setShowScanner(false);

    if (!box || !user?.id) {
      console.error("Missing box or user info");
      return;
    }

    const payload = {
      project_id: box.project_id,
      vendor_id: box.vendor_id,
      client_id: box.client_id,
      unique_id: scannedData,
      box_id: box.id,
      created_by: user.id,
      status: "packed",
    };

    try {
      const response = await axios.post(
        "/scan-items/scan-and-pack/add",
        payload
      );
      // console.log("Scan packed successfully:", response.data);
      showToast("success", "Item Added Successfully");

      // Refetch items to show updated list
      const { data } = await axios.post("/scan-items/by-fields", {
        project_id: box.project_id,
        vendor_id: box.vendor_id,
        client_id: box.client_id,
        box_id: box.id,
      });

      const items =
        data?.data?.map((item: any) => ({
          ...item.project_item_details,
          id: item.id,
        })) ?? [];

      setScanItems(items);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Something went wrong";
      // console.error("Error packing scanned item:", errorMessage);
      showToast("error", errorMessage);
    }
  };

  // Use in bottomSheet
  const handleConfirmDeleteItem = async () => {
    if (!selectedItemId) return;

    try {
      await axios.delete(`/scan-items/scan-and-pack/delete/${selectedItemId}`);
      console.log(`Item with id ${selectedItemId} deleted`);
      showToast("success", "Item deleted succussfully");

      // Refresh item list
      if (box) {
        const { data } = await axios.post("/scan-items/by-fields", {
          project_id: box.project_id,
          vendor_id: box.vendor_id,
          client_id: box.client_id,
          box_id: box.id,
        });

        const items =
          data?.data?.map((item: any) => ({
            ...item.project_item_details,
            id: item.id,
          })) ?? [];

        setScanItems(items);
      }
    } catch (error) {
      console.error("Failed to delete scan item:", error);
    } finally {
      setSelectedItemId(null);
      deleteSheetRef.current?.close();
    }
  };

  // use in item
  const handleDeleteItem = () => {
    console.log("Open BottomSheet...");
    deleteSheetRef.current?.present();
  };

  // use in bottomSheet
  const hanleCloseBottomSheet = () => {
    console.log("Open BottomSheet...");
    deleteSheetRef.current?.close();
  };

  // Render error screen if box is invalid
  if (!box) {
    return (
      <View className="flex-1 bg-sapLight-background justify-center items-center">
        <Text className="text-red-500 font-montserrat-bold text-lg">
          Error: Invalid or missing box data
        </Text>
      </View>
    );
  }

  const RenderItem = ({ item, index }: { item: ScanItem; index: number }) => {
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
                    setSelectedItemId(item.id);
                    handleDeleteItem();
                  }}
                >
                  <Trash2 color="#ef4444" size={20} />
                </TouchableOpacity>
              </View>
              <View
                className="rounded-full px-3 py-1 bg-green-100 mb-4"
                style={{ alignSelf: "flex-start" }}
              >
                <Text className="text-green-700 font-montserrat-semibold text-xs">
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
                    {/* {item.qty} */} 1
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-sapLight-background ">
      {showScanner ? (
        <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      ) : (
        <>
          <Navbar title={box.name} showBack showSearch={false} />
          <View className="flex-1  px-4 ">
            <View className="flex-1 mt-6 bg-white/50 rounded-2xl pb-24 ">
              {loading ? (
                <View className="flex-1 justify-center items-center">
                  <Loader />
                </View>
              ) : scanItems.length === 0 ? (
                <View className="flex-1 justify-center items-center">
                  <LottieView
                    source={require("@/assets/animations/emptyBox.json")} // 👈 Use correct path here
                    autoPlay
                    loop={false}
                    style={styles.lottie}
                  />
                  <Text className="text-sapLight-infoText font-montserrat">
                    Box is Empty
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={scanItems}
                  renderItem={({ item, index }) => (
                    <RenderItem item={item} index={index} />
                  )}
                  keyExtractor={(item) => item.id.toString()}
                />
              )}
            </View>
          </View>
          <View style={styles.scanBtn}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setShowScanner(true)}
              onPressIn={() => (scanButtonScale.value = withSpring(0.95))}
              onPressOut={() => (scanButtonScale.value = withSpring(1))}
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

      <ConfirmationBottomSheet
        ref={deleteSheetRef}
        title="Delete Item?"
        message="Are you sure you want to delete this scanned items?"
        confirmLabel="Yes. Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDeleteItem}
        onCancel={hanleCloseBottomSheet}
      />
    </View>
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
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
  lottie: {
    width: 220,
    height: 220,
  },
});

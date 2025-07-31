import { ConfirmationBottomSheet } from "@/components/bottomSheet/ConfirmationBottomSheet";
import Loader from "@/components/generic/Loader";
import Navbar from "@/components/generic/Navbar";
import { useToast } from "@/components/Notification/ToastProvider";
import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import LottieView from "lottie-react-native";
import { ScanLine } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSelector } from "react-redux";
import { QRScanner } from "../../components/generic/QRScanner";
import { ItemCard } from "@/components/ItemCards/ItemCard";

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
  const [box, setBox] = useState<Box | null>(null);
  const scanButtonScale = useSharedValue(1);
  const [status, setStatus] = useState<string>("");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const deleteSheetRef = useRef<BottomSheetModal>(null);

  const updateStatusSheetRef = useRef<BottomSheetModal>(null);

  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (!payloadString) return;
    try {
      const parsed = JSON.parse(payloadString) as Box;
      setBox(parsed);
    } catch (error) {
      console.error("❌ Failed to parse payload:", error);
      showToast("error", "Invalid box data");
    }
  }, [payloadString]);

  // Fetch scan items
  useEffect(() => {
    if (!box) return;
    const fetchScanItems = async () => {
      try {
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
      } catch (error) {
        console.log("Failed to fetch scan items:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchScanItems();
  }, [box?.project_id, box?.vendor_id, box?.client_id, box?.id]);

  const fetchBoxDetails = async () => {
    if (!box?.id || !box?.vendor_id || !box?.project_id || !box?.client_id) {
      return;
    }

    try {
      const res = await axios.get(
        `/boxes/details/vendor/${box.vendor_id}/project/${box.project_id}/client/${box.client_id}/box/${box.id}`
      );
      const newStatus = res.data.box.box_status;
      setStatus(newStatus);
    } catch (error) {
      console.error("Failed to fetch box details:", error);
      showToast("error", "Failed to load box details");
    }
  };

  useEffect(() => {
    if (box && box.id && box.vendor_id && box.project_id && box.client_id) {
      fetchBoxDetails();
    }
  }, [box]);

  const handleScan = async (scannedData: string) => {
    // console.log("Scanned data:", scannedData);
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
      // console.log(`Item with id ${selectedItemId} deleted`);
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

  const handleConfirmUpdateStatus = async () => {
    if (!box?.id) return;
    const newstatus = status === "unpacked" ? "packed" : "unpacked";

    try {
      await axios.put(`/boxes/status/${newstatus}/${box?.id}`);
      showToast("success", `Box status updated to ${newstatus}`);

      // ✅ Immediately update local status for instant UI feedback
      setStatus(newstatus);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update status";
      showToast("error", errorMessage);
      console.error("update status error:", errorMessage);
    } finally {
      updateStatusSheetRef.current?.close();
    }
  };

  // use in item
  const handleDeleteItem = () => {
    console.log("Open BottomSheet...");
    deleteSheetRef.current?.present();
  };

  const handleUpdateStatus = () => {
    if (status === "unpacked" && scanItems.length === 0) {
      showToast("warning", "Box is empty. Add items before packing.");
      return;
    }
    updateStatusSheetRef.current?.present();
  };

  const animatedScanButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scanButtonScale.value }],
  }));

  // Render error screen if box is invalid
  // if (!box) {
  //   return (
  //     <View className="flex-1 bg-sapLight-background justify-center items-center">
  //       <Text className="text-red-500 font-montserrat-bold text-lg">
  //         Error: Invalid or missing box data
  //       </Text>
  //     </View>
  //   );
  // }

  if (!box) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Loader />
      </View>
    );
  }
  return (
    <View className="flex-1 bg-sapLight-background ">
      {showScanner ? (
        <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      ) : (
        <>
          <Navbar
            title={box.name}
            showBack
            showSearch={false}
            showPack={true}
            boxStatus={
              status === "packed" ? "Mark as Unpacked" : "Mark as Packed"
            }
            onPackPress={handleUpdateStatus}
          />
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
                    <ItemCard
                      item={item}
                      index={index}
                      status={status}
                      onDelete={(id) => {
                        setSelectedItemId(id);
                        handleDeleteItem();
                      }}
                      onWarnDelete={() =>
                        showToast(
                          "warning",
                          "The box is packed, Unpacked it to delete"
                        )
                      }
                    />
                  )}
                  keyExtractor={(item) => item.id.toString()}
                />
              )}
            </View>
          </View>
          <View style={styles.scanBtn}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                if (status !== "packed") {
                  setShowScanner(true);
                } else {
                  showToast(
                    "warning",
                    "The box is packed, Unpacked it to Add items"
                  );
                }
              }}
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
        onCancel={() => deleteSheetRef.current?.close()}
      />

      <ConfirmationBottomSheet
        ref={updateStatusSheetRef}
        title={status === "packed" ? "Mark As Unpacked" : "Mark As Packed"}
        message={
          status === "packed"
            ? "Are you sure you want to mark this box as unpacked"
            : "Are you sure you want to mark this box as packed"
        }
        cancelLabel="Cancel"
        confirmLabel={`Yes, ${status === "packed" ? "Unpacked" : "Packed"}`}
        onConfirm={handleConfirmUpdateStatus}
        onCancel={() => updateStatusSheetRef.current?.close()}
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

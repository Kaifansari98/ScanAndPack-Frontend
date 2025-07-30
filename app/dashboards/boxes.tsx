import Loader from "@/components/generic/Loader";
import Navbar from "@/components/generic/Navbar";
import { AddBoxModal } from "@/components/modals/AddBoxModal";
import axios from "@/lib/axios";
import {
  BottomSheetModal,
  TouchableWithoutFeedback,
} from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import LottieView from "lottie-react-native";
import * as FileSystem from "expo-file-system";
import { ScanAndPackUrl } from "@/utils/getAssetUrls";
import {
  ArrowUpRight,
  Download,
  Plus,
  SquarePen,
  Trash2,
} from "lucide-react-native";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
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
import * as Print from "expo-print";
import { ConfirmationBottomSheet } from "@/components/bottomSheet/ConfirmationBottomSheet";
import { useToast } from "@/components/Notification/ToastProvider";
import { UpdateBoxModal } from "@/components/modals/UpdateBoxModal";

// Define Project interface
interface Project {
  id: number;
  vendor_id: number;
  project_details_id: number | null;
  projectName: string;
  totalNoItems: number;
  unpackedItems: number;
  packedItems: number;
  status: "packed" | "unpacked";
  date: string;
}

const ImageUrl = "http://localhost:7777/assets/scan-and-pack/";

// Define Box interface
interface Box {
  id: number;
  name: string;
  box_status: "packed" | "unpacked" | string;
  items_count: number;
  details: any;
  project_id: number;
  vendor_id: number;
  client_id: number;
}

// Box Card Component
function BoxCard({
  box,
  index,
  handleDownload,
  handleDeletePress,
  handleEditPress,
}: {
  box: Box;
  index: number;
  handleDownload: () => void;
  handleDeletePress: () => void;
  handleEditPress: () => void;
}) {
  const router = useRouter();
  // Animation values
  const { showToast } = useToast();
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);
  const scale = useSharedValue(1);

  const status = box.box_status || "In Progress";

  const bgClass =
    status === "packed"
      ? "bg-green-100"
      : status === "unpacked"
        ? "bg-orange-100"
        : "bg-gray-200";
  const textClass =
    status === "packed"
      ? "text-green-700"
      : status === "unpacked"
        ? "text-yellow-800"
        : "text-gray-700";

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

  const handleNavigate = () => {
    const payload = {
      name: box.name,
      project_id: box.project_id,
      vendor_id: box.vendor_id,
      client_id: box.client_id,
      id: box.id,
      status: box.box_status,
    };

    router.push({
      pathname: "./boxItemsScreen",
      params: {
        payload: JSON.stringify(payload),
      },
    });
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
      onPress={handleNavigate}
    >
      <Animated.View style={[animatedCardStyle, styles.cardContainer]}>
        <View style={styles.cardGradient} className="p-5">
          <View className="w-full flex flex-row justify-between items-center mb-2">
            <View className={`rounded-full px-3 py-1 ${bgClass}`}>
              <Text
                className={`font-montserrat-semibold text-xs capitalize ${textClass}`}
              >
                {status}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (status === "packed") {
                  showToast("warning", "Unable to Delete Box is Packed");
                } else {
                  handleDeletePress();
                }
              }}
              className={`rounded-xl p-2 bg-sapLight-card`}
            >
              <Trash2 color={"#EF4444"} size={20} />
            </TouchableOpacity>
          </View>
          <View className="flex-row items-start justify-between mb-2 gap-1.5">
            <Text className="text-sapLight-text font-montserrat-bold text-lg flex-1">
              {box.name}
            </Text>
          </View>
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-sapLight-infoText font-montserrat-medium text-sm mb-1">
                Items Count
              </Text>
              <Text className="text-sapLight-text font-montserrat-semibold text-2xl">
                {box.items_count}
              </Text>
            </View>
            <View className="h-full flex-row items-end gap-2">
              <TouchableOpacity
                onPress={() =>
                  box.items_count <= 0
                    ? showToast("warning", `Download Failed, Box is empty`)
                    : handleDownload()
                }
                className="p-2 bg-sapLight-card rounded-xl"
              >
                <Download color={"#555555"} size={20} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEditPress}
                className="p-2 bg-sapLight-card rounded-xl"
              >
                <SquarePen color={"#555555"} size={20} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function BoxesScreen() {
  const { project: projectString } = useLocalSearchParams<{
    project: string;
  }>();
  const project = useMemo(
    () => JSON.parse(projectString) as Project,
    [projectString]
  );

  const sheetRef = useRef<BottomSheetModal>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingBox, setCreatingBox] = useState<boolean>(false);

  const downloadSheetRef = useRef<BottomSheetModal>(null);
  const user = useSelector((state: RootState) => state.auth.user);

  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const deleteSheetRef = useRef<BottomSheetModal>(null);
  const [selectedBoxForDelete, setSelectedBoxForDelete] = useState<Box | null>(
    null
  );

  const editSheetRef = useRef<BottomSheetModal>(null);
  const [selectedBoxForEdit, setSelectedBoxForEdit] = useState<Box | null>(
    null
  );

  const updateSheetRef = useRef<BottomSheetModal>(null);

  const handleEdit = (box: Box) => {
    setSelectedBoxForEdit(box);
    editSheetRef.current?.present();
  };

  const handleConfirmEdit = () => {
    if (selectedBoxForEdit) {
      editSheetRef.current?.close();
      setTimeout(() => {
        updateSheetRef.current?.present();
      }, 300); // Wait for previous sheet to close
    }
  };

  const handleCancelEdit = () => {
    editSheetRef.current?.close();
  };

  const fetchBoxDetails = async ({
    vendor_id,
    project_id,
    client_id,
    id,
  }: Box) => {
    try {
      const permissionResponse = await Sharing.isAvailableAsync();
      if (!permissionResponse) {
        console.error("❌ Sharing is not available on this device");
        return;
      }

      const res = await axios.get(
        `/boxes/details/vendor/${vendor_id}/project/${project_id}/client/${client_id}/box/${id}`
      );
      console.log("📦 Full Box Details =>", JSON.stringify(res.data, null, 2));

      // Extract data for PDF
      const { vendor, box: boxDetails, items } = res.data;

      console.log(ScanAndPackUrl(vendor.logo));

      // HTML content for PDF
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
              .logo { width: 120px; }
              .vendor-details { text-align: right; }
              .vendor-details h2 { margin: 0; font-size: 18px; }
              .vendor-details p { margin: 5px 0; font-size: 14px; }
              .details { margin-bottom: 20px; }
              .details p { margin: 5px 0; font-size: 16px; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 14px; }
              th { background-color: #f2f2f2; font-weight: bold; }
              .table-container { margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <img src="${ScanAndPackUrl(vendor.logo)}" class="logo" alt="Logo" />
              <div class="vendor-details">
                <h2>${vendor.vendor_name.replace(/&/g, "&amp;")}</h2>
                <p>Contact: ${vendor.primary_contact_number}</p>
                <p>Email: ${vendor.primary_contact_email}</p>
                <p>Date: ${new Date().toLocaleDateString()}</p>
              </div>
            </div>
            <div class="details">
              <p>Project Name: ${boxDetails.project.project_name.replace(/&/g, "&amp;")}</p>
              <p>Box Name: ${boxDetails.box_name.replace(/&/g, "&amp;")}</p>
            </div>
            <div class="table-container">
              <table>
                <tr>
                  <th>Sr No.</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Qty</th>
                </tr>
                ${items
                  .map(
                    (item: any, index: number) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${item.projectItem.item_name.replace(/&/g, "&amp;")}</td>
                      <td>${item.projectItem.category.replace(/&/g, "&amp;")}</td>
                      <td>${item.qty}</td>
                    </tr>
                  `
                  )
                  .join("")}
              </table>
            </div>
          </body>
        </html>
      `;

      const safeProjectName = boxDetails.project.project_name.replace(
        /[^a-zA-Z0-9-_]/g,
        "_"
      );
      const safeBoxName = boxDetails.box_name.replace(/[^a-zA-Z0-9-_]/g, "_");
      const fileName = `${safeProjectName}-${safeBoxName}.pdf`;

      // Generate PDF (still lands in cacheDirectory)
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      console.log("Original PDF location:", uri); // Will show something in Cache

      // Construct path in DocumentDirectory
      const newPath = FileSystem.documentDirectory + fileName;
      console.log("Moving to:", newPath); // This MUST be in documentDirectory

      // Move it
      await FileSystem.moveAsync({
        from: uri,
        to: newPath,
      });

      // Share it
      await Sharing.shareAsync(newPath, {
        mimeType: "application/pdf",
        dialogTitle: `Share ${fileName}`,
        UTI: "com.adobe.pdf",
      });
    } catch (err) {
      console.error("❌ Failed to fetch box details or generate PDF:", err);
    }
  };

  const handleDownload = (box: Box) => {
    setSelectedBox(box);
    downloadSheetRef.current?.present();
  };

  const handleConfirmDownload = () => {
    if (selectedBox) {
      fetchBoxDetails(selectedBox);
      downloadSheetRef.current?.close();
    }
  };

  const handleCancelDownload = () => {
    downloadSheetRef.current?.close();
  };

  const handleDelete = (box: Box) => {
    setSelectedBoxForDelete(box);
    deleteSheetRef.current?.present();
  };

  const handleConfirmDelete = async () => {
    if (!selectedBoxForDelete) return;

    try {
      await handleDeletee(selectedBoxForDelete);
    } catch (error) {
      console.error("❌ Error in handleConfirmDelete:", error);
    } finally {
      deleteSheetRef.current?.close();
    }
  };

  const handleCancelDelete = () => {
    deleteSheetRef.current?.close();
  };

  const fetchBoxes = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `/boxes/vendor/${project.vendor_id}/project/${project.id}`
      );
      // console.log(res.data);
      const formatted = res.data.map((box: any) => ({
        id: box.id,
        name: box.box_name,
        box_status: box.box_status,
        items_count: box.items_count,
        details: box.details,
        project_id: box.project_id,
        vendor_id: box.vendor_id,
        client_id: box.client_id,
      }));
      setBoxes(formatted);
    } catch (error) {
      console.error("Failed to fetch boxes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletee = async (box: Box) => {
    try {
      const res = await axios.delete(`/boxes/delete/${box.id}`, {
        data: { deleted_by: user?.id },
      });

      console.log("✅ Delete response:", res.data);
      fetchBoxes(); // Refresh the list after deletion
    } catch (error) {
      console.error("❌ Failed to delete box:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBoxes(); // Refetch boxes on screen focus
    }, [project.id, project.vendor_id])
  );

  // Animation values for project card
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);
  const titleOpacity = useSharedValue(0);

  // Trigger animations on mount
  useEffect(() => {
    cardOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
    cardTranslateY.value = withSpring(0, {
      damping: 15,
      stiffness: 120,
    });
    titleOpacity.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const onAdd = useCallback(
    (name: string) => {
      const fetchBoxes = async () => {
        try {
          setLoading(true);
          const res = await axios.get(
            `/boxes/vendor/${project.vendor_id}/project/${project.id}`
          );
          const formatted = res.data.map((box: any) => ({
            id: box.id,
            name: box.box_name,
            box_status: box.box_status,
            items_count: box.items_count,
            details: box.details,
          }));
          setBoxes(formatted);
        } catch (error) {
          console.error("Failed to fetch boxes:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchBoxes();
    },
    [project.id, project.vendor_id]
  );

  // Animated styles for project card
  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  // Animated styles for title
  const animatedTitleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const addButtonScale = useSharedValue(1);
  const animatedAddButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addButtonScale.value }],
  }));

  return (
    <View className="flex-1 bg-sapLight-background">
      <Navbar title={project.projectName} showBack={true} showSearch={false} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-1 mx-4 py-6">
          {/* Project Card */}
          <Animated.View
            style={[animatedCardStyle, styles.cardContainerr]}
            className="bg-sapLight-card w-full rounded-3xl p-5 border border-gray-100"
          >
            <View className="flex-row justify-between items-center mb-4">
              <View
                className={`rounded-full px-3 py-1  ${
                  project.status === "packed" ? "bg-blue-100" : "bg-blue-100"
                }`}
              >
                <Text
                  className={`text-sm font-montserrat-semibold capitalize ${
                    project.status === "packed"
                      ? "text-blue-700"
                      : "text-blue-700"
                  }`}
                >
                  {project.status}
                </Text>
              </View>
              <View className="flex-col justify-center items-start">
                <Text className="text-xs text-sapLight-infoText font-montserrat">
                  Est. Date
                </Text>
                <Text className="text-sapLight-infoText font-montserrat-medium text-md">
                  {project.date}
                </Text>
              </View>
            </View>
            <View className="w-full flex-row items-center justify-between mb-4">
              <Text className="text-sapLight-text font-montserrat-bold text-xl flex-1">
                {project.projectName}
              </Text>
              
            </View>
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
                  Total Items
                </Text>
                <Text className="text-sapLight-text font-montserrat-semibold text-xl">
                  {project.totalNoItems.toLocaleString()}
                </Text>
              </View>
              <View className="flex-row space-x-6 gap-4">
                <View className="flex-col items-center">
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-full mr-2 bg-green-400" />
                    <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
                      Packed
                    </Text>
                  </View>
                  <View>
                    <Text className="text-sapLight-text font-montserrat-semibold text-base">
                      {project.packedItems.toLocaleString()}
                    </Text>
                  </View>
                </View>
                <View className="items-center flex-col">
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-full mr-2 bg-red-400" />
                    <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
                      Unpacked
                    </Text>
                  </View>
                  <View>
                    <Text className="text-sapLight-text font-montserrat-semibold text-base">
                      {project.unpackedItems.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Boxes Section */}
          <View className="flex-1 mt-6 rounded-2xl">
            <Animated.View
              style={animatedTitleStyle}
              className="flex-row justify-between items-center mb-4"
            >
              <Text className="text-sapLight-text font-montserrat-semibold text-3xl  pb-2">
                {boxes.length} {boxes.length > 1 ? "Boxes" : "Box"}
              </Text>
            </Animated.View>
            {loading ? (
              <View className="flex-1 justify-center items-center">
                <Loader />
              </View>
            ) : (
              <FlatList
                scrollEnabled={false}
                data={boxes}
                renderItem={({ item, index }) => (
                  <BoxCard
                    box={item}
                    index={index}
                    handleDownload={() => handleDownload(item)}
                    handleDeletePress={() => handleDelete(item)}
                    handleEditPress={() => handleEdit(item)}
                  />
                )}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={[
                  styles.listContainer,
                  boxes.length === 0 && { flex: 1, justifyContent: "center" },
                ]}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <LottieView
                      source={require("@/assets/animations/emptyBox.json")}
                      autoPlay
                      loop={false}
                      style={styles.lottie}
                    />
                    <Text className="text-sapLight-infoText font-montserrat capitalize">
                      0 Boxes Found
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.addBoxBtn}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => sheetRef.current?.present()}
          onPressIn={() => {
            addButtonScale.value = withSpring(0.95);
          }}
          onPressOut={() => {
            addButtonScale.value = withSpring(1);
          }}
        >
          <Animated.View style={animatedAddButtonStyle}>
            <LinearGradient
              colors={["#000000", "#222222"]}
              style={styles.addButton}
            >
              <Plus size={28} color="#fff" />
              <Text className="text-white font-montserrat-bold text-lg ml-3">
                Add Box
              </Text>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </View>
      {creatingBox && (
        <View style={styles.loaderOverlly}>
          <Loader />
        </View>
      )}
      {!creatingBox && (
        <AddBoxModal
          ref={sheetRef}
          onSubmit={onAdd}
          project={project}
          setCreatingBox={setCreatingBox}
        />
      )}

      <ConfirmationBottomSheet
        ref={downloadSheetRef}
        title="Download PDF"
        message={`Are you sure you want to download PDF?`}
        cancelLabel="Cancel"
        confirmLabel="Yes, Download"
        onConfirm={handleConfirmDownload}
        onCancel={handleCancelDownload}
      />

      <ConfirmationBottomSheet
        ref={deleteSheetRef}
        title="Delete Box"
        message={`Are you sure you want to delete "${selectedBoxForDelete?.name}"?`}
        cancelLabel="Cancel"
        confirmLabel="Yes, Delete"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      <ConfirmationBottomSheet
        ref={editSheetRef}
        title="Edit Box"
        message={`Are you sure you want to edit "${selectedBoxForEdit?.name}"?`}
        cancelLabel="Cancel"
        confirmLabel="Yes, Edit"
        onConfirm={handleConfirmEdit}
        onCancel={handleCancelEdit}
      />

      {selectedBoxForEdit && (
        <UpdateBoxModal
          ref={updateSheetRef}
          box={selectedBoxForEdit}
          onSubmit={(updatedName) => {
            // Step 3 logic: update local state
            setBoxes((prev) =>
              prev.map((b) =>
                b.id === selectedBoxForEdit.id ? { ...b, name: updatedName } : b
              )
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainerr: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 16,
  },
  cardContainer: {
    marginBottom: 8,
  },
  cardGradient: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  listContainer: {
    paddingBottom: 80,
    paddingHorizontal: 4,
  },
  addButton: {
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
  addBoxBtn: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 25 : 16,
    right: 18,
    left: 18,
  },
  loaderOverlly: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  lottie: {
    width: 220,
    height: 220,
  },
});

import Loader from "@/components/generic/Loader";
import Navbar from "@/components/generic/Navbar";
import { AddBoxModal } from "@/components/modals/AddBoxModal";
import axios from "@/lib/axios";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { Download, Plus, SquarePen, Trash2 } from "lucide-react-native";
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
import { ConfirmationBottomSheet } from "@/components/bottomSheet/ConfirmationBottomSheet";
import { useToast } from "@/components/Notification/ToastProvider";
import { UpdateBoxModal } from "@/components/modals/UpdateBoxModal";
import { ProjectCard } from "@/components/ItemCards/ProjectCard";
import { fetchProjectDetailsAndShare } from "@/utils/projectPdfUtils";
import { fetchBoxtDetailsAndShare } from "@/utils/BoxPdfUtils";

// Define Project interface
interface Project {
  id: number;
  vendor_id: number;
  project_details_id: number | null;
  projectName: string;
  totalNoItems: number;
  unpackedItems: number;
  client_id: number;
  packedItems: number;
  status: "packed" | "unpacked";
  date: string;
}

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
      project_id: box.project_id,
      vendor_id: box.vendor_id,
      client_id: box.client_id,
      id: box.id,
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
  const user = useSelector((state: RootState) => state.auth.user);
  const { showToast } = useToast();
  const { project: projectString } = useLocalSearchParams<{
    project: string;
  }>();
  const project = useMemo(
    () => JSON.parse(projectString) as Project,
    [projectString]
  );
  const [showGlobalLoader, setShowGlobalLoader] = useState<boolean>(false);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const sheetRef = useRef<BottomSheetModal>(null);
  const [loading, setLoading] = useState(true);
  const [creatingBox, setCreatingBox] = useState<boolean>(false);
  const projectSheetRef = useRef<BottomSheetModal>(null);
  const deleteSheetRef = useRef<BottomSheetModal>(null);
  const editSheetRef = useRef<BottomSheetModal>(null);
  const [selectedBoxForEdit, setSelectedBoxForEdit] = useState<Box | null>(
    null
  );
  const downloadSheetRef = useRef<BottomSheetModal>(null);
  const [selectedBoxForDelete, setSelectedBoxForDelete] = useState<Box | null>(
    null
  );
  const updateSheetRef = useRef<BottomSheetModal>(null);

  const fetchBoxes = useCallback(async () => {
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
  }, [project.id, project.vendor_id]);

  const onAdd = useCallback(() => {
    fetchBoxes(); // Refresh screen data after box creation
  }, [fetchBoxes]);

  useFocusEffect(
    useCallback(() => {
      fetchBoxes(); // Refetch boxes on screen focus
    }, [project.id, project.vendor_id])
  );

  const handleProjectDownload = () => {
    projectSheetRef.current?.present();
  };

  const handleConfirmProjectDownload = async () => {
    projectSheetRef.current?.dismiss();
    setShowGlobalLoader(true);
    try {
      if (project) {
        await fetchProjectDetailsAndShare(project);
      }
    } catch (err: any) {
      console.log("Download Error: ", err.message);
    } finally {
      setShowGlobalLoader(false);
    }
  };

  const handleDelete = (box: Box) => {
    setSelectedBoxForDelete(box);
    deleteSheetRef.current?.present();
  };

  const handleDeleteBox = async (box: Box) => {
    try {
      const res = await axios.delete(`/boxes/delete/${box.id}`, {
        data: { deleted_by: user?.id },
      });

      // console.log("✅ Delete response:", res.data);
      fetchBoxes(); // Refresh the list after deletion
    } catch (error) {
      console.error("❌ Failed to delete box:", error);
      showToast("error", "Download failed");
    }
  };

  const handleConfirmDelete = async () => {
    deleteSheetRef.current?.close();
    setShowGlobalLoader(true);
    if (!selectedBoxForDelete) return;
    try {
      await handleDeleteBox(selectedBoxForDelete);
    } catch (error) {
      console.error("❌ Error in handleConfirmDelete:", error);
    } finally {
      setShowGlobalLoader(false);
    }
  };

  const handleEdit = (box: Box) => {
    setSelectedBoxForEdit(box);
    editSheetRef.current?.present();
  };

  const handleConfirmEdit = () => {
    try {
      if (selectedBoxForEdit) {
        editSheetRef.current?.close();
        setTimeout(() => {
          updateSheetRef.current?.present();
        }, 300); // Wait for previous sheet to close
      }
    } catch (error) {}
  };

  const handleDownload = (box: Box) => {
    setSelectedBox(box);
    downloadSheetRef.current?.present();
  };

  const handleConfirmDownload = async () => {
    downloadSheetRef.current?.close();
    setShowGlobalLoader(true);
    try {
      if (selectedBox) {
        await fetchBoxtDetailsAndShare(selectedBox);
      }
    } catch (err: any) {
      console.log("Download Error: ", err.message);
    } finally {
      setShowGlobalLoader(false);
    }
  };

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
      {showGlobalLoader ? (
        <View className="flex-1 justify-center items-center">
          <Loader />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="flex-1 mx-4 py-6">
            {/* Project Card */}
            <ProjectCard
              project={project}
              index={0}
              disableNavigation={true}
              onDownloadPress={handleProjectDownload}
            />

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
      )}

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
        onCancel={() => downloadSheetRef.current?.close()}
        type="download"
      />

      <ConfirmationBottomSheet
        ref={deleteSheetRef}
        title="Delete Box"
        message={`Are you sure you want to delete "${selectedBoxForDelete?.name}"?`}
        cancelLabel="Cancel"
        confirmLabel="Yes, Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => deleteSheetRef.current?.close()}
        type="delete"
      />

      <ConfirmationBottomSheet
        ref={editSheetRef}
        title="Edit Box"
        message={`Are you sure you want to edit "${selectedBoxForEdit?.name}"?`}
        cancelLabel="Cancel"
        confirmLabel="Yes, Edit"
        onConfirm={handleConfirmEdit}
        onCancel={() => editSheetRef.current?.close()}
        type="edit"
      />

      <ConfirmationBottomSheet
        ref={projectSheetRef}
        title="Download Project Report"
        message={`Download project list for "${project?.projectName}"?`}
        confirmLabel="Yes, Download"
        cancelLabel="Cancel"
        onConfirm={handleConfirmProjectDownload}
        onCancel={() => {
          projectSheetRef.current?.dismiss();
        }}
        type="download"
      />

      {selectedBoxForEdit && (
        <UpdateBoxModal
          ref={updateSheetRef}
          setLoading={setShowGlobalLoader}
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

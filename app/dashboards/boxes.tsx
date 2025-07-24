import Loader from "@/components/generic/Loader";
import Navbar from "@/components/generic/Navbar";
import { AddBoxModal } from "@/components/modals/AddBoxModal";
import axios from "@/lib/axios";
import {
  BottomSheetModal,
  TouchableWithoutFeedback,
} from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { ArrowUpRight, Download, Plus } from "lucide-react-native";
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

// Define Project interface
interface Project {
  id: number;
  vendor_id: number;
  project_details_id: number | null; // Add project_details_id
  projectName: string;
  totalNoItems: number;
  unpackedItems: number;
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
function BoxCard({ box, index }: { box: Box; index: number }) {
  const router = useRouter();
  // Animation values
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
    >
      <TouchableWithoutFeedback onPress={handleNavigate}>
        <Animated.View style={[animatedCardStyle, styles.cardContainer]}>
          <View style={styles.cardGradient}>
            <View className="w-full p-5">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-sapLight-text font-montserrat-bold text-xl flex-1">
                  {box.name}
                </Text>
                <View className={`rounded-full px-3 py-1 ${bgClass}`}>
                  <Text
                    className={`font-montserrat-semibold text-xs ${textClass}`}
                  >
                    {status}
                  </Text>
                </View>
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
                  <View className="p-2 bg-sapLight-card rounded-xl">
                    <Download color={"#555555"} size={20} />
                  </View>
                  <TouchableOpacity
                    onPress={handleNavigate}
                    className="p-2 bg-sapLight-card rounded-xl"
                  >
                    <ArrowUpRight color={"#555555"} size={20} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </TouchableOpacity>
  );
}

export default function BoxesScreen() {
  const { project: projectString } = useLocalSearchParams<{ project: string }>();
  const project = useMemo(() => JSON.parse(projectString) as Project, [projectString]);

  const sheetRef = useRef<BottomSheetModal>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingBox, setCreatingBox] = useState<boolean>(false);

  useEffect(() => {
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

    fetchBoxes();
  }, [project.id, project.vendor_id]);

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
      console.log("Added box:", name);
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
      <View className="flex-1 mx-4 py-6">
        {/* Project Card */}
        <Animated.View
          style={[animatedCardStyle, styles.cardContainerr]}
          className="bg-sapLight-card w-full rounded-3xl p-5 border border-gray-100"
        >
          <View className="flex-row justify-between items-center mb-4">
            <View
              className={`rounded-full px-3 py-1 ${
                project.status === "packed" ? "bg-blue-100" : "bg-blue-100"
              }`}
            >
              <Text
                className={`text-sm font-montserrat-semibold ${
                  project.status === "packed"
                    ? "text-blue-700"
                    : "text-blue-700"
                }`}
              >
                {project.status.charAt(0).toUpperCase() +
                  project.status.slice(1)}
              </Text>
            </View>
            <View>
              <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
                {project.date}
              </Text>
            </View>
          </View>
          <View className="w-full flex-row items-center justify-between mb-4">
            <Text className="text-sapLight-text font-montserrat-bold text-xl flex-1">
              {project.projectName}
            </Text>
          </View>
          <View className="flex-row justify KNOWN ISSUE: justify-between items-center">
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
        <View className="flex-1 mt-6 rounded-2xl ">
          <Animated.View style={animatedTitleStyle}>
            <Text className="text-sapLight-text font-montserrat-semibold text-3xl mb-4 pb-2">
              Boxes
            </Text>
          </Animated.View>
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <Loader />
            </View>
          ) : (
            <FlatList
              data={boxes}
              renderItem={({ item, index }) => (
                <BoxCard box={item} index={index} />
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
                    source={require("@/assets/animations/emptyBox.json")} // 👈 Use correct path here
                    autoPlay
                    loop={false}
                    style={styles.lottie}
                  />
                  <Text className="text-sapLight-infoText font-montserrat capitalize">0 Boxes Found </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
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
    marginBottom: 16,
  },
  cardGradient: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  listContainer: {
    flex: 1,
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

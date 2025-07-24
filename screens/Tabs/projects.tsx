import Loader from "@/components/generic/Loader";
import Navbar from "@/components/generic/Navbar";
import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
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

interface ProjectCardProps {
  project: {
    projectName: string;
    totalNoItems: number;
    unpackedItems: number;
    packedItems: number;
    status: string;
    date: string;
  };
  index: number;
}

// Project Card Component
function ProjectCard({ project, index }: ProjectCardProps) {
  const router = useRouter();

  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);

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

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        router.push({
          pathname: "/dashboards/boxes",
          params: { project: JSON.stringify(project) },
        });
      }}
    >
      <Animated.View
        style={[
          animatedCardStyle,
          styles.cardContainer,
          Platform.OS === "ios" ? { marginBottom: 16 } : { marginBottom: 20 },
        ]}
        className="bg-sapLight-card w-full rounded-3xl p-5 border border-gray-100"
      >
        <View className="flex-row justify-between items-center mb-4">
          <View className="rounded-full px-3 py-1 bg-blue-100">
            <Text className="text-sm font-montserrat-semibold text-blue-700">
              {project.status}
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
          <View>
            <ChevronRight size={22} color="#171717" />
          </View>
        </View>

        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-sapLight-text font-montserrat-medium text-sm">
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
              <Text className="text-sapLight-text font-montserrat-semibold text-base">
                {project.packedItems.toLocaleString()}
              </Text>
            </View>

            <View className="items-center flex-col">
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full mr-2 bg-red-400" />
                <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
                  Unpacked
                </Text>
              </View>
              <Text className="text-sapLight-text font-montserrat-semibold text-base">
                {project.unpackedItems.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

export default function ProfileTabScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [projects, setProjects] = useState<ProjectCardProps["project"][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const vendorId = user?.vendor_id;
        if (!vendorId) return;

        const response = await axios.get(`/projects/vendor/${vendorId}`);

        const formatted = response.data.map((proj: any) => ({
          id: proj.id,
          vendor_id: proj.vendor_id,
          project_details_id: proj.details[0]?.id ?? null,
          projectName: proj.project_name,
          totalNoItems: proj.details[0]?.total_items ?? 0,
          unpackedItems: proj.details[0]?.total_unpacked ?? 0,
          packedItems: proj.details[0]?.total_packed ?? 0,
          status: proj.project_status,
          date: proj.details[0]?.estimated_completion_date
            ? new Date(
                proj.details[0].estimated_completion_date
              ).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "N/A",
        }));

        setProjects(formatted);
      } catch (error) {
        console.error("Failed to fetch projects", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user?.vendor_id]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-sapLight-background">
        <Loader />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-sapLight-background">
      <Navbar
        title="Projects"
        showBack={false}
        showSearch={false}
        showNotification={true}
      />
      <FlatList
        data={projects}
        renderItem={({ item, index }) => (
          <ProjectCard project={item} index={index} />
        )}
        keyExtractor={(item, index) => item.projectName + index}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 20,
    paddingTop: 24,
  },
  cardContainer: {
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
});

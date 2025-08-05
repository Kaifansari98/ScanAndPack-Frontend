import { useRouter } from "expo-router";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useToast } from "../Notification/ToastProvider";
import axios from "@/lib/axios";
import { ScanAndPackUrl } from "@/utils/getAssetUrls";
import { useEffect, useRef, useState } from "react";
import {} from "@gorhom/bottom-sheet";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Download } from "lucide-react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { getProjectWeight } from "@/utils/ProjectWeight";
import { weight } from "@/data/generic";

export interface ProjectData {
  id: number;
  vendor_id: number;
  client_id: number;
  projectName: string;
  totalNoItems: number;
  unpackedItems: number;
  packedItems: number;
  status: string;
  date: string;
}

interface ProjectCardProps {
  project: ProjectData;
  index: number;
  disableNavigation?: boolean;
  onDownloadPress: (project: ProjectData) => void;
}

export const ProjectCard = ({
  project,
  index,
  disableNavigation,
  onDownloadPress,
}: ProjectCardProps) => {
  const router = useRouter();
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);
  const [projectWeight, setProjectWeight] = useState<number | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchWeight = async () => {
      const res = await getProjectWeight(project.vendor_id, project.id);
      setProjectWeight(res.project_weight);
    };
    fetchWeight();
  }, [project.vendor_id, project.id]);

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
    <Pressable
      onPress={() => {
        if (!disableNavigation) {
          router.push({
            pathname: "/dashboards/boxes",
            params: {
              id: String(project.id),
              client_id: String(project.client_id),
              vendor_id: String(project.vendor_id),
            },
          });
        }
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
            <Text className="text-sm font-montserrat-semibold text-blue-700 capitalize ">
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

          {project.packedItems !== 0 && (
            <TouchableOpacity
              onPress={() => {
                if (project.packedItems <= 0) {
                  showToast("warning", `This Project isn't started yet`);
                } else {
                  onDownloadPress(project);
                }
              }}
              className="p-2 rounded-lg"
            >
              <Download size={22} color="#555555" />
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row justify-between items-center">
          <View className="flex-row space-x-6 gap-6">
            <View>
              <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
                Items
              </Text>
              <Text className="text-sapLight-text font-montserrat-semibold text-xl">
                {project.totalNoItems.toLocaleString()}
              </Text>
            </View>
            <View>
              <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
                Weight
              </Text>
              <Text className="text-sapLight-text font-montserrat-semibold text-xl">
                {projectWeight} {weight}
              </Text>
            </View>
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
});

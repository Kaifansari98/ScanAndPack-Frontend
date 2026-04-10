import { weight } from "@/data/generic";
import { getProjectWeight } from "@/utils/ProjectWeight";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Download } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
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
import { useToast } from "../Notification/ToastProvider";

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
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      const fetchWeight = async () => {
        const res = await getProjectWeight(project.vendor_id, project.id);
        setProjectWeight(res.project_weight);
      };
      fetchWeight();
    }
  }, [isFocused, project.vendor_id, project.id]);

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
          styles.card,
          Platform.OS === "ios" ? { marginBottom: 16 } : { marginBottom: 20 },
        ]}
      >
        {/* Top row — status + date */}
        <View style={styles.topRow}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{project.status}</Text>
          </View>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>Est. Date</Text>
            <Text style={styles.dateValue}>{project.date}</Text>
          </View>
        </View>

        {/* Project name + download */}
        <View style={styles.nameRow}>
          <Text style={styles.projectName} numberOfLines={2}>
            {project.projectName}
          </Text>
          {project.packedItems !== 0 && (
            <TouchableOpacity
              style={styles.downloadBtn}
              onPress={() => {
                if (project.packedItems <= 0) {
                  showToast("warning", "This Project isn't started yet");
                } else {
                  onDownloadPress(project);
                }
              }}
            >
              <Download size={22} color="#555555" />
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {/* Left — items + weight */}
          <View style={styles.statsLeft}>
            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>Items</Text>
              <Text style={styles.statValue}>
                {project.totalNoItems.toLocaleString()}
              </Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>Weight</Text>
              <Text style={styles.statValue}>
                {projectWeight} {weight}
              </Text>
            </View>
          </View>

          {/* Right — packed + unpacked */}
          <View style={styles.statsRight}>
            <View style={styles.statBlock}>
              <View style={styles.dotRow}>
                <View style={[styles.dot, styles.dotGreen]} />
                <Text style={styles.statLabel}>Packed</Text>
              </View>
              <Text style={styles.statValue}>
                {project.packedItems.toLocaleString()}
              </Text>
            </View>
            <View style={styles.statBlock}>
              <View style={styles.dotRow}>
                <View style={[styles.dot, styles.dotRed]} />
                <Text style={styles.statLabel}>Unpacked</Text>
              </View>
              <Text style={styles.statValue}>
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
  card: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },

  // Top row
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1D4ED8",
    textTransform: "capitalize",
  },
  dateBlock: {
    alignItems: "flex-start",
  },
  dateLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  dateValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },

  // Name row
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  projectName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  downloadBtn: {
    padding: 8,
    borderRadius: 10,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsLeft: {
    flexDirection: "row",
    gap: 24,
  },
  statsRight: {
    flexDirection: "row",
    gap: 16,
  },
  statBlock: {
    gap: 2,
  },
  statLabel: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  dotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: {
    backgroundColor: "#4ADE80",
  },
  dotRed: {
    backgroundColor: "#F87171",
  },
});
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
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
  lead_id: number;
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
  const cardTranslateY = useSharedValue(20);
  const { showToast } = useToast();
  const isFocused = useIsFocused();

  useEffect(() => {
    cardOpacity.value = withDelay(
      index * 100,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
    cardTranslateY.value = withDelay(
      index * 100,
      withSpring(0, { damping: 18, stiffness: 130 })
    );
  }, [index]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  // Progress percentage
  const pct = project.totalNoItems > 0
    ? Math.round((project.packedItems / project.totalNoItems) * 100)
    : 0;

  const isCompleted = pct === 100;

  return (
    <Pressable
      onPress={() => {
        if (!disableNavigation) {
          router.push({
            pathname: "/dashboards/boxes",
            params: {
              id: String(project.id),
              lead_id: String(project.lead_id),
              vendor_id: String(project.vendor_id),
            },
          });
        }
      }}
    >
      <Animated.View style={[animatedCardStyle, styles.card, Platform.OS === "ios" ? { marginBottom: 16 } : { marginBottom: 20 }]}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.statusPill, isCompleted && styles.statusPillDone]}>
              <View style={[styles.statusDot, isCompleted && styles.statusDotDone]} />
              <Text style={[styles.statusText, isCompleted && styles.statusTextDone]}>
                {project.status}
              </Text>
            </View>
            <Text style={styles.projectName}>
              {project.projectName}
            </Text>
          </View>

          {/* {project.packedItems > 0 && (
            <TouchableOpacity
              style={styles.downloadBtn}
              onPress={() => onDownloadPress(project)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Download size={18} color="#6B7280" />
            </TouchableOpacity>
          )} */}
        </View>

        {/* ── Progress bar ── */}
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>Packing progress</Text>
            <Text style={[styles.progressPct, isCompleted && { color: "#2A9D8F" }]}>
              {pct}%
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[
              styles.progressFill,
              { width: `${pct}%` as any },
              isCompleted && styles.progressFillDone,
            ]} />
          </View>
        </View>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statChipLabel}>Total</Text>
            <Text style={styles.statChipValue}>{project.totalNoItems.toLocaleString()}</Text>
          </View>

          <View style={[styles.statChip, styles.statChipPacked]}>
            <Text style={[styles.statChipLabel, { color: "#1A7A70" }]}>Packed</Text>
            <Text style={[styles.statChipValue, { color: "#1A7A70" }]}>
              {project.packedItems.toLocaleString()}
            </Text>
          </View>

          <View style={[styles.statChip, styles.statChipUnpacked]}>
            <Text style={[styles.statChipLabel, { color: "#C15C0A" }]}>Unpacked</Text>
            <Text style={[styles.statChipValue, { color: "#C15C0A" }]}>
              {project.unpackedItems.toLocaleString()}
            </Text>
          </View>

          {/* <View style={styles.dateChip}>
            <Text style={styles.dateChipLabel}>Est.</Text>
            <Text style={styles.dateChipValue}>{project.date}</Text>
          </View> */}
        </View>

      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  headerLeft: { flex: 1, gap: 6 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "#DBEAFE",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusPillDone: { backgroundColor: "#E6F7F5" },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#3B82F6" },
  statusDotDone: { backgroundColor: "#2A9D8F" },
  statusText: { fontSize: 11, fontWeight: "700", color: "#1D4ED8", textTransform: "capitalize" },
  statusTextDone: { color: "#1A7A70" },
  projectName: { fontSize: 14, fontWeight: "700", color: "#111827", lineHeight: 19 },
  downloadBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center", alignItems: "center",
    marginTop: 2,
  },

  // Progress
  progressSection: { gap: 6 },
  progressLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: "500" },
  progressPct: { fontSize: 12, fontWeight: "800", color: "#2A9D8F" },
  progressTrack: {
    height: 6, backgroundColor: "#F3F4F6", borderRadius: 99, overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2A9D8F",
    borderRadius: 99,
  },
  progressFillDone: { backgroundColor: "#2A9D8F" },

  // Stats
  statsRow: { flexDirection: "row", gap: 8 },
  statChip: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 2,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  statChipPacked: { backgroundColor: "#E6F7F5", borderColor: "#B2E8E4" },
  statChipUnpacked: { backgroundColor: "#FFF8EE", borderColor: "#FDDCB0" },
  statChipLabel: { fontSize: 10, color: "#9CA3AF", fontWeight: "600" },
  statChipValue: { fontSize: 16, fontWeight: "800", color: "#111827" },
  dateChip: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 2,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    justifyContent: "center",
  },
  dateChipLabel: { fontSize: 10, color: "#9CA3AF", fontWeight: "600" },
  dateChipValue: { fontSize: 12, fontWeight: "700", color: "#374151" },
});
import { colors } from "@/components/theme/colors";
import { ChevronRight, Clock, FolderCheck } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface QualityProject {
  id: number;
  project_name: string;
  project_status: string;
  track_trace_status: string;
  created_at: string;
  pending_count: number;
  qualityMachineId: number;
  qualityMachineName: string;
}

export interface QualityProjectCardProps {
  item: QualityProject;
  onPress: (item: QualityProject) => void;
}

export function getProjectStatusBadge(item: QualityProject) {
  const statusStr = (
    item.track_trace_status ||
    item.project_status ||
    ""
  ).trim();

  if (statusStr.toLowerCase() === "completed") {
    return {
      label: "Completed",
      bg: "#ECFDF5",
      color: "#047857",
      accent: "#10B981",
      border: "#A7F3D0",
    };
  }

  if (statusStr.toLowerCase() === "started") {
    return {
      label: "Started",
      bg: "#FEF3C7",
      color: "#B45309",
      accent: "#D97706",
      border: "#FDE68A",
    };
  }

  return {
    label: statusStr || "Not Started",
    bg: "#F1F5F9",
    color: "#475569",
    accent: "#64748B",
    border: "#E2E8F0",
  };
}

export function QualityProjectCard({ item, onPress }: QualityProjectCardProps) {
  const statusInfo = getProjectStatusBadge(item);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => onPress(item)}
    >
      {/* Top Header Row */}
      <View style={styles.cardTopRow}>
        <View
          style={[
            styles.cardIconWrap,
            { backgroundColor: statusInfo.bg, borderColor: statusInfo.border },
          ]}
        >
          <FolderCheck size={18} color={statusInfo.accent} />
        </View>

        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.project_name}
          </Text>
          {item.qualityMachineName ? (
            <Text style={styles.cardSubTitle} numberOfLines={1}>
              Machine: {item.qualityMachineName}
            </Text>
          ) : (
            <Text style={styles.cardSubTitle} numberOfLines={1}>
              Quality Inspection
            </Text>
          )}
        </View>

        {/* Action Button - Top Right Aligned */}
        <View style={styles.arrowCircle}>
          <ChevronRight size={15} color="#64748B" />
        </View>
      </View>

      {/* Bottom Footer Row */}
      <View style={styles.cardBottomRow}>
        {/* Pending Items Badge */}
        <View style={styles.statChip}>
          <Clock size={12} color="#D97706" />
          <Text style={styles.statChipText}>
            {item.pending_count} pending item{item.pending_count === 1 ? "" : "s"}
          </Text>
        </View>

        {/* Status Badge Pill - Bottom Right Aligned */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusInfo.bg, borderColor: statusInfo.border },
          ]}
        >
          <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitleBlock: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardSubTitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
});

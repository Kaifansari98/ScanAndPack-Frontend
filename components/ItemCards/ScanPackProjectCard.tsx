import { router } from "expo-router";
import {
  Boxes,
  CheckCircle2,
  ChevronRight,
  Clock,
  LogIn,
  LogOut,
  MapPin,
  PackageCheck,
  ScanLine,
} from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface FormattedProject {
  id: number;
  vendor_id: number;
  projectName: string;
  totalNoItems: number;
  unpackedItems: number;
  packedItems: number;
  status: string;
  track_trace_status?: string;
  date: string;
  completionPercentage: number;
  factory_out_at: string | null;
  site_in_at: string | null;
  all_factory_out: boolean;
  any_factory_out: boolean;
}

export interface ScanPackProjectCardProps {
  item: FormattedProject;
  onScanPress: () => void;
  onDownloadPress: () => void;
}

export function getScanMode(p: FormattedProject): "OUT" | "IN" | "BOTH" | null {
  if (!p.any_factory_out) return "OUT";
  if (p.all_factory_out && p.site_in_at === null) return "IN";
  if (!p.all_factory_out && p.site_in_at === null) return "BOTH";
  return null;
}

export function getProjectStatusBadge(p: FormattedProject) {
  const statusStr = (p.track_trace_status || p.status || "").trim();

  if (
    p.completionPercentage === 100 ||
    statusStr.toLowerCase() === "completed"
  ) {
    return {
      label: "Completed",
      bg: "#ECFDF5",
      color: "#047857",
      barColor: "#10B981",
      border: "#A7F3D0",
    };
  }

  if (p.completionPercentage > 0 || statusStr.toLowerCase() === "started") {
    return {
      label: "Started",
      bg: "#FEF3C7",
      color: "#B45309",
      barColor: "#D97706",
      border: "#FDE68A",
    };
  }

  return {
    label: "Not Started",
    bg: "#F1F5F9",
    color: "#475569",
    barColor: "#64748B",
    border: "#E2E8F0",
  };
}

export function ScanPackProjectCard({
  item,
  onScanPress,
  onDownloadPress,
}: ScanPackProjectCardProps) {
  const statusInfo = getProjectStatusBadge(item);
  const pct = item.completionPercentage;
  const scanMode = getScanMode(item);

  const primaryAction = scanMode
    ? scanMode === "OUT"
      ? {
          label: "Factory Out",
          color: "#FFFFFF",
          bg: "#4B3A34",
          border: "#3B2D28",
          Icon: LogOut,
        }
      : scanMode === "IN"
        ? {
            label: "Site In",
            color: "#FFFFFF",
            bg: "#059669",
            border: "#047857",
            Icon: LogIn,
          }
        : {
            label: "Scan Box",
            color: "#FFFFFF",
            bg: "#2563EB",
            border: "#1D4ED8",
            Icon: ScanLine,
          }
    : null;

  const hasSiteItems = item.site_in_at !== null;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() =>
        router.push({
          pathname: "/dashboards/boxes",
          params: { id: String(item.id), vendor_id: String(item.vendor_id) },
        })
      }
    >
      {/* Top Header Row */}
      <View style={styles.cardTopRow}>
        <View
          style={[
            styles.cardIconWrap,
            { backgroundColor: statusInfo.bg, borderColor: statusInfo.border },
          ]}
        >
          <PackageCheck size={18} color={statusInfo.barColor} />
        </View>

        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle}>
            {item.projectName}
          </Text>
        </View>

        {/* Chevron Circle Action */}
        <View style={styles.arrowCircle}>
          <ChevronRight size={15} color="#64748B" />
        </View>
      </View>

      {/* Progress Bar Row */}
      <View style={styles.progressRow}>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${pct}%` as any, backgroundColor: statusInfo.barColor },
            ]}
          />
        </View>
        <Text style={[styles.pctText, { color: statusInfo.barColor }]}>
          {pct}%
        </Text>
      </View>

      {/* ── 3 Equal Stat Boxes (Total, Packed, Pending) ── */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <View style={styles.statBoxLabelRow}>
            <Boxes size={11} color="#64748B" />
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <Text style={styles.statValueTotal}>{item.totalNoItems}</Text>
        </View>

        <View style={styles.statBox}>
          <View style={styles.statBoxLabelRow}>
            <CheckCircle2 size={11} color="#059669" />
            <Text style={styles.statLabel}>Packed</Text>
          </View>
          <Text style={styles.statValuePacked}>{item.packedItems}</Text>
        </View>

        <View style={styles.statBox}>
          <View style={styles.statBoxLabelRow}>
            <Clock size={11} color="#D97706" />
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <Text style={styles.statValuePending}>{item.unpackedItems}</Text>
        </View>
      </View>

      {/* Bottom Footer & Action Row */}
      <View style={styles.cardBottomRow}>
        {/* Action Buttons - Left Side */}
        <View style={styles.actionRow}>
          {primaryAction && (
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: primaryAction.bg,
                  borderColor: primaryAction.border,
                },
              ]}
              onPress={(e) => {
                e.stopPropagation?.();
                onScanPress();
              }}
              activeOpacity={0.82}
            >
              <primaryAction.Icon size={14} color={primaryAction.color} />
              <Text
                style={[styles.primaryBtnText, { color: primaryAction.color }]}
              >
                {primaryAction.label}
              </Text>
            </TouchableOpacity>
          )}

          {hasSiteItems && (
            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                router.push({
                  pathname: "/boxSiteInScreen",
                  params: {
                    project_id: String(item.id),
                    vendor_id: String(item.vendor_id),
                    project_name: item.projectName,
                  },
                });
              }}
              activeOpacity={0.82}
            >
              <MapPin size={13} color="#FFFFFF" />
              <Text style={styles.verifyBtnText}>Site Verify</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status Badge Pill - Right Side */}
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
    gap: 12,
  },
  cardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
    marginTop: 1,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  pctText: {
    fontSize: 12,
    fontWeight: "800",
    minWidth: 34,
    textAlign: "right",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 10,
    gap: 4,
  },
  statBoxLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  statValueTotal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  statValuePacked: {
    fontSize: 16,
    fontWeight: "800",
    color: "#059669",
  },
  statValuePending: {
    fontSize: 16,
    fontWeight: "800",
    color: "#D97706",
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingTop: 2,
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
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#4F46E5",
    borderWidth: 1,
    borderColor: "#4338CA",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  verifyBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  iconActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  primaryBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});

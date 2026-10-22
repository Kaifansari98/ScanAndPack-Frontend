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

export interface LocationSiteStatus {
  location_name: string;
  total_boxes: number;
  factory_out_boxes: number;
  site_in_boxes: number;
  all_factory_out: boolean;
  all_site_in: boolean;
  any_site_in: boolean;
}

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
  all_site_in?: boolean;
  any_site_in?: boolean;
  is_multi_location?: boolean;
  has_site_items?: boolean;
  locations?: LocationSiteStatus[];
}

export interface ScanPackProjectCardProps {
  item: FormattedProject;
  onScanPress: () => void;
  onDownloadPress: () => void;
  onVerifyPress?: (item: FormattedProject) => void;
}

export function getScanMode(p: FormattedProject): "OUT" | "IN" | "BOTH" | null {
  if (!p.any_factory_out) return "OUT";
  const isFullySitedIn = p.all_site_in ?? (p.site_in_at !== null);
  if (p.all_factory_out && !isFullySitedIn) return "IN";
  if (!p.all_factory_out && !isFullySitedIn) return "BOTH";
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
  onVerifyPress,
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

  const readyLocations = (item.locations || [])
    .filter((loc) => loc.all_site_in || loc.site_in_boxes > 0)
    .map((loc) => loc.location_name);

  const hasSiteItems = Boolean(
    item.has_site_items ||
      readyLocations.length > 0 ||
      item.any_site_in ||
      item.site_in_at !== null
  );

  const verifyBtnLabel =
    item.is_multi_location && readyLocations.length === 1
      ? `Site Verify (${readyLocations[0]})`
      : "Site Verify";

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

          {item.is_multi_location && item.locations && item.locations.length > 0 && (
            <View style={styles.locationBadgesRow}>
              {item.locations.map((loc) => {
                const isAllIn = loc.all_site_in;
                const hasSome = loc.site_in_boxes > 0;
                return (
                  <View
                    key={loc.location_name}
                    style={[
                      styles.locPill,
                      isAllIn
                        ? styles.locPillSuccess
                        : hasSome
                          ? styles.locPillWarning
                          : styles.locPillNeutral,
                    ]}
                  >
                    <MapPin
                      size={9}
                      color={
                        isAllIn
                          ? "#047857"
                          : hasSome
                            ? "#B45309"
                            : "#64748B"
                      }
                    />
                    <Text
                      style={[
                        styles.locPillText,
                        {
                          color: isAllIn
                            ? "#047857"
                            : hasSome
                              ? "#B45309"
                              : "#64748B",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {loc.location_name}
                      {isAllIn
                        ? " • At Site"
                        : hasSome
                          ? ` • ${loc.site_in_boxes}/${loc.total_boxes}`
                          : " • In Transit"}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
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
                if (onVerifyPress) {
                  onVerifyPress(item);
                } else {
                  router.push({
                    pathname: "/boxSiteInScreen",
                    params: {
                      project_id: String(item.id),
                      vendor_id: String(item.vendor_id),
                      project_name: item.projectName,
                      ...(readyLocations.length === 1
                        ? { location_name: readyLocations[0] }
                        : {}),
                    },
                  });
                }
              }}
              activeOpacity={0.82}
            >
              <MapPin size={13} color="#FFFFFF" />
              <Text style={styles.verifyBtnText}>{verifyBtnLabel}</Text>
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
  locationBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 4,
  },
  locPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  locPillSuccess: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  locPillWarning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  locPillNeutral: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  locPillText: {
    fontSize: 10,
    fontWeight: "600",
  },
});

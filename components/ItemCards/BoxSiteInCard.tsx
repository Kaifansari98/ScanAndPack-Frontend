import {
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  PackageCheck,
  ScanLine,
} from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface BoxSiteInItem {
  id: number;
  box_name: string;
  box_status: string;

  site_in_at: string | null;
  factory_out_at: string | null;

  total_items: number;
  received_items: number;
  pending_items: number;

  scanned_total_items: number;
  scanned_received_items: number;
  scanned_pending_items: number;

  manual_total_items: number;
  manual_received_items: number;
  manual_pending_items: number;

  has_manual_items: boolean;
  manual_complete: boolean;
}

interface BoxSiteInCardProps {
  item: BoxSiteInItem;
  onScanItems: (item: BoxSiteInItem) => void;
  onVerifyManualItems: (item: BoxSiteInItem) => void;
}

export function BoxSiteInCard({
  item,
  onScanItems,
  onVerifyManualItems,
}: BoxSiteInCardProps) {
  const allReceived = item.total_items > 0 && item.received_items >= item.total_items;
  const pct = item.total_items > 0
    ? Math.round((item.received_items / item.total_items) * 100)
    : 0;

  const hasManual = item.manual_total_items > 0;
  const manualDone = hasManual && item.manual_pending_items === 0;

  // Show Scan Items button whenever there are pending items to be scanned
  const hasScannedPending =
    !allReceived &&
    (item.scanned_pending_items > 0 ||
      (item.pending_items > 0 && (!hasManual || item.manual_pending_items < item.pending_items)));

  return (
    <View style={styles.card}>
      {/* ── Top Header Row ── */}
      <View style={styles.cardTopRow}>
        <View
          style={[
            styles.cardIconWrap,
            {
              backgroundColor: allReceived ? "#ECFDF5" : "#EEF2FF",
              borderColor: allReceived ? "#A7F3D0" : "#C7D2FE",
            },
          ]}
        >
          <PackageCheck
            size={18}
            color={allReceived ? "#10B981" : "#6366F1"}
          />
        </View>

        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle}>
            {item.box_name}
          </Text>
          <Text style={styles.cardSubTitle} numberOfLines={1}>
            {allReceived ? "Fully Verified at Site" : "Site Verification Pending"}
          </Text>
        </View>

        {/* Status Badge Pill */}
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: allReceived ? "#ECFDF5" : "#FEF3C7",
              borderColor: allReceived ? "#A7F3D0" : "#FDE68A",
            },
          ]}
        >
          {allReceived && <CheckCircle2 size={11} color="#047857" />}
          <Text
            style={[
              styles.statusText,
              { color: allReceived ? "#047857" : "#B45309" },
            ]}
          >
            {allReceived ? "Complete" : "Pending"}
          </Text>
        </View>
      </View>

      {/* ── Progress Bar ── */}
      <View style={styles.progressRow}>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.min(100, pct)}%` as any,
                backgroundColor: allReceived ? "#10B981" : "#D97706",
              },
            ]}
          />
        </View>
        <Text
          style={[
            styles.pctText,
            { color: allReceived ? "#10B981" : "#D97706" },
          ]}
        >
          {pct}%
        </Text>
      </View>

      {/* ── 3 Equal Stat Chips (Total, Received, Pending) ── */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <View style={styles.statBoxLabelRow}>
            <Boxes size={11} color="#64748B" />
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <Text style={styles.statValueTotal}>{item.total_items}</Text>
        </View>

        <View style={[styles.statBox, styles.statBoxReceived]}>
          <View style={styles.statBoxLabelRow}>
            <CheckCircle2 size={11} color="#059669" />
            <Text style={[styles.statLabel, { color: "#047857" }]}>Received</Text>
          </View>
          <Text style={styles.statValueReceived}>{item.received_items}</Text>
        </View>

        <View style={[styles.statBox, styles.statBoxPending]}>
          <View style={styles.statBoxLabelRow}>
            <Clock size={11} color="#D97706" />
            <Text style={[styles.statLabel, { color: "#B45309" }]}>Pending</Text>
          </View>
          <Text style={styles.statValuePending}>{item.pending_items}</Text>
        </View>
      </View>

      {/* ── Single Bottom Row: Breakdown Badges (Left) & Actions (Right) ── */}
      <View style={styles.cardBottomRow}>
        {/* Left Side: Counts & Status Badges */}
        <View style={styles.bottomLeftRow}>
          {item.scanned_total_items > 0 && (
            <View style={styles.breakdownChipScanned}>
              <ScanLine size={11} color="#4F46E5" />
              <Text style={styles.breakdownTextScanned}>
                Scan: {item.scanned_received_items}/{item.scanned_total_items}
              </Text>
            </View>
          )}

          {hasManual && (
            <View
              style={[
                styles.breakdownChipManual,
                {
                  backgroundColor: manualDone ? "#ECFDF5" : "#F5F3FF",
                  borderColor: manualDone ? "#A7F3D0" : "#DDD6FE",
                },
              ]}
            >
              <ClipboardCheck
                size={11}
                color={manualDone ? "#059669" : "#7C3AED"}
              />
              <Text
                style={[
                  styles.breakdownTextManual,
                  { color: manualDone ? "#047857" : "#7C3AED" },
                ]}
              >
                Manual: {item.manual_received_items}/{item.manual_total_items}
              </Text>
            </View>
          )}

          {!hasScannedPending && !hasManual && allReceived && (
            <View style={styles.completedBadge}>
              <CheckCircle2 size={12} color="#059669" />
              <Text style={styles.completedBadgeText}>All Received</Text>
            </View>
          )}
        </View>

        {/* Right Side: Action Buttons (Verify Manual / Scan Items) */}
        <View style={styles.bottomRightRow}>
          {hasManual && !manualDone && (
            <TouchableOpacity
              style={styles.manualBtn}
              onPress={() => onVerifyManualItems(item)}
              activeOpacity={0.82}
            >
              <ClipboardCheck size={12} color="#7C3AED" />
              <Text style={styles.manualBtnText}>Manual</Text>
            </TouchableOpacity>
          )}

          {hasScannedPending && (
            <TouchableOpacity
              style={styles.scanBtn}
              onPress={() => onScanItems(item)}
              activeOpacity={0.82}
            >
              <ScanLine size={13} color="#FFFFFF" />
              <Text style={styles.scanBtnText}>Scan Items</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
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
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
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
  statBoxReceived: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  statBoxPending: {
    backgroundColor: "#FFF8EE",
    borderColor: "#FDE68A",
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
  statValueReceived: {
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
    paddingTop: 4,
  },
  bottomLeftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    flex: 1,
  },
  bottomRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  breakdownChipScanned: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  breakdownTextScanned: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4338CA",
  },
  breakdownChipManual: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  breakdownTextManual: {
    fontSize: 11,
    fontWeight: "700",
  },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#2563EB",
    borderWidth: 1,
    borderColor: "#1D4ED8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scanBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  manualBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  manualBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7C3AED",
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#047857",
  },
});

export default BoxSiteInCard;

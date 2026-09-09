import { CheckCircle2, Clock3, Cpu, Layers3 } from "lucide-react-native";
import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

export interface MachineSummary {
  machine_id: number;
  machine_name: string;
  machine_code: string;
  scan_type: string;
  sequence_no: number;
  is_optional: boolean;
  total_quantity: number;
  scanned_quantity: number;
  status: "scanned" | "pending";
  scanned_at: string | null;
  last_scanned_at: string | null;
}
export interface ProjectItemTrackingRow {
  id: number;
  item_name: string;
  description: string;
  unique_code: string | null;
  unique_code_2: string | null;
  qty: number;
  length: number | null;
  width: number | null;
  thickness: number | null;
  material_details: string;
  category_name: string | null;
  group_name: string | null;
  procurement: string | null;
  weight: number;
  item_status: string;
  scan_status: "scanned" | "pending";
  assigned_machines_count: number;
  scanned_machines_count: number;
  machines: MachineSummary[];
}

export interface ItemTrackingCardProps {
  item: ProjectItemTrackingRow;
}

const formatNumber = (value: number): string =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);

const formatDateTime = (value: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getDimensions = (item: ProjectItemTrackingRow): string | null => {
  const values = [item.length, item.width, item.thickness];
  if (values.every((v) => v === null)) return null;
  return values.map((v) => (v === null ? "–" : formatNumber(v))).join(" × ");
};

export const ItemTrackingCard = memo(({ item }: ItemTrackingCardProps) => {
  const isFullyScanned = item.scan_status === "scanned";
  const dimensions = getDimensions(item);
  const totalMachines = item.assigned_machines_count || item.machines?.length || 0;
  const scannedMachines = item.scanned_machines_count || 0;
  const progressPct = totalMachines > 0 ? Math.round((scannedMachines / totalMachines) * 100) : 0;

  return (
    <View style={styles.card}>
      {/* ── Top Row: Icon + Title + Status Pill ── */}
      <View style={styles.cardTopRow}>
        <View
          style={[
            styles.iconTile,
            {
              backgroundColor: isFullyScanned ? "#ECFDF5" : "#FEF3C7",
              borderColor: isFullyScanned ? "#A7F3D0" : "#FDE68A",
            },
          ]}
        >
          <Cpu
            size={18}
            color={isFullyScanned ? "#059669" : "#D97706"}
          />
        </View>

        <View style={styles.titleColumn}>
          <Text style={styles.itemName}>{item.item_name}</Text>
          {(item.unique_code || item.unique_code_2) && (
            <Text style={styles.itemCode}>
              {[item.unique_code, item.unique_code_2].filter(Boolean).join(" · ")}
            </Text>
          )}
        </View>

        {/* Top-Right Status Badge Pill */}
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: isFullyScanned ? "#ECFDF5" : "#FEF3C7",
              borderColor: isFullyScanned ? "#A7F3D0" : "#FDE68A",
            },
          ]}
        >
          {isFullyScanned ? (
            <CheckCircle2 size={12} color="#047857" />
          ) : (
            <Clock3 size={12} color="#B45309" />
          )}
          <Text
            style={[
              styles.statusText,
              { color: isFullyScanned ? "#047857" : "#B45309" },
            ]}
          >
            {isFullyScanned ? "Scanned" : "Pending"}
          </Text>
        </View>
      </View>

      {/* ── Metadata Stat Chips ── */}
      <View style={styles.chipRow}>
        <View style={styles.chip}>
          <Text style={styles.chipLabel}>Qty</Text>
          <Text style={styles.chipValue}>{item.qty}</Text>
        </View>

        {dimensions && (
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>L×W×T</Text>
            <Text style={styles.chipValue}>{dimensions}</Text>
          </View>
        )}

        {item.category_name && (
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Category</Text>
            <Text style={styles.chipValue}>{item.category_name}</Text>
          </View>
        )}

        {item.material_details && (
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Material</Text>
            <Text style={styles.chipValue}>{item.material_details}</Text>
          </View>
        )}
      </View>

      {/* ── Machine Progress Bar ── */}
      {totalMachines > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>Machine Scan Progress</Text>
            <Text
              style={[
                styles.progressPct,
                { color: isFullyScanned ? "#059669" : "#4F46E5" },
              ]}
            >
              {scannedMachines} / {totalMachines} Machines ({progressPct}%)
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPct}%` as any,
                  backgroundColor: isFullyScanned ? "#10B981" : "#4F46E5",
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* ── Machine Steps List ── */}
      {item.machines && item.machines.length > 0 && (
        <View style={styles.machinesSection}>
          {item.machines.map((m, idx) => {
            const mScanned = m.status === "scanned";
            return (
              <View key={m.machine_id || idx} style={styles.machineRow}>
                <View
                  style={[
                    styles.stepBadge,
                    {
                      backgroundColor: mScanned ? "#ECFDF5" : "#F1F5F9",
                      borderColor: mScanned ? "#A7F3D0" : "#CBD5E1",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.stepText,
                      { color: mScanned ? "#047857" : "#64748B" },
                    ]}
                  >
                    STEP {idx + 1}
                  </Text>
                </View>

                <View style={styles.machineMain}>
                  <Text style={styles.machineName}>{m.machine_name}</Text>
                  <Text style={styles.machineCode}>
                    {m.machine_code} {m.scan_type ? `· ${m.scan_type}` : ""}
                  </Text>
                  {mScanned && m.scanned_at && (
                    <Text style={styles.scannedTime}>
                      Scanned on {formatDateTime(m.scanned_at)}
                    </Text>
                  )}
                </View>

                <View
                  style={[
                    styles.machinePill,
                    {
                      backgroundColor: mScanned ? "#ECFDF5" : "#FFF8EE",
                      borderColor: mScanned ? "#A7F3D0" : "#FDE68A",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.machinePillText,
                      { color: mScanned ? "#047857" : "#B45309" },
                    ]}
                  >
                    {mScanned ? "Done" : "Pending"}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
});

ItemTrackingCard.displayName = "ItemTrackingCard";

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
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleColumn: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  itemCode: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  chipValue: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  progressSection: {
    gap: 4,
    paddingTop: 2,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  progressPct: {
    fontSize: 11,
    fontWeight: "700",
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  machinesSection: {
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  machineRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 8,
    gap: 10,
  },
  stepBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  stepText: {
    fontSize: 9,
    fontWeight: "800",
  },
  machineMain: {
    flex: 1,
    gap: 1,
  },
  machineName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  machineCode: {
    fontSize: 10,
    color: "#64748B",
  },
  scannedTime: {
    fontSize: 10,
    color: "#059669",
    fontWeight: "600",
  },
  machinePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  machinePillText: {
    fontSize: 10,
    fontWeight: "700",
  },
});

/**
 * MachineTabScreen — Select a machine before scanning.
 */
import Loader from "@/components/generic/Loader";
import Navbar from "@/components/generic/Navbar";
import { MachineCard } from "@/components/ItemCards/MachineCard";
import { colors } from "@/components/theme/colors";
import { commonStyles } from "@/components/theme/commonStyles";
import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
import { useFocusEffect, useRouter } from "expo-router";
import { AlertTriangle, Cpu, ScanLine } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

interface Machine {
  id: number;
  machine_name: string;
  machine_code: string;
  machine_type: string;
  image_path: string;
  pending_count: number;
}

export default function MachineTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.auth.user);

  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  const flatListRef = useRef<FlatList<Machine>>(null);

  const bottomInset = insets.bottom > 0 ? insets.bottom + 6 : Platform.OS === "ios" ? 14 : 10;

  // ─── Fetch ──────────────────────────────────────────────
  const fetchMachines = async () => {
    const vendorId = user?.vendor_id;
    const userId = user?.id;
    if (!vendorId) return;

    setLoading(true);
    try {
      const response = await axios.get(`/track-trace/machines/${vendorId}/${userId}`);
      const raw = response.data.data;
      if (!Array.isArray(raw)) return;

      setMachines(
        raw.map((mac: any) => ({
          id: mac.id,
          machine_name: mac.machine_name,
          machine_code: mac.machine_code,
          machine_type: mac.machine_type,
          image_path: mac.image_path,
          pending_count: mac.pending_count ?? 0,
        }))
      );
    } catch (error) {
      //console.warn("Failed to fetch machines:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMachines();
    }, [user?.vendor_id])
  );

  // ─── Loading ─────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loaderCenter}>
        <Loader />
      </View>
    );
  }

  // ─── UI ──────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* ── Navbar ── */}
      <Navbar
        title="Select Machine"
        subtitle="Choose before scanning"
        showBack={true}
      />

      {/* ── Body ── */}
      <FlatList
        ref={flatListRef}
        data={machines}
        keyExtractor={(item, index) => `${item.machine_name}-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index,
              animated: true,
              viewPosition: 0.3,
            });
          }, 300);
        }}
        // Warning banner above the list
        ListHeaderComponent={
          <View style={styles.warningBanner}>
            <AlertTriangle size={18} color="#B45309" />
            <Text style={styles.warningText}>
              You must select a machine before scanning
            </Text>
          </View>
        }
        // Clean empty state
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Cpu size={28} color="#4B3A34" />
            </View>
            <Text style={styles.emptyTitle}>No Machines Assigned</Text>
            <Text style={styles.emptySubtext}>Contact your supervisor for machine access</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={{ position: "relative" }}>
            <MachineCard
              machine={item}
              index={index}
              selected={selectedMachine?.id === item.id}
              onSelect={(m: Machine) =>
                setSelectedMachine((prev) => (prev?.id === m.id ? null : m))
              }
              onNavigate={(m: Machine) => {
                setSelectedMachine(m);
                router.push({
                  pathname: "/scanner-track-trace",
                  params: { machine_id: String(m.id), machine_name: m.machine_name },
                });
              }}
            />
            {item.pending_count > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{item.pending_count}</Text>
                <Text style={styles.pendingBadgeLabel}>pending</Text>
              </View>
            )}
            {item.pending_count === 0 && (
              <View style={[styles.pendingBadge, styles.pendingBadgeDone]}>
                <Text style={styles.pendingBadgeText}>✓</Text>
                <Text style={styles.pendingBadgeLabel}>clear</Text>
              </View>
            )}
          </View>
        )}
      />

      {/* ── Sticky Proceed to Scanner CTA Button ── */}
      <View style={[styles.ctaContainer, { paddingBottom: bottomInset }]}>
        <TouchableOpacity
          style={[styles.scanBtn, !selectedMachine && styles.buttonDisabled]}
          onPress={() =>
            selectedMachine &&
            router.push({
              pathname: "/scanner-track-trace",
              params: {
                machine_id: String(selectedMachine.id),
                machine_name: selectedMachine.machine_name,
              },
            })
          }
          activeOpacity={selectedMachine ? 0.85 : 1}
          disabled={!selectedMachine}
        >
          <ScanLine size={18} color="#FFFFFF" />
          <Text style={styles.scanBtnText}>Proceed to Scanner</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loaderCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 10,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#B45309",
  },
  emptyState: {
    marginTop: 60,
    alignItems: "center",
    gap: 8,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#F7F5F4",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
  },
  emptySubtext: {
    color: "#64748B",
    fontSize: 13,
  },
  ctaContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: "#F8FAFC",
  },
  scanBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#4B3A34",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  scanBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  pendingBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#DC2626",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignItems: "center",
    minWidth: 46,
  },
  pendingBadgeDone: {
    backgroundColor: "#059669",
  },
  pendingBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 15,
  },
  pendingBadgeLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
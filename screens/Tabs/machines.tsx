/**
 * MachineTabScreen — Select a machine before scanning.
 * Matches FactoryOS design: dark navbar, warning banner, machine list, CTA button.
 */
import Loader from "@/components/generic/Loader";
import { MachineCard } from "@/components/ItemCards/MachineCard";
import { colors } from "@/components/theme/colors";
import { commonStyles } from "@/components/theme/commonStyles";
import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
import { useFocusEffect, useRouter } from "expo-router";
import { AlertTriangle, ArrowLeft } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSelector } from "react-redux";

interface Machine {
  id: number;
  machine_name: string;
  machine_code: string;
  machine_type: string;
  image_path: string;
}

export default function MachineTabScreen() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);

  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  const flatListRef = useRef<FlatList<Machine>>(null);
  // Track whether we've fetched at least once — skip re-fetch on back press
  const hasFetched = useRef(false);

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
        }))
      );
      hasFetched.current = true;
    } catch (error) {
      console.warn("Failed to fetch machines:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!hasFetched.current) {
        // First visit — fetch fresh data
        fetchMachines();
      } else {
        // Returning from scanner — skip fetch, just scroll to selected
        scrollToSelected();
      }
    }, [user?.vendor_id])
  );

  // ─── Scroll to selected machine ──────────────────────────
  const scrollToSelected = () => {
    if (!selectedMachine || machines.length === 0) return;
    const index = machines.findIndex((m) => m.id === selectedMachine.id);
    if (index === -1) return;
    // Small delay to let the layout settle
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.3, // Position selected item ~30% from top
      });
    }, 150);
  };

  // ─── Loading ─────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cardBg }}>
        <Loader />
      </View>
    );
  }

  // ─── UI ──────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.cardBg }}>

      {/* ── Dark Navbar ── */}
      <View style={commonStyles.navbar}>
        <TouchableOpacity
          style={commonStyles.navbarBackBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color={colors.white} />
        </TouchableOpacity>
        <View style={commonStyles.navbarTitleBlock}>
          <Text style={commonStyles.navbarTitle}>Select Machine</Text>
          <Text style={commonStyles.navbarSubtitle}>Choose before scanning</Text>
        </View>
      </View>

      {/* ── Body ── */}
      <FlatList
        ref={flatListRef}
        data={machines}
        keyExtractor={(item, index) => `${item.machine_name}-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        // Fallback if scrollToIndex fails (item not yet measured)
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
          <View style={commonStyles.warningBanner}>
            <AlertTriangle size={20} color={colors.accent} />
            <Text style={commonStyles.warningText}>
              You must select a machine before scanning
            </Text>
          </View>
        }

        // Empty state
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏭</Text>
            <Text style={styles.emptyText}>No machines assigned</Text>
            <Text style={styles.emptySubtext}>Contact your supervisor</Text>
          </View>
        }

        renderItem={({ item, index }) => (
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
        )}
      />

      {/* ── Sticky CTA ── */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={[commonStyles.button, !selectedMachine && styles.buttonDisabled]}
          onPress={() => selectedMachine && router.push({
            pathname: "/scanner-track-trace",
            params: { machine_id: String(selectedMachine.id), machine_name: selectedMachine.machine_name },
          })}
          activeOpacity={selectedMachine ? 0.85 : 1}
          disabled={!selectedMachine}
        >
          <Text style={commonStyles.buttonText}>
            📷  Proceed to Scanner
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 12,
  },
  emptyState: {
    marginTop: 60,
    alignItems: "center",
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    color: colors.heading,
    fontSize: 16,
    fontWeight: "700",
  },
  emptySubtext: {
    color: colors.label,
    fontSize: 13,
  },
  ctaContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
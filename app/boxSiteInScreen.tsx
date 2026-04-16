import Loader from "@/components/generic/Loader";
import { useToast } from "@/components/Notification/ToastProvider";
import { colors } from "@/components/theme/colors";
import { commonStyles } from "@/components/theme/commonStyles";
import axios from "@/lib/axios";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, CheckCircle2, Package, ScanLine } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

interface BoxSiteInItem {
  id: number;
  box_name: string;
  box_status: string;
  site_in_at: string | null;
  factory_out_at: string | null;
  total_items: number;
  received_items: number;
}

export default function BoxSiteInScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { project_id, vendor_id, project_name } = useLocalSearchParams<{
    project_id: string;
    vendor_id: string;
    project_name: string;
  }>();

  const [boxes, setBoxes] = useState<BoxSiteInItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBoxes = useCallback(async () => {
    try {
      // Fetch all boxes for project, then filter ones with site_in_at set
      const res = await axios.get(
        `/boxes/vendor/${vendor_id}/project/${project_id}`
      );

      const allBoxes: BoxSiteInItem[] = await Promise.all(
        res.data
          .filter((b: any) => b.site_in_at !== null && b.site_in_at !== undefined)
          .map(async (b: any) => {
            // Fetch item-level site_in status per box
            try {
              const statusRes = await axios.get(
                `/boxes/boxes/${b.id}/site-in-status?project_id=${project_id}&vendor_id=${vendor_id}`
              );
              const data = statusRes.data?.data;
              return {
                id: b.id,
                box_name: b.box_name,
                box_status: b.box_status,
                site_in_at: b.site_in_at,
                factory_out_at: b.factory_out_at,
                total_items: data?.total_items ?? 0,
                received_items: data?.received_items ?? 0,
              };
            } catch {
              return {
                id: b.id,
                box_name: b.box_name,
                box_status: b.box_status,
                site_in_at: b.site_in_at,
                factory_out_at: b.factory_out_at,
                total_items: b.items_count ?? 0,
                received_items: 0,
              };
            }
          })
      );

      setBoxes(allBoxes);
    } catch (err) {
      console.error("Failed to fetch boxes:", err);
      showToast("error", "Failed to fetch boxes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [project_id, vendor_id]);

  useFocusEffect(
    useCallback(() => {
      fetchBoxes();
    }, [project_id, vendor_id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBoxes();
  };

  const handleScanItems = (box: BoxSiteInItem) => {
    router.push({
      pathname: "/scanner",
      params: {
        scan_type:  "ITEM_SITE_IN",
        box_id:     String(box.id),
        project_id: String(project_id),
        vendor_id:  String(vendor_id),
      },
    });
  };

  if (loading) {
    return <View style={styles.center}><Loader /></View>;
  }

  return (
    <View style={styles.root}>

      {/* ── Navbar ── */}
      <View style={commonStyles.navbar}>
        <TouchableOpacity style={commonStyles.navbarBackBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <ArrowLeft size={20} color={colors.white} />
        </TouchableOpacity>
        <View style={commonStyles.navbarTitleBlock}>
          <Text style={commonStyles.navbarTitle} numberOfLines={1}>{project_name ?? "Project"}</Text>
          <Text style={commonStyles.navbarSubtitle}>Boxes at Site</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={boxes}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Package size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No boxes at site yet</Text>
            <Text style={styles.emptySubtitle}>Boxes will appear here once marked as site in</Text>
          </View>
        }
        renderItem={({ item }) => {
          const allReceived = item.received_items === item.total_items && item.total_items > 0;
          const pct = item.total_items > 0
            ? Math.round((item.received_items / item.total_items) * 100)
            : 0;

          return (
            <View style={styles.card}>
              <View style={[styles.accentStrip, { backgroundColor: allReceived ? "#2A9D8F" : "#6366F1" }]} />
              <View style={styles.cardBody}>

                {/* Header */}
                <View style={styles.headerRow}>
                  <View style={[styles.iconWrap, { backgroundColor: allReceived ? "#E6F7F5" : "#EEF2FF" }]}>
                    <Package size={18} color={allReceived ? "#2A9D8F" : "#6366F1"} />
                  </View>
                  <Text style={styles.boxName} numberOfLines={1}>{item.box_name}</Text>
                  <View style={[styles.statusPill, { backgroundColor: allReceived ? "#E6F7F5" : "#EEF2FF" }]}>
                    {allReceived && <CheckCircle2 size={11} color="#1A7A70" />}
                    <Text style={[styles.statusText, { color: allReceived ? "#1A7A70" : "#6366F1" }]}>
                      {allReceived ? "Complete" : "Pending"}
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <View style={[
                      styles.progressFill,
                      { width: `${pct}%` as any },
                      allReceived && { backgroundColor: "#2A9D8F" },
                    ]} />
                  </View>
                  <Text style={[styles.progressPct, allReceived && { color: "#2A9D8F" }]}>{pct}%</Text>
                </View>

                {/* Stats + scan button */}
                <View style={styles.footerRow}>
                  <View style={styles.statsWrap}>
                    <View style={styles.statChip}>
                      <Text style={styles.statLabel}>Total</Text>
                      <Text style={styles.statValue}>{item.total_items}</Text>
                    </View>
                    <View style={[styles.statChip, { backgroundColor: "#E6F7F5", borderColor: "#2A9D8F" }]}>
                      <Text style={[styles.statLabel, { color: "#1A7A70" }]}>Received</Text>
                      <Text style={[styles.statValue, { color: "#1A7A70" }]}>{item.received_items}</Text>
                    </View>
                    <View style={[styles.statChip, { backgroundColor: "#FFF8EE", borderColor: "#F4A261" }]}>
                      <Text style={[styles.statLabel, { color: "#C15C0A" }]}>Pending</Text>
                      <Text style={[styles.statValue, { color: "#C15C0A" }]}>{item.total_items - item.received_items}</Text>
                    </View>
                  </View>

                  {/* Scan Items button — only if not all received */}
                  {!allReceived && (
                    <TouchableOpacity
                      style={styles.scanBtn}
                      onPress={() => handleScanItems(item)}
                      activeOpacity={0.85}
                    >
                      <ScanLine size={14} color="white" />
                      <Text style={styles.scanBtnText}>Scan Items</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Site in date */}
                {item.site_in_at && (
                  <Text style={styles.dateText}>
                    Arrived: {new Date(item.site_in_at).toLocaleDateString("en-GB", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </Text>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cardBg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, paddingBottom: 40, gap: 10 },

  emptyState: { marginTop: 80, alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  emptySubtitle: { fontSize: 13, color: "#9CA3AF", textAlign: "center", paddingHorizontal: 32 },

  card: {
    flexDirection: "row", backgroundColor: "white", borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  accentStrip: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 10 },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  boxName: { flex: 1, fontSize: 14, fontWeight: "700", color: "#111827" },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: "700" },

  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressTrack: { flex: 1, height: 5, backgroundColor: "#F3F4F6", borderRadius: 99, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#6366F1", borderRadius: 99 },
  progressPct: { fontSize: 11, fontWeight: "800", color: "#6366F1", minWidth: 32, textAlign: "right" },

  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statsWrap: { flexDirection: "row", gap: 6 },
  statChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB",
  },
  statLabel: { fontSize: 10, fontWeight: "600", color: "#6B7280" },
  statValue: { fontSize: 11, fontWeight: "800", color: "#6B7280" },

  scanBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#6366F1", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  scanBtnText: { fontSize: 12, fontWeight: "700", color: "white" },

  dateText: { fontSize: 11, color: "#9CA3AF" },
});
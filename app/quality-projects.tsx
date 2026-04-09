import Loader from "@/components/generic/Loader";
import { colors } from "@/components/theme/colors";
import { commonStyles } from "@/components/theme/commonStyles";
import axios from "@/lib/axios";
import type { RootState } from "@/redux/store";
import { useFocusEffect, useRouter } from "expo-router";
import { AlertTriangle, ArrowLeft, CheckSquare, ChevronRight, Clock } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSelector } from "react-redux";

interface QualityProject {
  id: number;
  project_name: string;
  project_status: string;
  track_trace_status: string;
  created_at: string;
  pending_count: number;
  qualityMachineId: number;
  qualityMachineName:String
}

export default function QualityProjectsScreen() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);

  const [projects, setProjects] = useState<QualityProject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    const vendorId = user?.vendor_id;
    if (!vendorId) return;

    setLoading(true);
    try {
      const res = await axios.get(`/track-trace/quality-check-projects/${vendorId}`);
      const raw = res.data?.data?.projects;
      if (Array.isArray(raw)) setProjects(raw);
    } catch (err) {
      console.warn("Failed to fetch quality projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [user?.vendor_id])
  );

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cardBg }}>
        <Loader />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.cardBg }}>

      {/* ── Navbar ── */}
      <View style={commonStyles.navbar}>
        <TouchableOpacity
          style={commonStyles.navbarBackBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color={colors.white} />
        </TouchableOpacity>
        <View style={commonStyles.navbarTitleBlock}>
          <Text style={commonStyles.navbarTitle}>Quality Check</Text>
          <Text style={commonStyles.navbarSubtitle}>Projects ready for inspection</Text>
        </View>
      </View>

      {/* ── List ── */}
      <FlatList
        data={projects}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}

        ListHeaderComponent={
          <View style={commonStyles.warningBanner}>
            <AlertTriangle size={20} color={colors.accent} />
            <Text style={commonStyles.warningText}>
              Only projects with all previous stages completed are shown
            </Text>
          </View>
        }

        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>✅</Text>
            <Text style={styles.emptyText}>No projects pending quality check</Text>
            <Text style={styles.emptySubtext}>All caught up!</Text>
          </View>
        }

        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => router.push({
              pathname: "/scanner-track-trace",
              params: {
                machine_id: String(item.qualityMachineId),
                machine_name:String(item.qualityMachineName),
              },
            })}
          >
            {/* Left accent */}
            <View style={styles.cardAccent} />

            <View style={styles.cardBody}>
              {/* Top row */}
              <View style={styles.cardTopRow}>
                <View style={styles.cardIconWrap}>
                  <CheckSquare size={20} color="#F4A261" />
                </View>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.project_name}
                </Text>
                <ChevronRight size={18} color={colors.label} />
              </View>

              {/* Stats row */}
              <View style={styles.cardStatsRow}>
                <View style={styles.statChip}>
                  <Clock size={12} color="#F4A261" />
                  <Text style={styles.statChipText}>
                    {item.pending_count} pending
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 12,
  },
  emptyState: {
    marginTop: 60,
    alignItems: "center",
    gap: 8,
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: {
    color: colors.heading,
    fontSize: 16,
    fontWeight: "700",
  },
  emptySubtext: {
    color: colors.label,
    fontSize: 13,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardAccent: {
    width: 5,
    backgroundColor: "#F4A261",
  },
  cardBody: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEF0DC",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.heading,
  },
  cardStatsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF8EE",
    borderWidth: 1,
    borderColor: "#F4A261",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#C15C0A",
  },
  statChipSecondary: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  statChipTextSecondary: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.label,
  },
  cardDate: {
    fontSize: 11,
    color: colors.label,
    marginTop: 2,
  },
});
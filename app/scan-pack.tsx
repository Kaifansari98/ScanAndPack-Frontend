import Loader from "@/components/generic/Loader";
import { useToast } from "@/components/Notification/ToastProvider";
import { colors } from "@/components/theme/colors";
import { commonStyles } from "@/components/theme/commonStyles";
import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
import { fetchProjectDetailsAndShare } from "@/utils/projectPdfUtils";
import { router, useFocusEffect } from "expo-router";
import LottieView from "lottie-react-native";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Layers,
  ScanLine,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSelector } from "react-redux";

interface FormattedProject {
  id: number;
  vendor_id: number;
  projectName: string;
  totalNoItems: number;
  unpackedItems: number;
  packedItems: number;
  status: string;
  date: string;
  completionPercentage: number;
}

export default function ProjectsTabScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [projects, setProjects] = useState<FormattedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProject, setSelectedProject] = useState<FormattedProject | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { showToast } = useToast();

  const handleConfirm = async () => {
    setShowConfirmModal(false);
    setDownloadLoading(true);
    try {
      if (selectedProject) await fetchProjectDetailsAndShare(selectedProject);
    } catch (error: any) {
      console.log("Download Error", error.message);
    } finally {
      setDownloadLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const vendorId = user?.vendor_id;
      if (!vendorId) return;

      const response = await axios.get(`/projects/vendor/${vendorId}`);

      const formatted: FormattedProject[] = response.data.map((proj: any) => ({
        id: proj.id,
        vendor_id: proj.vendor_id,
        projectName: proj.project_name,
        totalNoItems: proj.aggregatedTotals?.total_items ?? 0,
        unpackedItems: proj.aggregatedTotals?.total_unpacked ?? 0,
        packedItems: proj.aggregatedTotals?.total_packed ?? 0,
        status: proj.project_status,
        date: proj.details[0]?.estimated_completion_date
          ? new Date(proj.details[0].estimated_completion_date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "N/A",
        completionPercentage:
          proj.aggregatedTotals?.total_items > 0
            ? Math.round(
                (proj.aggregatedTotals?.total_packed / proj.aggregatedTotals?.total_items) * 100
              )
            : 0,
      }));

      setProjects(formatted);
    } catch (error) {
      console.error("Failed to fetch projects", error);
      showToast("error", "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [user?.vendor_id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Loader />
      </View>
    );
  }

  return (
    <View style={styles.root}>

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
          <Text style={commonStyles.navbarTitle}>Scan & Pack</Text>
          <Text style={commonStyles.navbarSubtitle}>Select a project to pack</Text>
        </View>
        <TouchableOpacity
          style={commonStyles.navbarBackBtn}
          onPress={() => router.push("/scanner")}
          activeOpacity={0.8}
        >
          <ScanLine size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {downloadLoading ? (
        <View style={styles.center}>
          <Loader />
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}

          ListEmptyComponent={
            <View style={styles.emptyState}>
              <LottieView
                source={require("@/assets/animations/projectEmpty.json")}
                style={styles.lottie}
                autoPlay
                loop={false}
              />
              <Text style={styles.emptyText}>No projects found</Text>
              <Text style={styles.emptySubtext}>Projects will appear here once created</Text>
            </View>
          }

          renderItem={({ item }) => {
            const isDone = item.completionPercentage === 100;
            const pct = item.completionPercentage;

            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: "/dashboards/boxes",
                    params: {
                      id: String(item.id),
                      vendor_id: String(item.vendor_id),
                    },
                  })
                }
              >
                {/* Left accent */}
                <View style={[styles.accent, { backgroundColor: isDone ? "#2A9D8F" : "#2A9D8F" }]} />

                <View style={styles.body}>

                  {/* ── Top row ── */}
                  <View style={styles.topRow}>
                    <View style={[styles.iconWrap, { backgroundColor: isDone ? "#E6F7F5" : "#EEF2FF" }]}>
                      <Layers size={18} color={isDone ? "#2A9D8F" : "#2A9D8F"} />
                    </View>
                    <Text style={styles.title} numberOfLines={1}>{item.projectName}</Text>
                    <View style={styles.topActions}>
                      {item.packedItems > 0 && (
                        <TouchableOpacity
                          onPress={() => { setSelectedProject(item); setShowConfirmModal(true); }}
                          style={styles.iconBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Download size={16} color="#6B7280" />
                        </TouchableOpacity>
                      )}
                      <ChevronRight size={18} color="#D1D5DB" />
                    </View>
                  </View>

                  {/* ── Progress bar ── */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${pct}%` as any },
                          isDone && styles.progressFillDone,
                        ]}
                      />
                    </View>
                    <Text style={[styles.progressPct, isDone && { color: "#2A9D8F" }]}>
                      {pct}%
                    </Text>
                  </View>

                  {/* ── Stats row ── */}
                  <View style={styles.statsRow}>
                    <StatChip
                      label="Total"
                      value={item.totalNoItems}
                      color="#6B7280"
                      bg="#F3F4F6"
                      border="#E5E7EB"
                    />
                    <StatChip
                      label="Packed"
                      value={item.packedItems}
                      color="#1A7A70"
                      bg="#E6F7F5"
                      border="#2A9D8F"
                      icon={isDone ? <CheckCircle2 size={11} color="#1A7A70" /> : undefined}
                    />
                    <StatChip
                      label="Pending"
                      value={item.unpackedItems}
                      color="#C15C0A"
                      bg="#FFF8EE"
                      border="#F4A261"
                      icon={item.unpackedItems > 0 ? <Clock size={11} color="#C15C0A" /> : undefined}
                    />
                    {/* Status badge */}
                    <View style={[
                      styles.statusPill,
                      { backgroundColor: isDone ? "#E6F7F5" : "#EEF2FF" }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: isDone ? "#2A9D8F" : "#2A9D8F" }
                      ]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ── Download Confirmation Modal ── */}
      <Modal
        transparent
        animationType="slide"
        visible={showConfirmModal}
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowConfirmModal(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Download Project Report</Text>
            <Text style={styles.modalMessage}>
              Download box list for "{selectedProject?.projectName}"?
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowConfirmModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnConfirmText}>Yes, Download</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Stat Chip ────────────────────────────────────────────────────────────────

function StatChip({
  label, value, color, bg, border, icon,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
  border: string;
  icon?: React.ReactNode;
}) {
  return (
    <View style={[statStyles.chip, { backgroundColor: bg, borderColor: border }]}>
      {icon}
      <Text style={[statStyles.label, { color }]}>{label}</Text>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  label: { fontSize: 10, fontWeight: "600" },
  value: { fontSize: 12, fontWeight: "800" },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cardBg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.cardBg },
  listContent: { padding: 16, paddingTop: 16, paddingBottom: 32, gap: 10 },

  // Empty
  emptyState: { marginTop: 60, alignItems: "center", gap: 8 },
  lottie: { width: 220, height: 220 },
  emptyText: { color: colors.heading, fontSize: 16, fontWeight: "700" },
  emptySubtext: { color: colors.label, fontSize: 13, textAlign: "center" },

  // Card
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
  accent: { width: 4 },
  body: { flex: 1, padding: 14, gap: 10 },

  // Top row
  topRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 32, height: 32, borderRadius: 9,
    justifyContent: "center", alignItems: "center",
  },
  title: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.heading },
  topActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center", alignItems: "center",
  },

  // Progress
  progressSection: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressTrack: {
    flex: 1, height: 5, backgroundColor: "#F3F4F6",
    borderRadius: 99, overflow: "hidden",
  },
  progressFill: {
    height: "100%", backgroundColor: "#2A9D8F", borderRadius: 99,
  },
  progressFillDone: { backgroundColor: "#2A9D8F" },
  progressPct: {
    fontSize: 11, fontWeight: "800", color: "#2A9D8F", minWidth: 32, textAlign: "right",
  },

  // Stats
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  statusPill: {
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, marginLeft: "auto",
  },
  statusText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },

  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: Platform.OS === "ios" ? 48 : 32,
    paddingTop: 12, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 20,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: "#D1D5DB", borderRadius: 2, marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 8, textAlign: "center" },
  modalMessage: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 28, lineHeight: 20 },
  modalBtnRow: { flexDirection: "row", gap: 12, width: "100%" },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  modalBtnCancel: { backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  modalBtnCancelText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  modalBtnConfirm: {
    backgroundColor: "#2A9D8F",
    shadowColor: "#2A9D8F", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  modalBtnConfirmText: { fontSize: 15, fontWeight: "700", color: "white" },
});
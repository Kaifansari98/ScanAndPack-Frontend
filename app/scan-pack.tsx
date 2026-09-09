import Loader from "@/components/generic/Loader";
import Navbar from "@/components/generic/Navbar";
import {
  FormattedProject,
  getScanMode,
  ScanPackProjectCard,
} from "@/components/ItemCards/ScanPackProjectCard";
import { FilterModal, FilterOption } from "@/components/modals/FilterModal";
import { useToast } from "@/components/Notification/ToastProvider";
import { colors } from "@/components/theme/colors";
import { commonStyles } from "@/components/theme/commonStyles";
import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
import { fetchProjectFullReportAndShare } from "@/utils/projectPdfUtils";
import { router, useFocusEffect } from "expo-router";
import LottieView from "lottie-react-native";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileDown,
  LogIn,
  LogOut,
  MapPin,
  ScanLine,
  Search,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSelector } from "react-redux";

const SCAN_PACK_FILTER_OPTIONS: FilterOption[] = [
  {
    key: "all",
    label: "All Projects",
    desc: "Show all scan and pack projects",
    color: "#4B3A34",
  },
  {
    key: "Not Started",
    label: "Not Started",
    desc: "Projects pending packing start",
    color: "#64748B",
  },
  {
    key: "Started",
    label: "Started",
    desc: "Packing currently in progress",
    color: "#6366F1",
  },
  {
    key: "Completed",
    label: "Completed",
    desc: "Scan and pack finished",
    color: "#10B981",
  },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProjectsTabScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const { showToast } = useToast();

  const [projects, setProjects] = useState<FormattedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [selectedProject, setSelectedProject] =
    useState<FormattedProject | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanProject, setScanProject] = useState<FormattedProject | null>(null);

  // Filter & Pagination States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProjects, setTotalProjects] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchProjects = useCallback(
    async (targetPage = 1, isRefresh = false) => {
      try {
        const vendorId = user?.vendor_id;
        if (!vendorId) return;

        if (targetPage > 1) {
          setLoadingMore(true);
        }

        const params: any = {
          page: targetPage,
          limit: 10,
        };

        if (searchQuery.trim()) {
          params.search = searchQuery.trim();
        }

        if (statusFilter && statusFilter !== "all") {
          params.status = statusFilter;
        }

        const { data } = await axios.get(`/projects/vendor/${vendorId}`, {
          params,
        });

        let listData: any[] = [];
        let totalCount = 0;
        let pagesCount = 1;

        if (Array.isArray(data)) {
          listData = data;
          totalCount = data.length;
          pagesCount = 1;
        } else if (data && Array.isArray(data.data)) {
          listData = data.data;
          totalCount = data.pagination?.total ?? listData.length;
          pagesCount = data.pagination?.totalPages ?? 1;
        }

        const formatted = listData.map((p: any) => ({
          id: p.id,
          vendor_id: p.vendor_id,
          projectName: p.project_name,
          totalNoItems: p.aggregatedTotals?.total_items ?? 0,
          unpackedItems: p.aggregatedTotals?.total_unpacked ?? 0,
          packedItems: p.aggregatedTotals?.total_packed ?? 0,
          status: p.project_status,
          track_trace_status: p.track_trace_status ?? p.project_status,
          date: p.details[0]?.estimated_completion_date
            ? new Date(
                p.details[0].estimated_completion_date,
              ).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "N/A",
          completionPercentage:
            p.aggregatedTotals?.total_items > 0
              ? Math.round(
                  (p.aggregatedTotals.total_packed /
                    p.aggregatedTotals.total_items) *
                    100,
                )
              : 0,
          factory_out_at: p.factory_out_at ?? null,
          site_in_at: p.site_in_at ?? null,
          all_factory_out: p.all_factory_out ?? false,
          any_factory_out: p.any_factory_out ?? false,
        }));

        if (targetPage === 1 || isRefresh) {
          setProjects(formatted);
        } else {
          setProjects((prev) => [...prev, ...formatted]);
        }

        setPage(targetPage);
        setTotalPages(pagesCount);
        setTotalProjects(totalCount);
      } catch {
        showToast("error", "Failed to fetch projects");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user?.vendor_id, searchQuery, statusFilter, showToast],
  );

  useFocusEffect(
    useCallback(() => {
      fetchProjects(1);
    }, [fetchProjects]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProjects(1, true);
    setRefreshing(false);
  };

  const handleDownload = async () => {
    setShowConfirmModal(false);
    setDownloadLoading(true);
    try {
      if (selectedProject) {
        await fetchProjectFullReportAndShare(selectedProject);
        showToast("success", "Full report PDF ready to share!");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to download full report");
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleScanOption = (scanType: "IN" | "OUT") => {
    setShowScanModal(false);
    if (!scanProject) return;
    router.push({
      pathname: "/scanner",
      params: {
        project_id: String(scanProject.id),
        vendor_id: String(scanProject.vendor_id),
        scan_type: scanType,
      },
    });
  };

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={screen.footerLoading}>
          <Loader />
        </View>
      );
    }

    if (page < totalPages) {
      return (
        <TouchableOpacity
          style={screen.loadMoreBtn}
          onPress={() => fetchProjects(page + 1)}
          activeOpacity={0.8}
        >
          <Text style={screen.loadMoreBtnText}>
            Load More ({projects.length} of {totalProjects})
          </Text>
        </TouchableOpacity>
      );
    }

    if (totalProjects > 0) {
      return (
        <View style={screen.footerEnd}>
          <Text style={screen.footerEndText}>
            Showing all {totalProjects} project{totalProjects === 1 ? "" : "s"}
          </Text>
        </View>
      );
    }

    return null;
  };

  const scanMode = scanProject ? getScanMode(scanProject) : null;

  return (
    <View style={screen.root}>
      {/* ── Navbar ── */}
      <Navbar
        title="Projects"
        subtitle="Select a project"
        showBack={router.canGoBack()}
        showFilter={true}
        isFilterActive={statusFilter !== "all"}
        onFilterPress={() => setFilterModalVisible(true)}
      />

      {/* ── Search Bar & Active Filter Tag (Sticky Header) ── */}
      <View style={screen.searchFilterContainer}>
        <View style={screen.searchBar}>
          <Search size={18} color={colors.midBg} />
          <TextInput
            style={screen.searchInput}
            placeholder="Search by project name..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={(text) => setSearchQuery(text)}
          />
          {searchQuery !== "" && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              activeOpacity={0.7}
            >
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        {/* Active Filter Badge if statusFilter != 'all' */}
        {statusFilter !== "all" && (
          <View style={screen.activeFilterRow}>
            <Text style={screen.activeFilterLabel}>Active Filter:</Text>
            <View style={screen.activeFilterPill}>
              <Text style={screen.activeFilterPillText}>{statusFilter}</Text>
              <TouchableOpacity
                onPress={() => setStatusFilter("all")}
                activeOpacity={0.7}
              >
                <X size={13} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {loading && !refreshing && projects.length === 0 ? (
        <View style={screen.center}>
          <Loader />
        </View>
      ) : downloadLoading ? (
        <View style={screen.center}>
          <Loader />
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={screen.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={screen.empty}>
              <View style={screen.emptyIconWrap}>
                <CheckCircle2 size={28} color={colors.midBg} />
              </View>
              <Text style={screen.emptyTitle}>No Projects Found</Text>
              <Text style={screen.emptySub}>
                There are no scan & pack projects matching your criteria.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ScanPackProjectCard
              item={item}
              onScanPress={() => {
                const mode = getScanMode(item);
                if (!mode) {
                  showToast("info", "All boxes dispatched and received");
                  return;
                }
                setScanProject(item);
                setShowScanModal(true);
              }}
              onDownloadPress={() => {
                setSelectedProject(item);
                setShowConfirmModal(true);
              }}
            />
          )}
        />
      )}

      {/* ── Filter Modal ── */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        options={SCAN_PACK_FILTER_OPTIONS}
        selectedKey={statusFilter}
        onApply={(key) => {
          setStatusFilter(key);
          setFilterModalVisible(false);
        }}
      />

      {/* ── Scan Modal ── */}
      <Modal
        transparent
        animationType="slide"
        visible={showScanModal}
        onRequestClose={() => setShowScanModal(false)}
      >
        <View style={modal.overlay}>
          <TouchableOpacity
            style={modal.backdrop}
            activeOpacity={1}
            onPress={() => setShowScanModal(false)}
          />
          <View style={modal.sheet}>
            <View style={modal.handle} />
            <TouchableOpacity
              style={modal.closeBtn}
              onPress={() => setShowScanModal(false)}
            >
              <X size={18} color="#64748B" />
            </TouchableOpacity>
            <Text style={modal.title}>Where are you scanning?</Text>
            <Text style={modal.sub} numberOfLines={1}>
              "{scanProject?.projectName}"
            </Text>
            <View style={modal.options}>
              {(scanMode === "OUT" || scanMode === "BOTH") && (
                <TouchableOpacity
                  style={[
                    modal.optCard,
                    { borderColor: "#F59E0B", backgroundColor: "#FFFBEB" },
                  ]}
                  onPress={() => handleScanOption("OUT")}
                  activeOpacity={0.85}
                >
                  <View style={[modal.optIcon, { backgroundColor: "#FEF3C7" }]}>
                    <LogOut size={28} color="#B45309" />
                  </View>
                  <Text style={[modal.optTitle, { color: "#B45309" }]}>
                    Leaving Factory
                  </Text>
                  <Text style={modal.optDesc}>
                    Scan box as it goes out from the factory
                  </Text>
                </TouchableOpacity>
              )}
              {(scanMode === "IN" || scanMode === "BOTH") && (
                <TouchableOpacity
                  style={[
                    modal.optCard,
                    { borderColor: "#10B981", backgroundColor: "#ECFDF5" },
                  ]}
                  onPress={() => handleScanOption("IN")}
                  activeOpacity={0.85}
                >
                  <View style={[modal.optIcon, { backgroundColor: "#D1FAE5" }]}>
                    <LogIn size={28} color="#065F46" />
                  </View>
                  <Text style={[modal.optTitle, { color: "#065F46" }]}>
                    Arriving at Site
                  </Text>
                  <Text style={modal.optDesc}>
                    Scan box as it arrives at the site
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Download Modal ── */}
      <Modal
        transparent
        animationType="slide"
        visible={showConfirmModal}
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={modal.overlay}>
          <TouchableOpacity
            style={modal.backdrop}
            activeOpacity={1}
            onPress={() => setShowConfirmModal(false)}
          />
          <View style={modal.sheet}>
            <View style={modal.handle} />
            <Text style={modal.title}>Download Report</Text>
            <Text style={modal.sub}>"{selectedProject?.projectName}"</Text>
            <View style={modal.btnRow}>
              <TouchableOpacity
                style={modal.btnCancel}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={modal.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={modal.btnConfirm}
                onPress={handleDownload}
              >
                <FileDown size={16} color="white" />
                <Text style={modal.btnConfirmText}>Yes, Download</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Screen styles ────────────────────────────────────────────────────────────

const screen = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  list: { padding: 12, paddingBottom: 36, gap: 12 },
  empty: {
    marginTop: 60,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  emptySub: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },

  // Search & Filter
  searchFilterContainer: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: colors.midBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    paddingVertical: 0,
    fontWeight: "500",
  },
  activeFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  activeFilterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  activeFilterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.midBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  activeFilterPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  activeChipText: {
    color: "#FFFFFF",
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: "center",
  },
  loadMoreBtn: {
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  loadMoreBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  footerEnd: {
    paddingVertical: 14,
    alignItems: "center",
  },
  footerEndText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
    paddingTop: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 18,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    marginBottom: 16,
  },
  closeBtn: {
    position: "absolute",
    top: 18,
    right: 18,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
    textAlign: "center",
  },
  sub: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 20,
    textAlign: "center",
    maxWidth: 260,
  },
  options: { flexDirection: "row", gap: 10, width: "100%" },
  optCard: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  optIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  optTitle: { fontSize: 14, fontWeight: "800", textAlign: "center" },
  optDesc: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 15,
  },
  btnRow: { flexDirection: "row", gap: 10, width: "100%" },
  btnCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  btnCancelText: { fontSize: 14, fontWeight: "600", color: "#475569" },
  btnConfirm: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
  },
  btnConfirmText: { fontSize: 14, fontWeight: "700", color: "white" },
});

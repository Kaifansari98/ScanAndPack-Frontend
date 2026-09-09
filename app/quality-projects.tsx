import Loader from "@/components/generic/Loader";
import Navbar from "@/components/generic/Navbar";
import {
  QualityProject,
  QualityProjectCard,
} from "@/components/ItemCards/QualityProjectCard";
import { FilterModal, FilterOption } from "@/components/modals/FilterModal";
import { colors } from "@/components/theme/colors";
import { commonStyles } from "@/components/theme/commonStyles";
import axios from "@/lib/axios";
import type { RootState } from "@/redux/store";
import { useCameraPermissions } from "expo-camera";
import { useFocusEffect, useRouter } from "expo-router";
import { AlertTriangle, CheckCircle2, Search, X } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSelector } from "react-redux";

const QUALITY_FILTER_OPTIONS: FilterOption[] = [
  {
    key: "all",
    label: "All Projects",
    desc: "Show all quality check projects",
    color: "#4B3A34",
  },
  {
    key: "Not Started",
    label: "Not Started",
    desc: "Projects pending inspection start",
    color: "#64748B",
  },
  {
    key: "Started",
    label: "Started",
    desc: "Inspection currently in progress",
    color: "#6366F1",
  },
  {
    key: "Completed",
    label: "Completed",
    desc: "Quality inspection finished",
    color: "#10B981",
  },
];

export default function QualityProjectsScreen() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);

  const [projects, setProjects] = useState<QualityProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search, Filter & Pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [tempStatusFilter, setTempStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProjects, setTotalProjects] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();

  const openFilterModal = () => {
    setTempStatusFilter(statusFilter);
    setFilterModalVisible(true);
  };

  const applyFilter = (selectedKey: string) => {
    setStatusFilter(selectedKey);
    setFilterModalVisible(false);
  };

  const handleProjectPress = async (item: QualityProject) => {
    const navigate = () =>
      router.push({
        pathname: "/scanner-track-trace",
        params: {
          machine_id: String(item.qualityMachineId),
          machine_name: String(item.qualityMachineName),
          project_id: String(item.id),
        },
      });

    if (!permission?.granted) {
      const result = await requestPermission();
      if (result?.granted) navigate();
    } else {
      navigate();
    }
  };

  const fetchProjects = useCallback(
    async (targetPage = 1, isRefresh = false) => {
      const vendorId = user?.vendor_id;
      if (!vendorId) return;

      if (targetPage > 1) {
        setLoadingMore(true);
      }

      try {
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

        const res = await axios.get(
          `/track-trace/quality-check-projects/${vendorId}`,
          { params },
        );
        const raw = res.data?.data?.projects;
        const pagination = res.data?.data?.pagination;

        let listData: QualityProject[] = [];
        let totalCount = 0;
        let pagesCount = 1;

        if (Array.isArray(raw)) {
          listData = raw;
          totalCount = pagination?.total ?? raw.length;
          pagesCount = pagination?.totalPages ?? 1;
        }

        if (targetPage === 1 || isRefresh) {
          setProjects(listData);
        } else {
          setProjects((prev) => [...prev, ...listData]);
        }

        setPage(targetPage);
        setTotalPages(pagesCount);
        setTotalProjects(totalCount);
      } catch (err) {
        // console.warn("Failed to fetch quality projects:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user?.vendor_id, searchQuery, statusFilter],
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

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoading}>
          <Loader />
        </View>
      );
    }

    if (page < totalPages) {
      return (
        <TouchableOpacity
          style={styles.loadMoreBtn}
          onPress={() => fetchProjects(page + 1)}
          activeOpacity={0.8}
        >
          <Text style={styles.loadMoreBtnText}>
            Load More ({projects.length} of {totalProjects})
          </Text>
        </TouchableOpacity>
      );
    }

    if (totalProjects > 0) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerEndText}>
            Showing all {totalProjects} project{totalProjects === 1 ? "" : "s"}
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      {/* ── Navbar with Filter Button ── */}
      <Navbar
        title="Quality Check"
        subtitle="Select project to start inspection"
        showBack={true}
        showFilter={true}
        isFilterActive={statusFilter !== "all"}
        onFilterPress={openFilterModal}
      />

      {/* ── Search Bar & Active Filter Tag (Sticky Header) ── */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color={colors.midBg} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects by name..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={(text) => setSearchQuery(text)}
          />
          {searchQuery !== "" && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              activeOpacity={0.7}
              style={styles.clearBtn}
            >
              <X size={14} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        {/* Active Filter Badge if statusFilter != 'all' */}
        {statusFilter !== "all" && (
          <View style={styles.activeFilterRow}>
            <Text style={styles.activeFilterLabel}>Active Filter:</Text>
            <View style={styles.activeFilterPill}>
              <Text style={styles.activeFilterPillText}>{statusFilter}</Text>
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

      {/* ── List ── */}
      {loading && !refreshing && projects.length === 0 ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Loader />
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          // ListHeaderComponent={
          //   <View style={commonStyles.warningBanner}>
          //     <AlertTriangle size={20} color={colors.accent} />
          //     <Text style={commonStyles.warningText}>
          //       Only projects with all previous stages completed are shown
          //     </Text>
          //   </View>
          // }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <CheckCircle2 size={28} color={colors.midBg} />
              </View>
              <Text style={styles.emptyText}>No Projects Found</Text>
              <Text style={styles.emptySubtext}>
                There are no projects pending quality inspection matching your criteria.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <QualityProjectCard item={item} onPress={handleProjectPress} />
          )}
        />
      )}

      {/* ── Filter Modal Component ── */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        options={QUALITY_FILTER_OPTIONS}
        selectedKey={statusFilter}
        onApply={(key) => {
          setStatusFilter(key);
          setFilterModalVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 12,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 12,
  },

  searchFilterContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 10,
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
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 4,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  modalHeaderLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFF8EE",
    borderWidth: 1,
    borderColor: "rgba(244,162,97,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitleBlock: {
    flex: 1,
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.heading,
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
    paddingBottom: 2,
  },
  modalSectionHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1,
  },
  modalResetPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalResetPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  modalOptionsList: {
    gap: 10,
    marginVertical: 2,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  selectedOptionCard: {
    backgroundColor: "#FFF8EE",
    borderColor: colors.accent,
  },
  optionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionTextBlock: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  selectedOptionLabel: {
    color: colors.midBg,
  },
  optionDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  selectedCheckWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.midBg,
    alignItems: "center",
    justifyContent: "center",
  },
  unselectedRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
  },
  applyBtnFull: {
    width: "100%",
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.midBg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    shadowColor: colors.midBg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  filterScroll: {
    gap: 8,
    paddingRight: 10,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  activeChipText: {
    color: "#FFFFFF",
    fontWeight: "700",
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
    color: colors.label,
    fontWeight: "600",
  },
  emptyState: {
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
  emptyText: {
    color: colors.heading,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  emptySubtext: {
    color: colors.label,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});

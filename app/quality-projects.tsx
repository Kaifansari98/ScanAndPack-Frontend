import Loader from "@/components/generic/Loader";
import { colors } from "@/components/theme/colors";
import { commonStyles } from "@/components/theme/commonStyles";
import axios from "@/lib/axios";
import type { RootState } from "@/redux/store";
import { useCameraPermissions } from "expo-camera";
import { useFocusEffect, useRouter } from "expo-router";
import { AlertTriangle, ArrowLeft, CheckSquare, ChevronRight, Clock, Search, X } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  qualityMachineName: string;
}

function getProjectStatusBadge(item: QualityProject) {
  const statusStr = (item.track_trace_status || item.project_status || "").trim();

  if (statusStr.toLowerCase() === "completed") {
    return {
      label: "Completed",
      bg: "#D1FAE5",
      color: "#065F46",
      accent: "#10B981",
    };
  }

  if (statusStr.toLowerCase() === "started") {
    return {
      label: "Started",
      bg: "#E0E7FF",
      color: "#3730A3",
      accent: "#6366F1",
    };
  }

  return {
    label: statusStr || "Not Started",
    bg: "#F1F5F9",
    color: "#64748B",
    accent: "#94A3B8",
  };
}

export default function QualityProjectsScreen() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);

  const [projects, setProjects] = useState<QualityProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search, Filter & Pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProjects, setTotalProjects] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();

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

        const res = await axios.get(`/track-trace/quality-check-projects/${vendorId}`, { params });
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
    [user?.vendor_id, searchQuery, statusFilter]
  );

  useFocusEffect(
    useCallback(() => {
      fetchProjects(1);
    }, [fetchProjects])
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
        <View style={{ width: 40 }} />
      </View>

      {/* ── Search & Status Filters ── */}
      <View style={styles.searchFilterContainer}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by project name..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={(text) => setSearchQuery(text)}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { key: "all", label: "All" },
            { key: "Not Started", label: "Not Started" },
            { key: "Started", label: "Started" },
            { key: "Completed", label: "Completed" },
          ].map((chip) => {
            const active = statusFilter === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                style={[styles.chip, active && styles.activeChip]}
                onPress={() => setStatusFilter(chip.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.activeChipText]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── List ── */}
      {loading && !refreshing && projects.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Loader />
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={commonStyles.warningBanner}>
              <AlertTriangle size={20} color={colors.accent} />
              <Text style={commonStyles.warningText}>
                Only projects with all previous stages completed are shown
              </Text>
            </View>
          }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>✅</Text>
              <Text style={styles.emptyText}>No projects pending quality check</Text>
              <Text style={styles.emptySubtext}>All caught up!</Text>
            </View>
          }
          renderItem={({ item }) => {
            const statusInfo = getProjectStatusBadge(item);
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => handleProjectPress(item)}
              >
                {/* Left accent bar matching status color */}
                <View style={[styles.cardAccent, { backgroundColor: statusInfo.accent }]} />

                <View style={styles.cardBody}>
                  {/* Top row */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardIconWrap}>
                      <CheckSquare size={18} color={statusInfo.accent} />
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.project_name}
                    </Text>
                    {/* Status Badge */}
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                        {statusInfo.label}
                      </Text>
                    </View>
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
            );
          }}
        />
      )}
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
  // Search & Filter
  searchFilterContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    paddingVertical: 0,
  },
  filterScroll: {
    gap: 8,
    paddingRight: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  activeChip: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
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
    color: colors.label,
    fontWeight: "600",
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
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
import Loader from "@/components/generic/Loader";
import Navbar from "@/components/generic/Navbar";
import { FilterModal, FilterOption } from "@/components/modals/FilterModal";
import { useToast } from "@/components/Notification/ToastProvider";
import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ChevronRight,
  FolderKanban,
  Package,
  Search,
  X,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
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

interface SimpleProjectItem {
  id: number;
  vendor_id: number;
  projectName: string;
  status: string;
  completionPercentage: number;
  totalNoItems: number;
  date: string;
}

const PROJECT_FILTER_OPTIONS: FilterOption[] = [
  {
    key: "all",
    label: "All Projects",
    desc: "Show all assigned projects",
    color: "#4B3A34",
  },
  {
    key: "Not Started",
    label: "Not Started / Pending",
    desc: "Projects pending start or 0% packed",
    color: "#64748B",
  },
  {
    key: "Started",
    label: "In Progress",
    desc: "Projects currently active and packing",
    color: "#6366F1",
  },
  {
    key: "Completed",
    label: "Completed",
    desc: "100% packed and finished projects",
    color: "#10B981",
  },
];

function getStatusBadgeInfo(statusStr: string, pct: number) {
  const status = (statusStr || "").toLowerCase().trim();
  if (pct === 100 || status === "completed") {
    return {
      label: "Completed",
      bg: "#ECFDF5",
      color: "#047857",
      border: "#A7F3D0",
      tileBg: "#ECFDF5",
      iconColor: "#059669",
    };
  }
  if (pct > 0 || status === "started" || status === "in progress") {
    return {
      label: "In Progress",
      bg: "#FEF3C7",
      color: "#B45309",
      border: "#FDE68A",
      tileBg: "#FFF8EE",
      iconColor: "#D97706",
    };
  }
  return {
    label: "Not Started",
    bg: "#F1F5F9",
    color: "#475569",
    border: "#E2E8F0",
    tileBg: "#EEF2FF",
    iconColor: "#4F46E5",
  };
}

export default function ProjectsTabScreen() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const { showToast } = useToast();

  const [projects, setProjects] = useState<SimpleProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const vendorId = user?.vendor_id || user?.vendor?.id || user?.id;
      if (!vendorId) return;

      const params: any = { limit: 100 };
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const { data } = await axios.get(`/projects/vendor/${vendorId}`, {
        params,
      });

      let listData: any[] = [];
      if (Array.isArray(data)) {
        listData = data;
      } else if (data && Array.isArray(data.data)) {
        listData = data.data;
      }

      const formatted: SimpleProjectItem[] = listData.map((p: any) => ({
        id: p.id,
        vendor_id: p.vendor_id,
        projectName: p.project_name,
        status: p.project_status || "Not Started",
        completionPercentage:
          p.aggregatedTotals?.total_items > 0
            ? Math.round(
                (p.aggregatedTotals.total_packed /
                  p.aggregatedTotals.total_items) *
                  100,
              )
            : 0,
        totalNoItems: p.aggregatedTotals?.total_items ?? 0,
        date: p.details?.[0]?.estimated_completion_date
          ? new Date(p.details[0].estimated_completion_date).toLocaleDateString(
              "en-GB",
              {
                day: "2-digit",
                month: "short",
                year: "numeric",
              },
            )
          : "N/A",
      }));

      setProjects(formatted);
    } catch (err) {
      showToast("error", "Failed to fetch projects");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, searchQuery, showToast]);

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [fetchProjects]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProjects();
  };

  const handleProjectClick = (item: SimpleProjectItem) => {
    router.push({
      pathname: "/dashboards/project-item-tracking",
      params: {
        project_id: String(item.id),
        vendor_id: String(item.vendor_id),
        project_name: item.projectName,
      },
    });
  };

  const filteredProjects = projects.filter((item) => {
    if (statusFilter === "all") return true;

    const badge = getStatusBadgeInfo(item.status, item.completionPercentage);
    const filterKey = statusFilter.toLowerCase().trim();

    if (filterKey === "completed") {
      return badge.label === "Completed" || item.completionPercentage === 100;
    }
    if (filterKey === "started" || filterKey === "in progress") {
      return (
        badge.label === "In Progress" ||
        (item.completionPercentage > 0 && item.completionPercentage < 100)
      );
    }
    if (filterKey === "not started" || filterKey === "pending") {
      return badge.label === "Not Started" || item.completionPercentage === 0;
    }

    return true;
  });

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <Loader />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* ── Navbar ── */}
      <Navbar
        title="Projects"
        subtitle="Assigned Projects"
        showBack={false}
        showFilter={true}
        isFilterActive={statusFilter !== "all"}
        onFilterPress={() => setFilterModalVisible(true)}
      />

      {/* ── Search Bar ── */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={16} color="#64748B" style={{ marginLeft: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search project name..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={{ padding: 6, marginRight: 4 }}
            >
              <X size={14} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Project List ── */}
      <FlatList
        data={filteredProjects}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Package size={44} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Projects Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || statusFilter !== "all"
                ? "Try clearing your search or filter"
                : "Assigned projects will appear here"}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const badge = getStatusBadgeInfo(
            item.status,
            item.completionPercentage,
          );

          return (
            <TouchableOpacity
              style={styles.projectCard}
              onPress={() => handleProjectClick(item)}
              activeOpacity={0.75}
            >
              {/* Header: Icon + (Title & Items Count) + Arrow */}
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  <View
                    style={[
                      styles.iconTile,
                      { backgroundColor: badge.tileBg },
                    ]}
                  >
                    <FolderKanban size={18} color={badge.iconColor} />
                  </View>
                  <View style={styles.titleColumn}>
                    <Text style={styles.projectName} numberOfLines={1}>
                      {item.projectName}
                    </Text>
                    <View style={styles.itemsSubRow}>
                      <Package size={13} color="#64748B" />
                      <Text style={styles.itemsCountText}>
                        {item.totalNoItems}{" "}
                        {item.totalNoItems === 1 ? "Item" : "Items"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.arrowCircle}>
                  <ChevronRight size={14} color="#64748B" />
                </View>
              </View>

              {/* Footer: Status Pill + Due Date / Packed % + Progress Bar */}
              <View style={styles.cardFooter}>
                <View style={styles.footerInfoRow}>
                  {/* Status Pill on bottom-left */}
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: badge.bg,
                        borderColor: badge.border,
                      },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: badge.color }]}>
                      {badge.label}
                    </Text>
                  </View>

                  {/* Due Date & Packed % on bottom-right */}
                  <View style={styles.rightFooterInfo}>
                    {item.date !== "N/A" && (
                      <Text style={styles.projectSubtitle}>
                        Due: {item.date} •{" "}
                      </Text>
                    )}
                    <Text style={styles.progressPctText}>
                      {item.completionPercentage}% Packed
                    </Text>
                  </View>
                </View>

                {/* Progress Bar Track */}
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, Math.max(0, item.completionPercentage))}%`,
                        backgroundColor: badge.iconColor,
                      },
                    ]}
                  />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── Filter Modal ── */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        options={PROJECT_FILTER_OPTIONS}
        selectedKey={statusFilter}
        onApply={(key: string) => setStatusFilter(key)}
        title="Filter Projects"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  searchSection: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    paddingHorizontal: 8,
  },
  listContent: {
    padding: 12,
    paddingBottom: 40,
    gap: 10,
  },
  projectCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  titleColumn: {
    flex: 1,
    gap: 3,
  },
  projectName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  itemsSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  itemsCountText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  cardFooter: {
    gap: 8,
  },
  footerInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  rightFooterInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  projectSubtitle: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  progressPctText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
    width: "100%",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  emptyState: {
    marginTop: 80,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
  },
});

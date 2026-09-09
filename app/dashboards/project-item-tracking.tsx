import Navbar from "@/components/generic/Navbar";
import {
  ItemTrackingCard,
  ProjectItemTrackingRow,
} from "@/components/ItemCards/ItemTrackingCard";
import { FilterModal, FilterOption } from "@/components/modals/FilterModal";
import axios from "@/lib/axios";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  CircleAlert,
  Cpu,
  PackageSearch,
  RotateCcw,
  Search,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type ScanStatus = "all" | "scanned" | "pending";

interface MachineOption {
  id: number;
  machine_name: string;
  machine_code: string;
  scan_type: string;
  sequence_no: number | null;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface TrackingResponse {
  project: {
    id: number;
    project_name: string;
    track_trace_status: string;
  };
  data: ProjectItemTrackingRow[];
  pagination: PaginationMeta;
  counts: {
    all: number;
    scanned: number;
    pending: number;
  };
  filterOptions: {
    machines: MachineOption[];
  };
}

const PAGE_SIZE = 10;
const SEARCH_DELAY_MS = 400;

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

const ITEM_FILTER_OPTIONS: FilterOption[] = [
  {
    key: "all",
    label: "All Items",
    desc: "Show all cut-list items",
    color: "#4B3A34",
  },
  {
    key: "scanned",
    label: "Scanned Items",
    desc: "Show items fully scanned on machines",
    color: "#10B981",
  },
  {
    key: "pending",
    label: "Pending Items",
    desc: "Show items awaiting machine scans",
    color: "#D97706",
  },
];

const firstParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

export default function ProjectItemTrackingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    project_id?: string | string[];
    vendor_id?: string | string[];
    project_name?: string | string[];
  }>();

  const projectId = Number(firstParam(params.project_id));
  const vendorId = Number(firstParam(params.vendor_id));
  const routeProjectName = firstParam(params.project_name);

  const [items, setItems] = useState<ProjectItemTrackingRow[]>([]);
  const [pagination, setPagination] =
    useState<PaginationMeta>(EMPTY_PAGINATION);
  const [counts, setCounts] = useState({ all: 0, scanned: 0, pending: 0 });
  const [machines, setMachines] = useState<MachineOption[]>([]);
  const [projectName, setProjectName] = useState(routeProjectName);

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [scanStatus, setScanStatus] = useState<ScanStatus>("all");
  const [machineId, setMachineId] = useState<number | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestVersionRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const paginationRef = useRef(EMPTY_PAGINATION);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

  const loadPage = useCallback(
    async (
      page: number,
      options: {
        append?: boolean;
        refresh?: boolean;
        version: number;
        signal?: AbortSignal;
      },
    ) => {
      const append = options.append === true;

      if (append) {
        if (loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else if (options.refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      if (!append) {
        setError(null);
      }

      try {
        const response = await axios.get<TrackingResponse>(
          `/track-trace/vendor/${vendorId}/project/${projectId}/items`,
          {
            params: {
              page,
              limit: PAGE_SIZE,
              search: debouncedSearch || undefined,
              scan_status: scanStatus !== "all" ? scanStatus : undefined,
              machine_id: machineId ?? undefined,
            },
            signal: options.signal,
          },
        );

        if (options.version !== requestVersionRef.current) return;

        const payload = response.data;
        const nextItems = payload?.data ?? [];
        const nextPagination = payload?.pagination ?? EMPTY_PAGINATION;

        if (payload?.project?.project_name) {
          setProjectName(payload.project.project_name);
        }

        if (payload?.counts) {
          setCounts(payload.counts);
        }

        if (payload?.filterOptions?.machines) {
          setMachines(payload.filterOptions.machines);
        }

        setItems((prev) => (append ? [...prev, ...nextItems] : nextItems));
        setPagination(nextPagination);
      } catch (err: any) {
        if (options.version !== requestVersionRef.current) return;
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;

        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load project items tracking.";
        setError(msg);
      } finally {
        if (options.version === requestVersionRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
          loadingMoreRef.current = false;
        }
      }
    },
    [vendorId, projectId, debouncedSearch, scanStatus, machineId],
  );

  const fetchFirstPage = useCallback(
    (isRefresh = false) => {
      requestVersionRef.current += 1;
      const currentVersion = requestVersionRef.current;
      loadPage(1, { refresh: isRefresh, version: currentVersion });
    },
    [loadPage],
  );

  useEffect(() => {
    if (!projectId || !vendorId) {
      setLoading(false);
      setError("Missing project_id or vendor_id in route parameters.");
      return;
    }
    fetchFirstPage();
  }, [
    projectId,
    vendorId,
    debouncedSearch,
    scanStatus,
    machineId,
    fetchFirstPage,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!projectId || !vendorId) return;
      fetchFirstPage(true);
    }, [projectId, vendorId, fetchFirstPage]),
  );

  const loadMore = useCallback(() => {
    const meta = paginationRef.current;
    if (loading || loadingMore || refreshing || !meta.hasNextPage) return;

    requestVersionRef.current += 1;
    loadPage(meta.page + 1, {
      append: true,
      version: requestVersionRef.current,
    });
  }, [loading, loadingMore, refreshing, loadPage]);

  const onRefresh = useCallback(() => {
    fetchFirstPage(true);
  }, [fetchFirstPage]);

  const resetFilters = useCallback(() => {
    setSearchText("");
    setDebouncedSearch("");
    setScanStatus("all");
    setMachineId(null);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ProjectItemTrackingRow }) => (
      <ItemTrackingCard item={item} />
    ),
    [],
  );

  const activeFilterCount =
    (scanStatus !== "all" ? 1 : 0) +
    (machineId !== null ? 1 : 0) +
    (debouncedSearch ? 1 : 0);

  const header = (
    <View style={styles.headerContainer}>
      {/* ── Search Bar ── */}
      <View style={styles.searchBar}>
        <Search size={16} color="#64748B" style={{ marginLeft: 10 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by item code, name..."
          placeholderTextColor="#94A3B8"
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchText("")}
            style={{ padding: 6, marginRight: 4 }}
          >
            <X size={14} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Machine Filter Chips ── */}
      {machines.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.machineScrollContent}
        >
          <TouchableOpacity
            onPress={() => setMachineId(null)}
            style={[
              styles.machineChip,
              machineId === null && styles.machineChipActive,
            ]}
          >
            <Text
              style={[
                styles.machineChipText,
                machineId === null && styles.machineChipTextActive,
              ]}
            >
              All Machines
            </Text>
          </TouchableOpacity>

          {machines.map((m) => {
            const isSelected = machineId === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                onPress={() => setMachineId(m.id)}
                style={[
                  styles.machineChip,
                  isSelected && styles.machineChipActive,
                ]}
              >
                <Cpu size={12} color={isSelected ? "#FFFFFF" : "#64748B"} />
                <Text
                  style={[
                    styles.machineChipText,
                    isSelected && styles.machineChipTextActive,
                  ]}
                >
                  {m.machine_name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  const empty = !loading ? (
    <View style={styles.emptyState}>
      {error ? (
        <CircleAlert size={40} color="#EF4444" />
      ) : (
        <PackageSearch size={40} color="#4F46E5" />
      )}
      <Text style={styles.emptyTitle}>
        {error ? "Could Not Load Items" : "No Matching Items"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {error
          ? error
          : activeFilterCount > 0
            ? "Try clearing your search or filter options"
            : "No item tracking rows found for this project"}
      </Text>
      <TouchableOpacity
        style={styles.resetBtn}
        onPress={error ? () => fetchFirstPage() : resetFilters}
        activeOpacity={0.8}
      >
        <RotateCcw size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.resetBtnText}>
          {error ? "Retry" : "Reset Filters"}
        </Text>
      </TouchableOpacity>
    </View>
  ) : null;

  const displayedItems = items.filter((item) => {
    if (scanStatus === "all") return true;

    const isFullyScanned =
      item.scan_status === "scanned" ||
      (item.assigned_machines_count > 0 &&
        item.scanned_machines_count >= item.assigned_machines_count);

    if (scanStatus === "scanned") {
      return isFullyScanned;
    }
    if (scanStatus === "pending") {
      return !isFullyScanned;
    }

    return true;
  });

  return (
    <View style={styles.screen}>
      {/* ── Top Navbar ── */}
      <Navbar
        title="Item Tracking"
        subtitle={projectName || "Project Machine Progress"}
        showBack={true}
        showFilter={true}
        isFilterActive={scanStatus !== "all" || machineId !== null}
        onFilterPress={() => setFilterModalVisible(true)}
      />

      <FlatList
        data={loading ? [] : displayedItems}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#4F46E5" />
            </View>
          ) : null
        }
      />

      {/* ── Filter Modal ── */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        options={ITEM_FILTER_OPTIONS}
        selectedKey={scanStatus}
        onApply={(key: string) => setScanStatus(key as ScanStatus)}
        title="Filter Items"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerContainer: {
    gap: 10,
    marginBottom: 8,
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
  machineScrollContent: {
    gap: 8,
    paddingVertical: 2,
  },
  machineChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  machineChipActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4338CA",
  },
  machineChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  machineChipTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    padding: 12,
    paddingBottom: 40,
    gap: 10,
  },
  emptyState: {
    marginTop: 60,
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
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
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 6,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },
});

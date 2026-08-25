import axios from "@/lib/axios";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
    ArrowLeft,
    CheckCircle2,
    CircleAlert,
    Clock3,
    Cpu,
    Hash,
    Layers3,
    PackageSearch,
    RotateCcw,
    Search,
    SlidersHorizontal,
    X,
} from "lucide-react-native";
import {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
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
type MachineScanStatus = Exclude<ScanStatus, "all">;

interface MachineSummary {
    machine_id: number;
    machine_name: string;
    machine_code: string;
    scan_type: string;
    sequence_no: number;
    is_optional: boolean;
    total_quantity: number;
    scanned_quantity: number;
    status: MachineScanStatus;
    scanned_at: string | null;
    last_scanned_at: string | null;
}

interface ProjectItemTrackingRow {
    id: number;
    item_name: string;
    description: string;
    unique_code: string | null;
    unique_code_2: string | null;
    qty: number;
    length: number | null;
    width: number | null;
    thickness: number | null;
    material_details: string;
    category_name: string | null;
    group_name: string | null;
    procurement: string | null;
    weight: number;
    item_status: string;
    scan_status: MachineScanStatus;
    assigned_machines_count: number;
    scanned_machines_count: number;
    machines: MachineSummary[];
}

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

const COLORS = {
    primary: "#177E73",
    primaryDark: "#10665E",
    primarySoft: "#E7F6F3",
    background: "#F4F7F9",
    card: "#FFFFFF",
    text: "#17212B",
    textMuted: "#667085",
    border: "#E3E8EF",
    scanned: "#16845B",
    scannedSoft: "#E8F7EF",
    pending: "#B96809",
    pendingSoft: "#FFF3DF",
    danger: "#D64545",
    midBg: "#4B3A34",
};

const firstParam = (value: string | string[] | undefined): string =>
    Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const formatNumber = (value: number): string =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);

const formatDateTime = (value: string | null): string => {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const getDimensions = (item: ProjectItemTrackingRow): string | null => {
    const values = [item.length, item.width, item.thickness];

    if (values.every((value) => value === null)) {
        return null;
    }

    return values
        .map((value) => (value === null ? "–" : formatNumber(value)))
        .join(" × ");
};

const InfoPill = memo(
    ({ label, value }: { label: string; value: string | number }) => (
        <View style={styles.infoPill}>
            <Text style={styles.infoPillLabel}>{label}</Text>
            <Text style={styles.infoPillValue} numberOfLines={1}>
                {value}
            </Text>
        </View>
    ),
);

InfoPill.displayName = "InfoPill";

const MachineRow = memo(
    ({
        machine,
        index,
    }: {
        machine: MachineSummary;
        index: number;
    }) => {
        const isScanned = machine.status === "scanned";

        const progressText = `${formatNumber(
            machine.scanned_quantity,
        )}/${formatNumber(machine.total_quantity)} scanned`;

        return (
            <View style={styles.machineRow}>
                <View style={styles.sequenceBadge}>
                    <Text style={styles.sequenceLabel}>STEP</Text>

                    {/* Display STEP 1, STEP 2, STEP 3... */}
                    <Text style={styles.sequenceValue}>{index + 1}</Text>
                </View>

                <View style={styles.machineMain}>
                    <View style={styles.machineTitleRow}>
                        <Text style={styles.machineName} numberOfLines={1}>
                            {machine.machine_name}
                        </Text>

                        <View
                            style={[
                                styles.machineStatusBadge,
                                isScanned
                                    ? styles.machineScannedBadge
                                    : styles.machinePendingBadge,
                            ]}
                        >
                            {isScanned ? (
                                <CheckCircle2 size={13} color={COLORS.scanned} />
                            ) : (
                                <Clock3 size={13} color={COLORS.pending} />
                            )}

                            <Text
                                style={[
                                    styles.machineStatusText,
                                    {
                                        color: isScanned
                                            ? COLORS.scanned
                                            : COLORS.pending,
                                    },
                                ]}
                            >
                                {isScanned ? "Scanned" : "Pending"}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.machineMeta} numberOfLines={1}>
                        {machine.machine_code} · {machine.scan_type}
                        {machine.is_optional ? " · Optional" : ""}
                    </Text>

                    {isScanned ? (
                        <Text style={styles.scannedDate}>
                            {formatDateTime(machine.scanned_at)}
                        </Text>
                    ) : (
                        <Text style={styles.pendingProgress}>
                            {progressText}
                        </Text>
                    )}
                </View>
            </View>
        );
    },
);

MachineRow.displayName = "MachineRow";

MachineRow.displayName = "MachineRow";

const ItemCard = memo(({ item }: { item: ProjectItemTrackingRow }) => {
    const isScanned = item.scan_status === "scanned";
    const dimensions = getDimensions(item);

    return (
        <View style={styles.itemCard}>
            <View
                style={[
                    styles.cardAccent,
                    { backgroundColor: isScanned ? COLORS.scanned : COLORS.pending },
                ]}
            />

            <View style={styles.cardContent}>
                <View style={styles.itemHeader}>
                    <View style={styles.itemTitleBlock}>
                        <Text style={styles.itemName} numberOfLines={2}>
                            {item.item_name}
                        </Text>

                        {!!item.unique_code && (
                            <View style={styles.codeRow}>
                                <Hash size={13} color={COLORS.textMuted} />
                                <Text style={styles.itemCode} numberOfLines={1}>
                                    {item.unique_code}
                                    {item.unique_code_2 ? ` · ${item.unique_code_2}` : ""}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View
                        style={[
                            styles.overallBadge,
                            isScanned ? styles.overallScanned : styles.overallPending,
                        ]}
                    >
                        {isScanned ? (
                            <CheckCircle2 size={14} color={COLORS.scanned} />
                        ) : (
                            <Clock3 size={14} color={COLORS.pending} />
                        )}
                        <Text
                            style={[
                                styles.overallBadgeText,
                                { color: isScanned ? COLORS.scanned : COLORS.pending },
                            ]}
                        >
                            {isScanned ? "Scanned" : "Pending"}
                        </Text>
                    </View>
                </View>

                {/* {!!item.description && (
          <Text style={styles.description} numberOfLines={3}>
            {item.description}
          </Text>
        )} */}

                <View style={styles.infoGrid}>
                    <InfoPill label="QUANTITY" value={formatNumber(item.qty)} />
                    {/* {!!item.category_name && (
            <InfoPill label="CATEGORY" value={item.category_name} />
          )} */}
                    {!!item.group_name && (
                        <InfoPill label="GROUP" value={item.group_name} />
                    )}
                    {/* {!!dimensions && <InfoPill label="L × W × T" value={dimensions} />}
          {item.weight > 0 && (
            <InfoPill label="WEIGHT" value={formatNumber(item.weight)} />
          )} */}
                    {/* {!!item.material_details && (
            <InfoPill label="MATERIAL" value={item.material_details} />
          )} */}
                </View>

                <View style={styles.machineSection}>
                    <View style={styles.machineSectionHeader}>
                        <View style={styles.machineHeadingLeft}>
                            <Cpu size={16} color={COLORS.primary} />
                            <Text style={styles.machineHeading}>Machine flow</Text>
                        </View>

                        <Text style={styles.machineCount}>
                            {item.scanned_machines_count}/{item.assigned_machines_count} complete
                        </Text>
                    </View>

                    {item.machines.length > 0 ? (
                        <View style={styles.machineList}>
                            {item.machines.map((machine, index) => (
                                <MachineRow
                                    key={`${machine.sequence_no}:${machine.machine_id}`}
                                    machine={machine}
                                    index={index}
                                />
                            ))}
                        </View>
                    ) : (
                        <View style={styles.unassignedBox}>
                            <CircleAlert size={17} color={COLORS.pending} />
                            <View style={styles.unassignedTextBlock}>
                                <Text style={styles.unassignedTitle}>No machine assigned</Text>
                                <Text style={styles.unassignedText}>
                                    Assign a machine flow to start tracking this item.
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
});

ItemCard.displayName = "ItemCard";

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
    const [showFilters, setShowFilters] = useState(false);

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
                            scanStatus,
                            machineId: machineId ?? undefined,
                        },
                        signal: options.signal,
                    },
                );

                if (options.version !== requestVersionRef.current) {
                    return;
                }

                setItems((current) => {
                    if (!append) return response.data.data;

                    const byId = new Map(current.map((item) => [item.id, item]));
                    response.data.data.forEach((item) => byId.set(item.id, item));
                    return Array.from(byId.values());
                });
                setPagination(response.data.pagination);
                setCounts(response.data.counts);
                setMachines(response.data.filterOptions.machines);
                setProjectName(response.data.project.project_name);
            } catch (requestError: any) {
                if (requestError?.code === "ERR_CANCELED") return;
                if (options.version !== requestVersionRef.current) return;

                const message =
                    requestError?.response?.data?.error ??
                    requestError?.message ??
                    "Unable to load project items";

                if (!append) {
                    setItems([]);
                    setPagination(EMPTY_PAGINATION);
                    setError(message);
                }
            } finally {
                if (options.version === requestVersionRef.current) {
                    setLoading(false);
                    setRefreshing(false);
                    setLoadingMore(false);
                    loadingMoreRef.current = false;
                }
            }
        },
        [debouncedSearch, machineId, projectId, scanStatus, vendorId],
    );

    useFocusEffect(
        useCallback(() => {
            const controller = new AbortController();
            const version = ++requestVersionRef.current;
            loadingMoreRef.current = false;

            if (
                !Number.isInteger(projectId) ||
                projectId <= 0 ||
                !Number.isInteger(vendorId) ||
                vendorId <= 0
            ) {
                setLoading(false);
                setError("Project or vendor information is missing");
                return () => {
                    controller.abort();
                    requestVersionRef.current += 1;
                };
            }

            void loadPage(1, {
                version,
                signal: controller.signal,
            });

            return () => {
                controller.abort();
                // Also invalidates an in-flight pagination or pull-to-refresh request.
                requestVersionRef.current += 1;
            };
        }, [loadPage, projectId, vendorId]),
    );

    const loadMore = useCallback(() => {
        const current = paginationRef.current;

        if (
            loading ||
            refreshing ||
            loadingMoreRef.current ||
            !current.hasNextPage
        ) {
            return;
        }

        void loadPage(current.page + 1, {
            append: true,
            version: requestVersionRef.current,
        });
    }, [loadPage, loading, refreshing]);

    const refresh = useCallback(() => {
        const version = ++requestVersionRef.current;
        loadingMoreRef.current = false;
        void loadPage(1, { refresh: true, version });
    }, [loadPage]);

    const retry = useCallback(() => {
        const version = ++requestVersionRef.current;
        void loadPage(1, { version });
    }, [loadPage]);

    const resetFilters = useCallback(() => {
        setSearchText("");
        setDebouncedSearch("");
        setScanStatus("all");
        setMachineId(null);
    }, []);

    const activeFilterCount =
        (debouncedSearch ? 1 : 0) +
        (scanStatus !== "all" ? 1 : 0) +
        (machineId !== null ? 1 : 0);

    const statusOptions = useMemo(
        () => [
            { key: "all" as const, label: "All", count: counts.all },
            { key: "scanned" as const, label: "Scanned", count: counts.scanned },
            { key: "pending" as const, label: "Pending", count: counts.pending },
        ],
        [counts],
    );

    const renderItem = useCallback(
        ({ item }: { item: ProjectItemTrackingRow }) => <ItemCard item={item} />,
        [],
    );

    const header = (
        <View>
            <View style={styles.summaryCard}>
                <View style={styles.summaryIcon}>
                    <Layers3 size={23} color={COLORS.primary} />
                </View>
                <View style={styles.summaryBody}>
                    <Text style={styles.summaryEyebrow}>PROJECT ITEM FLOW</Text>
                    <Text style={styles.summaryTitle} numberOfLines={2}>
                        {projectName || "Project items"}
                    </Text>
                    <Text style={styles.summarySubtitle}>
                        {counts.scanned} scanned · {counts.pending} pending
                    </Text>
                </View>
                <View style={styles.summaryCountBox}>
                    <Text style={styles.summaryCount}>{counts.all}</Text>
                    <Text style={styles.summaryCountLabel}>ITEMS</Text>
                </View>
            </View>

            <View style={styles.toolsRow}>
                <View style={styles.searchBox}>
                    <Search size={18} color="#98A2B3" />
                    <TextInput
                        value={searchText}
                        onChangeText={setSearchText}
                        placeholder="Search item, code or machine"
                        placeholderTextColor="#98A2B3"
                        style={styles.searchInput}
                        returnKeyType="search"
                        autoCapitalize="none"
                        autoCorrect={false}
                        accessibilityLabel="Search project items"
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearchText("")}
                            style={styles.clearSearchButton}
                            accessibilityRole="button"
                            accessibilityLabel="Clear search"
                        >
                            <X size={15} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        (showFilters || activeFilterCount > 0) && styles.filterButtonActive,
                    ]}
                    onPress={() => setShowFilters((current) => !current)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Toggle project item filters"
                    accessibilityState={{ expanded: showFilters }}
                >
                    <SlidersHorizontal
                        size={19}
                        color={
                            showFilters || activeFilterCount > 0
                                ? COLORS.primary
                                : COLORS.textMuted
                        }
                    />
                    {activeFilterCount > 0 && (
                        <View style={styles.filterCountBadge}>
                            <Text style={styles.filterCountText}>{activeFilterCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {showFilters && (
                <View style={styles.filterPanel}>
                    <View style={styles.filterPanelHeader}>
                        <Text style={styles.filterPanelTitle}>Filter items</Text>
                        {activeFilterCount > 0 && (
                            <TouchableOpacity
                                onPress={resetFilters}
                                style={styles.resetButton}
                                activeOpacity={0.75}
                            >
                                <RotateCcw size={13} color={COLORS.primary} />
                                <Text style={styles.resetText}>Reset</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text style={styles.filterLabel}>Scan status</Text>
                    <View style={styles.statusRow}>
                        {statusOptions.map((option) => {
                            const selected = scanStatus === option.key;

                            return (
                                <TouchableOpacity
                                    key={option.key}
                                    onPress={() => setScanStatus(option.key)}
                                    style={[
                                        styles.statusChip,
                                        selected && styles.statusChipSelected,
                                    ]}
                                    activeOpacity={0.8}
                                >
                                    <Text
                                        style={[
                                            styles.statusChipText,
                                            selected && styles.statusChipTextSelected,
                                        ]}
                                    >
                                        {option.label}
                                    </Text>
                                    <View
                                        style={[
                                            styles.statusChipCount,
                                            selected && styles.statusChipCountSelected,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.statusChipCountText,
                                                selected && styles.statusChipCountTextSelected,
                                            ]}
                                        >
                                            {option.count}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {machines.length > 0 && (
                        <>
                            <Text style={[styles.filterLabel, styles.machineFilterLabel]}>
                                Assigned machine
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.machineFilterScroll}
                            >
                                <TouchableOpacity
                                    onPress={() => setMachineId(null)}
                                    style={[
                                        styles.machineFilterChip,
                                        machineId === null && styles.machineFilterChipSelected,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.machineFilterText,
                                            machineId === null && styles.machineFilterTextSelected,
                                        ]}
                                    >
                                        All machines
                                    </Text>
                                </TouchableOpacity>

                                {machines.map((machine) => {
                                    const selected = machineId === machine.id;

                                    return (
                                        <TouchableOpacity
                                            key={machine.id}
                                            onPress={() => setMachineId(machine.id)}
                                            style={[
                                                styles.machineFilterChip,
                                                selected && styles.machineFilterChipSelected,
                                            ]}
                                        >
                                            <Cpu
                                                size={14}
                                                color={selected ? COLORS.primary : COLORS.textMuted}
                                            />
                                            <Text
                                                style={[
                                                    styles.machineFilterText,
                                                    selected && styles.machineFilterTextSelected,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {machine.machine_name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </>
                    )}
                </View>
            )}

            <View style={styles.resultsHeader}>
                <View>
                    <Text style={styles.resultsTitle}>
                        {pagination.total} {pagination.total === 1 ? "item" : "items"}
                    </Text>
                    <Text style={styles.resultsSubtitle}>
                        Showing machine checkpoints in process order
                    </Text>
                </View>
            </View>
        </View>
    );

    const empty = !loading ? (
        <View style={styles.emptyState}>
            {error ? (
                <CircleAlert size={33} color={COLORS.danger} />
            ) : (
                <PackageSearch size={38} color={COLORS.primary} />
            )}
            <Text style={styles.emptyTitle}>
                {error ? "Could not load items" : "No matching items"}
            </Text>
            <Text style={styles.emptyText}>
                {error
                    ? error
                    : activeFilterCount > 0
                        ? "Try changing or clearing your search and filters."
                        : "No cut-list items have been added to this project yet."}
            </Text>
            <TouchableOpacity
                style={styles.emptyAction}
                onPress={error ? retry : resetFilters}
                activeOpacity={0.8}
            >
                <Text style={styles.emptyActionText}>{error ? "Try again" : "Reset filters"}</Text>
            </TouchableOpacity>
        </View>
    ) : null;

    return (
        <View style={styles.screen}>
            <View style={styles.navbar}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <ArrowLeft size={21} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.navTitleBlock}>
                    <Text style={styles.navTitle} numberOfLines={1}>
                        Item Tracking
                    </Text>
                    <Text style={styles.navSubtitle} numberOfLines={1}>
                        {projectName || "Project machine progress"}
                    </Text>
                </View>
            </View>

            <FlatList
                data={loading ? [] : items}
                renderItem={renderItem}
                keyExtractor={(item) => String(item.id)}
                ListHeaderComponent={header}
                ListEmptyComponent={empty}
                ListFooterComponent={
                    loadingMore ? (
                        <View style={styles.footerLoader}>
                            <ActivityIndicator size="small" color={COLORS.primary} />
                            <Text style={styles.footerLoaderText}>Loading more items…</Text>
                        </View>
                    ) : items.length > 0 && !pagination.hasNextPage ? (
                        <Text style={styles.endText}>You have reached the end</Text>
                    ) : (
                        <View style={styles.footerSpacer} />
                    )
                }
                contentContainerStyle={[
                    styles.listContent,
                    items.length === 0 && !loading && styles.emptyListContent,
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onEndReached={loadMore}
                onEndReachedThreshold={0.35}
                initialNumToRender={PAGE_SIZE}
                maxToRenderPerBatch={PAGE_SIZE}
                updateCellsBatchingPeriod={50}
                windowSize={7}
                removeClippedSubviews={Platform.OS === "android"}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={refresh}
                        colors={[COLORS.primary]}
                        tintColor={COLORS.primary}
                    />
                }
            />

            {loading && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingTitle}>Loading item flow</Text>
                        <Text style={styles.loadingText}>
                            Fetching machine and scan progress…
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    navbar: {
        minHeight: 72,
        paddingTop: Platform.OS === "ios" ? 12 : 8,
        paddingHorizontal: 16,
        paddingBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.midBg,
    },

    backButton: {
        width: 40,
        height: 40,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.14)",
        marginRight: 12,
    },
    navTitleBlock: { flex: 1 },
    navTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
    navSubtitle: {
        color: "rgba(255,255,255,0.76)",
        fontSize: 12,
        marginTop: 2,
    },
    listContent: {
        paddingHorizontal: 14,
        paddingTop: 16,
        paddingBottom: 32,
    },
    emptyListContent: { flexGrow: 1 },
    summaryCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 18,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#101828",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
    },
    summaryIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.primarySoft,
        marginRight: 12,
    },
    summaryBody: { flex: 1, paddingRight: 8 },
    summaryEyebrow: {
        color: COLORS.primary,
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.8,
    },
    summaryTitle: {
        color: COLORS.text,
        fontSize: 17,
        lineHeight: 22,
        fontWeight: "800",
        marginTop: 3,
    },
    summarySubtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
    summaryCountBox: {
        minWidth: 58,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 13,
        backgroundColor: "#F1F5F7",
        alignItems: "center",
    },
    summaryCount: { color: COLORS.text, fontSize: 19, fontWeight: "900" },
    summaryCountLabel: {
        color: COLORS.textMuted,
        fontSize: 9,
        fontWeight: "800",
        marginTop: 1,
    },
    toolsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 14,
    },
    searchBox: {
        flex: 1,
        height: 48,
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        paddingHorizontal: 13,
        borderRadius: 14,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    searchInput: {
        flex: 1,
        height: "100%",
        color: COLORS.text,
        fontSize: 14,
        paddingVertical: 0,
    },
    clearSearchButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#F0F2F5",
        justifyContent: "center",
        alignItems: "center",
    },
    filterButton: {
        position: "relative",
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    filterButtonActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primarySoft,
    },
    filterCountBadge: {
        position: "absolute",
        top: -5,
        right: -5,
        minWidth: 19,
        height: 19,
        paddingHorizontal: 4,
        borderRadius: 10,
        backgroundColor: "#E5484D",
        borderWidth: 2,
        borderColor: COLORS.background,
        alignItems: "center",
        justifyContent: "center",
    },
    filterCountText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
    filterPanel: {
        marginTop: 10,
        padding: 14,
        borderRadius: 16,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    filterPanelHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 13,
    },
    filterPanelTitle: { color: COLORS.text, fontSize: 15, fontWeight: "800" },
    resetButton: { flexDirection: "row", alignItems: "center", gap: 5 },
    resetText: { color: COLORS.primary, fontSize: 12, fontWeight: "700" },
    filterLabel: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 0.3,
        marginBottom: 8,
    },
    statusRow: { flexDirection: "row", gap: 8 },
    statusChip: {
        flex: 1,
        minHeight: 40,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 8,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: "#FFFFFF",
    },
    statusChipSelected: {
        backgroundColor: COLORS.primarySoft,
        borderColor: COLORS.primary,
    },
    statusChipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "700" },
    statusChipTextSelected: { color: COLORS.primaryDark },
    statusChipCount: {
        minWidth: 21,
        height: 21,
        borderRadius: 11,
        paddingHorizontal: 5,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F0F2F5",
    },
    statusChipCountSelected: { backgroundColor: "#CFECE6" },
    statusChipCountText: { color: COLORS.textMuted, fontSize: 10, fontWeight: "800" },
    statusChipCountTextSelected: { color: COLORS.primaryDark },
    machineFilterLabel: { marginTop: 15 },
    machineFilterScroll: { gap: 8, paddingRight: 4 },
    machineFilterChip: {
        maxWidth: 180,
        minHeight: 38,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: "#FFFFFF",
    },
    machineFilterChipSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primarySoft,
    },
    machineFilterText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "700" },
    machineFilterTextSelected: { color: COLORS.primaryDark },
    resultsHeader: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginTop: 20,
        marginBottom: 11,
        paddingHorizontal: 2,
    },
    resultsTitle: { color: COLORS.text, fontSize: 18, fontWeight: "900" },
    resultsSubtitle: { color: COLORS.textMuted, fontSize: 11, marginTop: 3 },
    itemCard: {
        position: "relative",
        overflow: "hidden",
        marginBottom: 14,
        borderRadius: 18,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#101828",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.055,
        shadowRadius: 10,
        elevation: 2,
    },
    cardAccent: { position: "absolute", top: 0, bottom: 0, left: 0, width: 5 },
    cardContent: { padding: 15, paddingLeft: 18 },
    itemHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    itemTitleBlock: { flex: 1 },
    itemName: { color: COLORS.text, fontSize: 16, lineHeight: 21, fontWeight: "800" },
    codeRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 5 },
    itemCode: { flex: 1, color: COLORS.textMuted, fontSize: 11, fontWeight: "600" },
    overallBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 9,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    overallScanned: { backgroundColor: COLORS.scannedSoft, borderColor: "#BDE8CF" },
    overallPending: { backgroundColor: COLORS.pendingSoft, borderColor: "#F4D29B" },
    overallBadgeText: { fontSize: 10, fontWeight: "800" },
    description: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18, marginTop: 11 },
    infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
    infoPill: {
        maxWidth: "100%",
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 6,
        borderRadius: 9,
        backgroundColor: "#F6F8FA",
        borderWidth: 1,
        borderColor: "#EDF0F3",
    },
    infoPillLabel: { color: "#98A2B3", fontSize: 8, fontWeight: "900" },
    infoPillValue: { color: COLORS.text, fontSize: 10, fontWeight: "700", maxWidth: 150 },
    machineSection: {
        marginTop: 15,
        paddingTop: 13,
        borderTopWidth: 1,
        borderTopColor: "#EDF0F3",
    },
    machineSectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 9,
    },
    machineHeadingLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
    machineHeading: { color: COLORS.text, fontSize: 12, fontWeight: "800" },
    machineCount: { color: COLORS.textMuted, fontSize: 10, fontWeight: "700" },
    machineList: { gap: 8 },
    machineRow: {
        flexDirection: "row",
        alignItems: "center",
        minHeight: 68,
        padding: 10,
        borderRadius: 13,
        backgroundColor: "#F8FAFB",
        borderWidth: 1,
        borderColor: "#E9EDF1",
    },
    sequenceBadge: {
        width: 41,
        height: 43,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primarySoft,
        marginRight: 10,
    },
    sequenceLabel: { color: COLORS.primary, fontSize: 7, fontWeight: "900", letterSpacing: 0.5 },
    sequenceValue: { color: COLORS.primaryDark, fontSize: 16, fontWeight: "900" },
    machineMain: { flex: 1 },
    machineTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
    machineName: { flex: 1, color: COLORS.text, fontSize: 12, fontWeight: "800" },
    machineStatusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 7,
        paddingVertical: 4,
        borderRadius: 12,
    },
    machineScannedBadge: { backgroundColor: COLORS.scannedSoft },
    machinePendingBadge: { backgroundColor: COLORS.pendingSoft },
    machineStatusText: { fontSize: 9, fontWeight: "800" },
    machineMeta: { color: COLORS.textMuted, fontSize: 9, fontWeight: "600", marginTop: 4 },
    scannedDate: { color: COLORS.scanned, fontSize: 10, fontWeight: "700", marginTop: 4 },
    pendingProgress: { color: COLORS.pending, fontSize: 10, fontWeight: "700", marginTop: 4 },
    unassignedBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 9,
        padding: 11,
        borderRadius: 12,
        backgroundColor: COLORS.pendingSoft,
        borderWidth: 1,
        borderColor: "#F4D29B",
    },
    unassignedTextBlock: { flex: 1 },
    unassignedTitle: { color: COLORS.pending, fontSize: 11, fontWeight: "800" },
    unassignedText: { color: "#8B5B22", fontSize: 10, lineHeight: 15, marginTop: 2 },
    emptyState: {
        flex: 1,
        minHeight: 330,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 30,
    },
    emptyTitle: { color: COLORS.text, fontSize: 17, fontWeight: "800", marginTop: 12 },
    emptyText: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 5 },
    emptyAction: {
        marginTop: 15,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 11,
        backgroundColor: COLORS.primarySoft,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    emptyActionText: { color: COLORS.primaryDark, fontSize: 12, fontWeight: "800" },
    footerLoader: {
        minHeight: 64,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 9,
    },
    footerLoaderText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "600" },
    endText: { color: "#98A2B3", fontSize: 11, textAlign: "center", paddingVertical: 18 },
    footerSpacer: { height: 18 },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(244,247,249,0.82)",
    },
    loadingCard: {
        minWidth: 210,
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 22,
        borderRadius: 18,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#101828",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 7,
    },
    loadingTitle: { color: COLORS.text, fontSize: 14, fontWeight: "800", marginTop: 12 },
    loadingText: { color: COLORS.textMuted, fontSize: 10, marginTop: 4 },
});

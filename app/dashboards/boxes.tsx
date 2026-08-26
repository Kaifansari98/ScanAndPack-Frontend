import Loader from "@/components/generic/Loader";
import { ProjectCard } from "@/components/ItemCards/ProjectCard";
import { AddBoxModal } from "@/components/modals/AddBoxModal";
import { UpdateBoxModal } from "@/components/modals/UpdateBoxModal";
import { useToast } from "@/components/Notification/ToastProvider";
import { colors } from "@/components/theme/colors";
import { commonStyles } from "@/components/theme/commonStyles";
import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
import { fetchBoxtDetailsAndShare } from "@/utils/BoxPdfUtils";
import {
  fetchAllBoxesPdfAndShare,
  fetchProjectDetailsAndShare,
  fetchProjectFullReportAndShare,
} from "@/utils/projectPdfUtils";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import {
  ArrowLeft,
  Box,
  ChevronRight,
  Download,
  ListChecks,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  SquarePen,
  X,
} from "lucide-react-native";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSelector } from "react-redux";

interface Project {
  id: number;
  vendor_id: number;
  lead_id: number;
}

type BoxInfoValue = {
  id?: number;
  field_id: number;
  field_label: string;
  field_key: string;
  field_type: string;
  field_value: string;
  is_required?: boolean;
  sort_order?: number;
};

interface ProjectDetailsResponse {
  id: number;
  vendor_id: number;
  lead_id: number;
  project_status: string;
  project_name: string;
  estimated_completion_date: string;
  total_items: number;
  total_packed: number;
  total_unpaked: number;
  total_weight: number;
  project_details_id: number | null;
  machine_id: number;
  machine_name: string;
}

interface BoxItem {
  id: number;
  name: string;
  box_status: "packed" | "unpacked" | string;
  items_count: number;
  details: any;
  project_id: number;
  vendor_id: number;
  lead_id: number;
  machine_id: number | null;
  machine_name: string;
  box_info_values: BoxInfoValue[];
  weight?: number;
}

type PackingStatusFilter = "all" | "packed" | "unpacked";

interface BoxPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface BoxCounts {
  all: number;
  packed: number;
  unpacked: number;
  projectTotal: number;
}

interface PaginatedBoxesResponse {
  data: any[];
  pagination: BoxPaginationMeta;
  counts: BoxCounts;
}

const BOX_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

const DEFAULT_PAGINATION: BoxPaginationMeta = {
  page: 1,
  limit: BOX_PAGE_SIZE,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

const DEFAULT_COUNTS: BoxCounts = {
  all: 0,
  packed: 0,
  unpacked: 0,
  projectTotal: 0,
};

const normalizePackingStatus = (status: string) =>
  String(status || "")
    .trim()
    .replace(/[\s_-]/g, "")
    .toLowerCase();

const isCanceledRequest = (error: any) =>
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.name === "AbortError";

const mapApiBox = (box: any): BoxItem => ({
  id: Number(box.id),
  name: box.box_name ?? box.name ?? "Unnamed Box",
  box_status: box.box_status ?? "unpacked",
  items_count: Number(box.items_count ?? 0),
  details: box.details,
  project_id: Number(box.project_id),
  vendor_id: Number(box.vendor_id),
  lead_id: Number(box.lead_id ?? 0),
  machine_id: box.machine_id ? Number(box.machine_id) : null,
  machine_name: box.machine_name ?? "",
  box_info_values: box.box_info_values ?? [],
  weight: Number(box.weight ?? 0),
});

// ─── Confirm Modal ────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  type?: "delete" | "download" | "edit";
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  type = "download",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmBg = type === "delete" ? "#E63946" : "#2A9D8F";
  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={cmStyles.overlay}>
        <TouchableOpacity
          style={cmStyles.backdrop}
          activeOpacity={1}
          onPress={onCancel}
        />
        <View style={cmStyles.sheet}>
          <View style={cmStyles.handle} />
          <TouchableOpacity
            style={cmStyles.closeBtn}
            onPress={onCancel}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={18} color="#6B7280" />
          </TouchableOpacity>
          <Text style={cmStyles.title}>{title}</Text>
          <Text style={cmStyles.message}>{message}</Text>
          <View style={cmStyles.btnRow}>
            <TouchableOpacity
              style={[cmStyles.btn, cmStyles.btnCancel]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={cmStyles.btnCancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[cmStyles.btn, { backgroundColor: confirmBg }]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={cmStyles.btnConfirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const cmStyles = StyleSheet.create({
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
    backgroundColor: "white",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 48 : 32,
    paddingTop: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    marginBottom: 16,
  },
  closeBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 20,
  },
  btnRow: { flexDirection: "row", gap: 12, width: "100%" },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancel: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  btnCancelText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  btnConfirmText: { fontSize: 15, fontWeight: "700", color: "white" },
});

// ─── Box Card ─────────────────────────────────────────────────────────────────

const BoxCard = memo(
  function BoxCard({
    box,
    index,
    handleDownload,
    handleEditPress,
    machine_id,
    machine_name,
  }: {
    box: BoxItem;
    index: number;
    handleDownload: () => void;
    handleEditPress: () => void;
    machine_id: number | null;
    machine_name: string;
  }) {
    const router = useRouter();
    const { showToast } = useToast();
    const cardOpacity = useSharedValue(0);
    const cardTranslateY = useSharedValue(24);
    const scale = useSharedValue(1);

    const visibleBoxInfoValues =
      box.box_info_values?.filter(
        (item) => item.field_value && String(item.field_value).trim(),
      ) || [];

    useEffect(() => {
      const delay = Math.min(index, 6) * 45;
      cardOpacity.value = withDelay(
        delay,
        withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) }),
      );
      cardTranslateY.value = withDelay(
        delay,
        withSpring(0, { damping: 18, stiffness: 130 }),
      );
    }, [index]);

    const animatedCardStyle = useAnimatedStyle(() => ({
      opacity: cardOpacity.value,
      transform: [{ translateY: cardTranslateY.value }, { scale: scale.value }],
    }));

    const isPacked = normalizePackingStatus(box.box_status) === "packed";
    const isEmpty = box.items_count === 0;

    const handleNavigate = () => {
      router.push({
        pathname: "./boxItemsScreen",
        params: {
          payload: JSON.stringify({
            project_id: box.project_id,
            vendor_id: box.vendor_id,
            id: box.id,
            machine_id,
            machine_name,
          }),
        },
      });
    };

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPressIn={() => {
          scale.value = withSpring(0.97);
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
        }}
        onPress={handleNavigate}
      >
        <Animated.View style={[animatedCardStyle, boxStyles.card]}>
          <View
            style={[
              boxStyles.accentStrip,
              {
                backgroundColor: isPacked ? "#2A9D8F" : "#F4A261",
              },
            ]}
          />

          <View style={boxStyles.cardBody}>
            <View style={boxStyles.headerRow}>
              <View
                style={[
                  boxStyles.iconWrap,
                  {
                    backgroundColor: isPacked ? "#E6F7F5" : "#FFF8EE",
                  },
                ]}
              >
                <Package size={18} color={isPacked ? "#2A9D8F" : "#F4A261"} />
              </View>

              <Text style={boxStyles.boxName} numberOfLines={1}>
                {box.name}
              </Text>

              <View
                style={[
                  boxStyles.statusPill,
                  {
                    backgroundColor: isPacked ? "#E6F7F5" : "#FFF8EE",
                  },
                ]}
              >
                <Text
                  style={[
                    boxStyles.statusPillText,
                    {
                      color: isPacked ? "#1A7A70" : "#C15C0A",
                    },
                  ]}
                >
                  {isPacked ? "Packed" : "Unpacked"}
                </Text>
              </View>
            </View>

            {visibleBoxInfoValues.length > 0 && (
              <View style={boxStyles.dynamicInfoWrap}>
                {visibleBoxInfoValues.map((item) => (
                  <View
                    key={`${box.id}-${item.field_id}`}
                    style={boxStyles.dynamicInfoChip}
                  >
                    <Text style={boxStyles.dynamicInfoLabel}>
                      {item.field_label}
                    </Text>

                    <Text style={boxStyles.dynamicInfoValue} numberOfLines={1}>
                      {item.field_value}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={boxStyles.footerRow}>
              <View style={boxStyles.countChip}>
                <Box size={13} color="#6B7280" />

                <Text style={boxStyles.countChipText}>
                  {box.items_count} {box.items_count === 1 ? "item" : "items"}
                </Text>
              </View>

              <View style={boxStyles.actions}>
                <TouchableOpacity
                  style={boxStyles.actionBtn}
                  onPress={() =>
                    isEmpty
                      ? showToast("warning", "Download Failed, Box is empty")
                      : handleDownload()
                  }
                  hitSlop={{
                    top: 8,
                    bottom: 8,
                    left: 8,
                    right: 8,
                  }}
                >
                  <Download size={17} color="#6B7280" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={boxStyles.actionBtn}
                  onPress={handleEditPress}
                  hitSlop={{
                    top: 8,
                    bottom: 8,
                    left: 8,
                    right: 8,
                  }}
                >
                  <SquarePen size={17} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  },
  (previous, next) =>
    previous.box === next.box &&
    previous.index === next.index &&
    previous.machine_id === next.machine_id &&
    previous.machine_name === next.machine_name,
);

const boxStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  accentStrip: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  boxName: { flex: 1, fontSize: 14, fontWeight: "700", color: "#111827" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontWeight: "700" },
  metaRow: { flexDirection: "row" },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flex: 1,
  },
  metaChipLabel: { fontSize: 11, color: "#9CA3AF" },
  metaChipValue: { fontSize: 11, fontWeight: "600", color: "#374151", flex: 1 },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countChipText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  actions: { flexDirection: "row", gap: 4 },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  dynamicInfoWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },

  dynamicInfoChip: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "100%",
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  dynamicInfoLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "700",
    marginRight: 4,
  },

  dynamicInfoValue: {
    fontSize: 11,
    color: "#374151",
    fontWeight: "800",
    maxWidth: 120,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BoxesScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const { showToast } = useToast();
  const { id, lead_id, vendor_id } = useLocalSearchParams();
  const router = useRouter();

  const project: Project = {
    id: Number(id),
    lead_id: Number(lead_id),
    vendor_id: Number(vendor_id),
  };

  const [projectDetails, setProjectDetails] =
    useState<ProjectDetailsResponse | null>(null);
  const [showGlobalLoader, setShowGlobalLoader] = useState(false);
  const [boxes, setBoxes] = useState<BoxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [pagination, setPagination] =
    useState<BoxPaginationMeta>(DEFAULT_PAGINATION);
  const [boxCounts, setBoxCounts] = useState<BoxCounts>(DEFAULT_COUNTS);
  const [creatingBox, setCreatingBox] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [packingStatusFilter, setPackingStatusFilter] =
    useState<PackingStatusFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  const [selectedBox, setSelectedBox] = useState<BoxItem | null>(null);
  const [selectedBoxForEdit, setSelectedBoxForEdit] = useState<BoxItem | null>(
    null,
  );

  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProjectDownloadModal, setShowProjectDownloadModal] =
    useState(false);
  const [showAllBoxesDownloadModal, setShowAllBoxesDownloadModal] =
    useState(false); // ← new

  const sheetRef = useRef<any>(null);
  const updateSheetRef = useRef<any>(null);
  const boxesRequestControllerRef = useRef<AbortController | null>(null);
  const projectRequestControllerRef = useRef<AbortController | null>(null);
  const currentPageRef = useRef(1);
  const hasNextPageRef = useRef(false);
  const initialLoadingRef = useRef(true);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchBoxes = useCallback(
    async ({
      pageNumber = 1,
      append = false,
      silent = false,
    }: {
      pageNumber?: number;
      append?: boolean;
      silent?: boolean;
    } = {}) => {
      if (append) {
        if (
          initialLoadingRef.current ||
          loadingMoreRef.current ||
          !hasNextPageRef.current
        ) {
          return;
        }

        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        boxesRequestControllerRef.current?.abort();
        loadingMoreRef.current = false;
        setLoadingMore(false);
        initialLoadingRef.current = true;
        setLoadError(false);
        setBoxes([]);

        if (!silent) {
          setLoading(true);
        }
      }

      const controller = new AbortController();
      boxesRequestControllerRef.current = controller;

      try {
        const res = await axios.get<PaginatedBoxesResponse>(
          `/boxes/vendor/v1/${project.vendor_id}/project/${project.id}`,
          {
            params: {
              page: pageNumber,
              limit: BOX_PAGE_SIZE,
              search: debouncedSearch || undefined,
              packingStatus: packingStatusFilter,
            },
            signal: controller.signal,
          },
        );

        const responseData: any = res.data;
        const rows = Array.isArray(responseData)
          ? responseData
          : (responseData?.data ?? []);
        const mappedBoxes = rows.map(mapApiBox);

        setBoxes((previous) => {
          if (!append) return mappedBoxes;

          const existingIds = new Set(previous.map((box) => box.id));
          const newBoxes = mappedBoxes.filter(
            (box: BoxItem) => !existingIds.has(box.id),
          );
          return [...previous, ...newBoxes];
        });

        const nextPagination: BoxPaginationMeta = responseData?.pagination ?? {
          page: pageNumber,
          limit: BOX_PAGE_SIZE,
          total: mappedBoxes.length,
          totalPages: mappedBoxes.length === 0 ? 0 : pageNumber,
          hasNextPage: mappedBoxes.length === BOX_PAGE_SIZE,
          hasPreviousPage: pageNumber > 1,
        };

        const nextCounts: BoxCounts = responseData?.counts ?? {
          all: mappedBoxes.length,
          packed: mappedBoxes.filter(
            (box: BoxItem) =>
              normalizePackingStatus(box.box_status) === "packed",
          ).length,
          unpacked: mappedBoxes.filter(
            (box: BoxItem) =>
              normalizePackingStatus(box.box_status) === "unpacked",
          ).length,
          projectTotal: mappedBoxes.length,
        };

        if (nextCounts.projectTotal === undefined) {
          nextCounts.projectTotal = nextCounts.all;
        }

        currentPageRef.current = nextPagination.page;
        hasNextPageRef.current = nextPagination.hasNextPage;
        setPagination(nextPagination);
        setBoxCounts(nextCounts);
        setLoadError(false);
      } catch (error: any) {
        if (!isCanceledRequest(error)) {
          console.error("Failed to fetch boxes:", error);
          setLoadError(true);
          showToast(
            "error",
            error?.response?.data?.error || "Failed to load boxes",
          );
        }
      } finally {
        if (boxesRequestControllerRef.current === controller) {
          boxesRequestControllerRef.current = null;

          if (append) {
            loadingMoreRef.current = false;
            setLoadingMore(false);
          } else {
            initialLoadingRef.current = false;
            setLoading(false);
          }
        }
      }
    },
    [
      debouncedSearch,
      packingStatusFilter,
      project.id,
      project.vendor_id,
      showToast,
    ],
  );

  const onAdd = useCallback(() => {
    void fetchBoxes({ pageNumber: 1 });
  }, [fetchBoxes]);

  const fetchProjectDetails = useCallback(async () => {
    const controller = new AbortController();
    projectRequestControllerRef.current?.abort();
    projectRequestControllerRef.current = controller;
    setShowGlobalLoader(true);

    try {
      const res = await axios.get(`/projects/${project.id}`, {
        signal: controller.signal,
      });
      const data = res.data;
      const rawDate = data.details?.[0]?.estimated_completion_date || null;
      const formatDate = (d: string | null) =>
        d
          ? new Date(d).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "N/A";

      setProjectDetails({
        id: data.id,
        project_status: data.project_status,
        project_name: data.project_name,
        total_items: data.totals.total_items,
        total_packed: data.totals.total_packed,
        total_unpaked: data.totals.total_unpacked,
        total_weight: data.totals.total_weight,
        vendor_id: data.vendor_id,
        lead_id: data.lead_id,
        estimated_completion_date: formatDate(rawDate),
        project_details_id: data.details[0]?.id,
        machine_id: data.machine_id,
        machine_name: data.machine_name,
      });
    } catch (error: any) {
      if (!isCanceledRequest(error)) {
        showToast("error", "Failed to load project details");
      }
    } finally {
      if (projectRequestControllerRef.current === controller) {
        projectRequestControllerRef.current = null;
        setShowGlobalLoader(false);
      }
    }
  }, [project.id, showToast]);

  useFocusEffect(
    useCallback(() => {
      void fetchProjectDetails();

      return () => {
        projectRequestControllerRef.current?.abort();
        projectRequestControllerRef.current = null;
      };
    }, [fetchProjectDetails]),
  );

  useFocusEffect(
    useCallback(() => {
      void fetchBoxes({ pageNumber: 1 });

      return () => {
        boxesRequestControllerRef.current?.abort();
        boxesRequestControllerRef.current = null;
        initialLoadingRef.current = false;
        loadingMoreRef.current = false;
      };
    }, [fetchBoxes]),
  );

  const addButtonScale = useSharedValue(1);
  const animatedAddButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addButtonScale.value }],
  }));

  const handleEdit = (box: BoxItem) => {
    setSelectedBoxForEdit(box);
    setShowEditModal(true);
  };

  const handleDownload = (box: BoxItem) => {
    setSelectedBox({
      ...box,
      machine_id: projectDetails?.machine_id ?? box.machine_id,
      machine_name: projectDetails?.machine_name ?? box.machine_name,
    });
    setShowDownloadModal(true);
  };

  const handleConfirmEdit = () => {
    setShowEditModal(false);
    setTimeout(() => {
      updateSheetRef.current?.present();
    }, 300);
    void fetchProjectDetails();
  };

  const handleConfirmDownload = async () => {
    setShowDownloadModal(false);
    setShowGlobalLoader(true);
    try {
      if (selectedBox) await fetchBoxtDetailsAndShare(selectedBox);
    } catch (err: any) {
      //console.log("Download Error:", err.message);
    } finally {
      setShowGlobalLoader(false);
    }
  };

  const handleConfirmProjectDownload = async () => {
    setShowProjectDownloadModal(false);
    setShowGlobalLoader(true);
    try {
      await fetchProjectDetailsAndShare(project);
    } catch (err: any) {
      //console.log("Download Error:", err.message);
    } finally {
      setShowGlobalLoader(false);
    }
  };

  // ── All boxes PDF ──────────────────────────────────────────────────────────
  const handleConfirmAllBoxesDownload = async () => {
    setShowAllBoxesDownloadModal(false);
    setShowGlobalLoader(true);
    try {
      await fetchProjectFullReportAndShare({
        id: project.id,
        vendor_id: project.vendor_id,
      });
      showToast("success", "Full report PDF ready to share!");
    } catch (err: any) {
      showToast("error", err?.message || "Failed to download boxes PDF");
    } finally {
      setShowGlobalLoader(false);
    }
  };

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMoreRef.current || !hasNextPageRef.current) {
      return;
    }

    void fetchBoxes({
      pageNumber: currentPageRef.current + 1,
      append: true,
    });
  }, [fetchBoxes, loading]);

  const handleRetry = useCallback(() => {
    void fetchBoxes({ pageNumber: 1 });
  }, [fetchBoxes]);

  const packedCount = boxCounts.packed;
  const unpackedCount = boxCounts.unpacked;

  const hasActiveFilters =
    searchQuery.trim().length > 0 || packingStatusFilter !== "all";

  const activeFilterCount =
    (searchQuery.trim().length > 0 ? 1 : 0) +
    (packingStatusFilter !== "all" ? 1 : 0);

  const noBoxesExist = boxCounts.projectTotal === 0;

  if (!projectDetails) return <Loader />;

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
          <Text style={commonStyles.navbarTitle} numberOfLines={1}>
            {projectDetails.project_name}
          </Text>
          <Text style={commonStyles.navbarSubtitle}>Project Details</Text>
        </View>
        {/* <TouchableOpacity
          style={commonStyles.navbarBackBtn}
          onPress={() => router.push("/scanner")}
          activeOpacity={0.8}
        >
          <ScanLine size={20} color={colors.white} />
        </TouchableOpacity> */}
        {/* <TouchableOpacity
          style={commonStyles.navbarBackBtn}
          onPress={() => {
            if (!projectDetails) return;
            router.push({
              pathname: "/scanner-track-trace",
              params: {
                project_id: String(project.id),
                vendor_id: String(project.vendor_id),
                machine_id: String(projectDetails.machine_id ?? ""),
                machine_name: String(projectDetails.machine_name ?? ""),
              },
            });
          }}
          activeOpacity={0.8}
        >
          <ScanLine size={20} color={colors.white} />
        </TouchableOpacity> */}
      </View>

      <FlatList
        data={loading ? [] : boxes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <BoxCard
            box={item}
            index={index}
            machine_id={projectDetails.machine_id}
            machine_name={projectDetails.machine_name}
            handleDownload={() => handleDownload(item)}
            handleEditPress={() => handleEdit(item)}
          />
        )}
        contentContainerStyle={[
          styles.scrollContent,
          boxes.length === 0 && !loading && styles.scrollContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.35}
        initialNumToRender={BOX_PAGE_SIZE}
        maxToRenderPerBatch={BOX_PAGE_SIZE}
        windowSize={7}
        removeClippedSubviews={Platform.OS === "android"}
        ListHeaderComponent={
          <>
            <ProjectCard
              project={{
                id: project.id,
                vendor_id: project.vendor_id,
                projectName: projectDetails.project_name,
                totalNoItems: projectDetails.total_items,
                unpackedItems: projectDetails.total_unpaked,
                packedItems: projectDetails.total_packed,
                status: projectDetails.project_status,
                date: projectDetails.estimated_completion_date,
                lead_id: projectDetails.lead_id,
              }}
              index={0}
              disableNavigation
              onDownloadPress={() => setShowProjectDownloadModal(true)}
            />

            <TouchableOpacity
              style={styles.projectItemsButton}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="View project item tracking"
              onPress={() =>
                router.push({
                  pathname: "/dashboards/project-item-tracking",
                  params: {
                    project_id: String(project.id),
                    vendor_id: String(project.vendor_id),
                    project_name: projectDetails.project_name,
                  },
                })
              }
            >
              <View style={styles.projectItemsIcon}>
                <ListChecks size={21} color="#177E73" />
              </View>

              <View style={styles.projectItemsTextBlock}>
                <Text style={styles.projectItemsTitle}>View Item Tracking</Text>
                <Text style={styles.projectItemsSubtitle} numberOfLines={1}>
                  Items, assigned machines and scan progress
                </Text>
              </View>

              <ChevronRight size={20} color="#177E73" />
            </TouchableOpacity>

            <View style={styles.boxesSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleBlock}>
                  <Text style={styles.sectionTitle}>
                    {hasActiveFilters
                      ? `${pagination.total} Matching ${pagination.total === 1 ? "Box" : "Boxes"}`
                      : `${boxCounts.projectTotal} ${boxCounts.projectTotal === 1 ? "Box" : "Boxes"}`}
                  </Text>

                  {boxCounts.all > 0 && (
                    <Text style={styles.sectionSubtitle}>
                      {packedCount} packed · {unpackedCount} unpacked
                    </Text>
                  )}
                </View>

                <View style={styles.sectionHeaderActions}>
                  <TouchableOpacity
                    style={[
                      styles.filterToggleBtn,
                      (showFilters || hasActiveFilters) &&
                        styles.filterToggleBtnActive,
                    ]}
                    onPress={() => setShowFilters((current) => !current)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showFilters ? "Hide box filters" : "Show box filters"
                    }
                    accessibilityState={{ expanded: showFilters }}
                  >
                    <SlidersHorizontal
                      size={18}
                      color={
                        showFilters || hasActiveFilters ? "#1A7A70" : "#6B7280"
                      }
                    />

                    {activeFilterCount > 0 && (
                      <View style={styles.activeFilterBadge}>
                        <Text style={styles.activeFilterBadgeText}>
                          {activeFilterCount}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {boxCounts.projectTotal > 0 && (
                    <TouchableOpacity
                      style={styles.downloadAllBtn}
                      onPress={() => setShowAllBoxesDownloadModal(true)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Download size={15} color="#2A9D8F" />
                      <Text style={styles.downloadAllText}>Download All</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {showFilters && (
                <View style={styles.searchFilterCard}>
                  <View style={styles.searchInputWrap}>
                    <Search size={18} color="#9CA3AF" />

                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Search boxes"
                      placeholderTextColor="#9CA3AF"
                      style={styles.searchInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="search"
                      accessibilityLabel="Search boxes"
                    />

                    {searchQuery.length > 0 && (
                      <TouchableOpacity
                        style={styles.clearSearchBtn}
                        onPress={() => setSearchQuery("")}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel="Clear box search"
                      >
                        <X size={16} color="#6B7280" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.filterHeaderRow}>
                    <Text style={styles.filterLabel}>Packing Status</Text>

                    {hasActiveFilters && (
                      <TouchableOpacity
                        onPress={() => {
                          setSearchQuery("");
                          setPackingStatusFilter("all");
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.resetFilterText}>Reset</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.statusFilterRow}>
                    {(
                      [
                        { label: `All (${boxCounts.all})`, value: "all" },
                        { label: `Packed (${packedCount})`, value: "packed" },
                        {
                          label: `Unpacked (${unpackedCount})`,
                          value: "unpacked",
                        },
                      ] as Array<{
                        label: string;
                        value: PackingStatusFilter;
                      }>
                    ).map((option) => {
                      const isSelected = packingStatusFilter === option.value;

                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.statusFilterChip,
                            isSelected && styles.statusFilterChipActive,
                          ]}
                          onPress={() => setPackingStatusFilter(option.value)}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                        >
                          <Text
                            style={[
                              styles.statusFilterChipText,
                              isSelected && styles.statusFilterChipTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.initialLoader}>
              <Loader />
            </View>
          ) : loadError ? (
            <View style={styles.emptyState}>
              <View style={styles.noResultsIcon}>
                <X size={26} color="#E63946" />
              </View>
              <Text style={styles.emptyTitle}>Unable to load boxes</Text>
              <Text style={styles.emptySubtitle}>
                Check your connection and try again
              </Text>
              <TouchableOpacity
                style={styles.emptyResetBtn}
                onPress={handleRetry}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyResetBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyState}>
              {noBoxesExist ? (
                <LottieView
                  source={require("@/assets/animations/emptyBox.json")}
                  autoPlay
                  loop={false}
                  style={styles.lottie}
                />
              ) : (
                <View style={styles.noResultsIcon}>
                  <Search size={26} color="#9CA3AF" />
                </View>
              )}

              <Text style={styles.emptyTitle}>
                {noBoxesExist ? "No boxes yet" : "No matching boxes"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {noBoxesExist
                  ? 'Tap "Add Box" to create your first box'
                  : "Try another search or packing status"}
              </Text>

              {!noBoxesExist && hasActiveFilters && (
                <TouchableOpacity
                  style={styles.emptyResetBtn}
                  onPress={() => {
                    setSearchQuery("");
                    setPackingStatusFilter("all");
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyResetBtnText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.paginationLoader}>
              <ActivityIndicator size="small" color="#2A9D8F" />
              <Text style={styles.paginationLoaderText}>
                Loading more boxes...
              </Text>
            </View>
          ) : boxes.length > 0 && !pagination.hasNextPage ? (
            <Text style={styles.endOfListText}>
              All {pagination.total} boxes loaded
            </Text>
          ) : (
            <View style={styles.listFooterSpacer} />
          )
        }
      />

      {showGlobalLoader && (
        <View style={styles.loaderOverlay}>
          <Loader />
        </View>
      )}

      {/* ── Add Box FAB ── */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => sheetRef.current?.present()}
          onPressIn={() => {
            addButtonScale.value = withSpring(0.95);
          }}
          onPressOut={() => {
            addButtonScale.value = withSpring(1);
          }}
        >
          <Animated.View style={animatedAddButtonStyle}>
            <LinearGradient
              colors={["#111827", "#374151"]}
              style={styles.fabButton}
            >
              <Plus size={22} color="#fff" />
              <Text style={styles.fabText}>Add Box</Text>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {creatingBox && (
        <View style={styles.loaderOverlay}>
          <Loader />
        </View>
      )}

      {/* ── Modals ── */}
      {!creatingBox && (
        <AddBoxModal
          ref={sheetRef}
          onSubmit={onAdd}
          project={{
            id: projectDetails.id,
            vendor_id: projectDetails.vendor_id,
            project_details_id: projectDetails.project_details_id,
            lead_id: projectDetails.lead_id,
            machine_id: projectDetails.machine_id, // ← add this
            machine_name: projectDetails.machine_name, // ← add this
          }}
          setCreatingBox={setCreatingBox}
        />
      )}

      {selectedBoxForEdit && (
        <UpdateBoxModal
          ref={updateSheetRef}
          setLoading={setShowGlobalLoader}
          box={selectedBoxForEdit}
          onSubmit={(updatedName, updatedBox) => {
            setBoxes((prev) =>
              prev.map((b) =>
                b.id === selectedBoxForEdit.id
                  ? {
                      ...b,
                      name: updatedName,
                      box_info_values:
                        updatedBox?.box_info_values || b.box_info_values || [],
                    }
                  : b,
              ),
            );

            void fetchBoxes({ pageNumber: 1 });
          }}
        />
      )}

      <ConfirmModal
        visible={showDownloadModal}
        title="Download PDF"
        message="Are you sure you want to download PDF?"
        confirmLabel="Yes, Download"
        type="download"
        onConfirm={handleConfirmDownload}
        onCancel={() => setShowDownloadModal(false)}
      />

      <ConfirmModal
        visible={showEditModal}
        title="Edit Box"
        message={`Are you sure you want to edit "${selectedBoxForEdit?.name}"?`}
        confirmLabel="Yes, Edit"
        type="edit"
        onConfirm={handleConfirmEdit}
        onCancel={() => setShowEditModal(false)}
      />

      <ConfirmModal
        visible={showProjectDownloadModal}
        title="Download Project Report"
        message={`Download project list for "${projectDetails.project_name}"?`}
        confirmLabel="Yes, Download"
        type="download"
        onConfirm={handleConfirmProjectDownload}
        onCancel={() => setShowProjectDownloadModal(false)}
      />

      {/* ── All Boxes PDF confirm ── */}
      <ConfirmModal
        visible={showAllBoxesDownloadModal}
        title="Download All Boxes"
        message={`Download a combined PDF for all ${boxCounts.projectTotal} boxes in "${projectDetails.project_name}"?`}
        confirmLabel="Yes, Download"
        type="download"
        onConfirm={handleConfirmAllBoxesDownload}
        onCancel={() => setShowAllBoxesDownloadModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cardBg },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 },
  scrollContentEmpty: { flexGrow: 1 },
  projectItemsButton: {
    minHeight: 68,
    marginTop: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CDE9E4",
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 9,
    elevation: 2,
  },
  projectItemsIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E7F6F3",
    marginRight: 11,
  },
  projectItemsTextBlock: { flex: 1, paddingRight: 8 },
  projectItemsTitle: {
    color: "#17212B",
    fontSize: 14,
    fontWeight: "800",
  },
  projectItemsSubtitle: {
    color: "#667085",
    fontSize: 11,
    marginTop: 3,
  },
  boxesSection: { marginTop: 20 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center", // vertically center title + button
    marginBottom: 14,
  },
  sectionTitleBlock: { flex: 1, paddingRight: 8 },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  sectionSubtitle: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  sectionHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterToggleBtn: {
    position: "relative",
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  filterToggleBtnActive: {
    borderColor: "#2A9D8F",
    backgroundColor: "#E6F7F5",
  },
  activeFilterBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: "#E63946",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  activeFilterBadgeText: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  searchFilterCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInputWrap: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 13,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    paddingVertical: 0,
    fontSize: 14,
    color: "#111827",
  },
  clearSearchBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  filterHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 13,
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  resetFilterText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2A9D8F",
  },
  statusFilterRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusFilterChip: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  statusFilterChipActive: {
    borderColor: "#2A9D8F",
    backgroundColor: "#E6F7F5",
  },
  statusFilterChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textAlign: "center",
  },
  statusFilterChipTextActive: {
    color: "#1A7A70",
  },
  // ── Download All button ──
  downloadAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E6F7F5",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#2A9D8F",
  },
  downloadAllText: { fontSize: 12, fontWeight: "700", color: "#2A9D8F" },
  emptyState: { alignItems: "center", paddingTop: 20 },
  lottie: { width: 200, height: 200 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 4,
    textAlign: "center",
  },
  noResultsIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyResetBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#E6F7F5",
    borderWidth: 1,
    borderColor: "#2A9D8F",
  },
  emptyResetBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1A7A70",
  },
  initialLoader: {
    minHeight: 220,
    justifyContent: "center",
    alignItems: "center",
  },
  paginationLoader: {
    minHeight: 64,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  paginationLoaderText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  endOfListText: {
    paddingTop: 12,
    paddingBottom: 8,
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
  },
  listFooterSpacer: { height: 20 },
  fabContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 32 : 20,
    right: 18,
    left: 18,
  },
  fabButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  fabText: { color: "white", fontSize: 16, fontWeight: "700", marginLeft: 10 },
  loaderOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
});

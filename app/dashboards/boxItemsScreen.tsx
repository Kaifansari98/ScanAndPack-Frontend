import Loader from "@/components/generic/Loader";
import { ItemCard } from "@/components/ItemCards/ItemCard";
import { useToast } from "@/components/Notification/ToastProvider";
import { colors } from "@/components/theme/colors";
import { commonStyles } from "@/components/theme/commonStyles";
import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
import { fetchBoxtDetailsAndShare } from "@/utils/BoxPdfUtils";
import { useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import {
  ArrowLeft,
  Download,
  ListPlus,
  Minus,
  PackagePlus,
  Plus,
  ScanLine,
  Search,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSelector } from "react-redux";

/*
|--------------------------------------------------------------------------
| Manual packing API
|--------------------------------------------------------------------------
| GET:
| /api/track-trace/boxes/packing/manual-items?vendor_id=1&project_id=114
|
| Your axios instance is already using the Track & Trace API prefix,
| therefore this screen calls:
| /boxes/packing/manual-items
|
| POST below uses the same REST endpoint for adding manual packing qty.
| If your write API has a different route, change only this constant.
|--------------------------------------------------------------------------
*/
const MANUAL_PACKING_ENDPOINT = "/track-trace/boxes/packing/manual-items";

interface Box {
  name: string;
  id: number;
  project_id: number;
  vendor_id: number;
  client_id: number;
  machine_id: number | null;
  machine_name: string;
}

interface ScanItem {
  id: number;
  unique_id: string;
  qty: number;
  item_name: string;
  category: string;
  L1: string;
  L2: string;
  L3: string;
}

interface ManualPackingItem {
  id: number;
  project_id: number;
  vendor_id: number;
  lead_id: number | null;

  item_name: string;
  description: string;
  material_details: string;

  qty: number;

  unique_code: string | null;
  unique_code_2: string | null;

  length: string | number | null;
  width: string | number | null;
  thickness: string | number | null;

  category_id: number | null;
  category_name: string | null;
  group_name: string | null;
  procurement: string | null;

  weight: number;

  use_in_assembled_packing: boolean | null;
  include_in_packing: boolean | null;
  scan_pack_validate: boolean | null;

  elf: string | null;
  elb: string | null;
  esl: string | null;
  esr: string | null;

  total_qty: number;
  packed_qty: number;
  pending_qty: number;
  packing_status: "Pending" | "Partially Packed" | "Packed" | string;
}

interface ManualPackingSummary {
  total_items: number;
  total_qty: number;
  packed_qty: number;
  pending_qty: number;
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  type?: "delete" | "download" | "status";
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
  const confirmBg =
    type === "delete" ? "#E63946" : type === "status" ? "#F4A261" : "#2A9D8F";

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
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
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
  btnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
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
  btnCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  btnConfirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: "white",
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BoxItemsScreen() {
  const { payload: payloadString } = useLocalSearchParams<{
    payload: string;
  }>();

  const { showToast } = useToast();
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);

  const [scanItems, setScanItems] = useState<ScanItem[]>([]);
  const [box, setBox] = useState<Box | null>(null);
  const [status, setStatus] = useState<string>("");
  const [boxName, setBoxName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Manual product selection
  |--------------------------------------------------------------------------
  */
  const [showProductModal, setShowProductModal] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState(false);

  const [manualItems, setManualItems] = useState<ManualPackingItem[]>([]);
  const [manualSummary, setManualSummary] =
    useState<ManualPackingSummary | null>(null);

  const [manualLoading, setManualLoading] = useState(false);
  const [addingManualItem, setAddingManualItem] = useState(false);

  const [manualSearch, setManualSearch] = useState("");
  const [selectedManualItem, setSelectedManualItem] =
    useState<ManualPackingItem | null>(null);
  const [manualQty, setManualQty] = useState("1");

  const [permission, requestPermission] = useCameraPermissions();

  const scanButtonScale = useSharedValue(1);

  const animatedScanButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scanButtonScale.value }],
  }));

  // ── Parse payload ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!payloadString) return;

    try {
      const parsed = JSON.parse(payloadString) as Box;
      setBox(parsed);
    } catch (error) {
      //console.error("Failed to parse payload:", error);
      showToast("error", "Invalid box data");
    }
  }, [payloadString]);

  // ── Fetch box items ────────────────────────────────────────────────────────

  const fetchScanItems = useCallback(async (b: Box) => {
    try {
      const { data } = await axios.post("/scan-items/by-fields", {
        project_id: b.project_id,
        vendor_id: b.vendor_id,
        box_id: b.id,
      });

      const items =
        data?.data?.items?.map((item: any) => ({
          ...item.project_item_details,
          id: item.id,
        })) ?? [];

      setScanItems(items);
    } catch (error) {
      //console.log("Failed to fetch scan items:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch products available for manual packing ────────────────────────────

  const fetchManualPackingItems = useCallback(
    async (b: Box, showErrorToast = true) => {
      setManualLoading(true);

      try {
        const { data } = await axios.get(MANUAL_PACKING_ENDPOINT, {
          params: {
            vendor_id: b.vendor_id,
            project_id: b.project_id,
          },
        });

        if (!data?.success) {
          throw new Error(data?.message || "Failed to fetch products");
        }

        setManualItems(data?.data?.items ?? []);
        setManualSummary(data?.data?.summary ?? null);
      } catch (error: any) {
        //console.error("Failed to fetch manual packing items:", error);

        setManualItems([]);
        setManualSummary(null);

        if (showErrorToast) {
          showToast(
            "error",
            error?.response?.data?.message ||
              error?.message ||
              "Failed to load products",
          );
        }
      } finally {
        setManualLoading(false);
      }
    },
    [showToast],
  );

  // ── Search products ────────────────────────────────────────────────────────

  const filteredManualItems = useMemo(() => {
    const query = manualSearch.trim().toLowerCase();

    if (!query) {
      return manualItems;
    }

    return manualItems.filter((item) => {
      const searchableValues = [
        item.item_name,
        item.description,
        item.material_details,
        item.unique_code,
        item.unique_code_2,
        item.category_name,
        item.group_name,
        item.procurement,
      ];

      return searchableValues.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      );
    });
  }, [manualItems, manualSearch]);

  // ── Keep latest box available to focus effect ──────────────────────────────

  const boxRef = useRef<Box | null>(null);

  useEffect(() => {
    boxRef.current = box;
  }, [box]);

  // ── Refetch everything when screen comes into focus ────────────────────────

  useFocusEffect(
    useCallback(() => {
      const b = boxRef.current;

      if (!b?.id || !b?.vendor_id || !b?.project_id) {
        return;
      }

      setLoading(true);

      axios
        .get(
          `/boxes/details/vendor/${b.vendor_id}/project/${b.project_id}/box/${b.id}`,
        )
        .then((res) => {
          setStatus(res.data.box.box_status);
          setBoxName(res.data.box.box_name);
        })
        .catch((error) => {
          //console.error("Failed to fetch box details:", error);
          showToast("error", "Failed to load box details");
        });

      fetchScanItems(b);
    }, [fetchScanItems, showToast]),
  );

  // ── Open scanner ───────────────────────────────────────────────────────────

  const openScanner = async () => {
    if (!box) return;

    const navigate = () =>
      router.push({
        pathname: "/scanner-track-trace",
        params: {
          box_id: String(box.id),
          project_id: String(box.project_id),
          vendor_id: String(box.vendor_id),
          client_id: String(box.client_id),
          machine_id: String(box.machine_id ?? ""),
          machine_name: String(box.machine_name ?? ""),
          hide_defect: "true",
        },
      });

    if (!permission?.granted) {
      const result = await requestPermission();

      if (result?.granted) {
        navigate();
      }
    } else {
      navigate();
    }
  };

  // ── Open manual product selector ───────────────────────────────────────────

  const openProductSelector = async () => {
    if (!box) return;

    if (String(status).toLowerCase() === "packed") {
      showToast("warning", "Packed box cannot be updated");
      return;
    }

    setManualSearch("");
    setSelectedManualItem(null);
    setManualQty("1");
    setShowProductModal(true);

    await fetchManualPackingItems(box);
  };

  // ── Select product and enter qty ───────────────────────────────────────────

  const handleSelectManualItem = (item: ManualPackingItem) => {
    const pendingQty = Number(item.pending_qty ?? 0);

    if (pendingQty <= 0) {
      showToast("warning", "This product is already fully packed");
      return;
    }

    setSelectedManualItem(item);
    setManualQty("1");

    setShowProductModal(false);
    setShowQtyModal(true);
  };

  const updateManualQty = (nextQty: number) => {
    if (!selectedManualItem) return;

    const pendingQty = Number(selectedManualItem.pending_qty ?? 0);

    const safeQty = Math.max(1, Math.min(Math.floor(nextQty || 1), pendingQty));

    setManualQty(String(safeQty));
  };

  const handleManualQtyTextChange = (value: string) => {
    if (!selectedManualItem) return;

    const digitsOnly = value.replace(/\D/g, "");

    if (digitsOnly === "") {
      setManualQty("");
      return;
    }

    const pendingQty = Number(selectedManualItem.pending_qty ?? 0);
    const numericQty = Number(digitsOnly);

    if (numericQty > pendingQty) {
      setManualQty(String(pendingQty));
      return;
    }

    setManualQty(String(numericQty));
  };

  const closeQtyModalAndReturnToList = () => {
    setShowQtyModal(false);
    setSelectedManualItem(null);
    setManualQty("1");
    setShowProductModal(true);
  };

  /*
  |--------------------------------------------------------------------------
  | Add manually selected item to current box
  |--------------------------------------------------------------------------
  |
  | Expected POST body:
  | {
  |   project_id,
  |   vendor_id,
  |   box_id,
  |   cut_list_id,
  |   qty,
  |   user_id
  | }
  |
  | Backend should:
  | - validate qty <= pending qty
  | - find machine type 18
  | - if same cut_list_id + same box already exists -> update qty
  | - if new box -> create new CutListMachineMapping row
  |--------------------------------------------------------------------------
  */
  const handleAddManualItem = async () => {
    if (!box || !selectedManualItem) {
      return;
    }

    if (!user?.id) {
      showToast("error", "User not found");
      return;
    }

    if (String(status).toLowerCase() === "packed") {
      showToast("warning", "Packed box cannot be updated");
      return;
    }

    const qty = Number(manualQty);
    const pendingQty = Number(selectedManualItem.pending_qty ?? 0);

    if (!Number.isInteger(qty) || qty <= 0) {
      showToast("warning", "Please enter a valid quantity");
      return;
    }

    if (qty > pendingQty) {
      showToast(
        "warning",
        `Quantity cannot exceed pending quantity (${pendingQty})`,
      );
      return;
    }

    setAddingManualItem(true);

    try {
      const { data } = await axios.post(MANUAL_PACKING_ENDPOINT, {
        project_id: box.project_id,
        vendor_id: box.vendor_id,
        box_id: box.id,
        cut_list_id: selectedManualItem.id,
        qty,
        user_id: user.id,
      });

      if (data?.success === false) {
        throw new Error(data?.message || "Failed to add product");
      }

      showToast(
        "success",
        `${qty} ${qty === 1 ? "item" : "items"} added to ${boxName || "box"}`,
      );

      setShowQtyModal(false);
      setSelectedManualItem(null);
      setManualQty("1");

      /*
      |--------------------------------------------------------------------------
      | Refresh both lists
      |--------------------------------------------------------------------------
      | Manual list gets latest packed_qty / pending_qty.
      | Box list gets the newly packed product.
      |--------------------------------------------------------------------------
      */
      await Promise.all([
        fetchManualPackingItems(box, false),
        fetchScanItems(box),
      ]);

      /*
      |--------------------------------------------------------------------------
      | Keep product selector open so user can add another product
      |--------------------------------------------------------------------------
      */
      setShowProductModal(true);
    } catch (error: any) {
      //console.error("Failed to add manual packing item:", error);

      showToast(
        "error",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Failed to add product to box",
      );
    } finally {
      setAddingManualItem(false);
    }
  };

  // ── Status toggle ──────────────────────────────────────────────────────────

  const handleUpdateStatus = () => {
    if (status === "unpacked" && scanItems.length === 0) {
      showToast("warning", "Box is empty. Add items before packing.");
      return;
    }

    setShowStatusModal(true);
  };

  const handleConfirmUpdateStatus = async () => {
    if (!box?.id) {
      return;
    }

    if (!user?.id) {
      showToast("error", "User not found");
      return;
    }

    setShowStatusModal(false);
    setLoading(true);

    const newStatus = status === "unpacked" ? "packed" : "unpacked";

    try {
      await axios.put(`/boxes/status/${newStatus}/${box.id}`, {
        user_id: user.id,
      });

      showToast("success", `Box status updated to ${newStatus}`);
      setStatus(newStatus);
    } catch (error: any) {
      showToast(
        "error",
        error?.response?.data?.error || "Failed to update status",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Delete item ────────────────────────────────────────────────────────────

  const handleConfirmDeleteItem = async () => {
    setShowDeleteModal(false);

    if (!selectedItemId || !box) {
      return;
    }

    if (String(status).toLowerCase() === "packed") {
      showToast("warning", "Packed box cannot be updated");
      setSelectedItemId(null);
      return;
    }

    setLoading(true);

    try {
      await axios.delete(`/scan-items/scan-and-pack/delete/${selectedItemId}`, {
        data: {
          vendor_id: box.vendor_id,
          project_id: box.project_id,
          box_id: box.id,
          deleted_by: user?.id,
        },
      });

      showToast("success", "Item removed from box successfully");

      await fetchScanItems(box);
    } catch (error: any) {
      //console.error("Failed to remove item from box:", error);

      showToast(
        "error",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Failed to remove item from box",
      );
    } finally {
      setSelectedItemId(null);
      setLoading(false);
    }
  };

  // ── Download ───────────────────────────────────────────────────────────────

  const handleConfirmDownload = async () => {
    setShowDownloadModal(false);
    setLoading(true);

    try {
      if (box) {
        await fetchBoxtDetailsAndShare(box);
      }
    } catch (err: any) {
      //console.log("Download Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!box) {
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
          <Text style={commonStyles.navbarTitle} numberOfLines={1}>
            {boxName || "Box Items"}
          </Text>

          <Text style={commonStyles.navbarSubtitle}>
            {status === "packed" ? "Packed" : "Unpacked"}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.packBtn,
            {
              backgroundColor: status === "packed" ? "#FFF8EE" : "#E6F7F5",
            },
          ]}
          onPress={handleUpdateStatus}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.packBtnText,
              {
                color: status === "packed" ? "#C15C0A" : "#1A7A70",
              },
            ]}
          >
            {status === "packed" ? "Unpack" : "Pack"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Box item list ── */}
      {loading ? (
        <View style={styles.center}>
          <Loader />
        </View>
      ) : scanItems.length === 0 ? (
        <View style={styles.center}>
          <LottieView
            source={require("@/assets/animations/emptyBox.json")}
            autoPlay
            loop={false}
            style={styles.lottie}
          />

          <Text style={styles.emptyText}>Box is Empty</Text>
        </View>
      ) : (
        <FlatList
          data={scanItems}
          renderItem={({ item, index }) => (
            <ItemCard
              item={item}
              index={index}
              status={status}
              onDelete={(id) => {
                setSelectedItemId(id);
                setShowDeleteModal(true);
              }}
              onWarnDelete={() =>
                showToast("warning", "The box is packed. Unpack it to delete.")
              }
            />
          )}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* ── Bottom actions ── */}
      <View style={styles.fabContainer}>
        {status === "packed" ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setShowDownloadModal(true)}
          >
            <LinearGradient
              colors={["#000000", "#222222"]}
              style={styles.fabButton}
            >
              <Download size={18} color="#fff" />
              <Text style={styles.fabText}>Download Label</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionRow}>
            {/* Scan Product */}
            <TouchableOpacity
              style={styles.actionHalf}
              activeOpacity={0.9}
              onPress={openScanner}
              onPressIn={() => {
                scanButtonScale.value = withSpring(0.95);
              }}
              onPressOut={() => {
                scanButtonScale.value = withSpring(1);
              }}
            >
              <Animated.View
                style={[styles.actionAnimated, animatedScanButtonStyle]}
              >
                <LinearGradient
                  colors={["#000000", "#222222"]}
                  style={styles.actionPrimary}
                >
                  <ScanLine size={21} color="#fff" />
                  <Text style={styles.actionPrimaryText}>Scan Product</Text>
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>

            {/* Select Product */}
            <TouchableOpacity
              style={[styles.actionHalf, styles.actionSecondary]}
              activeOpacity={0.85}
              onPress={openProductSelector}
            >
              <ListPlus size={21} color="#111827" />
              <Text style={styles.actionSecondaryText}>Select Product</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Product selector modal ── */}
      <Modal
        transparent
        animationType="slide"
        visible={showProductModal}
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={styles.manualModalOverlay}>
          <TouchableOpacity
            style={styles.manualModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowProductModal(false)}
          />

          <View style={styles.manualSheet}>
            <View style={styles.manualHandle} />

            <View style={styles.manualHeader}>
              <View style={styles.manualHeaderTitleWrap}>
                <View style={styles.manualHeaderIcon}>
                  <PackagePlus size={19} color="#111827" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.manualTitle}>Select Product</Text>
                  <Text style={styles.manualSubtitle}>
                    Add product without scanning
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.manualCloseButton}
                onPress={() => setShowProductModal(false)}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Summary */}
            {manualSummary ? (
              <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>
                    {manualSummary.total_qty}
                  </Text>
                  <Text style={styles.summaryLabel}>Total Qty</Text>
                </View>

                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>
                    {manualSummary.packed_qty}
                  </Text>
                  <Text style={styles.summaryLabel}>Packed</Text>
                </View>

                <View style={styles.summaryCard}>
                  <Text
                    style={[
                      styles.summaryValue,
                      manualSummary.pending_qty > 0
                        ? styles.pendingValue
                        : undefined,
                    ]}
                  >
                    {manualSummary.pending_qty}
                  </Text>
                  <Text style={styles.summaryLabel}>Pending</Text>
                </View>
              </View>
            ) : null}

            {/* Search */}
            <View style={styles.searchBox}>
              <Search size={18} color="#9CA3AF" />

              <TextInput
                value={manualSearch}
                onChangeText={setManualSearch}
                placeholder="Search product, item code, category..."
                placeholderTextColor="#9CA3AF"
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />

              {manualSearch.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setManualSearch("")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={17} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>

            {manualLoading ? (
              <View style={styles.manualLoading}>
                <ActivityIndicator size="small" color="#111827" />
                <Text style={styles.manualLoadingText}>
                  Loading products...
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredManualItems}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={
                  filteredManualItems.length === 0
                    ? styles.manualEmptyList
                    : styles.manualList
                }
                ListEmptyComponent={
                  <View style={styles.manualEmpty}>
                    <PackagePlus size={32} color="#D1D5DB" />
                    <Text style={styles.manualEmptyTitle}>
                      No products found
                    </Text>
                    <Text style={styles.manualEmptyText}>
                      Try a different search or all eligible items are packed.
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const pendingQty = Number(item.pending_qty ?? 0);
                  const isFullyPacked = pendingQty <= 0;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.productCard,
                        isFullyPacked && styles.productCardDisabled,
                      ]}
                      activeOpacity={isFullyPacked ? 1 : 0.8}
                      disabled={isFullyPacked}
                      onPress={() => handleSelectManualItem(item)}
                    >
                      <View style={styles.productTopRow}>
                        <View style={styles.productNameWrap}>
                          <Text
                            style={[
                              styles.productName,
                              isFullyPacked && styles.productTextDisabled,
                            ]}
                            numberOfLines={2}
                          >
                            {item.item_name || item.description}
                          </Text>

                          <Text style={styles.productCode} numberOfLines={1}>
                            {item.material_details || item.unique_code || "-"}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            item.packing_status === "Packed"
                              ? styles.statusBadgePacked
                              : item.packing_status === "Partially Packed"
                                ? styles.statusBadgePartial
                                : styles.statusBadgePending,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              item.packing_status === "Packed"
                                ? styles.statusTextPacked
                                : item.packing_status === "Partially Packed"
                                  ? styles.statusTextPartial
                                  : styles.statusTextPending,
                            ]}
                          >
                            {item.packing_status}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.productMetaRow}>
                        {item.category_name ? (
                          <Text style={styles.productMeta}>
                            {item.category_name}
                          </Text>
                        ) : null}

                        {item.group_name ? (
                          <>
                            <View style={styles.metaDot} />
                            <Text
                              style={[styles.productMeta, { flex: 1 }]}
                              numberOfLines={1}
                            >
                              {item.group_name}
                            </Text>
                          </>
                        ) : null}
                      </View>

                      <View style={styles.qtyStatsRow}>
                        <View style={styles.qtyStat}>
                          <Text style={styles.qtyStatLabel}>Total</Text>
                          <Text style={styles.qtyStatValue}>
                            {item.total_qty}
                          </Text>
                        </View>

                        <View style={styles.qtyDivider} />

                        <View style={styles.qtyStat}>
                          <Text style={styles.qtyStatLabel}>Packed</Text>
                          <Text style={styles.qtyStatValue}>
                            {item.packed_qty}
                          </Text>
                        </View>

                        <View style={styles.qtyDivider} />

                        <View style={styles.qtyStat}>
                          <Text style={styles.qtyStatLabel}>Pending</Text>
                          <Text
                            style={[
                              styles.qtyStatValue,
                              pendingQty > 0
                                ? styles.qtyPendingText
                                : undefined,
                            ]}
                          >
                            {pendingQty}
                          </Text>
                        </View>

                        {!isFullyPacked ? (
                          <View style={styles.selectIndicator}>
                            <Plus size={16} color="#fff" />
                          </View>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ── Quantity modal ── */}
      <Modal
        transparent
        animationType="slide"
        visible={showQtyModal}
        onRequestClose={closeQtyModalAndReturnToList}
      >
        <View style={styles.manualModalOverlay}>
          <TouchableOpacity
            style={styles.manualModalBackdrop}
            activeOpacity={1}
            onPress={closeQtyModalAndReturnToList}
          />

          <View style={styles.qtySheet}>
            <View style={styles.manualHandle} />

            <View style={styles.qtyModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.qtyModalTitle}>Add Quantity</Text>
                <Text style={styles.qtyModalSubtitle}>
                  Quantity cannot exceed pending quantity
                </Text>
              </View>

              <TouchableOpacity
                style={styles.manualCloseButton}
                onPress={closeQtyModalAndReturnToList}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedManualItem ? (
              <>
                <View style={styles.selectedProductCard}>
                  <Text style={styles.selectedProductName} numberOfLines={2}>
                    {selectedManualItem.item_name ||
                      selectedManualItem.description}
                  </Text>

                  <Text style={styles.selectedProductCode}>
                    {selectedManualItem.material_details ||
                      selectedManualItem.unique_code ||
                      "-"}
                  </Text>

                  <View style={styles.selectedProductStats}>
                    <View>
                      <Text style={styles.selectedStatLabel}>Total</Text>
                      <Text style={styles.selectedStatValue}>
                        {selectedManualItem.total_qty}
                      </Text>
                    </View>

                    <View>
                      <Text style={styles.selectedStatLabel}>Packed</Text>
                      <Text style={styles.selectedStatValue}>
                        {selectedManualItem.packed_qty}
                      </Text>
                    </View>

                    <View>
                      <Text style={styles.selectedStatLabel}>Pending</Text>
                      <Text
                        style={[
                          styles.selectedStatValue,
                          styles.qtyPendingText,
                        ]}
                      >
                        {selectedManualItem.pending_qty}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.qtyLabel}>Quantity to add</Text>

                <View style={styles.qtyControl}>
                  <TouchableOpacity
                    style={[
                      styles.qtyControlButton,
                      Number(manualQty || 0) <= 1 &&
                        styles.qtyControlButtonDisabled,
                    ]}
                    disabled={Number(manualQty || 0) <= 1}
                    onPress={() => updateManualQty(Number(manualQty || 1) - 1)}
                  >
                    <Minus
                      size={20}
                      color={
                        Number(manualQty || 0) <= 1 ? "#D1D5DB" : "#111827"
                      }
                    />
                  </TouchableOpacity>

                  <TextInput
                    value={manualQty}
                    onChangeText={handleManualQtyTextChange}
                    onBlur={() => {
                      if (!manualQty || Number(manualQty) <= 0) {
                        setManualQty("1");
                      }
                    }}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    style={styles.qtyInput}
                    maxLength={6}
                  />

                  <TouchableOpacity
                    style={[
                      styles.qtyControlButton,
                      Number(manualQty || 0) >=
                        Number(selectedManualItem.pending_qty) &&
                        styles.qtyControlButtonDisabled,
                    ]}
                    disabled={
                      Number(manualQty || 0) >=
                      Number(selectedManualItem.pending_qty)
                    }
                    onPress={() => updateManualQty(Number(manualQty || 0) + 1)}
                  >
                    <Plus
                      size={20}
                      color={
                        Number(manualQty || 0) >=
                        Number(selectedManualItem.pending_qty)
                          ? "#D1D5DB"
                          : "#111827"
                      }
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.qtyHint}>
                  Maximum allowed: {selectedManualItem.pending_qty}
                </Text>

                <View style={styles.qtyFooter}>
                  <TouchableOpacity
                    style={styles.qtyCancelButton}
                    onPress={closeQtyModalAndReturnToList}
                    disabled={addingManualItem}
                  >
                    <Text style={styles.qtyCancelText}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.qtyAddButton,
                      addingManualItem && styles.qtyAddButtonDisabled,
                    ]}
                    onPress={handleAddManualItem}
                    disabled={addingManualItem}
                    activeOpacity={0.85}
                  >
                    {addingManualItem ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <PackagePlus size={18} color="#fff" />
                        <Text style={styles.qtyAddText}>Add to Box</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ── Existing modals ── */}
      <ConfirmModal
        visible={showDeleteModal}
        title="Delete Item?"
        message="Are you sure you want to delete this scanned item?"
        confirmLabel="Yes, Delete"
        type="delete"
        onConfirm={handleConfirmDeleteItem}
        onCancel={() => setShowDeleteModal(false)}
      />

      <ConfirmModal
        visible={showStatusModal}
        title={status === "packed" ? "Mark As Unpacked" : "Mark As Packed"}
        message={
          status === "packed"
            ? "Are you sure you want to mark this box as unpacked?"
            : "Are you sure you want to mark this box as packed?"
        }
        confirmLabel={`Yes, ${status === "packed" ? "Unpack" : "Pack"}`}
        type="status"
        onConfirm={handleConfirmUpdateStatus}
        onCancel={() => setShowStatusModal(false)}
      />

      <ConfirmModal
        visible={showDownloadModal}
        title="Download PDF"
        message="Are you sure you want to download this box label?"
        confirmLabel="Yes, Download"
        type="download"
        onConfirm={handleConfirmDownload}
        onCancel={() => setShowDownloadModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cardBg,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.cardBg,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 112,
  },

  lottie: {
    width: 220,
    height: 220,
  },

  emptyText: {
    color: "#9CA3AF",
    fontSize: 14,
    marginTop: 8,
  },

  // Navbar
  packBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },

  packBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Bottom actions
  fabContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 25 : 16,
    right: 18,
    left: 18,
  },

  fabButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  fabText: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
    marginLeft: 12,
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
  },

  actionHalf: {
    flex: 1,
  },

  actionAnimated: {
    width: "100%",
  },

  actionPrimary: {
    minHeight: 54,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 8,
  },

  actionPrimaryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

  actionSecondary: {
    minHeight: 54,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 7,
    elevation: 5,
  },

  actionSecondaryText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800",
  },

  // Manual modal
  manualModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },

  manualModalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.48)",
  },

  manualSheet: {
    height: "84%",
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 28 : 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },

  manualHandle: {
    width: 42,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 12,
  },

  manualHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  manualHeaderTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  manualHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EEF2F7",
    alignItems: "center",
    justifyContent: "center",
  },

  manualTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },

  manualSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },

  manualCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
    marginLeft: 10,
  },

  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 13,
    paddingVertical: 9,
    alignItems: "center",
  },

  summaryValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  pendingValue: {
    color: "#C2410C",
  },

  summaryLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
  },

  searchBox: {
    height: 48,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    gap: 9,
    marginBottom: 12,
  },

  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    color: "#111827",
    paddingVertical: 0,
  },

  manualLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  manualLoadingText: {
    fontSize: 13,
    color: "#6B7280",
  },

  manualList: {
    paddingBottom: 12,
  },

  manualEmptyList: {
    flexGrow: 1,
  },

  manualEmpty: {
    flex: 1,
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  manualEmptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
  },

  manualEmptyText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: "#9CA3AF",
    textAlign: "center",
  },

  productCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 10,
  },

  productCardDisabled: {
    opacity: 0.58,
    backgroundColor: "#F9FAFB",
  },

  productTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  productNameWrap: {
    flex: 1,
  },

  productName: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
    color: "#111827",
  },

  productTextDisabled: {
    color: "#6B7280",
  },

  productCode: {
    marginTop: 4,
    fontSize: 11,
    color: "#6B7280",
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  statusBadgePending: {
    backgroundColor: "#FFF7ED",
  },

  statusBadgePartial: {
    backgroundColor: "#EFF6FF",
  },

  statusBadgePacked: {
    backgroundColor: "#ECFDF5",
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },

  statusTextPending: {
    color: "#C2410C",
  },

  statusTextPartial: {
    color: "#1D4ED8",
  },

  statusTextPacked: {
    color: "#047857",
  },

  productMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 9,
  },

  productMeta: {
    fontSize: 11,
    color: "#6B7280",
  },

  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 7,
  },

  qtyStatsRow: {
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
  },

  qtyStat: {
    minWidth: 52,
  },

  qtyStatLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
  },

  qtyStatValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "800",
    color: "#374151",
  },

  qtyPendingText: {
    color: "#C2410C",
  },

  qtyDivider: {
    height: 27,
    width: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },

  selectIndicator: {
    marginLeft: "auto",
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },

  // Quantity sheet
  qtySheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },

  qtyModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  qtyModalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },

  qtyModalSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 3,
  },

  selectedProductCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },

  selectedProductName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 20,
  },

  selectedProductCode: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
  },

  selectedProductStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  selectedStatLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "600",
  },

  selectedStatValue: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "800",
    marginTop: 2,
  },

  qtyLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 9,
  },

  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  qtyControlButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  qtyControlButtonDisabled: {
    backgroundColor: "#F9FAFB",
  },

  qtyInput: {
    width: 96,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#111827",
    backgroundColor: "#FFFFFF",
    textAlign: "center",
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    paddingVertical: 0,
  },

  qtyHint: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 11,
    color: "#6B7280",
  },

  qtyFooter: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },

  qtyCancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  qtyCancelText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "700",
  },

  qtyAddButton: {
    flex: 1.5,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#111827",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  qtyAddButtonDisabled: {
    opacity: 0.7,
  },

  qtyAddText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});

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
import { ArrowLeft, Download, ScanLine, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSelector } from "react-redux";

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
  visible, title, message, confirmLabel, cancelLabel = "Cancel",
  type = "download", onConfirm, onCancel,
}: ConfirmModalProps) {
  const confirmBg =
    type === "delete" ? "#E63946" :
    type === "status" ? "#F4A261" :
    "#2A9D8F";

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onCancel}>
      <View style={cmStyles.overlay}>
        <TouchableOpacity style={cmStyles.backdrop} activeOpacity={1} onPress={onCancel} />
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
            <TouchableOpacity style={[cmStyles.btn, cmStyles.btnCancel]} onPress={onCancel} activeOpacity={0.8}>
              <Text style={cmStyles.btnCancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[cmStyles.btn, { backgroundColor: confirmBg }]} onPress={onConfirm} activeOpacity={0.8}>
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
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: Platform.OS === "ios" ? 48 : 32,
    paddingTop: 12, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 20,
  },
  handle: { width: 40, height: 4, backgroundColor: "#D1D5DB", borderRadius: 2, marginBottom: 16 },
  closeBtn: {
    position: "absolute", top: 20, right: 20,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 8, textAlign: "center" },
  message: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 28, lineHeight: 20 },
  btnRow: { flexDirection: "row", gap: 12, width: "100%" },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnCancel: { backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  btnCancelText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  btnConfirmText: { fontSize: 15, fontWeight: "700", color: "white" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BoxItemsScreen() {
  const { payload: payloadString } = useLocalSearchParams<{ payload: string }>();
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
      console.error("Failed to parse payload:", error);
      showToast("error", "Invalid box data");
    }
  }, [payloadString]);

  // ── Fetch scan items ───────────────────────────────────────────────────────
  const fetchScanItems = useCallback(async (b: Box) => {
    try {
      const { data } = await axios.post("/scan-items/by-fields", {
        project_id: b.project_id,
        vendor_id:  b.vendor_id,
        box_id:     b.id,
      });
      const items =
        data?.data?.items?.map((item: any) => ({
          ...item.project_item_details,
          id: item.id,
        })) ?? [];
      setScanItems(items);
    } catch (error) {
      console.log("Failed to fetch scan items:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Keep a ref so useFocusEffect always sees the latest box ───────────────
  const boxRef = useRef<Box | null>(null);
  useEffect(() => { boxRef.current = box; }, [box]);

  // ── Refetch everything when screen comes into focus (including back press) ─
  useFocusEffect(
    useCallback(() => {
      const b = boxRef.current;
      if (!b?.id || !b?.vendor_id || !b?.project_id) return;

      setLoading(true);

      // Fetch box status + name
      axios
        .get(`/boxes/details/vendor/${b.vendor_id}/project/${b.project_id}/box/${b.id}`)
        .then((res) => {
          setStatus(res.data.box.box_status);
          setBoxName(res.data.box.box_name);
        })
        .catch((error) => {
          console.error("Failed to fetch box details:", error);
          showToast("error", "Failed to load box details");
        });

      // Fetch items
      fetchScanItems(b);
    }, [fetchScanItems])
  );

  // ── Open scanner with permission check ────────────────────────────────────
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
      if (result?.granted) navigate();
    } else {
      navigate();
    }
  };

  // ── Status toggle ──────────────────────────────────────────────────────────
  const handleUpdateStatus = () => {
    // alert(status)
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
    showToast(
      "error",
      "User not found"
    );

    return;
  }

  setShowStatusModal(
    false
  );

  setLoading(
    true
  );

  const newStatus =
    status ===
    "unpacked"
      ? "packed"
      : "unpacked";

  try {
    await axios.put(
      `/boxes/status/${newStatus}/${box.id}`,

      {
        user_id:
          user.id,
      }
    );

    showToast(
      "success",

      `Box status updated to ${newStatus}`
    );

    setStatus(
      newStatus
    );
  } catch (
    error: any
  ) {
    showToast(
      "error",

      error?.response
        ?.data
        ?.error ||
        "Failed to update status"
    );
  } finally {
    setLoading(
      false
    );
  }
};

  // ── Delete item ────────────────────────────────────────────────────────────
  const handleConfirmDeleteItem = async () => {
    setShowDeleteModal(false);
    setLoading(true);
    if (!selectedItemId) return;
    try {
      await axios.delete(`/scan-items/scan-and-pack/delete/${selectedItemId}`);
      showToast("success", "Item deleted successfully");
      if (box) fetchScanItems(box);
    } catch (error) {
      console.error("Failed to delete scan item:", error);
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
      if (box) await fetchBoxtDetailsAndShare(box);
    } catch (err: any) {
      console.log("Download Error:", err.message);
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
            { backgroundColor: status === "packed" ? "#FFF8EE" : "#E6F7F5" },
          ]}
          onPress={handleUpdateStatus}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.packBtnText,
            { color: status === "packed" ? "#C15C0A" : "#1A7A70" },
          ]}>
            {status === "packed" ? "Unpack" : "Pack"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── List ── */}
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

      {/* ── FAB ── */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            if (status !== "packed") openScanner();
            else setShowDownloadModal(true);
          }}
          onPressIn={() => { scanButtonScale.value = withSpring(0.95); }}
          onPressOut={() => { scanButtonScale.value = withSpring(1); }}
        >
          <Animated.View style={animatedScanButtonStyle}>
            <LinearGradient colors={["#000000", "#222222"]} style={styles.fabButton}>
              {status === "packed" ? (
                <>
                  <Download size={18} color="#fff" />
                  <Text style={styles.fabText}>Download Label</Text>
                </>
              ) : (
                <>
                  <ScanLine size={28} color="#fff" />
                  <Text style={styles.fabText}>Scan Product</Text>
                </>
              )}
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* ── Modals ── */}
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
  root: { flex: 1, backgroundColor: colors.cardBg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.cardBg },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },
  lottie: { width: 220, height: 220 },
  emptyText: { color: "#9CA3AF", fontSize: 14, marginTop: 8 },

  // Navbar pack/unpack toggle
  packBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  packBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // FAB
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
});
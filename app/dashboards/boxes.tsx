import Loader from "@/components/generic/Loader";
import { ProjectCard } from "@/components/ItemCards/ProjectCard";
import { AddBoxModal } from "@/components/modals/AddBoxModal";
import { UpdateBoxModal } from "@/components/modals/UpdateBoxModal";
import { useToast } from "@/components/Notification/ToastProvider";
import { colors } from "@/components/theme/colors";
import { commonStyles } from "@/components/theme/commonStyles";
import { weight } from "@/data/generic";
import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
import { fetchBoxtDetailsAndShare } from "@/utils/BoxPdfUtils";
import { getBoxWeight } from "@/utils/BoxWeight";
import { fetchProjectDetailsAndShare } from "@/utils/projectPdfUtils";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { ArrowLeft, Download, Plus, SquarePen, Trash2, X } from "lucide-react-native";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
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
  client_id: number;
}

interface ProjectDetailsResponse {
  id: number;
  vendor_id: number;
  client_id: number;
  project_status: string;
  project_name: string;
  estimated_completion_date: string;
  total_items: number;
  total_packed: number;
  total_unpaked: number;
  total_weight: number;
  project_details_id: number | null;
}

interface Box {
  id: number;
  name: string;
  box_status: "packed" | "unpacked" | string;
  items_count: number;
  details: any;
  project_id: number;
  vendor_id: number;
  client_id: number;
}

// ─── Confirmation Modal ───────────────────────────────────────────────────────

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
  visible, title, message, confirmLabel, cancelLabel = "Cancel",
  type = "download", onConfirm, onCancel,
}: ConfirmModalProps) {
  const confirmBg = type === "delete" ? "#E63946" : type === "edit" ? "#F4A261" : "#2A9D8F";
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onCancel}>
      <View style={cmStyles.overlay}>
        <TouchableOpacity style={cmStyles.backdrop} activeOpacity={1} onPress={onCancel} />
        <View style={cmStyles.sheet}>
          <View style={cmStyles.handle} />
          <TouchableOpacity style={cmStyles.closeBtn} onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: Platform.OS === "ios" ? 48 : 32,
    paddingTop: 12, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 20,
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

// ─── Box Card ─────────────────────────────────────────────────────────────────

function BoxCard({
  box, index, handleDownload, handleDeletePress, handleEditPress,
}: {
  box: Box; index: number;
  handleDownload: () => void;
  handleDeletePress: () => void;
  handleEditPress: () => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);
  const scale = useSharedValue(1);
  const [boxWeight, setBoxWeight] = useState<number | null>(null);
  const [groupedItemInfo, setGroupedItemInfo] = useState<{ group: string; roomName: string } | null>(null);

  useEffect(() => {
    const fetchBoxWeight = async () => {
      const res = await getBoxWeight(box.vendor_id, box.project_id, box.id);
      setBoxWeight(res.box_weight);
    };
    fetchBoxWeight();
  }, [box.vendor_id, box.project_id, box.id]);

  useEffect(() => {
    if (!box?.id) return;
    const fetchGroupedItemInfo = async () => {
      try {
        const response = await axios.get(`/boxes/grouped-info/${box.id}`);
        setGroupedItemInfo(response.data);
      } catch {
        setGroupedItemInfo(null);
      }
    };
    fetchGroupedItemInfo();
  }, [box.id]);

  useEffect(() => {
    cardOpacity.value = withDelay(index * 100, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    cardTranslateY.value = withDelay(index * 100, withSpring(0, { damping: 15, stiffness: 120 }));
  }, [index]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }, { scale: scale.value }],
  }));

  const status = box.box_status || "In Progress";
  const statusBg = status === "packed" ? "#DCFCE7" : status === "unpacked" ? "#FFEDD5" : "#F3F4F6";
  const statusText = status === "packed" ? "#15803D" : status === "unpacked" ? "#92400E" : "#374151";

  const handleNavigate = () => {
    router.push({
      pathname: "./boxItemsScreen",
      params: { payload: JSON.stringify({ project_id: box.project_id, vendor_id: box.vendor_id, client_id: box.client_id, id: box.id }) },
    });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPressIn={() => { scale.value = withSpring(0.98); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      onPress={handleNavigate}
    >
      <Animated.View style={[animatedCardStyle, boxStyles.card]}>
        {/* Top row */}
        <View style={boxStyles.topRow}>
          <View style={[boxStyles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[boxStyles.statusText, { color: statusText }]}>{status}</Text>
          </View>
          <TouchableOpacity
            style={boxStyles.iconBtn}
            onPress={() => {
              if (status === "packed") showToast("warning", "Unable to Delete. Box is Packed");
              else handleDeletePress();
            }}
          >
            <Trash2 color="#EF4444" size={20} />
          </TouchableOpacity>
        </View>

        {/* Name + group/room */}
        <View style={boxStyles.nameRow}>
          <Text style={boxStyles.boxName}>{box.name}</Text>
          {groupedItemInfo && (
            <View style={boxStyles.metaRow}>
              <View style={boxStyles.metaBlock}>
                <Text style={boxStyles.metaLabel}>Group</Text>
                <Text style={boxStyles.metaValue} numberOfLines={1}>{groupedItemInfo.group}</Text>
              </View>
              <View style={[boxStyles.metaBlock, { alignItems: "flex-end" }]}>
                <Text style={boxStyles.metaLabel}>Room</Text>
                <Text style={boxStyles.metaValue} numberOfLines={1}>{groupedItemInfo.roomName}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={boxStyles.statsRow}>
          <View style={boxStyles.statsLeft}>
            <View>
              <Text style={boxStyles.statLabel}>Items</Text>
              <Text style={boxStyles.statValue}>{box.items_count}</Text>
            </View>
            <View>
              <Text style={boxStyles.statLabel}>Weight</Text>
              <Text style={boxStyles.statValue}>{boxWeight} {weight}</Text>
            </View>
          </View>
          <View style={boxStyles.actionsRow}>
            <TouchableOpacity
              style={boxStyles.iconBtn}
              onPress={() => box.items_count <= 0 ? showToast("warning", "Download Failed, Box is empty") : handleDownload()}
            >
              <Download color="#555555" size={20} />
            </TouchableOpacity>
            <TouchableOpacity style={boxStyles.iconBtn} onPress={handleEditPress}>
              <SquarePen color="#555555" size={20} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const boxStyles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  iconBtn: { padding: 8, backgroundColor: "#F3F4F6", borderRadius: 12 },
  nameRow: { marginBottom: 12 },
  boxName: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 6 },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  metaBlock: { flex: 1 },
  metaLabel: { fontSize: 11, color: "#9CA3AF" },
  metaValue: { fontSize: 13, fontWeight: "500", color: "#374151" },
  statsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  statsLeft: { flexDirection: "row", gap: 24 },
  statLabel: { fontSize: 13, color: "#9CA3AF", marginBottom: 2 },
  statValue: { fontSize: 22, fontWeight: "600", color: "#111827" },
  actionsRow: { flexDirection: "row", gap: 8 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BoxesScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const { showToast } = useToast();
  const { id, client_id, vendor_id } = useLocalSearchParams();
  const router = useRouter();

  const project: Project = {
    id: Number(id),
    client_id: Number(client_id),
    vendor_id: Number(vendor_id),
  };

  const [projectDetails, setProjectDetails] = useState<ProjectDetailsResponse | null>(null);
  const [showGlobalLoader, setShowGlobalLoader] = useState(false);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingBox, setCreatingBox] = useState(false);

  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [selectedBoxForDelete, setSelectedBoxForDelete] = useState<Box | null>(null);
  const [selectedBoxForEdit, setSelectedBoxForEdit] = useState<Box | null>(null);

  // Modal visibility states
  const [showAddBox, setShowAddBox] = useState(false);
  const [showUpdateBox, setShowUpdateBox] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProjectDownloadModal, setShowProjectDownloadModal] = useState(false);

  // Refs for modals that need ref-based control (AddBoxModal, UpdateBoxModal)
  const sheetRef = useRef<any>(null);
  const updateSheetRef = useRef<any>(null);

  const fetchBoxes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/boxes/vendor/${project.vendor_id}/project/${project.id}`);
      setBoxes(res.data.map((box: any) => ({
        id: box.id,
        name: box.box_name,
        box_status: box.box_status,
        items_count: box.items_count,
        details: box.details,
        project_id: box.project_id,
        vendor_id: box.vendor_id,
        client_id: box.client_id,
      })));
    } catch (error) {
      console.error("Failed to fetch boxes:", error);
    } finally {
      setLoading(false);
    }
  }, [project.id, project.vendor_id]);

  const onAdd = useCallback(() => { fetchBoxes(); }, [fetchBoxes]);

  const fetchProjectDetails = useCallback(async () => {
    setShowGlobalLoader(true);
    try {
      const res = await axios.get(`/projects/${project.id}`);
      const data = res.data;
      const rawDate = data.details?.[0]?.estimated_completion_date || null;
      const formatDate = (d: string | null) => d
        ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
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
        client_id: data.client_id,
        estimated_completion_date: formatDate(rawDate),
        project_details_id: data.details[0]?.id,
      });
    } catch (error: any) {
      console.log("Fetch Project Details Failed:", error.message);
    } finally {
      setShowGlobalLoader(false);
    }
  }, [project.id]);

  useFocusEffect(
    useCallback(() => {
      fetchProjectDetails();
      fetchBoxes();
    }, [project.id, project.vendor_id])
  );

  // Animations
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);
  const titleOpacity = useSharedValue(0);
  const addButtonScale = useSharedValue(1);

  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    cardTranslateY.value = withSpring(0, { damping: 15, stiffness: 120 });
    titleOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, []);

  const animatedTitleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const animatedAddButtonStyle = useAnimatedStyle(() => ({ transform: [{ scale: addButtonScale.value }] }));

  // Handlers
  const handleProjectDownload = () => setShowProjectDownloadModal(true);

  const handleConfirmProjectDownload = async () => {
    setShowProjectDownloadModal(false);
    setShowGlobalLoader(true);
    try {
      if (project) await fetchProjectDetailsAndShare(project);
    } catch (err: any) {
      console.log("Download Error:", err.message);
    } finally {
      setShowGlobalLoader(false);
    }
  };

  const handleDelete = (box: Box) => { setSelectedBoxForDelete(box); setShowDeleteModal(true); };

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);
    setShowGlobalLoader(true);
    if (!selectedBoxForDelete) return;
    try {
      await axios.delete(`/boxes/delete/${selectedBoxForDelete.id}`, { data: { deleted_by: user?.id } });
      showToast("success", "Box deleted successfully");
      fetchBoxes();
    } catch (error) {
      console.error("Failed to delete box:", error);
      showToast("error", "Delete failed");
    } finally {
      setShowGlobalLoader(false);
      fetchProjectDetails();
    }
  };

  const handleEdit = (box: Box) => { setSelectedBoxForEdit(box); setShowEditModal(true); };

  const handleConfirmEdit = () => {
    setShowEditModal(false);
    setTimeout(() => { updateSheetRef.current?.present(); }, 300);
    fetchProjectDetails();
  };

  const handleDownload = (box: Box) => { setSelectedBox(box); setShowDownloadModal(true); };

  const handleConfirmDownload = async () => {
    setShowDownloadModal(false);
    setShowGlobalLoader(true);
    try {
      if (selectedBox) await fetchBoxtDetailsAndShare(selectedBox);
    } catch (err: any) {
      console.log("Download Error:", err.message);
    } finally {
      setShowGlobalLoader(false);
    }
  };

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
        <View style={{ width: 40 }} />
      </View>

      {showGlobalLoader ? (
        <View style={styles.loaderContainer}>
          <Loader />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.body}>

            {/* Project Card */}
            <ProjectCard
              project={{
                id: project.id,
                vendor_id: project.vendor_id,
                client_id: project.client_id,
                projectName: projectDetails.project_name,
                totalNoItems: projectDetails.total_items,
                unpackedItems: projectDetails.total_unpaked,
                packedItems: projectDetails.total_packed,
                status: projectDetails.project_status,
                date: projectDetails.estimated_completion_date,
              }}
              index={0}
              disableNavigation={true}
              onDownloadPress={handleProjectDownload}
            />

            {/* Boxes section */}
            <View style={styles.boxesSection}>
              <Animated.View style={[animatedTitleStyle, styles.boxesTitleRow]}>
                <Text style={styles.boxesTitle}>
                  {boxes.length} {boxes.length === 1 ? "Box" : "Boxes"}
                </Text>
              </Animated.View>

              {loading ? (
                <View style={styles.loaderContainer}>
                  <Loader />
                </View>
              ) : (
                <FlatList
                  scrollEnabled={false}
                  data={boxes}
                  renderItem={({ item, index }) => (
                    <BoxCard
                      box={item}
                      index={index}
                      handleDownload={() => handleDownload(item)}
                      handleDeletePress={() => handleDelete(item)}
                      handleEditPress={() => handleEdit(item)}
                    />
                  )}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={styles.listContainer}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <LottieView
                        source={require("@/assets/animations/emptyBox.json")}
                        autoPlay loop={false}
                        style={styles.lottie}
                      />
                      <Text style={styles.emptyText}>0 Boxes Found</Text>
                    </View>
                  }
                />
              )}
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── Add Box FAB ── */}
      <View style={styles.addBoxBtn}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => sheetRef.current?.present()}
          onPressIn={() => { addButtonScale.value = withSpring(0.95); }}
          onPressOut={() => { addButtonScale.value = withSpring(1); }}
        >
          <Animated.View style={animatedAddButtonStyle}>
            <LinearGradient colors={["#000000", "#222222"]} style={styles.addButton}>
              <Plus size={28} color="#fff" />
              <Text style={styles.addButtonText}>Add Box</Text>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* ── Loader Overlay ── */}
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
            client_id: projectDetails.client_id,
            vendor_id: projectDetails.vendor_id,
            project_details_id: projectDetails.project_details_id,
          }}
          setCreatingBox={setCreatingBox}
        />
      )}

      {selectedBoxForEdit && (
        <UpdateBoxModal
          ref={updateSheetRef}
          setLoading={setShowGlobalLoader}
          box={selectedBoxForEdit}
          onSubmit={(updatedName) => {
            setBoxes((prev) =>
              prev.map((b) => b.id === selectedBoxForEdit.id ? { ...b, name: updatedName } : b)
            );
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
        visible={showDeleteModal}
        title="Delete Box"
        message={`Are you sure you want to delete "${selectedBoxForDelete?.name}"?`}
        confirmLabel="Yes, Delete"
        type="delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cardBg },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  body: { flex: 1, marginHorizontal: 16, paddingVertical: 24 },
  boxesSection: { flex: 1, marginTop: 24 },
  boxesTitleRow: { marginBottom: 16 },
  boxesTitle: { fontSize: 24, fontWeight: "700", color: "#111827" },
  listContainer: { paddingBottom: 100, paddingHorizontal: 4 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#9CA3AF", fontSize: 14, marginTop: 8 },
  lottie: { width: 220, height: 220 },
  addBoxBtn: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 25 : 16,
    right: 18, left: 18,
  },
  addButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 16, paddingHorizontal: 24, borderRadius: 50,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  addButtonText: { color: "white", fontSize: 17, fontWeight: "700", marginLeft: 12 },
  loaderOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center", alignItems: "center", zIndex: 9999,
  },
});
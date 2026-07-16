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
import { fetchAllBoxesPdfAndShare, fetchProjectDetailsAndShare } from "@/utils/projectPdfUtils";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { ArrowLeft, Box, Download, Package, Plus, ScanLine, SquarePen, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
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
}

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
  visible, title, message, confirmLabel, cancelLabel = "Cancel",
  type = "download", onConfirm, onCancel,
}: ConfirmModalProps) {
  const confirmBg = type === "delete" ? "#E63946" : "#2A9D8F";
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
  box, index, handleDownload, handleEditPress, machine_id, machine_name,
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
      (item) =>
        item.field_value &&
        String(item.field_value).trim()
    ) || [];

  useEffect(() => {
    cardOpacity.value = withDelay(index * 80, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    cardTranslateY.value = withDelay(index * 80, withSpring(0, { damping: 18, stiffness: 130 }));
  }, [index]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }, { scale: scale.value }],
  }));

  const isPacked = box.box_status === "packed";
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
    <Animated.View
      style={[
        animatedCardStyle,
        boxStyles.card,
      ]}
    >
      <View
        style={[
          boxStyles.accentStrip,
          {
            backgroundColor:
              isPacked
                ? "#2A9D8F"
                : "#F4A261",
          },
        ]}
      />

      <View style={boxStyles.cardBody}>
        <View style={boxStyles.headerRow}>
          <View
            style={[
              boxStyles.iconWrap,
              {
                backgroundColor:
                  isPacked
                    ? "#E6F7F5"
                    : "#FFF8EE",
              },
            ]}
          >
            <Package
              size={18}
              color={
                isPacked
                  ? "#2A9D8F"
                  : "#F4A261"
              }
            />
          </View>

          <Text
            style={boxStyles.boxName}
            numberOfLines={1}
          >
            {box.name}
          </Text>

          <View
            style={[
              boxStyles.statusPill,
              {
                backgroundColor:
                  isPacked
                    ? "#E6F7F5"
                    : "#FFF8EE",
              },
            ]}
          >
            <Text
              style={[
                boxStyles.statusPillText,
                {
                  color:
                    isPacked
                      ? "#1A7A70"
                      : "#C15C0A",
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

                <Text
                  style={boxStyles.dynamicInfoValue}
                  numberOfLines={1}
                >
                  {item.field_value}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={boxStyles.footerRow}>
          <View style={boxStyles.countChip}>
            <Box
              size={13}
              color="#6B7280"
            />

            <Text style={boxStyles.countChipText}>
              {box.items_count}{" "}
              {box.items_count === 1
                ? "item"
                : "items"}
            </Text>
          </View>

          <View style={boxStyles.actions}>
            <TouchableOpacity
              style={boxStyles.actionBtn}
              onPress={() =>
                isEmpty
                  ? showToast(
                      "warning",
                      "Download Failed, Box is empty"
                    )
                  : handleDownload()
              }
              hitSlop={{
                top: 8,
                bottom: 8,
                left: 8,
                right: 8,
              }}
            >
              <Download
                size={17}
                color="#6B7280"
              />
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
              <SquarePen
                size={17}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  </TouchableOpacity>
);
}

const boxStyles = StyleSheet.create({
  card: {
    flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 16,
    overflow: "hidden", marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  accentStrip: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  boxName: { flex: 1, fontSize: 14, fontWeight: "700", color: "#111827" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontWeight: "700" },
  metaRow: { flexDirection: "row" },
  metaChip: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB",
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flex: 1,
  },
  metaChipLabel: { fontSize: 11, color: "#9CA3AF" },
  metaChipValue: { fontSize: 11, fontWeight: "600", color: "#374151", flex: 1 },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  countChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#F3F4F6", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  countChipText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  actions: { flexDirection: "row", gap: 4 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
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

  const [projectDetails, setProjectDetails] = useState<ProjectDetailsResponse | null>(null);
  const [showGlobalLoader, setShowGlobalLoader] = useState(false);
  const [boxes, setBoxes] = useState<BoxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingBox, setCreatingBox] = useState(false);

  const [selectedBox, setSelectedBox] = useState<BoxItem | null>(null);
  const [selectedBoxForEdit, setSelectedBoxForEdit] = useState<BoxItem | null>(null);

  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProjectDownloadModal, setShowProjectDownloadModal] = useState(false);
  const [showAllBoxesDownloadModal, setShowAllBoxesDownloadModal] = useState(false); // ← new

  const sheetRef = useRef<any>(null);
  const updateSheetRef = useRef<any>(null);

  const fetchBoxes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/boxes/vendor/${project.vendor_id}/project/${project.id}`);
      setBoxes(
        res.data.map((box: any) => ({
          id: box.id,
          name: box.box_name,
          box_status: box.box_status,
          items_count: box.items_count,
          details: box.details,
          project_id: box.project_id,
          vendor_id: box.vendor_id,
          lead_id: box.lead_id,
          machine_id: projectDetails?.machine_id || null,
          machine_name: projectDetails?.machine_name || "",
          box_info_values: box.box_info_values || [],
        }))
      );
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
        lead_id: data.lead_id,
        estimated_completion_date: formatDate(rawDate),
        project_details_id: data.details[0]?.id,
        machine_id: data.machine_id,
        machine_name: data.machine_name,
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

  const addButtonScale = useSharedValue(1);
  const animatedAddButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addButtonScale.value }],
  }));

  const handleEdit = (box: BoxItem) => { setSelectedBoxForEdit(box); setShowEditModal(true); };
  const handleDownload = (box: BoxItem) => { setSelectedBox(box); setShowDownloadModal(true); };

  const handleConfirmEdit = () => {
    setShowEditModal(false);
    setTimeout(() => { updateSheetRef.current?.present(); }, 300);
    fetchProjectDetails();
  };

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

  const handleConfirmProjectDownload = async () => {
    setShowProjectDownloadModal(false);
    setShowGlobalLoader(true);
    try {
      await fetchProjectDetailsAndShare(project);
    } catch (err: any) {
      console.log("Download Error:", err.message);
    } finally {
      setShowGlobalLoader(false);
    }
  };

  // ── All boxes PDF ──────────────────────────────────────────────────────────
  const handleConfirmAllBoxesDownload = async () => {
    setShowAllBoxesDownloadModal(false);
    setShowGlobalLoader(true);
    try {
      await fetchAllBoxesPdfAndShare({
        id: project.id,
        vendor_id: project.vendor_id,
      });
    } catch (err: any) {
      console.log("All Boxes Download Error:", err.message);
      showToast("error", "Failed to download boxes PDF");
    } finally {
      setShowGlobalLoader(false);
    }
  };

  if (!projectDetails) return <Loader />;

  const packedCount = boxes.filter(b => b.box_status === "packed").length;
  const unpackedCount = boxes.filter(b => b.box_status === "unpacked").length;

  return (
    <View style={styles.root}>

      {/* ── Navbar ── */}
      <View style={commonStyles.navbar}>
        <TouchableOpacity style={commonStyles.navbarBackBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <ArrowLeft size={20} color={colors.white} />
        </TouchableOpacity>
        <View style={commonStyles.navbarTitleBlock}>
          <Text style={commonStyles.navbarTitle} numberOfLines={1}>{projectDetails.project_name}</Text>
          <Text style={commonStyles.navbarSubtitle}>Project Details</Text>
        </View>
        <TouchableOpacity
          style={commonStyles.navbarBackBtn}
          onPress={() => router.push("/scanner")}
          activeOpacity={0.8}
        >
          <ScanLine size={20} color={colors.white} />
        </TouchableOpacity>
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

      {showGlobalLoader ? (
        <View style={styles.center}><Loader /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

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
            disableNavigation={true}
            onDownloadPress={() => setShowProjectDownloadModal(true)}
          />

          <View style={styles.boxesSection}>

            {/* ── Section header with Download All button ── */}
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  {boxes.length} {boxes.length === 1 ? "Box" : "Boxes"}
                </Text>
                {boxes.length > 0 && (
                  <Text style={styles.sectionSubtitle}>
                    {packedCount} packed · {unpackedCount} unpacked
                  </Text>
                )}
              </View>

              {/* Download All button — shown only when there are boxes */}
              {boxes.length > 0 && (
                <TouchableOpacity
                  style={styles.downloadAllBtn}
                  onPress={() => setShowAllBoxesDownloadModal(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Download size={15} color="#2A9D8F" />
                  <Text style={styles.downloadAllText}>All Boxes</Text>
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <View style={styles.center}><Loader /></View>
            ) : (
              <FlatList
                scrollEnabled={false}
                data={boxes}
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
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <LottieView
                      source={require("@/assets/animations/emptyBox.json")}
                      autoPlay loop={false}
                      style={styles.lottie}
                    />
                    <Text style={styles.emptyTitle}>No boxes yet</Text>
                    <Text style={styles.emptySubtitle}>Tap "Add Box" to create your first box</Text>
                  </View>
                }
              />
            )}
          </View>
        </ScrollView>
      )}

      {/* ── Add Box FAB ── */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => sheetRef.current?.present()}
          onPressIn={() => { addButtonScale.value = withSpring(0.95); }}
          onPressOut={() => { addButtonScale.value = withSpring(1); }}
        >
          <Animated.View style={animatedAddButtonStyle}>
            <LinearGradient colors={["#111827", "#374151"]} style={styles.fabButton}>
              <Plus size={22} color="#fff" />
              <Text style={styles.fabText}>Add Box</Text>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {creatingBox && (
        <View style={styles.loaderOverlay}><Loader /></View>
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
            machine_id: projectDetails.machine_id,    // ← add this
            machine_name: projectDetails.machine_name,  // ← add this
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
                      updatedBox?.box_info_values ||
                      b.box_info_values ||
                      [],
                  }
                  : b
              )
            );

            fetchBoxes();
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
        message={`Download a combined PDF for all ${boxes.length} boxes in "${projectDetails.project_name}"?`}
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 },
  boxesSection: { marginTop: 20 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",          // vertically center title + button
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  sectionSubtitle: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
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
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginTop: 4 },
  emptySubtitle: { fontSize: 13, color: "#9CA3AF", marginTop: 4, textAlign: "center" },
  fabContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 32 : 20,
    right: 18, left: 18,
  },
  fabButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 16, borderRadius: 50,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 8,
  },
  fabText: { color: "white", fontSize: 16, fontWeight: "700", marginLeft: 10 },
  loaderOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center", alignItems: "center", zIndex: 9999,
  },
 
});

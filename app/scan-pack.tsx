import Loader from "@/components/generic/Loader";
import { ProjectCard } from "@/components/ItemCards/ProjectCard";
import { useToast } from "@/components/Notification/ToastProvider";
import { colors } from "@/components/theme/colors";
import { commonStyles } from "@/components/theme/commonStyles";
import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
import { fetchProjectDetailsAndShare } from "@/utils/projectPdfUtils";
import { router, useFocusEffect } from "expo-router";
import LottieView from "lottie-react-native";
import { ArrowLeft, ScanLine } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSelector } from "react-redux";

interface ProjectCardProps {
  project: {
    id: number;
    vendor_id: number;
    client_id: number;
    projectName: string;
    totalNoItems: number;
    unpackedItems: number;
    packedItems: number;
    status: string;
    date: string;
  };
  index: number;
}

interface FormattedProject {
  id: number;
  vendor_id: number;
  client_id: number;
  project_details_id: number | null;
  projectName: string;
  totalNoItems: number;
  unpackedItems: number;
  packedItems: number;
  status: string;
  date: string;
  isCompleted: boolean;
  completionPercentage: number;
}

export default function ProfileTabScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [projects, setProjects] = useState<ProjectCardProps["project"][]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectCardProps["project"] | null>(null);
  const [downloadLoading, setDownloadLoading] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { showToast } = useToast();

  const handleConfirm = async () => {
    setShowConfirmModal(false);
    setDownloadLoading(true);
    try {
      if (selectedProject) {
        await fetchProjectDetailsAndShare(selectedProject);
      }
    } catch (error: any) {
      console.log("Download Error", error.message);
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleDownload = (project: ProjectCardProps["project"]) => {
    setSelectedProject(project);
    setShowConfirmModal(true);
  };

  const fetchProjects = async () => {
    try {
      const vendorId = user?.vendor_id;
      if (!vendorId) return;

      const response = await axios.get(`/projects/vendor/${vendorId}`);

      const formatted: FormattedProject[] = response.data.map((proj: any) => ({
        id: proj.id,
        vendor_id: proj.vendor_id,
        client_id: proj.client_id,
        project_details_id: proj.details[0]?.id ?? null,
        projectName: proj.project_name,
        totalNoItems: proj.aggregatedTotals?.total_items ?? 0,
        unpackedItems: proj.aggregatedTotals?.total_unpacked ?? 0,
        packedItems: proj.aggregatedTotals?.total_packed ?? 0,
        status: proj.project_status,
        date: proj.details[0]?.estimated_completion_date
          ? new Date(proj.details[0].estimated_completion_date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "N/A",
        isCompleted:
          proj.aggregatedTotals?.total_items > 0 &&
          proj.aggregatedTotals?.total_packed === proj.aggregatedTotals?.total_items,
        completionPercentage:
          proj.aggregatedTotals?.total_items > 0
            ? Math.round((proj.aggregatedTotals?.total_packed / proj.aggregatedTotals?.total_items) * 100)
            : 0,
      }));

      const potentiallyCompleted = formatted.filter(
        (project: FormattedProject) => project.isCompleted && project.status !== "completed"
      );

      if (potentiallyCompleted.length > 0) {
        try {
          const completedResponse = await axios.get(`/projects/vendor/${vendorId}/completed`);
          if (completedResponse.data.boxUpdateSummary?.length > 0) {
            const newCompletions = completedResponse.data.boxUpdateSummary.filter(
              (s: any) => !s.was_already_completed
            );
            if (newCompletions.length > 1) {
              showToast("info", `🎊 ${newCompletions.length} projects completed!`);
            }
          }
        } catch (completedError) {
          console.warn("Failed to check completed projects:", completedError);
          if (__DEV__) {
            showToast("error", "Failed to check project completions");
          }
        }
      }

      setProjects(formatted);
    } catch (error) {
      console.error("Failed to fetch projects", error);
      showToast("error", "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [user?.vendor_id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <Loader />
      </View>
    );
  }

  return (
    <View style={styles.root}>

       <View style={commonStyles.navbar}>
        <TouchableOpacity
          style={commonStyles.navbarBackBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color={colors.white} />
        </TouchableOpacity>
        <View style={commonStyles.navbarTitleBlock}>
          <Text style={commonStyles.navbarTitle}>Projects</Text>
          <Text style={commonStyles.navbarSubtitle}>All your projects</Text>
        </View>
        <View style={styles.navbarActions}>
          <TouchableOpacity
            style={commonStyles.navbarBackBtn}
            onPress={() => router.push("/scanner")}
            activeOpacity={0.8}
          >
            <ScanLine size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Navbar ── */}
      {/* <View style={commonStyles.navbar}>
        <View style={{ width: 40 }} />
        <View style={commonStyles.navbarTitleBlock}>
          <Text style={commonStyles.navbarTitle}>Projects</Text>
          <Text style={commonStyles.navbarSubtitle}>All your projects</Text>
        </View>
        <View style={styles.navbarActions}>
          <TouchableOpacity
            style={commonStyles.navbarBackBtn}
            onPress={() => router.push("/scanner")}
            activeOpacity={0.8}
          >
            <ScanLine size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View> */}

      {downloadLoading ? (
        <View style={styles.loaderContainer}>
          <Loader />
        </View>
      ) : (
        <FlatList
          data={projects}
          renderItem={({ item, index }) => (
            <ProjectCard
              project={item}
              index={index}
              onDownloadPress={() => handleDownload(item)}
            />
          )}
          keyExtractor={(item, index) => item.projectName + index}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <LottieView
                source={require("@/assets/animations/projectEmpty.json")}
                style={styles.lottie}
                autoPlay
                loop={false}
              />
            </View>
          }
        />
      )}

      {/* ── Download Confirmation Modal ── */}
      <Modal
        transparent
        animationType="slide"
        visible={showConfirmModal}
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowConfirmModal(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Download Project Report</Text>
            <Text style={styles.modalMessage}>
              Download box list for "{selectedProject?.projectName}"?
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowConfirmModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnConfirmText}>Yes, Download</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cardBg,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.cardBg,
  },
  navbarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listContainer: {
    padding: 20,
    paddingTop: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  lottie: {
    width: 220,
    height: 220,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
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
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 20,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancel: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalBtnCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  modalBtnConfirm: {
    backgroundColor: "#2A9D8F",
    shadowColor: "#2A9D8F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalBtnConfirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: "white",
  },
});
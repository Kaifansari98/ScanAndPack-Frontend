import Loader from "@/components/generic/Loader";
import Navbar from "@/components/generic/Navbar";
import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
import { router, useFocusEffect } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useState, useCallback, useRef } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSelector } from "react-redux";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { ConfirmationBottomSheet } from "@/components/bottomSheet/ConfirmationBottomSheet";
import { ProjectCard } from "@/components/ItemCards/ProjectCard";
import { fetchProjectDetailsAndShare } from "@/utils/projectPdfUtils";
import { useToast } from "@/components/Notification/ToastProvider";
import { QRCodeBase64Generator } from "@/components/generic/QRCodeBase64Generator";

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

// Project Card Component

export default function ProfileTabScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [projects, setProjects] = useState<ProjectCardProps["project"][]>([]);
  const [loading, setLoading] = useState(true);
  const [qrValue, setQRValue] = useState<string | null>(null);
  const [qrBase64, setQRBase64] = useState<string | null>(null);

  const confirmationRef = useRef<BottomSheetModal>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProject, setSelectedProject] = useState<
    ProjectCardProps["project"] | null
  >(null);
  const [downloadLoading, setDownloadLoading] = useState<boolean>(false);
  const { showToast } = useToast();

  const handleDownload = (project: ProjectCardProps["project"]) => {
    setSelectedProject(project);
    setQRValue(`${project.vendor_id},${project.id},${project.client_id}`); // set QR content
    confirmationRef.current?.present();
  };

  const handleConfirm = async () => {
    confirmationRef.current?.dismiss();
    setDownloadLoading(true);
    try {
      if (selectedProject && qrBase64) {
        await fetchProjectDetailsAndShare(selectedProject, qrBase64);
      }
    } catch (error: any) {
      console.log("Download Error", error.message);
    } finally {
      setDownloadLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const vendorId = user?.vendor_id;
      if (!vendorId) return;

      // Step 1: Fetch all projects first (regular flow)
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
          ? new Date(
              proj.details[0].estimated_completion_date
            ).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "N/A",
        // Add completion status for UI indicators
        isCompleted:
          proj.aggregatedTotals?.total_items > 0 &&
          proj.aggregatedTotals?.total_packed ===
            proj.aggregatedTotals?.total_items,
        completionPercentage:
          proj.aggregatedTotals?.total_items > 0
            ? Math.round(
                (proj.aggregatedTotals?.total_packed /
                  proj.aggregatedTotals?.total_items) *
                  100
              )
            : 0,
      }));

      // Step 2: Smart completion check - only run if there are potentially completed projects
      const potentiallyCompleted = formatted.filter(
        (project: FormattedProject) =>
          project.isCompleted && project.status !== "completed"
      );

      if (potentiallyCompleted.length > 0) {
        try {
          const completedResponse = await axios.get(
            `/projects/vendor/${vendorId}/completed`
          );

          // Handle completion notifications with smart logic
          if (completedResponse.data.boxUpdateSummary?.length > 0) {
            // console.log('✅ Auto-updated box status for completed projects:',
            //   completedResponse.data.boxUpdateSummary);

            completedResponse.data.boxUpdateSummary.forEach((summary: any) => {
              if (summary.was_already_completed) {
                // Project was already completed - no toast needed
                // console.log(`ℹ️ Project "${summary.project_name}" was already completed (${summary.packed_boxes}/${summary.total_boxes} boxes packed)`);
              } else if (summary.boxes_updated > 0) {
                // New completion - show celebration toast
                // showToast('success', `🎉 Project "${summary.project_name}" completed! Updated ${summary.boxes_updated} boxes.`);
                // console.log(`🎉 Project "${summary.project_name}" newly completed! Updated ${summary.boxes_updated} boxes.`);
              }
            });

            // Optional: Show summary toast if multiple projects completed
            const newCompletions =
              completedResponse.data.boxUpdateSummary.filter(
                (s: any) => !s.was_already_completed
              );
            if (newCompletions.length > 1) {
              showToast(
                "info",
                `🎊 ${newCompletions.length} projects completed!`
              );
            }
          }
        } catch (completedError) {
          console.warn("Failed to check completed projects:", completedError);
          // Optional: Show error toast only in development
          if (__DEV__) {
            showToast("error", "Failed to check project completions");
          }
        }
      } else {
        console.log(
          "ℹ️ No completed projects detected, skipping completion check"
        );
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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-sapLight-background">
        <Loader />
      </View>
    );
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  };

  return (
    <View className="flex-1 bg-sapLight-background">
      <Navbar
        title="Projects"
        showBack={false}
        showSearch={false}
        showNotification={true}
        showScan={true}
        onScanPress={() => {
          // Optional: Custom scan handler
          // If not provided, it will navigate to '/scanner'
          router.push("/scanner");
        }}
      />

      {downloadLoading ? (
        <View className="flex-1 justify-center items-center ">
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
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
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

      <ConfirmationBottomSheet
        ref={confirmationRef}
        title="Download Project Report"
        message={`Download box list for "${selectedProject?.projectName}"?`}
        confirmLabel="Yes, Download"
        cancelLabel="Cancel"
        onConfirm={handleConfirm}
        onCancel={() => {
          confirmationRef.current?.dismiss();
        }}
        type="download"
      />

      {qrValue && (
        <View style={{ position: "absolute", top: -9999, left: -9999 }}>
          <QRCodeBase64Generator
            value={qrValue}
            onGenerated={(data) => {
              setQRBase64(data);
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 24,
  },
  cardContainer: {
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  lottie: {
    width: 220,
    height: 220,
  },
});

import Loader from "@/components/generic/Loader";
import Navbar from "@/components/generic/Navbar";
import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
import { useRouter, useFocusEffect } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useState, useCallback, useRef } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSelector } from "react-redux";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { ConfirmationBottomSheet } from "@/components/bottomSheet/ConfirmationBottomSheet";
import { ProjectCard } from "@/components/ItemCards/ProjectCard";
import { fetchProjectDetailsAndShare } from "@/utils/projectPdfUtils";

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

// Project Card Component

export default function ProfileTabScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [projects, setProjects] = useState<ProjectCardProps["project"][]>([]);
  const [loading, setLoading] = useState(true);
  const confirmationRef = useRef<BottomSheetModal>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProject, setSelectedProject] = useState<
    ProjectCardProps["project"] | null
  >(null);
  const [downloadLoading, setDownloadLoading] = useState<boolean>(false);

  const handleConfirm = async() => {
    confirmationRef.current?.dismiss();
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
    confirmationRef.current?.present();
  };

  const fetchProjects = async () => {
    try {
      const vendorId = user?.vendor_id;
      if (!vendorId) return;

      const response = await axios.get(`/projects/vendor/${vendorId}`);

      const formatted = response.data.map((proj: any) => ({
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
      }));

      setProjects(formatted);
    } catch (error) {
      console.error("Failed to fetch projects", error);
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
      />

      {downloadLoading ? (
        <View className="flex-1 justify-center items-center">
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
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
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

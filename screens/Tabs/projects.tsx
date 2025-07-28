import Loader from "@/components/generic/Loader";
import Navbar from "@/components/generic/Navbar";
import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
import { useRouter, useFocusEffect } from "expo-router";
import LottieView from "lottie-react-native";
import { ChevronRight, Download } from "lucide-react-native";
import React, { useEffect, useState, useCallback } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { ScanAndPackUrl } from "@/utils/getAssetUrls";

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
function ProjectCard({ project, index }: ProjectCardProps) {
  const router = useRouter();

  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);

  const fetchBoxDetails = async () => {
    try {
      const permissionResponse = await Sharing.isAvailableAsync();
      if (!permissionResponse) {
        console.error("❌ Sharing is not available on this device");
        return;
      }

      const res = await axios.get(
        `/boxes/details/vendor/${project.vendor_id}/project/${project.id}/client/${project.client_id}/boxes`
      );
      console.log('📦 Full Box Details =>', JSON.stringify(res.data, null, 2));

      // Extract data for PDF
      const { vendor, project: projectDetails, boxes } = res.data;

      // HTML content for PDF
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
              .logo { width: 120px; }
              .vendor-details { text-align: right; }
              .vendor-details h2 { margin: 0; font-size: 18px; }
              .vendor-details p { margin: 5px 0; font-size: 14px; }
              .details { margin-bottom: 20px; }
              .details p { margin: 5px 0; font-size: 16px; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 14px; }
              th { background-color: #f2f2f2; font-weight: bold; }
              .table-container { margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <img src="${ScanAndPackUrl(vendor.logo)}" class="logo" alt="Logo" />
              <div class="vendor-details">
                <h2>${vendor.vendor_name.replace(/&/g, '&amp;')}</h2>
                <p>Contact: ${vendor.primary_contact_number}</p>
                <p>Email: ${vendor.primary_contact_email}</p>
                <p>Date: ${new Date().toLocaleDateString()}</p>
              </div>
            </div>
            <div class="details">
              <p>Project Name: ${projectDetails.project_name.replace(/&/g, '&amp;')}</p>
            </div>
            <div class="table-container">
              <table>
                <tr>
                  <th>Sr No.</th>
                  <th>Box Name</th>
                  <th>Items</th>
                </tr>
                ${boxes
                  .map((box: any, index: number) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${box.box_name.replace(/&/g, '&amp;')}</td>
                      <td>${box.total_items}</td>
                    </tr>
                  `)
                  .join('')}
              </table>
            </div>
          </body>
        </html>
      `;

      const safeProjectName = projectDetails.project_name.replace(/[^a-zA-Z0-9-_]/g, "_");
      const fileName = `${safeProjectName}-Boxes.pdf`;

      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });
      console.log("Original PDF location:", uri);

      // Move to document directory
      const newPath = FileSystem.documentDirectory + fileName;
      console.log("Moving to:", newPath);

      await FileSystem.moveAsync({
        from: uri,
        to: newPath,
      });

      // Share the PDF
      await Sharing.shareAsync(newPath, {
        mimeType: "application/pdf",
        dialogTitle: `Share ${fileName}`,
        UTI: "com.adobe.pdf",
      });
    } catch (err) {
      console.error("❌ Failed to fetch box details or generate PDF:", err);
    }
  };

  useEffect(() => {
    cardOpacity.value = withDelay(
      index * 100,
      withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      })
    );
    cardTranslateY.value = withDelay(
      index * 100,
      withSpring(0, {
        damping: 15,
        stiffness: 120,
      })
    );
  }, [index]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        router.push({
          pathname: "/dashboards/boxes",
          params: { project: JSON.stringify(project) },
        });
      }}
    >
      <Animated.View
        style={[
          animatedCardStyle,
          styles.cardContainer,
          Platform.OS === "ios" ? { marginBottom: 16 } : { marginBottom: 20 },
        ]}
        className="bg-sapLight-card w-full rounded-3xl p-5 border border-gray-100"
      >
        <View className="flex-row justify-between items-center mb-4">
          <View className="rounded-full px-3 py-1 bg-blue-100">
            <Text className="text-sm font-montserrat-semibold text-blue-700">
              {project.status}
            </Text>
          </View>
          <View>
            <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
              {project.date}
            </Text>
          </View>
        </View>

        <View className="w-full flex-row items-center justify-between mb-4">
          <Text className="text-sapLight-text font-montserrat-bold text-xl flex-1">
            {project.projectName}
          </Text>
          <TouchableOpacity
            onPress={fetchBoxDetails}
            className="p-2 rounded-lg"
          >
            <Download size={22} color="#555555" />
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-sapLight-text font-montserrat-medium text-sm">
              Total Items
            </Text>
            <Text className="text-sapLight-text font-montserrat-semibold text-xl">
              {project.totalNoItems.toLocaleString()}
            </Text>
          </View>

          <View className="flex-row space-x-6 gap-4">
            <View className="flex-col items-center">
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full mr-2 bg-green-400" />
                <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
                  Packed
                </Text>
              </View>
              <Text className="text-sapLight-text font-montserrat-semibold text-base">
                {project.packedItems.toLocaleString()}
              </Text>
            </View>

            <View className="items-center flex-col">
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full mr-2 bg-red-400" />
                <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
                  Unpacked
                </Text>
              </View>
              <Text className="text-sapLight-text font-montserrat-semibold text-base">
                {project.unpackedItems.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

export default function ProfileTabScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [projects, setProjects] = useState<ProjectCardProps["project"][]>([]);
  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const fetchProjects = async () => {
    try {
      const vendorId = user?.vendor_id;
      if (!vendorId) return;
  
      const response = await axios.get(`/projects/vendor/${vendorId}`);
  
      const formatted = response.data.map((proj: any) => ({
        id: proj.id,
        vendor_id: proj.vendor_id,
        client_id: proj.client_id,
        projectName: proj.project_name,
        totalNoItems: proj.details[0]?.total_items ?? 0,
        unpackedItems: proj.details[0]?.total_unpacked ?? 0,
        packedItems: proj.details[0]?.total_packed ?? 0,
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
      <FlatList
        data={projects}
        renderItem={({ item, index }) => (
          <ProjectCard project={item} index={index} />
        )}
        keyExtractor={(item, index) => item.projectName + index}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={{flex: 1, justifyContent:'center', alignItems: 'center'}}>
            <LottieView 
              source={require("@/assets/animations/projectEmpty.json")}
              style={styles.lottie}
              autoPlay
              loop={false}
            />
          </View>
        }
      />
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
  }
});
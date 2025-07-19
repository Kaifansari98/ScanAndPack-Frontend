import Navbar from "@/components/generic/Navbar";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import React, { useEffect } from "react";
import {
  FlatList,
  Platform,
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

// Define Project interface
interface Project {
  projectName: string;
  totalNoItems: number;
  unpackedItems: number;
  packedItems: number;
  status: "packed" | "unpacked";
  date: string;
}

// Sample project data
const projects: Project[] = [
  {
    projectName: "Website Redesign",
    totalNoItems: 12000,
    unpackedItems: 4000,
    packedItems: 8000,
    status: "packed",
    date: "12 Jun 2025",
  },
  {
    projectName: "Mobile App Dev",
    totalNoItems: 20000,
    unpackedItems: 15000,
    packedItems: 5000,
    status: "unpacked",
    date: "24 Aug 2025",
  },
  {
    projectName: "Marketing Campaign",
    totalNoItems: 8000,
    unpackedItems: 2000,
    packedItems: 6000,
    status: "packed",
    date: "17 Sep 2025",
  },
  {
    projectName: "Product Launch",
    totalNoItems: 15000,
    unpackedItems: 10000,
    packedItems: 5000,
    status: "unpacked",
    date: "29 Oct 2025",
  },
  {
    projectName: "Inventory System",
    totalNoItems: 25000,
    unpackedItems: 5000,
    packedItems: 20000,
    status: "packed",
    date: "28 Feb 2025",
  },
];

// Project Card Component
function ProjectCard({ project, index }: { project: Project; index: number }) {
  const router = useRouter();
  // Animation values
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);

  // Trigger animations on mount
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

  // Animated styles
  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  return (
    <Animated.View
      style={[
        animatedCardStyle,
        styles.cardContainer,
        Platform.OS === "ios" ? { marginBottom: 16 } : { marginBottom: 20 },
      ]}
      className="bg-sapLight-card w-full rounded-3xl p-5 border border-gray-100"
    >
      <View className="flex-row justify-between items-center mb-4">
        {/* Top Left: Status */}
        <View
          className={`rounded-full px-3 py-1 ${
            project.status === "packed" ? "bg-green-100" : "bg-red-100"
          }`}
        >
          <Text
            className={`text-sm font-montserrat-semibold ${
              project.status === "packed" ? "text-green-700" : "text-red-700"
            }`}
          >
            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
          </Text>
        </View>
        <View>
          <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
            {project.date}
          </Text>
        </View>
      </View>
      {/* Top Right: Project Name and Chevron */}
      <View className="w-full flex-row items-center justify-between mb-4">
        <Text className="text-sapLight-text font-montserrat-bold text-xl flex-1">
          {project.projectName}
        </Text>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/dashboards/boxes",
              params: { project: JSON.stringify(project) },
            })
          }
        >
          <ChevronRight size={22} color="#171717" />
        </TouchableOpacity>
      </View>
      <View className="flex-row justify-between items-center">
        {/* Bottom Left: Total Items */}
        <View>
          <Text className="text-sapLight-text font-montserrat-medium text-sm">
            Total Items
          </Text>
          <Text className="text-sapLight-text font-montserrat-semibold text-xl">
            {project.totalNoItems.toLocaleString()}
          </Text>
        </View>
        {/* Bottom Right: Packed and Unpacked */}
        <View className="flex-row space-x-6 gap-4">
          <View className="flex-col items-center">
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full mr-2 bg-green-400" />
              <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
                Packed
              </Text>
            </View>
            <View>
              <Text className="text-sapLight-text font-montserrat-semibold text-base">
                {project.packedItems.toLocaleString()}
              </Text>
            </View>
          </View>
          <View className="items-center flex-col">
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full mr-2 bg-red-400" />
              <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
                Unpacked
              </Text>
            </View>
            <View>
              <Text className="text-sapLight-text font-montserrat-semibold text-base">
                {project.unpackedItems.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export default function ProfileTabScreen() {
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
        keyExtractor={(item) => item.projectName}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
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
});

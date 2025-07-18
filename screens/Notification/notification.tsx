import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import React, { useEffect } from "react";
import Navbar from "@/components/generic/Navbar";
import { ChevronRightIcon } from "lucide-react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// Notification item interface
interface NotificationItem {
  id: number;
  name: string;
  message: string;
  time: string;
  image: any;
}

// Dummy data
const notifications: NotificationItem[] = [
  {
    id: 1,
    name: "Ronald Weasley",
    message: "You have a new message from Ronald Weasley.",
    time: "18-07-2025, 03:00 PM", // Just now (few minutes ago)
    image: require("../../assets/images/Profile/profile.png"),
  },
  {
    id: 2,
    name: "Harry Potter",
    message: "You have a new message from Harry Potter.",
    time: "18-07-2025, 01:30 PM", // 1–2 hours ago
    image: require("../../assets/images/Profile/profile.png"),
  },
  {
    id: 3,
    name: "Hermione Granger",
    message: "You have a new message from Hermione Granger.",
    time: "17-07-2025, 09:15 PM", // yesterday
    image: require("../../assets/images/Profile/profile.png"),
  },
  {
    id: 4,
    name: "Draco Malfoy",
    message: "You have a new message from Draco Malfoy.",
    time: "14-07-2025, 02:45 PM", // few days ago
    image: require("../../assets/images/Profile/profile.png"),
  },
  {
    id: 5,
    name: "Luna Lovegood",
    message: "You have a new message from Luna Lovegood.",
    time: "18-07-2025, 18:44 AM", // 10 days ago
    image: require("../../assets/images/Profile/profile.png"),
  },
  {
    id: 6,
    name: "Neville Longbottom",
    message: "You have a new message from Neville Longbottom.",
    time: "28-06-2025, 12:30 PM", // 20+ days ago
    image: require("../../assets/images/Profile/profile.png"),
  },
  {
    id: 7,
    name: "Sirius Black",
    message: "You have a new message from Sirius Black.",
    time: "18-06-2025, 05:50 PM", // 1 month ago
    image: require("../../assets/images/Profile/profile.png"),
  },
  {
    id: 8,
    name: "Severus Snape",
    message: "You have a new message from Severus Snape.",
    time: "01-06-2025, 10:10 AM", // 1.5 month ago
    image: require("../../assets/images/Profile/profile.png"),
  },
  {
    id: 9,
    name: "Albus Dumbledore",
    message: "You have a new message from Albus Dumbledore.",
    time: "12-03-2025, 09:40 AM", // several months ago
    image: require("../../assets/images/Profile/profile.png"),
  },
  {
    id: 10,
    name: "Minerva McGonagall",
    message: "You have a new message from Minerva McGonagall.",
    time: "01-01-2025, 02:00 PM", // start of year
    image: require("../../assets/images/Profile/profile.png"),
  },
];


// Time-ago utility
const getTimeAgo = (timestamp: string): string => {
  try {
    const [datePart, timePart] = timestamp.split(", ");
    const [day, month, year] = datePart.split("-").map(Number);
    const [timeStr, modifierRaw] = timePart.split(" ");
    const modifier = modifierRaw?.toUpperCase();
    let [hour, minute] = timeStr.split(":").map(Number);

    if (modifier === "PM" && hour < 12) hour += 12;
    if (modifier === "AM" && hour === 12) hour = 0;

    const parsedDate = new Date(year, month - 1, day, hour, minute);
    const now = new Date();

    const diffMs = now.getTime() - parsedDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return parsedDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch (err) {
    return "Invalid date";
  }
};

// Card Component
function NotificationCard({
  item,
  index,
}: {
  item: NotificationItem;
  index: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(
      index * 80,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
    translateY.value = withDelay(index * 80, withSpring(0));
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, styles.cardWrapper]}>
      <View className="bg-sapLight-card p-3 rounded-2xl flex-row items-center gap-2">
        <View className="w-14 h-14 rounded-full overflow-hidden">
          <Image
            className="w-full h-full object-cover"
            source={item.image}
            resizeMode="cover"
          />
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between items-center">
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              className="text-lg font-montserrat-semibold flex-1"
            >
              {item.name}
            </Text>
            <View className="flex-row items-center space-x-1">
              <Text className="text-sm text-sapLight-infoText">
                {getTimeAgo(item.time)}
              </Text>
              <TouchableOpacity>
                <ChevronRightIcon width={20} height={20} color={"#555555"} />
              </TouchableOpacity>
            </View>
          </View>
          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            className="text-sm font-montserrat text-sapLight-infoText"
          >
            {item.message}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function NotificationScreen() {
  return (
    <View className="flex-1 bg-sapLight-background">
      <Navbar title="Notifications" showBack={true} />
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <NotificationCard item={item} index={index} />
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 32,
  },
  cardWrapper: {
    marginBottom: 5,
  },
});

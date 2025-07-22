import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import BottomSheet, { BottomSheetModal } from "@gorhom/bottom-sheet";
import { NotificationBottomSheet } from "@/components/bottomSheet/NotificationBottomSheet";
import Loader from "@/components/generic/Loader";
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
    message:
      "Ronald Weasley has sent you a new message regarding the upcoming Quidditch strategy session. Please review it before tomorrow's practice.",
    time: "18-07-2025, 03:00 PM",
    image: require("../../assets/images/Profile/profile.png"),
  },
  {
    id: 2,
    name: "Harry Potter",
    message:
      "Harry Potter just shared a new document with you outlining the defense tactics for the next Dumbledore’s Army meet-up. Kindly check it at your earliest convenience.",
    time: "18-07-2025, 01:30 PM",
    image: require("../../assets/images/Profile/profile.png"),
  },
  {
    id: 3,
    name: "Hermione Granger",
    message:
      "Hermione Granger has replied to your query about the new library rules and has included several helpful resources on spell theory. Don't forget to reply.",
    time: "17-07-2025, 09:15 PM",
    image: require("../../assets/images/Profile/profile.png"),
  },
  {
    id: 4,
    name: "Draco Malfoy",
    message:
      "Draco Malfoy mentioned you in a comment regarding the upcoming House Cup debate. He wants to discuss points privately beforehand.",
    time: "14-07-2025, 02:45 PM",
    image: require("../../assets/images/Profile/profile.png"),
  },
  {
    id: 5,
    name: "Luna Lovegood",
    message:
      "Luna Lovegood sent you a beautifully illustrated note with some fascinating insights about magical creatures — she suggests you read it under moonlight!",
    time: "18-07-2025, 06:44 AM",
    image: require("../../assets/images/Profile/profile.png"),
  },
  {
    id: 6,
    name: "Neville Longbottom",
    message:
      "Neville Longbottom has sent you updates about the Herbology project you’re collaborating on. He’s also shared some rare plant samples’ details.",
    time: "28-06-2025, 12:30 PM",
    image: require("../../assets/images/Profile/profile.png"),
  },
  {
    id: 7,
    name: "Sirius Black",
    message:
      "Sirius Black wants to meet regarding Order of the Phoenix business. It's confidential, so respond only via the secure Floo Network.",
    time: "18-06-2025, 05:50 PM",
    image: require("../../assets/images/Profile/profile.png"),
  },
  {
    id: 8,
    name: "Severus Snape",
    message:
      "Professor Snape has reviewed your last potion submission. He insists you revisit chapters 6 through 9 for proper concentration techniques.",
    time: "01-06-2025, 10:10 AM",
    image: require("../../assets/images/Profile/profile.png"),
  },
  {
    id: 9,
    name: "Albus Dumbledore",
    message:
      "Albus Dumbledore has shared his reflections on the latest prophecy. He suggests a private discussion at your earliest availability.",
    time: "12-03-2025, 09:40 AM",
    image: require("../../assets/images/Profile/profile.png"),
  },
  {
    id: 10,
    name: "Minerva McGonagall",
    message:
      "Professor McGonagall has sent a schedule revision for next week's transfiguration classes. Please verify your availability before confirming.",
    time: "01-01-2025, 02:00 PM",
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
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
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
  onPress,
}: {
  item: NotificationItem;
  index: number;
  onPress: (item: NotificationItem) => void;
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
      <TouchableOpacity
        onPress={() => onPress(item)}
        className="bg-sapLight-card p-3 rounded-2xl flex-row items-center gap-2"
      >
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
              <ChevronRightIcon width={20} height={20} color={"#555555"} />
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
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function NotificationScreen() {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [selectedItem, setSelectedItems] = useState<NotificationItem | null>(
    null
  );

  const handleBottomSheet = (item: NotificationItem) => {
    setSelectedItems(item);
    sheetRef.current?.present();
  };
  return (
    <View className="flex-1 bg-sapLight-background">
      <Navbar title="Notifications" showBack={true} />
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <NotificationCard
            item={item}
            index={index}
            onPress={handleBottomSheet}
          />
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
      <NotificationBottomSheet ref={sheetRef} selectedItem={selectedItem} />
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

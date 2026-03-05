/**
 * MachineCard — selectable card showing machine info.
 * Selected: navy bg + amber border. Unselected: white bg + subtle shadow.
 */
import { colors } from "@/components/theme/colors";
import { useIsFocused } from "@react-navigation/native";
import { useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  Image,
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

export interface MachineData {
  id: number;
  machine_name: string;
  machine_code: string;
  machine_type: string;
  image_path: string;
}

interface MachineCardProps {
  machine: MachineData;
  index: number;
  selected: boolean;
  onSelect: (machine: MachineData) => void;
}

export const MachineCard = ({ machine, index, selected, onSelect }: MachineCardProps) => {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();

  // ─── Entrance animation ───────────────────────────────
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);

  useEffect(() => {
    cardOpacity.value = withDelay(
      index * 80,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
    cardTranslateY.value = withDelay(
      index * 80,
      withSpring(0, { damping: 15, stiffness: 120 })
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  // ─── Navigate to scanner ──────────────────────────────
  const handlePress = async () => {
    // Mark as selected first
    onSelect(machine);

    const navigate = () =>
      router.push({
        pathname: "/scanner-track-trace",
        params: { machine_id: String(machine.id) },
      });

    if (!permission?.granted) {
      const result = await requestPermission();
      if (result?.granted) navigate();
    } else {
      navigate();
    }
  };

  // ─── Dynamic styles based on selection ───────────────
  const cardStyle = [
    styles.card,
    selected ? styles.cardSelected : styles.cardUnselected,
    { marginBottom: Platform.OS === "ios" ? 12 : 14 },
  ];

  const iconBubbleStyle = [
    styles.iconBubble,
    selected ? styles.iconBubbleSelected : styles.iconBubbleUnselected,
  ];

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={cardStyle}
        onPress={handlePress}
        activeOpacity={0.88}
      >
        {/* Machine image / icon bubble */}
        <View style={iconBubbleStyle}>
          <Image
            source={
              machine.image_path
                ? { uri: machine.image_path }
                : require("@/assets/images/machine-placeholder.png")
            }
            style={styles.machineImage}
            resizeMode="cover"
          />
        </View>

        {/* Info */}
        <View style={styles.infoBlock}>
          <Text
            style={[styles.machineName, selected && styles.machineNameSelected]}
            numberOfLines={1}
          >
            {machine.machine_name}
          </Text>
          <Text
            style={[styles.machineSubtitle, selected && styles.machineSubtitleSelected]}
            numberOfLines={1}
          >
            {machine.machine_type} · {machine.machine_code}
          </Text>
        </View>

        {/* Status badge */}
        <View style={[styles.badge, selected ? styles.badgeSelected : styles.badgeUnselected]}>
          <Text style={[styles.badgeText, selected && styles.badgeTextSelected]}>
            {selected ? "SELECTED" : "ACTIVE"}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // ─── Card shell ─────────────────────────────────────
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 18,
    borderWidth: 2,
  },
  cardUnselected: {
    backgroundColor: colors.white,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardSelected: {
    backgroundColor: colors.midBg,
    borderColor: colors.accent,
    shadowColor: colors.midBg,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },

  // ─── Icon bubble ────────────────────────────────────
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: "hidden",
    flexShrink: 0,
  },
  iconBubbleUnselected: {
    backgroundColor: colors.cardBg,
  },
  iconBubbleSelected: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  machineImage: {
    width: "100%",
    height: "100%",
  },

  // ─── Text ────────────────────────────────────────────
  infoBlock: {
    flex: 1,
    minWidth: 0,
  },
  machineName: {
    color: colors.heading,
    fontSize: 16,
    fontWeight: "700",
  },
  machineNameSelected: {
    color: colors.white,
  },
  machineSubtitle: {
    color: colors.label,
    fontSize: 13,
    marginTop: 3,
  },
  machineSubtitleSelected: {
    color: "rgba(255,255,255,0.65)",
  },

  // ─── Status badge ────────────────────────────────────
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  badgeUnselected: {
    backgroundColor: "rgba(42,157,143,0.12)",
  },
  badgeSelected: {
    backgroundColor: colors.accent,
  },
  badgeText: {
    color: "#2A9D8F",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  badgeTextSelected: {
    color: colors.darkBg,
  },
});
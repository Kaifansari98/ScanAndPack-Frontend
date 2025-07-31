import React, { useEffect } from "react";
import { Text, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import {
  CircleCheckBig,
  CircleX,
  CircleAlert,
  Info,
  Loader2,
} from "lucide-react-native";

export type ToastType = "success" | "error" | "info" | "warning" | "loading";

interface Props {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onClose: (id: string) => void;
  offset?: number; // spacing between stacked toasts
}

const COLORS = {
  success: {
    bg: "#dcfce7",
    border: "#4ade80",
    text: "#15803d",
    icon: <CircleCheckBig size={18} color="#22c55e" />,
  },
  error: {
    bg: "#fee2e2",
    border: "#f87171",
    text: "#b91c1c",
    icon: <CircleX size={20} color="#ef4444" />,
  },
  info: {
    bg: "#dbeafe",
    border: "#60a5fa",
    text: "#2563eb",
    icon: <Info size={20} color="#3b82f6" />,
  },
  warning: {
    bg: "#fef9c3",
    border: "#facc15",
    text: "#ca8a04",
    icon: <CircleAlert size={20} color="#f59e0b" />,
  },
  loading: {
    bg: "#f0f9ff",
    border: "#38bdf8",
    text: "#0284c7",
    icon: <Loader2 size={18} color="#0ea5e9" />,
  },
};

const NotificationToast: React.FC<Props> = ({
  id,
  type,
  message,
  duration = 3000,
  onClose,
  offset = 0,
}) => {
  const translateY = useSharedValue(-50);
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 10, stiffness: 100 });
    opacity.value = withTiming(1, { duration: 300 });

    const timeout = setTimeout(() => dismiss(), duration);

    return () => clearTimeout(timeout);
  }, []);

  const dismiss = () => {
    translateY.value = withTiming(-50, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, () =>
      runOnJS(onClose)(id)
    );
  };

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY < 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY < -40) {
        translateY.value = withTiming(-100, { duration: 150 }, () =>
          runOnJS(onClose)(id)
        );
        opacity.value = withTiming(0, { duration: 150 });
      } else {
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 50 + offset,
            alignSelf: "center",
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 9999,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            zIndex: 9999,
            backgroundColor: COLORS[type].bg,
            borderWidth: 1,
            borderColor: COLORS[type].border,
          } as ViewStyle,
          animatedStyle,
        ]}
      >
        {COLORS[type].icon}
        <Text
          style={{
            color: COLORS[type].text,
            fontWeight: "600",
            fontSize: 16,
          }}
        >
          {message}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
};

export default NotificationToast;

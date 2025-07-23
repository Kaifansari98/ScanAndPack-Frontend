import React from "react";
import { Text } from "react-native";
import Animated, {
  withSpring,
  withTiming,
  ExitAnimationsValues,
  EntryAnimationsValues,
} from "react-native-reanimated";
import {
  CircleCheckBig,
  CircleX,
  CircleAlert,
  Info,
} from "lucide-react-native";

type ToastType = "success" | "error" | "warning" | "info";

interface Props {
  type: ToastType;
  message: string;
}

const iconMap = {
  success: <CircleCheckBig size={18} color="#22c55e" />,
  error: <CircleX size={20} color="#ef4444" />,
  warning: <CircleAlert size={20} color="#f59e0b" />,
  info: <Info size={20} color="#3b82f6" />,
};

const colorMap = {
  success: {
    container: "bg-green-50 border border-green-400",
    text: "text-green-600",
  },
  error: {
    container: "bg-red-50 border border-red-400",
    text: "text-red-600",
  },
  warning: {
    container: "bg-yellow-50 border border-yellow-400",
    text: "text-yellow-600",
  },
  info: {
    container: "bg-blue-50 border border-blue-400",
    text: "text-blue-600",
  },
};

// Custom animations
const enteringAnimation = (targetValues: EntryAnimationsValues) => {
  "worklet";
  return {
    initialValues: {
      transform: [{ translateY: -50 }],
      opacity: 0,
    },
    animations: {
      transform: [
        { translateY: withSpring(0, { damping: 10, stiffness: 100 }) },
      ],
      opacity: withTiming(1, { duration: 300 }),
    },
  };
};

const exitingAnimation = (targetValues: ExitAnimationsValues) => {
  "worklet";
  return {
    initialValues: {
      transform: [{ translateY: 0 }],
      opacity: 1,
    },
    animations: {
      transform: [
        { translateY: withTiming(-50, { duration: 200 }) },
      ],
      opacity: withTiming(0, { duration: 200 }),
    },
  };
};

const NotificationToast: React.FC<Props> = ({ type, message }) => {
  return (
    <Animated.View
      entering={enteringAnimation}
      exiting={exitingAnimation}
      className={`absolute self-center flex-row items-center gap-2 px-4 py-3 rounded-full z-50 ${colorMap[type].container}`}
      style={{marginTop:70}}
    >
      {iconMap[type]}
      <Text className={`text-base font-semibold ${colorMap[type].text}`}>
        {message}
      </Text>
    </Animated.View>
  );
};

export default NotificationToast;

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Dimensions,
} from "react-native";
import React from "react";
import { BadgeInfo } from "lucide-react-native";
import Animated, { FadeInLeft, FadeInUp, FadeOutDown } from "react-native-reanimated";

const { width } = Dimensions.get("window");

type Props = {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  visible: boolean;
};

const ConfirmationBox = ({
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  visible,
}: Props) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={styles.overly}
      >
        <Animated.View
          style={styles.modalCard}
        >
          <View className="items-center mb-4">
            <BadgeInfo size={64} color="#6B7280" strokeWidth={1.5} />
          </View>

          <Text className="text-2xl font-montserrat-bold text-center text-sapLight-text mb-2">
            {title}
          </Text>

          <Text className="text-base text-center text-sapLight-infoText mb-[10px]">
            {description}
          </Text>

          <View className="flex-row justify-between gap-4">
            <TouchableOpacity
              className="flex-1 py-3 rounded-xl border border-sapLight-primary items-center"
              onPress={onCancel}
            >
              <Text className="text-sapLight-primary font-montserrat-medium text-base">
                {cancelText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 py-3 rounded-xl bg-black items-center"
              onPress={onConfirm}
            >
              <Text className="text-sapLight-background font-montserrat-semibold text-base">
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default ConfirmationBox;

const styles = StyleSheet.create({
  modalCard: {
    width: width * 0.8,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  overly: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)", // 80% opacity black
    paddingHorizontal: 16,
  },
});

import React from "react";
import { Modal, View, Text, TouchableOpacity, Dimensions } from "react-native";
import { BadgeInfo } from "lucide-react-native";
import Animated, {
  FadeIn,
  FadeOut,
  FadeInUp,
  FadeOutDown,
} from "react-native-reanimated";

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
    <View>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          className="flex-1 justify-center items-center bg-black/40 px-4"
        >
          <Animated.View
            entering={FadeInUp.duration(250)}
            exiting={FadeOutDown.duration(200)}
            className="bg-sapLight-background rounded-2xl py-6 px-5 items-center w-[85%] shadow-md elevation-10"
            style={{ width: width * 0.85 }}
          >
            <View className="mb-3">
              <BadgeInfo size={64} color="#6B7280" strokeWidth={1.5} />
            </View>

            <Text className="text-2xl text-center text-sapLight-text font-montserrat-bold mb-2">
              {title}
            </Text>

            <Text className="text-base text-center text-sapLight-infoText font-montserrat-medium mb-5">
              {description}
            </Text>

            <View className="flex-row gap-3 w-full">
              <TouchableOpacity
                onPress={onCancel}
                className="flex-1 py-3 rounded-xl border border-sapLight-text items-center"
              >
                <Text className="text-sapLight-text text-base font-montserrat-medium">
                  {cancelText}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onConfirm}
                className="flex-1 py-3 rounded-xl bg-sapLight-button items-center"
              >
                <Text className="text-sapLight-foreground text-base font-montserrat-semibold">
                  {confirmText}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
};

export default ConfirmationBox;

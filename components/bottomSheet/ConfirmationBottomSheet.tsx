import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, { JSX, useMemo } from "react";
import { Text, View, TouchableOpacity } from "react-native";
import { Trash2, Download, SquarePen, LogOut, Package } from "lucide-react-native"; // Optional fallback icon
import { Dimensions } from "react-native";
type ConfirmationType = "download" | "edit" | "delete" | "logout" | "status";

export interface ConfirmationBottomSheetProps {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  type?: ConfirmationType; // ✅ Made optional
}

const iconMap: Record<ConfirmationType, JSX.Element> = {
  delete: <Trash2 size={60} color="gray" />,
  download: <Download size={60} color="gray" />,
  edit: <SquarePen size={60} color="gray" />,
  logout: <LogOut size={60} color="gray" />,
  status: <Package size={60} color="gray" />,
};

export const ConfirmationBottomSheet = React.forwardRef<
  BottomSheetModal,
  ConfirmationBottomSheetProps
>(
  (
    {
      title = "Are you sure?",
      message = "Do you really want to proceed?",
      confirmLabel = "Confirm",
      cancelLabel = "Cancel",
      onConfirm,
      onCancel,
      type,
    },
    ref
  ) => {
    
    const screenHeight = Dimensions.get("window").height;
    const snapPoints = useMemo(() => [screenHeight * 0.6], []);

    const IconComponent = type ? iconMap[type] : null; // ✅ Optional fallback

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            pressBehavior="close"
          />
        )}
        keyboardBehavior="interactive"
        backgroundStyle={{ backgroundColor: "#ffffff" }}
      >
        <BottomSheetView className="px-6 pt-4 pb-6 bg-white">
          <Text className="text-lg font-montserrat-bold mb-2 text-center text-sapLight-text">
            {title}
          </Text>

          {/* Only show icon if type is provided */}
          {IconComponent && (
            <View className="justify-center items-center py-5">
              {IconComponent}
            </View>
          )}

          <Text className="text-base text-sapLight-infoText text-center mb-6 font-montserrat-medium">
            {message}
          </Text>

          <View className="flex-row justify-between gap-4">
            <TouchableOpacity
              className="flex-1 py-4 bg-sapLight-card rounded-xl items-center"
              onPress={onCancel}
            >
              <Text className="text-sapLight-text font-montserrat-semibold">
                {cancelLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-4 bg-black rounded-xl items-center"
              onPress={onConfirm}
            >
              <Text className="text-sapLight-background font-montserrat-semibold">
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

ConfirmationBottomSheet.displayName = "ConfirmationBottomSheet";

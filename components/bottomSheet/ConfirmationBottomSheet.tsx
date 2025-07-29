import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, { useMemo } from "react";
import { Text, View, TouchableOpacity } from "react-native";

export interface ConfirmationBottomSheetProps {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const ConfirmationBottomSheet = React.forwardRef<
  BottomSheetModal,
  ConfirmationBottomSheetProps
>(
  (
    {
      title = "Are you sure?",
      message = "Do you really want to proceed?",
      confirmLabel = "Delete",
      cancelLabel = "Cancel",
      onConfirm,
      onCancel,
    },
    ref
  ) => {
    const snapPoints = useMemo(() => ["30%"], []);

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
          <Text className="text-base text-sapLight-infoText text-center mb-6 font-montserrat-medium">
            {message}
          </Text>

          <View className="flex-row justify-between">
            <TouchableOpacity
              className="flex-1 py-3 bg-sapLight-card rounded-xl mr-2 items-center"
              onPress={onCancel}
            >
              <Text className="text-sapLight-text font-montserrat-semibold">{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-3 bg-red-600 rounded-xl ml-2 items-center d"
              onPress={onConfirm}
            >
              <Text className="text-sapLight-background font-montserrat-semibold">{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

ConfirmationBottomSheet.displayName = "ConfirmationBottomSheet";

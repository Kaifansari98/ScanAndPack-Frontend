import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, { useMemo } from "react";
import { Text, View, Image, Pressable } from "react-native";
import { Clock, X } from "lucide-react-native";

interface NotificationItem {
  id: number;
  name: string;
  message: string;
  time: string;
  image: any; // ImageSourcePropType
}

interface NotificationProps {
  ref: React.Ref<BottomSheetModal>;
  selectedItem: NotificationItem | null;
}

export const NotificationBottomSheet = React.forwardRef<
  BottomSheetModal,
  NotificationProps
>(({ selectedItem }, ref) => {
  const snapPoints = useMemo(() => ["40%", "80%"], []);

  const handleClose = () => {
    (ref as any)?.current?.close?.();
  };

  return (
    <BottomSheetModal
      ref={ref}
      index={1}
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
      <BottomSheetView className="flex-1 px-4 py-3 bg-sapLight-background">
        {/* Content */}
        {selectedItem ? (
          <View className="items-center w-full">
            {/* Profile Image */}
            <View className="w-28 h-28 rounded-full overflow-hidden mb-3 border-2 border-sapLight-border shadow-md">
              <Image
                className="w-full h-full"
                source={selectedItem.image}
                resizeMode="cover"
              />
            </View>

            {/* Name */}
            <Text className="text-2xl font-montserrat-semibold text-sapLight-text mb-1">
              {selectedItem.name}
            </Text>

            <Text className="text-md font-montserrat-medium text-sapLight-infoText mb-4">
              {selectedItem.time}
            </Text>

            {/* Message */}
            <View className="bg-sapLight-card w-full p-4 rounded-lg shadow-sm">
              <Text className="text-base font-montserrat-medium text-sapLight-text text-left leading-6">
                {selectedItem.message}
              </Text>
            </View>
          </View>
        ) : (
          <View className="flex-1 justify-center items-center">
            <Text className="text-base text-sapLight-infoText font-montserrat-medium">
              No notification selected.
            </Text>
          </View>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

NotificationBottomSheet.displayName = "NotificationBottomSheet";

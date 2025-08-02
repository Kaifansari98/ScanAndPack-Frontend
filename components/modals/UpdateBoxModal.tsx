import React, { useEffect, useMemo, useState } from "react";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { X } from "lucide-react-native";
import {
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
} from "react-native";
import axios from "@/lib/axios";
import { useToast } from "@/components/Notification/ToastProvider";

interface Box {
  id: number;
  name: string;
  box_status: "packed" | "unpacked" | string;
  items_count: number;
  details: any;
  project_id: number;
  vendor_id: number;
  client_id: number;
}

interface UpdateBoxModalProps {
  box: Box;
  onSubmit: (updatedName: string) => void;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export const UpdateBoxModal = React.forwardRef<
  BottomSheetModal,
  UpdateBoxModalProps
>(({ box, onSubmit, setLoading }, ref) => {
  const { showToast } = useToast();
  const snapPoints = useMemo(() => ["40%", "80%"], []);
  const [boxName, setBoxName] = useState(box.name || "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBoxName(box.name || "");
    setError(null);
  }, [box]);

  const handleUpdate = async () => {
    (ref as any).current.close();
    setLoading(true)
    if (!boxName.trim()) {
      setError("Box name is required");
      showToast("error", "Box name is required");
      return;
    }

    try {
      const payload = {
        id: box.id,
        vendor_id: box.vendor_id,
        project_id: box.project_id,
        client_id: box.client_id,
        box_name: boxName.trim(),
      };

      await axios.put("/boxes/update-name", payload);
      showToast("success", "Box name updated successfully");
      onSubmit(boxName.trim());
      (ref as any).current?.dismiss();
    } catch (err: any) {
      showToast(
        "error",
        `Failed to update box: ${err.response?.data?.message || err.message}`
      );
    } finally {
      setLoading(false)
    }
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
    >
      <BottomSheetView className="flex-1 p-5 bg-white">
        {/* Header */}
        <View className="flex-row justify-between items-center z-10">
          <Text className="text-lg font-montserrat-semibold text-sapLight-text ">
            Update Box Name
          </Text>
          <TouchableOpacity onPress={() => (ref as any).current.dismiss()}>
            <X size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Image */}
        <Image
          source={require("@/assets/images/projects/Boxes.jpg")}
          className="w-full h-44 rounded-xl my-4"
          resizeMode="cover"
        />

        {/* Input Label */}
        <Text className="text-sm font-montserrat-semibold text-sapLight-text mb-2">
          Box Name
        </Text>

        {/* Input Field */}
        <BottomSheetTextInput
          value={boxName}
          onChangeText={(text) => {
            setBoxName(text);
            if (error) setError(null);
          }}
          placeholder="Enter box name"
          placeholderTextColor="#999"
          className={`bg-sapLight-foreground rounded-xl px-4 py-5 font-montserrat-medium text-sapLight-text mb-3 ${
            error ? "border border-red-500" : ""
          }`}
        />

        {/* Error/Instruction */}
        <Text className="text-sm text-sapLight-infoText mb-5">
          Please update the box name to something relevant and descriptive.
        </Text>

        {/* Action Buttons */}
        <View className="flex-row justify-between gap-3">
          <TouchableOpacity
            className="flex-1 py-4 bg-white border border-black rounded-xl"
            onPress={() => (ref as any).current.dismiss()}
          >
            <Text className="text-center font-montserrat-bold text-sapLight-text">
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-4 bg-sapLight-text rounded-xl border border-sapLight-text font-montserrat`}
            onPress={handleUpdate}
          >
            <Text className="text-center text-sapLight-background font-montserrat-bold">
              update
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

UpdateBoxModal.displayName = "UpdateBoxModal";

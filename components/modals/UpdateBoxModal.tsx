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
  StyleSheet,
  Image,
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
}

export const UpdateBoxModal = React.forwardRef<BottomSheetModal, UpdateBoxModalProps>(
  ({ box, onSubmit }, ref) => {
    const { showToast } = useToast();
    const snapPoints = useMemo(() => ["50%", "80%"], []);
    const [boxName, setBoxName] = useState(box.name || "");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      setBoxName(box.name || "");
      setError(null);
    }, [box]);

    const handleUpdate = async () => {
      if (!boxName.trim()) {
        setError("Box name is required");
        showToast("error", "Box name is required");
        return;
      }

      try {
        setLoading(true);
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
        setLoading(false);
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
        <BottomSheetView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Update Box Name</Text>
            <TouchableOpacity onPress={() => (ref as any).current.dismiss()}>
              <X size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Image */}
          <Image
            source={require("@/assets/images/projects/Boxes.jpg")}
            style={styles.image}
          />

          {/* Input */}
          <Text style={styles.label}>Box Name</Text>
          <BottomSheetTextInput
            value={boxName}
            onChangeText={(text) => {
              setBoxName(text);
              if (error) setError(null);
            }}
            placeholder="Enter box name"
            style={[styles.input, error && styles.inputError]}
            placeholderTextColor="#999"
          />

          {/* Instructions */}
          <Text style={styles.instruction}>
            Please update the box name to something relevant and descriptive.
          </Text>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => (ref as any).current.dismiss()}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, loading && { opacity: 0.6 }]}
              onPress={handleUpdate}
              disabled={loading}
            >
              <Text style={styles.addText}>
                {loading ? "Updating..." : "Update"}
              </Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

UpdateBoxModal.displayName = "UpdateBoxModal";

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  title: { fontSize: 20, fontFamily: "Montserrat-Bold" },
  image: { width: "100%", height: 180, borderRadius: 12, marginVertical: 16 },
  label: { fontSize: 14, fontFamily: "Montserrat-Medium", marginBottom: 8 },
  input: {
    backgroundColor: "#EFEFF0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 16,
    fontFamily: "Montserrat-Medium",
    marginBottom: 12,
  },
  inputError: {
    borderWidth: 1,
    borderColor: "red",
  },
  instruction: { fontSize: 13, color: "#6B7280", marginBottom: 20 },
  actions: { flexDirection: "row", justifyContent: "space-between" },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderColor: "#000",
    borderWidth: 1,
    marginRight: 8,
  },
  cancelText: {
    textAlign: "center",
    fontFamily: "Montserrat-Bold",
    color: "#000",
  },
  addBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#000",
    marginLeft: 8,
    borderColor: "#000",
    borderWidth: 1,
  },
  addText: {
    textAlign: "center",
    fontFamily: "Montserrat-Bold",
    color: "#fff",
  },
});

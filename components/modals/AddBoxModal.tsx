import axios from "@/lib/axios";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { X } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useToast } from "../Notification/ToastProvider";

interface Project {
  id: number;
  vendor_id: number;
  project_details_id: number | null;
  projectName: string;
  totalNoItems: number;
  unpackedItems: number;
  packedItems: number;
  status: "packed" | "unpacked";
  date: string;
}

interface AddBoxModalProps {
  ref: React.Ref<BottomSheetModal>;
  onSubmit: (boxName: string) => void;
  project: Project;
  setCreatingBox: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AddBoxModal = React.forwardRef<BottomSheetModal, AddBoxModalProps>(
  ({ onSubmit, project, setCreatingBox }, ref) => {
    const { showToast } = useToast();
    const snapPoints = useMemo(() => ["50%", "80%"], []);
    const [boxName, setBoxName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleAdd = async () => {
      if (!boxName.trim()) {
        setError("Box name is invalid!");
        showToast("error", "Box name is required");
        return;
      }

      try {
        setLoading(true);
        setCreatingBox(true);
        const payload = {
          project_id: project.id,
          project_details_id: project.project_details_id,
          vendor_id: project.vendor_id,
          client_id: 1,
          box_name: boxName.trim(),
          box_status: "unpacked",
          created_by: 1,
        };

        if (!project.project_details_id) {
          setError("Project details ID is missing");
          setCreatingBox(false);
          return;
        }

        console.log("Sending POST to /api/boxes with payload:", payload);
        const response = await axios.post("/boxes", payload, {
          headers: { "Content-Type": "application/json" },
        });

        console.log("Box created successfully:", response.data);
        showToast("success", "Box created successfully");
        onSubmit(boxName.trim());
        setBoxName("");
        setError(null);
        setLoading(false);
      } catch (err: any) {
        // console.error("Failed to create box:", {
        //   message: err.message,
        //   response: err.response?.data,
        //   status: err.response?.status,
        // });
        showToast(
          "error",
          `Failed to create box: ${err.response?.data?.message || err.message}`
        );
      } finally {
        setLoading(false);
        setCreatingBox(false);
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
            pressBehavior="close" // optional: tap outside to close
          />
        )}
        keyboardBehavior="interactive"
      >
        <BottomSheetView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create new Box</Text>
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
              if (error) {
                setError(null);
              }
            }}
            placeholder="Enter box name"
            style={[styles.input, error && styles.inputError]}
            placeholderTextColor="#999"
          />

          {/* Instructions */}
          <Text style={styles.instruction}>
            Please provide a relevant and descriptive name for the new box you
            want to add.
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
              onPress={handleAdd}
              disabled={loading}
            >
              <Text style={styles.addText}>
                {loading ? "Adding..." : "Add"}
              </Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

AddBoxModal.displayName = "AddBoxModal";

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
  error: {
    fontSize: 13,
    color: "red",
    marginBottom: 12,
    fontFamily: "Montserrat-Medium",
  },
});

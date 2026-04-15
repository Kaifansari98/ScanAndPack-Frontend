import { useToast } from "@/components/Notification/ToastProvider";
import axios from "@/lib/axios";
import { X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Box {
  id: number;
  name: string;
  box_status: "packed" | "unpacked" | string;
  items_count: number;
  project_id: number;
  vendor_id: number;
}

interface UpdateBoxModalProps {
  box: Box;
  onSubmit: (updatedName: string) => void;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

// Expose present() / dismiss() via ref — matches existing usage in boxes.tsx
export interface UpdateBoxModalRef {
  present: () => void;
  dismiss: () => void;
}

export const UpdateBoxModal = React.forwardRef<
  UpdateBoxModalRef,
  UpdateBoxModalProps
>(({ box, onSubmit, setLoading }, ref) => {
  const { showToast } = useToast();
  const [visible, setVisible] = useState(false);
  const [boxName, setBoxName] = useState(box.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Expose present/dismiss so caller uses same API as BottomSheetModal
  React.useImperativeHandle(ref, () => ({
    present: () => {
      setBoxName(box.name ?? "");
      setError(null);
      setVisible(true);
      setTimeout(() => inputRef.current?.focus(), 300);
    },
    dismiss: () => {
      Keyboard.dismiss();
      setVisible(false);
    },
  }));

  useEffect(() => {
    setBoxName(box.name ?? "");
    setError(null);
  }, [box]);

  const handleUpdate = async () => {
    if (!boxName.trim()) {
      setError("Box name is required");
      return;
    }

    Keyboard.dismiss();
    setSubmitting(true);
    setLoading(true);

    try {
      await axios.put("/boxes/update-name", {
        id: box.id,
        vendor_id: box.vendor_id,
        project_id: box.project_id,
        box_name: boxName.trim(),
      });

      showToast("success", "Box name updated successfully");
      onSubmit(boxName.trim());
      setVisible(false);
    } catch (err: any) {
      showToast(
        "error",
        `Failed to update box: ${err.response?.data?.message ?? err.message}`
      );
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={() => setVisible(false)}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Update Box Name</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Input */}
          <Text style={styles.label}>Box Name</Text>
          <TextInput
            ref={inputRef}
            style={[styles.input, error ? styles.inputError : null]}
            value={boxName}
            onChangeText={(text) => {
              setBoxName(text);
              if (error) setError(null);
            }}
            placeholder="Enter box name"
            placeholderTextColor="#9CA3AF"
            returnKeyType="done"
            onSubmitEditing={handleUpdate}
            autoCapitalize="words"
          />
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Text style={styles.hintText}>
              Use a descriptive name like "Kitchen Boxes" or "Box A".
            </Text>
          )}

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnCancel]}
              onPress={() => setVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnConfirm, submitting && { opacity: 0.7 }]}
              onPress={handleUpdate}
              activeOpacity={0.85}
              disabled={submitting}
            >
              <Text style={styles.btnConfirmText}>
                {submitting ? "Saving..." : "Update"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

UpdateBoxModal.displayName = "UpdateBoxModal";

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 48 : 32,
    paddingTop: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 20,
  },
  handle: {
    width: 40, height: 4, backgroundColor: "#D1D5DB",
    borderRadius: 2, alignSelf: "center", marginBottom: 16,
  },
  header: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 20,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center", alignItems: "center",
  },
  label: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8 },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5, borderColor: "#E5E7EB",
    borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 15, color: "#111827",
    marginBottom: 8,
  },
  inputError: { borderColor: "#EF4444" },
  errorText: { fontSize: 12, color: "#EF4444", marginBottom: 16 },
  hintText: { fontSize: 12, color: "#9CA3AF", marginBottom: 24 },
  btnRow: { flexDirection: "row", gap: 12 },
  btn: { flex: 1, paddingVertical: 15, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnCancel: { backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  btnCancelText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  btnConfirm: {
    backgroundColor: "#2A9D8F",
    shadowColor: "#2A9D8F", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  btnConfirmText: { fontSize: 15, fontWeight: "700", color: "white" },
});
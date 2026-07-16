import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
import { X } from "lucide-react-native";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSelector } from "react-redux";
import { useToast } from "../Notification/ToastProvider";

type BoxInfoValue = {
  field_id: number;
  field_label: string;
  field_key: string;
  field_type: "TEXT" | "NUMBER" | "DATE" | "TEXTAREA";
  field_value: string;
  is_required?: boolean;
  sort_order?: number;
};

type BoxItem = {
  id: number;
  name: string;
  project_id: number;
  vendor_id: number;
  lead_id: number;
  box_info_values?: BoxInfoValue[];
};

type UpdateBoxModalProps = {
  box: BoxItem;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  onSubmit: (
    updatedName: string,
    updatedBox?: any
  ) => void;
};

export interface UpdateBoxModalRef {
  present: () => void;
  dismiss: () => void;
}

export const UpdateBoxModal = forwardRef<
  UpdateBoxModalRef,
  UpdateBoxModalProps
>(({ box, setLoading, onSubmit }, ref) => {
  const { showToast } = useToast();
  const user = useSelector(
    (state: RootState) => state.auth.user
  );

  const [visible, setVisible] =
    useState(false);

  const [boxName, setBoxName] =
    useState(box?.name || "");

  const [boxInfoValues, setBoxInfoValues] =
    useState<BoxInfoValue[]>([]);

  const [localLoading, setLocalLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    present: () => {
      setVisible(true);
    },

    dismiss: () => {
      handleClose();
    },
  }));

  const handleClose = () => {
    setVisible(false);
    setError(null);
  };

  useEffect(() => {
    if (!visible || !box?.id) {
      return;
    }

    setBoxName(box.name || "");

    const fetchValues = async () => {
      try {
        const res =
          await axios.get(
            `/boxes/${box.id}/info-values?project_id=${box.project_id}&vendor_id=${box.vendor_id}`
          );

        setBoxInfoValues(
          res.data?.data || []
        );
      } catch (err) {
        console.log(
          "Failed to fetch box info values:",
          err
        );

        setBoxInfoValues(
          box.box_info_values || []
        );
      }
    };

    fetchValues();
  }, [
    visible,
    box?.id,
  ]);

  const validate = () => {
    if (!boxName.trim()) {
      setError("Box name is required");
      showToast(
        "error",
        "Box name is required"
      );
      return false;
    }

    for (const field of boxInfoValues) {
      if (
        field.is_required &&
        !String(
          field.field_value || ""
        ).trim()
      ) {
        showToast(
          "error",
          `${field.field_label} is required`
        );

        return false;
      }
    }

    return true;
  };

  const handleUpdate = async () => {
    if (!validate()) {
      return;
    }

    try {
      setLocalLoading(true);
      setLoading(true);

      const payload = {
        id: box.id,
        vendor_id: box.vendor_id,
        project_id: box.project_id,
        lead_id: box.lead_id,
        box_name: boxName.trim(),
        updated_by: user?.id,

        box_info_values:
          boxInfoValues.map((field) => ({
            field_id: field.field_id,
            field_value:
              String(
                field.field_value || ""
              ).trim(),
          })),
      };

      const res =
        await axios.put(
          "/boxes/update-name",
          payload
        );

      showToast(
        "success",
        "Box updated successfully"
      );

      onSubmit(
        boxName.trim(),
        res.data
      );

      handleClose();
    } catch (err: any) {
      showToast(
        "error",
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err.message ||
          "Failed to update box"
      );
    } finally {
      setLocalLoading(false);
      setLoading(false);
    }
  };

  const updateFieldValue = (
    fieldId: number,
    value: string
  ) => {
    setBoxInfoValues((prev) =>
      prev.map((field) =>
        field.field_id === fieldId
          ? {
              ...field,
              field_value: value,
            }
          : field
      )
    );
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
        style={styles.root}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={styles.sheet}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>
                Edit Box
              </Text>

              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeBtn}
              >
                <X
                  size={20}
                  color="#374151"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>
              Box Name
            </Text>

            <TextInput
              value={boxName}
              onChangeText={(text) => {
                setBoxName(text);
                setError(null);
              }}
              placeholder="Enter box name"
              placeholderTextColor="#9CA3AF"
              style={[
                styles.input,
                error && styles.inputError,
              ]}
            />

            {error && (
              <Text style={styles.errorText}>
                {error}
              </Text>
            )}

            {boxInfoValues.length > 0 && (
              <View style={styles.dynamicFieldsWrap}>
                {boxInfoValues.map((field) => (
                  <View
                    key={field.field_id}
                    style={styles.dynamicFieldItem}
                  >
                    <Text style={styles.label}>
                      {field.field_label}
                      {field.is_required ? " *" : ""}
                    </Text>

                    <TextInput
                      value={field.field_value || ""}
                      onChangeText={(text) =>
                        updateFieldValue(
                          field.field_id,
                          text
                        )
                      }
                      placeholder={`Enter ${field.field_label}`}
                      placeholderTextColor="#9CA3AF"
                      keyboardType={
                        field.field_type === "NUMBER"
                          ? "numeric"
                          : "default"
                      }
                      multiline={
                        field.field_type === "TEXTAREA"
                      }
                      style={[
                        styles.input,
                        field.field_type ===
                          "TEXTAREA" &&
                          styles.textAreaInput,
                      ]}
                    />
                  </View>
                ))}
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.addBtn,
                  localLoading && {
                    opacity: 0.6,
                  },
                ]}
                onPress={handleUpdate}
                disabled={localLoading}
                activeOpacity={0.85}
              >
                <Text style={styles.addText}>
                  {localLoading
                    ? "Updating..."
                    : "Update"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

UpdateBoxModal.displayName =
  "UpdateBoxModal";

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },

  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor:
      "rgba(0,0,0,0.45)",
  },

  sheet: {
    maxHeight: "88%",
    backgroundColor: "white",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom:
      Platform.OS === "ios" ? 40 : 24,
  },

  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },

  header: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },

  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },

  label: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "700",
    marginBottom: 6,
  },

  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    color: "#111827",
    fontSize: 14,
    backgroundColor: "#FFFFFF",
  },

  textAreaInput: {
    minHeight: 78,
    textAlignVertical: "top",
    paddingTop: 12,
  },

  inputError: {
    borderColor: "#E63946",
  },

  errorText: {
    color: "#E63946",
    fontSize: 12,
    marginTop: 6,
  },

  dynamicFieldsWrap: {
    marginTop: 14,
  },

  dynamicFieldItem: {
    marginBottom: 12,
  },

  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },

  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    color: "#374151",
    fontWeight: "700",
  },

  addBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },

  addText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
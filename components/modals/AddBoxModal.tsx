import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState
} from "react";

import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSelector } from "react-redux";
import { useToast } from "../Notification/ToastProvider";

interface Project {
  id: number;
  vendor_id: number;
  project_details_id: number | null;
  lead_id: number;
  machine_id: number;
  machine_name: string;

}

type BoxInfoField = {
  id: number;
  field_label: string;
  field_key: string;
  field_type: "TEXT" | "NUMBER" | "DATE" | "TEXTAREA";
  is_required: boolean;
  sort_order: number;
};

interface AddBoxModalProps {
  onSubmit: (boxName: string) => void;
  project: Project;
  setCreatingBox: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface AddBoxModalRef {
  present: () => void;
  dismiss: () => void;
}

export const AddBoxModal = forwardRef<AddBoxModalRef, AddBoxModalProps>(
  ({ onSubmit, project, setCreatingBox }, ref) => {
    const { showToast } = useToast();
    const [visible, setVisible] = useState(false);
    const [boxName, setBoxName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const user = useSelector((state: RootState) => state.auth.user);

    const [boxInfoFields, setBoxInfoFields] =
      useState<BoxInfoField[]>([]);

    const [boxInfoValues, setBoxInfoValues] =
      useState<Record<string, string>>({});


    const router = useRouter();


    useEffect(() => {
      if (
        !visible ||
        !project?.id ||
        !project?.vendor_id
      ) {
        return;
      }

      const fetchBoxInfoFields = async () => {
        try {
          const res =
            await axios.get(
              `/boxes/project/${project.id}/vendor/${project.vendor_id}/box-info-fields`
            );

          const fields =
            res.data?.data || [];

          setBoxInfoFields(fields);

          const initialValues: Record<string, string> = {};

          fields.forEach(
            (field: BoxInfoField) => {
              initialValues[String(field.id)] = "";
            }
          );

          setBoxInfoValues(initialValues);
        } catch (error) {
          //console.log("Failed to fetch box info fields:",error);

          setBoxInfoFields([]);
          setBoxInfoValues({});
        }
      };

      fetchBoxInfoFields();
    }, [
      visible,
      project?.id,
      project?.vendor_id,
    ]);

    useImperativeHandle(ref, () => ({
      present: () => setVisible(true),
      dismiss: () => {
        setVisible(false);
        setBoxName("");
        setError(null);
      },
    }));

    const handleClose = () => {
      setVisible(false);
      setBoxName("");
      setError(null);
      setBoxInfoValues({});
    };

    const handleAdd = async () => {
      if (!boxName.trim()) {
        setError("Box name is required!");
        showToast("error", "Box name is required");
        return;
      }

      try {
        setLoading(true);
        setCreatingBox(true);

        if (!validateBoxInfoFields()) {
          return;
        }

        const payload = {
          project_id: project.id,
          project_details_id: project.project_details_id,
          vendor_id: project.vendor_id,
          lead_id: project.lead_id,
          box_name: boxName.trim(),
          box_status: "unpacked",
          created_by: user?.id,

          box_info_values:
            boxInfoFields.map((field) => ({
              field_id: field.id,
              field_value:
                boxInfoValues[String(field.id)]
                  ?.trim() || "",
            })),
        };
        //console.log(payload);

        if (!project.project_details_id) {
          setError("Project details ID is missing");
          setCreatingBox(false);
          return;
        }

        const res = await axios.post("/boxes", payload);
        showToast("success", "Box created successfully");
        onSubmit(boxName.trim());
        handleClose();
        //console.log("res.data.machine_id:", project.machine_id)
        router.push({
          pathname: "/dashboards/boxItemsScreen",
          params: {
            payload: JSON.stringify({
              project_id: project.id,
              lead_id: project.lead_id,
              vendor_id: project.vendor_id,
              id: res.data.box.id,
              machine_id: project.machine_id,// res.data.machine_id,
              machine_name: project.machine_name// res.data.machine_name,

            }),
          },
        });
      } catch (err: any) {
        showToast("error", `Failed to create box: ${err.response?.data?.message || err.message}`);
      } finally {
        setLoading(false);
        setCreatingBox(false);
      }
    };

    const validateBoxInfoFields = () => {
      for (const field of boxInfoFields) {
        const value =
          boxInfoValues[String(field.id)]
            ?.trim();

        if (
          field.is_required &&
          !value
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

    return (
      <Modal
        transparent
        animationType="slide"
        visible={visible}
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={handleClose}
          />

          <View style={styles.sheet}>
            
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Create New Box</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* Image */}
            {/* <Image
              source={require("@/assets/images/projects/Boxes0.jpg")}
              style={styles.image}
            /> */}

            {/* Input */}
            <Text style={styles.label}>Box Name</Text>
            <TextInput
              value={boxName}
              onChangeText={(text) => {
                setBoxName(text);
                if (error) setError(null);
              }}
              placeholder="Enter box name"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, error && styles.inputError]}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}

            {boxInfoFields.length > 0 && (
  <View style={styles.dynamicFieldsWrap}>
    {boxInfoFields.map((field) => {
      const key =
        String(field.id);

      return (
        <View
          key={field.id}
          style={styles.dynamicFieldItem}
        >
          <Text style={styles.label}>
            {field.field_label}
            {field.is_required ? " *" : ""}
          </Text>

          <TextInput
            value={boxInfoValues[key] || ""}
            onChangeText={(text) =>
              setBoxInfoValues((prev) => ({
                ...prev,
                [key]: text,
              }))
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
              field.field_type === "TEXTAREA" &&
                styles.textAreaInput,
            ]}
          />
        </View>
      );
    })}
  </View>
)}

            {/* Instruction */}
            <Text style={styles.instruction}>
              Please provide a relevant and descriptive name for the new box you want to add.
            </Text>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.8}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, loading && { opacity: 0.6 }]}
                onPress={handleAdd}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.addText}>{loading ? "Adding..." : "Add"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }
);

AddBoxModal.displayName = "AddBoxModal";

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 40, height: 4, backgroundColor: "#D1D5DB", borderRadius: 2,
    alignSelf: "center", marginBottom: 16,
  },
  header: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#111827" },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center",
  },
  image: { width: "100%", height: 160, borderRadius: 12, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 8 },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111827",
    marginBottom: 8,
  },
  inputError: { borderWidth: 1.5, borderColor: "#EF4444" },
  errorText: { fontSize: 12, color: "#EF4444", marginBottom: 8 },
  instruction: { fontSize: 13, color: "#6B7280", marginBottom: 20, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 12,
    backgroundColor: "white", borderWidth: 1.5, borderColor: "#D1D5DB",
    alignItems: "center",
  },
  cancelText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  addBtn: {
    flex: 1, padding: 14, borderRadius: 12,
    backgroundColor: "#111827", alignItems: "center",
  },
  addText: { fontSize: 15, fontWeight: "700", color: "white" },
  dynamicFieldsWrap: {
  marginTop: 12,
},

dynamicFieldItem: {
  marginBottom: 12,
},

textAreaInput: {
  minHeight: 78,
  textAlignVertical: "top",
  paddingTop: 12,
},
});



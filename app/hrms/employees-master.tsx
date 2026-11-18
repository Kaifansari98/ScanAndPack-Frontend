import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Platform,
  StatusBar as RNStatusBar,
  Modal,
  ScrollView,
  Alert,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Search,
  UserCheck,
  Mail,
  Phone,
  Shield,
  Edit2,
  X,
  Check,
  Briefcase,
  ChevronDown,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import axios from "@/lib/axios";

export default function EmployeesMasterNativeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const vendorId = user?.vendor_id;

  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editEmployeeCode, setEditEmployeeCode] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [savingEdit, setSavingEdit] = useState(false);

  const safeTop =
    insets.top > 0
      ? insets.top
      : Platform.OS === "ios"
      ? 44
      : RNStatusBar.currentHeight ?? 24;

  const fetchEmployees = async (isRefresh = false) => {
    if (!vendorId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (!isRefresh) setLoading(true);
    try {
      const res = await axios.get(`/users/vendor/${vendorId}`);
      const data = res.data?.data || res.data?.users || res.data || [];
      if (Array.isArray(data)) {
        setEmployees(data);
      }
    } catch (e) {
      console.log("Error fetching employees:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [vendorId]);

  const handleOpenEdit = (emp: any) => {
    setEditingEmployee(emp);
    setEditName(emp.user_name || "");
    setEditEmail(emp.user_email || "");
    setEditContact(emp.user_contact || "");
    setEditDesignation(emp.designation || "");
    setEditDepartment(emp.department || "");
    setEditEmployeeCode(emp.employee_code || "");
    setEditStatus((emp.status || "active").toLowerCase());
    setEditModalVisible(true);
  };

  const handleSaveEmployee = async () => {
    if (!editingEmployee) return;
    if (!editName.trim()) {
      Alert.alert("Required Field", "Please enter employee name.");
      return;
    }

    setSavingEdit(true);
    try {
      const payload: any = {
        user_name: editName.trim(),
        user_email: editEmail.trim() || undefined,
        user_contact: editContact.trim() || undefined,
        designation: editDesignation.trim() || null,
        department: editDepartment.trim() || null,
        employee_code: editEmployeeCode.trim() || null,
        status: editStatus,
      };

      await axios.patch(`/users/update-user/${editingEmployee.id}`, payload);
      Alert.alert("Success", "Employee details updated successfully.");
      setEditModalVisible(false);
      fetchEmployees(true);
    } catch (e: any) {
      console.log("Error updating employee:", e);
      Alert.alert(
        "Update Failed",
        e?.response?.data?.message || "Failed to update employee details."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const filtered = employees.filter((emp) => {
    const q = search.toLowerCase();
    const name = (emp.user_name || "").toLowerCase();
    const email = (emp.user_email || "").toLowerCase();
    const contact = (emp.user_contact || "").toLowerCase();
    const code = (emp.employee_code || "").toLowerCase();
    return name.includes(q) || email.includes(q) || contact.includes(q) || code.includes(q);
  });

  return (
    <View style={[styles.root, { paddingTop: safeTop }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Employees Master</Text>
          <Text style={styles.headerSub}>{employees.length} Total Employees</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            placeholder="Search by name, email, code..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4B3A34" />
          <Text style={styles.loadingText}>Loading employees...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => String(item.id ?? index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchEmployees(true);
              }}
              colors={["#4B3A34"]}
              tintColor="#4B3A34"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <UserCheck size={44} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Employees Found</Text>
              <Text style={styles.emptySub}>
                {search ? "No records match your search." : "No employees added yet."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(item.user_name || "E").slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.cardNameBlock}>
                  <Text style={styles.empName}>{item.user_name || "Unnamed Employee"}</Text>
                  <Text style={styles.empCode}>
                    Code: {item.employee_code || `#${item.id}`}
                  </Text>
                </View>
                <View style={styles.headerRightBlock}>
                  <View
                    style={[
                      styles.statusBadge,
                      item.status === "INACTIVE" || item.status === "inactive"
                        ? styles.statusBadgeInactive
                        : styles.statusBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        item.status === "INACTIVE" || item.status === "inactive"
                          ? styles.statusTextInactive
                          : styles.statusTextActive,
                      ]}
                    >
                      {item.status || "ACTIVE"}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => handleOpenEdit(item)}
                    activeOpacity={0.7}
                  >
                    <Edit2 size={14} color="#475569" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.cardDetails}>
                {item.user_email ? (
                  <View style={styles.detailRow}>
                    <Mail size={13} color="#64748B" />
                    <Text style={styles.detailText}>{item.user_email}</Text>
                  </View>
                ) : null}
                {item.user_contact ? (
                  <View style={styles.detailRow}>
                    <Phone size={13} color="#64748B" />
                    <Text style={styles.detailText}>{item.user_contact}</Text>
                  </View>
                ) : null}
                {item.user_type?.user_type ? (
                  <View style={styles.detailRow}>
                    <Shield size={13} color="#F4A261" />
                    <Text style={[styles.detailText, { color: "#9A3412", fontWeight: "600" }]}>
                      {item.user_type.user_type}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}
        />
      )}

      {/* ── Edit Employee Modal ── */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleWrap}>
                <View style={styles.modalIconBadge}>
                  <Edit2 size={16} color="#059669" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Edit Employee</Text>
                  <Text style={styles.modalSubtitle}>
                    {editingEmployee?.employee_code || `#${editingEmployee?.id}`}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Full Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Full Name <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                />
              </View>

              {/* Employee Code */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Employee Code</Text>
                <TextInput
                  placeholder="e.g. EMP-010"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  value={editEmployeeCode}
                  onChangeText={setEditEmployeeCode}
                />
              </View>

              {/* Email Address */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email Address</Text>
                <TextInput
                  placeholder="employee@furnix.com"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={editEmail}
                  onChangeText={setEditEmail}
                />
              </View>

              {/* Phone / Contact */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Phone Number</Text>
                <TextInput
                  placeholder="e.g. 9876543210"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  keyboardType="phone-pad"
                  value={editContact}
                  onChangeText={setEditContact}
                />
              </View>

              {/* Designation */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Designation / Role Title</Text>
                <TextInput
                  placeholder="e.g. Senior Carpenter / Site Supervisor"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  value={editDesignation}
                  onChangeText={setEditDesignation}
                />
              </View>

              {/* Department */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Department</Text>
                <TextInput
                  placeholder="e.g. Factory / Operations / HR"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  value={editDepartment}
                  onChangeText={setEditDepartment}
                />
              </View>

              {/* Active Status Switch */}
              <View style={styles.statusSwitchCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusSwitchTitle}>Employee Status</Text>
                  <Text style={styles.statusSwitchSubtitle}>
                    {editStatus === "active"
                      ? "Employee is Active and can access system"
                      : "Employee is Inactive / Disabled"}
                  </Text>
                </View>
                <Switch
                  value={editStatus === "active"}
                  onValueChange={(val) => setEditStatus(val ? "active" : "inactive")}
                  trackColor={{ false: "#E2E8F0", true: "#059669" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setEditModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSaveBtn, savingEdit && { opacity: 0.7 }]}
                  onPress={handleSaveEmployee}
                  disabled={savingEdit}
                  activeOpacity={0.85}
                >
                  {savingEdit ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSaveBtnText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    backgroundColor: "#4B3A34",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
  searchBarWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#0F172A" },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  listContent: { padding: 16, gap: 12, paddingBottom: 30 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#64748B" },
  emptySub: { fontSize: 13, color: "#94A3B8" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF5ED",
    borderWidth: 1.5,
    borderColor: "#F4A261",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 14, fontWeight: "800", color: "#9A3412" },
  cardNameBlock: { flex: 1, gap: 2 },
  empName: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  empCode: { fontSize: 12, color: "#64748B" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeActive: { backgroundColor: "#ECFDF5" },
  statusBadgeInactive: { backgroundColor: "#FEF2F2" },
  statusText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  statusTextActive: { color: "#059669" },
  statusTextInactive: { color: "#DC2626" },
  headerRightBlock: { flexDirection: "row", alignItems: "center", gap: 8 },
  editBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 10 },
  cardDetails: { gap: 6 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailText: { fontSize: 12, color: "#475569" },

  // ── Modal Styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalCard: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 24,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalHeaderTitleWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  modalSubtitle: { fontSize: 11, color: "#64748B", marginTop: 1 },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  formScrollContent: { gap: 12, paddingBottom: 10 },
  fieldGroup: { gap: 5 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: "#334155" },
  requiredStar: { color: "#DC2626" },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
  },
  statusSwitchCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  statusSwitchTitle: { fontSize: 12, fontWeight: "700", color: "#0F172A" },
  statusSwitchSubtitle: { fontSize: 11, color: "#64748B", lineHeight: 15 },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    paddingTop: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  modalCancelBtnText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  modalSaveBtn: {
    backgroundColor: "#000000",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalSaveBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
});

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar as RNStatusBar,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  AlertCircle,
  Clock,
  Plus,
  X,
  Filter,
  Check,
  CheckCircle2,
  XCircle,
  Clock4,
  Layers,
} from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import axios from "@/lib/axios";

const CATEGORIES = [
  "Attendance & Time Tracking",
  "Salary & Compensation",
  "Work Environment & Facilities",
  "Management & Leadership",
  "Leave & Time Off",
  "Equipment & Tools",
  "Workplace Harassment",
  "Other",
];

type FilterStatus = "ALL" | "PENDING" | "RESOLVED" | "REJECTED";

function normalizeRole(raw: any): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw.toLowerCase().trim().replace(/[ _]+/g, "-");
  if (typeof raw === "object") {
    return (
      (raw.user_type as string | undefined)?.toLowerCase().trim().replace(/[ _]+/g, "-") ??
      (raw.name as string | undefined)?.toLowerCase().trim().replace(/[ _]+/g, "-") ??
      ""
    );
  }
  return "";
}

export default function EmployeeComplaintsNativeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useSelector((state: RootState) => state.auth);

  const userRole = normalizeRole(user?.user_type);
  const isSuperAdmin = userRole === "super-admin" || (user as any)?.is_super_admin;

  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>("ALL");
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);

  // Modal & form states
  const [modalVisible, setModalVisible] = useState(params.openRaise === "true");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const safeTop =
    insets.top > 0
      ? insets.top
      : Platform.OS === "ios"
      ? 44
      : RNStatusBar.currentHeight ?? 24;

  const fetchComplaints = async (isRefresh = false, statusToFetch?: FilterStatus) => {
    if (!isRefresh) setLoading(true);
    const filter = statusToFetch ?? selectedFilter;
    try {
      const queryParams: any = {};
      if (filter !== "ALL") {
        queryParams.status = filter;
      }
      const res = await axios.get("/complaints", { params: queryParams });
      const list =
        res.data?.data?.items ||
        res.data?.data?.complaints ||
        res.data?.data ||
        res.data ||
        [];
      if (Array.isArray(list)) {
        setComplaints(list);
      }
    } catch (e) {
      console.log("Error fetching complaints:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchComplaints(false, selectedFilter);
  }, [selectedFilter]);

  const handleSelectFilter = (status: FilterStatus) => {
    setSelectedFilter(status);
    setFilterMenuVisible(false);
  };

  const handleAction = async (id: number | string, newStatus: "RESOLVED" | "REJECTED") => {
    const actionLabel = newStatus === "RESOLVED" ? "Approve & Resolve" : "Reject";
    Alert.alert(
      `${actionLabel} Complaint`,
      `Are you sure you want to mark this complaint as ${newStatus}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: newStatus === "REJECTED" ? "destructive" : "default",
          onPress: async () => {
            try {
              await axios.patch(`/complaints/${id}/status`, {
                status: newStatus,
              });
              Alert.alert("Updated", `Complaint has been marked as ${newStatus}.`);
              fetchComplaints(true);
            } catch (err: any) {
              Alert.alert(
                "Error",
                err?.response?.data?.message || "Failed to update complaint status."
              );
            }
          },
        },
      ]
    );
  };

  const handleRaiseComplaint = async () => {
    if (!subject.trim() || !description.trim()) {
      Alert.alert("Missing Fields", "Please enter a subject and grievance description.");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post("/complaints", {
        subject: subject.trim(),
        category,
        description: description.trim(),
      });
      Alert.alert("Success", "Your grievance ticket has been raised successfully.");
      setModalVisible(false);
      setSubject("");
      setDescription("");
      fetchComplaints(true);
    } catch (e: any) {
      console.log("Complaint submission error:", e?.response?.data || e?.message);
      const errMsg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to submit complaint.";
      Alert.alert("Error", errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: safeTop }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Employee Complaints</Text>
          <Text style={styles.headerSub}>
            {selectedFilter === "ALL" ? "Grievances & Escalations" : `${selectedFilter} Grievances`}
          </Text>
        </View>
        <View style={styles.headerRightActions}>
          {isSuperAdmin ? (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setFilterMenuVisible(true)}
              activeOpacity={0.7}
            >
              <Filter size={18} color="#FFFFFF" strokeWidth={2.2} />
              {selectedFilter !== "ALL" && <View style={styles.activeFilterDot} />}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.7}
            >
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4B3A34" />
          <Text style={styles.loadingText}>Loading complaints...</Text>
        </View>
      ) : (
        <FlatList
          data={complaints}
          keyExtractor={(item, index) => String(item.id ?? index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchComplaints(true);
              }}
              colors={["#4B3A34"]}
              tintColor="#4B3A34"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <AlertCircle size={44} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Complaints Logged</Text>
              <Text style={styles.emptySub}>No grievances have been submitted.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.topRow}>
                <Text style={styles.subjectText}>{item.subject || item.title || "Grievance Ticket"}</Text>
                <View
                  style={[
                    styles.statusPill,
                    item.status === "RESOLVED"
                      ? styles.statusResolved
                      : item.status === "REJECTED"
                      ? styles.statusRejected
                      : styles.statusPending,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      item.status === "RESOLVED"
                        ? styles.statusTextResolved
                        : item.status === "REJECTED"
                        ? styles.statusTextRejected
                        : styles.statusTextPending,
                    ]}
                  >
                    {item.status || "PENDING"}
                  </Text>
                </View>
              </View>

              <Text style={styles.categoryBadge}>{item.category || "General"}</Text>

              <Text style={styles.descText} numberOfLines={3}>
                {item.description || item.complaint || "No description provided."}
              </Text>

              <View style={styles.divider} />

              <View style={styles.bottomRow}>
                <Text style={styles.authorText}>
                  By: {item.user?.user_name || item.employee_name || `Employee #${item.user_id || item.id}`}
                </Text>
                <View style={styles.dateWrap}>
                  <Clock size={11} color="#94A3B8" />
                  <Text style={styles.dateText}>
                    {item.created_at
                      ? new Date(item.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </Text>
                </View>
              </View>

              {/* Super Admin Action Buttons */}
              {isSuperAdmin && (item.status === "PENDING" || !item.status) && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleAction(item.id, "REJECTED")}
                    activeOpacity={0.8}
                  >
                    <X size={15} color="#DC2626" />
                    <Text style={styles.rejectText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleAction(item.id, "RESOLVED")}
                    activeOpacity={0.8}
                  >
                    <Check size={15} color="#059669" />
                    <Text style={styles.approveText}>Approve & Resolve</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* Filter Selection Modal */}
      <Modal
        visible={filterMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.filterMenuOverlay}
          activeOpacity={1}
          onPress={() => setFilterMenuVisible(false)}
        >
          <View style={styles.filterMenuCard}>
            <View style={styles.filterMenuHeader}>
              <Text style={styles.filterMenuTitle}>Filter By Status</Text>
              <TouchableOpacity onPress={() => setFilterMenuVisible(false)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.filterOption,
                selectedFilter === "ALL" && styles.filterOptionActive,
              ]}
              onPress={() => handleSelectFilter("ALL")}
            >
              <View style={styles.filterOptionLeft}>
                <Layers size={18} color={selectedFilter === "ALL" ? "#4B3A34" : "#64748B"} />
                <Text
                  style={[
                    styles.filterOptionText,
                    selectedFilter === "ALL" && styles.filterOptionTextActive,
                  ]}
                >
                  All Complaints
                </Text>
              </View>
              {selectedFilter === "ALL" && <Check size={16} color="#4B3A34" strokeWidth={2.5} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterOption,
                selectedFilter === "PENDING" && styles.filterOptionActive,
              ]}
              onPress={() => handleSelectFilter("PENDING")}
            >
              <View style={styles.filterOptionLeft}>
                <Clock4 size={18} color={selectedFilter === "PENDING" ? "#D97706" : "#64748B"} />
                <Text
                  style={[
                    styles.filterOptionText,
                    selectedFilter === "PENDING" && styles.filterOptionTextActive,
                  ]}
                >
                  Pending
                </Text>
              </View>
              {selectedFilter === "PENDING" && <Check size={16} color="#4B3A34" strokeWidth={2.5} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterOption,
                selectedFilter === "RESOLVED" && styles.filterOptionActive,
              ]}
              onPress={() => handleSelectFilter("RESOLVED")}
            >
              <View style={styles.filterOptionLeft}>
                <CheckCircle2 size={18} color={selectedFilter === "RESOLVED" ? "#059669" : "#64748B"} />
                <Text
                  style={[
                    styles.filterOptionText,
                    selectedFilter === "RESOLVED" && styles.filterOptionTextActive,
                  ]}
                >
                  Resolved
                </Text>
              </View>
              {selectedFilter === "RESOLVED" && <Check size={16} color="#4B3A34" strokeWidth={2.5} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterOption,
                selectedFilter === "REJECTED" && styles.filterOptionActive,
              ]}
              onPress={() => handleSelectFilter("REJECTED")}
            >
              <View style={styles.filterOptionLeft}>
                <XCircle size={18} color={selectedFilter === "REJECTED" ? "#DC2626" : "#64748B"} />
                <Text
                  style={[
                    styles.filterOptionText,
                    selectedFilter === "REJECTED" && styles.filterOptionTextActive,
                  ]}
                >
                  Rejected
                </Text>
              </View>
              {selectedFilter === "REJECTED" && <Check size={16} color="#4B3A34" strokeWidth={2.5} />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Raise Grievance Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Raise Grievance</Text>
                <Text style={styles.modalSub}>Report your workplace issue directly</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
              <Text style={styles.label}>CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryPill,
                        isSelected && { backgroundColor: "#4B3A34", borderColor: "#4B3A34" },
                      ]}
                      onPress={() => setCategory(cat)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.categoryPillText,
                          isSelected && { color: "#FFFFFF", fontWeight: "800" },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.label}>SUBJECT</Text>
              <TextInput
                style={styles.input}
                placeholder="Brief subject of the issue"
                placeholderTextColor="#94A3B8"
                value={subject}
                onChangeText={setSubject}
              />

              <Text style={styles.label}>DESCRIPTION / DETAILS</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Provide detailed explanation of your issue or request..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
              />

              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.btnDisabled]}
                onPress={handleRaiseComplaint}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Complaint</Text>
                )}
              </TouchableOpacity>
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
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  activeFilterDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
  },
  categoryBadge: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "700",
    color: "#4B3A34",
    backgroundColor: "#FFF5ED",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FFEDD5",
    marginTop: -2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  approveBtn: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
  rejectBtn: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  approveText: { fontSize: 13, fontWeight: "700", color: "#059669" },
  rejectText: { fontSize: 13, fontWeight: "700", color: "#DC2626" },

  statusApproved: { backgroundColor: "#ECFDF5" },
  statusRejected: { backgroundColor: "#FEF2F2" },
  statusPending: { backgroundColor: "#FFFBEB" },
  statusTextApproved: { color: "#059669" },
  statusTextRejected: { color: "#DC2626" },
  statusTextPending: { color: "#D97706" },

  // Filter Menu Styles
  filterMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-start",
    paddingTop: 80,
    paddingHorizontal: 20,
    alignItems: "flex-end",
  },
  filterMenuCard: {
    width: 230,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterMenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 4,
  },
  filterMenuTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  filterOptionActive: {
    backgroundColor: "#F8FAFC",
  },
  filterOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
  },
  filterOptionTextActive: {
    fontWeight: "700",
    color: "#0F172A",
  },
  headerTitleWrap: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
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
    gap: 8,
  },
  topRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  subjectText: { fontSize: 15, fontWeight: "700", color: "#0F172A", flex: 1, marginRight: 10 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  statusResolved: { backgroundColor: "#ECFDF5" },
  statusReview: { backgroundColor: "#EFF6FF" },
  statusOpen: { backgroundColor: "#FEF2F2" },
  statusPillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  statusTextResolved: { color: "#059669" },
  statusTextReview: { color: "#2563EB" },
  statusTextOpen: { color: "#DC2626" },
  descText: { fontSize: 13, color: "#475569", lineHeight: 18 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 4 },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  authorText: { fontSize: 12, color: "#64748B", fontWeight: "500" },
  dateWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 11, color: "#94A3B8" },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  modalSub: { fontSize: 12, color: "#64748B", marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  formContent: { gap: 14 },
  label: { fontSize: 11, fontWeight: "700", color: "#64748B", letterSpacing: 0.5 },
  categoryRow: { gap: 8, paddingBottom: 4 },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  categoryPillActive: {
    backgroundColor: "#4B3A34",
    borderColor: "#4B3A34",
  },
  categoryPillText: { fontSize: 13, color: "#475569", fontWeight: "600" },
  categoryPillTextActive: { color: "#FFFFFF", fontWeight: "800" },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: "#4B3A34",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});

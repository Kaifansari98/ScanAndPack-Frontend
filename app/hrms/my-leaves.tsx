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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, BookOpen, Plus, Clock, X } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import axios from "@/lib/axios";

export default function MyLeavesNativeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(params.openApply === "true");

  // Form states
  const [leaveType, setLeaveType] = useState("CASUAL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const safeTop =
    insets.top > 0
      ? insets.top
      : Platform.OS === "ios"
      ? 44
      : RNStatusBar.currentHeight ?? 24;

  const fetchMyLeaves = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await axios.get("/leaves/requests");
      const list = res.data?.data?.requests || res.data?.data || res.data || [];
      if (Array.isArray(list)) {
        setMyLeaves(list);
      }
    } catch (e) {
      console.log("Error fetching my leaves:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyLeaves();
  }, []);

  const handleApply = async () => {
    if (!fromDate || !toDate || !reason) {
      Alert.alert("Missing Fields", "Please enter start date, end date, and reason.");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post("/leaves/requests", {
        title: `${leaveType.toUpperCase()} LEAVE`,
        type: leaveType.toUpperCase(),
        start_date: fromDate.trim(),
        end_date: toDate.trim(),
        remark: reason.trim(),
      });
      Alert.alert("Success", "Leave application submitted successfully.");
      setModalVisible(false);
      setFromDate("");
      setToDate("");
      setReason("");
      fetchMyLeaves(true);
    } catch (e: any) {
      console.log("Leave application error:", e?.response?.data || e?.message);
      const errMsg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to submit leave application.";
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
          <Text style={styles.headerTitle}>My Leaves</Text>
          <Text style={styles.headerSub}>Leave Balance & Requests</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4B3A34" />
          <Text style={styles.loadingText}>Loading your leaves...</Text>
        </View>
      ) : (
        <FlatList
          data={myLeaves}
          keyExtractor={(item, index) => String(item.id ?? index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchMyLeaves(true);
              }}
              colors={["#4B3A34"]}
              tintColor="#4B3A34"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <BookOpen size={44} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Leaves Applied</Text>
              <Text style={styles.emptySub}>Click the + button above to submit a leave request.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.topRow}>
                <Text style={styles.leaveType}>{item.leave_type || "CASUAL LEAVE"}</Text>
                <View
                  style={[
                    styles.statusPill,
                    item.status === "APPROVED"
                      ? styles.statusApproved
                      : item.status === "REJECTED"
                      ? styles.statusRejected
                      : styles.statusPending,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      item.status === "APPROVED"
                        ? styles.statusTextApproved
                        : item.status === "REJECTED"
                        ? styles.statusTextRejected
                        : styles.statusTextPending,
                    ]}
                  >
                    {item.status || "PENDING"}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Clock size={13} color="#64748B" />
                <Text style={styles.dateRange}>
                  {item.from_date || item.start_date || "—"} to {item.to_date || item.end_date || "—"}
                </Text>
              </View>

              {item.reason ? (
                <Text style={styles.reasonText} numberOfLines={2}>
                  {item.reason}
                </Text>
              ) : null}
            </View>
          )}
        />
      )}

      {/* Apply Leave Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply For Leave</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>LEAVE TYPE</Text>
              <View style={styles.typeSelectorRow}>
                {["CASUAL", "SICK", "PAID"].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeChip,
                      leaveType === t && styles.typeChipActive,
                    ]}
                    onPress={() => setLeaveType(t)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        leaveType === t && styles.typeChipTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FROM DATE (YYYY-MM-DD)</Text>
              <TextInput
                placeholder="2026-11-20"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={fromDate}
                onChangeText={setFromDate}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TO DATE (YYYY-MM-DD)</Text>
              <TextInput
                placeholder="2026-11-22"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={toDate}
                onChangeText={setToDate}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>REASON</Text>
              <TextInput
                placeholder="Brief reason for your leave..."
                placeholderTextColor="#94A3B8"
                style={[styles.input, { height: 70, textAlignVertical: "top" }]}
                multiline
                value={reason}
                onChangeText={setReason}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleApply}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Leave Request</Text>
              )}
            </TouchableOpacity>
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
  addBtn: {
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
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  leaveType: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  statusApproved: { backgroundColor: "#ECFDF5" },
  statusRejected: { backgroundColor: "#FEF2F2" },
  statusPending: { backgroundColor: "#FFFBEB" },
  statusPillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  statusTextApproved: { color: "#059669" },
  statusTextRejected: { color: "#DC2626" },
  statusTextPending: { color: "#D97706" },
  divider: { height: 1, backgroundColor: "#F1F5F9" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateRange: { fontSize: 13, fontWeight: "600", color: "#334155" },
  reasonText: { fontSize: 12, color: "#64748B" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 14,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  typeSelectorRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  typeChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  typeChipActive: {
    backgroundColor: "#4B3A34",
    borderColor: "#4B3A34",
  },
  typeChipText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  typeChipTextActive: { color: "#FFFFFF" },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 11, fontWeight: "700", color: "#64748B", letterSpacing: 0.5 },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  submitBtn: {
    backgroundColor: "#4B3A34",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});

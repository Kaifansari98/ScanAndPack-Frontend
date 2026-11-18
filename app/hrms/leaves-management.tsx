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
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, CalendarDays, Check, X, Clock } from "lucide-react-native";
import { useRouter } from "expo-router";
import axios from "@/lib/axios";

export default function LeavesManagementNativeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const safeTop =
    insets.top > 0
      ? insets.top
      : Platform.OS === "ios"
      ? 44
      : RNStatusBar.currentHeight ?? 24;

  const fetchLeaves = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await axios.get("/leaves/requests");
      const list = res.data?.data?.requests || res.data?.data || res.data || [];
      if (Array.isArray(list)) {
        setLeaves(list);
      }
    } catch (e) {
      console.log("Error fetching leaves:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleDecision = async (id: number, decision: "APPROVED" | "REJECTED") => {
    try {
      await axios.patch(`/leaves/requests/${id}/decision`, { decision });
      Alert.alert("Success", `Leave request ${decision.toLowerCase()} successfully.`);
      fetchLeaves(true);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to update leave status.");
    }
  };

  return (
    <View style={[styles.root, { paddingTop: safeTop }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Leaves Management</Text>
          <Text style={styles.headerSub}>Approve & Review Requests</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4B3A34" />
          <Text style={styles.loadingText}>Loading leave requests...</Text>
        </View>
      ) : (
        <FlatList
          data={leaves}
          keyExtractor={(item, index) => String(item.id ?? index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchLeaves(true);
              }}
              colors={["#4B3A34"]}
              tintColor="#4B3A34"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CalendarDays size={44} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Leave Requests</Text>
              <Text style={styles.emptySub}>No pending or past leave applications.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isPending = !item.status || item.status === "PENDING";
            return (
              <View style={styles.card}>
                <View style={styles.topRow}>
                  <View>
                    <Text style={styles.empName}>
                      {item.user?.user_name || item.employee_name || `Employee #${item.user_id || item.id}`}
                    </Text>
                    <Text style={styles.leaveType}>{item.leave_type || "CASUAL LEAVE"}</Text>
                  </View>
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
                    Reason: {item.reason}
                  </Text>
                ) : null}

                {isPending && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleDecision(item.id, "REJECTED")}
                      activeOpacity={0.8}
                    >
                      <X size={15} color="#DC2626" />
                      <Text style={styles.rejectText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleDecision(item.id, "APPROVED")}
                      activeOpacity={0.8}
                    >
                      <Check size={15} color="#059669" />
                      <Text style={styles.approveText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
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
  topRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  empName: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  leaveType: { fontSize: 12, color: "#64748B", marginTop: 2 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  statusApproved: { backgroundColor: "#ECFDF5" },
  statusRejected: { backgroundColor: "#FEF2F2" },
  statusPending: { backgroundColor: "#FFFBEB" },
  statusPillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  statusTextApproved: { color: "#059669" },
  statusTextRejected: { color: "#DC2626" },
  statusTextPending: { color: "#D97706" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 10 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateRange: { fontSize: 13, fontWeight: "600", color: "#334155" },
  reasonText: { fontSize: 12, color: "#64748B", marginTop: 6 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 12 },
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
});

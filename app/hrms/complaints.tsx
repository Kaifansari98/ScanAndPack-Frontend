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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, AlertCircle, Clock } from "lucide-react-native";
import { useRouter } from "expo-router";
import axios from "@/lib/axios";

export default function EmployeeComplaintsNativeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const safeTop =
    insets.top > 0
      ? insets.top
      : Platform.OS === "ios"
      ? 44
      : RNStatusBar.currentHeight ?? 24;

  const fetchComplaints = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await axios.get("/complaints");
      const list = res.data?.data?.complaints || res.data?.data || res.data || [];
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
    fetchComplaints();
  }, []);

  return (
    <View style={[styles.root, { paddingTop: safeTop }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Employee Complaints</Text>
          <Text style={styles.headerSub}>Grievances & Escalations</Text>
        </View>
        <View style={{ width: 40 }} />
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
                      : item.status === "IN_REVIEW"
                      ? styles.statusReview
                      : styles.statusOpen,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      item.status === "RESOLVED"
                        ? styles.statusTextResolved
                        : item.status === "IN_REVIEW"
                        ? styles.statusTextReview
                        : styles.statusTextOpen,
                    ]}
                  >
                    {item.status || "OPEN"}
                  </Text>
                </View>
              </View>

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
            </View>
          )}
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
});

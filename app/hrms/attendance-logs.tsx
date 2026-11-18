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
import { ArrowLeft, FileClock, ArrowDownRight, ArrowUpRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import axios from "@/lib/axios";

export default function AttendanceLogsNativeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const safeTop =
    insets.top > 0
      ? insets.top
      : Platform.OS === "ios"
      ? 44
      : RNStatusBar.currentHeight ?? 24;

  const fetchLogs = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await axios.get("/attendance/logs");
      const list = res.data?.data?.logs || res.data?.data || res.data?.logs || [];
      if (Array.isArray(list)) {
        setLogs(list);
      }
    } catch (e) {
      console.log("Error fetching logs:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <View style={[styles.root, { paddingTop: safeTop }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Attendance Logs</Text>
          <Text style={styles.headerSub}>Punch Activity Trail</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4B3A34" />
          <Text style={styles.loadingText}>Loading punch logs...</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item, index) => String(item.id ?? index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchLogs(true);
              }}
              colors={["#4B3A34"]}
              tintColor="#4B3A34"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FileClock size={44} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Activity Logs</Text>
              <Text style={styles.emptySub}>No check-in or check-out logs found.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.leftCol}>
                <View style={styles.iconWrap}>
                  {item.punch_type === "OUT" ? (
                    <ArrowUpRight size={18} color="#DC2626" />
                  ) : (
                    <ArrowDownRight size={18} color="#059669" />
                  )}
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.empTitle}>
                    {item.user?.user_name || item.employee_name || `Staff #${item.user_id || item.id}`}
                  </Text>
                  <Text style={styles.punchDetails}>
                    {item.location_name || item.address || "GPS Verified Location"}
                  </Text>
                </View>
              </View>

              <View style={styles.rightCol}>
                <Text style={styles.punchTime}>
                  {item.created_at || item.punch_time
                    ? new Date(item.created_at || item.punch_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </Text>
                <Text style={styles.punchDate}>
                  {item.created_at || item.punch_time
                    ? new Date(item.created_at || item.punch_time).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })
                    : ""}
                </Text>
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
  listContent: { padding: 16, gap: 10, paddingBottom: 30 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#64748B" },
  emptySub: { fontSize: 13, color: "#94A3B8" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  leftCol: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  infoBlock: { flex: 1, gap: 2 },
  empTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  punchDetails: { fontSize: 11, color: "#64748B" },
  rightCol: { alignItems: "flex-end", gap: 2 },
  punchTime: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  punchDate: { fontSize: 11, color: "#94A3B8" },
});

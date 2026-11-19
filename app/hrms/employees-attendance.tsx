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
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  CalendarCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import axios from "@/lib/axios";

export default function EmployeesAttendanceNativeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const user = useSelector((state: RootState) => state.auth.user);
  const rawRole = (user?.user_type as any)?.user_type || user?.user_type || "";
  const roleStr = typeof rawRole === "string" ? rawRole.toLowerCase().trim() : "";
  const isSuperAdmin = roleStr === "super-admin" || roleStr === "super_admin" || (user as any)?.is_super_admin;

  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Month Picker & Calendar State
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey); // "YYYY-MM"
  const [pickerYear, setPickerYear] = useState(now.getFullYear());
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);

  const safeTop =
    insets.top > 0
      ? insets.top
      : Platform.OS === "ios"
      ? 44
      : RNStatusBar.currentHeight ?? 24;

  const fetchAttendance = async (monthToFetch?: string, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    const targetMonth = monthToFetch || selectedMonth;
    const [yearNum, monthNum] = targetMonth.split("-").map(Number);
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    const from_date = `${targetMonth}-01`;
    const to_date = `${targetMonth}-${String(lastDay).padStart(2, "0")}`;

    try {
      // 1. Try fetching from /attendance first with date range
      let list: any[] = [];
      try {
        const queryParams: any = { from_date, to_date, limit: 100 };
        if (!isSuperAdmin && user?.id) {
          queryParams.user_id = user.id;
        }
        const resList = await axios.get("/attendance", {
          params: queryParams,
        });
        const dataList = resList.data?.data?.items || resList.data?.data || [];
        if (Array.isArray(dataList) && dataList.length > 0) {
          list = dataList;
        }
      } catch (errList) {
        // Fallback to /attendance/logs
      }

      // 2. If /attendance was empty or had error, try /attendance/logs
      if (list.length === 0) {
        try {
          const logParams: any = { from: from_date, to: to_date, page_size: 100 };
          if (!isSuperAdmin && user?.id) {
            logParams.user_id = user.id;
          }
          const resLogs = await axios.get("/attendance/logs", {
            params: logParams,
          });
          const logData = resLogs.data?.data?.rows || resLogs.data?.data?.logs || resLogs.data?.data || [];
          if (Array.isArray(logData)) {
            list = logData;
          }
        } catch (errLogs) {
          console.log("Error fetching logs:", errLogs);
        }
      }

      setAttendance(list);
    } catch (e) {
      console.log("Error fetching attendance records:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttendance(selectedMonth);
  }, [selectedMonth]);

  const MONTH_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const getMonthDisplay = (key: string) => {
    const [y, m] = key.split("-").map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
  };

  const currentRealYear = now.getFullYear();
  const currentRealMonthIdx = now.getMonth();

  const isFutureMonth = (mIndex: number) => {
    if (pickerYear > currentRealYear) return true;
    if (pickerYear === currentRealYear && mIndex > currentRealMonthIdx) return true;
    return false;
  };

  const handleSelectMonth = (mIndex: number) => {
    if (isFutureMonth(mIndex)) return;
    const mStr = String(mIndex + 1).padStart(2, "0");
    const newMonthKey = `${pickerYear}-${mStr}`;
    setSelectedMonth(newMonthKey);
    setCalendarModalVisible(false);
  };

  return (
    <View style={[styles.root, { paddingTop: safeTop }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>
            {isSuperAdmin ? "Employees Attendance" : "My Attendance"}
          </Text>
          <Text style={styles.headerSub}>
            {isSuperAdmin ? "Realtime Status & Check-ins" : "Monthly Attendance History"}
          </Text>
        </View>

        {/* Top-Right Month Picker Button */}
        <TouchableOpacity
          style={styles.monthPickerBtn}
          onPress={() => setCalendarModalVisible(true)}
          activeOpacity={0.85}
        >
          <Calendar size={14} color="#000000" strokeWidth={2.2} />
          <Text style={styles.monthPickerBtnText}>{getMonthDisplay(selectedMonth)}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4B3A34" />
          <Text style={styles.loadingText}>Loading attendance data...</Text>
        </View>
      ) : (
        <FlatList
          data={attendance}
          keyExtractor={(item, index) => String(item.id ?? index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchAttendance(selectedMonth, true);
              }}
              colors={["#4B3A34"]}
              tintColor="#4B3A34"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CalendarCheck size={44} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Attendance Records</Text>
              <Text style={styles.emptySub}>No employee punches recorded yet.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const empName =
              item.employee?.name ||
              item.user?.user_name ||
              item.employee_name ||
              `Employee #${item.user_id || item.employee?.id || item.id}`;

            const checkInVal = item.check_in || item.check_in_time || item.punch_in;
            const checkOutVal = item.check_out || item.check_out_time || item.punch_out;
            const hasCheckIn = !!checkInVal;
            const hasCheckOut = !!checkOutVal;

            const rawStatus = (item.status || (hasCheckIn ? "PRESENT" : "ABSENT")).toUpperCase();
            const isWorking = rawStatus === "WORKING" || rawStatus === "PRESENT" || rawStatus === "CHECKED_IN";
            const isOnBreak = rawStatus === "ON_BREAK";
            const isMissing = rawStatus === "MISSING_PUNCH";
            const isCompleted = rawStatus === "COMPLETED";

            // Calculate total hours accurately
            let totalHoursStr = "—";
            if (item.duration_formatted) {
              totalHoursStr = item.duration_formatted;
            } else if (item.work_minutes != null && !isNaN(item.work_minutes)) {
              const h = Math.floor(item.work_minutes / 60);
              const m = Math.round(item.work_minutes % 60);
              totalHoursStr = `${h}h ${m}m`;
            } else if (item.work_seconds != null && !isNaN(item.work_seconds)) {
              const h = Math.floor(item.work_seconds / 3600);
              const m = Math.floor((item.work_seconds % 3600) / 60);
              totalHoursStr = `${h}h ${m}m`;
            } else if (item.total_hours != null && !isNaN(Number(item.total_hours))) {
              const th = Number(item.total_hours);
              const h = Math.floor(th);
              const m = Math.round((th - h) * 60);
              totalHoursStr = m > 0 ? `${h}h ${m}m` : `${h}h`;
            } else if (checkInVal && checkOutVal) {
              const inMs = new Date(checkInVal).getTime();
              const outMs = new Date(checkOutVal).getTime();
              if (outMs > inMs) {
                const diffMins = Math.floor((outMs - inMs) / 60000);
                const h = Math.floor(diffMins / 60);
                const m = diffMins % 60;
                totalHoursStr = `${h}h ${m}m`;
              }
            } else if (checkInVal && isWorking) {
              const inMs = new Date(checkInVal).getTime();
              const nowMs = Date.now();
              if (nowMs > inMs) {
                const diffMins = Math.floor((nowMs - inMs) / 60000);
                const h = Math.floor(diffMins / 60);
                const m = diffMins % 60;
                totalHoursStr = `${h}h ${m}m`;
              }
            }

            return (
              <View style={styles.card}>
                <View style={styles.topRow}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.empName}>{empName}</Text>
                    {item.employee?.designation ? (
                      <Text style={styles.empSubText}>
                        {[item.employee.designation, item.employee.location].filter(Boolean).join(" · ")}
                      </Text>
                    ) : item.date || item.attendance_date ? (
                      <Text style={styles.empSubText}>
                        {new Date(item.date || item.attendance_date).toLocaleDateString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      isWorking || isCompleted
                        ? styles.statusPillPresent
                        : isOnBreak
                        ? styles.statusPillBreak
                        : isMissing
                        ? styles.statusPillMissing
                        : styles.statusPillAbsent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isWorking || isCompleted
                          ? styles.statusTextPresent
                          : isOnBreak
                          ? styles.statusTextBreak
                          : isMissing
                          ? styles.statusTextMissing
                          : styles.statusTextAbsent,
                      ]}
                    >
                      {item.status || (hasCheckIn ? "PRESENT" : "ABSENT")}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.timeRow}>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>CHECK IN</Text>
                    <View style={styles.timeValueWrap}>
                      <Clock size={12} color="#059669" />
                      <Text style={styles.timeValue}>
                        {checkInVal
                          ? new Date(checkInVal).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "--:--"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>CHECK OUT</Text>
                    <View style={styles.timeValueWrap}>
                      <Clock size={12} color="#DC2626" />
                      <Text style={styles.timeValue}>
                        {checkOutVal
                          ? new Date(checkOutVal).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "--:--"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>TOTAL HRS</Text>
                    <Text style={styles.timeValue}>{totalHoursStr}</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ── Month & Calendar Selector Modal (Refined Compact Dialog) ── */}
      <Modal
        visible={calendarModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarModalVisible(false)}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCalendarModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.calendarCard}>
            {/* Header: Year navigation */}
            <View style={styles.calendarHeaderRow}>
              <TouchableOpacity
                style={styles.yearNavBtn}
                onPress={() => setPickerYear((prev) => prev - 1)}
                activeOpacity={0.7}
              >
                <ChevronLeft size={16} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.yearTitle}>{pickerYear}</Text>
              <TouchableOpacity
                style={[
                  styles.yearNavBtn,
                  pickerYear >= currentRealYear && styles.yearNavBtnDisabled,
                ]}
                onPress={() => {
                  if (pickerYear < currentRealYear) setPickerYear((prev) => prev + 1);
                }}
                disabled={pickerYear >= currentRealYear}
                activeOpacity={0.7}
              >
                <ChevronRight
                  size={16}
                  color={pickerYear >= currentRealYear ? "#CBD5E1" : "#0F172A"}
                />
              </TouchableOpacity>
            </View>

            {/* 12 Months Grid */}
            <View style={styles.monthsGrid}>
              {MONTH_NAMES.map((mName, idx) => {
                const mKey = `${pickerYear}-${String(idx + 1).padStart(2, "0")}`;
                const isSelected = selectedMonth === mKey;
                const isCurrent = currentMonthKey === mKey;
                const disabled = isFutureMonth(idx);

                return (
                  <TouchableOpacity
                    key={mName}
                    disabled={disabled}
                    style={[
                      styles.monthTile,
                      isSelected && styles.monthTileSelected,
                      isCurrent && !isSelected && styles.monthTileCurrent,
                      disabled && styles.monthTileDisabled,
                    ]}
                    onPress={() => handleSelectMonth(idx)}
                    activeOpacity={disabled ? 1 : 0.75}
                  >
                    <Text
                      style={[
                        styles.monthTileText,
                        isSelected && styles.monthTileTextSelected,
                        isCurrent && !isSelected && styles.monthTileTextCurrent,
                        disabled && styles.monthTileTextDisabled,
                      ]}
                    >
                      {mName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Footer */}
            <View style={styles.calendarFooter}>
              <TouchableOpacity
                style={styles.quickCurrentBtn}
                onPress={() => {
                  setPickerYear(now.getFullYear());
                  setSelectedMonth(currentMonthKey);
                  setCalendarModalVisible(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.quickCurrentBtnText}>
                  Current Month ({MONTH_NAMES[now.getMonth()]})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickCloseBtn}
                onPress={() => setCalendarModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.quickCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
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
  monthPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 3,
  },
  monthPickerBtnText: { fontSize: 12, fontWeight: "700", color: "#000000" },
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
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  empName: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  empSubText: { fontSize: 11, color: "#64748B", marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusPillPresent: { backgroundColor: "#ECFDF5" },
  statusPillBreak: { backgroundColor: "#FEF3C7" },
  statusPillMissing: { backgroundColor: "#FFF7ED" },
  statusPillAbsent: { backgroundColor: "#FEF2F2" },
  statusPillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  statusTextPresent: { color: "#059669" },
  statusTextBreak: { color: "#D97706" },
  statusTextMissing: { color: "#EA580C" },
  statusTextAbsent: { color: "#DC2626" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 10 },
  timeRow: { flexDirection: "row", justifyContent: "space-between" },
  timeBlock: { gap: 3 },
  timeLabel: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.5 },
  timeValueWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  timeValue: { fontSize: 13, fontWeight: "600", color: "#1E293B" },

  // ── Month Picker Calendar Popover Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  calendarCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 24,
    gap: 12,
  },
  calendarHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  yearNavBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  yearNavBtnDisabled: {
    opacity: 0.35,
  },
  yearTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },

  monthsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  monthTile: {
    width: "30.5%",
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  monthTileSelected: {
    backgroundColor: "#000000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  monthTileCurrent: {
    borderWidth: 1.2,
    borderColor: "#000000",
    backgroundColor: "#F8FAFC",
  },
  monthTileDisabled: {
    opacity: 0.28,
  },
  monthTileText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  monthTileTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  monthTileTextCurrent: {
    color: "#000000",
    fontWeight: "700",
  },
  monthTileTextDisabled: {
    color: "#94A3B8",
  },

  calendarFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  quickCurrentBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  quickCurrentBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  quickCloseBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  quickCloseBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000000",
  },
});

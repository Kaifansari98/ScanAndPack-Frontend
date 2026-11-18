import { colors } from "@/components/theme/colors";
import { RootState } from "@/redux/store";
import axios from "@/lib/axios";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  Clock,
  FileClock,
  LogIn,
  LogOut,
  MapPin,
  MapPinned,
  Menu,
  Shield,
  Sparkles,
  Users,
  X,
  FileText,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const HRMS_MENU_ITEMS: {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  iconColor: string;
  iconBg: string;
  roles: ("super-admin" | "all")[];
}[] = [
  {
    key: "employees-master",
    title: "Employees Master",
    subtitle: "Manage employee profiles, designations & records",
    icon: Users,
    iconColor: "#4B3A34",
    iconBg: "#FFF5ED",
    roles: ["super-admin"],
  },
  {
    key: "employees-attendance",
    title: "Employees Attendance",
    subtitle: "Realtime staff presence, check-in & check-out times",
    icon: CalendarCheck,
    iconColor: "#2563EB",
    iconBg: "#EFF6FF",
    roles: ["super-admin"],
  },
  {
    key: "attendance-logs",
    title: "Attendance Logs",
    subtitle: "Complete audit history of punch in & punch out events",
    icon: FileClock,
    iconColor: "#7C3AED",
    iconBg: "#F5F3FF",
    roles: ["super-admin"],
  },
  {
    key: "leaves-management",
    title: "Leaves Management",
    subtitle: "Review, approve or reject staff leave applications",
    icon: CalendarDays,
    iconColor: "#059669",
    iconBg: "#ECFDF5",
    roles: ["super-admin"],
  },
  {
    key: "geo-fencing",
    title: "Attendance Geo-Fencing",
    subtitle: "Configure office & site GPS perimeters & authorized radius",
    icon: MapPinned,
    iconColor: "#DC2626",
    iconBg: "#FEF2F2",
    roles: ["super-admin"],
  },
  {
    key: "complaints",
    title: "Employee Complaints",
    subtitle: "Track, inspect & resolve workplace grievances",
    icon: AlertCircle,
    iconColor: "#D97706",
    iconBg: "#FFFBEB",
    roles: ["super-admin"],
  },
  {
    key: "my-leaves",
    title: "My Leaves",
    subtitle: "Check leave balances & submit new leave requests",
    icon: BookOpen,
    iconColor: "#0891B2",
    iconBg: "#F0F9FF",
    roles: ["all"],
  },
];

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

export default function HrmsTabScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const user = useSelector((state: RootState) => state.auth.user);
  const userRole = normalizeRole(user?.user_type);
  const isSuperAdmin = userRole === "super-admin" || (user as any)?.is_super_admin;

  // 60FPS Native BottomSheetModal reference
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  // Exact snapPoints based on screen height
  const snapPoints = useMemo(() => {
    // 55% of screen height in px as first snap, 75% as max snap
    const minHeight = Math.round(Dimensions.get("window").height * 0.55);
    const maxHeight = Math.round(Dimensions.get("window").height * 0.75);
    return [minHeight, maxHeight];
  }, []);

  // Workspace & stats state
  const [workspace, setWorkspace] = useState<any>(null);
  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [locationsCount, setLocationsCount] = useState<number>(0);
  const [leavesCount, setLeavesCount] = useState<number>(0);
  const [complaintsCount, setComplaintsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [punching, setPunching] = useState<"IN" | "OUT" | false>(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock updates every second without causing bottom sheet re-render
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const safeTop =
    insets.top > 0
      ? insets.top
      : Platform.OS === "ios"
      ? 44
      : RNStatusBar.currentHeight ?? 24;

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      if (isSuperAdmin) {
        const vendorId = user?.vendor_id;
        const [empRes, locRes, leaveRes, compRes] = await Promise.allSettled([
          vendorId ? axios.get(`/users/vendor/${vendorId}`) : Promise.resolve({ data: [] }),
          axios.get("/attendance/locations"),
          axios.get("/leaves/requests"),
          axios.get("/complaints"),
        ]);

        if (empRes.status === "fulfilled") {
          const list = empRes.value.data?.data || empRes.value.data?.users || empRes.value.data || [];
          if (Array.isArray(list)) setEmployeeCount(list.length);
        }
        if (locRes.status === "fulfilled") {
          const list = locRes.value.data?.data?.locations || locRes.value.data?.data || [];
          if (Array.isArray(list)) setLocationsCount(list.length);
        }
        if (leaveRes.status === "fulfilled") {
          const list = leaveRes.value.data?.data?.requests || leaveRes.value.data?.data || [];
          if (Array.isArray(list)) setLeavesCount(list.length);
        }
        if (compRes.status === "fulfilled") {
          const list = compRes.value.data?.data?.complaints || compRes.value.data?.data || [];
          if (Array.isArray(list)) setComplaintsCount(list.length);
        }
      } else {
        const res = await axios.get("/attendance/workspace");
        if (res.data?.success && res.data?.data) {
          setWorkspace(res.data.data);
        }
      }
    } catch (e) {
      console.log("Error loading HRMS overview:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isSuperAdmin, user?.vendor_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Instant opening via Native UI Thread
  const openMenu = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);

  const closeMenu = useCallback(() => {
    bottomSheetModalRef.current?.dismiss();
  }, []);

  const navigateToSection = (key: string) => {
    closeMenu();
    // Small timeout ensures sheet dismissal finishes smoothly before navigation
    setTimeout(() => {
      switch (key) {
        case "employees-master":
          router.push("/hrms/employees-master" as any);
          break;
        case "employees-attendance":
          router.push("/hrms/employees-attendance" as any);
          break;
        case "attendance-logs":
          router.push("/hrms/attendance-logs" as any);
          break;
        case "leaves-management":
          router.push("/hrms/leaves-management" as any);
          break;
        case "geo-fencing":
          router.push("/hrms/geo-fencing" as any);
          break;
        case "complaints":
          router.push("/hrms/complaints" as any);
          break;
        case "my-leaves":
          router.push("/hrms/my-leaves" as any);
          break;
      }
    }, 150);
  };

  const handlePunch = async (punchType: "IN" | "OUT") => {
    setPunching(punchType);
    try {
      let coords: { latitude?: number; longitude?: number; accuracy?: number } = {};
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          // Promise race with timeout so it doesn't hang indefinitely on device GPS
          const locPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Location request timed out. Please check your GPS signal.")), 10000)
          );
          const loc = await Promise.race([locPromise, timeoutPromise]);
          coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy ?? undefined,
          };
        } else {
          Alert.alert(
            "Location Permission Required",
            "Please allow location access to punch attendance within your workplace radius."
          );
          setPunching(false);
          return;
        }
      } catch (locErr: any) {
        Alert.alert(
          "Location Error",
          locErr?.message || "Unable to fetch current location. Please make sure GPS is turned on and try again."
        );
        setPunching(false);
        return;
      }

      const res = await axios.post("/attendance/punch", {
        action: punchType,
        source: "PHONE",
        work_location: "OFFICE",
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      });

      if (res.data?.success) {
        Alert.alert(
          "Success",
          `Checked ${punchType === "IN" ? "In" : "Out"} successfully!`
        );
        fetchData(true);
      }
    } catch (e: any) {
      console.log("Punch error response:", e?.response?.data || e?.message);
      Alert.alert(
        "Punch Failed",
        e?.response?.data?.message || e?.message || `Unable to record check-${punchType.toLowerCase()}.`
      );
    } finally {
      setPunching(false);
    }
  };

  const currentRecord = workspace?.current || workspace?.today || workspace?.today_attendance;
  const isCheckedIn = !!currentRecord?.check_in || !!currentRecord?.check_in_time || !!currentRecord?.punch_in;
  const isCheckedOut = !!currentRecord?.check_out || !!currentRecord?.check_out_time || !!currentRecord?.punch_out;

  const visibleMenuItems = HRMS_MENU_ITEMS.filter(
    (item) => item.roles.includes("all") || isSuperAdmin
  );

  return (
    <View style={styles.root}>
      {/* ── 1. Hero Header Banner (MENU BUTTON ON TOP-LEFT) ── */}
      <View style={[styles.heroBanner, { paddingTop: safeTop + 10 }]}>
        <View style={styles.heroTopRow}>
          {/* Top-Left Menu Button */}
          <TouchableOpacity
            style={styles.menuHeaderBtn}
            onPress={openMenu}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Menu size={22} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>

          {/* Centered Title */}
          <View style={styles.headerCenterBlock}>
            <Text style={styles.headerTitle}>HRMS</Text>
            <Text style={styles.headerSub}>
              {isSuperAdmin ? "Super Admin Command Center" : "Attendance & Staff Portal"}
            </Text>
          </View>

          {/* Spacer for symmetry */}
          <View style={{ width: 44 }} />
        </View>
      </View>

      {/* ── 2. Scrollable Body Content ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData(true);
            }}
            colors={["#4B3A34"]}
            tintColor="#4B3A34"
          />
        }
      >
        {/* Role Access Chip */}
        <View
          style={[
            styles.roleBadge,
            isSuperAdmin ? styles.roleBadgeAdmin : styles.roleBadgeUser,
          ]}
        >
          <Text
            style={[
              styles.roleBadgeText,
              isSuperAdmin ? styles.roleBadgeTextAdmin : styles.roleBadgeTextUser,
            ]}
          >
            {isSuperAdmin ? "🛡️ Super Admin Access" : "👤 Employee Mode"}
          </Text>
        </View>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SUPER ADMIN VIEW (NO IN/OUT BUTTONS)                       */}
        {/* ══════════════════════════════════════════════════════════ */}
        {isSuperAdmin ? (
          <>
            {/* Live Clock Card */}
            <View style={styles.clockCard}>
              <View style={styles.clockIconWrap}>
                <Clock size={28} color="#4B3A34" />
              </View>
              <Text style={styles.liveClockText}>
                {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </Text>
              <Text style={styles.liveDateText}>
                {currentTime.toLocaleDateString([], {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>

            {/* Admin Overview Stats Grid */}
            <Text style={styles.sectionHeading}>ORGANIZATION OVERVIEW</Text>
            <View style={styles.adminGrid}>
              <TouchableOpacity
                style={styles.adminStatCard}
                onPress={() => navigateToSection("employees-master")}
                activeOpacity={0.85}
              >
                <View style={[styles.adminStatIcon, { backgroundColor: "#FFF5ED" }]}>
                  <Users size={22} color="#4B3A34" />
                </View>
                <Text style={styles.adminStatNumber}>{employeeCount}</Text>
                <Text style={styles.adminStatLabel}>Total Staff</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adminStatCard}
                onPress={() => navigateToSection("geo-fencing")}
                activeOpacity={0.85}
              >
                <View style={[styles.adminStatIcon, { backgroundColor: "#FEF2F2" }]}>
                  <MapPinned size={22} color="#DC2626" />
                </View>
                <Text style={styles.adminStatNumber}>{locationsCount}</Text>
                <Text style={styles.adminStatLabel}>Geo-Fences</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adminStatCard}
                onPress={() => navigateToSection("leaves-management")}
                activeOpacity={0.85}
              >
                <View style={[styles.adminStatIcon, { backgroundColor: "#ECFDF5" }]}>
                  <CalendarDays size={22} color="#059669" />
                </View>
                <Text style={styles.adminStatNumber}>{leavesCount}</Text>
                <Text style={styles.adminStatLabel}>Leave Requests</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adminStatCard}
                onPress={() => navigateToSection("complaints")}
                activeOpacity={0.85}
              >
                <View style={[styles.adminStatIcon, { backgroundColor: "#FFFBEB" }]}>
                  <AlertCircle size={22} color="#D97706" />
                </View>
                <Text style={styles.adminStatNumber}>{complaintsCount}</Text>
                <Text style={styles.adminStatLabel}>Complaints</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* ══════════════════════════════════════════════════════════ */
          /* EMPLOYEE VIEW (PUNCH IN/OUT)                              */
          /* ══════════════════════════════════════════════════════════ */
          <>
            {/* Live Clock Card */}
            <View style={styles.clockCard}>
              <View style={styles.clockIconWrap}>
                <Clock size={28} color="#4B3A34" />
              </View>
              <Text style={styles.liveClockText}>
                {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </Text>
              <Text style={styles.liveDateText}>
                {currentTime.toLocaleDateString([], {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>

            {/* Today's Punch Action Card */}
            <View style={styles.punchCard}>
              <Text style={styles.punchCardTitle}>TODAY'S ATTENDANCE</Text>

              <View style={styles.punchStatusRow}>
                <View style={styles.punchStatusBox}>
                  <Text style={styles.punchStatusLabel}>IN TIME</Text>
                  <Text style={styles.punchStatusValue}>
                    {currentRecord?.check_in_local
                      ? currentRecord.check_in_local
                      : currentRecord?.check_in
                      ? new Date(currentRecord.check_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : currentRecord?.check_in_time
                      ? new Date(currentRecord.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "00:00"}
                  </Text>
                </View>

                <View style={styles.punchStatusBox}>
                  <Text style={styles.punchStatusLabel}>OUT TIME</Text>
                  <Text style={styles.punchStatusValue}>
                    {currentRecord?.check_out_local
                      ? currentRecord.check_out_local
                      : currentRecord?.check_out
                      ? new Date(currentRecord.check_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : currentRecord?.check_out_time
                      ? new Date(currentRecord.check_out_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "00:00"}
                  </Text>
                </View>

                <View style={styles.punchStatusBox}>
                  <Text style={styles.punchStatusLabel}>STATUS</Text>
                  <Text
                    style={[
                      styles.punchStatusValue,
                      { color: isCheckedIn ? "#059669" : "#DC2626", fontWeight: "800" },
                    ]}
                  >
                    {isCheckedOut ? "COMPLETED" : isCheckedIn ? "PRESENT" : "NOT IN"}
                  </Text>
                </View>
              </View>

              {/* Action Punch Buttons */}
              <View style={styles.punchActionRow}>
                <TouchableOpacity
                  style={[
                    styles.punchBtn,
                    styles.punchInBtn,
                    (isCheckedIn || punching !== false) && styles.punchBtnDisabled,
                  ]}
                  onPress={() => handlePunch("IN")}
                  disabled={isCheckedIn || punching !== false}
                  activeOpacity={0.85}
                >
                  {punching === "IN" ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <LogIn size={18} color="#FFFFFF" />
                      <Text style={styles.punchBtnText}>Check In</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.punchBtn,
                    styles.punchOutBtn,
                    (!isCheckedIn || isCheckedOut || punching !== false) && styles.punchBtnDisabled,
                  ]}
                  onPress={() => handlePunch("OUT")}
                  disabled={!isCheckedIn || isCheckedOut || punching !== false}
                  activeOpacity={0.85}
                >
                  {punching === "OUT" ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <LogOut size={18} color="#FFFFFF" />
                      <Text style={styles.punchBtnText}>Check Out</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Summary Stats */}
            <View style={styles.summaryGrid}>
              <TouchableOpacity
                style={styles.summaryBox}
                onPress={() => navigateToSection("my-leaves")}
                activeOpacity={0.85}
              >
                <BookOpen size={20} color="#0891B2" />
                <Text style={styles.summaryNum}>{workspace?.leave_balance?.available ?? 12}</Text>
                <Text style={styles.summaryLabel}>Available Leaves</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.summaryBox}
                onPress={() => navigateToSection("attendance-logs")}
                activeOpacity={0.85}
              >
                <CalendarCheck size={20} color="#059669" />
                <Text style={styles.summaryNum}>{workspace?.stats?.present_days ?? "—"}</Text>
                <Text style={styles.summaryLabel}>Present This Month</Text>
              </TouchableOpacity>
            </View>

            {/* Geo-fence Info Alert */}
            <View style={styles.geoNoteBox}>
              <MapPin size={16} color="#DC2626" />
              <Text style={styles.geoNoteText}>
                Attendance is GPS geo-fenced. You must be inside your designated office or project site radius.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── 3. Ultra-Smooth Native BottomSheet Modal ── */}
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={(backdropProps) => (
          <BottomSheetBackdrop
            {...backdropProps}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            pressBehavior="close"
            opacity={0.45}
          />
        )}
        handleIndicatorStyle={styles.sheetHandleIndicator}
        backgroundStyle={styles.sheetBackground}
      >
        <View style={styles.sheetHeaderContainer}>
          <View style={styles.sheetHeaderLeft}>
            <View style={styles.sheetBadgePill}>
              <Sparkles size={13} color="#F4A261" />
              <Text style={styles.sheetBadgeText}>HRMS SUITE</Text>
            </View>
            <Text style={styles.sheetMainTitle}>Navigation Menu</Text>
            <Text style={styles.sheetMainSubtitle}>
              Select a module to manage records & workflows
            </Text>
          </View>
          <TouchableOpacity
            style={styles.sheetCloseCircle}
            onPress={closeMenu}
            activeOpacity={0.7}
          >
            <X size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView
          contentContainerStyle={styles.sheetScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.key}
                style={styles.menuItemCard}
                onPress={() => navigateToSection(item.key)}
                activeOpacity={0.75}
              >
                <View style={[styles.menuItemIconBox, { backgroundColor: item.iconBg }]}>
                  <Icon size={22} color={item.iconColor} strokeWidth={2} />
                </View>

                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                  <Text style={styles.menuItemSubtitle} numberOfLines={2}>
                    {item.subtitle}
                  </Text>
                </View>

                <View style={styles.chevronWrap}>
                  <ChevronRight size={18} color="#94A3B8" strokeWidth={2} />
                </View>
              </TouchableOpacity>
            );
          })}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },

  // ── Hero Banner ──
  heroBanner: {
    backgroundColor: "#4B3A34",
    paddingBottom: 20,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#4B3A34",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuHeaderBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenterBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
  headerSub: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.75)",
    fontWeight: "500",
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },

  // Role Badge
  roleBadge: {
    alignSelf: "flex-start",
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  roleBadgeAdmin: { backgroundColor: "#FFF5ED", borderWidth: 1, borderColor: "#F4A261" },
  roleBadgeUser: { backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#93C5FD" },
  roleBadgeText: { fontSize: 12, fontWeight: "700" },
  roleBadgeTextAdmin: { color: "#9A3412" },
  roleBadgeTextUser: { color: "#1E40AF" },

  // Clock Card
  clockCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 4,
  },
  clockIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFF8EE",
    borderWidth: 1,
    borderColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  liveClockText: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 1,
  },
  liveDateText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },

  // Super Admin Overview
  sectionHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.8,
    marginTop: 4,
  },
  adminGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  adminStatCard: {
    width: (SCREEN_WIDTH - 32 - 12) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  adminStatIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  adminStatNumber: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
  },
  adminStatLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  menuPromptBanner: {
    backgroundColor: "#4B3A34",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
    shadowColor: "#4B3A34",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  menuPromptIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuPromptTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  menuPromptSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
  },

  // Employee Punch Card
  punchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 14,
  },
  punchCardTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.8,
  },
  punchStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
  },
  punchStatusBox: { alignItems: "center", flex: 1, gap: 3 },
  punchStatusLabel: { fontSize: 9, fontWeight: "800", color: "#94A3B8" },
  punchStatusValue: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  punchActionRow: { flexDirection: "row", gap: 12 },
  punchBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  punchInBtn: { backgroundColor: "#059669" },
  punchOutBtn: { backgroundColor: "#DC2626" },
  punchBtnDisabled: { opacity: 0.4 },
  punchBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  // Summary Grid
  summaryGrid: { flexDirection: "row", gap: 12 },
  summaryBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  summaryNum: { fontSize: 20, fontWeight: "900", color: "#0F172A" },
  summaryLabel: { fontSize: 11, color: "#64748B", fontWeight: "600" },

  // Geo Note
  geoNoteBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  geoNoteText: { flex: 1, fontSize: 11, color: "#991B1B", lineHeight: 16 },

  // ── Bottom Sheet Modal Styling ──
  sheetBackground: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 24,
  },
  sheetHandleIndicator: {
    backgroundColor: "#CBD5E1",
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  sheetHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sheetHeaderLeft: {
    flex: 1,
    gap: 3,
  },
  sheetBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF8EE",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 2,
  },
  sheetBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#C2410C",
    letterSpacing: 0.6,
  },
  sheetMainTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
  },
  sheetMainSubtitle: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  sheetCloseCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
    minHeight: 300,
  },
  menuItemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1.2,
    borderColor: "#E2E8F0",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItemIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  menuItemContent: {
    flex: 1,
    gap: 2,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.1,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
});

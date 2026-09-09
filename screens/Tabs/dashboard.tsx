import { colors } from "@/components/theme/colors";
import { commonStyles } from "@/components/theme/commonStyles";
import axios from "@/lib/axios";
import type { RootState } from "@/redux/store";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Building2,
  Camera,
  CheckCircle2,
  CheckSquare,
  LayoutGrid,
  Package,
  QrCode,
  RefreshCw,
  Settings,
  ShieldCheck,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSelector } from "react-redux";

interface Modules {
  track_and_trace: boolean;
  quality_check: boolean;
  scan_and_pack: boolean;
}

export default function DashboardTabScreen() {
  const navigation = useNavigation<any>();
  const router = useRouter();
  const goToTab = (tabName: string) => navigation.navigate(tabName);

  const user = useSelector((state: RootState) => state.auth.user);
  const vendor = useSelector((state: RootState) => state.auth.vendor);
  const workerLabel = user?.user_name ?? "Operator";
  const vendorName =
    vendor?.vendor_name ||
    user?.vendor_name ||
    user?.vendor?.vendor_name ||
    (user as any)?.company_name ||
    "Furnix Factory OS";

  const logoImage =
    vendor?.logoUrl ||
    vendor?.iconUrl ||
    user?.logoUrl ||
    user?.iconUrl ||
    user?.vendor?.logoUrl ||
    user?.vendor?.iconUrl;

  const [modules, setModules] = useState<Modules | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Helper to extract user initials for avatar
  const getInitials = (name: string) => {
    if (!name) return "OP";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const fetchModules = async (isRefresh = false) => {
    const vendorId = user?.vendor_id;
    const userId = user?.id;
    if (!vendorId || !userId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!isRefresh) setLoading(true);

    try {
      const res = await axios.get(
        `/track-trace/user-modules/${vendorId}/${userId}`
      );
      const data = res.data?.data?.modules;
      if (data) setModules(data);
    } catch (err) {
      // Failed to fetch modules
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchModules();
    }, [user?.vendor_id, user?.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchModules(true);
  };

  const activeModuleCount = modules
    ? Object.values(modules).filter(Boolean).length
    : 0;

  const hasAny = activeModuleCount > 0;

  return (
    <View style={styles.root}>
      {/* ── 1. Hero Header Banner ── */}
      <View style={styles.heroBanner}>
        <View style={styles.heroTopRow}>
          {/* Company Image & Info Block (Side by Side) */}
          <View style={styles.companyHeaderBlock}>
            <View style={styles.companyLogoWrap}>
              {logoImage ? (
                <Image
                  source={{ uri: logoImage }}
                  style={styles.companyLogoImage}
                  resizeMode="contain"
                />
              ) : (
                <Building2 size={24} color="#4B3A34" />
              )}
            </View>

            <View style={styles.companyTitleGroup}>
              <Text style={styles.companyNameText} numberOfLines={1}>
                {vendorName}
              </Text>
              <Text style={styles.welcomeUserText} numberOfLines={1}>
                Welcome 👋, {workerLabel}
              </Text>
            </View>
          </View>

          {/* Quick Settings Icon Button */}
          <TouchableOpacity
            style={styles.settingsHeaderBtn}
            onPress={() => goToTab("Settings")}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Settings size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 2. Scrollable Body Content ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4B3A34"]}
            tintColor="#4B3A34"
          />
        }
      >
        <Text style={commonStyles.sectionLabel}>SELECT MODULE</Text>

        {/* ── Loading Spinner State ── */}
        {loading && !refreshing && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#4B3A34" />
            <Text style={styles.loaderText}>Loading your modules...</Text>
          </View>
        )}

        {/* ── Empty State: No Modules Assigned ── */}
        {!loading && !hasAny && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <ShieldCheck size={32} color="#4B3A34" />
            </View>
            <Text style={styles.emptyTitle}>No Modules Assigned</Text>
            <Text style={styles.emptySubtitle}>
              Contact your supervisor to get access
            </Text>
            <TouchableOpacity
              style={styles.emptyRefreshBtn}
              onPress={() => fetchModules()}
              activeOpacity={0.8}
            >
              <RefreshCw size={14} color="#FFFFFF" />
              <Text style={styles.emptyRefreshText}>Refresh Permissions</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Original 3 Module Cards ── */}
        {/* ── 1. Track & Trace ── */}
        {!loading && modules?.track_and_trace && (
          <TouchableOpacity
            style={commonStyles.moduleCardDark}
            onPress={() => router.push("/machines")}
            activeOpacity={0.92}
          >
            <View
              style={{
                position: "absolute",
                right: -20,
                top: -20,
                width: 110,
                height: 110,
                borderRadius: 55,
                backgroundColor: "rgba(255,255,255,0.06)",
              }}
            />
            <View style={commonStyles.moduleIconWrapDark}>
              <Camera size={36} color={colors.white} />
            </View>
            <View style={commonStyles.moduleTextBlock}>
              <Text style={commonStyles.moduleTitle}>Track & Trace</Text>
              <Text style={commonStyles.moduleSubtitle}>
                Scan QR · Mark status
              </Text>
              <View style={commonStyles.moduleBadgeAccent}>
                <Text style={commonStyles.moduleBadgeTextAccent}>
                  TAP TO START →
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* ── 2. Quality Check ── */}
        {!loading && modules?.quality_check && (
          <TouchableOpacity
            style={[
              commonStyles.moduleCardLight,
              {
                backgroundColor: "#FFF8EE",
                borderWidth: 1.5,
                borderColor: "#F4A261",
              },
            ]}
            onPress={() => router.push("/quality-projects")}
            activeOpacity={0.92}
          >
            <View
              style={{
                position: "absolute",
                right: -20,
                top: -20,
                width: 110,
                height: 110,
                borderRadius: 55,
                backgroundColor: "rgba(244,162,97,0.1)",
              }}
            />
            <View
              style={[
                commonStyles.moduleIconWrapLight,
                { backgroundColor: "#FEF0DC" },
              ]}
            >
              <CheckSquare size={36} color="#F4A261" />
            </View>
            <View style={commonStyles.moduleTextBlock}>
              <Text
                style={[commonStyles.moduleTitleDark, { color: "#C15C0A" }]}
              >
                Quality Check
              </Text>
              <Text style={commonStyles.moduleSubtitleLight}>
                Inspect items · Approve or reject
              </Text>
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: "#F4A261",
                  borderRadius: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  marginTop: 10,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 10,
                    fontWeight: "800",
                    letterSpacing: 0.8,
                  }}
                >
                  TAP TO START →
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* ── 3. Scan & Pack ── */}
        {!loading && modules?.scan_and_pack && (
          <TouchableOpacity
            style={commonStyles.moduleCardLight}
            onPress={() => router.push("/scan-pack")}
            activeOpacity={0.92}
          >
            <View
              style={{
                position: "absolute",
                right: -20,
                bottom: -20,
                width: 110,
                height: 110,
                borderRadius: 55,
                backgroundColor: "rgba(42,157,143,0.08)",
              }}
            />
            <View style={commonStyles.moduleIconWrapLight}>
              <Package size={36} color="#2A9D8F" />
            </View>
            <View style={commonStyles.moduleTextBlock}>
              <Text style={commonStyles.moduleTitleDark}>Scan & Pack</Text>
              <Text style={commonStyles.moduleSubtitleLight}>
                Pack items · Generate label
              </Text>
              <View style={commonStyles.moduleBadgeTeal}>
                <Text style={commonStyles.moduleBadgeTextTeal}>
                  TAP TO START →
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },

  // ── Hero Banner ──
  heroBanner: {
    backgroundColor: "#4B3A34",
    paddingTop: 54,
    paddingBottom: 20,
    paddingHorizontal: 20,
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
  companyHeaderBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  companyLogoWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#F4A261",
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
  },
  companyLogoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  companyTitleGroup: {
    flex: 1,
    gap: 2,
  },
  companyNameText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  welcomeUserText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  settingsHeaderBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Loader State ──
  loaderContainer: {
    paddingVertical: 50,
    alignItems: "center",
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },

  // ── Empty State ──
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 24,
    alignItems: "center",
    textAlign: "center",
    gap: 10,
    marginTop: 10,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFF8EE",
    borderWidth: 1,
    borderColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
  },
  emptyRefreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#4B3A34",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  emptyRefreshText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
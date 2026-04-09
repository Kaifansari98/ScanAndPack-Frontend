import { colors } from "@/components/theme/colors";
import { commonStyles } from "@/components/theme/commonStyles";
import axios from "@/lib/axios";
import type { RootState } from "@/redux/store";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect, useRouter } from "expo-router";
import { Camera, CheckSquare, Package, Settings } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
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
  const workerLabel = user?.user_name ?? "";

  const [modules, setModules] = useState<Modules | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchModules = async () => {
    const vendorId = user?.vendor_id;
    const userId = user?.id;
    if (!vendorId || !userId) return;
    setLoading(true);
    try {
      const res = await axios.get(`/track-trace/user-modules/${vendorId}/${userId}`);
      const data = res.data?.data?.modules;
      if (data) setModules(data);
    } catch (err) {
      console.warn("Failed to fetch modules:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchModules();
    }, [user?.vendor_id, user?.id])
  );

  const hasAny = modules &&
    (modules.track_and_trace || modules.quality_check || modules.scan_and_pack);

  return (
    <View style={{ flex: 1, backgroundColor: colors.cardBg }}>

      {/* ── Dark Hero Header ── */}
      <View style={commonStyles.dashHero}>
        <View style={commonStyles.dashHeroRow}>
          <View>
            <Text style={commonStyles.dashGreeting}>Welcome 👋</Text>
            <Text style={commonStyles.dashWorkerName}>{workerLabel}</Text>
          </View>
          <TouchableOpacity
            style={commonStyles.dashSettingsBtn}
            onPress={() => goToTab("Settings")}
            activeOpacity={0.8}
          >
            <Settings size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable Body ── */}
      <ScrollView
        contentContainerStyle={commonStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={commonStyles.sectionLabel}>SELECT MODULE</Text>

        {/* ── Loading ── */}
        {loading && (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        )}

        {/* ── No modules assigned ── */}
        {!loading && !hasAny && (
          <View style={{
            marginTop: 40, alignItems: "center", gap: 8,
            paddingHorizontal: 24,
          }}>
            <Text style={{ fontSize: 48 }}>🏭</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.heading }}>
              No modules assigned
            </Text>
            <Text style={{ fontSize: 13, color: colors.label, textAlign: "center" }}>
              Contact your supervisor to get access
            </Text>
          </View>
        )}

        {/* ── 1. Track & Trace ── */}
        {!loading && modules?.track_and_trace && (
          <TouchableOpacity
            style={commonStyles.moduleCardDark}
            onPress={() => router.push("/machines")}
            activeOpacity={0.92}
          >
            <View style={{
              position: "absolute", right: -20, top: -20,
              width: 110, height: 110, borderRadius: 55,
              backgroundColor: "rgba(255,255,255,0.06)",
            }} />
            <View style={commonStyles.moduleIconWrapDark}>
              <Camera size={36} color={colors.white} />
            </View>
            <View style={commonStyles.moduleTextBlock}>
              <Text style={commonStyles.moduleTitle}>Track & Trace</Text>
              <Text style={commonStyles.moduleSubtitle}>Scan QR · Mark status</Text>
              <View style={commonStyles.moduleBadgeAccent}>
                <Text style={commonStyles.moduleBadgeTextAccent}>TAP TO START →</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* ── 2. Quality Check ── */}
        {!loading && modules?.quality_check && (
          <TouchableOpacity
            style={[commonStyles.moduleCardLight, {
              backgroundColor: "#FFF8EE",
              borderWidth: 1.5,
              borderColor: "#F4A261",
            }]}
            onPress={() => router.push("/quality-projects")}
            activeOpacity={0.92}
          >
            <View style={{
              position: "absolute", right: -20, top: -20,
              width: 110, height: 110, borderRadius: 55,
              backgroundColor: "rgba(244,162,97,0.1)",
            }} />
            <View style={[commonStyles.moduleIconWrapLight, { backgroundColor: "#FEF0DC" }]}>
              <CheckSquare size={36} color="#F4A261" />
            </View>
            <View style={commonStyles.moduleTextBlock}>
              <Text style={[commonStyles.moduleTitleDark, { color: "#C15C0A" }]}>
                Quality Check
              </Text>
              <Text style={commonStyles.moduleSubtitleLight}>
                Inspect items · Approve or reject
              </Text>
              <View style={{
                alignSelf: "flex-start", backgroundColor: "#F4A261",
                borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginTop: 10,
              }}>
                <Text style={{ color: "white", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 }}>
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
            onPress={() => goToTab("Pack")}
            activeOpacity={0.92}
          >
            <View style={{
              position: "absolute", right: -20, bottom: -20,
              width: 110, height: 110, borderRadius: 55,
              backgroundColor: "rgba(42,157,143,0.08)",
            }} />
            <View style={commonStyles.moduleIconWrapLight}>
              <Package size={36} color="#2A9D8F" />
            </View>
            <View style={commonStyles.moduleTextBlock}>
              <Text style={commonStyles.moduleTitleDark}>Scan & Pack</Text>
              <Text style={commonStyles.moduleSubtitleLight}>Pack items · Generate label</Text>
              <View style={commonStyles.moduleBadgeTeal}>
                <Text style={commonStyles.moduleBadgeTextTeal}>TAP TO START →</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

      </ScrollView>
    </View>
  );
}
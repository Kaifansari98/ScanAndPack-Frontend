/**
 * DashboardTabScreen — shift stats + Track & Trace / Scan & Pack module cards
 * Matches the FactoryOS reference design using shared theme tokens.
 */
import { colors } from "@/components/theme/colors";
import { commonStyles } from "@/components/theme/commonStyles";
import axios from "@/lib/axios";
import type { RootState } from "@/redux/store";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect, useRouter } from "expo-router";
import { Camera, Package, Settings } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSelector } from "react-redux";

interface ScanStats {
  scanned_today: number;
  pending_to_scan: number;
}

export default function DashboardTabScreen() {
  const router = useRouter();
  const navigation = useNavigation<any>();
  const goToTab = (tabName: string) => navigation.navigate(tabName);

  const user = useSelector((state: RootState) => state.auth.user);
  const workerLabel = user?.user_name ?? "";

  const [stats, setStats] = useState<ScanStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // ─── Fetch stats on every focus ──────────────────────
  const fetchStats = async () => {
    const vendorId = user?.vendor_id;
    const userId = user?.id;
    if (!vendorId || !userId) return;

    setStatsLoading(true);
    try {
      const res = await axios.get(`/track-trace/get-scan-status-dashboard/${vendorId}/${userId}`);
      const data = res.data?.data?.scanItem;
      if (data) {
        setStats({
          scanned_today: data.total_items_scanned_today ?? 0,
          pending_to_scan: data.total_items_pending_to_scan ?? 0,
        });
      }
    } catch (err) {
      console.warn("Failed to fetch scan stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [user?.vendor_id, user?.id])
  );

  // ─── Stat cards config ────────────────────────────────
  const STATS = [
    {
      label: "Scanned Today",
      value: stats?.scanned_today,
      color: "#2A9D8F",
      emoji: "✅",
    },
    {
      label: "Pending to Scan",
      value: stats?.pending_to_scan,
      color: colors.error,
      emoji: "⏳",
    },
  ];

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
        {/* Stat row */}
        <View style={commonStyles.statRow}>
          {STATS.map((s) => (
            <View key={s.label} style={[commonStyles.statCard, { flex: 1 }]}>
              <Text style={commonStyles.statEmoji}>{s.emoji}</Text>
              {statsLoading ? (
                <ActivityIndicator size="small" color={s.color} style={{ marginVertical: 4 }} />
              ) : (
                <Text style={[commonStyles.statValue, { color: s.color }]}>
                  {s.value?.toLocaleString() ?? "—"}
                </Text>
              )}
              <Text style={commonStyles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Section label */}
        <Text style={commonStyles.sectionLabel}>SELECT MODULE</Text>

        {/* ── Track & Trace (dark card) ── */}
        <TouchableOpacity
          style={commonStyles.moduleCardDark}
          onPress={() => goToTab("Track")}
          activeOpacity={0.92}
        >
          <View
            style={{
              position: "absolute", right: -20, top: -20,
              width: 110, height: 110, borderRadius: 55,
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
          />
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

        {/* ── Scan & Pack (light card) ── */}
        <TouchableOpacity
          style={commonStyles.moduleCardLight}
          onPress={() => goToTab("Pack")}
          activeOpacity={0.92}
        >
          <View
            style={{
              position: "absolute", right: -20, bottom: -20,
              width: 110, height: 110, borderRadius: 55,
              backgroundColor: "rgba(42,157,143,0.08)",
            }}
          />
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
      </ScrollView>
    </View>
  );
}
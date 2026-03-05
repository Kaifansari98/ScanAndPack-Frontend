/**
 * DashboardTabScreen — shift stats + Track & Trace / Scan & Pack module cards
 * Matches the FactoryOS reference design using shared theme tokens.
 */
import { colors } from "@/components/theme/colors";
import { commonStyles } from "@/components/theme/commonStyles";
import type { RootState } from "@/redux/store";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Camera, Package, Settings } from "lucide-react-native";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSelector } from "react-redux";

// ─── Local stat data ────────────────────────────────────────────────────────
const STATS = [
  { label: "Completed",  value: "24",  color: "#2A9D8F", emoji: "✅" },
  { label: "In Progress", value: "6",  color: colors.accent, emoji: "⚙️" },
  { label: "Pending",    value: "3",   color: colors.error,  emoji: "⏳" },
];

export default function DashboardTabScreen() {
  const router = useRouter();
  // Navigate to a bottom tab by name (switches the active tab + its stack)
  const navigation = useNavigation<any>();
  const goToTab = (tabName: string) => navigation.navigate(tabName);

  // Pull worker info from redux (adjust selector to match your store shape)
  const user = useSelector((state: RootState) => state.auth.user);
  const workerLabel = user?.user_name ?? `Worker ID: ${user?.id ?? "W-482"}`;

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
            onPress={() => goToTab('Settings')}
            activeOpacity={0.8}
          >
            <Settings size={22} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Active machine chip — shown only when a machine is active */}
        {/* Uncomment and wire up selectedMachine from redux/props as needed:
        {selectedMachine && (
          <View style={commonStyles.dashMachineChip}>
            <Settings size={18} color={colors.accent} />
            <Text style={commonStyles.dashMachineChipText}>
              Active: {selectedMachine.name}
            </Text>
            <View style={activeBadge}><Text style={activeBadgeText}>ACTIVE</Text></View>
          </View>
        )} */}
      </View>

      {/* ── Scrollable Body ── */}
      <ScrollView
        contentContainerStyle={commonStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stat row */}
        <View style={commonStyles.statRow}>
          {STATS.map((s) => (
            <View key={s.label} style={commonStyles.statCard}>
              <Text style={commonStyles.statEmoji}>{s.emoji}</Text>
              <Text style={[commonStyles.statValue, { color: s.color }]}>{s.value}</Text>
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
          {/* Decorative circle */}
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
          {/* Decorative circle */}
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
import Loader from "@/components/generic/Loader";
import { useToast } from "@/components/Notification/ToastProvider";
import { colors } from "@/components/theme/colors";
import { commonStyles } from "@/components/theme/commonStyles";
import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
import { fetchProjectFullReportAndShare } from "@/utils/projectPdfUtils";
import { router, useFocusEffect } from "expo-router";
import LottieView from "lottie-react-native";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileDown,
  LogIn,
  LogOut,
  MapPin,
  ScanLine,
  X,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSelector } from "react-redux";

interface FormattedProject {
  id: number;
  vendor_id: number;
  projectName: string;
  totalNoItems: number;
  unpackedItems: number;
  packedItems: number;
  status: string;
  date: string;
  completionPercentage: number;
  factory_out_at: string | null;
  site_in_at: string | null;
  all_factory_out: boolean;
  any_factory_out: boolean;
}

function getScanMode(p: FormattedProject): "OUT" | "IN" | "BOTH" | null {
  if (!p.any_factory_out)                              return "OUT";
  if (p.all_factory_out && p.site_in_at === null)      return "IN";
  if (!p.all_factory_out && p.site_in_at === null)     return "BOTH";
  return null;
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({
  item,
  onScanPress,
  onDownloadPress,
}: {
  item: FormattedProject;
  onScanPress: () => void;
  onDownloadPress: () => void;
}) {
  const isDone   = item.completionPercentage === 100;
  const pct      = item.completionPercentage;
  const scanMode = getScanMode(item);

  // What is the PRIMARY action right now?
  const primaryAction = scanMode
    ? scanMode === "OUT"  ? { label: "Scan — Factory Out", color: "#B45309", bg: "#FEF3C7", border: "#F59E0B", Icon: LogOut }
    : scanMode === "IN"   ? { label: "Scan — Site In",     color: "#065F46", bg: "#D1FAE5", border: "#10B981", Icon: LogIn }
    :                       { label: "Scan Box",           color: "#3730A3", bg: "#EDE9FE", border: "#6366F1", Icon: ScanLine }
    : null;

  const hasSiteItems = item.site_in_at !== null;

  return (
    <TouchableOpacity
      style={card.wrap}
      activeOpacity={0.9}
      onPress={() =>
        router.push({
          pathname: "/dashboards/boxes",
          params: { id: String(item.id), vendor_id: String(item.vendor_id) },
        })
      }
    >
      {/* Top accent bar — full width, shows completion color */}
      <View style={[card.topBar, { backgroundColor: isDone ? "#10B981" : "#6366F1" }]} />

      <View style={card.body}>

        {/* ── Project name + status badge ── */}
        <View style={card.nameRow}>
          <Text style={card.name} numberOfLines={1}>{item.projectName}</Text>
          <View style={[card.badge, { backgroundColor: isDone ? "#D1FAE5" : "#EDE9FE" }]}>
            <Text style={[card.badgeText, { color: isDone ? "#065F46" : "#4338CA" }]}>{item.status}</Text>
          </View>
          <ChevronRight size={15} color="#CBD5E1" />
        </View>

        {/* ── Progress ── */}
        <View style={card.progressRow}>
          <View style={card.track}>
            <View style={[card.fill, { width: `${pct}%` as any, backgroundColor: isDone ? "#10B981" : "#6366F1" }]} />
          </View>
          <Text style={[card.pctText, { color: isDone ? "#10B981" : "#6366F1" }]}>{pct}%</Text>
        </View>

        {/* ── 3 stat boxes ── */}
        <View style={card.statsRow}>
          <StatBox label="Total Items" value={item.totalNoItems} color="#334155" />
          <StatBox label="Packed" value={item.packedItems} color="#059669"
            icon={isDone ? <CheckCircle2 size={12} color="#059669" /> : undefined} />
          <StatBox label="Pending" value={item.unpackedItems} color={item.unpackedItems > 0 ? "#D97706" : "#94A3B8"}
            icon={item.unpackedItems > 0 ? <Clock size={12} color="#D97706" /> : undefined} />
        </View>

        {/* ── Dispatch timeline (only shown when dispatch has started) ── */}
        {/* {item.any_factory_out && (
          <View style={card.timeline}>
            <TimelineStep
              label="Factory Out"
              done={item.factory_out_at !== null}
              date={item.factory_out_at}
            />
            <View style={[card.timelineLine, { backgroundColor: item.factory_out_at ? "#10B981" : "#E2E8F0" }]} />
            <TimelineStep
              label="Site In"
              done={item.site_in_at !== null}
              date={item.site_in_at}
            />
          </View>
        )} */}

        {/* ── Action buttons ── */}
        <View style={card.actions}>

          {/* PRIMARY: Dispatch scan button — full width, prominent */}
          {primaryAction && (
            <TouchableOpacity
              style={[card.primaryBtn, { backgroundColor: primaryAction.bg, borderColor: primaryAction.border }]}
              onPress={(e) => { e.stopPropagation?.(); onScanPress(); }}
              activeOpacity={0.82}
            >
              <primaryAction.Icon size={16} color={primaryAction.color} />
              <Text style={[card.primaryBtnText, { color: primaryAction.color }]}>{primaryAction.label}</Text>
            </TouchableOpacity>
          )}

          {/* SECONDARY row: Site Verify + Download */}
          {(hasSiteItems || item.packedItems > 0) && (
            <View style={card.secondaryRow}>
              {hasSiteItems && (
                <TouchableOpacity
                  style={card.secondaryBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    router.push({
                      pathname: "/boxSiteInScreen",
                      params: { project_id: String(item.id), vendor_id: String(item.vendor_id), project_name: item.projectName },
                    });
                  }}
                  activeOpacity={0.82}
                >
                  <MapPin size={14} color="#4338CA" />
                  <Text style={[card.secondaryBtnText, { color: "#4338CA" }]}>Verify at Site</Text>
                </TouchableOpacity>
              )}

              {item.packedItems > 0 && (
                <TouchableOpacity
                  style={[card.secondaryBtn, { marginLeft: hasSiteItems ? 0 : "auto" as any }]}
                  onPress={(e) => { e.stopPropagation?.(); onDownloadPress(); }}
                  activeOpacity={0.82}
                >
                  <FileDown size={14} color="#475569" />
                  <Text style={[card.secondaryBtnText, { color: "#475569" }]}>Download Report</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Stat Box ─────────────────────────────────────────────────────────────────

function StatBox({ label, value, color, icon }: {
  label: string; value: number; color: string; icon?: React.ReactNode;
}) {
  return (
    <View style={stat.box}>
      <View style={stat.valueRow}>
        {icon}
        <Text style={[stat.value, { color }]}>{value}</Text>
      </View>
      <Text style={stat.label}>{label}</Text>
    </View>
  );
}

const stat = StyleSheet.create({
  box:      { flex: 1, alignItems: "center", paddingVertical: 8, backgroundColor: "#F8FAFC", borderRadius: 10 },
  valueRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  value:    { fontSize: 20, fontWeight: "800" },
  label:    { fontSize: 10, color: "#94A3B8", fontWeight: "600", marginTop: 2 },
});

// ─── Timeline Step ────────────────────────────────────────────────────────────

function TimelineStep({ label, done, date }: { label: string; done: boolean; date: string | null }) {
  return (
    <View style={tl.step}>
      <View style={[tl.dot, { backgroundColor: done ? "#10B981" : "#E2E8F0", borderColor: done ? "#10B981" : "#CBD5E1" }]}>
        {done && <CheckCircle2 size={10} color="white" />}
      </View>
      <Text style={[tl.label, { color: done ? "#065F46" : "#94A3B8" }]}>{label}</Text>
      {done && date && (
        <Text style={tl.date}>{new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</Text>
      )}
    </View>
  );
}

const tl = StyleSheet.create({
  step:  { alignItems: "center", gap: 3 },
  dot:   { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  label: { fontSize: 10, fontWeight: "700" },
  date:  { fontSize: 9, color: "#059669", fontWeight: "600" },
});

// ─── Card StyleSheet ──────────────────────────────────────────────────────────

const card = StyleSheet.create({
  wrap: {
    backgroundColor: "#fff", borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  topBar:      { height: 3 },
  body:        { padding: 14, gap: 12 },
  nameRow:     { flexDirection: "row", alignItems: "center", gap: 8 },
  name:        { flex: 1, fontSize: 15, fontWeight: "800", color: "#0F172A" },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  badgeText:   { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  track:       { flex: 1, height: 5, backgroundColor: "#F1F5F9", borderRadius: 99, overflow: "hidden" },
  fill:        { height: "100%", borderRadius: 99 },
  pctText:     { fontSize: 12, fontWeight: "800", minWidth: 34, textAlign: "right" },
  statsRow:    { flexDirection: "row", gap: 6 },
  // Timeline
  timeline:    { flexDirection: "row", alignItems: "flex-start", gap: 0 },
  timelineLine:{ flex: 1, height: 2, marginTop: 9, marginHorizontal: 4 },
  // Actions
  actions:     { gap: 8 },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
  },
  primaryBtnText: { fontSize: 14, fontWeight: "800" },
  secondaryRow:   { flexDirection: "row", gap: 8 },
  secondaryBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 9, borderRadius: 10,
    backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0",
  },
  secondaryBtnText: { fontSize: 12, fontWeight: "700" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProjectsTabScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const { showToast } = useToast();

  const [projects, setProjects]               = useState<FormattedProject[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<FormattedProject | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showScanModal, setShowScanModal]       = useState(false);
  const [scanProject, setScanProject]           = useState<FormattedProject | null>(null);

  const fetchProjects = async () => {
    try {
      const vendorId = user?.vendor_id;
      if (!vendorId) return;
      const { data } = await axios.get(`/projects/vendor/${vendorId}`);
      setProjects(data.map((p: any) => ({
        id:                  p.id,
        vendor_id:           p.vendor_id,
        projectName:         p.project_name,
        totalNoItems:        p.aggregatedTotals?.total_items    ?? 0,
        unpackedItems:       p.aggregatedTotals?.total_unpacked ?? 0,
        packedItems:         p.aggregatedTotals?.total_packed   ?? 0,
        status:              p.project_status,
        date:                p.details[0]?.estimated_completion_date
          ? new Date(p.details[0].estimated_completion_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "N/A",
        completionPercentage: p.aggregatedTotals?.total_items > 0
          ? Math.round((p.aggregatedTotals.total_packed / p.aggregatedTotals.total_items) * 100)
          : 0,
        factory_out_at:  p.factory_out_at  ?? null,
        site_in_at:      p.site_in_at      ?? null,
        all_factory_out: p.all_factory_out ?? false,
        any_factory_out: p.any_factory_out ?? false,
      })));
    } catch {
      showToast("error", "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchProjects(); }, [user?.vendor_id]));

  const onRefresh = async () => { setRefreshing(true); await fetchProjects(); setRefreshing(false); };

  const handleDownload = async () => {
    setShowConfirmModal(false);
    setDownloadLoading(true);
    try { if (selectedProject) await fetchProjectFullReportAndShare(selectedProject); }
    catch {}
    finally { setDownloadLoading(false); }
  };

  const handleScanOption = (scanType: "IN" | "OUT") => {
    setShowScanModal(false);
    if (!scanProject) return;
    router.push({
      pathname: "/scanner",
      params: { project_id: String(scanProject.id), vendor_id: String(scanProject.vendor_id), scan_type: scanType },
    });
  };

  if (loading) return <View style={screen.center}><Loader /></View>;

  const scanMode = scanProject ? getScanMode(scanProject) : null;

  return (
    <View style={screen.root}>
      <View style={commonStyles.navbar}>
        <TouchableOpacity style={commonStyles.navbarBackBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <ArrowLeft size={20} color={colors.white} />
        </TouchableOpacity>
        <View style={commonStyles.navbarTitleBlock}>
          <Text style={commonStyles.navbarTitle}>Scan & Pack</Text>
          <Text style={commonStyles.navbarSubtitle}>Select a project</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {downloadLoading ? (
        <View style={screen.center}><Loader /></View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={screen.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={screen.empty}>
              <LottieView source={require("@/assets/animations/projectEmpty.json")} style={screen.lottie} autoPlay loop={false} />
              <Text style={screen.emptyTitle}>No projects found</Text>
              <Text style={screen.emptySub}>Projects will appear here once created</Text>
            </View>
          }
          renderItem={({ item }) => (
            <ProjectCard
              item={item}
              onScanPress={() => {
                const mode = getScanMode(item);
                if (!mode) { showToast("info", "All boxes dispatched and received"); return; }
                setScanProject(item);
                setShowScanModal(true);
              }}
              onDownloadPress={() => { setSelectedProject(item); setShowConfirmModal(true); }}
            />
          )}
        />
      )}

      {/* ── Scan Modal ── */}
      <Modal transparent animationType="slide" visible={showScanModal} onRequestClose={() => setShowScanModal(false)}>
        <View style={modal.overlay}>
          <TouchableOpacity style={modal.backdrop} activeOpacity={1} onPress={() => setShowScanModal(false)} />
          <View style={modal.sheet}>
            <View style={modal.handle} />
            <TouchableOpacity style={modal.closeBtn} onPress={() => setShowScanModal(false)}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
            <Text style={modal.title}>Where are you scanning?</Text>
            <Text style={modal.sub} numberOfLines={1}>"{scanProject?.projectName}"</Text>
            <View style={modal.options}>
              {(scanMode === "OUT" || scanMode === "BOTH") && (
                <TouchableOpacity style={[modal.optCard, { borderColor: "#F59E0B", backgroundColor: "#FFFBEB" }]} onPress={() => handleScanOption("OUT")} activeOpacity={0.85}>
                  <View style={[modal.optIcon, { backgroundColor: "#FEF3C7" }]}>
                    <LogOut size={28} color="#B45309" />
                  </View>
                  <Text style={[modal.optTitle, { color: "#B45309" }]}>Leaving Factory</Text>
                  <Text style={modal.optDesc}>Scan box as it goes out from the factory</Text>
                </TouchableOpacity>
              )}
              {(scanMode === "IN" || scanMode === "BOTH") && (
                <TouchableOpacity style={[modal.optCard, { borderColor: "#10B981", backgroundColor: "#ECFDF5" }]} onPress={() => handleScanOption("IN")} activeOpacity={0.85}>
                  <View style={[modal.optIcon, { backgroundColor: "#D1FAE5" }]}>
                    <LogIn size={28} color="#065F46" />
                  </View>
                  <Text style={[modal.optTitle, { color: "#065F46" }]}>Arriving at Site</Text>
                  <Text style={modal.optDesc}>Scan box as it arrives at the site</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Download Modal ── */}
      <Modal transparent animationType="slide" visible={showConfirmModal} onRequestClose={() => setShowConfirmModal(false)}>
        <View style={modal.overlay}>
          <TouchableOpacity style={modal.backdrop} activeOpacity={1} onPress={() => setShowConfirmModal(false)} />
          <View style={modal.sheet}>
            <View style={modal.handle} />
            <Text style={modal.title}>Download Report</Text>
            <Text style={modal.sub}>"{selectedProject?.projectName}"</Text>
            <View style={modal.btnRow}>
              <TouchableOpacity style={modal.btnCancel} onPress={() => setShowConfirmModal(false)}>
                <Text style={modal.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modal.btnConfirm} onPress={handleDownload}>
                <FileDown size={16} color="white" />
                <Text style={modal.btnConfirmText}>Yes, Download</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Screen styles ────────────────────────────────────────────────────────────

const screen = StyleSheet.create({
  root:       { flex: 1, backgroundColor: "#F1F5F9" },
  center:     { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F1F5F9" },
  list:       { padding: 14, paddingBottom: 36, gap: 12 },
  empty:      { marginTop: 60, alignItems: "center", gap: 8 },
  lottie:     { width: 200, height: 200 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  emptySub:   { fontSize: 13, color: "#94A3B8", textAlign: "center" },
});

const modal = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 44 : 28, paddingTop: 10,
    alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 18,
  },
  handle:   { width: 36, height: 4, backgroundColor: "#E2E8F0", borderRadius: 2, marginBottom: 16 },
  closeBtn: { position: "absolute", top: 18, right: 18, width: 30, height: 30, borderRadius: 15, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
  title:    { fontSize: 18, fontWeight: "800", color: "#0F172A", marginBottom: 4, textAlign: "center" },
  sub:      { fontSize: 13, color: "#64748B", marginBottom: 20, textAlign: "center", maxWidth: 260 },
  options:  { flexDirection: "row", gap: 10, width: "100%" },
  optCard:  { flex: 1, alignItems: "center", gap: 8, padding: 16, borderRadius: 14, borderWidth: 1.5 },
  optIcon:  { width: 56, height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  optTitle: { fontSize: 14, fontWeight: "800", textAlign: "center" },
  optDesc:  { fontSize: 11, color: "#64748B", textAlign: "center", lineHeight: 15 },
  btnRow:     { flexDirection: "row", gap: 10, width: "100%" },
  btnCancel:  { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center" },
  btnCancelText: { fontSize: 14, fontWeight: "600", color: "#475569" },
  btnConfirm: { flex: 1, flexDirection: "row", gap: 6, paddingVertical: 13, borderRadius: 12, backgroundColor: "#0F172A", alignItems: "center", justifyContent: "center" },
  btnConfirmText: { fontSize: 14, fontWeight: "700", color: "white" },
});
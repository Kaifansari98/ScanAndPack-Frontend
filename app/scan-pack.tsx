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
  Search,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  track_trace_status?: string;
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

function getProjectStatusBadge(p: FormattedProject) {
  const statusStr = (p.track_trace_status || p.status || "").trim();

  if (p.completionPercentage === 100 || statusStr.toLowerCase() === "completed") {
    return {
      label: "Completed",
      bg: "#D1FAE5", // Light green / emerald
      color: "#065F46", // Dark green
      barColor: "#10B981", // Emerald accent
    };
  }

  if (p.completionPercentage > 0 || statusStr.toLowerCase() === "started") {
    return {
      label: "Started",
      bg: "#E0E7FF", // Light indigo / blue
      color: "#3730A3", // Dark indigo
      barColor: "#6366F1", // Indigo accent
    };
  }

  return {
    label: "Not Started",
    bg: "#F1F5F9", // Light slate / gray
    color: "#64748B", // Slate text
    barColor: "#94A3B8", // Slate accent
  };
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
  const statusInfo = getProjectStatusBadge(item);
  const isDone     = statusInfo.label === "Completed";
  const pct        = item.completionPercentage;
  const scanMode   = getScanMode(item);

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
      {/* Top accent bar — full width, shows status color */}
      <View style={[card.topBar, { backgroundColor: statusInfo.barColor }]} />

      <View style={card.body}>

        {/* ── Project name + status badge ── */}
        <View style={card.nameRow}>
          <Text style={card.name} numberOfLines={1}>{item.projectName}</Text>
          <View style={[card.badge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[card.badgeText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
          <ChevronRight size={15} color="#CBD5E1" />
        </View>

        {/* ── Progress ── */}
        <View style={card.progressRow}>
          <View style={card.track}>
            <View style={[card.fill, { width: `${pct}%` as any, backgroundColor: statusInfo.barColor }]} />
          </View>
          <Text style={[card.pctText, { color: statusInfo.barColor }]}>{pct}%</Text>
        </View>

        {/* ── 3 stat boxes ── */}
        <View style={card.statsRow}>
          <StatBox label="Total Items" value={item.totalNoItems} color="#334155" />
          <StatBox label="Packed" value={item.packedItems} color="#059669"
            icon={isDone ? <CheckCircle2 size={12} color="#059669" /> : undefined} />
          <StatBox label="Pending" value={item.unpackedItems} color={item.unpackedItems > 0 ? "#D97706" : "#94A3B8"}
            icon={item.unpackedItems > 0 ? <Clock size={12} color="#D97706" /> : undefined} />
        </View>

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

  // Filter & Pagination States
  const [searchQuery, setSearchQuery]         = useState("");
  const [statusFilter, setStatusFilter]       = useState("all");
  const [page, setPage]                       = useState(1);
  const [totalPages, setTotalPages]           = useState(1);
  const [totalProjects, setTotalProjects]     = useState(0);
  const [loadingMore, setLoadingMore]         = useState(false);

  const fetchProjects = useCallback(
    async (targetPage = 1, isRefresh = false) => {
      try {
        const vendorId = user?.vendor_id;
        if (!vendorId) return;

        if (targetPage > 1) {
          setLoadingMore(true);
        }

        const params: any = {
          page: targetPage,
          limit: 10,
        };

        if (searchQuery.trim()) {
          params.search = searchQuery.trim();
        }

        if (statusFilter && statusFilter !== "all") {
          params.status = statusFilter;
        }

        const { data } = await axios.get(`/projects/vendor/${vendorId}`, { params });

        let listData: any[] = [];
        let totalCount = 0;
        let pagesCount = 1;

        if (Array.isArray(data)) {
          listData = data;
          totalCount = data.length;
          pagesCount = 1;
        } else if (data && Array.isArray(data.data)) {
          listData = data.data;
          totalCount = data.pagination?.total ?? listData.length;
          pagesCount = data.pagination?.totalPages ?? 1;
        }

        const formatted = listData.map((p: any) => ({
          id:                  p.id,
          vendor_id:           p.vendor_id,
          projectName:         p.project_name,
          totalNoItems:        p.aggregatedTotals?.total_items    ?? 0,
          unpackedItems:       p.aggregatedTotals?.total_unpacked ?? 0,
          packedItems:         p.aggregatedTotals?.total_packed   ?? 0,
          status:              p.project_status,
          track_trace_status:  p.track_trace_status ?? p.project_status,
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
        }));

        if (targetPage === 1 || isRefresh) {
          setProjects(formatted);
        } else {
          setProjects((prev) => [...prev, ...formatted]);
        }

        setPage(targetPage);
        setTotalPages(pagesCount);
        setTotalProjects(totalCount);
      } catch {
        showToast("error", "Failed to fetch projects");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user?.vendor_id, searchQuery, statusFilter, showToast]
  );

  useFocusEffect(
    useCallback(() => {
      fetchProjects(1);
    }, [fetchProjects])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProjects(1, true);
    setRefreshing(false);
  };

  const handleDownload = async () => {
    setShowConfirmModal(false);
    setDownloadLoading(true);
    try {
      if (selectedProject) {
        await fetchProjectFullReportAndShare(selectedProject);
        showToast("success", "Full report PDF ready to share!");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to download full report");
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleScanOption = (scanType: "IN" | "OUT") => {
    setShowScanModal(false);
    if (!scanProject) return;
    router.push({
      pathname: "/scanner",
      params: { project_id: String(scanProject.id), vendor_id: String(scanProject.vendor_id), scan_type: scanType },
    });
  };

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={screen.footerLoading}>
          <Loader />
        </View>
      );
    }

    if (page < totalPages) {
      return (
        <TouchableOpacity
          style={screen.loadMoreBtn}
          onPress={() => fetchProjects(page + 1)}
          activeOpacity={0.8}
        >
          <Text style={screen.loadMoreBtnText}>
            Load More ({projects.length} of {totalProjects})
          </Text>
        </TouchableOpacity>
      );
    }

    if (totalProjects > 0) {
      return (
        <View style={screen.footerEnd}>
          <Text style={screen.footerEndText}>
            Showing all {totalProjects} project{totalProjects === 1 ? "" : "s"}
          </Text>
        </View>
      );
    }

    return null;
  };

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

      {/* ── Search & Status Filters ── */}
      <View style={screen.searchFilterContainer}>
        {/* Search Bar */}
        <View style={screen.searchBar}>
          <Search size={18} color="#64748B" />
          <TextInput
            style={screen.searchInput}
            placeholder="Search by project name..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={(text) => setSearchQuery(text)}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={screen.filterScroll}>
          {[
            { key: "all", label: "All" },
            { key: "Not Started", label: "Not Started" },
            { key: "Started", label: "Started" },
            { key: "Completed", label: "Completed" },
          ].map((chip) => {
            const active = statusFilter === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                style={[screen.chip, active && screen.activeChip]}
                onPress={() => setStatusFilter(chip.key)}
                activeOpacity={0.8}
              >
                <Text style={[screen.chipText, active && screen.activeChipText]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && !refreshing && projects.length === 0 ? (
        <View style={screen.center}><Loader /></View>
      ) : downloadLoading ? (
        <View style={screen.center}><Loader /></View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={screen.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListFooterComponent={renderFooter}
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

  // Search & Filter
  searchFilterContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    paddingVertical: 0,
  },
  filterScroll: {
    gap: 8,
    paddingRight: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  activeChip: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  activeChipText: {
    color: "#FFFFFF",
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: "center",
  },
  loadMoreBtn: {
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  loadMoreBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  footerEnd: {
    paddingVertical: 14,
    alignItems: "center",
  },
  footerEndText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
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
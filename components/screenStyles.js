// ─── SCREEN STYLES ────────────────────────────────────────────────────────────
// Per-screen style objects. Each section maps 1-to-1 with a screen file.

import { COLORS, FONTS } from "../theme";

// ── IntroScreen ───────────────────────────────────────────────────────────────
export const introStyles = {
  container: (bg) => ({
    height: "100%",
    background: bg,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    transition: "background 0.4s ease",
    position: "relative",
  }),
  decCircle1: (accent) => ({
    position: "absolute", top: -60, right: -60,
    width: 220, height: 220, borderRadius: "50%",
    background: `${accent}22`,
  }),
  decCircle2: (accent) => ({
    position: "absolute", bottom: 100, left: -40,
    width: 160, height: 160, borderRadius: "50%",
    background: `${accent}15`,
  }),
  icon:    { fontSize: 90, marginBottom: 32, animation: "bounceIn 0.5s ease" },
  title:   { color: COLORS.white, fontSize: FONTS.xxxl, fontWeight: 900, textAlign: "center", letterSpacing: -1, marginBottom: 16 },
  subtitle: { color: "rgba(255,255,255,0.65)", fontSize: FONTS.lg, textAlign: "center", maxWidth: 280, lineHeight: 1.5, marginBottom: 48 },
  dots:    { display: "flex", gap: 8, marginBottom: 48 },
  dot: (active, accent) => ({
    width: active ? 28 : 8, height: 8, borderRadius: 4,
    background: active ? accent : "rgba(255,255,255,0.3)",
    transition: "all 0.3s ease",
  }),
  ctaBtn: (accent) => ({
    background: accent, border: "none", borderRadius: 16,
    padding: "18px 48px", cursor: "pointer", width: "100%", maxWidth: 320,
  }),
  ctaLabel: { color: COLORS.primaryDark, fontSize: FONTS.lg, fontWeight: 800 },
  skipBtn:  { background: "transparent", border: "none", marginTop: 20, cursor: "pointer", padding: "10px 20px" },
  skipLabel: { color: "rgba(255,255,255,0.5)", fontSize: FONTS.sm },
};

// ── SplashScreen ──────────────────────────────────────────────────────────────
export const splashStyles = {
  container: {
    height: "100%", background: COLORS.primaryDark,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
  },
  logo:     { fontSize: 72, marginBottom: 20, animation: "pulse 1s ease infinite" },
  appName:  { color: COLORS.white, fontSize: FONTS.xxxl, fontWeight: 900, letterSpacing: -1 },
  tagline:  { color: COLORS.accent, fontSize: FONTS.base, marginTop: 8, letterSpacing: 4, fontWeight: 600 },
  footer:   { position: "absolute", bottom: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
  barTrack: { width: 200, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" },
  barFill:  { height: "100%", background: COLORS.accent, borderRadius: 2, animation: "loadBar 2s ease forwards" },
  loadText: { color: "rgba(255,255,255,0.4)", fontSize: FONTS.sm },
};

// ── LoginScreen ───────────────────────────────────────────────────────────────
export const loginStyles = {
  container: { height: "100%", background: COLORS.primaryDark, display: "flex", flexDirection: "column" },
  hero: {
    background: `linear-gradient(160deg, ${COLORS.primaryDark} 0%, ${COLORS.primary} 100%)`,
    padding: "48px 32px 36px",
    display: "flex", flexDirection: "column", alignItems: "center",
  },
  heroIcon:    { fontSize: 52, marginBottom: 12 },
  heroTitle:   { color: COLORS.white, fontSize: FONTS.xxl, fontWeight: 900 },
  heroTagline: { color: COLORS.accent, fontSize: FONTS.sm, letterSpacing: 3, marginTop: 4 },
  card: {
    flex: 1, background: COLORS.bgLight,
    borderRadius: "28px 28px 0 0",
    padding: "36px 24px",
    display: "flex", flexDirection: "column", gap: 20,
  },
  greeting: { fontSize: FONTS.xl, fontWeight: 800, color: COLORS.textPrimary },
  fieldLabel: { color: COLORS.textSecondary, fontSize: FONTS.sm, fontWeight: 600, display: "block", marginBottom: 8 },
  input: {
    width: "100%", height: 56, borderRadius: 14,
    border: `2px solid ${COLORS.border}`,
    padding: "0 16px", fontSize: FONTS.lg,
    background: COLORS.cardBg, boxSizing: "border-box",
  },
  forgot: { textAlign: "center" },
  forgotText: { color: COLORS.textSecondary, fontSize: FONTS.sm },
};

// ── DashboardScreen ───────────────────────────────────────────────────────────
export const dashboardStyles = {
  hero: {
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
    padding: "24px 20px 32px",
  },
  heroRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  greeting: { color: "rgba(255,255,255,0.6)", fontSize: FONTS.sm },
  heroTitle: { color: COLORS.white, fontSize: FONTS.xxl, fontWeight: 900, marginTop: 4 },
  settingsBtn: {
    background: "rgba(255,255,255,0.15)", border: "none",
    borderRadius: 14, width: 48, height: 48,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  },
  machineChip: {
    background: "rgba(255,255,255,0.1)", borderRadius: 12,
    padding: "10px 16px", marginTop: 16,
    display: "flex", alignItems: "center", gap: 10,
    border: `1px solid ${COLORS.accent}44`,
  },
  machineChipText: { color: COLORS.white, fontSize: FONTS.sm, fontWeight: 600 },
  body: { padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 },
  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  statCard: {
    background: COLORS.cardBg, borderRadius: 16,
    padding: "16px 12px", textAlign: "center",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  },
  statValue: (color) => ({ color, fontSize: FONTS.xxl, fontWeight: 900 }),
  statLabel: { color: COLORS.textSecondary, fontSize: FONTS.xs, marginTop: 2 },
  sectionLabel: { color: COLORS.textSecondary, fontSize: FONTS.sm, fontWeight: 600, marginTop: 8 },
  moduleCard: (bg, hasBorder) => ({
    background: bg,
    borderRadius: 24, padding: "28px 24px",
    cursor: "pointer",
    boxShadow: hasBorder ? "0 4px 20px rgba(0,0,0,0.08)" : `0 8px 30px ${bg}44`,
    border: hasBorder ? `2px solid ${COLORS.border}` : "none",
    display: "flex", alignItems: "center", gap: 20,
    position: "relative", overflow: "hidden",
  }),
  moduleCircle: (color) => ({
    position: "absolute", right: -20, top: -20,
    width: 120, height: 120, borderRadius: "50%",
    background: color,
  }),
  moduleIcon: (bg) => ({
    width: 72, height: 72, borderRadius: 20,
    background: bg,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 36, flexShrink: 0,
  }),
  moduleTitle: (color) => ({ color, fontSize: FONTS.xxl, fontWeight: 900 }),
  moduleSub:   (color) => ({ color, fontSize: FONTS.base, marginTop: 4 }),
  moduleTag:   (bg, color) => ({
    display: "inline-block", background: bg, borderRadius: 8,
    padding: "4px 12px", marginTop: 10, color, fontSize: FONTS.xs, fontWeight: 700,
  }),
};

// ── MachineSelectScreen ───────────────────────────────────────────────────────
export const machineSelectStyles = {
  warning: {
    background: `${COLORS.accent}20`, borderRadius: 14,
    padding: "12px 16px", marginBottom: 20,
    display: "flex", alignItems: "center", gap: 10,
    border: `1px solid ${COLORS.accent}44`,
  },
  warningText: { color: "#92400E", fontSize: FONTS.sm, fontWeight: 600 },
  hint: { textAlign: "center", marginTop: 10, color: COLORS.textSecondary, fontSize: FONTS.sm },
};

// ── ScannerScreen ─────────────────────────────────────────────────────────────
export const scannerStyles = {
  container: { height: "100%", background: COLORS.bgDark, display: "flex", flexDirection: "column" },
  topBar: {
    padding: "16px 20px",
    display: "flex", alignItems: "center", gap: 12,
    background: COLORS.primaryDark,
  },
  backBtn: {
    background: "rgba(255,255,255,0.1)", border: "none",
    borderRadius: 12, width: 44, height: 44,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  },
  screenTitle:   { color: COLORS.white, fontSize: FONTS.lg, fontWeight: 700 },
  machineLabel:  { color: COLORS.accent, fontSize: FONTS.xs, marginTop: 2 },
  torchBtn: (on) => ({
    background: on ? COLORS.accent : "rgba(255,255,255,0.1)",
    border: "none", borderRadius: 12, width: 44, height: 44,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  }),
  viewfinder: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" },
  fakeCam: {
    position: "absolute", inset: 0,
    background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  fakeCamGrid: { opacity: 0.05, fontSize: 200 },
  frame: { width: 260, height: 260, position: "relative" },
  scanLine: {
    position: "absolute", left: 10, right: 10,
    height: 2, background: COLORS.accent,
    boxShadow: `0 0 12px ${COLORS.accent}`,
    animation: "scanLine 1.5s ease-in-out infinite",
    top: "50%",
  },
  successOverlay: {
    position: "absolute", inset: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: `${COLORS.success}22`, borderRadius: 12,
  },
  hint: { color: "rgba(255,255,255,0.5)", fontSize: FONTS.sm, textAlign: "center", marginBottom: 8 },
  bottomBar: { padding: "16px 24px 32px", background: COLORS.primaryDark },
  simulateBtn: {
    width: "100%", height: 64,
    background: COLORS.accent, border: "none", borderRadius: 16,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
  },
  simulateLabel: { color: COLORS.primaryDark, fontSize: FONTS.lg, fontWeight: 800 },
};

// ── ItemDetailScreen ──────────────────────────────────────────────────────────
export const itemDetailStyles = {
  card: {
    background: COLORS.cardBg, borderRadius: 20, padding: 20, marginBottom: 16,
    boxShadow: "0 2px 14px rgba(0,0,0,0.08)",
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  icon:        { fontSize: 48 },
  name:        { color: COLORS.textPrimary, fontSize: FONTS.xxl, fontWeight: 900, marginBottom: 4 },
  batch:       { color: COLORS.textSecondary, fontSize: FONTS.base },
  divider:     { height: 1, background: COLORS.border, margin: "16px 0" },
  row: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 0", borderBottom: `1px solid ${COLORS.border}`,
  },
  rowLeft:  { display: "flex", alignItems: "center", gap: 10 },
  rowLabel: { color: COLORS.textSecondary, fontSize: FONTS.base },
  rowValue: { color: COLORS.textPrimary, fontSize: FONTS.base, fontWeight: 700 },
  sectionLabel: { color: COLORS.textSecondary, fontSize: FONTS.sm, fontWeight: 600, marginBottom: 12 },
};

// ── DefectScreen ──────────────────────────────────────────────────────────────
export const defectStyles = {
  alertBanner: {
    background: `${COLORS.error}12`, borderRadius: 14,
    padding: "14px 16px", marginBottom: 20,
    border: `1px solid ${COLORS.error}33`,
  },
  alertTitle: { color: COLORS.error, fontSize: FONTS.base, fontWeight: 700 },
  alertSub:   { color: COLORS.textSecondary, fontSize: FONTS.sm, marginTop: 4 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  card: (pressed, borderColor) => ({
    background: COLORS.cardBg, borderRadius: 18,
    padding: "20px 16px",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
    boxShadow: pressed ? "none" : "0 2px 14px rgba(0,0,0,0.08)",
    border: `2px solid ${pressed ? borderColor : COLORS.border}`,
    cursor: "pointer",
    transform: pressed ? "scale(0.96)" : "scale(1)",
    transition: "all 0.15s ease",
    minHeight: 110, justifyContent: "center",
  }),
  cardIcon: (color) => ({
    width: 52, height: 52, borderRadius: 16,
    background: `${color}18`,
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
  }),
  cardLabel: { color: COLORS.textPrimary, fontSize: FONTS.base, fontWeight: 700, textAlign: "center" },
};

// ── SuccessScreen ─────────────────────────────────────────────────────────────
export const successStyles = {
  container: {
    height: "100%",
    background: `linear-gradient(160deg, ${COLORS.success} 0%, #1a6b62 100%)`,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", padding: 32,
  },
  ring: {
    width: 140, height: 140, borderRadius: "50%",
    background: "rgba(255,255,255,0.2)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 72, marginBottom: 32,
    animation: "successRing 1.5s ease infinite",
  },
  heading: { color: COLORS.white, fontSize: FONTS.xxxl, fontWeight: 900, textAlign: "center", marginBottom: 12 },
  subtext:  { color: "rgba(255,255,255,0.7)", fontSize: FONTS.lg, textAlign: "center", marginBottom: 48 },
  countdown: { color: "rgba(255,255,255,0.5)", fontSize: FONTS.sm },
  backBtn: {
    background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)",
    borderRadius: 16, padding: "14px 32px", cursor: "pointer", marginTop: 20,
  },
  backLabel: { color: COLORS.white, fontSize: FONTS.base, fontWeight: 700 },
};

// ── PackStationScreen ─────────────────────────────────────────────────────────
export const packStationStyles = {
  card: (selected) => ({
    background: selected ? COLORS.primary : COLORS.cardBg,
    borderRadius: 20, padding: "18px 20px", marginBottom: 12,
    border: `2px solid ${selected ? COLORS.accent : COLORS.border}`,
    boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
    transition: "all 0.2s ease",
  }),
  cardRow: { display: "flex", alignItems: "center", gap: 16, marginBottom: 12 },
  iconWrap: (selected) => ({
    width: 52, height: 52, borderRadius: 14,
    background: selected ? "rgba(255,255,255,0.2)" : `${COLORS.primary}15`,
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
  }),
  stationName: (selected) => ({
    color: selected ? COLORS.white : COLORS.textPrimary,
    fontSize: FONTS.lg, fontWeight: 800,
  }),
  stationMeta: (selected) => ({
    color: selected ? "rgba(255,255,255,0.6)" : COLORS.textSecondary,
    fontSize: FONTS.sm,
  }),
  fullBadge:  { background: "#FEE2E2", color: "#991B1B", padding: "4px 10px", borderRadius: 10, fontSize: FONTS.xs, fontWeight: 700 },
  openBadge:  { background: "#D1FAE5", color: "#065F46", padding: "4px 10px", borderRadius: 10, fontSize: FONTS.xs, fontWeight: 700 },
  progressTrack: { height: 6, background: "rgba(0,0,0,0.08)", borderRadius: 3, overflow: "hidden" },
  progressFill: (pct, color) => ({
    width: `${pct}%`, height: "100%",
    background: color, borderRadius: 3, transition: "width 0.3s ease",
  }),
};

// ── BoxSummaryScreen ──────────────────────────────────────────────────────────
export const boxSummaryStyles = {
  infoCard: {
    background: COLORS.primary, borderRadius: 20, padding: 20, marginBottom: 20,
    boxShadow: `0 6px 24px ${COLORS.primary}44`,
  },
  infoRow:  { display: "flex", justifyContent: "space-between", alignItems: "center" },
  boxLabel: { color: "rgba(255,255,255,0.6)", fontSize: FONTS.sm },
  boxId:    { color: COLORS.white, fontSize: FONTS.xl, fontWeight: 800, marginTop: 2 },
  countLabel: { color: "rgba(255,255,255,0.6)", fontSize: FONTS.sm, textAlign: "right" },
  countValue: { color: COLORS.accent, fontSize: FONTS.xxxl, fontWeight: 900 },
  divider:  { height: 1, background: "rgba(255,255,255,0.15)", margin: "16px 0" },
  metaRow:  { display: "flex", gap: 20 },
  metaKey:  { color: "rgba(255,255,255,0.5)", fontSize: FONTS.xs },
  metaVal:  { color: COLORS.white, fontSize: FONTS.sm, fontWeight: 600 },
  sectionLabel: { color: COLORS.textSecondary, fontSize: FONTS.sm, fontWeight: 600, marginBottom: 12 },
  itemRow: {
    background: COLORS.cardBg, borderRadius: 14,
    padding: "14px 16px", marginBottom: 8,
    display: "flex", alignItems: "center", gap: 14,
    boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
  },
  itemNum: {
    width: 36, height: 36, borderRadius: 10,
    background: `${COLORS.success}20`,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: COLORS.success, fontWeight: 800, fontSize: FONTS.sm,
  },
  itemName: { color: COLORS.textPrimary, fontSize: FONTS.base, fontWeight: 700 },
  itemId:   { color: COLORS.textSecondary, fontSize: FONTS.xs },
  addBtn: {
    width: "100%", height: 56,
    background: "transparent",
    border: `2px dashed ${COLORS.border}`,
    borderRadius: 14, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    marginBottom: 20,
  },
  addBtnLabel: { color: COLORS.textSecondary, fontSize: FONTS.base, fontWeight: 600 },
};

// ── SettingsScreen ────────────────────────────────────────────────────────────
export const settingsStyles = {
  profileCard: {
    background: COLORS.cardBg, borderRadius: 20, padding: 20, marginBottom: 20,
    display: "flex", alignItems: "center", gap: 16,
    boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
  },
  avatar: {
    width: 64, height: 64, borderRadius: "50%",
    background: COLORS.primary,
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
  },
  workerName:  { color: COLORS.textPrimary, fontSize: FONTS.xl, fontWeight: 800 },
  workerMeta:  { color: COLORS.textSecondary, fontSize: FONTS.sm },
  workerShift: { color: COLORS.success, fontSize: FONTS.xs, fontWeight: 600, marginTop: 4 },
  menuItem: {
    background: COLORS.cardBg, borderRadius: 14,
    padding: "16px 20px", marginBottom: 8,
    display: "flex", alignItems: "center", gap: 14,
    boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
  },
  menuLabel: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.base, fontWeight: 600 },
  menuValue: { color: COLORS.textSecondary, fontSize: FONTS.sm },
  menuArrow: { color: COLORS.textSecondary, fontSize: 16 },
};
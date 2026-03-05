/**
 * commonStyles.ts — Shared StyleSheet for FactoryOS screens
 * Import from anywhere: import { commonStyles } from "@/theme/commonStyles"
 */
import { StyleSheet } from "react-native";
import { colors } from "./colors";

export const commonStyles = StyleSheet.create({
  // ─── Layout ───────────────────────────────────────────
  root: {
    flex: 1,
    backgroundColor: colors.darkBg,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
    gap: 14,
  },

  // ─── Hero (dark top section) ───────────────────────────
  hero: {
    paddingTop: 64,
    paddingBottom: 40,
    paddingHorizontal: 32,
    alignItems: "center",
    backgroundColor: colors.midBg,
  },
  heroLogo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginBottom: 14,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 3,
    marginTop: 6,
  },

  // ─── Dashboard hero header ─────────────────────────────
  dashHero: {
    paddingTop: 56,
    paddingBottom: 32,
    paddingHorizontal: 20,
    backgroundColor: colors.midBg,
  },
  dashHeroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  dashGreeting: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
  },
  dashWorkerName: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 2,
  },
  dashSettingsBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  dashMachineChip: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(244,162,97,0.25)",
  },
  dashMachineChipText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },

  // ─── Stat row ──────────────────────────────────────────
  statRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "900",
  },
  statLabel: {
    color: colors.label,
    fontSize: 11,
    marginTop: 2,
    textAlign: "center",
  },

  // ─── Section label ─────────────────────────────────────
  sectionLabel: {
    color: colors.label,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 4,
  },

  // ─── Module cards ──────────────────────────────────────
  moduleCardDark: {
    backgroundColor: colors.midBg,
    borderRadius: 24,
    padding: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    overflow: "hidden",
    shadowColor: colors.midBg,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  moduleCardLight: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  moduleIconWrapDark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  moduleIconWrapLight: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "rgba(42,157,143,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  moduleTextBlock: {
    flex: 1,
  },
  moduleTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28,
  },
  moduleTitleDark: {
    color: colors.heading,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28,
  },
  moduleSubtitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
    marginTop: 4,
  },
  moduleSubtitleLight: {
    color: colors.label,
    fontSize: 14,
    marginTop: 4,
  },
  moduleBadgeAccent: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  moduleBadgeTeal: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "rgba(42,157,143,0.15)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  moduleBadgeTextAccent: {
    color: colors.darkBg,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  moduleBadgeTextTeal: {
    color: "#2A9D8F",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // ─── Card (light bottom section — login) ───────────────
  card: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 24,
    gap: 20,
  },
  cardHeading: {
    color: colors.heading,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },

  // ─── Form Fields ───────────────────────────────────────
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: colors.label,
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    width: "100%",
    height: 56,
    backgroundColor: colors.inputBg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.heading,
  },
  inputError: {
    borderColor: colors.error,
  },
  passwordWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  eyeButton: {
    position: "absolute",
    right: 16,
    top: 18,
  },

  // ─── Primary Button ────────────────────────────────────
  buttonWrap: {
    marginTop: 4,
  },
  button: {
    backgroundColor: colors.button,
    borderRadius: 16,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.button,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonLoading: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // ─── Misc ──────────────────────────────────────────────
  forgotText: {
    color: colors.label,
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },

  // ─── Navbar / page header ──────────────────────────────
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: colors.midBg,
    gap: 12,
  },
  navbarBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  navbarTitleBlock: {
    flex: 1,
  },
  navbarTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "900",
  },
  navbarSubtitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    marginTop: 1,
  },

  // ─── Warning banner ────────────────────────────────────
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(244,162,97,0.12)",
    borderWidth: 1,
    borderColor: "rgba(244,162,97,0.35)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 4,
  },
  warningText: {
    flex: 1,
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },

  // ─── Hint text (below disabled button) ────────────────
  hintText: {
    color: colors.label,
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },

});
// appended — remove the stray text line above before using
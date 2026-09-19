import Loader from "@/components/generic/Loader";
import Navbar from "@/components/generic/Navbar";
import { ScannerSelectionModal } from "@/components/modals/ScannerSelectionModal";
import { useAuth } from "@/hooks/useAuth";
import { useScannerPreference } from "@/hooks/useScannerPreference";
import { cacheAuthToken } from "@/lib/axios";
import { RootState } from "@/redux/store";
import { SCANNER_LABELS } from "@/types/scanner";
import { useRouter } from "expo-router";
import {
  Building2,
  ChevronRight,
  CircleDot,
  LogOut,
  Mail,
  Phone,
  RotateCcw,
  ScanBarcode,
  Settings2,
  Smartphone,
  UserCheck,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSelector } from "react-redux";

const getSafeString = (val: any, fallback: string = ""): string => {
  if (!val) return fallback;
  if (typeof val === "string" || typeof val === "number") return String(val);
  if (typeof val === "object") {
    if (typeof val.user_type === "string") return val.user_type;
    if (typeof val.name === "string") return val.name;
    if (typeof val.vendor_name === "string") return val.vendor_name;
    if (typeof val.title === "string") return val.title;
  }
  return fallback;
};

const getInitials = (name: string) => {
  if (!name) return "US";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export default function ProfileTabScreen() {
  const User = useSelector((state: RootState) => state.auth.user);
  const Vendor = useSelector((state: RootState) => state.auth.vendor);
  const router = useRouter();
  const { logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showScannerSettings, setShowScannerSettings] = useState(false);
  const {
    defaultScanner,
    isHydrated: isScannerPreferenceHydrated,
    isSaving: isSavingScanner,
    savePreference,
    resetPreference,
  } = useScannerPreference();

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    setTimeout(async () => {
      await logout();
      cacheAuthToken(null);
      router.replace("/auth/login");
    }, 300);
  };

  if (!User) {
    return (
      <View style={styles.loaderContainer}>
        <Loader />
      </View>
    );
  }

  const vendorName =
    Vendor?.vendor_name ||
    User?.vendor_name ||
    User?.vendor?.vendor_name ||
    "Furnix Factory OS";

  const userRole = getSafeString(User.user_type, "Operator");
  const DefaultScannerIcon =
    defaultScanner === "ring"
      ? CircleDot
      : defaultScanner === "handheld"
        ? ScanBarcode
        : Smartphone;

  return (
    <View style={styles.root}>
      <Navbar title="Profile" subtitle="Account details" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Compact Profile Main Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>
              {getInitials(User.user_name || "User")}
            </Text>
          </View>

          <Text style={styles.userName}>{getSafeString(User.user_name, "User")}</Text>

          <View style={styles.contactRow}>
            {User.user_contact ? (
              <View style={styles.contactPill}>
                <Phone size={12} color="#64748B" />
                <Text style={styles.contactPillText}>{User.user_contact}</Text>
              </View>
            ) : null}
            {User.user_email || (User as any).email ? (
              <View style={styles.contactPill}>
                <Mail size={12} color="#64748B" />
                <Text style={styles.contactPillText}>
                  {User.user_email || (User as any).email}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── 2. Essential Vendor & Account Info Card ── */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Building2 size={16} color="#4B3A34" />
            </View>
            <View style={styles.infoTextBlock}>
              <Text style={styles.infoLabel}>Company / Vendor</Text>
              <Text style={styles.infoValue}>{vendorName}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <UserCheck size={16} color="#047857" />
            </View>
            <View style={styles.infoTextBlock}>
              <Text style={styles.infoLabel}>User Role</Text>
              <Text style={styles.infoValue}>{userRole}</Text>
            </View>
          </View>
        </View>

        {/* ── 3. Scanner Settings ── */}
        <View style={styles.settingsCard}>
          <View style={styles.settingsHeader}>
            <View style={styles.settingsHeaderIcon}>
              <Settings2 size={18} color="#2563EB" />
            </View>
            <View style={styles.settingsHeaderText}>
              <Text style={styles.settingsTitle}>Scanner Settings</Text>
              <Text style={styles.settingsSubtitle}>
                Choose which scanner opens automatically.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.scannerSettingRow}
            activeOpacity={0.82}
            onPress={() => setShowScannerSettings(true)}
            disabled={!isScannerPreferenceHydrated || isSavingScanner}
          >
            <View
              style={[
                styles.scannerSettingIcon,
                !defaultScanner && styles.scannerSettingIconEmpty,
              ]}
            >
              <DefaultScannerIcon
                size={21}
                color={defaultScanner ? "#2563EB" : "#64748B"}
              />
            </View>

            <View style={styles.scannerSettingText}>
              <Text style={styles.scannerSettingLabel}>Default Scanner</Text>
              <Text style={styles.scannerSettingValue}>
                {!isScannerPreferenceHydrated
                  ? "Loading preference..."
                  : defaultScanner
                    ? SCANNER_LABELS[defaultScanner]
                    : "Not set — ask every time"}
              </Text>
            </View>

            <View style={styles.changeScannerAction}>
              <Text style={styles.changeScannerText}>
                {defaultScanner ? "Change" : "Set"}
              </Text>
              <ChevronRight size={17} color="#2563EB" />
            </View>
          </TouchableOpacity>

          {defaultScanner && (
            <TouchableOpacity
              style={styles.resetScannerButton}
              activeOpacity={0.8}
              disabled={isSavingScanner}
              onPress={() => void resetPreference()}
            >
              <RotateCcw size={15} color="#B42318" />
              <Text style={styles.resetScannerText}>
                Reset and ask every time
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── 4. Logout Button ── */}
        <TouchableOpacity
          style={styles.logoutRow}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.82}
        >
          <View style={styles.logoutIconWrap}>
            <LogOut size={18} color="#DC2626" />
          </View>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Logout Confirmation Modal ── */}
      <Modal
        transparent
        animationType="fade"
        visible={showLogoutModal}
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowLogoutModal(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowLogoutModal(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color="#64748B" />
            </TouchableOpacity>

            <View style={styles.modalIconWrap}>
              <LogOut size={28} color="#DC2626" />
            </View>

            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to log out of your account?
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handleConfirmLogout}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnConfirmText}>Yes, Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScannerSelectionModal
        visible={showScannerSettings}
        showDefaultOption={false}
        selectedScanner={defaultScanner}
        onSelect={(scannerType) => {
          setShowScannerSettings(false);
          void savePreference(scannerType, true);
        }}
        onClose={() => setShowScannerSettings(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 20,
    alignItems: "center",
    gap: 6,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4B3A34",
    borderWidth: 3,
    borderColor: "#F4A261",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    shadowColor: "#4B3A34",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 2,
  },
  contactPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  contactPillText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  infoTextBlock: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  settingsCard: {
    borderWidth: 1,
    borderColor: "#DCE6F5",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    padding: 14,
  },
  settingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 13,
  },
  settingsHeaderIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#EFF6FF",
  },
  settingsHeaderText: { flex: 1 },
  settingsTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  settingsSubtitle: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 16,
    color: "#64748B",
  },
  scannerSettingRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 14,
    backgroundColor: "#F8FAFF",
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  scannerSettingIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#DBEAFE",
  },
  scannerSettingIconEmpty: { backgroundColor: "#F1F5F9" },
  scannerSettingText: { flex: 1 },
  scannerSettingLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scannerSettingValue: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  changeScannerAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  changeScannerText: { fontSize: 11, fontWeight: "800", color: "#2563EB" },
  resetScannerButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 10,
    borderRadius: 11,
    backgroundColor: "#FEF3F2",
  },
  resetScannerText: { fontSize: 12, fontWeight: "700", color: "#B42318" },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  logoutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#DC2626",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    paddingTop: 12,
    alignItems: "center",
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#CBD5E1",
    borderRadius: 2,
    marginBottom: 16,
  },
  modalCloseBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  modalMessage: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancel: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalBtnCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  modalBtnConfirm: {
    backgroundColor: "#DC2626",
  },
  modalBtnConfirmText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

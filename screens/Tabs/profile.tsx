import Loader from "@/components/generic/Loader";
import { colors } from "@/components/theme/colors";
import { commonStyles } from "@/components/theme/commonStyles";
import { useAuth } from "@/hooks/useAuth";
import { RootState } from "@/redux/store";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Download,
  Languages,
  LogOut,
  Palette,
  UserRoundCog,
  X,
} from "lucide-react-native";
import { useState } from "react";
import {
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSelector } from "react-redux";

export default function ProfileTabScreen() {
  const User = useSelector((state: RootState) => state.auth.user);
  const router = useRouter();
  const { logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    setTimeout(async () => {
      await logout();
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

  return (
    <View style={styles.root}>
      {/* ── Navbar ── */}
      <View style={commonStyles.navbar}>
        <TouchableOpacity
          style={commonStyles.navbarBackBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color={colors.white} />
        </TouchableOpacity>
        <View style={commonStyles.navbarTitleBlock}>
          <Text style={commonStyles.navbarTitle}>Profile</Text>
          <Text style={commonStyles.navbarSubtitle}>Manage your account</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── Profile Info ── */}
        <View style={styles.infoContainer}>
          <Image
            style={styles.profileLogo}
            source={require("../../assets/images/Profile/profile.png")}
          />
          <Text style={styles.userName}>{User.user_name}</Text>
          <Text style={styles.userContact}>{User.user_contact}</Text>
        </View>

        {/* ── Personal ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Personal</Text>

          <TouchableOpacity style={styles.menuRow}>
            <View style={styles.menuRowLeft}>
              <View style={styles.menuIcon}>
                <UserRoundCog size={24} color="#374151" />
              </View>
              <Text style={styles.menuText}>Edit profile</Text>
            </View>
            <ChevronRight size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuRow}>
            <View style={styles.menuRowLeft}>
              <View style={styles.menuIcon}>
                <Download size={24} color="#374151" />
              </View>
              <Text style={styles.menuText}>Downloads</Text>
            </View>
            <ChevronRight size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* ── Preferences ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preferences</Text>

          <TouchableOpacity style={styles.menuRow}>
            <View style={styles.menuRowLeft}>
              <View style={styles.menuIcon}>
                <Languages size={24} color="#374151" />
              </View>
              <Text style={styles.menuText}>Language</Text>
            </View>
            <View style={styles.menuRowRight}>
              <Text style={styles.menuValue}>English</Text>
              <ChevronRight size={24} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuRow}>
            <View style={styles.menuRowLeft}>
              <View style={styles.menuIcon}>
                <Bell size={24} color="#374151" />
              </View>
              <Text style={styles.menuText}>Notification</Text>
            </View>
            <View style={styles.menuRowRight}>
              <Text style={styles.menuValue}>Enable</Text>
              <ChevronRight size={24} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuRow}>
            <View style={styles.menuRowLeft}>
              <View style={styles.menuIcon}>
                <Palette size={24} color="#374151" />
              </View>
              <Text style={styles.menuText}>Theme</Text>
            </View>
            <View style={styles.menuRowRight}>
              <Text style={styles.menuValue}>Light</Text>
              <ChevronRight size={24} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Logout ── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutRow}
            onPress={() => setShowLogoutModal(true)}
            activeOpacity={0.8}
          >
            <LogOut size={24} color="#E63946" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── Logout Confirmation Modal ── */}
      <Modal
        transparent
        animationType="slide"
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
              <X size={20} color="#6B7280" />
            </TouchableOpacity>

            <View style={styles.modalIconWrap}>
              <LogOut size={32} color="#E63946" />
            </View>

            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to logout?
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
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnConfirmText}>Yes, Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Profile info
  infoContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 32,
    gap: 6,
  },
  profileLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  userContact: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
  },

  // Sections
  section: {
    marginHorizontal: 20,
    marginBottom: 28,
    gap: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },

  // Menu rows
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  menuText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  menuValue: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },

  // Logout row
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF1F2",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E63946",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 48 : 32,
    paddingTop: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    marginBottom: 16,
  },
  modalCloseBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF1F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 22,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancel: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalBtnCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  modalBtnConfirm: {
    backgroundColor: "#E63946",
    shadowColor: "#E63946",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalBtnConfirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: "white",
  },
});
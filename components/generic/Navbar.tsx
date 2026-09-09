import { colors } from "@/components/theme/colors";
import { useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, Bell, QrCode, Search, SlidersHorizontal } from "lucide-react-native";
import React from "react";
import {
  Platform,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type NavbarProps = {
  title: string;
  subtitle?: string;
  description?: string;
  showBack?: boolean;
  showSearch?: boolean;
  showFilter?: boolean;
  showNotification?: boolean;
  showPack?: boolean;
  showScan?: boolean;
  onFilterPress?: () => void;
  onPackPress?: () => void;
  onScanPress?: () => void;
  isFilterActive?: boolean;
  boxStatus?: string;
  variant?: "dark" | "light";
  backgroundColor?: string;
  textColor?: string;
  statusBarStyle?: "dark" | "light";
  rightElement?: React.ReactNode;
};

export default function Navbar({
  title,
  subtitle,
  description,
  showBack = false,
  showSearch = false,
  showFilter = false,
  showNotification = false,
  showPack = false,
  showScan = false,
  onFilterPress,
  onPackPress,
  onScanPress,
  isFilterActive = false,
  boxStatus = "Mark as packed",
  variant = "dark",
  backgroundColor,
  textColor,
  statusBarStyle,
  rightElement,
}: NavbarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const isDark = variant === "dark";
  const bg = backgroundColor || (isDark ? colors.midBg : "#FFFFFF");
  const textClr = textColor || (isDark ? colors.white : colors.heading);
  const barStyle = statusBarStyle || (isDark ? "light" : "dark");

  // Dynamic top safe area padding so header background extends under top status bar
  const safeTop = insets.top > 0 ? insets.top : Platform.OS === "ios" ? 44 : (RNStatusBar.currentHeight || 24);

  const handleScanPress = async () => {
    if (onScanPress) {
      onScanPress();
      return;
    }
    if (!permission || !permission.granted) {
      const newPermission = await requestPermission();
      if (newPermission?.granted) {
        router.push("/scanner");
      }
    } else {
      router.push("/scanner");
    }
  };

  const hasRightActions = showSearch || showFilter || showScan || showNotification || showPack || rightElement;
  const subText = subtitle || description;

  return (
    <View style={[styles.wrapper, { backgroundColor: bg, paddingTop: safeTop }]}>
      <StatusBar style={barStyle} backgroundColor={bg} translucent />
      
      {/* Container */}
      <View style={styles.container}>
        {/* Left Section: Back Button + Title & Subtitle */}
        <View style={styles.leftSection}>
          {showBack && (
            <TouchableOpacity
              onPress={() => router.back()}
              style={[
                styles.backBtn,
                isDark ? styles.darkBackBtn : styles.lightBackBtn,
              ]}
              activeOpacity={0.75}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={20} color={textClr} />
            </TouchableOpacity>
          )}

          <View style={styles.titleBlock}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.title, { color: textClr }]}
            >
              {title}
            </Text>
            {subText ? (
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.subtitle,
                  { color: isDark ? "rgba(255, 255, 255, 0.75)" : "#64748B" },
                ]}
              >
                {subText}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Right Section: Action Buttons */}
        {hasRightActions && (
          <View style={styles.rightSection}>
            {rightElement}
            {showFilter && (
              <TouchableOpacity
                onPress={onFilterPress}
                style={[
                  styles.actionBtn,
                  isDark ? styles.darkActionBtn : styles.lightActionBtn,
                  isFilterActive && styles.activeFilterBtn,
                ]}
                activeOpacity={0.7}
              >
                <SlidersHorizontal size={19} color={isFilterActive ? colors.accent : textClr} />
                {isFilterActive && <View style={styles.filterBadgeDot} />}
              </TouchableOpacity>
            )}
            {showSearch && (
              <TouchableOpacity
                style={[styles.actionBtn, isDark ? styles.darkActionBtn : styles.lightActionBtn]}
                activeOpacity={0.7}
              >
                <Search size={20} color={textClr} />
              </TouchableOpacity>
            )}
            {showScan && (
              <TouchableOpacity
                onPress={handleScanPress}
                style={[styles.actionBtn, isDark ? styles.darkActionBtn : styles.lightActionBtn]}
                activeOpacity={0.7}
              >
                <QrCode size={20} color={textClr} />
              </TouchableOpacity>
            )}
            {showNotification && (
              <TouchableOpacity
                onPress={() => router.push("/dashboards/notificaitons")}
                style={[styles.actionBtn, isDark ? styles.darkActionBtn : styles.lightActionBtn]}
                activeOpacity={0.7}
              >
                <Bell size={20} color={textClr} />
              </TouchableOpacity>
            )}
            {showPack && (
              <TouchableOpacity
                onPress={onPackPress}
                style={styles.packBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.packBtnText}>{boxStatus}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    zIndex: 50,
  },
  container: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  darkBackBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  lightBackBtn: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  titleBlock: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  darkActionBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  lightActionBtn: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  activeFilterBtn: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: "rgba(244, 162, 97, 0.22)",
    position: "relative",
  },
  filterBadgeDot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.accent,
  },
  packBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  packBtnText: {
    color: colors.darkBg,
    fontSize: 13,
    fontWeight: "700",
  },
});
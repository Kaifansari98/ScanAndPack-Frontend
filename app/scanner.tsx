import { useToast } from "@/components/Notification/ToastProvider";
import axiosInstance from "@/lib/axios";
import { RootState } from "@/redux/store";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Flashlight, FlashlightOff, Focus, ScanLine, X } from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSelector } from "react-redux";

const { width, height } = Dimensions.get("window");
const scanAreaSize = width * 0.7;

export default function BarcodeScanner() {

  const [permission, requestPermission] = useCameraPermissions();
  const [flashMode, setFlashMode] = useState(false);
  const [scanned, setScanned]     = useState(false);
  const [processing, setProcessing] = useState(false);
  const router = useRouter();
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  const { showToast } = useToast();
  const user          = useSelector((state: RootState) => state.auth.user);
  const reduxVendorId = user?.id ? Number((user as any).vendor_id) : 0;
  const userId        = user?.id ? Number(user.id) : 0;

  // ── Params ─────────────────────────────────────────────────────────────────
  const {
    scan_type,
    project_id: paramProjectId,
    vendor_id:  paramVendorId,
    box_id:     paramBoxId,
  } = useLocalSearchParams<{
    scan_type?:  string;
    project_id?: string;
    vendor_id?:  string;
    box_id?:     string;
  }>();

  const resolvedVendorId  = paramVendorId  ? Number(paramVendorId)  : reduxVendorId;
  const resolvedProjectId = paramProjectId ? Number(paramProjectId) : null;
  const resolvedBoxId     = paramBoxId     ? Number(paramBoxId)     : null;
  const resolvedScanType  = (
    scan_type === "IN" || scan_type === "OUT" || scan_type === "ITEM_SITE_IN"
  ) ? scan_type as "IN" | "OUT" | "ITEM_SITE_IN" : null;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnimation, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanLineAnimation, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ── API call ──────────────────────────────────────────────────────────────
  const callDispatchApi = async (
    box_id: number,
    scanned_project_id: number,
    scanned_vendor_id: number,
    unique_code?: string
  ) => {
    if (!resolvedScanType) return;

    if (resolvedScanType === "ITEM_SITE_IN") {
      if (!unique_code) throw new Error("unique_code required for item site in");
      const res = await axiosInstance.patch(`/boxes/boxes/${box_id}/items/site-in`, {
        project_id: scanned_project_id,
        vendor_id:  scanned_vendor_id,
        user_id:    userId,
        unique_code,
      });
      return res.data;
    }

    const endpoint =
      resolvedScanType === "OUT"
        ? `/track-trace/boxes/${box_id}/factory-out`
        : `/track-trace/boxes/${box_id}/site-in`;

    const res = await axiosInstance.patch(endpoint, {
      project_id: scanned_project_id,
      vendor_id:  scanned_vendor_id,
      user_id:    userId,
    });

    return res.data;
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || processing) return;
    setScanned(true);

    //console.log("Scanned data:", data);
    //console.log("scan_type:", resolvedScanType);

    try {
      const cleanData  = data.replace(/"/g, "").trim();
      const parts      = cleanData.split(",").map((p) => p.trim());
      const isKeyValue = parts.every((p) => p.includes(":"));

      // ── ITEM_SITE_IN ───────────────────────────────────────────────────────
      if (resolvedScanType === "ITEM_SITE_IN") {
        let uniqueCode: string | null = null;
        if (isKeyValue) {
          const parsed: Record<string, string> = {};
          for (const part of parts) {
            const [key, value] = part.split(":").map((s) => s.trim());
            parsed[key] = value;
          }
          uniqueCode = parsed["unique_code"] ?? parsed["code"] ?? null;
        } else {
          uniqueCode = cleanData;
        }

        if (!uniqueCode || !resolvedBoxId || !resolvedProjectId) {
          showToast("error", "Invalid item QR code");
          setScanned(false);
          return;
        }

        setProcessing(true);
        try {
          const res = await callDispatchApi(resolvedBoxId, resolvedProjectId, resolvedVendorId, uniqueCode);
          showToast("success", res?.message ?? "Item marked as received at site");
          setTimeout(() => setScanned(false), 1500);
        } catch (apiErr: any) {
          showToast("error", apiErr?.response?.data?.message ?? "Failed to mark item");
          setScanned(false);
        } finally {
          setProcessing(false);
        }
        return;
      }

      if (isKeyValue) {
        // ── New format: "vendor:1,project:64,box:3" ────────────────────────
        const parsed: Record<string, string> = {};
        for (const part of parts) {
          const [key, value] = part.split(":").map((s) => s.trim());
          parsed[key] = value;
        }

        const scannedVendorId = Number(parsed["vendor"]);
        if (scannedVendorId !== resolvedVendorId) {
          showToast("error", "Barcode does not belong to your account");
          router.back();
          return;
        }

        // ── BOX-level IN / OUT ────────────────────────────────────────────
        if (resolvedScanType && parsed["box"] && parsed["project"]) {
          const scannedProjectId = Number(parsed["project"]);
          const scannedBoxId     = Number(parsed["box"]);
          const scannedVendId    = Number(parsed["vendor"]);

          if (resolvedProjectId && scannedProjectId !== resolvedProjectId) {
            showToast("error", "Box does not belong to this project");
            setScanned(false);
            return;
          }

          setProcessing(true);
          try {
            const res = await callDispatchApi(scannedBoxId, scannedProjectId, scannedVendId);
            showToast("success", res?.message ?? (resolvedScanType === "OUT" ? "Box marked as Factory Out" : "Box marked as Site In"));
          } catch (apiErr: any) {
            showToast("error", apiErr?.response?.data?.message ?? "Failed to update box");
            setScanned(false);
          } finally {
            setProcessing(false);
          }
          router.back();
          return;
        }

        // ── Normal QR navigation ──────────────────────────────────────────
        if (parsed["vendor"] && parsed["project"] && parsed["box"]) {
          router.replace({
            pathname: "/dashboards/boxItemsScreen",
            params: { payload: JSON.stringify({ vendor_id: Number(parsed["vendor"]), project_id: Number(parsed["project"]), id: Number(parsed["box"]) }) },
          });
          return;
        }

        if (parsed["vendor"] && parsed["project"] && !parsed["box"]) {
          router.replace({
            pathname: "/dashboards/boxes",
            params: { vendor_id: parsed["vendor"], id: parsed["project"] },
          });
          return;
        }

        throw new Error("Unrecognised key-value QR format");
      }

      // ── Legacy format ─────────────────────────────────────────────────────
      const scannedVendorId = Number(parts[0]);
      if (scannedVendorId !== resolvedVendorId) {
        showToast("error", "Barcode does not belong to your account");
        router.back();
        return;
      }

      if (parts.length === 3) {
        const [v_id, id, client_id] = parts;
        router.replace({ pathname: "/dashboards/boxes", params: { vendor_id: v_id, id, client_id } });
        return;
      }

      if (parts.length === 4) {
        const [v_id, project_id, client_id, id] = parts;
        router.replace({
          pathname: "/dashboards/boxItemsScreen",
          params: { payload: JSON.stringify({ vendor_id: Number(v_id), project_id: Number(project_id), client_id: Number(client_id), id: Number(id) }) },
        });
        return;
      }

      throw new Error("Invalid QR format");

    } catch (err) {
      //console.log("Failed to parse scanned data:", err);
      showToast("error", "Scan Failed — invalid QR code");
      router.back();
    }
  };

  // ── Permission screens ─────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="black" />
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconWrap}>
            <ScanLine size={48} color="white" />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionMessage}>
            We need camera access to scan barcodes and QR codes. Please allow camera permission to continue.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} activeOpacity={0.85}>
            <Text style={styles.permissionButtonText}>Allow Camera Access</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.permissionCancelBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.permissionCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (permission && !permission.granted) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="black" />
        <View style={styles.permissionContainer}>
          <View style={[styles.permissionIconWrap, { backgroundColor: "rgba(239,68,68,0.2)" }]}>
            <ScanLine size={48} color="#EF4444" />
          </View>
          <Text style={styles.permissionTitle}>Camera Permission Denied</Text>
          <Text style={styles.permissionMessage}>
            Camera access was denied. Please enable it in your device settings to use the scanner.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} activeOpacity={0.85}>
            <Text style={styles.permissionButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.permissionCancelBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.permissionCancelText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const scanLineTranslateY = scanLineAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, scanAreaSize - 4],
  });

  const headerTitle =
    resolvedScanType === "OUT"          ? "Mark Factory Out" :
    resolvedScanType === "IN"           ? "Mark Site In" :
    resolvedScanType === "ITEM_SITE_IN" ? "Scan Item" :
    "Scan Code";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />

      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={flashMode}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "ean13", "ean8", "code39", "code128", "upc_a", "upc_e", "codabar", "code93", "itf14", "datamatrix", "pdf417"],
        }}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <TouchableOpacity style={styles.flashButton} onPress={() => setFlashMode(!flashMode)} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          {flashMode ? <FlashlightOff size={28} color="white" /> : <Flashlight size={28} color="white" />}
        </TouchableOpacity>
      </View>

      {/* Scan overlay */}
      <View style={styles.overlay}>
        <View style={[styles.overlaySection, styles.topOverlay]} />
        <View style={styles.middleSection}>
          <View style={[styles.overlaySection, styles.sideOverlay]} />
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineTranslateY }] }]} />
          </View>
          <View style={[styles.overlaySection, styles.sideOverlay]} />
        </View>
        <View style={[styles.overlaySection, styles.bottomOverlay]} />
      </View>

      {/* Processing overlay */}
      {processing && (
        <View style={styles.processingOverlay}>
          <Text style={styles.processingText}>Processing...</Text>
        </View>
      )}

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Focus size={24} color="white" style={styles.focusIcon} />
        <Text style={styles.instructions}>
          {resolvedScanType === "OUT"          ? "Scan the box QR code to mark factory out" :
           resolvedScanType === "IN"           ? "Scan the box QR code to mark site in" :
           resolvedScanType === "ITEM_SITE_IN" ? "Scan each item QR to confirm receipt at site" :
           "Position the barcode or QR code within the frame"}
        </Text>
        <Text style={styles.subInstructions}>The scan will happen automatically</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  camera:    { flex: 1 },
  header: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: 30, paddingHorizontal: 20, paddingBottom: 25,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  closeButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.3)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "600" },
  flashButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.3)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center" },
  overlaySection: { backgroundColor: "rgba(0,0,0,0.6)" },
  topOverlay:    { width: "100%", height: (height - scanAreaSize) / 2 },
  bottomOverlay: { width: "100%", height: (height - scanAreaSize) / 2 },
  middleSection: { flexDirection: "row", width: "100%", height: scanAreaSize },
  sideOverlay:   { width: (width - scanAreaSize) / 2, height: "100%" },
  scanArea:      { width: scanAreaSize, height: scanAreaSize, position: "relative" },
  corner:        { position: "absolute", width: 30, height: 30, borderColor: "#007AFF", borderWidth: 4 },
  topLeft:       { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight:      { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft:    { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight:   { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanLine: { position: "absolute", left: 0, right: 0, height: 4, backgroundColor: "#007AFF", shadowColor: "#007AFF", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 5 },
  processingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", zIndex: 20 },
  processingText: { color: "white", fontSize: 18, fontWeight: "600" },
  instructionsContainer: { position: "absolute", bottom: 120, left: 0, right: 0, alignItems: "center", paddingHorizontal: 40 },
  focusIcon:       { marginBottom: 10 },
  instructions:    { color: "white", fontSize: 18, fontWeight: "500", textAlign: "center", marginBottom: 8 },
  subInstructions: { color: "rgba(255,255,255,0.7)", fontSize: 14, textAlign: "center" },
  permissionContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 36 },
  permissionIconWrap: { width: 96, height: 96, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", marginBottom: 28 },
  permissionTitle: { color: "white", fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 12 },
  permissionMessage: { color: "rgba(255,255,255,0.7)", fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 36 },
  permissionButton: { backgroundColor: "#007AFF", width: "100%", paddingVertical: 16, borderRadius: 16, alignItems: "center", marginBottom: 12 },
  permissionButtonText: { color: "white", fontSize: 16, fontWeight: "700" },
  permissionCancelBtn: { width: "100%", paddingVertical: 14, borderRadius: 16, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  permissionCancelText: { color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: "600" },
});
import { useToast } from "@/components/Notification/ToastProvider";
import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
import { playErrorFeedback, playSuccessFeedback, preloadFeedbackSounds, unloadFeedbackSounds } from "@/utils/soundVibration";

import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AlertTriangle, ArrowLeft, Camera, CheckCircle, Flashlight, FlashlightOff, Focus, ImagePlus, Keyboard, Send, X } from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSelector } from "react-redux";


const { width, height } = Dimensions.get("window");
const scanAreaSize = width * 0.7;

type ScanMode = "scan" | "defect";

interface MappedItemResponse {
  mappedItem: MappedItem;
}

interface MappedItem {
  id: number;
  sequence_no: number;
  cut_list_id: number;
  project_id: number;
  actual_in_at: string | null;
  machine_id: number;
  machine: { machine_name: string; id: number };
  cut_list: {
    unique_code: string;
    description: string;
    item_name: string;
  };
  project: {
    track_trace_status: string;
    project_name: string;
  };
}

interface Defect {
  id: number;
  defect_name: string;
}

interface ActiveDefectImage {
  id: number;
  doc_og_name: string;
  doc_sys_name: string;
  created_at: string;
  signed_url: string;
}

interface ActiveDefect {
  id: number;
  defect_id: number | null;
  remark: string | null;
  action: string | null;
  rework_machine_id: number | null;
  defect_status: string;
  created_at: string;
  defect: { id: number; defect_name: string } | null;
  images: ActiveDefectImage[];
}

const OTHER_DEFECT: Defect = { id: 0, defect_name: "Other" };

export default function TrackTraceBarcodeScanner() {
  const { machine_id, machine_name,project_id } = useLocalSearchParams<{ machine_id?: string; machine_name?: string;project_id?: string }>();

  // alert(machine_name)
  const [permission, requestPermission] = useCameraPermissions();
  const [flashMode, setFlashMode] = useState(false);
  const [scanned, setScanned] = useState(false);

  // ── Mode toggle ──────────────────────────────────────────────────────────
  const [scanMode, setScanMode] = useState<ScanMode>("scan");
  const toggleAnim = useRef(new Animated.Value(0)).current;

  // ── Manual entry ─────────────────────────────────────────────────────────
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const manualInputRef = useRef<TextInput>(null);

  // ── Item detail sheet (Scan Code mode) ───────────────────────────────────
  const [mappedItem, setMappedItem] = useState<MappedItem | null>(null);
  const [activeDefect, setActiveDefect] = useState<ActiveDefect | null>(null);
  const [showItemDetail, setShowItemDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Gallery viewer ────────────────────────────────────────────────────────
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // ── Completion photo popup (when defect is pending rework) ────────────────
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [completionPhotos, setCompletionPhotos] = useState<string[]>([]);
  const [completionLoading, setCompletionLoading] = useState(false);

  // ── Defect item sheet (Mark Defect mode) ─────────────────────────────────
  const [defectMappedItem, setDefectMappedItem] = useState<MappedItem | null>(null);
  const [showDefectItemDetail, setShowDefectItemDetail] = useState(false);
  const defectItemSlideAnim = useRef(new Animated.Value(height)).current;

  // ── Defect selection sheet (shared by both flows) ────────────────────────
  const [showDefectModal, setShowDefectModal] = useState(false);
  const [defectList, setDefectList] = useState<Defect[]>([]);
  const defectListRef = useRef<Defect[]>([]);
  const [defectListLoading, setDefectListLoading] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [otherDefectText, setOtherDefectText] = useState("");
  const [defectSearchQuery, setDefectSearchQuery] = useState("");
  const [submitDefectLoading, setSubmitDefectLoading] = useState(false);
  const [defectComment, setDefectComment] = useState("");
  const [defectPhotos, setDefectPhotos] = useState<string[]>([]);
  const [defectType, setDefectType] = useState<"rework" | "replace" | null>(null);
  const [reworkMachineId, setReworkMachineId] = useState<number | null>(null);

  const router = useRouter();
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  const [scanLinePos, setScanLinePos] = useState(0);
  const scanLineDir = useRef(1);
  const scanLineInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const manualSlideAnim = useRef(new Animated.Value(300)).current;
  const { showToast } = useToast();
  const { vendor_id } = useSelector((state: any) => state.auth.user);
  const user = useSelector((state: RootState) => state.auth.user);

  React.useEffect(() => {
    (async () => {
      await preloadFeedbackSounds();
    })();

    // scan line animation using interval
    const step = 2;
    scanLineInterval.current = setInterval(() => {
      setScanLinePos(prev => {
        const next = prev + scanLineDir.current * step;
        if (next >= scanAreaSize - 4) scanLineDir.current = -1;
        if (next <= 0) scanLineDir.current = 1;
        return next;
      });
    }, 8);

    return () => {
      unloadFeedbackSounds();
      if (scanLineInterval.current) clearInterval(scanLineInterval.current);
    };
  }, []);

  // ─── Mode toggle ──────────────────────────────────────────────────────────

  const switchMode = (mode: ScanMode) => {
    if (mode === scanMode) return;
    setScanMode(mode);
    setScanned(false);
    setManualCode("");
    Animated.spring(toggleAnim, {
      toValue: mode === "scan" ? 0 : 1,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
  };

  // ─── Manual entry helpers ─────────────────────────────────────────────────

  const openManualEntry = () => {
    setShowManualEntry(true);
  };

  const closeManualEntry = () => {
    setShowManualEntry(false);
    setManualCode("");
  };

  const handleManualSubmit = async () => {
    const code = manualCode.trim();
    if (!code) {
      showToast("error", "Please enter a code");
      return;
    }
    setManualLoading(true);
    try {
      let success = false;
      if (scanMode === "scan") {
        success = await handleQRScanned(code);
      } else {
        success = await handleDefectQRScanned(code);
      }
      // Only close the panel on success — keep it open so user can correct wrong codes
      if (success) {
        closeManualEntry();
      }
    } catch (err) {
      // error already shown inside handler
    } finally {
      setManualLoading(false);
    }
  };

  // ─── Shared helpers ───────────────────────────────────────────────────────

  const buildPayload = (scannedCode: string) => ({
    project_id: Number(project_id),
    vendor_id: Number(vendor_id),
    machine_id: Number(machine_id),
    unique_code: scannedCode,
    created_by: Number(user?.id),
  });

  const callScanItem = async (scannedCode: string) => {
    const res = await axios.post("/track-trace/scan/item", buildPayload(scannedCode));
    return res.data;
  };

  // ─── Item detail sheet helpers ─────────────────────────────────────────────

  const showItemDetailSheet = (data: any) => {
    const item: MappedItem = data?.mappedItem?.mappedItem ?? data?.mappedItem ?? data;
    const defect: ActiveDefect | null = data?.mappedItem?.activeDefect ?? data?.activeDefect ?? null;
    setMappedItem(item);
    setActiveDefect(defect);
    setShowItemDetail(true);
  };

  const hideItemDetailSheet = () => {
    setShowItemDetail(false);
    setMappedItem(null);
    setActiveDefect(null);
    setScanned(false);
  };

  // ─── Defect item detail sheet helpers ─────────────────────────────────────

  const showDefectItemDetailSheet = (item: MappedItem) => {
    setDefectMappedItem(item);
    setShowDefectItemDetail(true);
  };

  const hideDefectItemDetailSheet = () => {
    setShowDefectItemDetail(false);
    setDefectMappedItem(null);
    setScanned(false);
  };

  // ─── Defect selection sheet helpers ──────────────────────────────────────

  const fetchAndOpenDefectSheet = async (item: MappedItem) => {
    setDefectListLoading(true);
    try {
      const res = await axios.get(`/track-trace/defect-master/${vendor_id}`);
      const apiResponse = res.data;
      const fetched = (apiResponse.success && apiResponse.data?.defects) ? apiResponse.data.defects : [];
      defectListRef.current = fetched;
      setDefectList(fetched);
      setShowDefectModal(true);
    } catch (err: any) {
      showToast("error", err?.response?.data?.message || "Failed to load defects");
    } finally {
      setDefectListLoading(false);
    }
  };

  const closeDefectModal = () => {
    setShowDefectModal(false);
    setSelectedDefect(null);
    setOtherDefectText("");
    setDefectComment("");
    setDefectPhotos([]);
    setDefectType(null);
    setReworkMachineId(null);
    setDefectSearchQuery("");
  };

  // ─── Scan handlers ────────────────────────────────────────────────────────

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || showManualEntry) return;
    setScanned(true);
    try {
      if (scanMode === "scan") {
        await handleQRScanned(data);
      } else {
        await handleDefectQRScanned(data);
      }
    } catch (err) {
      showToast("error", "Scan Failed");
      setScanned(false);
    }
  };

  const handleQRScanned = async (scannedCode: string): Promise<boolean> => {
    try {
      const res = await axios.post("/track-trace/scan/check-item", buildPayload(scannedCode));
      const apiResponse = res.data;
      if (apiResponse.success) {
        if (apiResponse.message !== "") showToast("success", apiResponse.message);
        await playSuccessFeedback();
        if (apiResponse.data) {
          showItemDetailSheet(apiResponse.data);
        } else {
          setTimeout(() => setScanned(false), 1000);
        }
        return true;
      } else {
        showToast("error", apiResponse.message);
        await playErrorFeedback();
        setTimeout(() => setScanned(false), 1000);
        return false;
      }
    } catch (err: any) {
      await playErrorFeedback();
      showToast("error", err.response?.data?.message || err.message);
      setTimeout(() => setScanned(false), 1000);
      return false;
    }
  };

  const handleDefectQRScanned = async (scannedCode: string): Promise<boolean> => {
    try {
      const res = await axios.post("/track-trace/scan/check-defect", buildPayload(scannedCode));
      const apiResponse = res.data;
      if (apiResponse.success) {
        if (apiResponse.message !== "") showToast("success", apiResponse.message);
        await playSuccessFeedback();
        if (apiResponse.data) {
          // check-defect returns { mappedItem: {...} }
          const item: MappedItem = apiResponse.data?.mappedItem ?? apiResponse.data;
          showDefectItemDetailSheet(item);
        } else {
          setTimeout(() => setScanned(false), 1000);
        }
        return true;
      } else {
        showToast("error", apiResponse.message);
        await playErrorFeedback();
        setTimeout(() => setScanned(false), 1000);
        return false;
      }
    } catch (err: any) {
      await playErrorFeedback();
      showToast("error", err.response?.data?.message || err.message);
      setTimeout(() => setScanned(false), 1000);
      return false;
    }
  };

  // ─── Action handlers ──────────────────────────────────────────────────────

  const handleMarkCompleted = async () => {
    if (!mappedItem) return;

    // pending rework defect → show photo popup
    // pending replace defect OR no defect → call directly
    if (activeDefect && activeDefect.defect_status !== "Completed" && activeDefect.action !== "replace") {
      setCompletionPhotos([]);
      setShowCompletionPopup(true);
      return;
    }

    setActionLoading(true);
    try {
      const apiResponse = await callScanItem(mappedItem.cut_list.unique_code);
      if (apiResponse.success) {
        showToast("success", apiResponse.message);
        await playSuccessFeedback();
      } else {
        showToast("error", apiResponse.message);
        await playErrorFeedback();
      }
      hideItemDetailSheet();
    } catch (err: any) {
      showToast("error", err?.response?.data?.message || "Failed to mark completed");
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Completion photo handlers ─────────────────────────────────────────────

  const MAX_COMPLETION_PHOTOS = 10;

  const handleCompletionCapturePhoto = async () => {
    if (completionPhotos.length >= MAX_COMPLETION_PHOTOS) {
      showToast("error", `Maximum ${MAX_COMPLETION_PHOTOS} photos allowed`);
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showToast("error", "Camera permission is required");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: false,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setCompletionPhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  const handleCompletionPickPhoto = async () => {
    if (completionPhotos.length >= MAX_COMPLETION_PHOTOS) {
      showToast("error", `Maximum ${MAX_COMPLETION_PHOTOS} photos allowed`);
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showToast("error", "Gallery permission is required");
      return;
    }
    const remaining = MAX_COMPLETION_PHOTOS - completionPhotos.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map(a => a.uri);
      setCompletionPhotos(prev => [...prev, ...uris].slice(0, MAX_COMPLETION_PHOTOS));
    }
  };

  const handleCompletionRemovePhoto = (index: number) => {
    setCompletionPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitCompletion = async () => {
    if (!mappedItem) return;
    if (completionPhotos.length === 0) {
      showToast("error", "Please attach at least 1 photo");
      return;
    }
    setCompletionLoading(true);
    try {
      const formData = new FormData();
      formData.append("project_id", String(project_id));
      formData.append("vendor_id", String(vendor_id));
      formData.append("machine_id", String(machine_id));
      formData.append("unique_code", mappedItem.cut_list.unique_code);
      formData.append("created_by", String(user?.id ?? 0));

      completionPhotos.forEach((uri, index) => {
        const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
        const mime = ext === "png" ? "image/png" : "image/jpeg";
        formData.append("photos[]", {
          uri,
          name: `completion_photo_${index + 1}.${ext}`,
          type: mime,
        } as any);
      });

      const res = await axios.post("/track-trace/scan/item", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Accept": "application/json",
        },
        transformRequest: (data) => data,
      });

      const apiResponse = res.data;
      if (apiResponse.success) {
        showToast("success", apiResponse.message || "Marked completed successfully");
        await playSuccessFeedback();
        setShowCompletionPopup(false);
        setCompletionPhotos([]);
        hideItemDetailSheet();
      } else {
        showToast("error", apiResponse.message || "Failed to mark completed");
        await playErrorFeedback();
      }
    } catch (err: any) {
      showToast("error", err?.response?.data?.message || "Failed to mark completed");
    } finally {
      setCompletionLoading(false);
    }
  };

  const handleMarkDefectFromScanMode = async () => {
    if (!mappedItem) return;
    await fetchAndOpenDefectSheet(mappedItem);
  };

  const handleMarkDefectFromDefectMode = async () => {
    if (!defectMappedItem) return;
    await fetchAndOpenDefectSheet(defectMappedItem);
  };

  // ─── Photo handlers ───────────────────────────────────────────────────────

  const MAX_PHOTOS = 10;

  const handleCapturePhoto = async () => {
    if (defectPhotos.length >= MAX_PHOTOS) {
      showToast("error", `Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showToast("error", "Camera permission is required");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: false,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setDefectPhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  const handlePickPhoto = async () => {
    if (defectPhotos.length >= MAX_PHOTOS) {
      showToast("error", `Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showToast("error", "Gallery permission is required");
      return;
    }
    const remaining = MAX_PHOTOS - defectPhotos.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map(a => a.uri);
      setDefectPhotos(prev => [...prev, ...uris].slice(0, MAX_PHOTOS));
    }
  };

  const handleRemovePhoto = (index: number) => {
    setDefectPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitDefect = async () => {
    
    const activeItem = mappedItem ?? defectMappedItem;
    
    if (!activeItem || !selectedDefect) return;

    const isOther = selectedDefect.id === 0;
    if (isOther && otherDefectText.trim() === "") {
      showToast("error", "Please describe the defect");
      return;
    }

    if (!defectType) {
      showToast("error", "Please select Rework or Replace");
      return;
    }

    if (defectType === "rework" && !reworkMachineId) {
      showToast("error", "Please select a machine for rework");
      return;
    }

    if (defectPhotos.length === 0) {
      showToast("error", "Please attach at least 1 photo");
      return;
    }

    setSubmitDefectLoading(true);
    try {
      const formData = new FormData();
      formData.append("vendor_id", String(vendor_id));
      formData.append("project_id", String(activeItem.project_id));
      formData.append("cut_list_machine_mapping_id", String(activeItem.id));
      formData.append("cut_list_id", String(activeItem.cut_list_id));
      formData.append("machine_id", String(activeItem.machine.id));
      formData.append("unique_code", activeItem.cut_list.unique_code);
      formData.append("created_by", String(user?.id ?? 0));
      formData.append("defect_id", String(selectedDefect.id));
      formData.append("defect_name", isOther ? otherDefectText.trim() : defectComment.trim());
      formData.append("comment", isOther ? "" : defectComment.trim());
      formData.append("defect_type", defectType);
      if (defectType === "rework" && reworkMachineId) {
        formData.append("rework_machine_id", String(reworkMachineId));
      }

      defectPhotos.forEach((uri, index) => {
        const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
        const mime = ext === "png" ? "image/png" : "image/jpeg";
        formData.append("photos[]", {
          uri,
          name: `defect_photo_${index + 1}.${ext}`,
          type: mime,
        } as any);
      });

      const res = await axios.post("/track-trace/mark-defect", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Accept": "application/json",
        },
        transformRequest: (data) => data,
      });

      const apiResponse = res.data;

      if (apiResponse.success) {
        showToast("success", apiResponse.message || "Defect marked successfully");
        await playErrorFeedback();
        closeDefectModal();
        if (scanMode === "scan") {
          hideItemDetailSheet();
        } else {
          hideDefectItemDetailSheet();
        }
      } else {
        closeDefectModal();
        hideDefectItemDetailSheet();
        showToast("error", apiResponse.message || "Failed to mark defect");

        await playErrorFeedback();
      }
    } catch (err: any) {
      showToast("error", err?.response?.data?.message || "Failed to mark defect");
    } finally {
      setSubmitDefectLoading(false);
    }
  };

  // ─── Guard ────────────────────────────────────────────────────────────────

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={{ color: "white", fontSize: 18, textAlign: "center", padding: 20 }}>
          Requesting camera permission...
        </Text>
      </View>
    );
  }

  const allDefects = [...defectListRef.current, OTHER_DEFECT].filter(d =>
    d.defect_name.toLowerCase().includes(defectSearchQuery.toLowerCase())
  );

  const isDefectMode = scanMode === "defect";

  const pillLeft = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, (width * 0.7) / 2],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />

      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={flashMode}
        onBarcodeScanned={scanned || showManualEntry ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: [
            "qr", "ean13", "ean8", "code39", "code128",
            "upc_a", "upc_e", "codabar", "code93",
            "itf14", "datamatrix", "pdf417",
          ],
        }}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={28} color="white" />
          </TouchableOpacity>

          {/* Mode Toggle */}
          <View style={styles.toggleContainer}>
            <View style={[styles.togglePill, {
              left: isDefectMode ? (width * 0.7) / 2 : 2,
              width: (width * 0.7) / 2 - 2,
              backgroundColor: isDefectMode ? "#E63946" : "#007AFF",
            }]} />
            <TouchableOpacity style={styles.toggleOption} onPress={() => switchMode("scan")} activeOpacity={0.8}>
              <Text style={[styles.toggleText, !isDefectMode && styles.toggleTextActive]}>Scan Code</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toggleOption} onPress={() => switchMode("defect")} activeOpacity={0.8}>
              <Text style={[styles.toggleText, isDefectMode && styles.toggleTextActive]}>Mark Defect</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.flashButton}
            onPress={() => setFlashMode(!flashMode)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {flashMode ? <FlashlightOff size={28} color="white" /> : <Flashlight size={28} color="white" />}
          </TouchableOpacity>
        </View>

        {/* Machine name chip */}
        {machine_name ? (
          <View style={styles.machineChip}>
            <Text style={styles.machineChipIcon}>🔧</Text>
            <Text style={styles.machineChipText} numberOfLines={1}>{machine_name}</Text>
          </View>
        ) : null}
      </View>

      {/* Scan Area Overlay */}
      <View style={styles.overlay}>
        <View style={[styles.overlaySection, styles.topOverlay]} />
        <View style={styles.middleSection}>
          <View style={[styles.overlaySection, styles.sideOverlay]} />
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft, isDefectMode && styles.cornerDefect]} />
            <View style={[styles.corner, styles.topRight, isDefectMode && styles.cornerDefect]} />
            <View style={[styles.corner, styles.bottomLeft, isDefectMode && styles.cornerDefect]} />
            <View style={[styles.corner, styles.bottomRight, isDefectMode && styles.cornerDefect]} />
            <View style={[
              styles.scanLine,
              { top: scanLinePos },
              isDefectMode && styles.scanLineDefect,
            ]} />
          </View>
          <View style={[styles.overlaySection, styles.sideOverlay]} />
        </View>
        <View style={[styles.overlaySection, styles.bottomOverlay]} />
      </View>

      {/* Instructions + Manual Entry Button */}
      <View style={styles.instructionsContainer}>
        <Focus size={24} color={isDefectMode ? "#E63946" : "white"} style={styles.focusIcon} />
        <Text style={styles.instructions}>
          {isDefectMode ? "Scan item to mark a defect" : "Position the barcode or QR code within the frame"}
        </Text>
        <Text style={styles.subInstructions}>The scan will happen automatically</Text>

        {/* Manual entry trigger */}
        <TouchableOpacity
          style={[styles.manualEntryTrigger, isDefectMode && styles.manualEntryTriggerDefect]}
          onPress={openManualEntry}
          activeOpacity={0.8}
        >
          <Keyboard size={16} color={isDefectMode ? "#E63946" : "#007AFF"} />
          <Text style={[styles.manualEntryTriggerText, isDefectMode && styles.manualEntryTriggerTextDefect]}>
            Enter code manually
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Manual Entry Panel (slides up from bottom) ── */}
      {showManualEntry && (
        <Modal transparent animationType="slide" visible={showManualEntry} onRequestClose={closeManualEntry}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1, justifyContent: "flex-end" }}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={closeManualEntry}
            >
              <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} />
            </TouchableOpacity>

            <View style={[styles.manualPanel, isDefectMode && styles.manualPanelDefect]}>
              <View style={styles.sheetHandle} />

              <View style={styles.manualPanelHeader}>
                <View style={[styles.manualPanelIconBg, isDefectMode && styles.manualPanelIconBgDefect]}>
                  <Keyboard size={20} color={isDefectMode ? "#E63946" : "#007AFF"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.manualPanelTitle}>Manual Entry</Text>
                  <Text style={styles.manualPanelSubtitle}>
                    {isDefectMode ? "Enter code to mark as defect" : "Enter barcode or QR code value"}
                  </Text>
                </View>
                <TouchableOpacity onPress={closeManualEntry} style={styles.manualCloseBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.manualInputRow}>
                <TextInput
                  ref={manualInputRef}
                  style={[styles.manualInput, isDefectMode && styles.manualInputDefect]}
                  placeholder="e.g. Facia_645_1"
                  placeholderTextColor="#9CA3AF"
                  value={manualCode}
                  onChangeText={setManualCode}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleManualSubmit}
                  autoFocus
                />
                <TouchableOpacity
                  style={[
                    styles.manualSubmitBtn,
                    isDefectMode && styles.manualSubmitBtnDefect,
                    (!manualCode.trim() || manualLoading) && styles.manualSubmitBtnDisabled,
                  ]}
                  onPress={handleManualSubmit}
                  activeOpacity={0.85}
                  disabled={!manualCode.trim() || manualLoading}
                >
                  {manualLoading
                    ? <ActivityIndicator size="small" color="white" />
                    : <Send size={18} color="white" />
                  }
                </TouchableOpacity>
              </View>

              <Text style={styles.manualHint}>
                💡 Type the exact barcode or QR code value and tap send
              </Text>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════
          SCAN CODE MODE — Item Detail Modal
      ══════════════════════════════════════════════════════════════ */}
      {showItemDetail && mappedItem && (
        <Modal transparent animationType="slide" visible={showItemDetail} onRequestClose={showDefectModal ? closeDefectModal : hideItemDetailSheet}>
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={showDefectModal ? closeDefectModal : hideItemDetailSheet}
            >
              <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} />
            </TouchableOpacity>

            <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={hideItemDetailSheet} style={styles.sheetBackBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <ArrowLeft size={22} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>Item Details</Text>
              <View style={{ width: 36 }} />
            </View>

            <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent} showsVerticalScrollIndicator={false}>
              <ItemCard item={mappedItem} />

              {/* ── Active defect images ── */}
              {activeDefect && activeDefect.images.length > 0 && (
                <View style={styles.defectImageSection}>
                  <View style={styles.defectImageSectionHeader}>
                    <View style={styles.defectImageSectionBadge}>
                      <Text style={styles.defectImageSectionBadgeText}>⚠️ Defect Reported</Text>
                    </View>
                    <Text style={styles.defectImageSectionMeta}>
                      {activeDefect.defect?.defect_name ?? activeDefect.remark ?? "Unknown defect"}
                      {activeDefect.action ? ` · ${activeDefect.action.charAt(0).toUpperCase() + activeDefect.action.slice(1)}` : ""}
                    </Text>
                  </View>
                  {/* Remark */}
{activeDefect.remark && (
  <Text style={styles.defectImageSectionRemark}>
    💬 {activeDefect.remark}
  </Text>
)}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.defectImageGrid}
                  >
                    {activeDefect.images.map((img, idx) => (
                      <TouchableOpacity
                        key={img.id}
                        onPress={() => { setGalleryIndex(idx); setGalleryVisible(true); }}
                        activeOpacity={0.85}
                        style={styles.defectImageThumbWrapper}
                      >
                        <Image source={{ uri: img.signed_url }} style={styles.defectImageThumb} resizeMode="cover" />
                        <View style={styles.defectImageIndexBadge}>
                          <Text style={styles.defectImageIndexText}>{idx + 1}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.markLabel}>MARK STATUS</Text>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnComplete]}
                onPress={handleMarkCompleted}
                activeOpacity={0.85}
                disabled={actionLoading || defectListLoading}
              >
                <CheckCircle size={20} color="white" />
                <Text style={styles.actionBtnText}>{actionLoading ? "Saving..." : "Mark Completed"}</Text>
              </TouchableOpacity>

              {/* <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDefect, (actionLoading || defectListLoading) && styles.actionBtnDisabled]}
                onPress={handleMarkDefectFromScanMode}
                activeOpacity={0.85}
                disabled={actionLoading || defectListLoading}
              >
                {defectListLoading ? <ActivityIndicator size="small" color="white" /> : <AlertTriangle size={20} color="white" />}
                <Text style={styles.actionBtnText}>{defectListLoading ? "Loading..." : "Mark as Defect"}</Text>
              </TouchableOpacity> */}
              <View style={{ height: 32 }} />
            </ScrollView>

            {showDefectModal && (
              <DefectSheet
                allDefects={allDefects}
                selectedDefect={selectedDefect}
                setSelectedDefect={setSelectedDefect}
                otherDefectText={otherDefectText}
                setOtherDefectText={setOtherDefectText}
                defectComment={defectComment}
                setDefectComment={setDefectComment}
                defectSearchQuery={defectSearchQuery}
                setDefectSearchQuery={setDefectSearchQuery}
                defectPhotos={defectPhotos}
                onCapturePhoto={handleCapturePhoto}
                onPickPhoto={handlePickPhoto}
                onRemovePhoto={handleRemovePhoto}
                defectType={defectType}
                setDefectType={setDefectType}
                reworkMachineId={reworkMachineId}
                setReworkMachineId={setReworkMachineId}
                vendorId={Number(vendor_id)}
                machineId={mappedItem?.machine?.id ?? 0}
                submitDefectLoading={submitDefectLoading}
                onClose={closeDefectModal}
                onSubmit={handleSubmitDefect}
              />
            )}

            {/* ── Completion photo popup (rework defects only) ── */}
            {showCompletionPopup && (
              <CompletionPhotoPopup
                photos={completionPhotos}
                onCapture={handleCompletionCapturePhoto}
                onPick={handleCompletionPickPhoto}
                onRemove={handleCompletionRemovePhoto}
                loading={completionLoading}
                onClose={() => { setShowCompletionPopup(false); setCompletionPhotos([]); }}
                onSubmit={handleSubmitCompletion}
              />
            )}

            {/* ── Gallery viewer ── */}
            {galleryVisible && activeDefect && activeDefect.images.length > 0 && (
              <Modal transparent animationType="fade" visible={galleryVisible} onRequestClose={() => setGalleryVisible(false)}>
                <View style={styles.galleryOverlay}>
                  <TouchableOpacity style={styles.galleryClose} onPress={() => setGalleryVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <X size={24} color="white" />
                  </TouchableOpacity>
                  <Text style={styles.galleryCounter}>{galleryIndex + 1} / {activeDefect.images.length}</Text>

                  <Image
                    source={{ uri: activeDefect.images[galleryIndex].signed_url }}
                    style={styles.galleryImage}
                    resizeMode="contain"
                  />

                  {/* Previous */}
                  {galleryIndex > 0 && (
                    <TouchableOpacity
                      style={[styles.galleryNavBtn, styles.galleryNavLeft]}
                      onPress={() => setGalleryIndex(i => i - 1)}
                      activeOpacity={0.8}
                    >
                      <ArrowLeft size={22} color="white" />
                    </TouchableOpacity>
                  )}

                  {/* Next */}
                  {galleryIndex < activeDefect.images.length - 1 && (
                    <TouchableOpacity
                      style={[styles.galleryNavBtn, styles.galleryNavRight]}
                      onPress={() => setGalleryIndex(i => i + 1)}
                      activeOpacity={0.8}
                    >
                      <ArrowLeft size={22} color="white" style={{ transform: [{ scaleX: -1 }] }} />
                    </TouchableOpacity>
                  )}

                  {/* Thumbnail strip */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.galleryStrip}
                    style={styles.galleryStripWrapper}
                  >
                    {activeDefect.images.map((img, idx) => (
                      <TouchableOpacity key={img.id} onPress={() => setGalleryIndex(idx)} activeOpacity={0.8}>
                        <Image
                          source={{ uri: img.signed_url }}
                          style={[styles.galleryStripThumb, idx === galleryIndex && styles.galleryStripThumbActive]}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </Modal>
            )}
          </View>
          </View>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MARK DEFECT MODE — Defect Item Detail Modal
      ══════════════════════════════════════════════════════════════ */}
      {showDefectItemDetail && defectMappedItem && (
        <Modal transparent animationType="slide" visible={showDefectItemDetail} onRequestClose={showDefectModal ? closeDefectModal : hideDefectItemDetailSheet}>
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={showDefectModal ? closeDefectModal : hideDefectItemDetailSheet}
            >
              <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} />
            </TouchableOpacity>

            <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={hideDefectItemDetailSheet} style={styles.sheetBackBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <ArrowLeft size={22} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>Item Details</Text>
              <View style={{ width: 36 }} />
            </View>

            <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent} showsVerticalScrollIndicator={false}>
              <ItemCard item={defectMappedItem} />

              <Text style={styles.markLabel}>MARK DEFECT</Text>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDefect, defectListLoading && styles.actionBtnDisabled]}
                onPress={handleMarkDefectFromDefectMode}
                activeOpacity={0.85}
                disabled={defectListLoading}
              >
                {defectListLoading ? <ActivityIndicator size="small" color="white" /> : <AlertTriangle size={20} color="white" />}
                <Text style={styles.actionBtnText}>{defectListLoading ? "Loading..." : "Mark as Defect"}</Text>
              </TouchableOpacity>
              <View style={{ height: 32 }} />
            </ScrollView>

            {showDefectModal && (
              <DefectSheet
                allDefects={allDefects}
                selectedDefect={selectedDefect}
                setSelectedDefect={setSelectedDefect}
                otherDefectText={otherDefectText}
                setOtherDefectText={setOtherDefectText}
                defectComment={defectComment}
                setDefectComment={setDefectComment}
                defectSearchQuery={defectSearchQuery}
                setDefectSearchQuery={setDefectSearchQuery}
                defectPhotos={defectPhotos}
                onCapturePhoto={handleCapturePhoto}
                onPickPhoto={handlePickPhoto}
                onRemovePhoto={handleRemovePhoto}
                defectType={defectType}
                setDefectType={setDefectType}
                reworkMachineId={reworkMachineId}
                setReworkMachineId={setReworkMachineId}
                vendorId={Number(vendor_id)}
                machineId={defectMappedItem?.machine?.id ?? 0}
                submitDefectLoading={submitDefectLoading}
                onClose={closeDefectModal}
                onSubmit={handleSubmitDefect}
              />
            )}
          </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ─── Completion Photo Popup ───────────────────────────────────────────────────

interface CompletionPhotoPopupProps {
  photos: string[];
  onCapture: () => void;
  onPick: () => void;
  onRemove: (index: number) => void;
  loading: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

function CompletionPhotoPopup({
  photos, onCapture, onPick, onRemove, loading, onClose, onSubmit,
}: CompletionPhotoPopupProps) {
  const MAX_PHOTOS = 10;
  const canAddMore = photos.length < MAX_PHOTOS;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.popupOverlay}
      >
        <TouchableOpacity style={styles.popupBackdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.popupCard}>
          {/* Header */}
          <View style={styles.popupHeader}>
            <TouchableOpacity onPress={onClose} style={styles.popupBackBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color="#374151" />
            </TouchableOpacity>
            <View style={styles.popupHeaderCenter}>
              <Text style={styles.popupTitle}>Completion Photos</Text>
              <Text style={styles.popupSubtitle}>Upload photos to complete this item</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={styles.popupScroll}
            contentContainerStyle={styles.popupScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Info banner */}
            <View style={styles.completionInfoBanner}>
              <Text style={styles.completionInfoText}>
                📋 This item has a pending rework defect. Please upload photos confirming the fix before marking as completed.
              </Text>
            </View>

            {/* Photos */}
            <View style={styles.popupSection}>
              <View style={styles.popupSectionRow}>
                <Text style={styles.popupSectionLabel}>
                  📷 Photos <Text style={styles.popupRequired}>*required</Text>
                </Text>
                <Text style={styles.popupPhotoCount}>{photos.length}/{MAX_PHOTOS}</Text>
              </View>

              {canAddMore && (
                <View style={styles.photoButtonsRow}>
                  <TouchableOpacity
                    style={[styles.photoBtn, { borderColor: "#2A9D8F", backgroundColor: "#F0FDF4" }]}
                    onPress={onCapture}
                    activeOpacity={0.8}
                  >
                    <Camera size={18} color="#2A9D8F" />
                    <Text style={[styles.photoBtnText, { color: "#2A9D8F" }]}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.photoBtn, { borderColor: "#2A9D8F", backgroundColor: "#F0FDF4" }]}
                    onPress={onPick}
                    activeOpacity={0.8}
                  >
                    <ImagePlus size={18} color="#2A9D8F" />
                    <Text style={[styles.photoBtnText, { color: "#2A9D8F" }]}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}

              {photos.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photoGrid}
                  keyboardShouldPersistTaps="handled"
                  style={{ marginTop: 10 }}
                >
                  {photos.map((uri, index) => (
                    <View key={`${uri}-${index}`} style={styles.photoThumbWrapper}>
                      <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                      <TouchableOpacity
                        style={[styles.photoRemoveBtn, { backgroundColor: "#2A9D8F" }]}
                        onPress={() => onRemove(index)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <X size={12} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.photoEmptyHint}>
                  <Text style={styles.photoEmptyText}>At least 1 photo is required</Text>
                </View>
              )}
            </View>

            <View style={{ height: 8 }} />
          </ScrollView>

          {/* Submit */}
          <View style={styles.popupFooter}>
            <TouchableOpacity
              style={[styles.completionSubmitBtn, (photos.length === 0 || loading) && styles.defectSubmitBtnDisabled]}
              onPress={onSubmit}
              activeOpacity={0.85}
              disabled={photos.length === 0 || loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="white" />
                : <CheckCircle size={18} color="white" />
              }
              <Text style={styles.defectSubmitText}>
                {loading ? "Submitting..." : "Mark Completed"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Reusable ItemCard ────────────────────────────────────────────────────────

function ItemCard({ item }: { item: MappedItem }) {
  return (
    <View style={styles.itemCard}>
      <Text style={styles.itemName} numberOfLines={2}>{item.cut_list.item_name}</Text>
      <Text style={styles.itemCode}>{item.cut_list.unique_code}</Text>
      <View style={styles.divider} />
      {[
        { icon: "🏗️", label: "Project", value: item.project.project_name },
        { icon: "🔧", label: "Machine", value: item.machine.machine_name },
        { icon: "📋", label: "Description", value: item.cut_list.description },
        { icon: "🆔", label: "Item ID", value: String(item.id) },
        { icon: "📅", label: "Time", value: new Date().toLocaleTimeString() },
      ].map((row, i, arr) => (
        <View key={row.label} style={[styles.detailRow, i < arr.length - 1 && styles.detailRowBorder]}>
          <View style={styles.detailRowLeft}>
            <Text style={styles.detailRowIcon}>{row.icon}</Text>
            <Text style={styles.detailRowLabel}>{row.label}</Text>
          </View>
          <Text style={styles.detailRowValue} numberOfLines={1}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Reusable DefectSheet ─────────────────────────────────────────────────────

interface DefectSheetProps {
  allDefects: Defect[];
  selectedDefect: Defect | null;
  setSelectedDefect: (d: Defect) => void;
  otherDefectText: string;
  setOtherDefectText: (t: string) => void;
  defectComment: string;
  setDefectComment: (t: string) => void;
  defectSearchQuery: string;
  setDefectSearchQuery: (q: string) => void;
  defectPhotos: string[];
  onCapturePhoto: () => void;
  onPickPhoto: () => void;
  onRemovePhoto: (index: number) => void;
  defectType: "rework" | "replace" | null;
  setDefectType: (t: "rework" | "replace" | null) => void;
  reworkMachineId: number | null;
  setReworkMachineId: (id: number | null) => void;
  vendorId: number;
  machineId: number;
  submitDefectLoading: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

function DefectSheet({
  allDefects, selectedDefect, setSelectedDefect,
  otherDefectText, setOtherDefectText,
  defectComment, setDefectComment,
  defectSearchQuery, setDefectSearchQuery,
  defectPhotos, onCapturePhoto, onPickPhoto, onRemovePhoto,
  defectType, setDefectType, reworkMachineId, setReworkMachineId,
  vendorId, machineId,
  submitDefectLoading, onClose, onSubmit,
}: DefectSheetProps) {
  const [showDetailPopup, setShowDetailPopup] = useState(false);

  const isOther = selectedDefect?.id === 0;
  const canSubmit =
    !!selectedDefect &&
    (!isOther || otherDefectText.trim().length > 0) &&
    defectPhotos.length > 0 &&
    defectType !== null &&
    (defectType !== "rework" || reworkMachineId !== null);

  const handleDefectPress = (defect: Defect) => {
    setSelectedDefect(defect);
    if (defect.id !== 0) setOtherDefectText("");
    setShowDetailPopup(true);
  };

  return (
    <View style={styles.defectOverlay}>
      <TouchableOpacity style={styles.defectBackdrop} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.defectSheetContainer}>
        <View style={styles.defectSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={onClose} style={styles.sheetBackBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <ArrowLeft size={20} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>Select Defect</Text>
            <View style={{ width: 36 }} />
          </View>

          <Text style={styles.defectSubtitle}>Choose the defect type for this item</Text>

          <View style={styles.defectSearchWrapper}>
            <Text style={styles.defectSearchIcon}>🔍</Text>
            <TextInput
              style={styles.defectSearchInput}
              placeholder="Search defects..."
              placeholderTextColor="#9CA3AF"
              value={defectSearchQuery}
              onChangeText={setDefectSearchQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {defectSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setDefectSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.defectSearchClear}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={styles.defectScroll}
            contentContainerStyle={styles.defectScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {allDefects.map((defect) => {
              const isSelected = selectedDefect?.id === defect.id;
              const isOther = defect.id === 0;
              return (
                <TouchableOpacity
                  key={String(defect.id)}
                  style={[styles.defectRow, isSelected && styles.defectRowSelected]}
                  onPress={() => handleDefectPress(defect)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.defectRadio, isSelected && styles.defectRadioSelected]}>
                    {isSelected && <View style={styles.defectRadioDot} />}
                  </View>
                  <Text style={[styles.defectRowText, isSelected && styles.defectRowTextSelected]}>
                    {defect.defect_name}
                  </Text>
                  {isOther && (
                    <View style={styles.otherBadge}>
                      <Text style={styles.otherBadgeText}>Custom</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {allDefects.length === 0 && (
              <View style={styles.defectNoResults}>
                <Text style={styles.defectNoResultsText}>No defects match "{defectSearchQuery}"</Text>
              </View>
            )}
            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {showDetailPopup && selectedDefect && (
        <DefectDetailPopup
          defect={selectedDefect}
          otherDefectText={otherDefectText}
          setOtherDefectText={setOtherDefectText}
          defectComment={defectComment}
          setDefectComment={setDefectComment}
          defectPhotos={defectPhotos}
          onCapturePhoto={onCapturePhoto}
          onPickPhoto={onPickPhoto}
          onRemovePhoto={onRemovePhoto}
          defectType={defectType}
          setDefectType={setDefectType}
          reworkMachineId={reworkMachineId}
          setReworkMachineId={setReworkMachineId}
          vendorId={vendorId}
          machineId={machineId}
          canSubmit={canSubmit}
          submitDefectLoading={submitDefectLoading}
          onBack={() => {
            setShowDetailPopup(false);
            setSelectedDefect(null);
            setOtherDefectText("");
            setDefectComment("");
            setDefectType(null);
            setReworkMachineId(null);
          }}
          onSubmit={onSubmit}
        />
      )}
    </View>
  );
}

// ─── Defect Detail Popup ──────────────────────────────────────────────────────

interface ReworkMachine {
  id: number;
  machine_name: string;
}

interface DefectDetailPopupProps {
  defect: Defect;
  otherDefectText: string;
  setOtherDefectText: (t: string) => void;
  defectComment: string;
  setDefectComment: (t: string) => void;
  defectPhotos: string[];
  onCapturePhoto: () => void;
  onPickPhoto: () => void;
  onRemovePhoto: (index: number) => void;
  defectType: "rework" | "replace" | null;
  setDefectType: (t: "rework" | "replace" | null) => void;
  reworkMachineId: number | null;
  setReworkMachineId: (id: number | null) => void;
  vendorId: number;
  machineId: number;
  canSubmit: boolean;
  submitDefectLoading: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

function DefectDetailPopup({
  defect, otherDefectText, setOtherDefectText,
  defectComment, setDefectComment,
  defectPhotos, onCapturePhoto, onPickPhoto, onRemovePhoto,
  defectType, setDefectType, reworkMachineId, setReworkMachineId,
  vendorId, machineId,
  canSubmit, submitDefectLoading, onBack, onSubmit,
}: DefectDetailPopupProps) {
  const MAX_PHOTOS = 10;
  const isOther = defect.id === 0;
  const canAddMore = defectPhotos.length < MAX_PHOTOS;

  const [machines, setMachines] = useState<ReworkMachine[]>([]);
  const [machinesLoading, setMachinesLoading] = useState(false);

  React.useEffect(() => {
    if (defectType !== "rework") return;
    setMachinesLoading(true);
    axios.get(`/track-trace/rework-machines/${vendorId}/${machineId}`)
      .then(res => {
        const d = res.data;
        if (d.success) setMachines(d.data?.serviceResponse ?? d.data ?? []);
      })
      .catch(() => { })
      .finally(() => setMachinesLoading(false));
  }, [defectType]);

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onBack}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.popupOverlay}
      >
        <TouchableOpacity style={styles.popupBackdrop} activeOpacity={1} onPress={onBack} />

        <View style={styles.popupCard}>
          {/* Header */}
          <View style={styles.popupHeader}>
            <TouchableOpacity onPress={onBack} style={styles.popupBackBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <ArrowLeft size={20} color="#374151" />
            </TouchableOpacity>
            <View style={styles.popupHeaderCenter}>
              <Text style={styles.popupTitle} numberOfLines={1}>{defect.defect_name}</Text>
              <Text style={styles.popupSubtitle}>Add details for this defect</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={styles.popupScroll}
            contentContainerStyle={styles.popupScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Other — required description */}
            {isOther && (
              <View style={styles.popupSection}>
                <Text style={styles.popupSectionLabel}>
                  📝 Description <Text style={styles.popupRequired}>*required</Text>
                </Text>
                <View style={styles.popupInputBox}>
                  <TextInput
                    style={styles.popupTextInput}
                    placeholder="Describe the defect..."
                    placeholderTextColor="#9CA3AF"
                    value={otherDefectText}
                    onChangeText={setOtherDefectText}
                    multiline
                    autoFocus
                    maxLength={200}
                  />
                  <Text style={styles.popupCharCount}>{otherDefectText.length}/200</Text>
                </View>
              </View>
            )}

            {/* Comment — optional for non-Other */}
            {!isOther && (
              <View style={styles.popupSection}>
                <Text style={styles.popupSectionLabel}>
                  💬 Comment <Text style={styles.popupOptional}>(optional)</Text>
                </Text>
                <View style={styles.popupInputBox}>
                  <TextInput
                    style={styles.popupTextInput}
                    placeholder="Add a comment..."
                    placeholderTextColor="#9CA3AF"
                    value={defectComment}
                    onChangeText={setDefectComment}
                    multiline
                    maxLength={200}
                  />
                  <Text style={styles.popupCharCount}>{defectComment.length}/200</Text>
                </View>
              </View>
            )}

            {/* Rework / Replace toggle */}
            <View style={styles.popupSection}>
              <Text style={styles.popupSectionLabel}>
                🔁 Action <Text style={styles.popupRequired}>*required</Text>
              </Text>
              <View style={styles.actionToggleRow}>
                <TouchableOpacity
                  style={[styles.actionToggleBtn, defectType === "rework" && styles.actionToggleBtnActive]}
                  onPress={() => { setDefectType("rework"); setReworkMachineId(null); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.actionToggleBtnText, defectType === "rework" && styles.actionToggleBtnTextActive]}>
                    🔧 Rework
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionToggleBtn, defectType === "replace" && styles.actionToggleBtnActive]}
                  onPress={() => { setDefectType("replace"); setReworkMachineId(null); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.actionToggleBtnText, defectType === "replace" && styles.actionToggleBtnTextActive]}>
                    🔄 Replace
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Machine list — only for Rework */}
            {defectType === "rework" && (
              <View style={styles.popupSection}>
                <Text style={styles.popupSectionLabel}>
                  🏭 Rework Machine <Text style={styles.popupRequired}>*required</Text>
                </Text>
                {machinesLoading ? (
                  <View style={styles.machineLoadingBox}>
                    <ActivityIndicator size="small" color="#E63946" />
                    <Text style={styles.machineLoadingText}>Loading machines...</Text>
                  </View>
                ) : machines.length === 0 ? (
                  <View style={styles.machineLoadingBox}>
                    <Text style={styles.machineLoadingText}>No machines available</Text>
                  </View>
                ) : (
                  <ScrollView
                    style={styles.machineListBox}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                  >
                    {machines.map((m) => {
                      const isSelected = reworkMachineId === m.id;
                      return (
                        <TouchableOpacity
                          key={m.id}
                          style={[styles.machineRow, isSelected && styles.machineRowSelected]}
                          onPress={() => setReworkMachineId(m.id)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.machineRadio, isSelected && styles.machineRadioSelected]}>
                            {isSelected && <View style={styles.machineRadioDot} />}
                          </View>
                          <Text style={[styles.machineRowText, isSelected && styles.machineRowTextSelected]}>
                            {m.machine_name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}

            {/* Photos — required */}
            <View style={styles.popupSection}>
              <View style={styles.popupSectionRow}>
                <Text style={styles.popupSectionLabel}>
                  📷 Photos <Text style={styles.popupRequired}>*required</Text>
                </Text>
                <Text style={styles.popupPhotoCount}>{defectPhotos.length}/{MAX_PHOTOS}</Text>
              </View>

              {canAddMore && (
                <View style={styles.photoButtonsRow}>
                  <TouchableOpacity style={styles.photoBtn} onPress={onCapturePhoto} activeOpacity={0.8}>
                    <Camera size={18} color="#E63946" />
                    <Text style={styles.photoBtnText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoBtn} onPress={onPickPhoto} activeOpacity={0.8}>
                    <ImagePlus size={18} color="#E63946" />
                    <Text style={styles.photoBtnText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}

              {defectPhotos.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photoGrid}
                  keyboardShouldPersistTaps="handled"
                  style={{ marginTop: 10 }}
                >
                  {defectPhotos.map((uri, index) => (
                    <View key={`${uri}-${index}`} style={styles.photoThumbWrapper}>
                      <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                      <TouchableOpacity
                        style={styles.photoRemoveBtn}
                        onPress={() => onRemovePhoto(index)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <X size={12} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.photoEmptyHint}>
                  <Text style={styles.photoEmptyText}>At least 1 photo is required</Text>
                </View>
              )}
            </View>

            <View style={{ height: 8 }} />
          </ScrollView>

          {/* Submit */}
          <View style={styles.popupFooter}>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                paddingVertical: 16,
                borderRadius: 16,
                backgroundColor: canSubmit && !submitDefectLoading ? "#E63946" : "#D1D5DB",
                shadowColor: canSubmit && !submitDefectLoading ? "#E63946" : "transparent",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: canSubmit && !submitDefectLoading ? 0.3 : 0,
                shadowRadius: 8,
                elevation: canSubmit && !submitDefectLoading ? 5 : 0,
              }}
              onPress={onSubmit}
              activeOpacity={0.85}
              disabled={!canSubmit || submitDefectLoading}
            >
              {submitDefectLoading
                ? <ActivityIndicator size="small" color="white" />
                : <Send size={18} color={canSubmit ? "white" : "#9CA3AF"} />
              }
              <Text style={[styles.defectSubmitText, { color: canSubmit && !submitDefectLoading ? "white" : "#9CA3AF" }]}>
                {submitDefectLoading ? "Submitting..." : "Submit Defect"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  camera: { flex: 1 },

  // Header
  header: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: "column",
    paddingTop: 30, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    gap: 10,
  },
  headerTopRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  machineChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20,
  },
  machineChipIcon: { fontSize: 13 },
  machineChipText: {
    color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "600",
    maxWidth: width * 0.6,
  },
  closeButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
  },
  flashButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
  },

  // Mode toggle
  toggleContainer: {
    flexDirection: "row", width: width * 0.7, height: 40,
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
    position: "relative", overflow: "hidden",
  },
  togglePill: { position: "absolute", top: 2, bottom: 2, borderRadius: 18 },
  toggleOption: { flex: 1, justifyContent: "center", alignItems: "center", zIndex: 1 },
  toggleText: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.6)" },
  toggleTextActive: { color: "white" },

  // Overlay
  overlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "center", alignItems: "center",
  },
  overlaySection: { backgroundColor: "rgba(0,0,0,0.6)" },
  topOverlay: { width: "100%", height: (height - scanAreaSize) / 2 },
  bottomOverlay: { width: "100%", height: (height - scanAreaSize) / 2 },
  middleSection: { flexDirection: "row", width: "100%", height: scanAreaSize },
  sideOverlay: { width: (width - scanAreaSize) / 2, height: "100%" },
  scanArea: { width: scanAreaSize, height: scanAreaSize, position: "relative" },
  corner: { position: "absolute", width: 30, height: 30, borderColor: "#007AFF", borderWidth: 4 },
  cornerDefect: { borderColor: "#E63946" },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanLine: {
    position: "absolute", left: 0, right: 0, height: 4,
    backgroundColor: "#007AFF", shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 5,
  },
  scanLineDefect: { backgroundColor: "#E63946", shadowColor: "#E63946" },

  // Instructions
  instructionsContainer: {
    position: "absolute", bottom: 60, left: 0, right: 0,
    alignItems: "center", paddingHorizontal: 40,
  },
  focusIcon: { marginBottom: 10 },
  instructions: { color: "white", fontSize: 16, fontWeight: "500", textAlign: "center", marginBottom: 8 },
  subInstructions: { color: "rgba(255,255,255,0.7)", fontSize: 13, textAlign: "center", marginBottom: 16 },

  // Manual entry trigger button
  manualEntryTrigger: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(0,122,255,0.5)",
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 20,
  },
  manualEntryTriggerDefect: {
    borderColor: "rgba(230,57,70,0.5)",
  },
  manualEntryTriggerText: {
    color: "#60A5FA", fontSize: 14, fontWeight: "600",
  },
  manualEntryTriggerTextDefect: {
    color: "#F87171",
  },

  // Manual entry panel
  manualOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "flex-end",
  },
  manualBackdrop: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  manualPanel: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 20,
  },
  manualPanelDefect: {
    borderTopWidth: 3, borderTopColor: "#E63946",
  },
  manualPanelHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
  },
  manualPanelIconBg: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "#EFF6FF",
    justifyContent: "center", alignItems: "center",
  },
  manualPanelIconBgDefect: {
    backgroundColor: "#FFF5F5",
  },
  manualPanelTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  manualPanelSubtitle: { fontSize: 13, color: "#6B7280", marginTop: 1 },
  manualCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center", alignItems: "center",
  },
  manualInputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 20, marginBottom: 12,
  },
  manualInput: {
    flex: 1, height: 50,
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5, borderColor: "#007AFF", borderRadius: 14,
    paddingHorizontal: 14, fontSize: 15, color: "#111827",
  },
  manualInputDefect: {
    borderColor: "#E63946",
  },
  manualSubmitBtn: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: "#007AFF",
    justifyContent: "center", alignItems: "center",
    shadowColor: "#007AFF", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  manualSubmitBtnDefect: {
    backgroundColor: "#E63946", shadowColor: "#E63946",
  },
  manualSubmitBtnDisabled: { opacity: 0.45 },
  manualHint: {
    fontSize: 12, color: "#9CA3AF", textAlign: "center", paddingHorizontal: 20,
  },

  // Shared sheet primitives
  backdrop: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: "#D1D5DB", borderRadius: 2,
    alignSelf: "center", marginTop: 10, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  sheetBackBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center",
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },

  // Item detail sheet
  sheet: {
    backgroundColor: "#F9FAFB", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: height * 0.88,
    flexShrink: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 20,
  },
  sheetScroll: { flexGrow: 0 },
  sheetScrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },

  // Item card
  itemCard: {
    backgroundColor: "white", borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  itemName: { fontSize: 18, fontWeight: "800", color: "#111827", lineHeight: 24, marginBottom: 4 },
  itemCode: { fontSize: 14, color: "#6B7280", fontWeight: "500", marginBottom: 2 },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 14 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  detailRowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  detailRowIcon: { fontSize: 16 },
  detailRowLabel: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  detailRowValue: { fontSize: 14, color: "#111827", fontWeight: "700", maxWidth: "50%", textAlign: "right" },

  // Action buttons
  markLabel: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", letterSpacing: 1.2, marginBottom: 10 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    paddingVertical: 16, borderRadius: 16, marginBottom: 12,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  actionBtnComplete: { backgroundColor: "#2A9D8F", shadowColor: "#2A9D8F" },
  actionBtnDefect: { backgroundColor: "#E63946", shadowColor: "#E63946" },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { color: "white", fontSize: 16, fontWeight: "700" },

  // Defect overlay
  defectOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  defectBackdrop: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  defectSheetContainer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: height * 0.85,
  },
  defectSheet: {
    flex: 1, backgroundColor: "#F9FAFB",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 20,
  },
  defectSubtitle: { fontSize: 13, color: "#6B7280", paddingHorizontal: 20, marginBottom: 8, marginTop: 2 },
  defectSearchWrapper: {
    flexDirection: "row", alignItems: "center", backgroundColor: "white",
    borderRadius: 12, borderWidth: 1.5, borderColor: "#E5E7EB",
    marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  defectSearchIcon: { fontSize: 15 },
  defectSearchInput: { flex: 1, fontSize: 15, color: "#111827", paddingVertical: 0 },
  defectSearchClear: { fontSize: 13, color: "#9CA3AF", fontWeight: "600" },
  defectNoResults: { paddingVertical: 32, alignItems: "center" },
  defectNoResultsText: { fontSize: 14, color: "#9CA3AF", textAlign: "center" },
  defectScroll: { flex: 1 },
  defectScrollContent: { paddingHorizontal: 16, paddingBottom: 8 },
  defectRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, paddingHorizontal: 14,
    backgroundColor: "white", borderRadius: 14, marginBottom: 8,
    borderWidth: 1.5, borderColor: "#E5E7EB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  defectRowSelected: { borderColor: "#E63946", backgroundColor: "#FFF5F5" },
  defectRadio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: "#D1D5DB",
    justifyContent: "center", alignItems: "center",
  },
  defectRadioSelected: { borderColor: "#E63946" },
  defectRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#E63946" },
  defectRowText: { flex: 1, fontSize: 15, color: "#374151", fontWeight: "500" },
  defectRowTextSelected: { color: "#E63946", fontWeight: "700" },
  otherBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  otherBadgeText: { fontSize: 11, color: "#6B7280", fontWeight: "600" },
  otherInputWrapper: {
    backgroundColor: "white", borderRadius: 14, borderWidth: 1.5,
    borderColor: "#E63946", marginBottom: 8, marginTop: -4, padding: 12,
  },
  otherInput: { fontSize: 15, color: "#111827", minHeight: 70, textAlignVertical: "top", lineHeight: 22 },
  otherInputCount: { fontSize: 11, color: "#9CA3AF", textAlign: "right", marginTop: 4 },
  commentInputWrapper: {
    backgroundColor: "white", borderRadius: 14, borderWidth: 1.5,
    borderColor: "#D1D5DB", marginBottom: 10, padding: 12,
  },
  commentInput: { fontSize: 15, color: "#111827", minHeight: 56, textAlignVertical: "top", lineHeight: 22 },
  selectedExtrasWrapper: {
    marginTop: 4, marginBottom: 8,
    backgroundColor: "#FFF9F9", borderRadius: 14, borderWidth: 1,
    borderColor: "#FECACA", padding: 12, gap: 10,
  },
  extrasLabel: { fontSize: 12, fontWeight: "700", color: "#374151", marginBottom: 6 },
  extrasOptional: { fontSize: 12, fontWeight: "400", color: "#9CA3AF" },

  // Photo section
  photoSection: {
    backgroundColor: "white", borderRadius: 16, borderWidth: 1.5,
    borderColor: "#E5E7EB", marginTop: 12, marginBottom: 4, padding: 14,
  },
  photoSectionHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10,
  },
  photoSectionTitle: { fontSize: 13, fontWeight: "700", color: "#374151" },
  photoRequired: { fontSize: 12, fontWeight: "600", color: "#E63946" },
  photoCount: { fontSize: 12, fontWeight: "600", color: "#9CA3AF" },
  photoButtonsRow: {
    flexDirection: "row", gap: 10, marginBottom: 12,
  },
  photoBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 11, borderRadius: 12,
    borderWidth: 1.5, borderColor: "#E63946",
    backgroundColor: "#FFF5F5",
  },
  photoBtnText: { fontSize: 14, fontWeight: "600", color: "#E63946" },
  photoGrid: {
    flexDirection: "row", gap: 8, paddingBottom: 4,
  },
  photoThumbWrapper: {
    width: 72, height: 72, borderRadius: 10,
    position: "relative", marginRight: 4,
  },
  photoThumb: {
    width: 72, height: 72, borderRadius: 10,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  photoRemoveBtn: {
    position: "absolute", top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "#E63946",
    justifyContent: "center", alignItems: "center",
    zIndex: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 2, elevation: 3,
  },
  photoEmptyHint: {
    paddingVertical: 10, alignItems: "center",
  },
  photoEmptyText: { fontSize: 13, color: "#9CA3AF" },

  defectSubmitWrapper: {
    padding: 16, paddingBottom: Platform.OS === "ios" ? 32 : 20,
    borderTopWidth: 1, borderTopColor: "#E5E7EB", backgroundColor: "#F9FAFB",
  },
  defectSubmitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#E63946", paddingVertical: 16, borderRadius: 16,
    shadowColor: "#E63946", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  defectSubmitBtnDisabled: { opacity: 0.5 },
  defectSubmitText: { color: "white", fontSize: 16, fontWeight: "700" },

  // Defect detail popup
  popupOverlay: {
    flex: 1, justifyContent: "center", alignItems: "center",
  },
  popupBackdrop: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  popupCard: {
    width: width * 0.92,
    maxHeight: height * 0.82,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 24, elevation: 20,
  },
  popupHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
    gap: 10,
  },
  popupBackBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center",
  },
  popupHeaderCenter: { flex: 1 },
  popupTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  popupSubtitle: { fontSize: 12, color: "#9CA3AF", marginTop: 1 },
  popupScroll: { flexGrow: 0 },
  popupScrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  popupSection: { marginBottom: 16 },
  popupSectionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8,
  },
  popupSectionLabel: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8 },
  popupRequired: { fontSize: 12, fontWeight: "600", color: "#E63946" },
  popupOptional: { fontSize: 12, fontWeight: "400", color: "#9CA3AF" },
  popupPhotoCount: { fontSize: 12, fontWeight: "600", color: "#9CA3AF" },
  popupInputBox: {
    backgroundColor: "#F9FAFB", borderRadius: 14,
    borderWidth: 1.5, borderColor: "#E5E7EB", padding: 12,
  },
  popupTextInput: {
    fontSize: 15, color: "#111827", minHeight: 64,
    textAlignVertical: "top", lineHeight: 22,
  },
  popupCharCount: { fontSize: 11, color: "#9CA3AF", textAlign: "right", marginTop: 4 },
  popupFooter: {
    padding: 16, paddingBottom: Platform.OS === "ios" ? 28 : 16,
    borderTopWidth: 1, borderTopColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },

  // Rework / Replace toggle
  actionToggleRow: {
    flexDirection: "row", gap: 10,
  },
  actionToggleBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center",
    borderWidth: 1.5, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB",
  },
  actionToggleBtnActive: {
    borderColor: "#E63946", backgroundColor: "#FFF5F5",
  },
  actionToggleBtnText: {
    fontSize: 14, fontWeight: "600", color: "#6B7280",
  },
  actionToggleBtnTextActive: {
    color: "#E63946",
  },

  // Machine list
  machineListBox: {
    maxHeight: 180, borderRadius: 12,
    borderWidth: 1.5, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB",
  },
  machineRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  machineRowSelected: { backgroundColor: "#FFF5F5" },
  machineRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: "#D1D5DB",
    justifyContent: "center", alignItems: "center",
  },
  machineRadioSelected: { borderColor: "#E63946" },
  machineRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#E63946" },
  machineRowText: { flex: 1, fontSize: 14, color: "#374151", fontWeight: "500" },
  machineRowTextSelected: { color: "#E63946", fontWeight: "700" },
  machineLoadingBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB",
  },
  machineLoadingText: { fontSize: 14, color: "#9CA3AF" },

  // Defect image section (in item detail sheet)
  defectImageSection: {
    backgroundColor: "#FFF5F5", borderRadius: 16,
    borderWidth: 1.5, borderColor: "#FECACA",
    padding: 14, marginBottom: 16,
  },
  defectImageSectionHeader: { marginBottom: 10 },
  defectImageSectionBadge: {
    backgroundColor: "#E63946", alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 6,
  },
  defectImageSectionBadgeText: { color: "white", fontSize: 12, fontWeight: "700" },
  defectImageSectionMeta: { fontSize: 13, color: "#374151", fontWeight: "500" },
  defectImageGrid: { flexDirection: "row", gap: 8, paddingBottom: 4 },
  defectImageThumbWrapper: {
    width: 80, height: 80, borderRadius: 12, overflow: "hidden",
    borderWidth: 2, borderColor: "#E63946", position: "relative",
  },
  defectImageThumb: { width: "100%", height: "100%" },
  defectImageIndexBadge: {
    position: "absolute", bottom: 4, right: 4,
    backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  defectImageIndexText: { color: "white", fontSize: 10, fontWeight: "700" },

  // Gallery viewer
  galleryOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center", alignItems: "center",
  },
  galleryClose: {
    position: "absolute", top: Platform.OS === "ios" ? 56 : 36, right: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center", zIndex: 10,
  },
  galleryCounter: {
    position: "absolute", top: Platform.OS === "ios" ? 62 : 42,
    color: "white", fontSize: 14, fontWeight: "600", alignSelf: "center",
  },
  galleryImage: {
    width: width, height: height * 0.6,
  },
  galleryNavBtn: {
    position: "absolute", top: "45%",
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
  },
  galleryNavLeft: { left: 16 },
  galleryNavRight: { right: 16 },
  galleryStripWrapper: {
    position: "absolute", bottom: Platform.OS === "ios" ? 48 : 28,
    width: width,
  },
  galleryStrip: {
    paddingHorizontal: 16, gap: 8,
  },
  galleryStripThumb: {
    width: 56, height: 56, borderRadius: 8,
    borderWidth: 2, borderColor: "transparent",
    opacity: 0.6,
  },
  galleryStripThumbActive: {
    borderColor: "white", opacity: 1,
  },
  defectImageSectionRemark: {
    fontSize: 12, color: "#6B7280", marginTop: 4, marginBottom: 10, fontStyle: "italic",
  },

  // Completion photo popup
  completionSubmitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#2A9D8F", paddingVertical: 16, borderRadius: 16,
    shadowColor: "#2A9D8F", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  completionInfoBanner: {
    backgroundColor: "#F0FDF4", borderRadius: 12, borderWidth: 1,
    borderColor: "#86EFAC", padding: 12, marginBottom: 16,
  },
  completionInfoText: { fontSize: 13, color: "#166534", lineHeight: 18 },
});
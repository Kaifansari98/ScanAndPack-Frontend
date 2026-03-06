import { useToast } from "@/components/Notification/ToastProvider";
import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
import { playErrorFeedback, playSuccessFeedback, preloadFeedbackSounds, unloadFeedbackSounds } from "@/utils/soundVibration";

import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AlertTriangle, ArrowLeft, CheckCircle, Flashlight, FlashlightOff, Focus, Keyboard, Send, X } from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
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

const OTHER_DEFECT: Defect = { id: 0, defect_name: "Other" };

export default function TrackTraceBarcodeScanner() {
  const { machine_id, machine_name } = useLocalSearchParams<{ machine_id?: string; machine_name?: string }>();

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
  const [showItemDetail, setShowItemDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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

  const router = useRouter();
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const manualSlideAnim = useRef(new Animated.Value(300)).current;
  const { showToast } = useToast();
  const { vendor_id } = useSelector((state: any) => state.auth.user);
  const user = useSelector((state: RootState) => state.auth.user);

  React.useEffect(() => {
    (async () => {
      await preloadFeedbackSounds();
    })();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnimation, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanLineAnimation, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    return () => { unloadFeedbackSounds(); };
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
    Animated.spring(manualSlideAnim, {
      toValue: 0, useNativeDriver: true, tension: 80, friction: 12,
    }).start(() => {
      manualInputRef.current?.focus();
    });
  };

  const closeManualEntry = () => {
    Animated.timing(manualSlideAnim, {
      toValue: 300, duration: 250, useNativeDriver: true,
    }).start(() => {
      setShowManualEntry(false);
      setManualCode("");
    });
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
    project_id: 1,
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

  const showItemDetailSheet = (item: MappedItemResponse) => {
    setMappedItem(item.mappedItem);
    setShowItemDetail(true);
    Animated.spring(slideAnim, {
      toValue: 0, useNativeDriver: true, tension: 65, friction: 11,
    }).start();
  };

  const hideItemDetailSheet = () => {
    Animated.timing(slideAnim, { toValue: height, duration: 300, useNativeDriver: true })
      .start(() => {
        setShowItemDetail(false);
        setMappedItem(null);
        setScanned(false);
      });
  };

  // ─── Defect item detail sheet helpers ─────────────────────────────────────

  const showDefectItemDetailSheet = (item: MappedItem) => {
    setDefectMappedItem(item);
    setShowDefectItemDetail(true);
    Animated.spring(defectItemSlideAnim, {
      toValue: 0, useNativeDriver: true, tension: 65, friction: 11,
    }).start();
  };

  const hideDefectItemDetailSheet = () => {
    Animated.timing(defectItemSlideAnim, { toValue: height, duration: 300, useNativeDriver: true })
      .start(() => {
        setShowDefectItemDetail(false);
        setDefectMappedItem(null);
        setScanned(false);
      });
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
          const item: MappedItem = apiResponse.data.mappedItem ?? apiResponse.data;
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

  const handleMarkDefectFromScanMode = async () => {
    if (!mappedItem) return;
    await fetchAndOpenDefectSheet(mappedItem);
  };

  const handleMarkDefectFromDefectMode = async () => {
    if (!defectMappedItem) return;
    await fetchAndOpenDefectSheet(defectMappedItem);
  };

  const handleSubmitDefect = async () => {
    const activeItem = mappedItem ?? defectMappedItem;
    if (!activeItem || !selectedDefect) return;

    const isOther = selectedDefect.id === 0;
    if (isOther && otherDefectText.trim() === "") {
      showToast("error", "Please describe the defect");
      return;
    }

    setSubmitDefectLoading(true);
    try {
      const payload = {
        vendor_id,
        project_id: activeItem.project_id,
        cut_list_machine_mapping_id: activeItem.id,
        cut_list_id: activeItem.cut_list_id,
        machine_id: activeItem.machine.id,
        unique_code: activeItem.cut_list.unique_code,
        created_by: Number(user?.id),
        defect_id: selectedDefect.id,
        defect_name: isOther ? otherDefectText.trim() : selectedDefect.defect_name,
      };

      const res = await axios.post("/track-trace/mark-defect", payload);
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

  const scanLineTranslateY = scanLineAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, scanAreaSize - 4],
  });

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
            <Animated.View style={[styles.togglePill, {
              left: pillLeft,
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
            <Animated.View style={[
              styles.scanLine,
              { transform: [{ translateY: scanLineTranslateY }] },
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.manualOverlay}
          pointerEvents="box-none"
        >
          <TouchableOpacity style={styles.manualBackdrop} activeOpacity={1} onPress={closeManualEntry} />

          <Animated.View style={[
            styles.manualPanel,
            isDefectMode && styles.manualPanelDefect,
            { transform: [{ translateY: manualSlideAnim }] }
          ]}>
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
          </Animated.View>
        </KeyboardAvoidingView>
      )}

      {/* ══════════════════════════════════════════════════════════════
          SCAN CODE MODE — Item Detail Modal
      ══════════════════════════════════════════════════════════════ */}
      {showItemDetail && mappedItem && (
        <Modal transparent animationType="none" visible={showItemDetail} onRequestClose={showDefectModal ? closeDefectModal : hideItemDetailSheet}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={showDefectModal ? closeDefectModal : hideItemDetailSheet}
          />

          <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
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

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDefect, (actionLoading || defectListLoading) && styles.actionBtnDisabled]}
                onPress={handleMarkDefectFromScanMode}
                activeOpacity={0.85}
                disabled={actionLoading || defectListLoading}
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
                defectSearchQuery={defectSearchQuery}
                setDefectSearchQuery={setDefectSearchQuery}
                submitDefectLoading={submitDefectLoading}
                onClose={closeDefectModal}
                onSubmit={handleSubmitDefect}
              />
            )}
          </Animated.View>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MARK DEFECT MODE — Defect Item Detail Modal
      ══════════════════════════════════════════════════════════════ */}
      {showDefectItemDetail && defectMappedItem && (
        <Modal transparent animationType="none" visible={showDefectItemDetail} onRequestClose={showDefectModal ? closeDefectModal : hideDefectItemDetailSheet}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={showDefectModal ? closeDefectModal : hideDefectItemDetailSheet}
          />

          <Animated.View style={[styles.sheet, { transform: [{ translateY: defectItemSlideAnim }] }]}>
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
                defectSearchQuery={defectSearchQuery}
                setDefectSearchQuery={setDefectSearchQuery}
                submitDefectLoading={submitDefectLoading}
                onClose={closeDefectModal}
                onSubmit={handleSubmitDefect}
              />
            )}
          </Animated.View>
        </Modal>
      )}
    </View>
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
  defectSearchQuery: string;
  setDefectSearchQuery: (q: string) => void;
  submitDefectLoading: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

function DefectSheet({
  allDefects, selectedDefect, setSelectedDefect,
  otherDefectText, setOtherDefectText,
  defectSearchQuery, setDefectSearchQuery,
  submitDefectLoading, onClose, onSubmit,
}: DefectSheetProps) {
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
                <View key={String(defect.id)}>
                  <TouchableOpacity
                    style={[styles.defectRow, isSelected && styles.defectRowSelected]}
                    onPress={() => {
                      setSelectedDefect(defect);
                      if (!isOther) setOtherDefectText("");
                    }}
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

                  {isOther && isSelected && (
                    <View style={styles.otherInputWrapper}>
                      <TextInput
                        style={styles.otherInput}
                        placeholder="Describe the defect..."
                        placeholderTextColor="#9CA3AF"
                        value={otherDefectText}
                        onChangeText={setOtherDefectText}
                        multiline
                        autoFocus
                        maxLength={200}
                      />
                      <Text style={styles.otherInputCount}>{otherDefectText.length}/200</Text>
                    </View>
                  )}
                </View>
              );
            })}
            {allDefects.length === 0 && (
              <View style={styles.defectNoResults}>
                <Text style={styles.defectNoResultsText}>No defects match "{defectSearchQuery}"</Text>
              </View>
            )}
            <View style={{ height: 16 }} />
          </ScrollView>

          <View style={styles.defectSubmitWrapper}>
            <TouchableOpacity
              style={[styles.defectSubmitBtn, (!selectedDefect || submitDefectLoading) && styles.defectSubmitBtnDisabled]}
              onPress={onSubmit}
              activeOpacity={0.85}
              disabled={!selectedDefect || submitDefectLoading}
            >
              {submitDefectLoading ? <ActivityIndicator size="small" color="white" /> : <Send size={18} color="white" />}
              <Text style={styles.defectSubmitText}>
                {submitDefectLoading ? "Submitting..." : "Submit Defect"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
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
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
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
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#F9FAFB", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: height * 0.88,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 20,
  },
  sheetScroll: { flex: 1 },
  sheetScrollContent: { paddingHorizontal: 20, paddingTop: 8 },

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
});
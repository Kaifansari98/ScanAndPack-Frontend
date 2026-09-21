import Navbar from "@/components/generic/Navbar";
import { useToast } from "@/components/Notification/ToastProvider";
import { usePackagingBoxPrinter } from "@/hooks/usePackagingBoxPrinter";
import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
import {
  playErrorFeedback,
  playSuccessFeedback,
  preloadFeedbackSounds,
  unloadFeedbackSounds,
} from "@/utils/soundVibration";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Clock3,
  Keyboard,
  MapPin,
  Package,
  PencilLine,
  ScanBarcode,
  Send,
  Trash2,
  WifiOff,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

type HardwareScannerType = "ring" | "handheld";
type QueueStatus = "queued" | "processing" | "waiting" | "success" | "failure";

interface QueueItem {
  id: string;
  value: string;
  status: QueueStatus;
  message: string;
  attempts: number;
  itemName?: string;
  projectName?: string;
  boxName?: string;
}

// Some Bluetooth/HID scanners send characters with a noticeable gap. Wait
// until input has been quiet before using the timer fallback; scanners that
// send an Enter suffix still submit immediately through onSubmitEditing.
const AUTO_SUBMIT_DELAY_MS = 750;

const isValidPositiveNumber = (value?: string) => {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0;
};

const getErrorMessage = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  "Unable to scan item";

const getStatusPresentation = (status: QueueStatus) => {
  switch (status) {
    case "processing":
      return { label: "Scanning", color: "#2563EB", background: "#EFF6FF" };
    case "success":
      return { label: "Success", color: "#047857", background: "#ECFDF3" };
    case "failure":
      return { label: "Failed", color: "#B42318", background: "#FEF3F2" };
    case "waiting":
      return { label: "Waiting", color: "#B54708", background: "#FFFAEB" };
    default:
      return { label: "Queued", color: "#475467", background: "#F2F4F7" };
  }
};

export default function HardwareScannerScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const user = useSelector((state: RootState) => state.auth.user);
  const {
    scanner_type,
    machine_id,
    machine_name,
    project_id,
    box_id,
    box_name,
    location_name,
    packing_type,
  } = useLocalSearchParams<{
    scanner_type?: string;
    machine_id?: string;
    machine_name?: string;
    project_id?: string;
    box_id?: string;
    box_name?: string;
    location_name?: string;
    packing_type?: string;
  }>();

  const scannerType: HardwareScannerType =
    scanner_type === "ring" ? "ring" : "handheld";
  const scannerLabel =
    scannerType === "ring" ? "Ring Scanner" : "Handheld Scanner";
  const ScannerIcon = scannerType === "ring" ? CircleDot : ScanBarcode;

  const [scanValue, setScanValue] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [workerTick, setWorkerTick] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const manualInputRef = useRef<TextInput>(null);
  const scanValueRef = useRef("");
  const manualEntryVisibleRef = useRef(false);
  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const activeRequestRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(false);
  const processingRef = useRef(false);
  const lastSubmissionRef = useRef({ value: "", at: 0 });

  const machineId = Number(machine_id);
  const vendorId = Number(user?.vendor_id);
  const userId = Number(user?.id);
  const isConfigured =
    Number.isInteger(machineId) &&
    machineId > 0 &&
    Number.isInteger(vendorId) &&
    vendorId > 0 &&
    Number.isInteger(userId) &&
    userId > 0;
  const isPackagingScanner = ["DEFAULT", "GROUPWISE", "CUSTOM_GROUP"].includes(
    String(packing_type || "").toUpperCase(),
  );
  const { queueCompletedBoxPrint } = usePackagingBoxPrinter({
    enabled: isPackagingScanner || isValidPositiveNumber(box_id),
    projectId: isValidPositiveNumber(project_id) ? Number(project_id) : null,
    vendorId,
  });

  const pendingCount = useMemo(
    () =>
      queue.filter((item) =>
        ["queued", "processing", "waiting"].includes(item.status),
      ).length,
    [queue],
  );

  const clearAutoSubmitTimer = useCallback(() => {
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }
  }, []);

  const focusInput = useCallback(() => {
    if (!manualEntryVisibleRef.current) {
      inputRef.current?.focus();
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const initialFocusTimer = setTimeout(focusInput, 150);
      const focusInterval = setInterval(focusInput, 900);

      return () => {
        clearTimeout(initialFocusTimer);
        clearInterval(focusInterval);
        clearAutoSubmitTimer();
      };
    }, [clearAutoSubmitTimer, focusInput]),
  );

  useEffect(() => {
    const retryTimers = retryTimersRef.current;
    mountedRef.current = true;
    void preloadFeedbackSounds();

    return () => {
      mountedRef.current = false;
      activeRequestRef.current?.abort();
      activeRequestRef.current = null;
      clearAutoSubmitTimer();
      retryTimers.forEach((timer) => clearTimeout(timer));
      retryTimers.clear();
      void unloadFeedbackSounds();
    };
  }, [clearAutoSubmitTimer]);

  const enqueueScan = useCallback(
    (rawValue: string) => {
      const value = rawValue.trim();
      if (!value || !isConfigured) return;

      const now = Date.now();
      if (
        lastSubmissionRef.current.value === value &&
        now - lastSubmissionRef.current.at < 150
      ) {
        return;
      }

      lastSubmissionRef.current = { value, at: now };
      clearAutoSubmitTimer();
      scanValueRef.current = "";
      setScanValue("");
      setQueue((current) => [
        {
          id: `${now}-${Math.random().toString(16).slice(2)}`,
          value,
          status: "queued",
          message: "Queued",
          attempts: 0,
        },
        ...current,
      ]);
      setTimeout(focusInput, 0);
    },
    [clearAutoSubmitTimer, focusInput, isConfigured],
  );

  const handleValueChange = useCallback(
    (value: string) => {
      scanValueRef.current = value;
      setScanValue(value);
      clearAutoSubmitTimer();

      if (value.trim()) {
        autoSubmitTimerRef.current = setTimeout(
          () => enqueueScan(scanValueRef.current),
          AUTO_SUBMIT_DELAY_MS,
        );
      }
    },
    [clearAutoSubmitTimer, enqueueScan],
  );

  const handleScannerSubmit = useCallback(
    (nativeValue: string) => {
      // React state can still contain the previous character when a fast HID
      // scanner sends Enter. Prefer whichever source has the complete value.
      const currentValue = scanValueRef.current;
      const value =
        nativeValue.length >= currentValue.length ? nativeValue : currentValue;

      enqueueScan(value);
    },
    [enqueueScan],
  );

  const openManualEntry = useCallback(() => {
    clearAutoSubmitTimer();
    manualEntryVisibleRef.current = true;
    setManualCode("");
    setShowManualEntry(true);
    setTimeout(() => manualInputRef.current?.focus(), 150);
  }, [clearAutoSubmitTimer]);

  const closeManualEntry = useCallback(() => {
    manualInputRef.current?.blur();
    manualEntryVisibleRef.current = false;
    setShowManualEntry(false);
    setManualCode("");
    setTimeout(focusInput, 150);
  }, [focusInput]);

  const submitManualCode = useCallback(() => {
    const code = manualCode.trim();

    if (!code) {
      showToast("error", "Enter a code to continue");
      manualInputRef.current?.focus();
      return;
    }

    if (!isConfigured) {
      showToast("error", "Scanner configuration is incomplete");
      return;
    }

    manualInputRef.current?.blur();
    manualEntryVisibleRef.current = false;
    setShowManualEntry(false);
    setManualCode("");
    enqueueScan(code);
  }, [enqueueScan, isConfigured, manualCode, showToast]);

  useEffect(() => {
    if (!isConfigured || processingRef.current) return;

    const nextItem = [...queue]
      .reverse()
      .find((item) => item.status === "queued");
    if (!nextItem) return;

    processingRef.current = true;
    setQueue((current) =>
      current.map((item) =>
        item.id === nextItem.id
          ? {
              ...item,
              status: "processing",
              message: "Validating scan...",
              attempts: item.attempts + 1,
            }
          : item,
      ),
    );

    const payload = {
      vendor_id: vendorId,
      machine_id: machineId,
      unique_code: nextItem.value,
      created_by: userId,
      ...(isValidPositiveNumber(project_id)
        ? { project_id: Number(project_id) }
        : {}),
      ...(isValidPositiveNumber(box_id) ? { box_id: Number(box_id) } : {}),
      ...(location_name?.trim()
        ? { location_name: location_name.trim() }
        : {}),
    };
    const abortController = new AbortController();
    activeRequestRef.current = abortController;

    void axios
      .post("/track-trace/scan/machine-item", payload, {
        signal: abortController.signal,
      })
      .then((response) => {
        if (!mountedRef.current) return;

        const result = response.data;

        setQueue((current) =>
          current.map((item) =>
            item.id === nextItem.id
              ? {
                  ...item,
                  status: result?.success ? "success" : "failure",
                  message:
                    result?.message ||
                    (result?.success ? "Scan successful" : "Scan failed"),
                  itemName: result?.data?.item_name,
                  projectName: result?.data?.project_name,
                  boxName: result?.data?.box_name,
                }
              : item,
          ),
        );

        if (result?.success) {
          playSuccessFeedback();
          queueCompletedBoxPrint(result);
        } else {
          playErrorFeedback();
        }
      })
      .catch((error: any) => {
        if (!mountedRef.current || abortController.signal.aborted) return;

        if (error?.response) {
          const message = getErrorMessage(error);
          setQueue((current) =>
            current.map((item) =>
              item.id === nextItem.id
                ? { ...item, status: "failure", message }
                : item,
            ),
          );
          playErrorFeedback();
          return;
        }

        setQueue((current) =>
          current.map((item) =>
            item.id === nextItem.id
              ? {
                  ...item,
                  status: "waiting",
                  message: "Network unavailable. Retrying automatically...",
                }
              : item,
          ),
        );

        const retryTimer = setTimeout(() => {
          retryTimersRef.current.delete(nextItem.id);
          setQueue((current) =>
            current.map((item) =>
              item.id === nextItem.id && item.status === "waiting"
                ? { ...item, status: "queued", message: "Queued for retry" }
                : item,
            ),
          );
          setWorkerTick((current) => current + 1);
        }, Math.min(30_000, 2_000 * 2 ** Math.min(nextItem.attempts, 4)));

        retryTimersRef.current.set(nextItem.id, retryTimer);
      })
      .finally(() => {
        if (activeRequestRef.current === abortController) {
          activeRequestRef.current = null;
        }
        if (!mountedRef.current) return;

        processingRef.current = false;
        setWorkerTick((current) => current + 1);
        setTimeout(focusInput, 0);
      });
  }, [
    box_id,
    focusInput,
    isConfigured,
    location_name,
    machineId,
    project_id,
    queueCompletedBoxPrint,
    queue,
    userId,
    vendorId,
    workerTick,
  ]);

  const clearCompleted = () => {
    setQueue((current) =>
      current.filter((item) => !["success", "failure"].includes(item.status)),
    );
    showToast("success", "Completed scans cleared");
    setTimeout(focusInput, 0);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Navbar
        title={scannerLabel}
        subtitle={machine_name || "Track & Trace Scanner"}
        showBack
      />

      <View style={styles.content}>
        <View style={styles.contextCard}>
          <View style={styles.scannerIcon}>
            <ScannerIcon size={24} color="#FFFFFF" />
          </View>
          <View style={styles.contextText}>
            <Text style={styles.contextTitle}>{scannerLabel} connected</Text>
            <Text style={styles.contextSubtitle}>
              Keep the cursor in the field and scan continuously.
            </Text>
          </View>
        </View>

        <View style={styles.contextChips}>
          {box_name ? (
            <View style={styles.contextChip}>
              <Package size={13} color="#475467" />
              <Text style={styles.contextChipText}>{box_name}</Text>
            </View>
          ) : null}
          {location_name ? (
            <View style={styles.contextChip}>
              <MapPin size={13} color="#475467" />
              <Text style={styles.contextChipText}>{location_name}</Text>
            </View>
          ) : null}
        </View>

        {!isConfigured && (
          <View style={styles.configurationError}>
            <AlertCircle size={18} color="#B42318" />
            <Text style={styles.configurationErrorText}>
              Scanner configuration is incomplete. Go back and select the
              machine again.
            </Text>
          </View>
        )}

        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>SCAN QR OR BARCODE</Text>
          <View style={styles.inputRow}>
            <Keyboard size={20} color="#667085" />
            <TextInput
              ref={inputRef}
              value={scanValue}
              onChangeText={handleValueChange}
              onSubmitEditing={({ nativeEvent }) =>
                handleScannerSubmit(nativeEvent.text)
              }
              onBlur={() => setTimeout(focusInput, 250)}
              editable={isConfigured}
              autoFocus
              blurOnSubmit={false}
              showSoftInputOnFocus={false}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="Scanner input appears here"
              placeholderTextColor="#98A2B3"
              style={styles.input}
            />
            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => enqueueScan(scanValueRef.current)}
              disabled={!scanValue.trim() || !isConfigured}
            >
              <Send size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.inputHint}>
            Input is submitted automatically after the scanner finishes.
          </Text>
          <TouchableOpacity
            style={styles.manualEntryButton}
            onPress={openManualEntry}
            disabled={!isConfigured}
            activeOpacity={0.75}
          >
            <PencilLine size={16} color="#344054" />
            <Text style={styles.manualEntryButtonText}>
              Enter code manually
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listHeader}>
          <View>
            <Text style={styles.listTitle}>Scanned Items</Text>
            <Text style={styles.listSubtitle}>
              {pendingCount > 0
                ? `${pendingCount} item${pendingCount === 1 ? "" : "s"} in queue`
                : `${queue.length} scan${queue.length === 1 ? "" : "s"}`}
            </Text>
          </View>

          {queue.some((item) =>
            ["success", "failure"].includes(item.status),
          ) && (
            <TouchableOpacity style={styles.clearButton} onPress={clearCompleted}>
              <Trash2 size={14} color="#475467" />
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={queue}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 18 },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ScanBarcode size={31} color="#98A2B3" />
              <Text style={styles.emptyTitle}>Ready to scan</Text>
              <Text style={styles.emptySubtitle}>
                Scanned items and their API status will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const presentation = getStatusPresentation(item.status);

            return (
              <View style={styles.queueCard}>
                <View style={styles.queueTopRow}>
                  <View style={styles.queueCodeBlock}>
                    <Text style={styles.queueCode} numberOfLines={1}>
                      {item.value}
                    </Text>
                    {item.itemName ? (
                      <Text style={styles.queueItemName} numberOfLines={1}>
                        {item.itemName}
                      </Text>
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: presentation.background },
                    ]}
                  >
                    {item.status === "processing" ? (
                      <ActivityIndicator size="small" color={presentation.color} />
                    ) : item.status === "success" ? (
                      <CheckCircle2 size={13} color={presentation.color} />
                    ) : item.status === "failure" ? (
                      <AlertCircle size={13} color={presentation.color} />
                    ) : item.status === "waiting" ? (
                      <WifiOff size={13} color={presentation.color} />
                    ) : (
                      <Clock3 size={13} color={presentation.color} />
                    )}
                    <Text
                      style={[styles.statusText, { color: presentation.color }]}
                    >
                      {presentation.label}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.queueMessage,
                    item.status === "failure" && styles.failureMessage,
                  ]}
                >
                  {item.message}
                </Text>
              </View>
            );
          }}
        />
      </View>

      <Modal
        visible={showManualEntry}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeManualEntry}
      >
        <KeyboardAvoidingView
          style={styles.manualModalRoot}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity
            style={styles.manualBackdrop}
            activeOpacity={1}
            onPress={closeManualEntry}
          />

          <View
            style={[
              styles.manualSheet,
              { paddingBottom: Math.max(insets.bottom, 18) },
            ]}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.manualHeader}>
              <View style={styles.manualHeaderIcon}>
                <PencilLine size={21} color="#175CD3" />
              </View>
              <View style={styles.manualHeaderText}>
                <Text style={styles.manualTitle}>Enter code manually</Text>
                <Text style={styles.manualSubtitle}>
                  Type the QR or barcode value exactly as printed.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeManualEntry}
                accessibilityLabel="Close manual code entry"
              >
                <X size={20} color="#475467" />
              </TouchableOpacity>
            </View>

            <Text style={styles.manualInputLabel}>QR / BARCODE VALUE</Text>
            <TextInput
              ref={manualInputRef}
              value={manualCode}
              onChangeText={setManualCode}
              onSubmitEditing={submitManualCode}
              editable={isConfigured}
              autoFocus
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              placeholder="Enter code"
              placeholderTextColor="#98A2B3"
              style={styles.manualInput}
            />

            <View style={styles.manualActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeManualEntry}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.manualSubmitButton,
                  !manualCode.trim() && styles.manualSubmitButtonDisabled,
                ]}
                onPress={submitManualCode}
                disabled={!manualCode.trim() || !isConfigured}
              >
                <Send size={17} color="#FFFFFF" />
                <Text style={styles.manualSubmitButtonText}>Submit Code</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { flex: 1, paddingHorizontal: 14, paddingTop: 14 },
  contextCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    backgroundColor: "#101828",
    padding: 14,
  },
  scannerIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#344054",
  },
  contextText: { flex: 1 },
  contextTitle: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  contextSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: "#D0D5DD",
  },
  contextChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  contextChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: "100%",
    borderWidth: 1,
    borderColor: "#EAECF0",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  contextChipText: {
    maxWidth: 240,
    fontSize: 11,
    fontWeight: "700",
    color: "#475467",
  },
  configurationError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#FECDCA",
    borderRadius: 12,
    backgroundColor: "#FEF3F2",
    padding: 11,
  },
  configurationErrorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    color: "#B42318",
  },
  inputCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#EAECF0",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  inputLabel: {
    marginBottom: 7,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: "#667085",
  },
  inputRow: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 2,
    borderColor: "#84ADFF",
    borderRadius: 13,
    backgroundColor: "#F9FAFB",
    paddingLeft: 12,
    paddingRight: 5,
  },
  input: { flex: 1, height: "100%", fontSize: 15, color: "#101828" },
  submitButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#2563EB",
  },
  inputHint: { marginTop: 7, fontSize: 11, color: "#667085" },
  manualEntryButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 11,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
  },
  manualEntryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#344054",
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 17,
    marginBottom: 9,
  },
  listTitle: { fontSize: 16, fontWeight: "800", color: "#101828" },
  listSubtitle: { marginTop: 2, fontSize: 11, color: "#667085" },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    backgroundColor: "#EAECF0",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  clearButtonText: { fontSize: 11, fontWeight: "700", color: "#475467" },
  listContent: { flexGrow: 1, gap: 9 },
  emptyState: {
    flex: 1,
    minHeight: 190,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D0D5DD",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    padding: 24,
  },
  emptyTitle: {
    marginTop: 9,
    fontSize: 14,
    fontWeight: "800",
    color: "#344054",
  },
  emptySubtitle: {
    marginTop: 4,
    maxWidth: 270,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    color: "#667085",
  },
  queueCard: {
    borderWidth: 1,
    borderColor: "#EAECF0",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  queueTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  queueCodeBlock: { flex: 1 },
  queueCode: { fontSize: 13, fontWeight: "800", color: "#101828" },
  queueItemName: { marginTop: 3, fontSize: 11, color: "#475467" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: { fontSize: 10, fontWeight: "800" },
  queueMessage: { marginTop: 7, fontSize: 11, lineHeight: 16, color: "#667085" },
  failureMessage: { color: "#B42318", fontWeight: "600" },
  manualModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  manualBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16, 24, 40, 0.5)",
  },
  manualSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingTop: 10,
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    alignSelf: "center",
    borderRadius: 4,
    backgroundColor: "#D0D5DD",
  },
  manualHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    marginTop: 18,
  },
  manualHeaderIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#EFF8FF",
  },
  manualHeaderText: { flex: 1 },
  manualTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#101828",
  },
  manualSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    color: "#667085",
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#F2F4F7",
  },
  manualInputLabel: {
    marginTop: 22,
    marginBottom: 7,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: "#667085",
  },
  manualInput: {
    height: 54,
    borderWidth: 2,
    borderColor: "#84ADFF",
    borderRadius: 13,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#101828",
  },
  manualActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  cancelButton: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 12,
    paddingHorizontal: 20,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#344054",
  },
  manualSubmitButton: {
    flex: 1,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 12,
    backgroundColor: "#2563EB",
  },
  manualSubmitButtonDisabled: { opacity: 0.45 },
  manualSubmitButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});

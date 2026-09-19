import {
  CheckSquare2,
  CheckCircle2,
  CircleDot,
  ScanBarcode,
  Square,
  Smartphone,
  X,
} from "lucide-react-native";
import { ScannerType } from "@/types/scanner";
import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type { ScannerType } from "@/types/scanner";

interface ScannerSelectionModalProps {
  visible: boolean;
  onSelect: (scannerType: ScannerType, setAsDefault: boolean) => void;
  onClose: () => void;
  showDefaultOption?: boolean;
  selectedScanner?: ScannerType | null;
}

const scannerOptions = [
  {
    type: "mobile" as const,
    title: "Mobile Scanner",
    description: "Use this phone's camera to scan QR codes.",
    Icon: Smartphone,
    color: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  {
    type: "ring" as const,
    title: "Ring Scanner",
    description: "Use a paired ring scanner as a keyboard input device.",
    Icon: CircleDot,
    color: "#7C3AED",
    backgroundColor: "#F5F3FF",
  },
  {
    type: "handheld" as const,
    title: "Handheld Scanner",
    description: "Use a paired handheld barcode or QR scanner.",
    Icon: ScanBarcode,
    color: "#0F766E",
    backgroundColor: "#F0FDFA",
  },
];

export function ScannerSelectionModal({
  visible,
  onSelect,
  onClose,
  showDefaultOption = true,
  selectedScanner = null,
}: ScannerSelectionModalProps) {
  const [setAsDefault, setSetAsDefault] = useState(false);

  useEffect(() => {
    if (visible) {
      setSetAsDefault(false);
    }
  }, [visible]);

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Select Scanner</Text>
              <Text style={styles.subtitle}>
                Choose the scanner connected to this device.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close scanner selection"
            >
              <X size={20} color="#475467" />
            </TouchableOpacity>
          </View>

          <View style={styles.options}>
            {scannerOptions.map((option) => (
              <TouchableOpacity
                key={option.type}
                style={[
                  styles.option,
                  selectedScanner === option.type && styles.optionSelected,
                ]}
                activeOpacity={0.82}
                onPress={() => onSelect(option.type, setAsDefault)}
              >
                <View
                  style={[
                    styles.optionIcon,
                    { backgroundColor: option.backgroundColor },
                  ]}
                >
                  <option.Icon size={25} color={option.color} />
                </View>

                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>
                    {option.description}
                  </Text>
                </View>

                {selectedScanner === option.type && (
                  <View style={styles.selectedBadge}>
                    <CheckCircle2 size={18} color="#2563EB" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {showDefaultOption && (
            <TouchableOpacity
              style={styles.defaultRow}
              activeOpacity={0.8}
              onPress={() => setSetAsDefault((current) => !current)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: setAsDefault }}
            >
              {setAsDefault ? (
                <CheckSquare2 size={22} color="#2563EB" />
              ) : (
                <Square size={22} color="#98A2B3" />
              )}
              <View style={styles.defaultTextBlock}>
                <Text style={styles.defaultTitle}>Set as default scanner</Text>
                <Text style={styles.defaultDescription}>
                  Skip this selection next time. You can change it from
                  Settings.
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.38)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    width: 42,
    height: 4,
    alignSelf: "center",
    borderRadius: 2,
    backgroundColor: "#D0D5DD",
    marginBottom: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: "800", color: "#101828" },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: "#667085",
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F2F4F7",
  },
  options: { gap: 11 },
  option: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderWidth: 1,
    borderColor: "#EAECF0",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  optionSelected: {
    borderColor: "#84ADFF",
    backgroundColor: "#F8FAFF",
  },
  optionIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
  },
  optionText: { flex: 1 },
  selectedBadge: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#DBEAFE",
  },
  optionTitle: { fontSize: 15, fontWeight: "800", color: "#101828" },
  optionDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: "#667085",
  },
  defaultRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#EAECF0",
    paddingTop: 16,
  },
  defaultTextBlock: { flex: 1 },
  defaultTitle: { fontSize: 13, fontWeight: "800", color: "#344054" },
  defaultDescription: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 16,
    color: "#667085",
  },
});

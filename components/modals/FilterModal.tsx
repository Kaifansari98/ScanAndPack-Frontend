import { colors } from "@/components/theme/colors";
import { Check, RotateCcw, SlidersHorizontal, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface FilterOption {
  key: string;
  label: string;
  desc?: string;
  color?: string;
}

export interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  options: FilterOption[];
  selectedKey: string;
  onApply: (selectedKey: string) => void;
  title?: string;
  subtitle?: string;
}

export function FilterModal({
  visible,
  onClose,
  options,
  selectedKey,
  onApply,
  title = "Filter Projects",
  subtitle = "Select project status to filter inspection list",
}: FilterModalProps) {
  const insets = useSafeAreaInsets();
  const [tempSelectedKey, setTempSelectedKey] = useState(selectedKey);

  useEffect(() => {
    if (visible) {
      setTempSelectedKey(selectedKey);
    }
  }, [visible, selectedKey]);

  const handleApply = () => {
    onApply(tempSelectedKey);
    onClose();
  };

  const handleReset = () => {
    const defaultKey = options[0]?.key || "all";
    setTempSelectedKey(defaultKey);
  };

  // Safe bottom padding so bottom action buttons stay above Android 3-button navigation bar
  const bottomPadding = Math.max(insets.bottom + 16, Platform.OS === "android" ? 32 : 20);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={[styles.modalCard, { paddingBottom: bottomPadding }]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Drag Handle Indicator */}
          <View style={styles.modalDragHandle} />

          {/* Top Row: Left Icon + Title & Subtitle Block | Right Close Button */}
          <View style={styles.modalHeaderRow}>
            <View style={styles.modalHeaderLeftGroup}>
              <View style={styles.modalIconWrap}>
                <SlidersHorizontal size={22} color={colors.midBg} />
              </View>
              <View style={styles.modalTitleBlock}>
                <Text style={styles.modalTitle}>{title}</Text>
                {subtitle ? (
                  <Text style={styles.modalSubtitle}>{subtitle}</Text>
                ) : null}
              </View>
            </View>

            {/* Close Button opposite Title & Description */}
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={styles.modalCloseBtn}
            >
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Options List */}
          <View style={styles.modalOptionsList}>
            {options.map((item) => {
              const selected = tempSelectedKey === item.key;
              const optionColor = item.color || colors.midBg;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.optionCard, selected && styles.selectedOptionCard]}
                  activeOpacity={0.8}
                  onPress={() => setTempSelectedKey(item.key)}
                >
                  <View style={[styles.optionDot, { backgroundColor: optionColor }]} />
                  <View style={styles.optionTextBlock}>
                    <Text style={[styles.optionLabel, selected && styles.selectedOptionLabel]}>
                      {item.label}
                    </Text>
                    {item.desc ? (
                      <Text style={styles.optionDesc}>{item.desc}</Text>
                    ) : null}
                  </View>

                  {selected ? (
                    <View style={styles.selectedCheckWrap}>
                      <Check size={14} color="#FFFFFF" />
                    </View>
                  ) : (
                    <View style={styles.unselectedRadio} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer Actions: Reset Selection + Apply Filter */}
          <View style={styles.modalFooterRow}>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <RotateCcw size={14} color="#475569" />
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={handleApply}
              activeOpacity={0.85}
            >
              <Text style={styles.applyBtnText}>Apply Filter</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 16,
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 2,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 14,
  },
  modalHeaderLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFF8EE",
    borderWidth: 1,
    borderColor: "rgba(244,162,97,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitleBlock: {
    flex: 1,
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.heading,
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOptionsList: {
    gap: 10,
    marginVertical: 2,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  selectedOptionCard: {
    backgroundColor: "#FFF8EE",
    borderColor: colors.accent,
  },
  optionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionTextBlock: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  selectedOptionLabel: {
    color: colors.midBg,
  },
  optionDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  selectedCheckWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.midBg,
    alignItems: "center",
    justifyContent: "center",
  },
  unselectedRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
  },
  modalFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  resetBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  applyBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.midBg,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});

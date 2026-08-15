import { Trash2 } from "lucide-react-native";
import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface ScanItem {
  id: number;
  unique_id: string;
  qty: number;
  item_name: string;
  category: string;
  group: string;
  material_details: string;
  L1: string;
  L2: string;
  L3: string;
}

interface ItemCardProps {
  item: ScanItem;
  index: number;
  status: string;
  onDelete: (id: number) => void;
  onWarnDelete: () => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  index,
  status,
  onDelete,
  onWarnDelete,
}) => {
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(20);
  const scale = useSharedValue(1);

  useEffect(() => {
    cardOpacity.value = withDelay(
      index * 80,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    cardTranslateY.value = withDelay(
      index * 80,
      withSpring(0, { damping: 18, stiffness: 130 })
    );
  }, [index]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }, { scale: scale.value }],
  }));

  const isPacked = status === "packed";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPressIn={() => (scale.value = withSpring(0.97))}
      onPressOut={() => (scale.value = withSpring(1))}
    >
      <Animated.View style={[animatedCardStyle, styles.card]}>

        {/* Left accent strip */}
        <View style={styles.accent} />

        <View style={styles.body}>
          {/* ── Top row: name + delete ── */}
          <View style={styles.topRow}>
            <Text style={styles.itemName} numberOfLines={2}>{item.item_name}</Text>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => isPacked ? onWarnDelete() : onDelete(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 color={isPacked ? "#D1D5DB" : "#EF4444"} size={17} />
            </TouchableOpacity>
          </View>

          {/* ── Category pill + unique code ── */}
          <View style={styles.metaRow}>
            {item.category ? (
              <View style={styles.categoryPill}>
                <Text style={styles.categoryText} numberOfLines={1}>
                  {item.category}
                </Text>
              </View>
            ) : null}
            {item.unique_id ? (
              <Text style={styles.uniqueCode} numberOfLines={1}>
                {item.unique_id}
              </Text>
            ) : null}
          </View>

          {/* ── Group ── */}
          {item.group ? (
            <Text style={styles.groupText} numberOfLines={1}>
              📦 {item.group}
            </Text>
          ) : null}

          {/* ── Material ── */}
          {item.material_details ? (
            <Text style={styles.materialText} numberOfLines={1}>
              {item.material_details}
            </Text>
          ) : null}

          {/* ── Dimensions + qty ── */}
          <View style={styles.bottomRow}>
            <View style={styles.dimsRow}>
              <DimChip label="L" value={item.L1} />
              <DimChip label="W" value={item.L2} />
              <DimChip label="T" value={item.L3} />
            </View>
            <View style={styles.qtyBlock}>
              <Text style={styles.qtyLabel}>Qty</Text>
              <Text style={styles.qtyValue}>{item.qty}</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Dimension chip ────────────────────────────────────────────────────────────

const DimChip = ({ label, value }: { label: string; value: string }) => (
  <View style={dimStyles.chip}>
    <Text style={dimStyles.label}>{label}</Text>
    <Text style={dimStyles.value}>{value}</Text>
  </View>
);

const dimStyles = StyleSheet.create({
  chip: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 52,
  },
  label: { fontSize: 10, color: "#9CA3AF", fontWeight: "600" },
  value: { fontSize: 13, fontWeight: "700", color: "#111827", marginTop: 1 },
});

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  accent: {
    width: 4,
    backgroundColor: "#2A9D8F",
  },
  body: {
    flex: 1,
    padding: 14,
    gap: 8,
  },

  // Top row
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 20,
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },

  // Meta row
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryPill: {
    backgroundColor: "#DCFCE7",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    maxWidth: 160,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  uniqueCode: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
    flex: 1,
  },
  groupText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  materialText: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "400",
    fontStyle: "italic",
  },

  // Bottom row
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dimsRow: {
    flexDirection: "row",
    gap: 6,
  },
  qtyBlock: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  qtyLabel: { fontSize: 10, color: "#9CA3AF", fontWeight: "600" },
  qtyValue: { fontSize: 18, fontWeight: "800", color: "#111827" },
});
import { MapPin, Navigation } from "lucide-react-native";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface PackagingLocationModalProps {
  visible: boolean;
  locations: string[];
  onSelect: (locationName?: string) => void;
  onClose: () => void;
}

export function PackagingLocationModal({
  visible,
  locations,
  onSelect,
  onClose,
}: PackagingLocationModalProps) {
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
            <View style={styles.headerIcon}>
              <MapPin size={21} color="#1A7A70" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Select Location</Text>
              <Text style={styles.message}>
                Assign scanned items to a location or continue without one.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.option, styles.bypassOption]}
            activeOpacity={0.82}
            onPress={() => onSelect()}
          >
            <View style={styles.optionIcon}>
              <Navigation size={19} color="#1A7A70" />
            </View>
            <View style={styles.optionTextBlock}>
              <Text style={styles.optionTitle}>Continue without location</Text>
              <Text style={styles.optionSubtitle}>
                Pack without assigning a project location.
              </Text>
            </View>
          </TouchableOpacity>

          <FlatList
            data={locations}
            keyExtractor={(locationName) => locationName.toLocaleLowerCase()}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: locationName }) => (
              <TouchableOpacity
                style={styles.option}
                activeOpacity={0.82}
                onPress={() => onSelect(locationName)}
              >
                <View style={styles.optionIcon}>
                  <MapPin size={19} color="#1A7A70" />
                </View>
                <View style={styles.optionTextBlock}>
                  <Text style={styles.optionTitle} numberOfLines={2}>
                    {locationName}
                  </Text>
                  <Text style={styles.optionSubtitle}>
                    Assign scanned items to this location.
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
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
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    maxHeight: "78%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
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
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  headerIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#E6F7F5",
  },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontWeight: "800", color: "#111827" },
  message: { fontSize: 13, lineHeight: 19, color: "#6B7280" },
  list: { marginTop: 14 },
  listContent: { gap: 9, paddingBottom: 4 },
  option: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  bypassOption: {
    marginTop: 14,
    borderColor: "#CDE9E4",
    backgroundColor: "#F0FDFA",
  },
  optionIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#E6F7F5",
  },
  optionTextBlock: { flex: 1 },
  optionTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  optionSubtitle: { marginTop: 2, fontSize: 11, color: "#6B7280" },
  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  cancelText: { fontSize: 14, fontWeight: "700", color: "#374151" },
});

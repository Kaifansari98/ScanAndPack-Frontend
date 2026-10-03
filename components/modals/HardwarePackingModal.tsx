import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import {
  X,
  Search,
  PackagePlus,
  Plus,
  Minus,
  CheckCircle2,
  Clock3,
  Wrench,
  Loader2,
  PackageCheck,
  RefreshCw,
  Box,
  MapPin,
  ChevronDown,
} from "lucide-react-native";
import axios from "@/lib/axios";
import { useToast } from "@/components/Notification/ToastProvider";
import { PackagingLocationModal } from "@/components/modals/PackagingLocationModal";

interface HardwarePackingModalProps {
  visible: boolean;
  onClose: () => void;
  vendorId: number;
  projectId: number;
  projectDetailsId: number | null;
  leadId: number | null;
  userId: number;
  projectName?: string;
  isMultiLocation?: boolean;
  onSuccess: () => void;
}

export function HardwarePackingModal({
  visible,
  onClose,
  vendorId,
  projectId,
  projectDetailsId,
  leadId,
  userId,
  projectName,
  isMultiLocation = false,
  onSuccess,
}: HardwarePackingModalProps) {
  const { showToast } = useToast();
  
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "packed">("pending");
  
  const [packQuantities, setPackQuantities] = useState<Record<number, number>>({});
  const [isPacking, setIsPacking] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>();
  const [projectLocations, setProjectLocations] = useState<string[]>([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!vendorId || !projectId) return;
    setLoading(true);
    try {
      const response = await axios.get(
        "/track-trace/boxes/packing/manual-items",
        {
          params: { vendor_id: vendorId, project_id: projectId },
        }
      );
      setItems(response.data?.data?.items || []);
      setSummary(response.data?.data?.summary || null);
    } catch (error: any) {
      showToast("error", "Failed to fetch hardware items");
    } finally {
      setLoading(false);
    }
  }, [projectId, vendorId]);

  useEffect(() => {
    if (visible) {
      fetchItems();
      setPackQuantities({});
      setSearchQuery("");
      setStatusFilter("pending");
      setSelectedLocation(undefined);
      setShowLocationPicker(false);
    }
  }, [visible, fetchItems]);

  const openLocationPicker = async () => {
    if (loadingLocations) return;

    setLoadingLocations(true);
    try {
      const response = await axios.get(
        `/track-trace-project/onboard/${vendorId}/packaging-project/${projectId}`,
      );
      const locationRows = response.data?.data?.locations;
      const locations = Array.from(
        new Map(
          (Array.isArray(locationRows) ? locationRows : [])
            .map((row: { location_name?: unknown }) =>
              String(row?.location_name ?? "").trim(),
            )
            .filter(Boolean)
            .map((name: string) => [name.toLocaleLowerCase(), name]),
        ).values(),
      ) as string[];

      if (locations.length === 0) {
        showToast("error", "No project locations are configured");
        return;
      }

      setProjectLocations(locations);
      setShowLocationPicker(true);
    } catch (error: any) {
      showToast(
        "error",
        error?.response?.data?.message || "Failed to load project locations",
      );
    } finally {
      setLoadingLocations(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter === "pending" && item.pending_qty <= 0) return false;
      if (statusFilter === "packed" && item.pending_qty > 0) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.item_name?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.material_details?.toLowerCase().includes(q) ||
        item.category_name?.toLowerCase().includes(q) ||
        item.group_name?.toLowerCase().includes(q) ||
        item.unique_code?.toLowerCase().includes(q)
      );
    });
  }, [items, searchQuery, statusFilter]);

  const handleQtyChange = (itemId: number, nextVal: number, maxVal: number) => {
    const validQty = Math.max(0, Math.min(nextVal, maxVal));
    setPackQuantities((prev) => ({
      ...prev,
      [itemId]: validQty,
    }));
  };

  const getItemInputQty = (itemId: number) => {
    return packQuantities[itemId] ?? 0;
  };

  const handlePack = async () => {
    const itemsToPack = items.filter((item) => getItemInputQty(item.id) > 0);
    
    if (itemsToPack.length === 0) {
      showToast("warning", "No items selected. Increase quantity first.");
      return;
    }

    if (isMultiLocation && !selectedLocation) {
      showToast("warning", "Select a location before packing hardware");
      return;
    }

    setIsPacking(true);
    try {
      const fetchBoxesResponse = await axios.get(`/boxes/vendor/v1/${vendorId}/project/${projectId}`, {
        params: { limit: 1 },
      });
      const existingBoxesCount = fetchBoxesResponse.data?.pagination?.total || 0;
      const nextBoxNumber = existingBoxesCount + 1;
      
      const createBoxRes = await axios.post(`/boxes`, {
        project_id: projectId,
        project_details_id: projectDetailsId,
        vendor_id: vendorId,
        lead_id: leadId || null,
        box_name: `${nextBoxNumber}`,
        box_status: "unpacked",
        created_by: userId,
        is_auto_created: true,
        box_info_values: [],
      });
      
      const createdBox = createBoxRes.data?.box;
      if (!createdBox || !createdBox.id) {
        throw new Error("Failed to create target box");
      }

      const targetBoxId = createdBox.id;
      let successCount = 0;

      for (const item of itemsToPack) {
        const qtyToPack = getItemInputQty(item.id);
        if (qtyToPack > 0 && qtyToPack <= item.pending_qty) {
          await axios.post("/track-trace/boxes/packing/manual-items", {
            project_id: projectId,
            vendor_id: vendorId,
            box_id: targetBoxId,
            cut_list_id: item.id,
            qty: qtyToPack,
            user_id: userId,
          });
          successCount++;
        }
      }

      await axios.put(`/boxes/status/packed/${targetBoxId}`, {
        user_id: userId,
        ...(selectedLocation ? { location_name: selectedLocation } : {}),
      });

      showToast(
        "success",
        `Successfully packed ${successCount} item(s) into box "${createdBox.box_name}".`
      );
      
      setPackQuantities({});
      onSuccess();
      onClose();

    } catch (error: any) {
      showToast(
        "error",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Failed to pack items"
      );
    } finally {
      setIsPacking(false);
    }
  };

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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheet}
        >
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Wrench size={22} color="#111827" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Hardware Packing</Text>
              <Text style={styles.subtitle}>
                Auto-creates a box and packs multiple items
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Context Info */}
          <View style={styles.contextRow}>
            <View style={styles.contextChip}>
              <Box size={14} color="#059669" />
              <Text style={styles.contextChipText}>Target Box: Auto-create</Text>
            </View>
            <TouchableOpacity 
              style={styles.refreshBtn} 
              onPress={fetchItems}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#374151" />
              ) : (
                <RefreshCw size={14} color="#374151" />
              )}
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {isMultiLocation && (
            <TouchableOpacity
              style={styles.locationSelector}
              onPress={() => void openLocationPicker()}
              disabled={loadingLocations || isPacking}
            >
              <View style={styles.locationSelectorIcon}>
                <MapPin size={16} color="#047857" />
              </View>
              <View style={styles.locationSelectorText}>
                <Text style={styles.locationSelectorLabel}>Packing Location</Text>
                <Text style={styles.locationSelectorValue}>
                  {selectedLocation || "Select location"}
                </Text>
              </View>
              {loadingLocations ? (
                <ActivityIndicator size="small" color="#047857" />
              ) : (
                <ChevronDown size={18} color="#6B7280" />
              )}
            </TouchableOpacity>
          )}

          {/* Filters */}
          <View style={styles.filterRow}>
            <View style={styles.searchBox}>
              <Search size={16} color="#9CA3AF" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search hardware..."
                placeholderTextColor="#9CA3AF"
                style={styles.searchInput}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <X size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          <View style={styles.tabsRow}>
            {(["pending", "all", "packed"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, statusFilter === tab && styles.tabBtnActive]}
                onPress={() => setStatusFilter(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    statusFilter === tab && styles.tabTextActive,
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* List */}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#111827" />
            </View>
          ) : (
            <FlatList
              data={filteredItems}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.center}>
                  <PackagePlus size={32} color="#D1D5DB" />
                  <Text style={styles.emptyText}>No hardware found</Text>
                </View>
              }
              renderItem={({ item }) => {
                const isFullyPacked = item.pending_qty <= 0;
                const currentQty = getItemInputQty(item.id);

                return (
                  <View style={[styles.card, isFullyPacked && styles.cardDisabled]}>
                    <View style={styles.cardTop}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {item.item_name}
                      </Text>
                      {isFullyPacked ? (
                        <View style={styles.badgeSuccess}>
                          <CheckCircle2 size={12} color="#047857" />
                          <Text style={styles.badgeSuccessText}>Packed</Text>
                        </View>
                      ) : item.packed_qty > 0 ? (
                        <View style={styles.badgeWarn}>
                          <Clock3 size={12} color="#B45309" />
                          <Text style={styles.badgeWarnText}>Partially Packed</Text>
                        </View>
                      ) : null}
                    </View>
                    
                    <Text style={styles.itemDesc} numberOfLines={1}>
                      {item.description || item.material_details || "-"}
                    </Text>
                    
                    <View style={styles.statsRow}>
                      <Text style={styles.statText}>Total: {item.total_qty}</Text>
                      <Text style={styles.statText}>Packed: {item.packed_qty}</Text>
                      <Text style={styles.statTextWarn}>Pending: {item.pending_qty}</Text>
                    </View>

                    {!isFullyPacked && (
                      <View style={styles.stepperRow}>
                        <TouchableOpacity
                          style={styles.stepBtn}
                          onPress={() => handleQtyChange(item.id, currentQty - 1, item.pending_qty)}
                          disabled={currentQty <= 0}
                        >
                          <Minus size={16} color={currentQty > 0 ? "#111827" : "#9CA3AF"} />
                        </TouchableOpacity>
                        <TextInput
                          value={String(currentQty)}
                          onChangeText={(v) => handleQtyChange(item.id, parseInt(v) || 0, item.pending_qty)}
                          keyboardType="numeric"
                          style={styles.qtyInput}
                        />
                        <TouchableOpacity
                          style={styles.stepBtn}
                          onPress={() => handleQtyChange(item.id, currentQty + 1, item.pending_qty)}
                          disabled={currentQty >= item.pending_qty}
                        >
                          <Plus size={16} color={currentQty < item.pending_qty ? "#111827" : "#9CA3AF"} />
                        </TouchableOpacity>
                        
                        {item.pending_qty > 0 && (
                          <TouchableOpacity
                            style={styles.maxBtn}
                            onPress={() => handleQtyChange(item.id, item.pending_qty, item.pending_qty)}
                          >
                            <Text style={styles.maxBtnText}>Max</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              }}
            />
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isPacking}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.submitBtn,
                (isPacking || (isMultiLocation && !selectedLocation)) &&
                  styles.submitBtnDisabled,
              ]} 
              onPress={handlePack}
              disabled={isPacking || (isMultiLocation && !selectedLocation)}
            >
              {isPacking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <PackageCheck size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>
                    {isMultiLocation && !selectedLocation
                      ? "Select Location First"
                      : "Pack Selected"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>

      <PackagingLocationModal
        visible={showLocationPicker}
        locations={projectLocations}
        hideWithoutLocationOption={true}
        onSelect={(locationName) => {
          setSelectedLocation(locationName);
          setShowLocationPicker(false);
        }}
        onClose={() => setShowLocationPicker(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "85%",
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
  },
  contextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  contextChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  contextChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#065F46",
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  locationSelector: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    backgroundColor: "#ECFDF5",
  },
  locationSelectorIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D1FAE5",
  },
  locationSelectorText: {
    flex: 1,
    marginLeft: 10,
  },
  locationSelectorLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#047857",
  },
  locationSelectorValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  filterRow: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#111827",
  },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
  },
  tabBtnActive: {
    backgroundColor: "#111827",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  tabTextActive: {
    color: "#fff",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    color: "#6B7280",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
  },
  cardDisabled: {
    opacity: 0.6,
    backgroundColor: "#F9FAFB",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  badgeSuccess: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  badgeSuccessText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#065F46",
  },
  badgeWarn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  badgeWarnText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#92400E",
  },
  itemDesc: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statText: {
    fontSize: 12,
    color: "#6B7280",
  },
  statTextWarn: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 4,
    alignSelf: "flex-end",
  },
  stepBtn: {
    padding: 8,
  },
  qtyInput: {
    width: 40,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  maxBtn: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  maxBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D9488",
  },
  footer: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  submitBtn: {
    flex: 2,
    flexDirection: "row",
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#111827",
    gap: 8,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});

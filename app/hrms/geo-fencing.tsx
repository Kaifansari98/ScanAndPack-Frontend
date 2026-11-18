import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar as RNStatusBar,
  Modal,
  TextInput,
  Switch,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  MapPinned,
  MapPin,
  Users,
  Plus,
  X,
  Building2,
  HardHat,
  ChevronDown,
  Navigation,
  Search,
  Check,
  UserCheck,
  Edit2,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import axios from "@/lib/axios";
import { LocationMapPickerModal } from "@/components/hrms/LocationMapPickerModal";

function normalizeRole(raw: any): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw.toLowerCase().trim().replace(/[ _]+/g, "-");
  if (typeof raw === "object") {
    return (
      (raw.user_type as string | undefined)?.toLowerCase().trim().replace(/[ _]+/g, "-") ??
      (raw.name as string | undefined)?.toLowerCase().trim().replace(/[ _]+/g, "-") ??
      ""
    );
  }
  return "";
}

const RADIUS_OPTIONS = [
  { label: "50 meters", value: 50 },
  { label: "100 meters (Standard)", value: 100 },
  { label: "200 meters", value: 200 },
  { label: "300 meters", value: 300 },
  { label: "500 meters (Wide)", value: 500 },
  { label: "1000 meters (1 km)", value: 1000 },
];

export default function GeoFencingNativeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const user = useSelector((state: RootState) => state.auth.user);
  const userRole = normalizeRole(user?.user_type);
  const isSuperAdmin = userRole === "super-admin" || (user as any)?.is_super_admin;

  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);

  // Form Fields matching Web UI Exactly
  const [locationName, setLocationName] = useState("");
  const [locationType, setLocationType] = useState<"OFFICE" | "SITE">("OFFICE");
  const [radiusMeters, setRadiusMeters] = useState(100);
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Dropdown selectors
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [radiusDropdownOpen, setRadiusDropdownOpen] = useState(false);

  // Assign Employees Modal State
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assigningLocation, setAssigningLocation] = useState<any | null>(null);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [savingAssignments, setSavingAssignments] = useState(false);

  const safeTop =
    insets.top > 0
      ? insets.top
      : Platform.OS === "ios"
      ? 44
      : RNStatusBar.currentHeight ?? 24;

  const fetchLocations = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await axios.get("/attendance/locations");
      const list = res.data?.data?.locations || res.data?.data || res.data?.locations || [];
      if (Array.isArray(list)) {
        setLocations(list);
      }
    } catch (e) {
      console.log("Error fetching geo-fence locations:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const resetForm = () => {
    setEditingLocation(null);
    setLocationName("");
    setLocationType("OFFICE");
    setRadiusMeters(100);
    setAddress("");
    setLatitude("");
    setLongitude("");
    setIsActive(true);
    setTypeDropdownOpen(false);
    setRadiusDropdownOpen(false);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const handleOpenEditModal = (loc: any) => {
    setEditingLocation(loc);
    setLocationName(loc.name || loc.location_name || "");
    setLocationType(loc.location_type === "SITE" ? "SITE" : "OFFICE");
    setRadiusMeters(loc.radius_meters || loc.radius || 100);
    setAddress(loc.address || "");
    setLatitude(loc.latitude != null ? String(loc.latitude) : "");
    setLongitude(loc.longitude != null ? String(loc.longitude) : "");
    setIsActive(loc.is_active !== false);
    setTypeDropdownOpen(false);
    setRadiusDropdownOpen(false);
    setModalVisible(true);
  };

  const handleOpenAssignModal = async (locationItem: any) => {
    setAssigningLocation(locationItem);
    // Extract existing assignments from location object
    const existingIds: number[] = Array.isArray(locationItem.userAssignments)
      ? locationItem.userAssignments.map((a: any) => a.user_id)
      : [];
    setSelectedUserIds(existingIds);
    setEmployeeSearch("");
    setAssignModalVisible(true);
    setEmployeesLoading(true);

    try {
      const res = await axios.get("/attendance/locations/employees");
      const list = res.data?.data || [];
      if (Array.isArray(list)) {
        setEmployeesList(list);
      }
    } catch (e) {
      console.log("Error fetching employees for assignment:", e);
      Alert.alert("Error", "Could not load employees list.");
    } finally {
      setEmployeesLoading(false);
    }
  };

  const handleToggleEmployee = (id: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllEmployees = () => {
    if (selectedUserIds.length === filteredEmployees.length && filteredEmployees.length > 0) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredEmployees.map((e) => e.id));
    }
  };

  const handleSaveAssignments = async () => {
    if (!assigningLocation) return;
    setSavingAssignments(true);
    try {
      await axios.post("/attendance/locations/assign", {
        location_id: assigningLocation.id,
        user_ids: selectedUserIds,
      });
      Alert.alert(
        "Saved",
        `Successfully assigned ${selectedUserIds.length} employee(s) to ${
          assigningLocation.name || assigningLocation.location_name
        }.`
      );
      setAssignModalVisible(false);
      fetchLocations(true);
    } catch (e: any) {
      console.log("Error saving location assignments:", e);
      Alert.alert("Error", e?.response?.data?.message || "Failed to update assignments.");
    } finally {
      setSavingAssignments(false);
    }
  };

  const filteredEmployees = employeesList.filter((emp) => {
    if (!employeeSearch.trim()) return true;
    const query = employeeSearch.toLowerCase().trim();
    const nameMatch = (emp.user_name || "").toLowerCase().includes(query);
    const emailMatch = (emp.user_email || "").toLowerCase().includes(query);
    const desigMatch = (emp.designation || "").toLowerCase().includes(query);
    return nameMatch || emailMatch || desigMatch;
  });

  const handleCreateLocation = async () => {
    if (!locationName.trim() || locationName.trim().length < 2) {
      Alert.alert("Required Field", "Please enter a valid Location Name (min 2 characters).");
      return;
    }
    if (!address.trim() || address.trim().length < 5) {
      Alert.alert("Required Field", "Please enter a Complete Address (min 5 characters).");
      return;
    }
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      Alert.alert("Invalid Latitude", "Please enter a valid Latitude between -90 and 90.");
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      Alert.alert("Invalid Longitude", "Please enter a valid Longitude between -180 and 180.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: locationName.trim(),
        location_type: locationType,
        address: address.trim(),
        latitude: lat,
        longitude: lng,
        radius_meters: radiusMeters,
        is_active: isActive,
      };

      if (editingLocation) {
        // Update existing location
        const res = await axios.patch(`/attendance/locations/${editingLocation.id}`, payload);
        if (res.data?.success || res.status === 200) {
          Alert.alert("Success", "Geo-Fence Location updated successfully!");
          setModalVisible(false);
          resetForm();
          fetchLocations(true);
        }
      } else {
        // Create new location
        const res = await axios.post("/attendance/locations", payload);
        if (res.data?.success || res.status === 200 || res.status === 201) {
          Alert.alert("Success", "Geo-Fence Location created successfully!");
          setModalVisible(false);
          resetForm();
          fetchLocations(true);
        }
      }
    } catch (e: any) {
      Alert.alert(
        editingLocation ? "Update Failed" : "Creation Failed",
        e?.response?.data?.message || "Could not save location. Please check your inputs."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: safeTop }]}>
      {/* ── Top Header ────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Attendance Geo-Fencing</Text>
          <Text style={styles.headerSub}>Authorized GPS Workspaces</Text>
        </View>

        {/* Top-Right Add Location Button for Super Admin */}
        {isSuperAdmin ? (
          <TouchableOpacity
            style={styles.addLocationBtn}
            onPress={handleOpenAddModal}
            activeOpacity={0.85}
          >
            <Plus size={16} color="#000000" strokeWidth={2.5} />
            <Text style={styles.addLocationBtnText}>Add</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* ── Location List ─────────────────────────────────────── */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4B3A34" />
          <Text style={styles.loadingText}>Loading geo-fence zones...</Text>
        </View>
      ) : (
        <FlatList
          data={locations}
          keyExtractor={(item, index) => String(item.id ?? index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchLocations(true);
              }}
              colors={["#4B3A34"]}
              tintColor="#4B3A34"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MapPinned size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Geo-Fence Locations</Text>
              <Text style={styles.emptySub}>No office or project site boundaries configured.</Text>
              {isSuperAdmin && (
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={handleOpenAddModal}
                  activeOpacity={0.85}
                >
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.emptyActionBtnText}>Create First Location</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const isSite = item.location_type === "SITE";
            return (
              <View style={styles.card}>
                <View style={styles.topRow}>
                  <View style={styles.titleWrap}>
                    <View
                      style={[
                        styles.locTypeIconWrap,
                        isSite ? styles.locTypeSite : styles.locTypeOffice,
                      ]}
                    >
                      {isSite ? (
                        <HardHat size={16} color="#D97706" />
                      ) : (
                        <Building2 size={16} color="#2563EB" />
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.locName}>{item.location_name || item.name || "Site Location"}</Text>
                      <Text style={styles.locTypeLabel}>
                        {isSite ? "Project Site" : "Office / Branch"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.topRightActions}>
                    <View style={styles.radiusPill}>
                      <Text style={styles.radiusText}>{item.radius_meters || item.radius || 100}m Radius</Text>
                    </View>

                    {isSuperAdmin && (
                      <TouchableOpacity
                        style={styles.cardEditBtn}
                        onPress={() => handleOpenEditModal(item)}
                        activeOpacity={0.7}
                      >
                        <Edit2 size={13} color="#475569" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <Text style={styles.addressText} numberOfLines={2}>
                  {item.address || "GPS Coordinate Zone"}
                </Text>

                <View style={styles.divider} />

                <View style={styles.bottomRow}>
                  <View style={styles.coordsBlock}>
                    <Text style={styles.coordLabel}>COORDINATES</Text>
                    <Text style={styles.coordValue}>
                      {Number(item.latitude || 0).toFixed(5)}, {Number(item.longitude || 0).toFixed(5)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.assignedBlock}
                    onPress={() => isSuperAdmin && handleOpenAssignModal(item)}
                    activeOpacity={isSuperAdmin ? 0.7 : 1}
                  >
                    <Users size={12} color={isSuperAdmin ? "#2563EB" : "#64748B"} />
                    <Text style={[styles.assignedText, isSuperAdmin && styles.assignedTextClickable]}>
                      {item.assigned_count ?? item._count?.userAssignments ?? item._count?.assigned_users ?? (Array.isArray(item.userAssignments) ? item.userAssignments.length : 0)} Assigned
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ── Create Geo-Fence Location Modal (Pure React Native UI) ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={styles.modalHeaderIconWrap}>
                  <MapPin size={20} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {editingLocation ? "Edit Geo-Fence Location" : "Create Geo-Fence Location"}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {editingLocation
                      ? `Update coordinates or check-in radius for ${editingLocation.name || editingLocation.location_name}`
                      : "Define coordinates and allowed check-in radius"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formScroll}
            >
              {/* Location Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Location Name <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TextInput
                  placeholder="e.g. Mumbai Head Office or Pune Site Alpha"
                  placeholderTextColor="#94A3B8"
                  style={styles.formInput}
                  value={locationName}
                  onChangeText={setLocationName}
                />
              </View>

              {/* Location Type & Allowed Radius (2 columns) */}
              <View style={[styles.formRow, { zIndex: 100 }]}>
                {/* Location Type */}
                <View style={[styles.formGroup, { flex: 1, zIndex: 100 }]}>
                  <Text style={styles.formLabel}>Location Type</Text>
                  <TouchableOpacity
                    style={styles.dropdownBtn}
                    onPress={() => {
                      setTypeDropdownOpen(!typeDropdownOpen);
                      setRadiusDropdownOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dropdownBtnText}>
                      {locationType === "OFFICE" ? "Office / Branch" : "Project Site"}
                    </Text>
                    <ChevronDown size={14} color="#64748B" />
                  </TouchableOpacity>

                  {typeDropdownOpen && (
                    <View style={styles.dropdownMenu}>
                      <TouchableOpacity
                        style={[
                          styles.dropdownItem,
                          locationType === "OFFICE" && styles.dropdownItemSelected,
                        ]}
                        onPress={() => {
                          setLocationType("OFFICE");
                          setTypeDropdownOpen(false);
                        }}
                      >
                        <Building2 size={14} color="#2563EB" />
                        <Text style={styles.dropdownItemText}>Office / Branch</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.dropdownItem,
                          locationType === "SITE" && styles.dropdownItemSelected,
                        ]}
                        onPress={() => {
                          setLocationType("SITE");
                          setTypeDropdownOpen(false);
                        }}
                      >
                        <HardHat size={14} color="#D97706" />
                        <Text style={styles.dropdownItemText}>Project Site</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Allowed Radius */}
                <View style={[styles.formGroup, { flex: 1, zIndex: 100 }]}>
                  <Text style={styles.formLabel}>Allowed Radius</Text>
                  <TouchableOpacity
                    style={styles.dropdownBtn}
                    onPress={() => {
                      setRadiusDropdownOpen(!radiusDropdownOpen);
                      setTypeDropdownOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dropdownBtnText}>
                      {RADIUS_OPTIONS.find((r) => r.value === radiusMeters)?.label || `${radiusMeters}m`}
                    </Text>
                    <ChevronDown size={14} color="#64748B" />
                  </TouchableOpacity>

                  {radiusDropdownOpen && (
                    <View style={styles.dropdownMenu}>
                      {RADIUS_OPTIONS.map((opt) => (
                        <TouchableOpacity
                          key={opt.value}
                          style={[
                            styles.dropdownItem,
                            radiusMeters === opt.value && styles.dropdownItemSelected,
                          ]}
                          onPress={() => {
                            setRadiusMeters(opt.value);
                            setRadiusDropdownOpen(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{opt.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Complete Address */}
              <View style={styles.formGroup}>
                <View style={styles.labelWithAction}>
                  <Text style={styles.formLabel}>
                    Complete Address <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.pickOnMapBtn}
                    onPress={() => setMapPickerVisible(true)}
                    activeOpacity={0.7}
                  >
                    <MapPin size={13} color="#000000" />
                    <Text style={styles.pickOnMapBtnText}>Pick on Map</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  placeholder="Building name, street, locality, city"
                  placeholderTextColor="#94A3B8"
                  style={styles.formInput}
                  value={address}
                  onChangeText={setAddress}
                />
              </View>

              {/* Latitude & Longitude (2 columns) */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>
                    Latitude <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  <TextInput
                    placeholder="19.0760"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    style={[styles.formInput, styles.fontMono]}
                    value={latitude}
                    onChangeText={setLatitude}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>
                    Longitude <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  <TextInput
                    placeholder="72.8777"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    style={[styles.formInput, styles.fontMono]}
                    value={longitude}
                    onChangeText={setLongitude}
                  />
                </View>
              </View>

              {/* Active Status Card */}
              <View style={styles.statusSwitchCard}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.statusSwitchTitle}>Active Status</Text>
                  <Text style={styles.statusSwitchSubtitle}>
                    Inactive locations cannot be used by employees to mark attendance.
                  </Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: "#E2E8F0", true: "#059669" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.createBtn, submitting && { opacity: 0.7 }]}
                  onPress={handleCreateLocation}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.createBtnText}>
                      {editingLocation ? "Save Changes" : "Create Location"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Interactive Map Picker Modal (Pin Location & Geo-Fence) ── */}
      <LocationMapPickerModal
        visible={mapPickerVisible}
        onClose={() => setMapPickerVisible(false)}
        latitude={parseFloat(latitude) || 19.076}
        longitude={parseFloat(longitude) || 72.8777}
        radiusMeters={radiusMeters}
        address={address}
        onSelect={(res) => {
          setLatitude(String(res.latitude));
          setLongitude(String(res.longitude));
          setAddress(res.address);
        }}
      />

      {/* ── Assign Employees Modal ── */}
      <Modal
        visible={assignModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAssignModalVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.assignModalCard}>
            {/* Header */}
            <View style={styles.assignHeader}>
              <View style={styles.assignHeaderLeft}>
                <View style={styles.assignIconBadge}>
                  <UserCheck size={18} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.assignTitle} numberOfLines={1}>
                    Assign to {assigningLocation?.name || assigningLocation?.location_name || "Location"}
                  </Text>
                  <Text style={styles.assignSubtitle}>
                    Employees allowed to mark attendance at this geo-fence
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setAssignModalVisible(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.assignSearchBar}>
              <Search size={15} color="#94A3B8" />
              <TextInput
                placeholder="Search employee name, email or role..."
                placeholderTextColor="#94A3B8"
                style={styles.assignSearchInput}
                value={employeeSearch}
                onChangeText={setEmployeeSearch}
              />
              {employeeSearch.length > 0 && (
                <TouchableOpacity onPress={() => setEmployeeSearch("")}>
                  <X size={15} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Select All Bar */}
            <View style={styles.assignActionBar}>
              <Text style={styles.assignSelectedCountText}>
                {selectedUserIds.length} employee(s) selected
              </Text>
              <TouchableOpacity onPress={handleSelectAllEmployees} activeOpacity={0.7}>
                <Text style={styles.assignSelectAllBtnText}>
                  {selectedUserIds.length === filteredEmployees.length && filteredEmployees.length > 0
                    ? "Deselect All"
                    : "Select All"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Employee List */}
            {employeesLoading ? (
              <View style={styles.assignLoadingWrap}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.assignLoadingText}>Loading employees...</Text>
              </View>
            ) : filteredEmployees.length === 0 ? (
              <View style={styles.assignEmptyWrap}>
                <Users size={32} color="#CBD5E1" />
                <Text style={styles.assignEmptyText}>No employees found</Text>
              </View>
            ) : (
              <FlatList
                data={filteredEmployees}
                keyExtractor={(item) => String(item.id)}
                style={styles.assignList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isChecked = selectedUserIds.includes(item.id);
                  return (
                    <TouchableOpacity
                      style={[styles.empItemRow, isChecked && styles.empItemRowSelected]}
                      onPress={() => handleToggleEmployee(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.empCheckbox, isChecked && styles.empCheckboxChecked]}>
                        {isChecked && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.empName}>{item.user_name}</Text>
                        <Text style={styles.empMeta} numberOfLines={1}>
                          {[
                            item.designation,
                            item.franchise?.franchise_name,
                            item.user_email,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Employee"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            {/* Modal Footer */}
            <View style={styles.assignFooter}>
              <TouchableOpacity
                style={styles.assignCancelBtn}
                onPress={() => setAssignModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.assignCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.assignSaveBtn, savingAssignments && { opacity: 0.7 }]}
                onPress={handleSaveAssignments}
                disabled={savingAssignments}
                activeOpacity={0.85}
              >
                {savingAssignments ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.assignSaveBtnText}>
                    Save Assignments ({selectedUserIds.length})
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },

  // ── Header ──
  header: {
    backgroundColor: "#4B3A34",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#FFFFFF" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  addLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  addLocationBtnText: {
    color: "#000000",
    fontSize: 13,
    fontWeight: "800",
  },

  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  listContent: { padding: 16, gap: 12, paddingBottom: 30 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#64748B" },
  emptySub: { fontSize: 13, color: "#94A3B8" },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#059669",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  emptyActionBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    gap: 8,
  },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titleWrap: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  locTypeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  locTypeOffice: { backgroundColor: "#EFF6FF" },
  locTypeSite: { backgroundColor: "#FFFBEB" },
  locName: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  locTypeLabel: { fontSize: 11, color: "#64748B" },
  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardEditBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  radiusPill: { backgroundColor: "#FEF2F2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  radiusText: { fontSize: 11, fontWeight: "800", color: "#DC2626" },
  addressText: { fontSize: 12, color: "#64748B", lineHeight: 17 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 4 },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  coordsBlock: { gap: 2 },
  coordLabel: { fontSize: 9, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.5 },
  coordValue: { fontSize: 12, fontWeight: "600", color: "#334155" },
  assignedBlock: { flexDirection: "row", alignItems: "center", gap: 4 },
  assignedText: { fontSize: 12, color: "#64748B", fontWeight: "600" },

  // ── Create Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalCard: {
    width: "100%",
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  modalHeaderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  modalSubtitle: { fontSize: 11, color: "#64748B", marginTop: 1 },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  formScroll: { paddingTop: 14, gap: 14 },
  formGroup: { gap: 6 },
  formRow: { flexDirection: "row", gap: 12 },
  formLabel: { fontSize: 12, fontWeight: "700", color: "#334155" },
  requiredAsterisk: { color: "#EF4444" },
  labelWithAction: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickOnMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 0,
    paddingVertical: 2,
    backgroundColor: "transparent",
  },
  pickOnMapBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000000",
  },
  formInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
  },
  fontMono: { fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },

  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownBtnText: { fontSize: 12, color: "#0F172A", fontWeight: "600" },
  dropdownMenu: {
    position: "absolute",
    top: 66,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  dropdownItemSelected: { backgroundColor: "#F1F5F9" },
  dropdownItemText: { fontSize: 12, color: "#1E293B", fontWeight: "600" },

  statusSwitchCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  statusSwitchTitle: { fontSize: 12, fontWeight: "700", color: "#0F172A" },
  statusSwitchSubtitle: { fontSize: 11, color: "#64748B", lineHeight: 15 },

  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    paddingTop: 10,
    paddingBottom: 6,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  cancelBtnText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  createBtn: {
    backgroundColor: "#000000",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  createBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },

  assignedTextClickable: {
    color: "#2563EB",
    fontWeight: "700",
    textDecorationLine: "underline",
  },

  // ── Assign Modal Styling ──
  assignModalCard: {
    width: "100%",
    maxHeight: "82%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 24,
    gap: 12,
  },
  assignHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  assignHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  assignIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  assignTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  assignSubtitle: { fontSize: 11, color: "#64748B", marginTop: 1 },

  assignSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  assignSearchInput: { flex: 1, fontSize: 12, color: "#0F172A" },

  assignActionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  assignSelectedCountText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  assignSelectAllBtnText: { fontSize: 12, fontWeight: "700", color: "#2563EB" },

  assignList: { maxHeight: 320 },
  empItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 6,
    backgroundColor: "#FFFFFF",
  },
  empItemRowSelected: {
    borderColor: "#93C5FD",
    backgroundColor: "#F0F7FF",
  },
  empCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  empCheckboxChecked: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  empName: { fontSize: 13, fontWeight: "700", color: "#0F172A" },
  empMeta: { fontSize: 11, color: "#64748B", marginTop: 2 },

  assignLoadingWrap: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  assignLoadingText: { fontSize: 12, color: "#64748B" },

  assignEmptyWrap: {
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  assignEmptyText: { fontSize: 12, color: "#94A3B8" },

  assignFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  assignCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  assignCancelBtnText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  assignSaveBtn: {
    backgroundColor: "#000000",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  assignSaveBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
});

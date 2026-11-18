import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { MapPin, Search, Navigation, X, Check } from "lucide-react-native";

interface LocationMapPickerModalProps {
  visible: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  address: string;
  onSelect: (data: { latitude: number; longitude: number; address: string }) => void;
}

export function LocationMapPickerModal({
  visible,
  onClose,
  latitude,
  longitude,
  radiusMeters,
  address,
  onSelect,
}: LocationMapPickerModalProps) {
  const webViewRef = useRef<WebView>(null);
  const [currentLat, setCurrentLat] = useState(latitude || 19.076);
  const [currentLng, setCurrentLng] = useState(longitude || 72.8777);
  const [currentAddress, setCurrentAddress] = useState(address || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [mapLoading, setMapLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      setCurrentLat(latitude || 19.076);
      setCurrentLng(longitude || 72.8777);
      setCurrentAddress(address || "");
      setSearchQuery("");
      setMapLoading(true);
    }
  }, [visible, latitude, longitude, address]);

  // Generate HTML for Leaflet / OpenStreetMap interactive picker
  const [searchLoading, setSearchLoading] = useState(false);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body, html, #map { width: 100%; height: 100%; }
          .leaflet-control-attribution { font-size: 8px; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var lat = ${currentLat};
          var lng = ${currentLng};
          var radius = ${radiusMeters || 100};

          var map = L.map('map', {
            zoomControl: false,
            center: [lat, lng],
            zoom: 16
          });

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);

          // Add Zoom control at bottom right
          L.control.zoom({ position: 'bottomright' }).addTo(map);

          // Custom Red Pin Icon
          var redIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          });

          var marker = L.marker([lat, lng], { draggable: true, icon: redIcon }).addTo(map);
          var circle = L.circle([lat, lng], {
            color: '#059669',
            fillColor: '#10b981',
            fillOpacity: 0.22,
            radius: radius
          }).addTo(map);

          function notifyApp(newLat, newLng) {
            fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + newLat + '&lon=' + newLng)
              .then(res => res.json())
              .then(data => {
                var addr = data && data.display_name ? data.display_name : 'Lat: ' + newLat.toFixed(5) + ', Lng: ' + newLng.toFixed(5);
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  lat: newLat,
                  lng: newLng,
                  address: addr
                }));
              })
              .catch(err => {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  lat: newLat,
                  lng: newLng,
                  address: 'Lat: ' + newLat.toFixed(5) + ', Lng: ' + newLng.toFixed(5)
                }));
              });
          }

          map.on('click', function(e) {
            var newLat = e.latlng.lat;
            var newLng = e.latlng.lng;
            marker.setLatLng([newLat, newLng]);
            circle.setLatLng([newLat, newLng]);
            notifyApp(newLat, newLng);
          });

          marker.on('dragend', function() {
            var pos = marker.getLatLng();
            circle.setLatLng(pos);
            notifyApp(pos.lat, pos.lng);
          });

          // Function callable from React Native
          window.moveToLocation = function(newLat, newLng, newRadius) {
            map.setView([newLat, newLng], 16);
            marker.setLatLng([newLat, newLng]);
            if (newRadius) circle.setRadius(newRadius);
            circle.setLatLng([newLat, newLng]);
          };
        </script>
      </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.lat && data.lng) {
        setCurrentLat(data.lat);
        setCurrentLng(data.lng);
        if (data.address) setCurrentAddress(data.address);
      }
    } catch (e) {
      // Ignored
    }
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearchLoading(true);

    try {
      let foundLat: number | null = null;
      let foundLng: number | null = null;
      let foundAddress = "";

      // 1. Try Nominatim Geocoder with proper headers
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(q)}`,
          {
            headers: {
              Accept: "application/json",
              "User-Agent": "FurnixApp/1.0",
            },
          }
        );
        const nomData = await nomRes.json();
        if (Array.isArray(nomData) && nomData.length > 0) {
          foundLat = parseFloat(nomData[0].lat);
          foundLng = parseFloat(nomData[0].lon);
          foundAddress = nomData[0].display_name || q;
        }
      } catch (nomErr) {
        // Fallback below
      }

      // 2. If not found or blocked, try Photon Geocoder (OSM-based by Komoot, very fast, no strict UA blocks)
      if (foundLat === null || foundLng === null || isNaN(foundLat) || isNaN(foundLng)) {
        try {
          const photonRes = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`
          );
          const photonData = await photonRes.json();
          if (photonData?.features && photonData.features.length > 0) {
            const feat = photonData.features[0];
            const coords = feat.geometry?.coordinates; // [lng, lat]
            if (coords && coords.length >= 2) {
              foundLng = coords[0];
              foundLat = coords[1];
              const p = feat.properties;
              foundAddress = [p.name, p.street, p.city || p.county, p.state, p.country]
                .filter(Boolean)
                .join(", ") || q;
            }
          }
        } catch (photonErr) {
          // Ignored
        }
      }

      if (foundLat !== null && foundLng !== null && !isNaN(foundLat) && !isNaN(foundLng)) {
        setCurrentLat(foundLat);
        setCurrentLng(foundLng);
        setCurrentAddress(foundAddress);
        webViewRef.current?.injectJavaScript(`
          if (typeof window.moveToLocation === 'function') {
            window.moveToLocation(${foundLat}, ${foundLng}, ${radiusMeters || 100});
          }
          true;
        `);
      }
    } catch (e) {
      console.log("Search geocode error:", e);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleConfirm = () => {
    onSelect({
      latitude: Number(currentLat.toFixed(6)),
      longitude: Number(currentLng.toFixed(6)),
      address: currentAddress.trim() || `Lat: ${currentLat.toFixed(5)}, Lng: ${currentLng.toFixed(5)}`,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconWrap}>
                <MapPin size={18} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Pin Location & Geo-Fence</Text>
                <Text style={styles.subtitle}>
                  Click on the map or drag the pin to set center ({radiusMeters}m radius).
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <TextInput
              placeholder="Search office or site address on Google Maps..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={handleSearch}
              disabled={searchLoading}
              activeOpacity={0.8}
            >
              {searchLoading ? (
                <ActivityIndicator size="small" color="#1E293B" />
              ) : (
                <Text style={styles.searchBtnText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Interactive Map View */}
          <View style={styles.mapContainer}>
            <WebView
              ref={webViewRef}
              source={{ html: htmlContent }}
              style={styles.webview}
              onMessage={handleMessage}
              javaScriptEnabled
              domStorageEnabled
              onLoadEnd={() => setMapLoading(false)}
            />
            {mapLoading && (
              <View style={styles.mapLoader}>
                <ActivityIndicator size="large" color="#059669" />
                <Text style={styles.mapLoaderText}>Loading interactive map...</Text>
              </View>
            )}
          </View>

          {/* Coordinates & Selected Address Footer Details */}
          <View style={styles.infoRow}>
            <View style={styles.coordBox}>
              <Text style={styles.infoLabel}>Latitude / Longitude:</Text>
              <Text style={styles.coordText}>
                {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
              </Text>
            </View>

            <View style={styles.addressBox}>
              <Text style={styles.infoLabel}>Selected Address:</Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {currentAddress || "Custom pin coordinates"}
              </Text>
            </View>
          </View>

          {/* Action Buttons matching web UI */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
              <Check size={16} color="#000000" strokeWidth={2.5} />
              <Text style={styles.confirmBtnText}>Set Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  modalCard: {
    width: "100%",
    height: "86%",
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
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 11, color: "#64748B", marginTop: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
    gap: 6,
  },
  searchInput: { flex: 1, fontSize: 13, color: "#0F172A" },
  searchBtn: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchBtnText: { fontSize: 12, fontWeight: "700", color: "#1E293B" },

  mapContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  webview: { flex: 1 },
  mapLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  mapLoaderText: { fontSize: 12, color: "#64748B", fontWeight: "600" },

  infoRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  coordBox: { flex: 1, gap: 2 },
  addressBox: { flex: 1.5, gap: 2 },
  infoLabel: { fontSize: 10, fontWeight: "700", color: "#94A3B8" },
  coordText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  addressText: { fontSize: 11, color: "#475569", lineHeight: 15 },

  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    paddingTop: 4,
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
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: "#CBD5E1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  confirmBtnText: { fontSize: 13, fontWeight: "700", color: "#000000" },
});

import { useToast } from "@/components/Notification/ToastProvider";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { X, Flashlight, FlashlightOff, Focus } from "lucide-react-native";
import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Dimensions,
  Animated,
  StatusBar,
} from "react-native";
import { useSelector } from "react-redux";

const { width, height } = Dimensions.get("window");
const scanAreaSize = width * 0.7;

export default function BarcodeScanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [hasFlash, setHasFlash] = useState(false);
  const [flashMode, setFlashMode] = useState(false);
  const [scanned, setScanned] = useState(false);
  const router = useRouter();
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  const { showToast } = useToast();
  const {vendor_id } = useSelector((state: any) => state.auth.user)
 

  React.useEffect(() => {
    const startScanAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnimation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startScanAnimation();
  }, []);

  const handleBarCodeScanned = ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    if (scanned) return;

    setScanned(true);
    console.log("Scanned data:", data);
    console.log("Scan type:", type);
    // Clean and split the data by comma
    const cleanData = data.replace(/"/g, "").trim();
    const parts = cleanData.split(",").map((part) => part.trim());


   const scannedVendorId = Number(parts[0])
   console.log(scannedVendorId, vendor_id)
   if(scannedVendorId !== vendor_id){
      showToast("error", "Barcode Scanned Failed");
      router.back();
      return;
   } 
   
    try {

      if (parts.length === 3) {
        // ✅ Case 1: vendor_id, project_id, client_id → redirect to Boxes screen
        const [vendor_id, id, client_id] = parts;

        router.replace({
          pathname: "/dashboards/boxes",
          params: {
            vendor_id,
            id,
            client_id,
          },
        });
        return;
      }

      if (parts.length === 4) {
        // ✅ Case 2: vendor_id, project_id, client_id, id → redirect to BoxItems screen
        const [vendor_id, project_id, client_id, id] = parts;
      

        const payload = {
          vendor_id: Number(vendor_id),
          project_id: Number(project_id),
          client_id: Number(client_id),
          id: Number(id),
        };


        router.replace({
          pathname: "/dashboards/boxItemsScreen",
          params: {
            payload: JSON.stringify(payload),
          },
        });
        return;
      }

      // ❌ If neither format matched
      throw new Error("Invalid QR format");
    } catch (err) {
      console.log("Failed to parse scanned data:", err);
      showToast('error',`Scanned Failed`)
      router.back()
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text className="text-white text-3xl">Requesting camera permission...</Text>
      </View>
    );
  }



  const scanLineTranslateY = scanLineAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, scanAreaSize - 4],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />

      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={flashMode}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: [
            "qr",
            "ean13",
            "ean8",
            "code39",
            "code128",
            "upc_a",
            "upc_e",
            "codabar",
            "code93",
            "itf14",
            "datamatrix",
            "pdf417",
          ],
        }}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            console.log("Close button pressed");
            router.back();
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Code</Text>
        <TouchableOpacity
          style={styles.flashButton}
          onPress={() => {
            setFlashMode(!flashMode);
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {flashMode ? (
            <FlashlightOff size={28} color="white" />
          ) : (
            <Flashlight size={28} color="white" />
          )}
        </TouchableOpacity>
      </View>

      {/* Scan Area Overlay */}
      <View style={styles.overlay}>
        {/* Top Overlay */}
        <View style={[styles.overlaySection, styles.topOverlay]} />

        <View style={styles.middleSection}>
          {/* Left Overlay */}
          <View style={[styles.overlaySection, styles.sideOverlay]} />

          {/* Scan Area */}
          <View style={styles.scanArea}>
            {/* Corner Indicators */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Animated Scan Line */}
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [{ translateY: scanLineTranslateY }],
                },
              ]}
            />
          </View>

          {/* Right Overlay */}
          <View style={[styles.overlaySection, styles.sideOverlay]} />
        </View>

        {/* Bottom Overlay */}
        <View style={[styles.overlaySection, styles.bottomOverlay]} />
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Focus size={24} color="white" style={styles.focusIcon} />
        <Text style={styles.instructions}>
          Position the barcode or QR code within the frame
        </Text>
        <Text style={styles.subInstructions}>
          The scan will happen automatically
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  camera: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 25,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "600",
  },
  flashButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  overlaySection: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  topOverlay: {
    width: "100%",
    height: (height - scanAreaSize) / 2,
  },
  bottomOverlay: {
    width: "100%",
    height: (height - scanAreaSize) / 2,
  },
  middleSection: {
    flexDirection: "row",
    width: "100%",
    height: scanAreaSize,
  },
  sideOverlay: {
    width: (width - scanAreaSize) / 2,
    height: "100%",
  },
  scanArea: {
    width: scanAreaSize,
    height: scanAreaSize,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#007AFF",
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "#007AFF",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  instructionsContainer: {
    position: "absolute",
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 40,
  },
  focusIcon: {
    marginBottom: 10,
  },
  instructions: {
    color: "white",
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 8,
  },
  subInstructions: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    textAlign: "center",
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
    color: "white",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: "black",
  },
  permissionTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  permissionMessage: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

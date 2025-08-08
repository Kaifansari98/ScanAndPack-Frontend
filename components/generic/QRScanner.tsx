import {
  CameraView,
  PermissionStatus,
  useCameraPermissions,
} from 'expo-camera';
import { X, Flashlight, FlashlightOff, Focus } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  Animated,
} from 'react-native';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

const { width, height } = Dimensions.get("window");
const scanAreaSize = width * 0.7;

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [scanned, setScanned] = useState(false);
  const [flashMode, setFlashMode] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanLineAnimation = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (permission?.status !== PermissionStatus.GRANTED) {
      requestPermission();
    }
  }, [permission]);

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

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (!scanned) {
      setScanned(true);
      onScan(data); // this will log the data and close scanner from parent
    }
  };

  const handlePermissionRetry = async () => {
    await requestPermission();
  };

  // Render permission loading
  if (!permission || permission.status === PermissionStatus.UNDETERMINED) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionMessage}>
          Requesting camera permission...
        </Text>
      </View>
    );
  }

  // Render permission denied
  if (permission.status === PermissionStatus.DENIED) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionMessage}>
          We need access to your camera to scan barcodes and QR codes
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={handlePermissionRetry}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
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
          onPress={onClose}
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
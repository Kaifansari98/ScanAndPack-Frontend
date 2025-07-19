import {
  CameraView,
  PermissionStatus,
  useCameraPermissions,
} from 'expo-camera';
import { ScanLine, XCircle } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [scanned, setScanned] = useState(false);
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();

  React.useEffect(() => {
    if (permission?.status !== PermissionStatus.GRANTED) {
      requestPermission();
    }
  }, [permission]);

  // Animation values
  const frameOpacity = useSharedValue(0);
  const frameScale = useSharedValue(1);
  const scanLinePosition = useSharedValue(0);
  const buttonScaleClose = useSharedValue(1);
  const buttonScaleScan = useSharedValue(1);

  // Animate on mount
  React.useEffect(() => {
    frameOpacity.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.exp),
    });
    frameScale.value = withRepeat(
      withTiming(1.03, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    scanLinePosition.value = withRepeat(
      withSequence(
        withTiming(frameSize - 10, { duration: 2000, easing: Easing.linear }),
        withTiming(0, { duration: 0 })
      ),
      -1
    );
  }, []);

  const animatedFrameStyle = useAnimatedStyle(() => ({
    opacity: frameOpacity.value,
    transform: [{ scale: frameScale.value }],
  }));

  const animatedScanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLinePosition.value }],
  }));

  const animatedButtonStyleClose = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScaleClose.value }],
  }));

  const animatedButtonStyleScan = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScaleScan.value }],
  }));

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
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Requesting camera permission...
        </Text>
      </View>
    );
  }

  // Render permission denied
  if (permission.status === PermissionStatus.DENIED) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.permissionText}>
          Camera access is required to scan QR codes and barcodes.
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handlePermissionRetry}
          style={styles.permissionButton}
        >
          <View style={styles.button}>
            <Text style={styles.buttonText}>
              Grant Permission
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      <View style={styles.overlay} />
      <Animated.View style={[styles.scanFrame, animatedFrameStyle]}>
        <View style={styles.frameBorder} />
        <View style={styles.frameInner} />
        <Animated.View style={[styles.scanLine, animatedScanLineStyle]} />
        <View style={styles.frameCorners}>
          {[styles.corner0, styles.corner1, styles.corner2, styles.corner3].map((cornerStyle, i) => (
            <View key={i} style={[styles.corner, cornerStyle]} />
          ))}
        </View>
      </Animated.View>
      <View style={styles.buttonContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onClose}
            onPressIn={() => {
              buttonScaleClose.value = withTiming(0.95, { duration: 100 });
            }}
            onPressOut={() => {
              buttonScaleClose.value = withTiming(1, { duration: 100 });
            }}
            style={styles.buttonWrapper}
          >
            <Animated.View style={[animatedButtonStyleClose, styles.button]}>
              <ScanLine size={22} color="#fff" />
              <Text style={styles.buttonText}>
                Close Scanner
              </Text>
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');
const frameSize = Math.min(width * 0.75, height * 0.45);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 1,
  },
  scanFrame: {
    width: frameSize,
    height: frameSize,
    borderRadius: 24,
    overflow: 'hidden',
    zIndex: 2,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 20,
  },
  frameBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#3b82f6',
  },
  frameInner: {
    ...StyleSheet.absoluteFillObject,
    margin: 3,
    backgroundColor: 'transparent',
    borderRadius: 21,
  },
  scanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: '#3b82f6',
    opacity: 0.8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  frameCorners: {
    ...StyleSheet.absoluteFillObject,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#fff',
    borderWidth: 3,
  },
  corner0: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  corner1: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  corner2: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  corner3: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    zIndex: 3,
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    width: '90%',
    maxWidth: 400,
  },
  buttonWrapper: {
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e3a8a',
  },
  loadingText: {
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 18,
    textAlign: 'center',
    paddingHorizontal: 24,
    opacity: 0.9,
  },
  permissionText: {
    color: '#fff',
    fontFamily: 'Montserrat-Medium',
    fontSize: 18,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
    opacity: 0.9,
  },
  permissionButton: {
    borderRadius: 999,
    overflow: 'hidden',
  },
});
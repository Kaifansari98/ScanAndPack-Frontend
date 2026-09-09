import data from "@/data/welcomeData";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  PanResponder,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

interface ScreenItem {
  id: number;
  animation: any;
  text: string;
}

const SCREENS: ScreenItem[] = [
  {
    id: 1,
    animation: require("../../assets/animations/lottieview1.json"),
    text: "Manage your production line with ease",
  },
  {
    id: 2,
    animation: require("../../assets/animations/lottieview2.json"),
    text: "Scan QR codes to track items instantly",
  },
  {
    id: 3,
    animation: require("../../assets/animations/lottieview3.json"),
    text: "Pack boxes and generate labels fast",
  },
];

export default function WelcomeScreen() {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState<number>(1);
  const currentScreenRef = useRef(1);

  const translateX = useSharedValue(0);

  useEffect(() => {
    currentScreenRef.current = currentScreen;
    translateX.value = withSpring(-(currentScreen - 1) * SCREEN_WIDTH, {
      damping: 24,
      stiffness: 140,
      mass: 0.8,
    });
  }, [currentScreen, SCREEN_WIDTH]);

  const isLastScreen = currentScreen === 3;

  const handleNext = () => {
    if (currentScreenRef.current === 1) {
      setCurrentScreen(2);
    } else if (currentScreenRef.current === 2) {
      setCurrentScreen(3);
    } else {
      router.replace("/auth/login");
    }
  };

  const handlePrev = () => {
    if (currentScreenRef.current === 3) {
      setCurrentScreen(2);
    } else if (currentScreenRef.current === 2) {
      setCurrentScreen(1);
    }
  };

  const handleSkip = () => {
    router.replace("/auth/login");
  };

  // PanResponder to detect finger swipe gestures reliably
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 20 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        );
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -40) {
          // Swiped left -> Next
          handleNext();
        } else if (gestureState.dx > 40) {
          // Swiped right -> Prev
          handlePrev();
        }
      },
    })
  ).current;

  const animatedSliderStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header with Skip button */}
      <View style={styles.topBar}>
        {!isLastScreen ? (
          <TouchableOpacity
            onPress={handleSkip}
            style={styles.skipButton}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ height: 28 }} />
        )}
      </View>

      {/* Swipeable & Animated 3-Slide Container */}
      <View style={styles.carouselViewport} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.carouselTrack,
            { width: SCREEN_WIDTH * SCREENS.length },
            animatedSliderStyle,
          ]}
        >
          {SCREENS.map((screenData) => (
            <View
              key={screenData.id}
              style={[styles.slideContainer, { width: SCREEN_WIDTH }]}
            >
              <View style={styles.animationWrapper}>
                <LottieView
                  source={screenData.animation}
                  style={{
                    width: SCREEN_WIDTH * 0.85,
                    height: SCREEN_WIDTH * 0.85,
                  }}
                  autoPlay
                  loop
                />
              </View>
              <View style={styles.textWrapper}>
                <Text style={styles.title}>{screenData.text}</Text>
              </View>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Bottom Bar: 3 Dots & Next/Get Started Button */}
      <View style={styles.bottomContainer}>
        {/* 3 Step Dots */}
        <View style={styles.paginationContainer}>
          {SCREENS.map((s) => {
            const isActive = s.id === currentScreen;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => setCurrentScreen(s.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.dot,
                    isActive ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Action Button: Arrow on screen 1 & 2, 'Get Started' on screen 3 */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleNext}
          style={[
            styles.actionButton,
            isLastScreen ? styles.buttonExpanded : styles.buttonCircle,
          ]}
        >
          {isLastScreen ? (
            <Text style={styles.textButton}>Get Started</Text>
          ) : (
            <Image
              source={require("../../assets/images/ArrowIcon.png")}
              style={styles.arrow}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  carouselViewport: {
    flex: 1,
    overflow: "hidden",
  },
  carouselTrack: {
    flex: 1,
    flexDirection: "row",
  },
  slideContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  animationWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
  },
  textWrapper: {
    width: "100%",
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "700",
    color: "#000000",
    textAlign: "left",
  },
  bottomContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingBottom: 64,
    paddingTop: 12,
    backgroundColor: "#ffffff",
  },
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: "#000000",
  },
  dotInactive: {
    width: 8,
    backgroundColor: "#d1d5db",
  },
  actionButton: {
    backgroundColor: "#000000",
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  buttonCircle: {
    width: 54,
  },
  buttonExpanded: {
    paddingHorizontal: 28,
  },
  arrow: {
    width: 20,
    height: 20,
    tintColor: "#ffffff",
  },
  textButton: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});

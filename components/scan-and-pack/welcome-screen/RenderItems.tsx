import { OnboardingData } from "@/data/welcomeData";
import LottieView from "lottie-react-native";
import React from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

type Props = {
  item: OnboardingData;
  index?: number;
};

export default function RenderItems({ item }: Props) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  return (
    <View style={[styles.itemContainer, { width: SCREEN_WIDTH }]}>
      <View style={styles.animationContainer}>
        <LottieView
          source={item.animation}
          style={{ width: SCREEN_WIDTH * 0.85, height: SCREEN_WIDTH * 0.85 }}
          autoPlay
          loop
        />
      </View>
      <View style={styles.textContainer}>
        <Text
          style={[styles.title, { color: item.textColor || "#000000" }]}
        >
          {item.text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  itemContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 60,
    backgroundColor: "#ffffff",
  },
  animationContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  textContainer: {
    width: "100%",
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "700",
    textAlign: "left",
  },
});

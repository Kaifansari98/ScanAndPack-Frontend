import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import React, { useEffect } from "react";
import LottieView from "lottie-react-native";

const Loader = () => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  return (
    <View style={styles.container}>
      <LottieView
        source={require("../../assets/animations/Loader.json")}
        autoPlay
        style={{ width: SCREEN_WIDTH * 0.9, height: SCREEN_WIDTH * 0.9 }}
        loop
      />
    </View>
  );
};

export default Loader;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

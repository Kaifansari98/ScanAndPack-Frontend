import React, { RefObject } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { SharedValue } from "react-native-reanimated";
import { OnboardingData } from "../../../data/welcomeData";

type Props = {
  dataLength: number;
  flatListIndex: SharedValue<number>;
  flatListRef: RefObject<FlatList<OnboardingData> | null>;
  currentIndex: number;
  onNext: () => void;
};

const CustomButton = ({
  dataLength,
  currentIndex,
  onNext,
}: Props) => {
  const isLast = currentIndex >= dataLength - 1;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onNext}
      style={[
        styles.container,
        isLast ? styles.buttonExpanded : styles.buttonCircle,
      ]}
    >
      {isLast ? (
        <Text style={styles.textButton}>Get Started</Text>
      ) : (
        <Image
          source={require("../../../assets/images/ArrowIcon.png")}
          style={styles.arrow}
          resizeMode="contain"
        />
      )}
    </TouchableOpacity>
  );
};

export default CustomButton;

const styles = StyleSheet.create({
  container: {
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

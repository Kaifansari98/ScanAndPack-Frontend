import { OnboardingData } from "@/data/data";
import { Text, View, StyleSheet } from "react-native";

type Props = {
  item: OnboardingData;
  index: number;
};

export default function RenderItems({ item, index }: Props) {
  return (
    <View>
      <Text>Render Items</Text>
    </View>
  );
}

const styles = StyleSheet.create({});

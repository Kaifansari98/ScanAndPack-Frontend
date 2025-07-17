import { Text, View, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import data from "@/data/data";
import RenderItems from "@/components/scan-and-pack/welcome-screen/RenderItems";
export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Animated.FlatList
        data={data}
        renderItem={({ item, index }) => {
          return <RenderItems item={item} index={index} />;
        }}
        keyExtractor={(item) => item.id.toString()}
        scrollEventThrottle={16}
        horizontal={true}
        bounces={false}
        pagingEnabled={true}
        showsHorizontalScrollIndicator={false}
        // onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{
          minimumViewTime: 300,
          viewAreaCoveragePercentThreshold: 10,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

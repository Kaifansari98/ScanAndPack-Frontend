import CustomeButton from "@/components/scan-and-pack/welcome-screen/CustomeButton";
import Pagination from "@/components/scan-and-pack/welcome-screen/Pagination";
import RenderItems from "@/components/scan-and-pack/welcome-screen/RenderItems";
import data, { OnboardingData } from "@/data/welcomeData";
import { useRef } from "react";
import { FlatList, StyleSheet, View, ViewToken } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";

export default function WelcomeScreen() {
  const flatListRef = useRef<FlatList<OnboardingData>>(null);

  const x = useSharedValue(0);
  const flatListIndex = useSharedValue(0);

  const onViewableItemsChanged = ({
    viewableItems,
  }: {
    viewableItems: ViewToken[];
  }) => {
    if (viewableItems && viewableItems.length > 0) {
      const firstItem = viewableItems[0];
      if (firstItem?.index != null) {
        flatListIndex.value = firstItem.index;
      }
    }
  };

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      x.value = event.contentOffset.x;
    },
  });

  return (
    <View style={styles.container}>
      <Animated.FlatList<OnboardingData>
        data={data}
        ref={flatListRef as any}
        renderItem={({ item, index }) => (
          <RenderItems item={item} index={index} x={x} />
        )}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{
          minimumViewTime: 300,
          viewAreaCoveragePercentThreshold: 10,
        }}
      />

      <View style={styles.bottomContainer}>
        <Pagination data={data} x={x} />
        <CustomeButton
          dataLength={data.length}
          flatListIndex={flatListIndex}
          flatListRef={flatListRef}
          x={x}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bottomContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 30,
    paddingVertical: 30,
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
  },
});
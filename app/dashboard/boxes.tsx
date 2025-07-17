import Navbar from '@/components/generic/Navbar';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
// import { RouteProp, useRoute } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';

// Define Project interface
interface Project {
  projectName: string;
  totalNoItems: number;
  unpackedItems: number;
  packedItems: number;
  status: 'packed' | 'unpacked';
  date: string;
}

export default function BoxesScreen() {
  const { project: projectString } = useLocalSearchParams<{ project: string }>();
  const project = JSON.parse(projectString) as Project;

  // Animation values
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);

  // Trigger animations on mount
  useEffect(() => {
    cardOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
    cardTranslateY.value = withSpring(0, {
      damping: 15,
      stiffness: 120,
    });
  }, []);

  // Animated styles
  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  return (
    <View className="flex-1 bg-sapLight-background">
      <Navbar title={project.projectName} showBack={true} showSearch={true}/>
      <View className="flex-1 px-kpx py-6">
        <Animated.View style={[animatedCardStyle, styles.cardContainer]}>
          <View className="bg-sapLight-card w-full rounded-3xl p-5 border border-gray-100">
          <View className="flex-row justify-between items-center mb-4">
  <View
    className={`rounded-full px-3 py-1 ${
      project.status === 'packed' ? 'bg-green-100' : 'bg-red-100'
    }`}
  >
    <Text
      className={`text-sm font-montserrat-semibold ${
        project.status === 'packed' ? 'text-green-700' : 'text-red-700'
      }`}
    >
      {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
    </Text>
  </View>
  <View>
    <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
      {project.date}
    </Text>
  </View>
</View>
<View className="w-full flex-row items-center justify-between mb-4">
  <Text className="text-sapLight-text font-montserrat-bold text-xl flex-1">
    {project.projectName}
  </Text>
</View>
<View className="flex-row justify-between items-center">
  <View>
    <Text className="text-sapLight-text font-montserrat-medium text-sm">
      Total Items
    </Text>
    <Text className="text-sapLight-text font-montserrat-semibold text-xl">
      {project.totalNoItems.toLocaleString()}
    </Text>
  </View>
  <View className="flex-row space-x-6 gap-4">
    <View className="flex-col items-center">
      <View className="flex-row items-center">
        <View className="w-2 h-2 rounded-full mr-2 bg-green-400" />
        <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
          Packed
        </Text>
      </View>
      <View>
        <Text className="text-sapLight-text font-montserrat-semibold text-base">
          {project.packedItems.toLocaleString()}
        </Text>
      </View>
    </View>
    <View className="items-center flex-col">
      <View className="flex-row items-center">
        <View className="w-2 h-2 rounded-full mr-2 bg-red-400" />
        <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
          Unpacked
        </Text>
      </View>
      <View>
        <Text className="text-sapLight-text font-montserrat-semibold text-base">
          {project.unpackedItems.toLocaleString()}
        </Text>
      </View>
    </View>
  </View>
</View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
});
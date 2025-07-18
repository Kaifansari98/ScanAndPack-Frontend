import Navbar from '@/components/generic/Navbar';
import { AddBoxModal } from '@/components/modals/AddBoxModal';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowUpRight, Download, Plus } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

// Define Project interface
interface Project {
  projectName: string;
  totalNoItems: number;
  unpackedItems: number;
  packedItems: number;
  status: 'packed' | 'unpacked';
  date: string;
}

// Define Box interface
interface Box {
  name: string;
  items: {
    [product: string]: {
      status: string;
      qty: number;
      name: string;
      category: string;
      unitId: string;
      ls: {
        l1: number;
        l2: number;
        l3: number;
      };
    };
  }[];
}

// Sample boxes data
const initialBoxes: Box[] = [
  {
    name: 'Faraz Dining Table',
    items: [
      {
        'Product 1': {
          status: 'Box Closed',
          qty: 10,
          name: 'Smartphone with Cases',
          category: 'Mobile Phone',
          unitId: 'SP001',
          ls: { l1: 2300, l2: 5600, l3: 6799 },
        },
      },
    ],
  },
  {
    name: 'Musical Instruments',
    items: [
      {
        'Product 1': {
          status: 'In Progress',
          qty: 25,
          name: 'T-Shirts',
          category: 'Clothing',
          unitId: 'TS002',
          ls: { l1: 1500, l2: 3200, l3: 4500 },
        },
      },
    ],
  },
  {
    name: 'Furniture Essentials',
    items: [
      {
        'Product 1': {
          status: 'Box Closed',
          qty: 15,
          name: 'Novels',
          category: 'Books',
          unitId: 'NV003',
          ls: { l1: 1000, l2: 2000, l3: 3000 },
        },
      },
    ],
  },
  {
    name: 'Wardrobe Essentials',
    items: [
      {
        'Product 1': {
          status: 'In Progress',
          qty: 5,
          name: 'Chairs',
          category: 'Furniture',
          unitId: 'CH004',
          ls: { l1: 5000, l2: 7500, l3: 9000 },
        },
      },
    ],
  },
  {
    name: 'Office Products',
    items: [
      {
        'Product 1': {
          status: 'Box Closed',
          qty: 8,
          name: 'Microwaves',
          category: 'Kitchen',
          unitId: 'MW005',
          ls: { l1: 3000, l2: 6000, l3: 8000 },
        },
      },
    ],
  },
];

// Box Card Component
function BoxCard({ box, index }: { box: Box; index: number }) {
  const router = useRouter();
  // Animation values
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);
  const scale = useSharedValue(1);

  const status = box.items[0]['Product 1'].status;
  const bgClass =
    status === 'Box Closed' ? 'bg-green-100' : status === 'In Progress' ? 'bg-orange-100' : 'bg-gray-200';
  const textClass =
    status === 'Box Closed' ? 'text-green-700' : status === 'In Progress' ? 'text-yellow-800' : 'text-gray-700';

  // Trigger animations on mount
  useEffect(() => {
    cardOpacity.value = withDelay(index * 100, withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    }));
    cardTranslateY.value = withDelay(index * 100, withSpring(0, {
      damping: 15,
      stiffness: 120,
    }));
  }, [index]);

  // Animated styles
  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }, { scale: scale.value }],
  }));

  const handleNavigate = () => {
    router.push({
      pathname: './boxItemsScreen',
      params: { box: JSON.stringify(box) },
    });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPressIn={() => {
        scale.value = withSpring(0.98);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
    >
      <Animated.View style={[animatedCardStyle, styles.cardContainer]}>
        <LinearGradient
          colors={['#ffffff', '#f8fafc']}
          style={styles.cardGradient}
        >
          <View className="w-full p-5">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-sapLight-text font-montserrat-bold text-xl flex-1">
                {box.name}
              </Text>
              <View className={`rounded-full px-3 py-1 ${bgClass}`}>
                <Text className={`font-montserrat-semibold text-xs ${textClass}`}>
                  {status}
                </Text>
              </View>
            </View>
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-sapLight-infoText font-montserrat-medium text-sm mb-1">
                  Items Count
                </Text>
                <Text className="text-sapLight-text font-montserrat-semibold text-2xl">
                  {box.items.length}
                </Text>
              </View>
              <View className='h-full flex-row items-end gap-2'>
                <View className='p-2 bg-sapLight-card rounded-xl'>
                  <Download color={'#555555'} size={20} />
                </View>
                <TouchableOpacity
                  onPress={handleNavigate}
                  className='p-2 bg-sapLight-card rounded-xl'
                >
                  <ArrowUpRight color={'#555555'} size={20} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function BoxesScreen() {
  const { project: projectString } = useLocalSearchParams<{ project: string }>();
  const project = JSON.parse(projectString) as Project;

  const sheetRef = useRef<BottomSheetModal>(null);
  const [boxes, setBoxes] = useState<Box[]>(initialBoxes);

  // Animation values for project card
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);
  const titleOpacity = useSharedValue(0);

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
    titleOpacity.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const onAdd = useCallback((name: string) => {
    console.log('Added box:', name);
    setBoxes(prev => [...prev, { name, items: [] }]);
  }, []);

  // Animated styles for project card
  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  // Animated styles for title
  const animatedTitleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const addButtonScale = useSharedValue(1);
  const animatedAddButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addButtonScale.value }],
  }));

  return (
    <View className="flex-1 bg-sapLight-background">
      <Navbar title={project.projectName} showBack={true} showSearch={true} />
      <View className="flex-1 mx-5 py-6">
        {/* Project Card */}
        <Animated.View style={[animatedCardStyle, styles.cardContainerr]}>
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
            <View className="flex-row justify KNOWN ISSUE: justify-between items-center">
              <View>
                <Text className="text-sapLight-infoText font-montserrat-medium text-sm">
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

        {/* Boxes Section */}
        <View className="mt-6 bg-white/50 rounded-2xl pb-72">
          <Animated.View style={animatedTitleStyle}>
            <Text className="text-sapLight-text font-montserrat-semibold text-3xl mb-4 pb-2">
              Boxes
            </Text>
          </Animated.View>
          <FlatList
            data={boxes}
            renderItem={({ item, index }) => <BoxCard box={item} index={index} />}
            keyExtractor={(item) => item.name}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
      <View className="absolute bottom-8 left-5 right-5">
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => sheetRef.current?.present()}
          onPressIn={() => {
            addButtonScale.value = withSpring(0.95);
          }}
          onPressOut={() => {
            addButtonScale.value = withSpring(1);
          }}
        >
          <Animated.View style={animatedAddButtonStyle}>
            <LinearGradient
              colors={['#000000', '#222222']}
              style={styles.addButton}
            >
              <Plus size={28} color="#fff" />
              <Text className="text-white font-montserrat-bold text-lg ml-3">
                Add Box
              </Text>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </View>
      <AddBoxModal ref={sheetRef} onSubmit={onAdd} />
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainerr: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 16,
  },
  cardContainer: {
    marginBottom: 16,
  },
  cardGradient: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  listContainer: {
    paddingBottom: 80,
    paddingHorizontal: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
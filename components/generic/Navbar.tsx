import { useRouter } from 'expo-router';
import { Bell, ChevronLeft, Search } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type NavbarProps = {
  title: string;
  showBack?: boolean;
  showSearch?: boolean;
  showNotification?: boolean;
  showPack?: boolean;
  onPackPress?: () => void;
  boxStatus?: string;
};

export default function Navbar({
  title,
  showBack = false,
  showSearch = false,
  showNotification = false,
  showPack = false,
  onPackPress,
  boxStatus = "Mark as packed"
}: NavbarProps) {
  const router = useRouter();

  return (
    <View
      className="bg-sapLight-background w-full px-5 py-4 flex-row items-center justify-between border-b border-gray-100"
      style={styles.container}
    >
      {/* Back Icon and Title */}
      <View className="flex-row items-center flex-1">
        {showBack && (
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={24} color="#171717" />
          </TouchableOpacity>
        )}
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          className={`text-xl font-montserrat-semibold text-sapLight-text ${
            showBack ? 'ml-3' : ''
          }`}
          style={styles.title}
        >
          {title}
        </Text>
      </View>

      {/* Right Side Icons and Pack Button */}
      <View className="flex-row items-center space-x-6 gap-4 ml-4">
        {showSearch && (
          <TouchableOpacity onPress={() => console.log('Search pressed')}>
            <Search size={24} color="#171717" />
          </TouchableOpacity>
        )}
        {showNotification && (
          <TouchableOpacity onPress={() => router.push('/dashboards/notificaitons')}>
            <Bell size={24} color="#171717" />
          </TouchableOpacity>
        )}
        {showPack && (
          <TouchableOpacity
            onPress={onPackPress}
            className="bg-sapLight-button px-4 py-2.5 rounded-xl"
          >
            <Text className="text-white font-semibold">{boxStatus}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  title: {
    flexShrink: 1,
    maxWidth: '100%',
  },
});

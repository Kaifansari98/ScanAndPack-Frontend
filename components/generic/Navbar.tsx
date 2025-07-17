import { useNavigation } from '@react-navigation/native';
import { Bell, ChevronLeft, Search } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type NavbarProps = {
  title: string;
  showBack?: boolean;
  showSearch?: boolean;
  showNotification?: boolean;
};

export default function Navbar({
  title,
  showBack = false,
  showSearch = false,
  showNotification = false,
}: NavbarProps) {
  const navigation = useNavigation();

  return (
    <View
      className="bg-sapLight-background w-full px-5 py-4 flex-row items-center justify-between border-b border-gray-100"
      style={styles.container}
    >
      {/* Back Icon and Title */}
      <View className="flex-row items-center flex-1">
        {showBack && (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color="#171717" />
          </TouchableOpacity>
        )}
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          className={`text-2xl font-montserrat-semibold text-sapLight-text ${
            showBack ? 'ml-3' : ''
          }`}
          style={styles.title}
        >
          {title}
        </Text>
      </View>

      {/* Search and Notification Icons */}
      <View className="flex-row items-center space-x-6 gap-4 ml-4">
        {showSearch && (
          <TouchableOpacity onPress={() => console.log('Search pressed')}>
            <Search size={24} color="#171717" />
          </TouchableOpacity>
        )}
        {showNotification && (
          <TouchableOpacity onPress={() => console.log('Notification pressed')}>
            <Bell size={24} color="#171717" />
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
    elevation: 3,
  },
  title: {
    flexShrink: 1, // Important for ellipsis
    maxWidth: '100%', // Prevent title from colliding with icons
  },
});

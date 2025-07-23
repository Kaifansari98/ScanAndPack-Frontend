import DashboardTabScreen from '@/screens/Tabs/dashboard';
import ProfileTabScreen from '@/screens/Tabs/profile';
import ProjectsTabScreen from '@/screens/Tabs/projects';
import ReportsTabScreen from '@/screens/Tabs/reports';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FolderOpenDot, Home, User, FileCheck2 } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet, ActivityIndicator, View } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { Redirect } from 'expo-router'

// Tab Navigator
const Tab = createBottomTabNavigator();

export default function DashboardScreen() {

  const { token, isLoading } = useSelector((state: RootState) => state.auth);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!token) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#F5F5F5',
          borderTopColor: '#E5E5E5',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 85 : 70,
          
          paddingBottom: 5,
          paddingTop: 5,
        },
        tabBarActiveTintColor: '#171717',
        tabBarInactiveTintColor: '#A0A0A0',
        tabBarLabelStyle: {
          fontFamily: 'Montserrat-Medium',
          fontSize: 12,
          marginBottom: 5,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardTabScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Home size={24} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Projects"
        component={ProjectsTabScreen}
        options={{
            tabBarIcon: ({ color, size }) => (
                <FolderOpenDot size={24} color={color} />
            ),
            headerShown: false,
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsTabScreen}
        options={{
            tabBarIcon: ({ color, size }) => (
                <FileCheck2 size={24} color={color} />
            ),
            headerShown: false,
        }}
      />
        <Tab.Screen
          name="Profile"
          component={ProfileTabScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <User size={24} color={color} />
            ),
            headerShown: false,
          }}
        />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
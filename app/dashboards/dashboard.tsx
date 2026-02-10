import ProjectsTabScreen from '@/app/dashboards/projects';
import { RootState } from '@/redux/store';
import DashboardTabScreen from '@/screens/Tabs/dashboard';
import MachineTabScreen from '@/screens/Tabs/machines';
import ProfileTabScreen from '@/screens/Tabs/profile';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Redirect } from 'expo-router';
import { FolderOpenDot, Home, User, WashingMachine } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';

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
        name="Machine"
        component={MachineTabScreen}
        options={{
            tabBarIcon: ({ color, size }) => (
                <WashingMachine size={24} color={color} />
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
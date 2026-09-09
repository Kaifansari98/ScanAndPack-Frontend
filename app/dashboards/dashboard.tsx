import { colors } from "@/components/theme/colors";
import { RootState } from "@/redux/store";
import DashboardTabScreen from "@/screens/Tabs/dashboard";
import ProfileTabScreen from "@/screens/Tabs/profile";
import ProjectsTabScreen from "@/screens/Tabs/projects";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Redirect } from "expo-router";
import { FolderKanban, Home, Settings } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

const Tab = createBottomTabNavigator();

// ─── Tab icon builder ────────────────────────────────────────────────────────
function tabIcon(
  Icon: React.ComponentType<{
    size: number;
    color: string;
    strokeWidth?: number;
  }>,
) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Icon
      size={focused ? 24 : 22}
      color={color}
      strokeWidth={focused ? 2.4 : 1.8}
    />
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { token, isLoading } = useSelector((state: RootState) => state.auth);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.white,
        }}
      >
        <ActivityIndicator size="large" color={colors.midBg} />
      </View>
    );
  }

  if (!token) return <Redirect href="/auth/login" />;

  // Dynamic bottom inset to prevent Android 3-button navbar overlap
  const bottomInset =
    insets.bottom > 0 ? insets.bottom : Platform.OS === "ios" ? 24 : 10;
  const tabHeight = 58 + bottomInset;

  const dynamicTabBarStyle = {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E2E8F0",
    borderTopWidth: 1,
    height: tabHeight,
    paddingBottom: bottomInset,
    paddingTop: 6,
    elevation: 8,
  };

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: dynamicTabBarStyle,
        tabBarActiveTintColor: colors.midBg,
        tabBarInactiveTintColor: "#64748B",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardTabScreen}
        options={{
          headerShown: false,
          tabBarIcon: tabIcon(Home),
        }}
      />
      <Tab.Screen
        name="Projects"
        component={ProjectsTabScreen}
        options={{
          headerShown: false,
          tabBarIcon: tabIcon(FolderKanban),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={ProfileTabScreen}
        options={{
          headerShown: false,
          tabBarIcon: tabIcon(Settings),
        }}
      />
    </Tab.Navigator>
  );
}

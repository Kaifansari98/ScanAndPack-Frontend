import ProjectsTabScreen from '@/app/scan-pack';
import { colors } from '@/components/theme/colors';
import { RootState } from '@/redux/store';
import DashboardTabScreen from '@/screens/Tabs/dashboard';
import MachineTabScreen from '@/app/machines';
import ProfileTabScreen from '@/screens/Tabs/profile';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Redirect } from 'expo-router';
import { FolderOpenDot, Home, Package, Settings } from 'lucide-react-native';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useSelector } from 'react-redux';

const Tab = createBottomTabNavigator();

// ─── Shared tab bar style ────────────────────────────────────────────────────
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 72;

const tabBarStyle = {
  backgroundColor: colors.white,
  borderTopColor: colors.border,
  borderTopWidth: 1,
  height: TAB_BAR_HEIGHT,
  paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  paddingTop: 8,
  // Drop shadow above the bar
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 12,
};

// ─── Tab icon builder ────────────────────────────────────────────────────────
function tabIcon(Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Icon size={focused ? 26 : 23} color={color} strokeWidth={focused ? 2.5 : 1.8} />
  );
}

export default function DashboardScreen() {
  const { token, isLoading } = useSelector((state: RootState) => state.auth);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }}>
        <ActivityIndicator size="large" color={colors.midBg} />
      </View>
    );
  }

  if (!token) return <Redirect href="/auth/login" />;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle,
        tabBarActiveTintColor: colors.midBg,        // navy when active
        tabBarInactiveTintColor: colors.label,       // gray when inactive
        tabBarLabelStyle: {
          fontFamily: 'Montserrat-SemiBold',
          fontSize: 11,
          marginTop: 2,
        },
        // Active tab indicator — 3px navy bar at the bottom of each active tab
        tabBarIndicatorStyle: {
          backgroundColor: colors.midBg,
          height: 3,
          borderRadius: 3,
          bottom: 0,
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
        name="Track"
        component={MachineTabScreen}
        options={{
          headerShown: false,
          tabBarIcon: tabIcon(FolderOpenDot),
        }}
      />
      <Tab.Screen
        name="Pack"
        component={ProjectsTabScreen}
        options={{
          headerShown: false,
          tabBarIcon: tabIcon(Package),
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
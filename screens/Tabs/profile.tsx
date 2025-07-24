import {
  Image,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import React, { useEffect, useState } from "react";
import Navbar from "@/components/generic/Navbar";
import { useAuth } from "@/hooks/useAuth";
import {
  Bell,
  ChevronRight,
  Download,
  Languages,
  LogOut,
  Palette,
  UserRoundCog,
} from "lucide-react-native";
import ConfirmationBox from "@/components/generic/ConfirmationBox";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import Loader from "@/components/generic/Loader"; // Ensure this exists

export default function ProfileTabScreen() {
  const User = useSelector((state: RootState) => state.auth.user);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const router = useRouter();
  const { logout } = useAuth();

  const handleConfirmLogout = async () => {
    setLogoutVisible(false);
    setTimeout(async () => {
      await logout();
      router.replace("/auth/login");
    }, 300);
  };

  // 🔄 Show loader if User is not yet available
  if (!User) {
    return (
      <View className="flex-1 justify-center items-center bg-sapLight-background">
        <Loader />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-sapLight-background">
      <Navbar title="Profile" showBack={true} showSearch={false} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-kpx gap-10 pb-5">
          {/* Profile Info */}
          <View style={[styles.infoContainer]}>
            <Image
              style={styles.profileLogo}
              source={require("../../assets/images/Profile/profile.png")}
            />
            <Text className="text-3xl text-center font-montserrat-bold text-sapLight-text mt-2">
              {User.user_name}
            </Text>
            <Text className="text-2xl text-center font-montserrat-medium text-sapLight-infoText">
              {User.user_contact}
            </Text>
          </View>

          {/* Personal Settings */}
          <View className="gap-3">
            <Text className="text-xl text-sapLight-infoText font-montserrat-semibold">
              Personal
            </Text>
            <View className="flex-col gap-7">
              <TouchableOpacity className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-3">
                  <View className="bg-sapLight-card p-3 rounded-xl">
                    <UserRoundCog size={24} />
                  </View>
                  <Text className="text-lg font-montserrat-semibold text-slapLight-text">
                    Edit profile
                  </Text>
                </View>
                <ChevronRight size={24} />
              </TouchableOpacity>

              <TouchableOpacity className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-3">
                  <View className="bg-sapLight-card p-3 rounded-xl">
                    <Download size={24} />
                  </View>
                  <Text className="text-lg font-montserrat-semibold text-sapLight-text">
                    Downloads
                  </Text>
                </View>
                <ChevronRight size={24} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Preferences */}
          <View className="gap-3">
            <Text className="text-xl text-sapLight-infoText font-montserrat-semibold">
              Preferences
            </Text>
            <View className="flex-col gap-7">
              <TouchableOpacity className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-3">
                  <View className="bg-sapLight-card p-3 rounded-xl">
                    <Languages size={24} />
                  </View>
                  <Text className="text-lg font-montserrat-semibold text-slapLight-text">
                    Language
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-xl text-sapLight-infoText font-montserrat-medium">
                    English
                  </Text>
                  <ChevronRight size={24} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-3">
                  <View className="bg-sapLight-card p-3 rounded-xl">
                    <Bell size={24} />
                  </View>
                  <Text className="text-lg font-montserrat-semibold text-slapLight-text">
                    Notification
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-xl text-sapLight-infoText font-montserrat-medium">
                    Enable
                  </Text>
                  <ChevronRight size={24} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-3">
                  <View className="bg-sapLight-card p-3 rounded-xl">
                    <Palette size={24} />
                  </View>
                  <Text className="text-lg font-montserrat-semibold text-slapLight-text">
                    Theme
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-xl text-sapLight-infoText font-montserrat-medium">
                    Light
                  </Text>
                  <ChevronRight size={24} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Logout */}
          <View>
            <TouchableOpacity
              onPress={() => setLogoutVisible(true)}
              className="flex-row h-16 gap-4 items-center justify-start rounded-2xl"
            >
              <LogOut size={24} />
              <Text className="text-2xl font-montserrat-semibold">Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <ConfirmationBox
        visible={logoutVisible}
        title="Logout"
        description="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={handleConfirmLogout}
        onCancel={() => setLogoutVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  infoContainer: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
    gap: 4,
  },
  profileLogo: {
    width: 100,
    height: 100,
    borderRadius: 100,
  },
});

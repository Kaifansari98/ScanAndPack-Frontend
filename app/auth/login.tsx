import { useToast } from "@/components/Notification/ToastProvider";
import { useAuth } from "@/hooks/useAuth";
import axios from "@/lib/axios";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type LoginError = {
  contact?: string;
  password?: string;
};

export default function LoginScreen() {
  const { showToast } = useToast();
  const imageOpacity = useSharedValue(0);
  const imageScale = useSharedValue(0.8);
  const inputOpacity = useSharedValue(0);
  const inputTranslateY = useSharedValue(30);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(30);

  const { login } = useAuth();
  const [contact, setContact] = useState("+919833509275");
  const [password, setPassword] = useState("1234");
  const [errors, setErrors] = useState<LoginError>({});
  const [showPassword, setShowPassword] = useState(false);

  const navigation = useNavigation();
  const router = useRouter();

  const validateFields = (): boolean => {
    const newErrors: LoginError = {};

    if (!contact.trim()) newErrors.contact = "Phone number is required";
    if (!password.trim()) newErrors.password = "Password is required";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (!contact.trim() && !password.trim()) {
        showToast("error", "Phone number and Password are required");
      } else if (!contact.trim()) {
        showToast("error", "Phone number is required");
      } else if (!password.trim()) {
        showToast("error", "Password is required");
      }
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    
    if (!validateFields()) return;
    
    try {
      const res = await axios.post("/auth/login", {
        identifier: contact,
        password,
      });

      
 
      const { token, user } = res.data;
      await login(user, token);
      showToast("success", "Login Successfully");

      router.replace("/dashboards/dashboard");
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      showToast("error", msg);
    }
  };

  useEffect(() => {
    imageOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
    imageScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    inputOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
    inputTranslateY.value = withDelay(
      200,
      withSpring(0, { damping: 15, stiffness: 120 })
    );
    buttonOpacity.value = withDelay(
      400,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
    buttonTranslateY.value = withDelay(
      400,
      withSpring(0, { damping: 15, stiffness: 120 })
    );
  }, []);

  const animatedImageStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [{ scale: imageScale.value }],
  }));

  const animatedInputStyle = useAnimatedStyle(() => ({
    opacity: inputOpacity.value,
    transform: [{ translateY: inputTranslateY.value }],
  }));

  const animatedButtonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1}}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <View className="flex-1 bg-sapLight-background justify-center items-center px-8">
          <Animated.View style={[animatedImageStyle, styles.imageContainer]}>
            <Image
              source={require("../../assets/images/LoginScreen/Login.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          <Text className="text-3xl font-montserrat-semibold text-sapLight-text mb-10">
            Lets Get Started
          </Text>

          <Animated.View style={[animatedInputStyle, styles.inputContainer]}>
            <Text className="text-sapLight-text font-montserrat-medium text-sm mb-2">
              Phone Number
            </Text>
            <TextInput
              className={`bg-sapLight-card rounded-2xl px-5 py-4 mb-5 text-base font-montserrat ${
                errors.contact ? "border border-red-500" : "border border-gray-200"
              }`}
              placeholder="+91 8676765656"
              placeholderTextColor="#A0A0A0"
              keyboardType="phone-pad"
              style={styles.input}
              value={contact}
              onChangeText={(text) => {
                setContact(text);
                if (errors.contact)
                  setErrors((prev) => ({ ...prev, contact: "" }));
              }}
            />

            <Text className="text-sapLight-text font-montserrat-medium text-sm mb-2">
              Password
            </Text>
            <View className="relative">
              <TextInput
                className={`bg-sapLight-card rounded-2xl px-5 py-4 mb-5 text-base font-montserrat ${
                  errors.password ? "border border-red-500" : "border border-gray-200"
                }`}
                placeholder="••••••••"
                placeholderTextColor="#A0A0A0"
                secureTextEntry={!showPassword}
                style={styles.input}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password)
                    setErrors((prev) => ({ ...prev, password: "" }));
                }}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4"
              >
                {showPassword ? (
                  <EyeOff size={20} color="#A0A0A0" />
                ) : (
                  <Eye size={20} color="#A0A0A0" />
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>

          <Animated.View
            style={[animatedButtonStyle, styles.buttonContainer]}
          >
            <TouchableOpacity
              className="bg-sapLight-button rounded-2xl py-4 px-6 w-full shadow-lg mt-4"
              onPress={handleLogin}
            >
              <Text className="text-sapLight-background text-center font-montserrat-semibold text-lg">
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity>
              <Text
                className="text-sapLight-button text-center mt-6 text-sm font-montserrat-medium tracking-wide"
                onPress={() => router.push("./ResetPasswordScreen")}
              >
                Reset Password?
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    marginBottom: 40,
  },
  logo: {
    width: 200,
    height: 200,
  },
  inputContainer: {
    width: "100%",
    maxWidth: 380,
  },
  input: {
    fontSize: 16,
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
  },
});

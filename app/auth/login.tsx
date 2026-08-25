// Updated login: refreshes the Axios in-memory token cache after authentication.
import { useToast } from "@/components/Notification/ToastProvider";
import { colors } from "@/components/theme/colors";
import { commonStyles } from "@/components/theme/commonStyles";
import { headerLabel } from "@/components/theme/static";
import { useAuth } from "@/hooks/useAuth";
import axios, { cacheAuthToken } from "@/lib/axios";
import { useRouter } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
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
  const { login } = useAuth();
  const router = useRouter();

  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginError>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // ─── Animations ──────────────────────────────────────
  const heroOpacity = useSharedValue(0);
  const heroTranslateY = useSharedValue(-20);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(60);
  const buttonScale = useSharedValue(0.95);

  useEffect(() => {
    heroOpacity.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    heroTranslateY.value = withSpring(0, { damping: 14, stiffness: 100 });

    cardOpacity.value = withDelay(250, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    cardTranslateY.value = withDelay(250, withSpring(0, { damping: 16, stiffness: 110 }));

    buttonScale.value = withDelay(500, withSpring(1, { damping: 12, stiffness: 120 }));
  }, []);

  const animatedHeroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ translateY: heroTranslateY.value }],
  }));

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // ─── Logic ───────────────────────────────────────────
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
    setLoading(true);
    try {
      const res = await axios.post("/auth/login", {
        identifier: contact,
        password,
      });
      const { token, user } = res.data;
      await login(user, token);
      cacheAuthToken(token);
      showToast("success", "Login Successfully");
      router.replace("/dashboards/dashboard");
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── UI ──────────────────────────────────────────────
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={commonStyles.root}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        {/* Dark Hero */}
        <Animated.View style={[commonStyles.hero, animatedHeroStyle]}>
          <Image
            source={require("../../assets/images/furnix.jpeg")}
            style={commonStyles.heroLogo}
            resizeMode="contain"
          />
          <Text style={commonStyles.heroTitle}>{headerLabel.APPTITLE}</Text>
          <Text style={commonStyles.heroSubtitle}>WORKER LOGIN</Text>
        </Animated.View>

        {/* Light Card */}
        <Animated.View style={[commonStyles.card, animatedCardStyle]}>
          <Text style={commonStyles.cardHeading}>Welcome Back 👋</Text>

          {/* Phone */}
          <View style={commonStyles.fieldGroup}>
            <Text style={commonStyles.label}>📱  Mobile Number</Text>
            <TextInput
              style={[commonStyles.input, errors.contact ? commonStyles.inputError : null]}
              placeholder="Enter your number"
              placeholderTextColor={colors.placeholder}
              keyboardType="phone-pad"
              value={contact}
              onChangeText={(text) => {
                setContact(text);
                if (errors.contact) setErrors((p) => ({ ...p, contact: "" }));
              }}
            />
          </View>

          {/* Password */}
          <View style={commonStyles.fieldGroup}>
            <Text style={commonStyles.label}>🔒  Password</Text>
            <View style={commonStyles.passwordWrapper}>
              <TextInput
                style={[
                  commonStyles.input,
                  errors.password ? commonStyles.inputError : null,
                  { paddingRight: 52 },
                ]}
                placeholder="Enter password"
                placeholderTextColor={colors.placeholder}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((p) => ({ ...p, password: "" }));
                }}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={commonStyles.eyeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showPassword
                  ? <EyeOff size={20} color={colors.placeholder} />
                  : <Eye size={20} color={colors.placeholder} />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign In Button */}
          <Animated.View style={[animatedButtonStyle, commonStyles.buttonWrap]}>
            <TouchableOpacity
              style={[commonStyles.button, loading && commonStyles.buttonLoading]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={loading}
            >
              <Text style={commonStyles.buttonText}>
                {loading ? "Signing in…" : "Sign In  →"}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Forgot */}
          <TouchableOpacity onPress={() => router.push("./ResetPasswordScreen")}>
            <Text style={commonStyles.forgotText}>Forgot password? Contact supervisor</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Image, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

export default function ResetPasswordScreen() {
  // Animation values
  const imageOpacity = useSharedValue(0);
  const imageScale = useSharedValue(0.8);
  const inputOpacity = useSharedValue(0);
  const inputTranslateY = useSharedValue(30);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(30);

  // State for password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Router for navigation
  const router = useRouter();

  // Trigger animations on component mount
  useEffect(() => {
    imageOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    imageScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    inputOpacity.value = withDelay(200, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    inputTranslateY.value = withDelay(200, withSpring(0, { damping: 15, stiffness: 120 }));
    buttonOpacity.value = withDelay(400, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    buttonTranslateY.value = withDelay(400, withSpring(0, { damping: 15, stiffness: 120 }));
  }, []);

  // Animated styles
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20}
      >
        <View className="flex-1 bg-sapLight-background justify-center items-center px-8">
          {/* Logo Image */}
          <Animated.View style={[animatedImageStyle, styles.imageContainer]}>
            <Image
              source={require('../../assets/images/LoginScreen/ResetPassword.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Title */}
          <Text className="text-3xl font-montserrat-semibold text-sapLight-text mb-10">
            Reset Password
          </Text>

          {/* Input Fields */}
          <Animated.View style={[animatedInputStyle, styles.inputContainer]}>
            <Text className="text-sapLight-text font-montserrat-medium text-sm mb-2">
              Current Password
            </Text>
            <View className="relative">
              <TextInput
                className="bg-sapLight-card rounded-2xl px-5 py-4 mb-5 text-base border border-gray-200 font-montserrat"
                placeholder="••••••••"
                placeholderTextColor="#A0A0A0"
                secureTextEntry={!showCurrentPassword}
                style={styles.input}
              />
              <TouchableOpacity
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-4 top-4"
              >
                {showCurrentPassword ? (
                  <EyeOff size={20} color="#A0A0A0" />
                ) : (
                  <Eye size={20} color="#A0A0A0" />
                )}
              </TouchableOpacity>
            </View>
            <Text className="text-sapLight-text font-montserrat-medium text-sm mb-2">
              New Password
            </Text>
            <View className="relative">
              <TextInput
                className="bg-sapLight-card rounded-2xl px-5 py-4 mb-5 text-base border border-gray-200 font-montserrat"
                placeholder="••••••••"
                placeholderTextColor="#A0A0A0"
                secureTextEntry={!showNewPassword}
                style={styles.input}
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-4"
              >
                {showNewPassword ? (
                  <EyeOff size={20} color="#A0A0A0" />
                ) : (
                  <Eye size={20} color="#A0A0A0" />
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Change Password Button */}
          <Animated.View style={[animatedButtonStyle, styles.buttonContainer]}>
            <TouchableOpacity className="bg-sapLight-button rounded-2xl py-4 px-6 w-full shadow-lg mt-4">
              <Text className="text-sapLight-background text-center font-montserrat-semibold text-lg">
                Change Password
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/auth/login')}>
              <Text className="text-sapLight-button text-center mt-6 text-sm font-montserrat-medium tracking-wide">
                Get back to Login Screen
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
    width: '100%',
    maxWidth: 380,
  },
  input: {
    fontSize: 16,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
});
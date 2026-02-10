import { Audio } from "expo-av";
import { Vibration } from "react-native";

let successSound: Audio.Sound | null = null;
let errorSound: Audio.Sound | null = null;
let isReady = false;

export const preloadFeedbackSounds = async () => {
  try {
    if (isReady) return;

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
    });

    successSound = new Audio.Sound();
    errorSound = new Audio.Sound();

     await errorSound.loadAsync(
      require("@/assets/sounds/error.mp3"),
      { shouldPlay: false }
    );
    
    await successSound.loadAsync(
      require("@/assets/sounds/success.mp3"),
      { shouldPlay: false }
    );

   

    // 🔥 🔥 🔥 WARM-UP HACK (THIS FIXES FIRST BEEP)
    await successSound.setVolumeAsync(0);
    await successSound.playAsync();
    await successSound.stopAsync();
    await successSound.setVolumeAsync(1);

    isReady = true;
  } catch (e) {
    console.log("Sound preload error", e);
  }
};

export const playSuccessFeedback = async () => {
  try {
    Vibration.vibrate(100);

    if (!isReady || !successSound) return;

    await successSound.setPositionAsync(0);
    await successSound.playAsync();
  } catch (e) {
    console.log("Success feedback error", e);
  }
};

export const playErrorFeedback = async () => {
  try {
    Vibration.vibrate([0, 200, 100, 200]);

    if (!isReady || !errorSound) return;

    await errorSound.setPositionAsync(0);
    await errorSound.playAsync();
  } catch (e) {
    console.log("Error feedback error", e);
  }
};

export const unloadFeedbackSounds = async () => {
  try {
    if (successSound) {
      await successSound.unloadAsync();
      successSound = null;
    }
    if (errorSound) {
      await errorSound.unloadAsync();
      errorSound = null;
    }
    isReady = false;
  } catch (e) {
    console.log("Sound unload error", e);
  }
};

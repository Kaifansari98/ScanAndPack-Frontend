import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { Vibration } from "react-native";

let successSound: AudioPlayer | null = null;
let errorSound: AudioPlayer | null = null;
let isReady = false;
let preloadPromise: Promise<void> | null = null;
let successFeedbackInProgress = false;
let errorFeedbackInProgress = false;

export const preloadFeedbackSounds = async (): Promise<void> => {
  if (isReady) return;
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    try {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: "mixWithOthers",
        });
      } catch (modeError) {
        if (__DEV__) {
          console.warn("setAudioModeAsync failed:", modeError);
        }
      }

      successSound = createAudioPlayer(require("@/assets/sounds/success.mp3"));
      errorSound = createAudioPlayer(require("@/assets/sounds/error.mp3"));
      isReady = true;
    } catch (error: unknown) {
      isReady = false;
      successSound = null;
      errorSound = null;

      if (__DEV__) {
        console.warn("Sound preload failed:", error);
      }
    } finally {
      preloadPromise = null;
    }
  })();

  return preloadPromise;
};

/** Fire-and-forget: never blocks API handling or UI state updates. */
export const playSuccessFeedback = (): void => {
  try {
    Vibration.vibrate(100);
  } catch (error: unknown) {
    if (__DEV__) {
      console.warn("Success vibration failed:", error);
    }
  }

  if (!isReady || !successSound || successFeedbackInProgress) return;

  const player = successSound;
  successFeedbackInProgress = true;

  (async () => {
    try {
      try {
        await player.seekTo(0);
      } catch {
        // seek may not be needed if at start
      }
      player.play();
    } catch (error: unknown) {
      if (__DEV__) {
        console.warn("Success feedback sound failed:", error);
      }
    } finally {
      successFeedbackInProgress = false;
    }
  })();
};

/** Fire-and-forget: never blocks API handling or UI state updates. */
export const playErrorFeedback = (): void => {
  try {
    Vibration.vibrate([0, 200, 100, 200]);
  } catch (error: unknown) {
    if (__DEV__) {
      console.warn("Error vibration failed:", error);
    }
  }

  if (!isReady || !errorSound || errorFeedbackInProgress) return;

  const player = errorSound;
  errorFeedbackInProgress = true;

  (async () => {
    try {
      try {
        await player.seekTo(0);
      } catch {
        // seek may not be needed if at start
      }
      player.play();
    } catch (error: unknown) {
      if (__DEV__) {
        console.warn("Error feedback sound failed:", error);
      }
    } finally {
      errorFeedbackInProgress = false;
    }
  })();
};

export const unloadFeedbackSounds = async (): Promise<void> => {
  const currentSuccess = successSound;
  const currentError = errorSound;

  successSound = null;
  errorSound = null;
  isReady = false;
  successFeedbackInProgress = false;
  errorFeedbackInProgress = false;

  try {
    currentSuccess?.remove();
  } catch (error: unknown) {
    if (__DEV__) {
      console.warn("Failed to unload success sound:", error);
    }
  }

  try {
    currentError?.remove();
  } catch (error: unknown) {
    if (__DEV__) {
      console.warn("Failed to unload error sound:", error);
    }
  }
};


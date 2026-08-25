import { Audio } from "expo-av";
import { Vibration } from "react-native";

let successSound: Audio.Sound | null = null;
let errorSound: Audio.Sound | null = null;
let isReady = false;
let preloadPromise: Promise<void> | null = null;
let successFeedbackInProgress = false;
let errorFeedbackInProgress = false;

export const preloadFeedbackSounds = async (): Promise<void> => {
  if (isReady) return;
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
      });

      const nextSuccessSound = new Audio.Sound();
      const nextErrorSound = new Audio.Sound();

      await Promise.all([
        nextSuccessSound.loadAsync(
          require("@/assets/sounds/success.mp3"),
          { shouldPlay: false },
        ),
        nextErrorSound.loadAsync(
          require("@/assets/sounds/error.mp3"),
          { shouldPlay: false },
        ),
      ]);

      successSound = nextSuccessSound;
      errorSound = nextErrorSound;
      isReady = true;
    } catch (error) {
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
  Vibration.vibrate(100);

  if (!isReady || !successSound || successFeedbackInProgress) return;

  successFeedbackInProgress = true;

  void successSound
    .replayAsync()
    .catch((error) => {
      if (__DEV__) {
        console.warn("Success feedback failed:", error);
      }
    })
    .finally(() => {
      successFeedbackInProgress = false;
    });
};

/** Fire-and-forget: never blocks API handling or UI state updates. */
export const playErrorFeedback = (): void => {
  Vibration.vibrate([0, 200, 100, 200]);

  if (!isReady || !errorSound || errorFeedbackInProgress) return;

  errorFeedbackInProgress = true;

  void errorSound
    .replayAsync()
    .catch((error) => {
      if (__DEV__) {
        console.warn("Error feedback failed:", error);
      }
    })
    .finally(() => {
      errorFeedbackInProgress = false;
    });
};

export const unloadFeedbackSounds = async (): Promise<void> => {
  const sounds = [successSound, errorSound].filter(
    (sound): sound is Audio.Sound => sound !== null,
  );

  successSound = null;
  errorSound = null;
  isReady = false;
  successFeedbackInProgress = false;
  errorFeedbackInProgress = false;

  await Promise.allSettled(sounds.map((sound) => sound.unloadAsync()));
};

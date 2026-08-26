// Replace your existing @/lib/axios.ts with this file.
// cacheAuthToken is exported as a named export below.
import axios from "axios";
import * as SecureStore from "expo-secure-store";

const AUTH_TOKEN_KEY = "auth_token";

const instance = axios.create({
  // baseURL: 'https://staging-api.furnixcrm.com/api', // base backend URL
  baseURL: "http://192.168.1.109:7777/api",
  timeout: 15_000,
});

/*
 * undefined: token has not been loaded yet
 * null: token was loaded, but the user is not authenticated
 * string: token is cached in memory
 */
let cachedAuthToken: string | null | undefined;
let authTokenLoadPromise: Promise<string | null> | null = null;

const getAuthToken = async (): Promise<string | null> => {
  if (cachedAuthToken !== undefined) {
    return cachedAuthToken;
  }

  if (!authTokenLoadPromise) {
    authTokenLoadPromise = SecureStore.getItemAsync(AUTH_TOKEN_KEY)
      .then((token) => {
        cachedAuthToken = token;
        return token;
      })
      .finally(() => {
        authTokenLoadPromise = null;
      });
  }

  return authTokenLoadPromise;
};

/** Load the token once during app startup. */
export const preloadAuthToken = async (): Promise<void> => {
  await getAuthToken();
};

/**
 * Use this when another auth module has already persisted the token and Axios
 * only needs its in-memory cache refreshed.
 */
export const cacheAuthToken = (token: string | null): void => {
  cachedAuthToken = token;
  authTokenLoadPromise = null;
};

/** Use this after login instead of calling SecureStore.setItemAsync directly. */
export const setAuthToken = async (token: string): Promise<void> => {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  cachedAuthToken = token;
};

/** Use this during logout instead of calling SecureStore.deleteItemAsync directly. */
export const clearAuthToken = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  cachedAuthToken = null;
};

/** Call this only when another module changes auth_token in SecureStore. */
export const resetAuthTokenCache = (): void => {
  cachedAuthToken = undefined;
  authTokenLoadPromise = null;
};

instance.interceptors.request.use(async (config) => {
  const token = await getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  return config;
});

export default instance;
import * as SecureStore from 'expo-secure-store';

export const saveSession = async (token: string, user: any) => {
  await SecureStore.setItemAsync('auth_token', token);
  await SecureStore.setItemAsync('auth_user', JSON.stringify(user));
};

export const getSession = async () => {
  const token = await SecureStore.getItemAsync('auth_token');
  const user = await SecureStore.getItemAsync('auth_user');
  if (token && user) {
    return { token, user: JSON.parse(user) };
  }
  return null;
};

export const clearSession = async () => {
  await SecureStore.deleteItemAsync('auth_token');
  await SecureStore.deleteItemAsync('auth_user');
};
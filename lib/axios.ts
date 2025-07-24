import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const instance = axios.create({
  baseURL: 'http://192.168.1.5:7777/api', // base backend URL
//baseURL: 'http://localhost:7777/api', // change it with your ip address
});

// Attach token before every request
instance.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default instance;

// macOS?IOS    : ifconfig | grep inet
// win?Android  : ipconfig
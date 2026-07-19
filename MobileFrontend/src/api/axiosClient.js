import axios from 'axios';
import Constants from 'expo-constants';
import { setupInterceptors } from './interceptors';
import { API_BASE_URL } from '../config/api';

const getExpoHostApiUrl = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;
  const host = hostUri?.split(':')?.[0];

  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return null;
  }

  return `http://${host}:8080/api`;
};

const API_URL = getExpoHostApiUrl() || process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.20:8080/api';

console.log('ENV API:', process.env.EXPO_PUBLIC_API_URL);
console.log('AXIOS BASE URL:', API_URL);

const axiosClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

axiosClient.interceptors.request.use((config) => {
  console.log('REQUEST URL:', `${config.baseURL}${config.url}`);
  return config;
});

setupInterceptors(axiosClient);

export default axiosClient;

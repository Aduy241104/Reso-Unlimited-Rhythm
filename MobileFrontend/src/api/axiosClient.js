import axios from 'axios';
import { setupInterceptors } from './interceptors';

const axiosClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.6:8080/api',
  timeout: 15000, 
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});
setupInterceptors(axiosClient);

export default axiosClient;
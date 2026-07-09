import axios from 'axios';
import { setupInterceptors } from './interceptors';
import { API_BASE_URL } from '../config/api';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});
setupInterceptors(axiosClient);

export default axiosClient;

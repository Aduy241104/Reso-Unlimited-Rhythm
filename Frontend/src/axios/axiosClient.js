import axios from "axios";
import { API_BASE_URL } from "../constants/auth";

// Base axios instance for all API calls.
const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send HttpOnly refreshToken cookie.
});

export default axiosClient;

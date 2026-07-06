import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';

export const authService = {
  /**
   * Đăng nhập tài khoản bằng Email & Password
   */
  async login(email, password) {
    return await axiosClient.post(API_ENDPOINTS.AUTH.LOGIN, { email, password });
  },

  async requestRegisterOtp(email) {
    return await axiosClient.post(API_ENDPOINTS.AUTH.REGISTER_SEND_OTP, { email });
  },

  async register(payload) {
    return await axiosClient.post(API_ENDPOINTS.AUTH.REGISTER, payload);
  },

  /**
   * Đăng xuất hệ thống xóa trạng thái Server-side
   */
  async logout() {
    return await axiosClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  },

  /**
   * Lấy thông tin chi tiết của User đang đăng nhập dựa vào Access Token hiện hành
   */
  async getCurrentUser() {
    return await axiosClient.get(API_ENDPOINTS.AUTH.ME);
  },
};

export default authService;

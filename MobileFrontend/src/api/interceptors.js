import axios from 'axios';
import { tokenStorage } from '../storage/tokenStorage';
import { API_ENDPOINTS } from './apiEndpoints';

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const setupInterceptors = (axiosInstance) => {
  // 🚀 REQUEST INTERCEPTOR: ĐÃ ĐƯỢC BỌC GIÁP CHỐNG CRASH NGẦM
  axiosInstance.interceptors.request.use(
    async (config) => {
      try {
        // Đặt timeout ngắn cho việc lấy token, đề phòng hàm này bị treo ngầm
        const tokenPromise = tokenStorage.getAccessToken();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("SecureStore Timeout")), 2000)
        );
        
        const token = await Promise.race([tokenPromise, timeoutPromise]).catch(() => null);
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (storageError) {
        // Nếu bộ nhớ lưu trữ lỗi, bỏ qua và cho phép request đi tiếp (nhất là khi Login)
        console.log("⚠️ CẢNH BÁO STORAGE: Không lấy được token nội bộ:", storageError.message);
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // RESPONSE INTERCEPTOR
  axiosInstance.interceptors.response.use(
    (response) => response.data,
    async (error) => {
      // Bọc an toàn để bảo vệ biến originalRequest không bị undefined gây crash log
      const originalRequest = error?.config || { url: 'KHÔNG CÓ CONFIG URL (Cố định localhost:8080)' };

      console.log("============== DEBUG AXIOS ERROR ==============");
      console.log("1. URL GỌI BỊ LỖI:", originalRequest?.url || 'Không xác định');
      console.log("2. MÃ LỖI HỆ THỐNG (Code):", error?.code || 'Không có mã lỗi'); 
      console.log("3. TRẠNG THÁI HTTP (Status):", error?.response?.status || 'Không có HTTP Status');
      console.log("4. BACKEND PHẢN HỒI THÔ (Data):", error?.response?.data ? JSON.stringify(error.response.data) : 'Không có dữ liệu trả về');
      console.log("===============================================");

      if (!error?.response) {
        // Kiểm tra xem có phải do kẹt cứng IP config không, nếu có thì thử ép gọi thẳng localhost
        return Promise.reject({
          message: `Network error (${error?.code || 'UNKNOWN'}). Vui lòng kiểm tra kết nối mạng giữa App và Server.`,
          status: 0,
        });
      }

      // Xử lý Auto Refresh Token khi hết hạn (401)
      if (error.response.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return axiosInstance(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = await tokenStorage.getRefreshToken().catch(() => null);
          if (!refreshToken) throw new Error('No refresh token available');

          const baseUrl = 'http://10.0.2.2:8080/api';

          const response = await axios.post(
            `${baseUrl}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`,
            {},
            {
              headers: {
                'Cookie': `refreshToken=${refreshToken}`,
              },
              timeout: 5000
            }
          );

          const responseData = response.data?.data || response.data;
          const newAccessToken = responseData?.accessToken;
          const newRefreshToken = responseData?.refreshToken;

          if (newAccessToken) {
            await tokenStorage.setAccessToken(newAccessToken).catch(() => {});
            if (newRefreshToken) {
              await tokenStorage.setRefreshToken(newRefreshToken).catch(() => {});
            }
            axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            processQueue(null, newAccessToken);
            isRefreshing = false;
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return axiosInstance(originalRequest);
          }
          throw new Error('Refresh token invalid');
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing = false;
          await tokenStorage.clearTokens().catch(() => {});
          return Promise.reject({
            message: 'Session expired. Please log in again.',
            status: 401,
          });
        }
      }

      return Promise.reject({
        message: error.response?.data?.message || 'Something went wrong',
        status: error.response?.status || 500,
        errors: error.response?.data?.errors || null,
      });
    }
  );
};
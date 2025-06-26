import axios from 'axios';
import DIA_CHI_API from './URL_BASE_API';

const axiosInstance = axios.create({
  baseURL: DIA_CHI_API,
});

// Request interceptor
axiosInstance.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor để xử lý token hết hạn
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Kiểm tra nếu token hết hạn (401 Unauthorized)
    if (error.response && error.response.status === 401) {
      // Xóa token khỏi localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('role');
      localStorage.removeItem('userId');
      localStorage.removeItem('khoaPhongId');
      
      // Chuyển hướng về trang đăng nhập
      window.location.href = '/dang-nhap';
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
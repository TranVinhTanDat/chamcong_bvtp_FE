import axios from 'axios';
import { toast } from 'react-toastify';
import DIA_CHI_API from './URL_BASE_API';

const axiosInstance = axios.create({
  baseURL: DIA_CHI_API,
});

// Hàm kiểm tra token có hết hạn không
const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    return true;
  }
};

// Hàm kiểm tra token sắp hết hạn (còn dưới 1 giờ cho token 5 giờ)
const isTokenExpiringSoon = (token) => {
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    const timeLeft = payload.exp - currentTime;
    // Cảnh báo khi còn dưới 1 giờ (3600 giây) cho token 5 giờ
    return timeLeft < 3600 && timeLeft > 0;
  } catch (error) {
    return false;
  }
};

// Hàm lấy thời gian còn lại của token
const getTokenTimeLeft = (token) => {
  if (!token) return 0;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    const timeLeft = payload.exp - currentTime;
    return Math.max(0, timeLeft);
  } catch (error) {
    return 0;
  }
};

// Hàm format thời gian còn lại
const formatTimeLeft = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  } else {
    return `${minutes} phút`;
  }
};

// Hàm logout và chuyển về trang đăng nhập
const handleLogout = () => {
  // Xóa toàn bộ thông tin trong localStorage
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('role');
  localStorage.removeItem('userId');
  localStorage.removeItem('khoaPhongId');
  localStorage.removeItem('tenDangNhap');
  localStorage.removeItem('tenKhoaPhong');
  localStorage.removeItem('hoTen');
  
  // Chuyển về trang đăng nhập
  window.location.href = '/dang-nhap';
};

// Biến để theo dõi cảnh báo đã hiển thị
let hasShownExpiringWarning = false;

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    
    // Kiểm tra token hết hạn trước khi gửi request
    if (accessToken && isTokenExpired(accessToken)) {
      toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục sử dụng!', {
        autoClose: false,
        closeOnClick: true,
        onClose: () => handleLogout()
      });
      return Promise.reject(new Error('Token expired'));
    }
    
    // Cảnh báo khi token sắp hết hạn (chỉ hiển thị 1 lần)
    if (accessToken && isTokenExpiringSoon(accessToken) && !hasShownExpiringWarning) {
      const timeLeft = getTokenTimeLeft(accessToken);
      const timeLeftFormatted = formatTimeLeft(timeLeft);
      
      toast.warning(`Phiên đăng nhập sẽ hết hạn sau ${timeLeftFormatted}. Vui lòng lưu công việc!`, {
        autoClose: 10000,
        closeOnClick: true
      });
      
      hasShownExpiringWarning = true;
      
      // Reset cảnh báo sau 30 phút để có thể hiển thị lại
      setTimeout(() => {
        hasShownExpiringWarning = false;
      }, 30 * 60 * 1000);
    }
    
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const { status } = error.response;
      const { config } = error;
      
      // Xử lý lỗi 401 (Unauthorized) hoặc 403 (Forbidden)
      if (status === 401 || status === 403) {
        // Chỉ hiển thị thông báo token hết hạn cho các endpoint KHÔNG phải đăng nhập
        if (!config.url.includes('/auth/dangnhap')) {
          toast.error('Bạn đã hết thời gian token, hãy đăng nhập lại để tiếp tục sử dụng!', {
            autoClose: false,
            closeOnClick: true,
            onClose: () => {
              setTimeout(() => handleLogout(), 500);
            }
          });
        }
        return Promise.reject(error);
      }
      
      // Xử lý các lỗi khác (không phải đăng nhập)
      if (status >= 500 && !config.url.includes('/auth/')) {
        toast.error('Lỗi server. Vui lòng thử lại sau!');
      }
    } else if (error.message === 'Token expired') {
      // Đã xử lý trong request interceptor
      return Promise.reject(error);
    } else if (!error.config?.url?.includes('/auth/')) {
      // Chỉ hiển thị lỗi kết nối cho các request không phải auth
      toast.error('Lỗi kết nối. Vui lòng kiểm tra mạng!');
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
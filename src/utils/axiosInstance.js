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

// Hàm kiểm tra token sắp hết hạn (còn dưới 2 giờ)
const isTokenExpiringSoon = (token) => {
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    const timeLeft = payload.exp - currentTime;
    // Cảnh báo khi còn dưới 2 giờ (7200 giây)
    return timeLeft < 7200 && timeLeft > 0;
  } catch (error) {
    return false;
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
      toast.warning('Phiên đăng nhập sẽ hết hạn trong 2 giờ. Vui lòng lưu công việc!', {
        autoClose: 10000
      });
      hasShownExpiringWarning = true;
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
      
      // Xử lý lỗi 401 (Unauthorized) hoặc 403 (Forbidden)
      if (status === 401 || status === 403) {
        toast.error('Bạn đã hết thời gian token, hãy đăng nhập lại để tiếp tục sử dụng!', {
          autoClose: false,
          closeOnClick: true,
          onClose: () => {
            setTimeout(() => handleLogout(), 500);
          }
        });
        return Promise.reject(error);
      }
      
      // Xử lý các lỗi khác
      if (status >= 500) {
        toast.error('Lỗi server. Vui lòng thử lại sau!');
      }
    } else if (error.message === 'Token expired') {
      // Đã xử lý trong request interceptor
      return Promise.reject(error);
    } else {
      toast.error('Lỗi kết nối. Vui lòng kiểm tra mạng!');
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
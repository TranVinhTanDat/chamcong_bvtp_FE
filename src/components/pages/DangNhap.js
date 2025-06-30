import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { toast } from 'react-toastify';
import logoTanPhu from '../../components/assets/images/logo_tan_phu_hinh.png';

// Hàm kiểm tra token có hợp lệ không
const isTokenValid = (token) => {
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp > currentTime;
  } catch (error) {
    return false;
  }
};

// Hàm lấy username từ token
const getUsernameFromToken = (token) => {
  if (!token) return '';
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.username || payload.sub || '';
  } catch (error) {
    return '';
  }
};

function DangNhap() {
  const [credentials, setCredentials] = useState({ tenDangNhap: '', matKhau: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Kiểm tra nếu đã có token hợp lệ thì chuyển về trang chủ
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken && isTokenValid(accessToken)) {
      navigate('/', { replace: true });
    } else {
      // Xóa token không hợp lệ
      localStorage.clear();
    }
  }, [navigate]);

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation đơn giản
    if (!credentials.tenDangNhap.trim()) {
      toast.error('Vui lòng nhập tên đăng nhập!');
      return;
    }
    
    if (!credentials.matKhau.trim()) {
      toast.error('Vui lòng nhập mật khẩu!');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axiosInstance.post('/auth/dangnhap', credentials);
      const { accessToken, refreshToken, role, id, khoaPhongId } = response.data;

      // Kiểm tra tính hợp lệ của token nhận được
      if (!isTokenValid(accessToken)) {
        throw new Error('Token không hợp lệ từ server');
      }

      // Xóa toàn bộ localStorage trước khi lưu thông tin mới
      localStorage.clear();

      // Lưu thông tin cơ bản vào localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('role', role);
      localStorage.setItem('userId', id);
      localStorage.setItem('khoaPhongId', khoaPhongId);
      
      // Lấy username từ token thay vì từ API response
      const username = getUsernameFromToken(accessToken);
      if (username) {
        localStorage.setItem('tenDangNhap', username);
      }

      try {
        // Gọi API để lấy thông tin chi tiết user
        const userProfileResponse = await axiosInstance.get('/user/current');
        const userProfile = userProfileResponse.data;
        
        // Lưu thêm thông tin chi tiết nếu có
        if (userProfile.tenKhoaPhong) {
          localStorage.setItem('tenKhoaPhong', userProfile.tenKhoaPhong);
        }
        if (userProfile.hoTen) {
          localStorage.setItem('hoTen', userProfile.hoTen);
        }
        if (userProfile.tenDangNhap) {
          localStorage.setItem('tenDangNhap', userProfile.tenDangNhap);
        }
      } catch (profileError) {
        console.warn('Could not load user profile:', profileError);
        // Không làm gián đoạn quá trình đăng nhập nếu không lấy được profile
      }

      toast.success('Đăng nhập thành công!');
      navigate('/', { replace: true });
      
    } catch (error) {
      // Xử lý lỗi đăng nhập - CHỈ HIỂN THỊ THÔNG BÁO MỘT LẦN
      if (error.response) {
        const { status } = error.response;
        
        switch (status) {
          case 401:
            toast.error('Tên đăng nhập hoặc mật khẩu không đúng!');
            break;
          case 403:
            toast.error('Tài khoản đã bị khóa hoặc không có quyền truy cập!');
            break;
          case 500:
            toast.error('Lỗi server. Vui lòng thử lại sau!');
            break;
          case 400:
            toast.error('Thông tin đăng nhập không hợp lệ!');
            break;
          default:
            toast.error('Đăng nhập thất bại. Vui lòng thử lại!');
        }
      } else if (error.message === 'Token không hợp lệ từ server') {
        toast.error('Lỗi xác thực từ server. Vui lòng thử lại!');
      } else if (error.message !== 'Token expired') {
        // Chỉ hiển thị lỗi kết nối nếu KHÔNG phải lỗi token hết hạn
        toast.error('Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-gradient" 
         style={{ background: 'linear-gradient(135deg, #e0f7fa, #ffffff)' }}>
      <div className="card p-4 shadow-lg" 
           style={{ maxWidth: '420px', width: '100%', borderRadius: '15px' }}>
        
        <div className="text-center mb-4">
          <img 
            src={logoTanPhu} 
            alt="Logo Bệnh viện Tân Phú" 
            className="img-fluid" 
            style={{ maxWidth: '180px', marginBottom: '15px' }} 
            onError={(e) => e.target.style.display = 'none'}
          />
          <h2 className="text-primary fw-bold">Hệ Thống Chấm Công</h2>
          <p className="text-muted">Bệnh viện Tân Phú</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="tenDangNhap" className="form-label fw-medium">
              Tên đăng nhập
            </label>
            <input
              type="text"
              className="form-control form-control-lg"
              id="tenDangNhap"
              name="tenDangNhap"
              value={credentials.tenDangNhap}
              onChange={handleChange}
              required
              placeholder="Nhập tên đăng nhập"
              disabled={isLoading}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label htmlFor="matKhau" className="form-label fw-medium">
              Mật khẩu
            </label>
            <input
              type="password"
              className="form-control form-control-lg"
              id="matKhau"
              name="matKhau"
              value={credentials.matKhau}
              onChange={handleChange}
              required
              placeholder="Nhập mật khẩu"
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-lg w-100 mb-3" 
            disabled={isLoading || !credentials.tenDangNhap.trim() || !credentials.matKhau.trim()}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Đang đăng nhập...
              </>
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default DangNhap;
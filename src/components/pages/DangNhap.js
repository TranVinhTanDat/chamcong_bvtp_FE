import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { toast } from 'react-toastify';
import logoTanPhu from '../../components/assets/images/logo tan phu_hinh.png';

function DangNhap() {
  const [credentials, setCredentials] = useState({ tenDangNhap: '', matKhau: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      console.log('Attempting login with:', credentials);
      const response = await axiosInstance.post('/auth/dangnhap', credentials);
      console.log('Login response:', response.data);
      
      const { accessToken, refreshToken, role, id, khoaPhongId } = response.data;

      // Lưu thông tin cơ bản vào localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('role', role);
      localStorage.setItem('userId', id);
      localStorage.setItem('khoaPhongId', khoaPhongId);
      
      // Lưu username từ form đăng nhập
      localStorage.setItem('tenDangNhap', credentials.tenDangNhap);
      
      console.log('Token saved:', { accessToken, role, khoaPhongId, tenDangNhap: credentials.tenDangNhap });

      try {
        // Gọi API để lấy thông tin chi tiết user (bao gồm tên khoa phòng)
        const userProfileResponse = await axiosInstance.get('/user/current');
        const userProfile = userProfileResponse.data;
        
        // Lưu thêm thông tin chi tiết nếu có
        if (userProfile.tenKhoaPhong) {
          localStorage.setItem('tenKhoaPhong', userProfile.tenKhoaPhong);
        }
        if (userProfile.hoTen) {
          localStorage.setItem('hoTen', userProfile.hoTen);
        }
        
        console.log('User profile loaded:', userProfile);
      } catch (profileError) {
        console.warn('Could not load user profile:', profileError);
        // Không làm gián đoạn quá trình đăng nhập nếu không lấy được profile
      }

      toast.success('Đăng nhập thành công!');
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Login error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      toast.error(error.response?.data?.error || 'Đăng nhập thất bại. Vui lòng kiểm tra tên đăng nhập và mật khẩu!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-gradient" style={{ background: 'linear-gradient(135deg, #e0f7fa, #ffffff)' }}>
      <div className="card p-4 shadow-lg" style={{ maxWidth: '420px', width: '100%', borderRadius: '15px' }}>
        <div className="text-center mb-4">
          <img src={logoTanPhu} alt="Logo Bệnh viện Tân Phú" className="img-fluid" style={{ maxWidth: '180px', marginBottom: '15px' }} />
          <h2 className="text-primary fw-bold">Hệ Thống Chấm Công</h2>
          <p className="text-muted">Bệnh viện Tân Phú</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="tenDangNhap" className="form-label fw-medium">Tên đăng nhập</label>
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
            />
          </div>
          <div className="mb-4">
            <label htmlFor="matKhau" className="form-label fw-medium">Mật khẩu</label>
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
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg w-100 mb-3" disabled={isLoading}>
            {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
          <div className="text-center">
            <a href="#" className="text-decoration-none text-muted small">Quên mật khẩu?</a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DangNhap;
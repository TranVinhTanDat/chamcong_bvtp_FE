import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { toast } from 'react-toastify';
import logoTanPhu from '../../components/assets/images/logo tan phu_hinh.png'; // Fix path if needed

function DangNhap() {
  const [credentials, setCredentials] = useState({ tenDangNhap: '', matKhau: '' });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Attempting login with:', credentials);
      const response = await axiosInstance.post('/auth/dangnhap', credentials);
      const { accessToken, refreshToken, role, id } = response.data;

      // Store tokens and user info
      localStorage.setItem('jwtToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('role', role);
      localStorage.setItem('userId', id);

      toast.success('Đăng nhập thành công!');
      navigate('/');
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      toast.error(error.response?.data || 'Đăng nhập thất bại. Vui lòng kiểm tra tên đăng nhập và mật khẩu!');
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
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg w-100 mb-3" style={{ backgroundColor: '#0d6efd', borderColor: '#0d6efd' }}>
            Đăng nhập
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
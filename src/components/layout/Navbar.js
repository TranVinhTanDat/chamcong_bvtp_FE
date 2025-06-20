import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';

function Navbar() {
  const navigate = useNavigate();
  const [tenKhoaPhong, setTenKhoaPhong] = useState('');
  const role = localStorage.getItem('role');
  const khoaPhongId = localStorage.getItem('khoaPhongId');

  useEffect(() => {
    // Chỉ fetch tên khoa phòng nếu không phải ADMIN và có khoaPhongId
    if (role !== 'ADMIN' && khoaPhongId) {
      fetchTenKhoaPhong();
    }
  }, [role, khoaPhongId]);

  const fetchTenKhoaPhong = async () => {
    try {
      const response = await axiosInstance.get('/khoa-phong');
      const khoaPhong = response.data.find(kp => kp.id === parseInt(khoaPhongId));
      if (khoaPhong) {
        setTenKhoaPhong(khoaPhong.tenKhoaPhong);
        // Lưu vào localStorage để sử dụng sau này
        localStorage.setItem('tenKhoaPhong', khoaPhong.tenKhoaPhong);
      }
    } catch (error) {
      console.error('Error fetching khoa phong:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    localStorage.removeItem('khoaPhongId');
    localStorage.removeItem('tenDangNhap');
    localStorage.removeItem('tenKhoaPhong');
    navigate('/dang-nhap');
  };

  const displayRole = () => {
    switch(role) {
      case 'ADMIN':
        return 'Quản trị viên';
      case 'NGUOICHAMCONG':
        return 'Người chấm công';
      case 'NGUOITONGHOP':
        return 'Người tổng hợp';
      default:
        return 'Người dùng';
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm border-bottom sticky-top">
      <div className="container-fluid px-4">
        {/* Logo/Brand */}
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <img
            src="http://benhvientanphu.vn/Image/Picture/Logo/logo.png"
            alt="Logo Bệnh viện Tân Phú"
            style={{ maxWidth: '180px', height: 'auto' }}
          />
        </Link>

        {/* Right Side Items */}
        <div className="d-flex align-items-center ms-auto">
          {/* User Profile */}
          <div className="dropdown">
            <button
              className="btn btn-link text-decoration-none d-flex align-items-center"
              type="button"
              data-bs-toggle="dropdown"
            >
              <div className="d-none d-sm-block text-start">
                <small className="text-muted d-block">{displayRole()}</small>
                {/* Chỉ hiển thị khoa phòng nếu không phải ADMIN */}
                {role !== 'ADMIN' && (
                  <small className="text-muted">{tenKhoaPhong || localStorage.getItem('tenKhoaPhong') || 'Đang tải...'}</small>
                )}
              </div>
              <i className="ri-arrow-down-s-line text-muted ms-2"></i>
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow">
              <li>
                <a className="dropdown-item d-flex align-items-center" href="#">
                  <i className="ri-user-line me-2"></i>
                  Hồ sơ cá nhân
                </a>
              </li>
              <li>
                <a className="dropdown-item d-flex align-items-center" href="#">
                  <i className="ri-settings-3-line me-2"></i>
                  Cài đặt
                </a>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button
                  className="dropdown-item d-flex align-items-center text-danger"
                  onClick={handleLogout}
                >
                  <i className="ri-logout-box-r-line me-2"></i>
                  Đăng xuất
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
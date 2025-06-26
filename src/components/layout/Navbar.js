import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import ChangePasswordModal from '../modals/ChangePasswordModal';
import UserProfileModal from '../modals/UserProfileModal';
import logoTanPhu from '../assets/images/logo tan phu_hinh.png';

function Navbar() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState({
    tenDangNhap: '',
    tenKhoaPhong: '',
    role: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  
  // Lấy từ localStorage làm fallback
  const fallbackRole = localStorage.getItem('role');
  const fallbackKhoaPhongId = localStorage.getItem('khoaPhongId');
  const fallbackTenDangNhap = localStorage.getItem('tenDangNhap');

  useEffect(() => {
    // Gọi API lấy thông tin user hiện tại
    fetchCurrentUserInfo();
  }, []);

  const fetchCurrentUserInfo = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get('/user/current');
      const userData = response.data;
      
      setUserInfo({
        tenDangNhap: userData.tenDangNhap,
        tenKhoaPhong: userData.tenKhoaPhong,
        role: userData.role
      });
      
      // Cập nhật localStorage với thông tin mới nhất
      localStorage.setItem('tenDangNhap', userData.tenDangNhap);
      localStorage.setItem('tenKhoaPhong', userData.tenKhoaPhong);
      localStorage.setItem('role', userData.role);
      
    } catch (error) {
      console.error('Error fetching user info:', error);
      
      // Fallback sử dụng dữ liệu từ localStorage
      setUserInfo({
        tenDangNhap: fallbackTenDangNhap || '',
        tenKhoaPhong: localStorage.getItem('tenKhoaPhong') || '',
        role: fallbackRole || ''
      });
      
      // Nếu có khoaPhongId thì fetch tên khoa phòng như cũ (fallback)
      if (fallbackRole !== 'ADMIN' && fallbackKhoaPhongId && !localStorage.getItem('tenKhoaPhong')) {
        fetchTenKhoaPhongFallback();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function fallback để fetch tên khoa phòng nếu API /user/current lỗi
  const fetchTenKhoaPhongFallback = async () => {
    try {
      const response = await axiosInstance.get('/khoa-phong');
      const khoaPhong = response.data.find(kp => kp.id === parseInt(fallbackKhoaPhongId));
      if (khoaPhong) {
        setUserInfo(prev => ({
          ...prev,
          tenKhoaPhong: khoaPhong.tenKhoaPhong
        }));
        localStorage.setItem('tenKhoaPhong', khoaPhong.tenKhoaPhong);
      }
    } catch (error) {
      console.error('Error fetching khoa phong fallback:', error);
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
    const currentRole = userInfo.role || fallbackRole;
    switch(currentRole) {
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

  const getCurrentRole = () => {
    return userInfo.role || fallbackRole;
  };

  const getDisplayName = () => {
    if (isLoading) return 'Đang tải...';
    return userInfo.tenDangNhap || fallbackTenDangNhap || 'Người dùng';
  };

  const getKhoaPhongName = () => {
    if (isLoading) return 'Đang tải...';
    return userInfo.tenKhoaPhong || localStorage.getItem('tenKhoaPhong') || 'Đang tải...';
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm border-bottom sticky-top">
      <div className="container-fluid px-4">
        {/* Logo/Brand */}
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <div className="d-flex align-items-center">
            {/* Logo */}
            <img
              src={logoTanPhu}
              alt="Logo Bệnh viện Quận Tân Phú"
              className="me-3"
              style={{ 
                height: '50px', 
                width: 'auto',
                objectFit: 'contain'
              }}
            />
            
            {/* Hospital Name */}
            <div className="d-none d-md-block">
              <div className="hospital-name">
                <div className="hospital-main-name">
                  BỆNH VIỆN QUẬN TÂN PHÚ
                </div>
                <div className="hospital-sub-name">
                  Hệ thống Chấm công
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Right Side Items */}
        <div className="d-flex align-items-center ms-auto">
          {/* User Profile */}
          <div className="dropdown">
            <button
              className="btn btn-link text-decoration-none d-flex align-items-center"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <div className="d-none d-sm-block text-start me-2">
                {/* Hiển thị username */}
                <div className="fw-medium text-dark" style={{ fontSize: '0.95rem' }}>
                  {getDisplayName()}
                </div>
                
                {/* Hiển thị role */}
                <small className="text-muted d-block" style={{ fontSize: '0.8rem' }}>
                  {displayRole()}
                </small>
                
                {/* Chỉ hiển thị khoa phòng nếu không phải ADMIN */}
                {getCurrentRole() !== 'ADMIN' && (
                  <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                    {getKhoaPhongName()}
                  </small>
                )}
              </div>
              
              {/* Avatar hoặc icon user */}
              <div className="d-flex align-items-center">
                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" 
                     style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                  {getDisplayName().charAt(0).toUpperCase()}
                </div>
                <i className="ri-arrow-down-s-line text-muted"></i>
              </div>
            </button>
            
            <ul className="dropdown-menu dropdown-menu-end shadow">
              <li>
                <button 
                  className="dropdown-item d-flex align-items-center"
                  onClick={() => setShowUserProfileModal(true)}
                >
                  <i className="ri-user-line me-2"></i>
                  Hồ sơ cá nhân
                </button>
              </li>
              <li>
                <button 
                  className="dropdown-item d-flex align-items-center"
                  onClick={() => setShowChangePasswordModal(true)}
                >
                  <i className="ri-lock-password-line me-2"></i>
                  Đổi mật khẩu
                </button>
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

      {/* Modals */}
      <ChangePasswordModal 
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
      <UserProfileModal 
        isOpen={showUserProfileModal}
        onClose={() => setShowUserProfileModal(false)}
      />

      {/* Custom CSS for Hospital Name */}
      <style jsx>{`
        .hospital-name {
          line-height: 1.2;
        }
        
        .hospital-main-name {
          font-size: 1.1rem;
          font-weight: 700;
          color: #2c5aa0;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        
        .hospital-sub-name {
          font-size: 0.8rem;
          font-weight: 500;
          color: #6c757d;
          letter-spacing: 0.3px;
        }
        
        /* Responsive design */
        @media (max-width: 991px) {
          .hospital-name {
            display: none;
          }
        }
        
        @media (max-width: 767px) {
          .navbar-brand img {
            height: 40px !important;
          }
        }
        
        /* Hover effect */
        .navbar-brand:hover .hospital-main-name {
          color: #1a4d8c;
          transition: color 0.2s ease;
        }
        
        .navbar-brand:hover .hospital-sub-name {
          color: #495057;
          transition: color 0.2s ease;
        }
      `}</style>
    </nav>
  );
}

export default Navbar;
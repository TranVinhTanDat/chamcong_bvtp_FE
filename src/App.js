import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import Home from './components/pages/Home';
import DangNhap from './components/pages/DangNhap';
import ChamCong from './components/pages/ChamCong';
import QuanLyBangChamCong from './components/pages/QuanLyBangChamCong';
import QuanLyDanhSachNhanSu from './components/pages/QuanLyDanhSachNhanSu';
import QuanTriUser from './components/pages/QuanTriUser';
import QuanTriKhoaPhong from './components/pages/QuanTriKhoaPhong'
import CaiDatKyHieuChamCong from './components/pages/CaiDatKyHieuChamCong';
import CaiDatCaLamViec from './components/pages/CaiDatCaLamViec';

import './components/assets/style/variables.css';
import './components/assets/style/ChamCong.css';

import { ToastContainer } from 'react-toastify';
import './App.css';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const accessToken = localStorage.getItem('accessToken');
      const isAuth = !!accessToken;
      
      setIsAuthenticated(isAuth);
      setIsCheckingAuth(false);
      
      // Nếu không có token và không ở trang đăng nhập, chuyển về trang đăng nhập
      if (!isAuth && location.pathname !== '/dang-nhap') {
        navigate('/dang-nhap', { replace: true });
      }
      // Nếu có token và đang ở trang đăng nhập, chuyển về home
      else if (isAuth && location.pathname === '/dang-nhap') {
        navigate('/', { replace: true });
      }
    };

    // Kiểm tra ngay khi component mount
    checkAuth();

    // Lắng nghe sự thay đổi của localStorage (token hết hạn từ tab khác)
    const handleStorageChange = (e) => {
      if (e.key === 'accessToken') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [navigate, location.pathname]);

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Hiển thị loading khi đang kiểm tra auth
  if (isCheckingAuth) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <div className="mt-3">
            <h5 className="text-muted">Đang kiểm tra đăng nhập...</h5>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex">
      {isAuthenticated && <Sidebar onToggle={handleToggleSidebar} isCollapsed={isCollapsed} />}
      <div className="flex-grow-1" style={{ marginLeft: isAuthenticated ? (isCollapsed ? '70px' : '250px') : '0', transition: 'margin-left 0.3s ease' }}>
        {isAuthenticated && <Navbar />}
        <div className="p-4 bg-light min-vh-100">
          <Routes>
            <Route path="/dang-nhap" element={<DangNhap />} />
            
            {/* Protected Routes */}
            <Route path="/" element={
              isAuthenticated ? <Home /> : <Navigate to="/dang-nhap" replace />
            } />
            <Route path="/cham-cong" element={
              isAuthenticated ? <ChamCong /> : <Navigate to="/dang-nhap" replace />
            } />
            <Route path="/quan-ly-bang-cham-cong" element={
              isAuthenticated ? <QuanLyBangChamCong /> : <Navigate to="/dang-nhap" replace />
            } />
            <Route path="/quan-ly-danh-sach-nhan-su" element={
              isAuthenticated ? <QuanLyDanhSachNhanSu /> : <Navigate to="/dang-nhap" replace />
            } />
            <Route path="/quan-tri-user" element={
              isAuthenticated ? <QuanTriUser /> : <Navigate to="/dang-nhap" replace />
            } />
            <Route path="/quan-tri-khoa-phong" element={
              isAuthenticated ? <QuanTriKhoaPhong /> : <Navigate to="/dang-nhap" replace />
            } />
            <Route path="/cai-dat-ky-hieu-cham-cong" element={
              isAuthenticated ? <CaiDatKyHieuChamCong /> : <Navigate to="/dang-nhap" replace />
            } />
            <Route path="/cai-dat-ca-lam-viec" element={
              isAuthenticated ? <CaiDatCaLamViec /> : <Navigate to="/dang-nhap" replace />
            } />
            
            {/* Catch all route - redirect to login */}
            <Route path="*" element={<Navigate to="/dang-nhap" replace />} />
          </Routes>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}

export default AppWrapper;
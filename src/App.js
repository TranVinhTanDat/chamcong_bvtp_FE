import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken'));

  useEffect(() => {
    const checkAuth = () => {
      const accessToken = localStorage.getItem('accessToken');
      setIsAuthenticated(!!accessToken);
      if (!accessToken && window.location.pathname !== '/dang-nhap') {
        navigate('/dang-nhap', { replace: true });
      }
    };

    // Kiểm tra ngay khi component mount
    checkAuth();

    // Lắng nghe sự thay đổi của localStorage
    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [navigate]);

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="d-flex">
      {isAuthenticated && <Sidebar onToggle={handleToggleSidebar} isCollapsed={isCollapsed} />}
      <div className="flex-grow-1" style={{ marginLeft: isAuthenticated ? (isCollapsed ? '70px' : '250px') : '0', transition: 'margin-left 0.3s ease' }}>
        {isAuthenticated && <Navbar />}
        <div className="p-4 bg-light min-vh-100">
          <Routes>
            <Route path="/dang-nhap" element={<DangNhap />} />
            <Route path="/" element={isAuthenticated ? <Home /> : <Navigate to="/dang-nhap" replace />} />
            <Route path="/cham-cong" element={isAuthenticated ? <ChamCong /> : <Navigate to="/dang-nhap" replace />} />
            <Route path="/quan-ly-bang-cham-cong" element={isAuthenticated ? <QuanLyBangChamCong /> : <Navigate to="/dang-nhap" replace />} />
            <Route path="/quan-ly-danh-sach-nhan-su" element={isAuthenticated ? <QuanLyDanhSachNhanSu /> : <Navigate to="/dang-nhap" replace />} />
            <Route path="/quan-tri-user" element={isAuthenticated ? <QuanTriUser /> : <Navigate to="/dang-nhap" replace />} />
            <Route path="/quan-tri-khoa-phong" element={isAuthenticated ? <QuanTriKhoaPhong /> : <Navigate to="/dang-nhap" replace />} />
            <Route path="/cai-dat-ky-hieu-cham-cong" element={isAuthenticated ? <CaiDatKyHieuChamCong /> : <Navigate to="/dang-nhap" replace />} />
            <Route path="/cai-dat-ca-lam-viec" element={isAuthenticated ? <CaiDatCaLamViec /> : <Navigate to="/dang-nhap" replace />} />
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
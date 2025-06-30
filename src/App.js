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
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Hàm kiểm tra token có hợp lệ không
const isTokenValid = (token) => {
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    // Thêm buffer 2 phút để tránh token hết hạn giữa chừng
    return payload.exp > (currentTime + 120);
  } catch (error) {
    console.error('Invalid token format:', error);
    return false;
  }
};

// Component để bảo vệ route
const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const accessToken = localStorage.getItem('accessToken');
  
  useEffect(() => {
    if (!accessToken || !isTokenValid(accessToken)) {
      // Xóa token không hợp lệ
      localStorage.clear();
      navigate('/dang-nhap', { replace: true });
    }
  }, [accessToken, navigate]);
  
  if (!accessToken || !isTokenValid(accessToken)) {
    return null;
  }
  
  return children;
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const accessToken = localStorage.getItem('accessToken');
      const isValidToken = accessToken && isTokenValid(accessToken);
      
      setIsAuthenticated(isValidToken);
      
      // Nếu không có token hợp lệ và không ở trang đăng nhập
      if (!isValidToken && location.pathname !== '/dang-nhap') {
        // Xóa toàn bộ localStorage
        localStorage.clear();
        navigate('/dang-nhap', { replace: true });
      }
      // Nếu có token hợp lệ và đang ở trang đăng nhập
      else if (isValidToken && location.pathname === '/dang-nhap') {
        navigate('/', { replace: true });
      }
      
      setIsLoading(false);
    };

    // Kiểm tra ngay khi component mount
    checkAuth();

    // Kiểm tra định kỳ mỗi 2 phút (cho token 5 giờ)
    const intervalId = setInterval(() => {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken && !isTokenValid(accessToken)) {
        localStorage.clear();
        setIsAuthenticated(false);
        navigate('/dang-nhap', { replace: true });
      }
    }, 2 * 60 * 1000); // 2 phút

    // Lắng nghe sự thay đổi của localStorage
    const handleStorageChange = (e) => {
      if (e.key === 'accessToken') {
        checkAuth();
      }
    };

    // Lắng nghe sự thay đổi visibility để kiểm tra token khi user quay lại tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [navigate, location.pathname]);

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Hiển thị loading khi đang kiểm tra authentication
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
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
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/cham-cong" 
              element={
                <ProtectedRoute>
                  <ChamCong />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/quan-ly-bang-cham-cong" 
              element={
                <ProtectedRoute>
                  <QuanLyBangChamCong />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/quan-ly-danh-sach-nhan-su" 
              element={
                <ProtectedRoute>
                  <QuanLyDanhSachNhanSu />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/quan-tri-user" 
              element={
                <ProtectedRoute>
                  <QuanTriUser />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/quan-tri-khoa-phong" 
              element={
                <ProtectedRoute>
                  <QuanTriKhoaPhong />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/cai-dat-ky-hieu-cham-cong" 
              element={
                <ProtectedRoute>
                  <CaiDatKyHieuChamCong />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/cai-dat-ca-lam-viec" 
              element={
                <ProtectedRoute>
                  <CaiDatCaLamViec />
                </ProtectedRoute>
              } 
            />
            {/* Route mặc định */}
            <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/dang-nhap"} replace />} />
          </Routes>
        </div>
      </div>
      
      <ToastContainer 
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        limit={3}
      />
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
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import Home from './components/pages/Home';
import DangNhap from './components/pages/DangNhap';
import ChamCong from './components/pages/ChamCong';
import QuanLyBangChamCong from './components/pages/QuanLyBangChamCong';
import QuanLyDanhSachNhanSu from './components/pages/QuanLyDanhSachNhanSu';
import './components/assets/style/variables.css';
import { ToastContainer } from 'react-toastify';
import './App.css';

function App() {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const jwtToken = localStorage.getItem('jwtToken');
    if (!jwtToken) {
      navigate('/dang-nhap');
    }
  }, [navigate]);

  const isAuthenticated = () => {
    const jwtToken = localStorage.getItem('jwtToken');
    return jwtToken !== null;
  };

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="d-flex">
      {isAuthenticated() && <Sidebar onToggle={handleToggleSidebar} isCollapsed={isCollapsed} />}
      <div className="flex-grow-1" style={{ marginLeft: isAuthenticated() ? (isCollapsed ? '70px' : '250px') : '0', transition: 'margin-left 0.3s ease' }}>
        {isAuthenticated() && <Navbar />}
        <div className="p-4 bg-light min-vh-100">
          <Routes>
            <Route path="/dang-nhap" element={!isAuthenticated() ? <DangNhap /> : <Navigate to="/" />} />
            <Route path="/" element={isAuthenticated() ? <Home /> : <Navigate to="/dang-nhap" />} />
            <Route path="/cham-cong" element={isAuthenticated() ? <ChamCong /> : <Navigate to="/dang-nhap" />} />
            <Route path="/quan-ly-bang-cham-cong" element={isAuthenticated() ? <QuanLyBangChamCong /> : <Navigate to="/dang-nhap" />} />
            <Route path="/quan-ly-danh-sach-nhan-su" element={isAuthenticated() ? <QuanLyDanhSachNhanSu /> : <Navigate to="/dang-nhap" />} />
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
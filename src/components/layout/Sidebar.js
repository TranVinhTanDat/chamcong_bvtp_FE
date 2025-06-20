import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function Sidebar({ onToggle, isCollapsed }) {
  const location = useLocation();
  const navigate = useNavigate();

  const userRole = localStorage.getItem('role'); // Lấy role từ localStorage

  const menuItems = [
    {
      title: 'Trang chủ',
      icon: 'ri-home-4-line',
      path: '/',
      active: location.pathname === '/',
    },
    {
      title: 'Chấm công',
      icon: 'ri-time-line',
      children: [
        { title: 'Chấm công', path: '/cham-cong', active: location.pathname === '/cham-cong' },
        { title: 'Quản lý bảng chấm công', path: '/quan-ly-bang-cham-cong', active: location.pathname === '/quan-ly-bang-cham-cong' },
        { title: 'Danh sách nhân sự', path: '/quan-ly-danh-sach-nhan-su', active: location.pathname === '/quan-ly-danh-sach-nhan-su' },
      ],
    },
    ...(userRole === 'ADMIN' ? [ // Chỉ hiển thị "Quản trị" và "Báo cáo" nếu role là ADMIN
      {
        title: 'Quản trị',
        icon: 'ri-shield-user-line',
        children: [
          { title: 'Quản trị user', path: '/quan-tri-user', active: location.pathname === '/quan-tri-user' },
          { title: 'Quản trị khoa phòng', path: '/quan-tri-khoa-phong', active: location.pathname === '/quan-tri-khoa-phong' },
          { title: 'Cài đặt ký hiệu chấm công', path: '/cai-dat-ky-hieu-cham-cong', active: location.pathname === '/cai-dat-ky-hieu-cham-cong' },
          { title: 'Cài đặt ca làm việc', path: '/cai-dat-ca-lam-viec', active: location.pathname === '/cai-dat-ca-lam-viec' },
        ],
      },
      {
        title: 'Báo cáo',
        icon: 'ri-bar-chart-box-line',
        children: [
          { title: 'Báo cáo chấm công', path: '/bao-cao-cham-cong', active: location.pathname === '/bao-cao-cham-cong' },
        ],
      },
    ] : []),
  ];
  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    navigate('/dang-nhap');
  };

  return (
    <div
      className={`sidebar bg-white shadow-sm border-end ${isCollapsed ? 'collapsed' : ''}`}
      style={{
        width: isCollapsed ? '70px' : '250px',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 1030,
        transition: 'width 0.3s ease',
        overflowY: 'auto',
      }}
    >
      <div className="d-flex align-items-center justify-content-between p-3 border-bottom">
        {!isCollapsed && (
          <div className="d-flex align-items-center">
            <i className="ri-building-line text-primary fs-4 me-2"></i>
            <span className="fw-bold text-primary">ATTENDANCE</span>
          </div>
        )}
        <button className="btn btn-outline-secondary btn-sm border-0" onClick={onToggle}>
          <i className={`${isCollapsed ? 'ri-menu-unfold-line' : 'ri-menu-fold-line'}`}></i>
        </button>
      </div>

      <nav className="mt-3">
        <ul className="nav flex-column">
          {menuItems.map((item, index) => (
            <li key={index} className="nav-item">
              {item.children ? (
                <div className="dropdown">
                  <button
                    className="btn btn-link nav-link text-start w-100 d-flex align-items-center text-decoration-none"
                    type="button"
                    data-bs-toggle="dropdown"
                    style={{ color: '#6c757d' }}
                  >
                    <i className={item.icon} style={{ width: '20px' }}></i>
                    {!isCollapsed && (
                      <>
                        <span className="flex-grow-1">{item.title}</span>
                        <i className="ri-arrow-down-s-line"></i>
                      </>
                    )}
                  </button>
                  <ul className="dropdown-menu w-100 border-0 shadow-sm">
                    {item.children.map((child, childIndex) => (
                      <li key={childIndex}>
                        <Link
                          className={`dropdown-item d-flex align-items-center py-2 ${child.active ? 'active bg-primary text-white' : ''
                            }`}
                          to={child.path}
                        >
                          <i className="ri-arrow-right-s-line me-2"></i>
                          {child.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <Link
                  className={`nav-link d-flex align-items-center py-2 px-3 text-decoration-none ${item.active ? 'active bg-primary text-white' : 'text-dark'
                    }`}
                  to={item.path}
                  style={{
                    borderRadius: item.active ? '0.375rem' : '0',
                    margin: item.active ? '0 0.5rem' : '0',
                  }}
                >
                  <i className={item.icon} style={{ width: '20px' }}></i>
                  {!isCollapsed && <span>{item.title}</span>}
                </Link>
              )}
            </li>
          ))}
          <li className="nav-item mt-auto">
            <button
              className="nav-link d-flex align-items-center py-2 px-3 text-decoration-none text-danger"
              onClick={handleLogout}
              style={{ borderRadius: '0.375rem', margin: '0 0.5rem', background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
            >
              <i className="ri-logout-box-r-line me-2" style={{ width: '20px' }}></i>
              {!isCollapsed && <span>Đăng xuất</span>}
            </button>
          </li>
        </ul>
      </nav>

      {!isCollapsed && (
        <div className="mt-auto p-3 border-top" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <div className="d-flex align-items-center">
            <div className="flex-grow-1">
              <small className="text-muted d-block">Version 1.0.0</small>
              <small className="text-muted">© 2024 Attendance System</small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
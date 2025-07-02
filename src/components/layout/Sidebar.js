import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function Sidebar({ onToggle, isCollapsed }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedMenus, setExpandedMenus] = useState({});

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

  const toggleMenu = (index) => {
    setExpandedMenus(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Check if any child is active
  const hasActiveChild = (children) => {
    return children && children.some(child => child.active);
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
        zIndex: 1040,
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
            <li key={index} className="nav-item mb-1">
              {item.children ? (
                <div className="accordion-item border-0">
                  <button
                    className={`btn btn-link nav-link text-start w-100 d-flex align-items-center text-decoration-none px-3 py-2 border-0 ${
                      hasActiveChild(item.children) ? 'text-primary fw-semibold' : 'text-dark'
                    }`}
                    type="button"
                    onClick={() => toggleMenu(index)}
                    style={{
                      borderRadius: '0.375rem',
                      margin: '0 0.5rem',
                      background: hasActiveChild(item.children) ? 'rgba(13, 110, 253, 0.1)' : 'transparent',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <i className={item.icon} style={{ width: '20px', marginRight: '8px' }}></i>
                    {!isCollapsed && (
                      <>
                        <span className="flex-grow-1">{item.title}</span>
                        <i 
                          className={`ri-arrow-${expandedMenus[index] ? 'up' : 'down'}-s-line transition-transform`}
                          style={{ 
                            transition: 'transform 0.2s ease',
                            transform: expandedMenus[index] ? 'rotate(180deg)' : 'rotate(0deg)'
                          }}
                        ></i>
                      </>
                    )}
                  </button>
                  
                  {/* Submenu */}
                  <div 
                    className={`collapse ${expandedMenus[index] ? 'show' : ''}`}
                    style={{ 
                      transition: 'height 0.3s ease',
                      overflow: 'hidden'
                    }}
                  >
                    <div className="px-3">
                      {item.children.map((child, childIndex) => (
                        <Link
                          key={childIndex}
                          className={`nav-link d-flex align-items-center py-2 px-3 text-decoration-none mb-1 ${
                            child.active 
                              ? 'active bg-primary text-white shadow-sm' 
                              : 'text-muted hover-item'
                          }`}
                          to={child.path}
                          style={{
                            borderRadius: '0.25rem',
                            marginLeft: '1.5rem',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s ease',
                            position: 'relative'
                          }}
                        >
                          {/* Decorative element for sub-items */}
                          <div 
                            className={`sub-item-indicator ${child.active ? 'active' : ''}`}
                            style={{
                              position: 'absolute',
                              left: '-12px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: '4px',
                              height: '4px',
                              backgroundColor: child.active ? '#fff' : '#6c757d',
                              borderRadius: '50%',
                              transition: 'all 0.2s ease'
                            }}
                          ></div>
                          <span style={{ marginLeft: '4px' }}>{child.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  className={`nav-link d-flex align-items-center py-2 px-3 text-decoration-none ${
                    item.active ? 'active bg-primary text-white shadow-sm' : 'text-dark hover-item'
                  }`}
                  to={item.path}
                  style={{
                    borderRadius: '0.375rem',
                    margin: '0 0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <i className={item.icon} style={{ width: '20px', marginRight: '8px' }}></i>
                  {!isCollapsed && <span>{item.title}</span>}
                </Link>
              )}
            </li>
          ))}
          
          {/* Logout Button */}
          <li className="nav-item mt-auto">
            <button
              className="nav-link d-flex align-items-center py-2 px-3 text-decoration-none text-danger hover-item"
              onClick={handleLogout}
              style={{ 
                borderRadius: '0.375rem', 
                margin: '0 0.5rem', 
                background: 'none', 
                border: 'none', 
                width: 'calc(100% - 1rem)', 
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
            >
              <i className="ri-logout-box-r-line" style={{ width: '20px', marginRight: '8px' }}></i>
              {!isCollapsed && <span>Đăng xuất</span>}
            </button>
          </li>
        </ul>
      </nav>

      {!isCollapsed && (
        <div className="mt-auto p-3 border-top bg-light" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <div className="d-flex align-items-center">
            <div className="flex-grow-1">
              <small className="text-muted d-block fw-medium">Version 1.0.0</small>
              <small className="text-muted">© 2024 Attendance System</small>
            </div>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style jsx>{`
        .hover-item {
          transition: all 0.2s ease;
        }
        
        .hover-item:hover {
          background-color: rgba(13, 110, 253, 0.1) !important;
          color: #0d6efd !important;
          transform: translateX(2px);
        }
        
        .nav-link.active {
          box-shadow: 0 2px 4px rgba(13, 110, 253, 0.3);
        }
        
        .sub-item-indicator.active {
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
        }
        
        .sidebar {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        
        .sidebar::-webkit-scrollbar {
          width: 6px;
        }
        
        .sidebar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .sidebar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        
        .sidebar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        .accordion-item .btn:focus {
          box-shadow: none;
        }
        
        .transition-transform {
          transition: transform 0.2s ease;
        }
        
        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(${isCollapsed ? '-100%' : '0'});
            width: 250px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Sidebar;
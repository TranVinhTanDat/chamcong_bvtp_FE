import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    navigate('/dang-nhap');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm border-bottom sticky-top">
      <div className="container-fluid px-4">
        {/* Logo/Brand */}
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <i className="ri-building-line me-2 fs-4 text-primary"></i>
          <span className="fw-bold text-primary">Hệ Thống Chấm Công</span>
        </Link>

        {/* Search Bar */}
        <div className="d-none d-md-flex mx-auto" style={{ maxWidth: '400px', width: '100%' }}>
          <div className="input-group">
            <span className="input-group-text bg-light border-end-0">
              <i className="ri-search-line text-muted"></i>
            </span>
            <input 
              type="text" 
              className="form-control border-start-0 bg-light" 
              placeholder="Tìm kiếm..."
            />
          </div>
        </div>

        {/* Right Side Items */}
        <div className="d-flex align-items-center">
          {/* Notifications */}
          <div className="dropdown me-3">
            <button 
              className="btn btn-outline-secondary border-0 position-relative" 
              type="button" 
              data-bs-toggle="dropdown"
            >
              <i className="ri-notification-3-line fs-5"></i>
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
                3
              </span>
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow" style={{ minWidth: '300px' }}>
              <li><h6 className="dropdown-header">Thông báo mới</h6></li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <a className="dropdown-item d-flex align-items-center py-2" href="#">
                  <i className="ri-user-add-line text-primary me-2"></i>
                  <div>
                    <div className="fw-semibold">Nhân viên mới</div>
                    <small className="text-muted">Nguyễn Văn A đã tham gia</small>
                  </div>
                </a>
              </li>
              <li>
                <a className="dropdown-item d-flex align-items-center py-2" href="#">
                  <i className="ri-time-line text-warning me-2"></i>
                  <div>
                    <div className="fw-semibold">Chấm công trễ</div>
                    <small className="text-muted">5 nhân viên đi trễ hôm nay</small>
                  </div>
                </a>
              </li>
            </ul>
          </div>

          {/* User Profile */}
          <div className="dropdown">
            <button 
              className="btn btn-link text-decoration-none d-flex align-items-center" 
              type="button" 
              data-bs-toggle="dropdown"
            >
              <img 
                src="https://via.placeholder.com/32x32/007bff/ffffff?text=A" 
                alt="Avatar" 
                className="rounded-circle me-2"
                width="32"
                height="32"
              />
              <div className="d-none d-sm-block text-start">
                <div className="fw-semibold text-dark">Admin</div>
                <small className="text-muted">Quản trị viên</small>
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
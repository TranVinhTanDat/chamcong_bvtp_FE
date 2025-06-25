import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { toast } from 'react-toastify';

function UserProfileModal({ isOpen, onClose }) {
  const [userInfo, setUserInfo] = useState({
    id: '',
    tenDangNhap: '',
    email: '',
    role: '',
    tenKhoaPhong: '',
    thoiGianTao: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    email: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchUserInfo();
    }
  }, [isOpen]);

  const fetchUserInfo = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get('/user/current');
      const userData = response.data;
      setUserInfo(userData);
      setFormData({ email: userData.email });
    } catch (error) {
      toast.error('Không thể tải thông tin người dùng');
      console.error('Error fetching user info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  const displayRole = (role) => {
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

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      setFormData({ email: userInfo.email });
    }
  };

  const handleEmailChange = (e) => {
    setFormData({ email: e.target.value });
  };

  const handleSaveEmail = async () => {
    if (!formData.email) {
      toast.error('Email không được để trống');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Email không hợp lệ');
      return;
    }

    try {
      setIsLoading(true);
      await axiosInstance.put(`/user/${userInfo.id}`, {
        tenDangNhap: userInfo.tenDangNhap,
        email: formData.email,
        role: { tenVaiTro: userInfo.role },
        khoaPhong: { id: userInfo.khoaPhongId }
      });
      
      toast.success('Cập nhật email thành công!');
      setUserInfo(prev => ({ ...prev, email: formData.email }));
      setIsEditing(false);
    } catch (error) {
      const errorMsg = error.response?.data || 'Có lỗi xảy ra khi cập nhật email';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={`modal fade show`} style={{ display: 'block' }} tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="ri-user-line me-2"></i>
                Hồ sơ cá nhân
              </h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={handleClose}
                disabled={isLoading}
              ></button>
            </div>
            
            <div className="modal-body">
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Đang tải...</span>
                  </div>
                  <div className="mt-2">Đang tải thông tin...</div>
                </div>
              ) : (
                <div className="row">
                  {/* Avatar và thông tin cơ bản */}
                  <div className="col-md-4 text-center">
                    <div className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                         style={{ width: '100px', height: '100px', fontSize: '2rem' }}>
                      {userInfo.tenDangNhap?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <h5 className="fw-bold">{userInfo.tenDangNhap}</h5>
                    <span className="badge bg-primary px-3 py-2">
                      {displayRole(userInfo.role)}
                    </span>
                  </div>

                  {/* Thông tin chi tiết */}
                  <div className="col-md-8">
                    <div className="card border-0 bg-light">
                      <div className="card-body">
                        <h6 className="card-title text-primary mb-3">
                          <i className="ri-information-line me-2"></i>
                          Thông tin chi tiết
                        </h6>
                        
                        <div className="row mb-3">
                          <div className="col-sm-4">
                            <strong>ID:</strong>
                          </div>
                          <div className="col-sm-8">
                            <span className="badge bg-secondary">{userInfo.id}</span>
                          </div>
                        </div>

                        <div className="row mb-3">
                          <div className="col-sm-4">
                            <strong>Tên đăng nhập:</strong>
                          </div>
                          <div className="col-sm-8">
                            {userInfo.tenDangNhap}
                          </div>
                        </div>

                        <div className="row mb-3">
                          <div className="col-sm-4">
                            <strong>Email:</strong>
                          </div>
                          <div className="col-sm-8">
                            {isEditing ? (
                              <div className="input-group">
                                <input
                                  type="email"
                                  className="form-control form-control-sm"
                                  value={formData.email}
                                  onChange={handleEmailChange}
                                  placeholder="Nhập email"
                                />
                                <button 
                                  className="btn btn-sm btn-success"
                                  onClick={handleSaveEmail}
                                  disabled={isLoading}
                                >
                                  <i className="ri-check-line"></i>
                                </button>
                                <button 
                                  className="btn btn-sm btn-secondary"
                                  onClick={handleEditToggle}
                                >
                                  <i className="ri-close-line"></i>
                                </button>
                              </div>
                            ) : (
                              <div className="d-flex align-items-center">
                                <span className="me-2">{userInfo.email}</span>
                                <button 
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={handleEditToggle}
                                  title="Chỉnh sửa email"
                                >
                                  <i className="ri-edit-line"></i>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="row mb-3">
                          <div className="col-sm-4">
                            <strong>Khoa/Phòng:</strong>
                          </div>
                          <div className="col-sm-8">
                            {userInfo.tenKhoaPhong || 'Chưa có'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleClose}
                disabled={isLoading}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  );
}

export default UserProfileModal;
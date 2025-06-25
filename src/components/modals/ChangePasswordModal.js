import React, { useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { toast } from 'react-toastify';

function ChangePasswordModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.oldPassword || !formData.newPassword || !formData.confirmPassword) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }
    
    if (formData.newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    
    if (formData.oldPassword === formData.newPassword) {
      toast.error('Mật khẩu mới phải khác mật khẩu cũ');
      return;
    }

    setIsLoading(true);
    try {
      await axiosInstance.put('/user/current/password', {
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword
      });
      
      toast.success('Đổi mật khẩu thành công!');
      onClose();
      setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      const errorMsg = error.response?.data || 'Có lỗi xảy ra khi đổi mật khẩu';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswords({ old: false, new: false, confirm: false });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={`modal fade show`} style={{ display: 'block' }} tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="ri-lock-password-line me-2"></i>
                Đổi mật khẩu
              </h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={handleClose}
                disabled={isLoading}
              ></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Mật khẩu cũ */}
                <div className="mb-3">
                  <label htmlFor="oldPassword" className="form-label">
                    Mật khẩu cũ <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type={showPasswords.old ? 'text' : 'password'}
                      className="form-control"
                      id="oldPassword"
                      name="oldPassword"
                      value={formData.oldPassword}
                      onChange={handleChange}
                      placeholder="Nhập mật khẩu cũ"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => togglePasswordVisibility('old')}
                      disabled={isLoading}
                    >
                      <i className={`ri-${showPasswords.old ? 'eye-off' : 'eye'}-line`}></i>
                    </button>
                  </div>
                </div>

                {/* Mật khẩu mới */}
                <div className="mb-3">
                  <label htmlFor="newPassword" className="form-label">
                    Mật khẩu mới <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      className="form-control"
                      id="newPassword"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                      required
                      disabled={isLoading}
                      minLength="6"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => togglePasswordVisibility('new')}
                      disabled={isLoading}
                    >
                      <i className={`ri-${showPasswords.new ? 'eye-off' : 'eye'}-line`}></i>
                    </button>
                  </div>
                  <div className="form-text">
                    Mật khẩu phải có ít nhất 6 ký tự
                  </div>
                </div>

                {/* Xác nhận mật khẩu */}
                <div className="mb-3">
                  <label htmlFor="confirmPassword" className="form-label">
                    Xác nhận mật khẩu mới <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      className="form-control"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Nhập lại mật khẩu mới"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => togglePasswordVisibility('confirm')}
                      disabled={isLoading}
                    >
                      <i className={`ri-${showPasswords.confirm ? 'eye-off' : 'eye'}-line`}></i>
                    </button>
                  </div>
                  {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                    <div className="text-danger small mt-1">
                      Mật khẩu xác nhận không khớp
                    </div>
                  )}
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isLoading || !formData.oldPassword || !formData.newPassword || !formData.confirmPassword || formData.newPassword !== formData.confirmPassword}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Đang xử lý...
                    </>
                  ) : (
                    'Đổi mật khẩu'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  );
}

export default ChangePasswordModal;
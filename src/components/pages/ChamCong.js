import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import config from '../../utils/URL_BASE_API';

function ChamCong() {
  const [formData, setFormData] = useState({ maNhanVien: '', hoTen: '', emailNhanVien: '' });
  const navigate = useNavigate();
  const jwtToken = localStorage.getItem('jwtToken');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jwtToken) {
      toast.error('Vui lòng đăng nhập trước khi chấm công');
      navigate('/dang-nhap');
      return;
    }
    try {
      const response = await axios.post(
        `${config}/chamcong/checkin`,
        formData,
        { headers: { Authorization: `Bearer ${jwtToken}` } }
      );
      toast.success(response.data.message);
      setFormData({ maNhanVien: '', hoTen: '', emailNhanVien: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Lỗi khi chấm công');
    }
  };

  return (
    <div className="container-fluid p-4">
      <h1 className="h3 mb-4 text-primary">
        <i className="ri-time-line me-2"></i>Chấm công
      </h1>
      <div className="card p-4 shadow-sm">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Mã nhân viên</label>
            <input
              type="text"
              className="form-control"
              name="maNhanVien"
              value={formData.maNhanVien}
              onChange={handleChange}
              placeholder="Nhập mã nhân viên"
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Họ và tên</label>
            <input
              type="text"
              className="form-control"
              name="hoTen"
              value={formData.hoTen}
              onChange={handleChange}
              placeholder="Nhập họ và tên"
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              name="emailNhanVien"
              value={formData.emailNhanVien}
              onChange={handleChange}
              placeholder="Nhập email"
            />
          </div>
          <button type="submit" className="btn btn-primary w-100">
            <i className="ri-check-line me-2"></i>Check-in
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChamCong;
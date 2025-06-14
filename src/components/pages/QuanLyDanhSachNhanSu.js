import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { toast } from 'react-toastify';

function QuanLyDanhSachNhanSu() {
  const [nhanViens, setNhanViens] = useState([]);
  const jwtToken = localStorage.getItem('jwtToken');

  const fetchNhanViens = useCallback(async () => {
    if (!jwtToken) {
      toast.error('Vui lòng đăng nhập để truy cập');
      return;
    }
    try {
      console.log('Fetching nhan vien with token:', jwtToken);
      const response = await axiosInstance.get('/nhanvien');
      setNhanViens(response.data);
    } catch (error) {
      console.error('Error fetching nhan vien:', error.response?.data || error.message);
      toast.error('Lỗi khi tải danh sách nhân viên: ' + (error.response?.data?.error || error.message));
    }
  }, [jwtToken]);

  useEffect(() => {
    fetchNhanViens();
  }, [fetchNhanViens]);

  return (
    <div className="container-fluid p-4">
      <h1 className="h3 mb-4 text-primary">
        <i className="ri-user-3-line me-2"></i>Quản lý danh sách nhân sự
      </h1>
      <div className="card p-4 shadow-sm">
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Khoa phòng</th>
              <th>Chức vụ</th>
            </tr>
          </thead>
          <tbody>
            {nhanViens.map((nhanVien) => (
              <tr key={nhanVien.ma}>
                <td>{nhanVien.ma}</td>
                <td>{nhanVien.hoTen}</td>
                <td>{nhanVien.email}</td>
                <td>{nhanVien.khoaPhong?.tenKhoaPhong || 'Chưa có'}</td>
                <td>{nhanVien.chucVu?.tenChucVu || 'Chưa có'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default QuanLyDanhSachNhanSu;
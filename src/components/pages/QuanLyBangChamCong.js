import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { toast } from 'react-toastify';

function QuanLyBangChamCong() {
  const [chamCongs, setChamCongs] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState({});
  const jwtToken = localStorage.getItem('jwtToken');

  const fetchChamCongs = useCallback(async () => {
    if (!jwtToken) {
      toast.error('Vui lòng đăng nhập để truy cập');
      return;
    }
    try {
      console.log('Fetching cham cong with token:', jwtToken);
      const response = await axiosInstance.get('/chamcong/lichsu');
      setChamCongs(response.data);
    } catch (error) {
      console.error('Error fetching cham cong:', error.response?.data || error.message);
      toast.error('Lỗi khi tải lịch sử chấm công: ' + (error.response?.data?.error || error.message));
    }
  }, [jwtToken]);

  useEffect(() => {
    fetchChamCongs();
  }, [fetchChamCongs]);

  const handleStatusChange = (ma, e) => {
    setSelectedStatus((prev) => ({ ...prev, [ma]: e.target.value }));
  };

  const updateStatus = async (ma) => {
    if (!jwtToken) {
      toast.error('Vui lòng đăng nhập để cập nhật');
      return;
    }
    try {
      console.log(`Updating status for ma ${ma} to ${selectedStatus[ma]}`);
      await axiosInstance.put(`/chamcong/${ma}/trangthai`, { trangThai: selectedStatus[ma] });
      toast.success('Cập nhật trạng thái thành công');
      fetchChamCongs();
    } catch (error) {
      console.error('Error updating status:', error.response?.data || error.message);
      toast.error('Lỗi khi cập nhật trạng thái: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="container-fluid p-4">
      <h1 className="h3 mb-4 text-primary">
        <i className="ri-file-list-line me-2"></i>Quản lý bảng chấm công
      </h1>
      <div className="card p-4 shadow-sm">
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Nhân viên</th>
              <th>Thời gian Check-in</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {chamCongs.map((chamCong) => (
              <tr key={chamCong.ma}>
                <td>{chamCong.ma}</td>
                <td>{chamCong.nhanVien ? chamCong.nhanVien.hoTen : 'Chưa liên kết nhân viên'}</td>
                <td>{new Date(chamCong.thoiGianCheckIn).toLocaleString()}</td>
                <td>
                  <select
                    className="form-select"
                    value={selectedStatus[chamCong.ma] || chamCong.trangThaiChamCong.tenTrangThai}
                    onChange={(e) => handleStatusChange(chamCong.ma, e)}
                  >
                    <option value="CHO_DUYET">Chờ duyệt</option>
                    <option value="DA_DUYET">Đã duyệt</option>
                    <option value="TU_CHOI">Từ chối</option>
                  </select>
                </td>
                <td>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => updateStatus(chamCong.ma)}
                  >
                    <i className="ri-save-line"></i> Lưu
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default QuanLyBangChamCong;
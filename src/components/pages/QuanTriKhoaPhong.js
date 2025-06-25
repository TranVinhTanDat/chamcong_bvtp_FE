import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { toast } from 'react-toastify';

function QuanTriKhoaPhong() {
  const [khoaPhongs, setKhoaPhongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(0);
  const [newKhoaPhong, setNewKhoaPhong] = useState({ tenKhoaPhong: '', maKhoaPhong: '' });
  const [editKhoaPhong, setEditKhoaPhong] = useState(null);
  const userRole = localStorage.getItem('role');

  // Validation functions
  const validateMaKhoaPhong = (maKP) => {
    if (!maKP || maKP.trim() === '') return 'Mã khoa/phòng không được để trống';
    const normalizedMaKP = maKP.trim().toUpperCase();
    if (!/^[A-Z0-9_-]+$/.test(normalizedMaKP)) return 'Mã khoa/phòng chỉ được chứa chữ in hoa, số, _, -';
    if (normalizedMaKP.length < 2 || normalizedMaKP.length > 50) return 'Mã khoa/phòng phải có 2-50 ký tự';
    return true;
  };

  const validateTenKhoaPhong = (tenKP) => {
    if (!tenKP || tenKP.trim() === '') return 'Tên khoa/phòng không được để trống';
    if (tenKP.trim().length < 3) return 'Tên khoa/phòng phải có ít nhất 3 ký tự';
    if (tenKP.trim().length > 200) return 'Tên khoa/phòng không được quá 200 ký tự';
    return true;
  };

  const validateForm = (data) => {
    const tenValidation = validateTenKhoaPhong(data.tenKhoaPhong);
    const maValidation = validateMaKhoaPhong(data.maKhoaPhong);
    
    if (tenValidation !== true) {
      toast.error(tenValidation);
      return false;
    }
    if (maValidation !== true) {
      toast.error(maValidation);
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (userRole !== 'ADMIN') {
      toast.error('Bạn không có quyền truy cập trang này!');
      return;
    }
    fetchKhoaPhongs();
  }, [userRole, currentPage, searchTerm]);

  const fetchKhoaPhongs = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/khoa-phong/page', {
        params: { page: currentPage, size: pageSize, searchTerm: searchTerm || '' },
      });
      setKhoaPhongs(response.data.content || []);
      setTotalPages(response.data.totalPages || 0);
    } catch (error) {
      console.error('Error fetching khoa phongs:', error);
      toast.error(`Lỗi khi tải danh sách: ${error.response?.data || error.message || 'Kiểm tra kết nối'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddKhoaPhong = async (e) => {
    e.preventDefault();
    
    if (!validateForm(newKhoaPhong)) return;

    try {
      const payload = {
        tenKhoaPhong: newKhoaPhong.tenKhoaPhong.trim(),
        maKhoaPhong: newKhoaPhong.maKhoaPhong.trim().toUpperCase(),
      };
      
      await axiosInstance.post('/khoa-phong', payload);
      toast.success('Thêm khoa/phòng thành công!');
      setNewKhoaPhong({ tenKhoaPhong: '', maKhoaPhong: '' });
      fetchKhoaPhongs();
    } catch (error) {
      const errorMessage = error.response?.data;
      if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.error('Lỗi khi thêm khoa/phòng');
      }
    }
  };

  const handleEditKhoaPhong = (khoaPhong) => {
    setEditKhoaPhong({ ...khoaPhong });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    
    if (!validateForm(editKhoaPhong)) return;

    try {
      const payload = {
        tenKhoaPhong: editKhoaPhong.tenKhoaPhong.trim(),
        maKhoaPhong: editKhoaPhong.maKhoaPhong.trim().toUpperCase(),
      };
      
      await axiosInstance.put(`/khoa-phong/${editKhoaPhong.id}`, payload);
      toast.success('Cập nhật khoa/phòng thành công!');
      setEditKhoaPhong(null);
      fetchKhoaPhongs();
    } catch (error) {
      const errorMessage = error.response?.data;
      if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.error('Lỗi khi cập nhật khoa/phòng');
      }
    }
  };

  const handleDeleteKhoaPhong = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa khoa/phòng này?')) {
      try {
        await axiosInstance.delete(`/khoa-phong/${id}`);
        toast.success('Xóa khoa/phòng thành công!');
        fetchKhoaPhongs();
      } catch (error) {
        toast.error(error.response?.data || 'Lỗi khi xóa khoa/phòng');
      }
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  };

  return (
    <div className="container-fluid px-4 py-3" style={{ backgroundColor: '#f8f9fc', minHeight: '100vh' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1 text-primary fw-bold">
            <i className="ri-shield-user-line me-2"></i>Quản Trị Khoa Phòng
          </h1>
          <p className="text-muted mb-0">Quản lý danh sách khoa phòng</p>
        </div>
      </div>

      {/* Form thêm khoa phòng */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title fw-semibold mb-3">Thêm Khoa Phòng</h5>
          <form onSubmit={handleAddKhoaPhong} className="row g-3">
            <div className="col-md-4">
              <input
                type="text"
                className="form-control"
                placeholder="Tên khoa phòng"
                value={newKhoaPhong.tenKhoaPhong}
                onChange={(e) => setNewKhoaPhong({ ...newKhoaPhong, tenKhoaPhong: e.target.value })}
                required
                maxLength={200}
              />
            </div>
            <div className="col-md-4">
              <input
                type="text"
                className="form-control"
                placeholder="Mã khoa phòng (VD: NOI_TH, NGOAI-01)"
                value={newKhoaPhong.maKhoaPhong}
                onChange={(e) => setNewKhoaPhong({ ...newKhoaPhong, maKhoaPhong: e.target.value.toUpperCase() })}
                required
                maxLength={50}
                style={{ fontFamily: 'monospace' }}
              />
            </div>
            <div className="col-md-4">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Thêm mới'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Tìm kiếm */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row align-items-end">
            <div className="col-md-4">
              <input
                type="text"
                className="form-control"
                placeholder="Tìm kiếm theo tên hoặc mã..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(0);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bảng danh sách */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Đang tải...</span>
              </div>
            </div>
          ) : khoaPhongs.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead style={{ backgroundColor: '#4e73df', color: 'white' }}>
                  <tr>
                    <th className="text-center py-3">STT</th>
                    <th className="py-3">Tên Khoa Phòng</th>
                    <th className="py-3">Mã Khoa Phòng</th>
                    <th className="text-center py-3">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {khoaPhongs.map((kp, index) => (
                    <tr key={kp.id} className="border-bottom">
                      <td className="text-center align-middle py-3">{currentPage * pageSize + index + 1}</td>
                      <td className="align-middle py-3">
                        {editKhoaPhong?.id === kp.id ? (
                          <input
                            type="text"
                            className="form-control"
                            value={editKhoaPhong.tenKhoaPhong}
                            onChange={(e) => setEditKhoaPhong({ ...editKhoaPhong, tenKhoaPhong: e.target.value })}
                            maxLength={200}
                          />
                        ) : (
                          kp.tenKhoaPhong
                        )}
                      </td>
                      <td className="align-middle py-3">
                        {editKhoaPhong?.id === kp.id ? (
                          <input
                            type="text"
                            className="form-control"
                            value={editKhoaPhong.maKhoaPhong}
                            onChange={(e) => setEditKhoaPhong({ ...editKhoaPhong, maKhoaPhong: e.target.value.toUpperCase() })}
                            maxLength={50}
                            style={{ fontFamily: 'monospace' }}
                          />
                        ) : (
                          <span className="badge bg-primary" style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                            {kp.maKhoaPhong}
                          </span>
                        )}
                      </td>
                      <td className="text-center align-middle py-3">
                        {editKhoaPhong?.id === kp.id ? (
                          <>
                            <button
                              className="btn btn-success btn-sm me-2"
                              onClick={handleSaveEdit}
                              disabled={loading}
                            >
                              Lưu
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setEditKhoaPhong(null)}
                              disabled={loading}
                            >
                              Hủy
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn btn-warning btn-sm me-2"
                              onClick={() => handleEditKhoaPhong(kp)}
                              disabled={loading}
                            >
                              Sửa
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteKhoaPhong(kp.id)}
                              disabled={loading}
                            >
                              Xóa
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5">
              <p className="text-muted">Không có khoa phòng nào</p>
            </div>
          )}
        </div>
      </div>

      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="mt-3">
          <nav aria-label="Page navigation">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${currentPage === 0 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>Trước</button>
              </li>
              {Array.from({ length: totalPages }, (_, i) => (
                <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => handlePageChange(i)}>{i + 1}</button>
                </li>
              ))}
              <li className={`page-item ${currentPage === totalPages - 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>Sau</button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}

export default QuanTriKhoaPhong;
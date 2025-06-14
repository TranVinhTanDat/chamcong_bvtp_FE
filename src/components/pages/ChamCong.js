import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { toast } from 'react-toastify';

function ChamCong() {
  const [formData, setFormData] = useState({ nhanVienId: '', trangThai: 'LÀM', loaiNghi: '', ghiChu: '' });
  const [loading, setLoading] = useState(true);
  const [allNhanViens, setAllNhanViens] = useState([]); // Lưu toàn bộ dữ liệu nhân viên
  const [filteredNhanViens, setFilteredNhanViens] = useState([]); // Dữ liệu đã lọc
  const [loaiNghis, setLoaiNghis] = useState([]);
  const [khoaPhongs, setKhoaPhongs] = useState([]);
  const [selectedNhanVien, setSelectedNhanVien] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState({});
  const [chamCongDetails, setChamCongDetails] = useState({});
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [currentPage, setCurrentPage] = useState(0); // Server-side: page bắt đầu từ 0
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState(null);
  const [filterMonth, setFilterMonth] = useState(null);
  const [filterDay, setFilterDay] = useState(null);
  const [filterKhoaPhongId, setFilterKhoaPhongId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userKhoaPhongId, setUserKhoaPhongId] = useState(null);
  const itemsPerPage = 10;

  // Hàm chuyển đổi định dạng ngày từ backend (dd-MM-yyyy HH:mm:ss)
  const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    const [datePart, timePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('-');
    return new Date(`${year}-${month}-${day}T${timePart}`);
  };

  // Tạo danh sách năm (10 năm gần nhất)
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  // Tạo danh sách tháng
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Tạo danh sách ngày dựa trên tháng/năm
  const getDaysInMonth = (year, month) => {
    if (!year || !month) return [];
    const days = new Date(year, month, 0).getDate();
    return Array.from({ length: days }, (_, i) => i + 1);
  };

  // Hàm lọc dữ liệu dựa trên searchTerm
  const filterNhanViens = (nhanViens, term) => {
    if (!term) return nhanViens;
    const lowerCaseTerm = term.toLowerCase();
    return nhanViens.filter(nv =>
      (nv.maNV && nv.maNV.toLowerCase().includes(lowerCaseTerm)) ||
      (nv.hoTen && nv.hoTen.toLowerCase().includes(lowerCaseTerm))
    );
  };

  // Lấy thông tin user và dữ liệu ban đầu
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const userResponse = await axiosInstance.get('/user/me');
        const user = userResponse.data;
        setUserRole(user.role.tenVaiTro);
        setUserKhoaPhongId(user.khoaPhong?.id);

        if (user.role.tenVaiTro === 'NGUOICHAMCONG') {
          setFilterKhoaPhongId(user.khoaPhong?.id);
        }

        if (user.role.tenVaiTro === 'ADMIN') {
          const khoaPhongResponse = await axiosInstance.get('/khoa-phong');
          setKhoaPhongs(khoaPhongResponse.data);
        }

        const loaiNghiResponse = await axiosInstance.get('/loai-nghi');
        const activeLoaiNghis = loaiNghiResponse.data.filter(loaiNghi => loaiNghi.trangThai);
        setLoaiNghis(activeLoaiNghis);

        // Lấy toàn bộ dữ liệu nhân viên (có thể giới hạn số trang nếu cần)
        const fetchAllNhanViens = async () => {
          let allData = [];
          let page = 0;
          let total = 1;
          while (page < total) {
            const params = { page, size: itemsPerPage, khoaPhongId: filterKhoaPhongId || undefined };
            const response = await axiosInstance.get('/nhanvien', { params });
            const nhanVienPage = response.data;
            allData = [...allData, ...nhanVienPage.content];
            total = nhanVienPage.totalPages;
            page++;
          }
          setAllNhanViens(allData);
          setFilteredNhanViens(allData); // Ban đầu hiển thị toàn bộ
          setTotalPages(Math.ceil(allData.length / itemsPerPage));
        };
        await fetchAllNhanViens();
      } catch (error) {
        toast.error(`Lỗi khi tải dữ liệu ban đầu: ${error.response?.data?.error || error.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [filterKhoaPhongId]);

  // Cập nhật filteredNhanViens khi searchTerm thay đổi
  useEffect(() => {
    const filtered = filterNhanViens(allNhanViens, searchTerm);
    setFilteredNhanViens(filtered);
    setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    setCurrentPage(0); // Reset về trang đầu khi tìm kiếm
  }, [searchTerm, allNhanViens]);

  // Lấy lịch sử chấm công theo trang
  useEffect(() => {
    const fetchData = async () => {
      if (userRole === null || (userRole === 'NGUOICHAMCONG' && userKhoaPhongId === null)) return;
      try {
        setLoading(true);
        const params = {
          page: currentPage,
          size: itemsPerPage,
          year: filterYear || undefined,
          month: filterMonth || undefined,
          day: filterDay || undefined,
          khoaPhongId: filterKhoaPhongId || undefined,
        };

        const lichSuResponse = await axiosInstance.get('/chamcong/lichsu', { params });
        const chamCongPage = lichSuResponse.data;
        const status = {};
        const details = {};
        const checkInMap = new Map();
        (chamCongPage.content || []).forEach(chamCong => {
          if (chamCong.nhanVien && chamCong.nhanVien.id) {
            checkInMap.set(chamCong.nhanVien.id, chamCong);
          }
        });

        checkInMap.forEach((chamCong, nhanVienId) => {
          status[nhanVienId] = chamCong.trangThaiChamCong?.tenTrangThai;
          details[nhanVienId] = chamCong;
        });

        setCheckInStatus(status);
        setChamCongDetails(details);
      } catch (error) {
        const errorMsg = error.response?.status === 401
          ? 'Vui lòng đăng nhập để truy cập dữ liệu!'
          : (error.response?.data?.error || error.message || 'Không thể tải dữ liệu');
        toast.error(`Lỗi khi tải dữ liệu: ${errorMsg}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentPage, filterYear, filterMonth, filterDay, filterKhoaPhongId, userRole, userKhoaPhongId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChamCong = async (nhanVienId, trangThai) => {
    setFormData((prev) => ({ ...prev, nhanVienId, trangThai }));
    if (trangThai === 'NGHỈ' && loaiNghis.length === 0) {
      toast.error('Không có loại nghỉ nào khả dụng để chọn!');
      return;
    }
    if (trangThai === 'NGHỈ') {
      setSelectedNhanVien(filteredNhanViens.find((nv) => nv.id === nhanVienId));
      setIsOpen(true);
    } else {
      await handleSubmit(nhanVienId, trangThai);
    }
  };

  const handleSubmit = async (nhanVienId, trangThai) => {
    try {
      const payload = {
        nhanVienId,
        trangThai,
        maLoaiNghi: trangThai === 'NGHỈ' ? formData.loaiNghi : null,
        ghiChu: trangThai === 'NGHỈ' ? formData.ghiChu : null,
      };
      const response = await axiosInstance.post('/chamcong/checkin', payload);
      toast.success(response.data.message || 'Chấm công thành công');

      // Cập nhật lại lịch sử chấm công
      const params = {
        page: currentPage,
        size: itemsPerPage,
        year: filterYear || undefined,
        month: filterMonth || undefined,
        day: filterDay || undefined,
        khoaPhongId: filterKhoaPhongId || undefined,
      };
      const lichSuResponse = await axiosInstance.get('/chamcong/lichsu', { params });
      const chamCongPage = lichSuResponse.data;
      const status = {};
      const details = {};
      const checkInMap = new Map();
      (chamCongPage.content || []).forEach(chamCong => {
        if (chamCong.nhanVien && chamCong.nhanVien.id) {
          checkInMap.set(chamCong.nhanVien.id, chamCong);
        }
      });

      checkInMap.forEach((chamCong, nhanVienId) => {
        status[nhanVienId] = chamCong.trangThaiChamCong?.tenTrangThai;
        details[nhanVienId] = chamCong;
      });

      setCheckInStatus(status);
      setChamCongDetails(details);
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Lỗi khi chấm công';
      toast.error(errorMsg);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedNhanVien(null);
    setFormData((prev) => ({ ...prev, loaiNghi: '', ghiChu: '' }));
  };

  const confirmNghi = () => {
    if (!selectedNhanVien || !formData.loaiNghi || !formData.ghiChu) {
      toast.error('Vui lòng chọn loại nghỉ và nhập ghi chú!');
      return;
    }
    handleSubmit(selectedNhanVien.id, 'NGHỈ');
    closeModal();
  };

  const showDetail = (nhanVienId) => {
    const detail = chamCongDetails[nhanVienId];
    if (detail) {
      setSelectedDetail(detail);
      setShowDetailModal(true);
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedDetail(null);
  };

  // Lấy danh sách nhân viên cho trang hiện tại
  const paginatedNhanViens = filteredNhanViens.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  return (
    <div className="container-fluid p-4">
      <h1 className="h3 mb-4 text-primary d-flex align-items-center">
        <i className="ri-time-line me-2"></i> Chấm công
      </h1>
      <div className="card p-4 shadow-sm">
        <div className="mb-3 row">
          <div className="col-md-3">
            <input
              type="text"
              className="form-control"
              placeholder="Tìm theo tên hoặc mã NV"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} // Cập nhật realtime
            />
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              value={filterYear || ''}
              onChange={(e) => {
                setCurrentPage(0);
                setFilterYear(e.target.value ? Number(e.target.value) : null);
                setFilterMonth(null);
                setFilterDay(null);
              }}
            >
              <option value="">Chọn năm</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              value={filterMonth || ''}
              onChange={(e) => {
                setCurrentPage(0);
                setFilterMonth(e.target.value ? Number(e.target.value) : null);
                setFilterDay(null);
              }}
              disabled={!filterYear}
            >
              <option value="">Chọn tháng</option>
              {months.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              value={filterDay || ''}
              onChange={(e) => {
                setCurrentPage(0);
                setFilterDay(e.target.value ? Number(e.target.value) : null);
              }}
              disabled={!filterYear || !filterMonth}
            >
              <option value="">Chọn ngày</option>
              {getDaysInMonth(filterYear, filterMonth).map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>
        </div>
        {userRole === 'ADMIN' && (
          <div className="mb-3 row">
            <div className="col-md-3">
              <select
                className="form-select"
                value={filterKhoaPhongId || ''}
                onChange={(e) => {
                  setCurrentPage(0);
                  setFilterKhoaPhongId(e.target.value ? Number(e.target.value) : null);
                }}
              >
                <option value="">Tất cả phòng ban</option>
                {khoaPhongs.map(khoaPhong => (
                  <option key={khoaPhong.id} value={khoaPhong.id}>{khoaPhong.tenKhoaPhong}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        {loading ? (
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead className="table-light">
                <tr>
                  <th scope="col" className="text-start">STT</th>
                  <th scope="col" className="text-start">Mã NV</th>
                  <th scope="col" className="text-start">Họ tên</th>
                  <th scope="col" className="text-start">Phòng ban</th>
                  <th scope="col" className="text-start">Chi tiết</th>
                  <th scope="col" className="text-start">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {paginatedNhanViens.length > 0 ? (
                  paginatedNhanViens.map((nv, index) => {
                    const isCheckedIn = checkInStatus[nv.id];
                    const chamCongDetail = chamCongDetails[nv.id];
                    const lamClass = isCheckedIn === 'LÀM' ? 'btn-success' : 'btn-outline-primary';
                    const nghiClass = isCheckedIn === 'NGHỈ' ? 'btn-danger' : 'btn-outline-primary';

                    return (
                      <tr key={nv.id}>
                        <td className="align-middle">{currentPage * itemsPerPage + index + 1}</td>
                        <td className="align-middle">{nv.maNV || 'N/A'}</td>
                        <td className="align-middle">{nv.hoTen}</td>
                        <td className="align-middle">{nv.khoaPhong?.tenKhoaPhong || 'Chưa có'}</td>
                        <td className="align-middle">
                          {isCheckedIn === 'NGHỈ' ? (
                            <button
                              className="btn btn-sm btn-outline-info"
                              onClick={() => showDetail(nv.id)}
                              title="Xem chi tiết nghỉ"
                            >
                              <i className="ri-eye-line"></i>
                            </button>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="align-middle">
                          <button
                            className={`btn btn-sm ${lamClass} me-2`}
                            style={{ color: isCheckedIn === 'LÀM' ? '#ffffff' : '#000000' }}
                            onClick={() => handleChamCong(nv.id, 'LÀM')}
                            disabled={!!isCheckedIn}
                          >
                            Làm
                          </button>
                          <button
                            className={`btn btn-sm ${nghiClass}`}
                            style={{ color: isCheckedIn === 'NGHỈ' ? '#ffffff' : '#000000' }}
                            onClick={() => handleChamCong(nv.id, 'NGHỈ')}
                            disabled={loaiNghis.length === 0 || !!isCheckedIn}
                          >
                            Nghỉ
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center">Không có nhân viên nào</td>
                  </tr>
                )}
              </tbody>
            </table>
            <nav>
              <ul className="pagination justify-content-center">
                <li className={`page-item ${currentPage === 0 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)}>Trước</button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i).map(page => (
                  <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(page)}>{page + 1}</button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages - 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)}>Sau</button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* Modal chấm công nghỉ */}
      <div className={`modal fade ${isOpen ? 'show' : ''}`} style={{ display: isOpen ? 'block' : 'none' }} tabIndex="-1" aria-labelledby="nghiModalLabel" aria-hidden={!isOpen}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="nghiModalLabel">Chấm công nghỉ cho {selectedNhanVien?.hoTen}</h5>
              <button type="button" className="btn-close" onClick={closeModal}></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label htmlFor="loaiNghi" className="form-label">Loại nghỉ</label>
                <select
                  className="form-select"
                  id="loaiNghi"
                  name="loaiNghi"
                  value={formData.loaiNghi}
                  onChange={handleChange}
                  required
                  disabled={loaiNghis.length === 0}
                >
                  <option value="">-- Chọn loại nghỉ --</option>
                  {loaiNghis.map((loaiNghi) => (
                    <option key={loaiNghi.id} value={loaiNghi.maLoaiNghi}>
                      {loaiNghi.tenLoaiNghi}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label htmlFor="ghiChu" className="form-label">Ghi chú</label>
                <textarea
                  className="form-control"
                  id="ghiChu"
                  name="ghiChu"
                  value={formData.ghiChu}
                  onChange={handleChange}
                  placeholder="Nhập ghi chú"
                  required
                  disabled={loaiNghis.length === 0}
                ></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeModal}>Hủy</button>
              <button type="button" className="btn btn-danger" onClick={confirmNghi} disabled={loaiNghis.length === 0}>Xác nhận</button>
            </div>
          </div>
        </div>
      </div>
      {isOpen && <div className="modal-backdrop fade show"></div>}

      {/* Modal chi tiết chấm công */}
      {showDetailModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Chi tiết chấm công - {selectedDetail?.nhanVien?.hoTen}</h5>
                <button type="button" className="btn-close" onClick={closeDetailModal}></button>
              </div>
              <div className="modal-body">
                {selectedDetail && (
                  <div className="row">
                    <div className="col-md-6">
                      <h6 className="text-primary">Thông tin nhân viên</h6>
                      <table className="table table-sm">
                        <tbody>
                          <tr>
                            <td><strong>Mã NV:</strong></td>
                            <td>{selectedDetail.nhanVien?.maNV || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td><strong>Họ tên:</strong></td>
                            <td>{selectedDetail.nhanVien?.hoTen}</td>
                          </tr>
                          <tr>
                            <td><strong>Khoa phòng:</strong></td>
                            <td>{selectedDetail.nhanVien?.khoaPhong?.tenKhoaPhong || 'Chưa có'}</td>
                          </tr>
                          <tr>
                            <td><strong>Chức vụ:</strong></td>
                            <td>{selectedDetail.nhanVien?.chucVu?.tenChucVu || 'Chưa có'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="col-md-6">
                      <h6 className="text-primary">Thông tin chấm công</h6>
                      <table className="table table-sm">
                        <tbody>
                          <tr>
                            <td><strong>Thời gian:</strong></td>
                            <td>{selectedDetail.thoiGianCheckIn}</td>
                          </tr>
                          <tr>
                            <td><strong>Trạng thái:</strong></td>
                            <td>
                              <span className={`badge ${selectedDetail.trangThaiChamCong?.tenTrangThai === 'LÀM' ? 'bg-success' : 'bg-danger'}`}>
                                {selectedDetail.trangThaiChamCong?.tenTrangThai}
                              </span>
                            </td>
                          </tr>
                          {selectedDetail.caLamViec && (
                            <tr>
                              <td><strong>Ca làm việc:</strong></td>
                              <td>{selectedDetail.caLamViec?.tenCa} ({selectedDetail.caLamViec?.thoiGianBatDau} - {selectedDetail.caLamViec?.thoiGianKetThuc})</td>
                            </tr>
                          )}
                          {selectedDetail.loaiNghi && (
                            <tr>
                              <td><strong>Loại nghỉ:</strong></td>
                              <td>{selectedDetail.loaiNghi?.tenLoaiNghi}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {selectedDetail.ghiChu && (
                      <div className="col-12 mt-3">
                        <h6 className="text-primary">Ghi chú</h6>
                        <div className="alert alert-info" style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                          {selectedDetail.ghiChu}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeDetailModal}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showDetailModal && <div className="modal-backdrop fade show"></div>}
    </div>
  );
}

export default ChamCong;
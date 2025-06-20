import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { toast } from 'react-toastify';

function ChamCong() {
  const [formData, setFormData] = useState({ nhanVienId: '', trangThai: 'LÀM', caLamViecId: '', kyHieuChamCong: '', ghiChu: '' });
  const [loading, setLoading] = useState(true);
  const [allNhanViens, setAllNhanViens] = useState([]);
  const [filteredNhanViens, setFilteredNhanViens] = useState([]);
  const [kyHieuChamCongs, setKyHieuChamCongs] = useState([]);
  const [caLamViecs, setCaLamViecs] = useState([]);
  const [khoaPhongs, setKhoaPhongs] = useState([]);
  const [selectedNhanVien, setSelectedNhanVien] = useState(null);
  const [isLamModalOpen, setIsLamModalOpen] = useState(false);
  const [isNghiModalOpen, setIsNghiModalOpen] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState({});
  const [chamCongDetails, setChamCongDetails] = useState({});
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterDay, setFilterDay] = useState(new Date().getDate());
  const [filterKhoaPhongId, setFilterKhoaPhongId] = useState(null);
  const [userRole, setUserRole] = useState(localStorage.getItem('role'));
  const [userKhoaPhongId, setUserKhoaPhongId] = useState(localStorage.getItem('khoaPhongId'));
  const [selectedCaLamViec, setSelectedCaLamViec] = useState({});

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingChamCong, setEditingChamCong] = useState(null);

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

  // Lấy dữ liệu ban đầu
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);

        if (userRole === 'NGUOICHAMCONG') {
          setFilterKhoaPhongId(Number(userKhoaPhongId));
        }

        if (userRole === 'ADMIN' || userRole === 'NGUOITONGHOP') {
          const khoaPhongResponse = await axiosInstance.get('/khoa-phong');
          setKhoaPhongs(khoaPhongResponse.data);
        }

        const kyHieuResponse = await axiosInstance.get('/ky-hieu-cham-cong');
        const activeKyHieuChamCongs = kyHieuResponse.data.filter(kyHieu => kyHieu.trangThai);
        setKyHieuChamCongs(activeKyHieuChamCongs);

        const caLamViecResponse = await axiosInstance.get('/ca-lam-viec');
        if (!caLamViecResponse.data || caLamViecResponse.data.length === 0) {
          toast.error('Không có ca làm việc nào trong hệ thống!');
        }
        setCaLamViecs(caLamViecResponse.data);

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
          setFilteredNhanViens(allData);
          setTotalPages(Math.ceil(allData.length / itemsPerPage));

          // Khởi tạo selectedCaLamViec với giá trị mặc định
          const defaultCa = caLamViecResponse.data.find(ca => ca.kyHieuChamCong.maKyHieu === 'x') || caLamViecResponse.data[0];
          if (defaultCa) {
            const caLamViecMap = {};
            allData.forEach(nv => {
              caLamViecMap[nv.id] = defaultCa.id.toString();
            });
            setSelectedCaLamViec(caLamViecMap);
          }
        };
        await fetchAllNhanViens();

        // Đồng bộ thời gian với ngày hiện tại
        const today = new Date();
        setFilterYear(today.getFullYear());
        setFilterMonth(today.getMonth() + 1);
        setFilterDay(today.getDate());
      } catch (error) {
        toast.error(`Lỗi khi tải dữ liệu ban đầu: ${error.response?.data?.error || error.message}`);
      } finally {
        setLoading(false);
      }
    };
    if (userRole) fetchInitialData();
  }, [filterKhoaPhongId, userRole, userKhoaPhongId]);

  // Cập nhật filteredNhanViens khi searchTerm thay đổi
  useEffect(() => {
    const filtered = filterNhanViens(allNhanViens, searchTerm);
    setFilteredNhanViens(filtered);
    setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    setCurrentPage(0);
  }, [searchTerm, allNhanViens]);

  // Lấy lịch sử chấm công theo trang
useEffect(() => {
  const fetchData = async () => {
    if (!userRole || (userRole === 'NGUOICHAMCONG' && !userKhoaPhongId)) return;
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
      const caLamViecMap = { ...selectedCaLamViec };

      (chamCongPage.content || []).forEach(chamCong => {
        if (chamCong.nhanVien && chamCong.nhanVien.id && chamCong.nhanVien.trangThai === 1) {
          const nhanVienId = chamCong.nhanVien.id;
          status[nhanVienId] = chamCong.trangThaiChamCong?.tenTrangThai;
          details[nhanVienId] = chamCong;

          if (chamCong.caLamViec && chamCong.caLamViec.id) {
            caLamViecMap[nhanVienId] = chamCong.caLamViec.id.toString();
          }
        }
      });

      setCheckInStatus(status);
      setChamCongDetails(details);
      setSelectedCaLamViec(caLamViecMap);
    } catch (error) {
      toast.error(`Lỗi khi tải dữ liệu: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, [currentPage, filterYear, filterMonth, filterDay, filterKhoaPhongId, userRole, userKhoaPhongId, caLamViecs]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCaLamViecChange = (nhanVienId, caLamViecId) => {
    const validNhanVienId = parseInt(nhanVienId);
    const validCaLamViecId = parseInt(caLamViecId);

    if (!validNhanVienId || isNaN(validNhanVienId)) {
      toast.error('ID nhân viên không hợp lệ!');
      return;
    }

    if (!validCaLamViecId || isNaN(validCaLamViecId)) {
      toast.error('ID ca làm việc không hợp lệ!');
      return;
    }

    setSelectedCaLamViec(prev => ({
      ...prev,
      [validNhanVienId]: validCaLamViecId.toString()
    }));
  };

  // Sửa handleSubmit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const nhanVienId = parseInt(formData.nhanVienId);
      if (!nhanVienId || isNaN(nhanVienId)) {
        toast.error('ID nhân viên không hợp lệ!');
        return;
      }

      const payload = {
        nhanVienId: nhanVienId,
        trangThai: formData.trangThai,
        ...(formData.trangThai === 'LÀM' && {
          caLamViecId: parseInt(formData.caLamViecId)
        }),
        ...(formData.trangThai === 'NGHỈ' && {
          maKyHieuChamCong: formData.kyHieuChamCong,
          ghiChu: formData.ghiChu,
          caLamViecId: formData.caLamViecId ? parseInt(formData.caLamViecId) : undefined // Gửi caLamViecId nếu có
        }),
      };

      console.log('Payload gửi đi:', payload);

      const response = await axiosInstance.post('/chamcong/checkin', payload);
      toast.success(response.data.message || 'Chấm công thành công');

      // Reload dữ liệu sau khi chấm công
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
      const caLamViecMap = { ...selectedCaLamViec }; // Giữ nguyên giá trị hiện tại

      (chamCongPage.content || []).forEach(chamCong => {
        if (chamCong.nhanVien && chamCong.nhanVien.id) {
          const nhanVienId = chamCong.nhanVien.id;
          status[nhanVienId] = chamCong.trangThaiChamCong?.tenTrangThai;
          details[nhanVienId] = chamCong;

          if (chamCong.caLamViec && chamCong.caLamViec.id) {
            caLamViecMap[nhanVienId] = chamCong.caLamViec.id.toString();
          }
        }
      });

      setCheckInStatus(status);
      setChamCongDetails(details);
      setSelectedCaLamViec(caLamViecMap);
      closeModal();
    } catch (error) {
      console.error('Lỗi chi tiết:', error.response?.data);
      const errorMsg = error.response?.data?.error || error.message || 'Lỗi khi chấm công';
      toast.error(errorMsg);
    }
  };

  // Sửa handleChamCong
  const handleChamCong = async (nhanVienId, trangThai) => {
    const validNhanVienId = parseInt(nhanVienId);
    if (!validNhanVienId || isNaN(validNhanVienId)) {
      toast.error('ID nhân viên không hợp lệ!');
      return;
    }

    const nhanVien = filteredNhanViens.find(nv => nv.id === validNhanVienId);
    if (!nhanVien) {
      toast.error('Không tìm thấy nhân viên!');
      return;
    }

    let caLamViecId = selectedCaLamViec[validNhanVienId];
    if (!caLamViecId && caLamViecs.length > 0) {
      caLamViecId = caLamViecs.find(ca => ca.kyHieuChamCong.maKyHieu === 'x')?.id.toString() || caLamViecs[0].id.toString();
      setSelectedCaLamViec(prev => ({
        ...prev,
        [validNhanVienId]: caLamViecId
      }));
    }

    if (trangThai === 'LÀM' && (!caLamViecId || !caLamViecs.find(ca => ca.id.toString() === caLamViecId))) {
      toast.error('Vui lòng chọn ca làm việc hợp lệ!');
      return;
    }

    if (trangThai === 'NGHỈ') {
      if (kyHieuChamCongs.length === 0) {
        toast.error('Không có ký hiệu chấm công nào khả dụng!');
        return;
      }
      setFormData(prev => ({
        ...prev,
        nhanVienId: validNhanVienId,
        trangThai,
        kyHieuChamCong: '',
        ghiChu: '',
        caLamViecId: caLamViecId || '' // Gửi caLamViecId mặc định nếu có
      }));
      setSelectedNhanVien(nhanVien);
      setIsNghiModalOpen(true);
    } else {
      try {
        const payload = {
          nhanVienId: validNhanVienId,
          trangThai: 'LÀM',
          caLamViecId: parseInt(caLamViecId)
        };

        console.log('Payload gửi đi:', payload);

        const response = await axiosInstance.post('/chamcong/checkin', payload);
        toast.success(response.data.message || 'Chấm công thành công');

        // Reload dữ liệu sau khi chấm công
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
        const caLamViecMap = { ...selectedCaLamViec };

        (chamCongPage.content || []).forEach(chamCong => {
          if (chamCong.nhanVien && chamCong.nhanVien.id) {
            const nhanVienId = chamCong.nhanVien.id;
            status[nhanVienId] = chamCong.trangThaiChamCong?.tenTrangThai;
            details[nhanVienId] = chamCong;

            if (chamCong.caLamViec && chamCong.caLamViec.id) {
              caLamViecMap[nhanVienId] = chamCong.caLamViec.id.toString();
            }
          }
        });

        setCheckInStatus(status);
        setChamCongDetails(details);
        setSelectedCaLamViec(caLamViecMap);
      } catch (error) {
        console.error('Lỗi chi tiết:', error.response?.data);
        const errorMsg = error.response?.data?.error || error.message || 'Lỗi khi chấm công';
        toast.error(errorMsg);
      }
    }
  };

  const closeModal = () => {
    setIsLamModalOpen(false);
    setIsNghiModalOpen(false);
    setSelectedNhanVien(null);
    setFormData(prev => ({ ...prev, caLamViecId: '', kyHieuChamCong: '', ghiChu: '' }));
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

  const paginatedNhanViens = filteredNhanViens.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );


  const handleEdit = (nhanVienId) => {
    const chamCongDetail = chamCongDetails[nhanVienId];
    if (chamCongDetail) {
      setEditingChamCong(chamCongDetail);
      setFormData({
        nhanVienId: chamCongDetail.nhanVien.id,
        trangThai: chamCongDetail.trangThaiChamCong?.tenTrangThai || 'LÀM',
        caLamViecId: chamCongDetail.caLamViec?.id || '',
        kyHieuChamCong: chamCongDetail.kyHieuChamCong?.maKyHieu || '',
        ghiChu: chamCongDetail.ghiChu || ''
      });
      setIsEditModalOpen(true);
    }
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingChamCong(null);
    setFormData(prev => ({ ...prev, caLamViecId: '', kyHieuChamCong: '', ghiChu: '' }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        trangThai: formData.trangThai,
        ...(formData.trangThai === 'LÀM' && {
          caLamViecId: formData.caLamViecId
        }),
        ...(formData.trangThai === 'NGHỈ' && {
          maKyHieuChamCong: formData.kyHieuChamCong,
          ghiChu: formData.ghiChu
        }),
      };

      await axiosInstance.put(`/chamcong/${editingChamCong.id}/trangthai`, payload);
      toast.success('Cập nhật chấm công thành công');

      // Reload data như trong handleSubmit
      const params = {
        page: currentPage,
        size: itemsPerPage,
        year: filterYear || undefined,
        month: filterMonth || undefined,
        day: filterDay || undefined,
        khoaPhongId: filterKhoaPhongId || undefined,
      };
      const lichSuResponse = await axiosInstance.get('/chamcong/lichsu', { params });
      // ... code reload data tương tự handleSubmit

      closeEditModal();
    } catch (error) {
      toast.error(`Lỗi khi cập nhật: ${error.response?.data?.error || error.message}`);
    }
  };

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
              onChange={(e) => setSearchTerm(e.target.value)}
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
        {(userRole === 'ADMIN' || userRole === 'NGUOITONGHOP') && (
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
                <option value="">Tất cả khoa phòng</option>
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
                  <th scope="col" className="text-start">Khoa Phòng</th>
                  <th scope="col" className="text-start">Ca làm việc</th>
                  <th scope="col" className="text-start">Chi tiết</th>
                  <th scope="col" className="text-start">Hành động</th>
                  {userRole === 'ADMIN' && <th scope="col" className="text-start">Sửa</th>}
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
                          <select
                            className="form-select form-select-sm"
                            value={selectedCaLamViec[nv.id] || ''}
                            onChange={(e) => handleCaLamViecChange(nv.id, e.target.value)}
                            disabled={isCheckedIn || caLamViecs.length === 0}
                          >
                            {caLamViecs.map((ca) => (
                              <option key={ca.id} value={ca.id} selected={ca.kyHieuChamCong.maKyHieu === 'x'}>
                                {ca.tenCaLamViec} ({ca.kyHieuChamCong.maKyHieu})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="align-middle">
                          {isCheckedIn ? (
                            <button
                              className="btn btn-sm btn-outline-info"
                              onClick={() => showDetail(nv.id)}
                              title="Xem chi tiết chấm công"
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
                            style={{ color: isCheckedIn === 'NGHỈ' ? '#ffffff' : '' }}
                            onClick={() => handleChamCong(nv.id, 'NGHỈ')}
                            disabled={kyHieuChamCongs.length === 0 || !!isCheckedIn}
                          >
                            Nghỉ
                          </button>
                        </td>
                        {userRole === 'ADMIN' && (
                          <td className="align-middle">
                            {isCheckedIn ? (
                              <button
                                className="btn btn-sm btn-outline-warning"
                                onClick={() => handleEdit(nv.id)}
                                title="Sửa chấm công"
                              >
                                <i className="ri-edit-line"></i>
                              </button>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        )}



                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center">Không có nhân viên nào</td>
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
      <div className={`modal fade ${isNghiModalOpen ? 'show' : ''}`} style={{ display: isNghiModalOpen ? 'block' : 'none' }} tabIndex="-1" aria-labelledby="nghiModalLabel" aria-hidden={!isNghiModalOpen}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="nghiModalLabel">Chấm công nghỉ cho {selectedNhanVien?.hoTen}</h5>
              <button type="button" className="btn-close" onClick={closeModal}></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="kyHieuChamCong" className="form-label">Ký hiệu chấm công</label>
                  <select
                    className="form-select"
                    id="kyHieuChamCong"
                    name="kyHieuChamCong"
                    value={formData.kyHieuChamCong}
                    onChange={handleChange}
                    required
                    disabled={kyHieuChamCongs.length === 0}
                  >
                    <option value="">-- Chọn ký hiệu chấm công --</option>
                    {kyHieuChamCongs
                      .filter(kh => !caLamViecs.some(ca => ca.kyHieuChamCong.maKyHieu === kh.maKyHieu))
                      .map((kyHieu) => (
                        <option key={kyHieu.id} value={kyHieu.maKyHieu}>
                          {kyHieu.tenKyHieu} ({kyHieu.maKyHieu})
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
                    disabled={kyHieuChamCongs.length === 0}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Hủy</button>
                <button type="submit" className="btn btn-danger" disabled={kyHieuChamCongs.length === 0 || !formData.kyHieuChamCong || !formData.ghiChu}>Xác nhận</button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {isNghiModalOpen && <div className="modal-backdrop fade show"></div>}

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
                              <td>{selectedDetail.caLamViec.tenCaLamViec} ({selectedDetail.caLamViec.kyHieuChamCong?.maKyHieu})</td>
                            </tr>
                          )}
                          {selectedDetail.kyHieuChamCong && (
                            <tr>
                              <td><strong>Ký hiệu chấm công:</strong></td>
                              <td>{selectedDetail.kyHieuChamCong?.tenKyHieu} ({selectedDetail.kyHieuChamCong?.maKyHieu})</td>
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



      {/* Modal sửa chấm công */}
      {isEditModalOpen && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Sửa chấm công - {editingChamCong?.nhanVien?.hoTen}
                </h5>
                <button type="button" className="btn-close" onClick={closeEditModal}></button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Trạng thái</label>
                    <select
                      className="form-select"
                      name="trangThai"
                      value={formData.trangThai}
                      onChange={handleChange}
                    >
                      <option value="LÀM">Làm</option>
                      <option value="NGHỈ">Nghỉ</option>
                    </select>
                  </div>

                  {formData.trangThai === 'LÀM' && (
                    <div className="mb-3">
                      <label className="form-label">Ca làm việc</label>
                      <select
                        className="form-select"
                        name="caLamViecId"
                        value={formData.caLamViecId}
                        onChange={handleChange}
                        required
                      >
                        {caLamViecs.map((ca) => (
                          <option key={ca.id} value={ca.id} selected={ca.kyHieuChamCong.maKyHieu === 'x'}>
                            {ca.tenCaLamViec} ({ca.kyHieuChamCong.maKyHieu})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.trangThai === 'NGHỈ' && (
                    <>
                      <div className="mb-3">
                        <label className="form-label">Ký hiệu chấm công</label>
                        <select
                          className="form-select"
                          name="kyHieuChamCong"
                          value={formData.kyHieuChamCong}
                          onChange={handleChange}
                          required
                        >
                          <option value="">-- Chọn ký hiệu --</option>
                          {kyHieuChamCongs
                            .filter(kh => !caLamViecs.some(ca => ca.kyHieuChamCong.maKyHieu === kh.maKyHieu))
                            .map((kyHieu) => (
                              <option key={kyHieu.id} value={kyHieu.maKyHieu}>
                                {kyHieu.tenKyHieu} ({kyHieu.maKyHieu})
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Ghi chú</label>
                        <textarea
                          className="form-control"
                          name="ghiChu"
                          value={formData.ghiChu}
                          onChange={handleChange}
                          required
                        ></textarea>
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Cập nhật
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {isEditModalOpen && <div className="modal-backdrop fade show"></div>}

    </div>
  );
}

export default ChamCong;  
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { toast } from 'react-toastify';
import { Table, Button, Modal, Form, Pagination, Spinner } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parse } from 'date-fns';

function QuanLyDanhSachNhanSu() {
  const [nhanViens, setNhanViens] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [size] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentNhanVien, setCurrentNhanVien] = useState({
    id: null,
    hoTen: '',
    email: '',
    maNV: '',
    ngayThangNamSinh: null,
    soDienThoai: '',
    khoaPhong: { id: '' },
    chucVu: { id: '' },
  });
  const [khoaPhongs, setKhoaPhongs] = useState([]);
  const [chucVus, setChucVus] = useState([]);

  const role = localStorage.getItem('role');
  const khoaPhongId = localStorage.getItem('khoaPhongId');

  // Fetch danh sách nhân viên với search
  const fetchNhanViens = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { page, size };
      if (role === 'NGUOICHAMCONG') {
        params.khoaPhongId = khoaPhongId;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      const response = await axiosInstance.get('/nhanvien', { params });
      setNhanViens(response.data.content || []);
      setTotalPages(response.data.totalPages || 0);
    } catch (error) {
      console.error('Error fetching nhanviens:', error.response?.data || error.message);
      toast.error(error.response?.data || 'Lỗi khi lấy danh sách nhân viên');
    } finally {
      setIsLoading(false);
    }
  }, [page, size, role, khoaPhongId, searchTerm]);

  // Fetch danh sách khoa/phòng và chức vụ
  const fetchKhoaPhongsAndChucVus = async () => {
    try {
      const khoaPhongRes = await axiosInstance.get('/khoa-phong');
      setKhoaPhongs(khoaPhongRes.data || []);
    } catch (error) {
      console.error('Error fetching khoa-phong:', error.response?.data || error.message);
      toast.error('Lỗi khi lấy danh sách khoa/phòng');
    }

    try {
      const chucVuRes = await axiosInstance.get('/chuc-vu');
      setChucVus(chucVuRes.data || []);
    } catch (error) {
      console.error('Error fetching chuc-vu:', error.response?.data || error.message);
      toast.error('Lỗi khi lấy danh sách chức vụ');
    }
  };

  useEffect(() => {
    fetchNhanViens();
  }, [fetchNhanViens]);

  useEffect(() => {
    fetchKhoaPhongsAndChucVus();
  }, []);

  const preparePayload = () => {
    const formattedNgaySinh = currentNhanVien.ngayThangNamSinh
      ? format(currentNhanVien.ngayThangNamSinh, 'dd/MM/yyyy')
      : null;

    const processedMaNV = currentNhanVien.maNV && currentNhanVien.maNV.trim() 
      ? currentNhanVien.maNV.trim() 
      : null;

    const processedSDT = currentNhanVien.soDienThoai && currentNhanVien.soDienThoai.trim() 
      ? currentNhanVien.soDienThoai.trim() 
      : null;

    return {
      hoTen: currentNhanVien.hoTen.trim(),
      email: currentNhanVien.email.trim(),
      maNV: processedMaNV,
      ngayThangNamSinh: formattedNgaySinh,
      soDienThoai: processedSDT,
      khoaPhong: { id: currentNhanVien.khoaPhong.id },
      chucVu: currentNhanVien.chucVu.id ? { id: currentNhanVien.chucVu.id } : null,
    };
  };

  const validateForm = () => {
    if (!currentNhanVien.hoTen || !currentNhanVien.hoTen.trim()) {
      toast.error('Vui lòng nhập họ tên');
      return false;
    }

    if (!currentNhanVien.email || !currentNhanVien.email.trim()) {
      toast.error('Vui lòng nhập email');
      return false;
    }

    if (!currentNhanVien.khoaPhong.id) {
      toast.error('Vui lòng chọn khoa/phòng');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(currentNhanVien.email.trim())) {
      toast.error('Email không hợp lệ');
      return false;
    }

    if (currentNhanVien.maNV && currentNhanVien.maNV.trim()) {
      const maNV = currentNhanVien.maNV.trim();
      if (maNV.length < 2) {
        toast.error('Mã nhân viên phải có ít nhất 2 ký tự');
        return false;
      }
      if (maNV.length > 50) {
        toast.error('Mã nhân viên không được quá 50 ký tự');
        return false;
      }
    }

    if (currentNhanVien.soDienThoai && currentNhanVien.soDienThoai.trim()) {
      const sdt = currentNhanVien.soDienThoai.trim();
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (!phoneRegex.test(sdt)) {
        toast.error('Số điện thoại không hợp lệ');
        return false;
      }
      if (sdt.length < 10 || sdt.length > 15) {
        toast.error('Số điện thoại phải có từ 10-15 ký tự');
        return false;
      }
    }

    return true;
  };

  const handleSaveNhanVien = async () => {
    if (!validateForm()) {
      return;
    }

    const payload = preparePayload();
    setIsLoading(true);
    try {
      if (isEdit) {
        await axiosInstance.put(`/nhanvien/${currentNhanVien.id}`, payload);
        toast.success('Cập nhật nhân viên thành công');
      } else {
        await axiosInstance.post('/nhanvien', payload);
        toast.success('Thêm nhân viên thành công');
      }
      setShowModal(false);
      fetchNhanViens();
    } catch (error) {
      console.error('Error saving nhanvien:', error.response?.data || error.message);
      toast.error(error.response?.data || 'Lỗi khi lưu nhân viên');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNhanVien = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa nhân viên này?')) {
      setIsLoading(true);
      try {
        await axiosInstance.delete(`/nhanvien/${id}`);
        toast.success('Xóa nhân viên thành công');
        fetchNhanViens();
      } catch (error) {
        console.error('Error deleting nhanvien:', error.response?.data || error.message);
        toast.error(error.response?.data || 'Lỗi khi xóa nhân viên');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const openModal = (nhanVien = null) => {
    setIsEdit(!!nhanVien);
    if (nhanVien) {
      const parsedDate = nhanVien.ngayThangNamSinh
        ? parse(nhanVien.ngayThangNamSinh, 'dd/MM/yyyy', new Date())
        : null;
      setCurrentNhanVien({
        ...nhanVien,
        ngayThangNamSinh: parsedDate,
        khoaPhong: { id: nhanVien.khoaPhong?.id || '' },
        chucVu: { id: nhanVien.chucVu?.id || '' },
        maNV: nhanVien.maNV || '',
        soDienThoai: nhanVien.soDienThoai || '',
      });
    } else {
      setCurrentNhanVien({
        id: null,
        hoTen: '',
        email: '',
        maNV: '',
        ngayThangNamSinh: null,
        soDienThoai: '',
        khoaPhong: { id: role === 'NGUOICHAMCONG' ? khoaPhongId : '' },
        chucVu: { id: '' },
      });
    }
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'khoaPhongId') {
      setCurrentNhanVien({ ...currentNhanVien, khoaPhong: { id: value } });
    } else if (name === 'chucVuId') {
      setCurrentNhanVien({ ...currentNhanVien, chucVu: { id: value } });
    } else {
      setCurrentNhanVien({ ...currentNhanVien, [name]: value });
    }
  };

  const handleDateChange = (date) => {
    setCurrentNhanVien({ ...currentNhanVien, ngayThangNamSinh: date });
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = parse(dateString, 'dd/MM/yyyy', new Date());
      return format(date, 'dd/MM/yyyy');
    } catch {
      return '-';
    }
  };

  return (
    <div className="container-fluid px-4 py-3" style={{ backgroundColor: '#f8f9fc', minHeight: '100vh' }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1 text-primary fw-bold">
            <i className="ri-team-line me-2"></i>Quản Lý Nhân Sự
          </h1>
          <p className="text-muted mb-0">Quản lý danh sách nhân viên</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => openModal()} 
          disabled={isLoading}
        >
          Thêm Nhân Viên
        </button>
      </div>

      {/* Tìm kiếm */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row align-items-end">
            <div className="col-md-4">
              <input
                type="text"
                className="form-control"
                placeholder="Tìm kiếm theo tên, email, mã NV..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bảng danh sách */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Đang tải...</span>
              </div>
            </div>
          ) : nhanViens.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead style={{ backgroundColor: '#4e73df', color: 'white' }}>
                  <tr>
                    <th className="text-center py-3">STT</th>
                    <th className="py-3">Họ Tên</th>
                    <th className="py-3">Email</th>
                    <th className="py-3">Mã NV</th>
                    <th className="py-3">Ngày Sinh</th>
                    <th className="py-3">SĐT</th>
                    <th className="py-3">Khoa/Phòng</th>
                    <th className="py-3">Chức Vụ</th>
                    <th className="text-center py-3">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {nhanViens.map((nv, index) => (
                    <tr key={nv.id} className="border-bottom">
                      <td className="text-center align-middle py-3">{page * size + index + 1}</td>
                      <td className="align-middle py-3 fw-semibold">{nv.hoTen}</td>
                      <td className="align-middle py-3">{nv.email}</td>
                      <td className="align-middle py-3">
                        {nv.maNV ? (
                          <span className="badge bg-primary" style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                            {nv.maNV}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="align-middle py-3">{formatDate(nv.ngayThangNamSinh)}</td>
                      <td className="align-middle py-3">{nv.soDienThoai || '-'}</td>
                      <td className="align-middle py-3">
                        <span className="badge bg-info" style={{ fontSize: '0.85em' }}>
                          {nv.khoaPhong?.tenKhoaPhong || '-'}
                        </span>
                      </td>
                      <td className="align-middle py-3">
                        {nv.chucVu?.tenChucVu ? (
                          <span className="badge bg-success" style={{ fontSize: '0.85em' }}>
                            {nv.chucVu.tenChucVu}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="text-center align-middle py-3">
                        <button
                          className="btn btn-warning btn-sm me-2"
                          onClick={() => openModal(nv)}
                          disabled={isLoading}
                        >
                          Sửa
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteNhanVien(nv.id)}
                          disabled={isLoading}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5">
              <p className="text-muted">
                {searchTerm ? `Không tìm thấy nhân viên với từ khóa "${searchTerm}"` : 'Không có nhân viên nào'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="mt-3">
          <nav aria-label="Page navigation">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${page === 0 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => handlePageChange(page - 1)}>Trước</button>
              </li>
              {Array.from({ length: totalPages }, (_, i) => (
                <li key={i} className={`page-item ${page === i ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => handlePageChange(i)}>{i + 1}</button>
                </li>
              ))}
              <li className={`page-item ${page === totalPages - 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => handlePageChange(page + 1)}>Sau</button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Modal thêm/sửa nhân viên */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="text-primary fw-semibold">
            {isEdit ? 'Sửa Nhân Viên' : 'Thêm Nhân Viên'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    Họ Tên <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="hoTen"
                    value={currentNhanVien.hoTen}
                    onChange={handleChange}
                    placeholder="Nhập họ tên"
                    disabled={isLoading}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    Email <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={currentNhanVien.email}
                    onChange={handleChange}
                    placeholder="Nhập email"
                    disabled={isLoading}
                    required
                  />
                </Form.Group>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    Mã NV <small className="text-muted">(tùy chọn)</small>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="maNV"
                    value={currentNhanVien.maNV}
                    onChange={handleChange}
                    placeholder="Nhập mã nhân viên"
                    disabled={isLoading}
                    maxLength={50}
                    style={{ fontFamily: 'monospace' }}
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    Số Điện Thoại <small className="text-muted">(tùy chọn)</small>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="soDienThoai"
                    value={currentNhanVien.soDienThoai}
                    onChange={handleChange}
                    placeholder="Nhập số điện thoại"
                    disabled={isLoading}
                    maxLength={15}
                  />
                </Form.Group>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Ngày Sinh</Form.Label>
                  <DatePicker
                    selected={currentNhanVien.ngayThangNamSinh}
                    onChange={handleDateChange}
                    dateFormat="dd/MM/yyyy"
                    className="form-control"
                    placeholderText="Chọn ngày sinh"
                    disabled={isLoading}
                    showYearDropdown
                    yearDropdownItemNumber={100}
                    scrollableYearDropdown
                    maxDate={new Date()}
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    Khoa/Phòng <span className="text-danger">*</span>
                  </Form.Label>
                  {role === 'NGUOICHAMCONG' ? (
                    <Form.Control
                      type="text"
                      value={khoaPhongs.find((kp) => kp.id === Number(khoaPhongId))?.tenKhoaPhong || 'N/A'}
                      disabled
                      className="bg-light"
                    />
                  ) : (
                    <Form.Select
                      name="khoaPhongId"
                      value={currentNhanVien.khoaPhong.id}
                      onChange={handleChange}
                      disabled={isLoading || khoaPhongs.length === 0}
                      required
                    >
                      <option value="">Chọn Khoa/Phòng</option>
                      {khoaPhongs.map((kp) => (
                        <option key={kp.id} value={kp.id}>
                          {kp.tenKhoaPhong}
                        </option>
                      ))}
                    </Form.Select>
                  )}
                </Form.Group>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    Chức Vụ <small className="text-muted">(tùy chọn)</small>
                  </Form.Label>
                  <Form.Select
                    name="chucVuId"
                    value={currentNhanVien.chucVu.id}
                    onChange={handleChange}
                    disabled={isLoading || chucVus.length === 0}
                  >
                    <option value="">Chọn Chức Vụ</option>
                    {chucVus.map((cv) => (
                      <option key={cv.id} value={cv.id}>
                        {cv.tenChucVu}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={isLoading}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSaveNhanVien} disabled={isLoading}>
            {isLoading ? 'Đang lưu...' : (isEdit ? 'Cập nhật' : 'Lưu')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default QuanLyDanhSachNhanSu;
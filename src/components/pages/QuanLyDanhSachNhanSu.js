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

  // Fetch danh sách nhân viên
  const fetchNhanViens = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { page, size };
      if (role === 'NGUOICHAMCONG') {
        params.khoaPhongId = khoaPhongId;
      }
      const response = await axiosInstance.get('/nhanvien', { params });
      setNhanViens(response.data.content);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching nhanviens:', error.response?.data || error.message);
      toast.error(error.response?.data || 'Lỗi khi lấy danh sách nhân viên');
    } finally {
      setIsLoading(false);
    }
  }, [page, size, role, khoaPhongId]);

  // Fetch danh sách khoa/phòng và chức vụ
  const fetchKhoaPhongsAndChucVus = async () => {
    setIsLoading(true);
    try {
      const khoaPhongRes = await axiosInstance.get('/khoa-phong');
      setKhoaPhongs(khoaPhongRes.data || []);
    } catch (error) {
      console.error('Error fetching khoa-phong:', error.response?.data || error.message);
      toast.error('Lỗi khi lấy danh sách khoa/phòng: ' + (error.response?.data || error.message));
    }

    try {
      const chucVuRes = await axiosInstance.get('/chuc-vu');
      setChucVus(chucVuRes.data || []);
    } catch (error) {
      console.error('Error fetching chuc-vu:', error.response?.data || error.message);
      toast.error('Lỗi khi lấy danh sách chức vụ: ' + (error.response?.data || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNhanViens();
    fetchKhoaPhongsAndChucVus();
  }, [fetchNhanViens]);

  // CẬP NHẬT: Hàm validate và prepare payload
  const preparePayload = () => {
    // Format ngày sinh thành chuỗi dd/MM/yyyy
    const formattedNgaySinh = currentNhanVien.ngayThangNamSinh
      ? format(currentNhanVien.ngayThangNamSinh, 'dd/MM/yyyy')
      : null;

    // CẬP NHẬT: Xử lý mã NV - nếu rỗng hoặc chỉ có khoảng trắng thì gửi null
    const processedMaNV = currentNhanVien.maNV && currentNhanVien.maNV.trim() 
      ? currentNhanVien.maNV.trim() 
      : null;

    // CẬP NHẬT: Xử lý số điện thoại - nếu rỗng hoặc chỉ có khoảng trắng thì gửi null
    const processedSDT = currentNhanVien.soDienThoai && currentNhanVien.soDienThoai.trim() 
      ? currentNhanVien.soDienThoai.trim() 
      : null;

    return {
      hoTen: currentNhanVien.hoTen.trim(),
      email: currentNhanVien.email.trim(),
      maNV: processedMaNV, // Có thể là null
      ngayThangNamSinh: formattedNgaySinh,
      soDienThoai: processedSDT, // Có thể là null
      khoaPhong: { id: currentNhanVien.khoaPhong.id },
      chucVu: currentNhanVien.chucVu.id ? { id: currentNhanVien.chucVu.id } : null,
    };
  };

  // CẬP NHẬT: Validation đơn giản hơn
  const validateForm = () => {
    // Kiểm tra các trường bắt buộc
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(currentNhanVien.email.trim())) {
      toast.error('Email không hợp lệ');
      return false;
    }

    // CẬP NHẬT: Validate mã NV chỉ khi có nhập
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

    // CẬP NHẬT: Validate số điện thoại chỉ khi có nhập
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

  // CẬP NHẬT: Xử lý thêm/sửa nhân viên
  const handleSaveNhanVien = async () => {
    if (!validateForm()) {
      return;
    }

    const payload = preparePayload();
    
    console.log('Payload gửi đi:', payload); // Debug log

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

  // Xử lý xóa nhân viên
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

  // CẬP NHẬT: Xử lý mở modal thêm/sửa
  const openModal = (nhanVien = null) => {
    setIsEdit(!!nhanVien);
    if (nhanVien) {
      // Parse ngày sinh từ chuỗi dd/MM/yyyy thành Date
      const parsedDate = nhanVien.ngayThangNamSinh
        ? parse(nhanVien.ngayThangNamSinh, 'dd/MM/yyyy', new Date())
        : null;
      setCurrentNhanVien({
        ...nhanVien,
        ngayThangNamSinh: parsedDate,
        khoaPhong: { id: nhanVien.khoaPhong?.id || '' },
        chucVu: { id: nhanVien.chucVu?.id || '' },
        // CẬP NHẬT: Đảm bảo maNV và soDienThoai không bị undefined
        maNV: nhanVien.maNV || '',
        soDienThoai: nhanVien.soDienThoai || '',
      });
    } else {
      setCurrentNhanVien({
        id: null,
        hoTen: '',
        email: '',
        maNV: '', // CẬP NHẬT: Bắt đầu với string rỗng
        ngayThangNamSinh: null,
        soDienThoai: '', // CẬP NHẬT: Bắt đầu với string rỗng
        khoaPhong: { id: role === 'NGUOICHAMCONG' ? khoaPhongId : '' },
        chucVu: { id: '' },
      });
    }
    setShowModal(true);
  };

  // Xử lý thay đổi form
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

  // Xử lý thay đổi ngày sinh
  const handleDateChange = (date) => {
    setCurrentNhanVien({ ...currentNhanVien, ngayThangNamSinh: date });
  };

  // Xử lý phân trang
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  // Hàm để format ngày
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
    <div className="container mt-4">
      <h2 className="mb-4">Quản Lý Danh Sách Nhân Sự</h2>
      {isLoading && (
        <div className="text-center mb-3">
          <Spinner animation="border" variant="primary" />
          <span className="ms-2">Đang tải...</span>
        </div>
      )}
      <Button variant="primary" className="mb-3" onClick={() => openModal()} disabled={isLoading}>
        Thêm Nhân Viên
      </Button>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Họ Tên</th>
            <th>Email</th>
            <th>Mã NV</th>
            <th>Ngày Sinh</th>
            <th>Số Điện Thoại</th>
            <th>Khoa/Phòng</th>
            <th>Chức Vụ</th>
            <th>Hành Động</th>
          </tr>
        </thead>
        <tbody>
          {nhanViens.length === 0 && !isLoading ? (
            <tr>
              <td colSpan="8" className="text-center">
                Không có dữ liệu nhân viên
              </td>
            </tr>
          ) : (
            nhanViens.map((nv) => (
              <tr key={nv.id}>
                <td>{nv.hoTen}</td>
                <td>{nv.email}</td>
                <td>{nv.maNV || '-'}</td>
                <td>{formatDate(nv.ngayThangNamSinh)}</td>
                <td>{nv.soDienThoai || '-'}</td>
                <td>{nv.khoaPhong?.tenKhoaPhong || '-'}</td>
                <td>{nv.chucVu?.tenChucVu || '-'}</td>
                <td>
                  <Button
                    variant="warning"
                    className="me-2"
                    onClick={() => openModal(nv)}
                    disabled={isLoading}
                  >
                    Sửa
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleDeleteNhanVien(nv.id)}
                    disabled={isLoading}
                  >
                    Xóa
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* Phân trang */}
      <Pagination>
        {Array.from({ length: totalPages }, (_, i) => (
          <Pagination.Item key={i} active={i === page} onClick={() => handlePageChange(i)}>
            {i + 1}
          </Pagination.Item>
        ))}
      </Pagination>

      {/* Modal thêm/sửa nhân viên */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{isEdit ? 'Sửa Nhân Viên' : 'Thêm Nhân Viên'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Họ Tên <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                name="hoTen"
                value={currentNhanVien.hoTen}
                onChange={handleChange}
                required
                placeholder="Nhập họ tên"
                disabled={isLoading}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={currentNhanVien.email}
                onChange={handleChange}
                required
                placeholder="Nhập email"
                disabled={isLoading}
              />
            </Form.Group>
            {/* CẬP NHẬT: Mã NV có thể để trống */}
            <Form.Group className="mb-3">
              <Form.Label>
                Mã NV 
                <small className="text-muted ms-2">(Tùy chọn - có thể để trống)</small>
              </Form.Label>
              <Form.Control
                type="text"
                name="maNV"
                value={currentNhanVien.maNV}
                onChange={handleChange}
                placeholder="Nhập mã nhân viên (hoặc để trống)"
                disabled={isLoading}
                maxLength={50}
              />
              <Form.Text className="text-muted">
                Nếu không nhập, hệ thống sẽ để trống mã nhân viên
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Ngày Sinh</Form.Label>
              <DatePicker
                selected={currentNhanVien.ngayThangNamSinh}
                onChange={handleDateChange}
                dateFormat="dd/MM/yyyy"
                className="form-control"
                placeholderText="dd/MM/yyyy"
                disabled={isLoading}
                showYearDropdown
                yearDropdownItemNumber={100}
                scrollableYearDropdown
                maxDate={new Date()} // Không cho chọn ngày tương lai
              />
            </Form.Group>
            {/* CẬP NHẬT: Số điện thoại có thể để trống */}
            <Form.Group className="mb-3">
              <Form.Label>
                Số Điện Thoại
                <small className="text-muted ms-2">(Tùy chọn)</small>
              </Form.Label>
              <Form.Control
                type="text"
                name="soDienThoai"
                value={currentNhanVien.soDienThoai}
                onChange={handleChange}
                placeholder="Nhập số điện thoại (hoặc để trống)"
                disabled={isLoading}
                maxLength={15}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Khoa/Phòng <span className="text-danger">*</span></Form.Label>
              {role === 'NGUOICHAMCONG' ? (
                <Form.Control
                  type="text"
                  value={khoaPhongs.find((kp) => kp.id === Number(khoaPhongId))?.tenKhoaPhong || 'N/A'}
                  disabled
                />
              ) : (
                <Form.Select
                  name="khoaPhongId"
                  value={currentNhanVien.khoaPhong.id}
                  onChange={handleChange}
                  required
                  disabled={isLoading || khoaPhongs.length === 0}
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
            <Form.Group className="mb-3">
              <Form.Label>
                Chức Vụ
                <small className="text-muted ms-2">(Tùy chọn)</small>
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
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={isLoading}>
            Đóng
          </Button>
          <Button variant="primary" onClick={handleSaveNhanVien} disabled={isLoading}>
            {isLoading ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default QuanLyDanhSachNhanSu;  
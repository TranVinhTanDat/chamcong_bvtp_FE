import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { toast } from 'react-toastify';
import { Table, Button, Modal, Form, Pagination } from 'react-bootstrap';

function QuanLyDanhSachNhanSu() {
  const [nhanViens, setNhanViens] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [size] = useState(10); // Loại bỏ setSize vì không sử dụng
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentNhanVien, setCurrentNhanVien] = useState({
    id: null,
    hoTen: '',
    email: '',
    maNV: '',
    ngayThangNamSinh: '',
    soDienThoai: '',
    khoaPhong: { id: '' },
    chucVu: { id: '' },
  });
  const [khoaPhongs, setKhoaPhongs] = useState([]);
  const [chucVus, setChucVus] = useState([]);

  const role = localStorage.getItem('role');
  const khoaPhongId = localStorage.getItem('khoaPhongId');

  // Lấy danh sách nhân viên
  const fetchNhanViens = useCallback(async () => {
    try {
      const params = { page, size };
      if (role === 'NGUOICHAMCONG') {
        params.khoaPhongId = khoaPhongId;
      }
      const response = await axiosInstance.get('/nhanvien', { params });
      setNhanViens(response.data.content);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      toast.error(error.response?.data || 'Lỗi khi lấy danh sách nhân viên');
    }
  }, [page, size, role, khoaPhongId]);

  // Lấy danh sách khoa/phòng và chức vụ
  const fetchKhoaPhongsAndChucVus = async () => {
    try {
      const [khoaPhongRes, chucVuRes] = await Promise.all([
        axiosInstance.get('/khoa-phong'),
        axiosInstance.get('/chuc-vu'),
      ]);
      setKhoaPhongs(khoaPhongRes.data);
      setChucVus(chucVuRes.data);
    } catch (error) {
      toast.error('Lỗi khi lấy danh sách khoa/phòng hoặc chức vụ');
    }
  };

  useEffect(() => {
    fetchNhanViens();
    fetchKhoaPhongsAndChucVus();
  }, [fetchNhanViens]);

  // Xử lý thêm/sửa nhân viên
  const handleSaveNhanVien = async () => {
    try {
      if (isEdit) {
        await axiosInstance.put(`/nhanvien/${currentNhanVien.id}`, currentNhanVien);
        toast.success('Cập nhật nhân viên thành công');
      } else {
        await axiosInstance.post('/nhanvien', currentNhanVien);
        toast.success('Thêm nhân viên thành công');
      }
      setShowModal(false);
      fetchNhanViens();
    } catch (error) {
      toast.error(error.response?.data || 'Lỗi khi lưu nhân viên');
    }
  };

  // Xử lý xóa nhân viên
  const handleDeleteNhanVien = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa nhân viên này?')) {
      try {
        await axiosInstance.delete(`/nhanvien/${id}`);
        toast.success('Xóa nhân viên thành công');
        fetchNhanViens();
      } catch (error) {
        toast.error(error.response?.data || 'Lỗi khi xóa nhân viên');
      }
    }
  };

  // Xử lý mở modal thêm/sửa
  const openModal = (nhanVien = null) => {
    setIsEdit(!!nhanVien);
    setCurrentNhanVien(
      nhanVien || {
        hoTen: '',
        email: '',
        maNV: '',
        ngayThangNamSinh: '',
        soDienThoai: '',
        khoaPhong: { id: role === 'NGUOICHAMCONG' ? khoaPhongId : '' },
        chucVu: { id: '' },
      }
    );
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

  // Xử lý phân trang
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  return (
    <div className="container">
      <h2 className="mb-4">Quản Lý Danh Sách Nhân Sự</h2>
      <Button variant="primary" className="mb-3" onClick={() => openModal()}>
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
          {nhanViens.map((nv) => (
            <tr key={nv.id}>
              <td>{nv.hoTen}</td>
              <td>{nv.email}</td>
              <td>{nv.maNV}</td>
              <td>{nv.ngayThangNamSinh}</td>
              <td>{nv.soDienThoai}</td>
              <td>{nv.khoaPhong?.tenKhoaPhong}</td>
              <td>{nv.chucVu?.tenChucVu}</td>
              <td>
                <Button variant="warning" className="me-2" onClick={() => openModal(nv)}>
                  Sửa
                </Button>
                <Button variant="danger" onClick={() => handleDeleteNhanVien(nv.id)}>
                  Xóa
                </Button>
              </td>
            </tr>
          ))}
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
              <Form.Label>Họ Tên</Form.Label>
              <Form.Control
                type="text"
                name="hoTen"
                value={currentNhanVien.hoTen}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={currentNhanVien.email}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Mã NV</Form.Label>
              <Form.Control
                type="text"
                name="maNV"
                value={currentNhanVien.maNV}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Ngày Sinh</Form.Label>
              <Form.Control
                type="date"
                name="ngayThangNamSinh"
                value={currentNhanVien.ngayThangNamSinh}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Số Điện Thoại</Form.Label>
              <Form.Control
                type="text"
                name="soDienThoai"
                value={currentNhanVien.soDienThoai}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Khoa/Phòng</Form.Label>
              <Form.Select
                name="khoaPhongId"
                value={currentNhanVien.khoaPhong.id}
                onChange={handleChange}
                disabled={role === 'NGUOICHAMCONG'}
              >
                <option value="">Chọn Khoa/Phòng</option>
                {khoaPhongs.map((kp) => (
                  <option key={kp.id} value={kp.id}>
                    {kp.tenKhoaPhong}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Chức Vụ</Form.Label>
              <Form.Select
                name="chucVuId"
                value={currentNhanVien.chucVu.id}
                onChange={handleChange}
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
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Đóng
          </Button>
          <Button variant="primary" onClick={handleSaveNhanVien}>
            Lưu
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default QuanLyDanhSachNhanSu;
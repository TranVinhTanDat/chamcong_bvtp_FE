import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { toast } from 'react-toastify';
import { Modal, Button, Form, Table, Pagination, InputGroup, FormControl } from 'react-bootstrap';

const CaiDatKyHieuChamCong = () => {
  const [kyHieuList, setKyHieuList] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentKyHieu, setCurrentKyHieu] = useState({
    id: null,
    maKyHieu: '',
    tenKyHieu: '',
    trangThai: true,
    ghiChu: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const role = localStorage.getItem('role'); // Get user role

  const fetchKyHieuChamCong = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get('/ky-hieu-cham-cong/paged', {
        params: { page: currentPage, size: pageSize, search },
      });
      setKyHieuList(response.data.content);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      toast.error('Lỗi khi tải danh sách ký hiệu chấm công!');
      console.error('Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKyHieuChamCong();
  }, [currentPage, search]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setCurrentPage(0);
  };

  const handleOpenModal = (kyHieu = null) => {
    if (role !== 'ADMIN') {
      toast.error('Bạn không có quyền chỉnh sửa!');
      return;
    }
    if (kyHieu) {
      setIsEdit(true);
      setCurrentKyHieu(kyHieu);
    } else {
      setIsEdit(false);
      setCurrentKyHieu({ id: null, maKyHieu: '', tenKyHieu: '', trangThai: true, ghiChu: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentKyHieu({ id: null, maKyHieu: '', tenKyHieu: '', trangThai: true, ghiChu: '' });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentKyHieu(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (role !== 'ADMIN') {
      toast.error('Bạn không có quyền thực hiện hành động này!');
      return;
    }
    setIsLoading(true);
    try {
      if (isEdit) {
        await axiosInstance.put(`/ky-hieu-cham-cong/${currentKyHieu.id}`, currentKyHieu);
        toast.success('Cập nhật ký hiệu chấm công thành công!');
      } else {
        await axiosInstance.post('/ky-hieu-cham-cong', currentKyHieu);
        toast.success('Thêm ký hiệu chấm công thành công!');
      }
      fetchKyHieuChamCong();
      handleCloseModal();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Lỗi khi lưu ký hiệu chấm công!';
      toast.error(errorMsg);
      console.error('Save error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (role !== 'ADMIN') {
      toast.error('Bạn không có quyền xóa!');
      return;
    }
    if (window.confirm('Bạn có chắc muốn xóa ký hiệu chấm công này?')) {
      setIsLoading(true);
      try {
        await axiosInstance.delete(`/ky-hieu-cham-cong/${id}`);
        toast.success('Xóa ký hiệu chấm công thành công!');
        fetchKyHieuChamCong();
      } catch (error) {
        toast.error('Lỗi khi xóa ký hiệu chấm công!');
        console.error('Delete error:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const renderPagination = () => {
    const items = [];
    for (let i = 0; i < totalPages; i++) {
      items.push(
        <Pagination.Item
          key={i}
          active={i === currentPage}
          onClick={() => handlePageChange(i)}
        >
          {i + 1}
        </Pagination.Item>
      );
    }
    return items;
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Quản Lý Ký Hiệu Chấm Công</h2>

      <div className="d-flex justify-content-between mb-3">
        <InputGroup style={{ maxWidth: '300px' }}>
          <FormControl
            placeholder="Tìm kiếm mã hoặc tên ký hiệu..."
            value={search}
            onChange={handleSearch}
          />
        </InputGroup>
        <Button
          variant="primary"
          onClick={() => handleOpenModal()}
          disabled={role !== 'ADMIN'}
        >
          Thêm mới
        </Button>
      </div>

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Mã Ký Hiệu</th>
            <th>Tên Ký Hiệu</th>
            <th>Trạng Thái</th>
            <th>Ghi Chú</th>
            <th>Hành Động</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan="5" className="text-center">Đang tải...</td>
            </tr>
          ) : kyHieuList.length > 0 ? (
            kyHieuList.map(kyHieu => (
              <tr key={kyHieu.id}>
                <td>{kyHieu.maKyHieu}</td>
                <td>{kyHieu.tenKyHieu}</td>
                <td>{kyHieu.trangThai ? 'Kích hoạt' : 'Không kích hoạt'}</td>
                <td>{kyHieu.ghiChu || '-'}</td>
                <td>
                  <Button
                    variant="warning"
                    size="sm"
                    className="me-2"
                    onClick={() => handleOpenModal(kyHieu)}
                    disabled={role !== 'ADMIN'}
                  >
                    Sửa
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(kyHieu.id)}
                    disabled={role !== 'ADMIN'}
                  >
                    Xóa
                  </Button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="text-center">Không có dữ liệu</td>
            </tr>
          )}
        </tbody>
      </Table>

      {totalPages > 1 && (
        <Pagination className="justify-content-center">
          <Pagination.Prev
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
          />
          {renderPagination()}
          <Pagination.Next
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages - 1}
          />
        </Pagination>
      )}

      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{isEdit ? 'Sửa Ký Hiệu Chấm Công' : 'Thêm Ký Hiệu Chấm Công'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Mã Ký Hiệu</Form.Label>
              <Form.Control
                type="text"
                name="maKyHieu"
                value={currentKyHieu.maKyHieu}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tên Ký Hiệu</Form.Label>
              <Form.Control
                type="text"
                name="tenKyHieu"
                value={currentKyHieu.tenKyHieu}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Kích hoạt"
                name="trangThai"
                checked={currentKyHieu.trangThai}
                onChange={handleChange}
                disabled={isLoading}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Ghi Chú</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="ghiChu"
                value={currentKyHieu.ghiChu || ''}
                onChange={handleChange}
                disabled={isLoading}
              />
            </Form.Group>
            <Button variant="primary" type="submit" disabled={isLoading || role !== 'ADMIN'}>
              {isLoading ? 'Đang lưu...' : (isEdit ? 'Cập nhật' : 'Thêm mới')}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default CaiDatKyHieuChamCong;
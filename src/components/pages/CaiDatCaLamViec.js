import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { toast } from 'react-toastify';
import { Modal, Button, Form, Table, Pagination, InputGroup, FormControl } from 'react-bootstrap';

const CaiDatCaLamViec = () => {
  const [caLamViecList, setCaLamViecList] = useState([]);
  const [kyHieuList, setKyHieuList] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentCaLamViec, setCurrentCaLamViec] = useState({
    id: null,
    tenCaLamViec: '',
    kyHieuChamCong: { id: '' }
  });
  const [isLoading, setIsLoading] = useState(false);
  const role = localStorage.getItem('role');
  console.log('Current Role:', role); // Debug role

  const fetchKyHieuChamCong = async () => {
    try {
      const response = await axiosInstance.get('/ky-hieu-cham-cong');
      setKyHieuList(response.data);
    } catch (error) {
      console.error('Fetch KyHieuChamCong Error:', error.response ? error.response.data : error.message);
      toast.error('Lỗi khi tải danh sách ký hiệu chấm công!');
    }
  };

  const fetchCaLamViec = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get('/ca-lam-viec/paged', {
        params: { page: currentPage, size: pageSize, search },
      });
      console.log('API Response:', response.data); // Debug log
      setCaLamViecList(response.data.content);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('API Error:', error.response ? error.response.data : error.message);
      toast.error('Lỗi khi tải danh sách ca làm việc!');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKyHieuChamCong();
    fetchCaLamViec();
  }, [currentPage, search]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setCurrentPage(0);
  };

  const handleOpenModal = (caLamViec = null) => {
    if (role !== 'ADMIN') {
      toast.error('Bạn không có quyền chỉnh sửa!');
      return;
    }
    if (caLamViec) {
      setIsEdit(true);
      setCurrentCaLamViec({
        id: caLamViec.id,
        tenCaLamViec: caLamViec.tenCaLamViec,
        kyHieuChamCong: { id: caLamViec.kyHieuChamCong.id }
      });
    } else {
      setIsEdit(false);
      setCurrentCaLamViec({ id: null, tenCaLamViec: '', kyHieuChamCong: { id: '' } });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentCaLamViec({ id: null, tenCaLamViec: '', kyHieuChamCong: { id: '' } });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'kyHieuChamCong') {
      setCurrentCaLamViec(prev => ({
        ...prev,
        kyHieuChamCong: { id: value }
      }));
    } else {
      setCurrentCaLamViec(prev => ({
        ...prev,
        [name]: value
      }));
    }
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
        await axiosInstance.put(`/ca-lam-viec/${currentCaLamViec.id}`, currentCaLamViec);
        toast.success('Cập nhật ca làm việc thành công!');
      } else {
        await axiosInstance.post('/ca-lam-viec', currentCaLamViec);
        toast.success('Thêm ca làm việc thành công!');
      }
      fetchCaLamViec();
      handleCloseModal();
    } catch (error) {
      console.error('Save Error:', error.response ? error.response.data : error.message);
      const errorMsg = error.response?.data?.error || 'Lỗi khi lưu ca làm việc!';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (role !== 'ADMIN') {
      toast.error('Bạn không có quyền xóa!');
      return;
    }
    if (window.confirm('Bạn có chắc muốn xóa ca làm việc này?')) {
      setIsLoading(true);
      try {
        await axiosInstance.delete(`/ca-lam-viec/${id}`);
        toast.success('Xóa ca làm việc thành công!');
        fetchCaLamViec();
      } catch (error) {
        console.error('Delete Error:', error.response ? error.response.data : error.message);
        toast.error('Lỗi khi xóa ca làm việc!');
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
      <h2 className="mb-4">Quản Lý Ca Làm Việc</h2>

      <div className="d-flex justify-content-between mb-3">
        <InputGroup style={{ maxWidth: '300px' }}>
          <FormControl
            placeholder="Tìm kiếm tên ca làm việc..."
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
            <th>Tên Ca Làm Việc</th>
            <th>Ký Hiệu Chấm Công</th>
            <th>Hành Động</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan="3" className="text-center">Đang tải...</td>
            </tr>
          ) : caLamViecList.length > 0 ? (
            caLamViecList.map(caLamViec => (
              <tr key={caLamViec.id}>
                <td>{caLamViec.tenCaLamViec}</td>
                <td>{caLamViec.kyHieuChamCong.maKyHieu}</td>
                <td>
                  <Button
                    variant="warning"
                    className="me-2"
                    onClick={() => handleOpenModal(caLamViec)}
                    disabled={role !== 'ADMIN'}
                    size="sm"
                  >
                    Sửa
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(caLamViec.id)}
                    disabled={role !== 'ADMIN' || isLoading}
                    size="sm"
                  >
                    Xóa
                  </Button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" className="text-center">Không có dữ liệu</td>
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
          <Modal.Title>{isEdit ? 'Sửa Ca Làm Việc' : 'Thêm Mới Ca Làm Việc'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Tên Ca Làm Việc</Form.Label>
              <Form.Control
                type="text"
                name="tenCaLamViec"
                value={currentCaLamViec.tenCaLamViec}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Ký Hiệu Chấm Công</Form.Label>
              <Form.Select
                name="kyHieuChamCong"
                value={currentCaLamViec.kyHieuChamCong.id || ''}
                onChange={handleChange}
                required
                disabled={isLoading}
              >
                <option value="">Chọn ký hiệu</option>
                {kyHieuList.map(kyHieu => (
                  <option key={kyHieu.id} value={kyHieu.id}>
                    {kyHieu.maKyHieu}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Button
              variant="primary"
              type="submit"
              disabled={isLoading || role !== 'ADMIN'}
            >
              {isLoading ? 'Đang lưu...' : (isEdit ? 'Cập nhật' : 'Thêm mới')}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default CaiDatCaLamViec;
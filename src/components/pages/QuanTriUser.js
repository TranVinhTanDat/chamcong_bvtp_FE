import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, InputGroup, Container, Pagination, Row, Col, Alert } from 'react-bootstrap';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosInstance';
import 'react-toastify/dist/ReactToastify.css';

const QuanTriUser = () => {
  const [users, setUsers] = useState([]);
  const [khoaPhongs, setKhoaPhongs] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    tenDangNhap: '',
    email: '',
    matKhau: '',
    role: { tenVaiTro: '' },
    khoaPhong: { id: '' },
  });
  const [newPassword, setNewPassword] = useState('');
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // *** THÊM MỚI: State cho filter khoa phòng ***
  const [selectedKhoaPhongFilter, setSelectedKhoaPhongFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const usersPerPage = 10;

  // *** THÊM MỚI: Kiểm tra quyền ADMIN ***
  const role = localStorage.getItem('role');

  // Lấy danh sách người dùng và khoa/phòng
  useEffect(() => {
    // *** KIỂM TRA QUYỀN ADMIN ***
    if (role !== 'ADMIN') {
      toast.error('Bạn không có quyền truy cập trang này!');
      return;
    }
    fetchUsers();
    fetchKhoaPhongs();
  }, [role]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get('/user');
      setUsers(response.data);
      setCurrentPage(1); // Reset về trang 1 khi làm mới danh sách
    } catch (error) {
      toast.error('Lỗi khi lấy danh sách người dùng: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKhoaPhongs = async () => {
    try {
      const response = await axiosInstance.get('/khoa-phong');
      setKhoaPhongs(response.data);
    } catch (error) {
      toast.error('Lỗi khi lấy danh sách khoa/phòng: ' + error.message);
    }
  };

  // *** THÊM MỚI: Xử lý filter khoa phòng ***
  const handleKhoaPhongFilterChange = (e) => {
    setSelectedKhoaPhongFilter(e.target.value);
    setCurrentPage(1); // Reset về trang đầu tiên
  };

  // *** THÊM MỚI: Lấy tên khoa phòng ***
  const getKhoaPhongName = (khoaPhongId) => {
    const khoaPhong = khoaPhongs.find(kp => kp.id.toString() === khoaPhongId.toString());
    return khoaPhong?.tenKhoaPhong || 'N/A';
  };

  // Xử lý mở modal thêm người dùng
  const handleShowAddModal = () => {
    setFormData({
      tenDangNhap: '',
      email: '',
      matKhau: '',
      role: { tenVaiTro: '' },
      khoaPhong: { id: selectedKhoaPhongFilter || '' }, // *** Ưu tiên filter hiện tại ***
    });
    setShowAddPassword(false);
    setShowAddModal(true);
  };

  // Xử lý mở modal sửa người dùng
  const handleShowEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      tenDangNhap: user.tenDangNhap,
      email: user.email,
      matKhau: '',
      role: { tenVaiTro: user.role.tenVaiTro },
      khoaPhong: { id: user.khoaPhong.id },
    });
    setShowEditPassword(false);
    setShowEditModal(true);
  };

  // Xử lý mở modal đổi mật khẩu
  const handleShowPasswordModal = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowNewPassword(false);
    setShowPasswordModal(true);
  };

  // Xử lý thêm người dùng
  const handleAddUser = async () => {
    setIsLoading(true);
    try {
      await axiosInstance.post('/user', formData);
      toast.success('Thêm người dùng thành công');
      setShowAddModal(false);
      fetchUsers();
    } catch (error) {
      toast.error('Lỗi khi thêm người dùng: ' + (error.response?.data || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý sửa người dùng
  const handleEditUser = async () => {
    setIsLoading(true);
    try {
      await axiosInstance.put(`/user/${selectedUser.id}`, formData);
      toast.success('Cập nhật người dùng thành công');
      setShowEditModal(false);
      fetchUsers();
    } catch (error) {
      toast.error('Lỗi khi cập nhật người dùng: ' + (error.response?.data || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý xóa người dùng
  const handleDeleteUser = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa người dùng này?')) {
      setIsLoading(true);
      try {
        await axiosInstance.delete(`/user/${id}`);
        toast.success('Xóa người dùng thành công');
        fetchUsers();
      } catch (error) {
        toast.error('Lỗi khi xóa người dùng: ' + (error.response?.data || error.message));
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Xử lý đổi mật khẩu
  const handleChangePassword = async () => {
    setIsLoading(true);
    try {
      await axiosInstance.put(`/user/${selectedUser.id}/password`, { newPassword });
      toast.success('Đổi mật khẩu thành công');
      setShowPasswordModal(false);
    } catch (error) {
      toast.error('Lỗi khi đổi mật khẩu: ' + (error.response?.data || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý thay đổi giá trị form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'role') {
      setFormData({ ...formData, role: { tenVaiTro: value } });
    } else if (name === 'khoaPhongId') {
      setFormData({ ...formData, khoaPhong: { id: value } });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Xử lý tìm kiếm
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset về trang 1 khi thay đổi tìm kiếm
  };

  // *** CẬP NHẬT: Lọc người dùng với cả search và filter khoa phòng ***
  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.tenDangNhap.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.tenVaiTro.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesKhoaPhong = 
      !selectedKhoaPhongFilter || 
      user.khoaPhong.id.toString() === selectedKhoaPhongFilter;
    
    return matchesSearch && matchesKhoaPhong;
  });

  // Tính toán phân trang
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  // Xử lý thay đổi trang
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // *** KIỂM TRA QUYỀN ADMIN ***
  if (role !== 'ADMIN') {
    return (
      <Container className="mt-5">
        <Alert variant="danger" className="text-center">
          <h4>🚫 Truy cập bị từ chối</h4>
          <p>Bạn không có quyền truy cập trang Quản trị User. Chỉ ADMIN mới có thể truy cập.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="px-4 py-3" style={{ backgroundColor: '#f8f9fc', minHeight: '100vh' }}>
      {/* *** HEADER CẢI THIỆN *** */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1 text-primary fw-bold">
            <i className="ri-admin-line me-2"></i>Quản Trị User
          </h1>
          <p className="text-muted mb-0">
            Quản lý tài khoản người dùng hệ thống
            <span className="badge bg-success ms-2">ADMIN ONLY</span>
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleShowAddModal}
          disabled={isLoading}
        >
          <i className="ri-user-add-line me-1"></i>
          Thêm người dùng
        </button>
      </div>

      {/* *** FILTER VÀ SEARCH SECTION *** */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <Row className="align-items-end">
            <Col md={6}>
              <label className="form-label fw-semibold">
                <i className="ri-search-line me-1"></i>Tìm kiếm người dùng
              </label>
              <Form.Control
                type="text"
                placeholder="Tìm kiếm theo tên đăng nhập, email, vai trò..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </Col>
            <Col md={6}>
              <label className="form-label fw-semibold">
                <i className="ri-building-line me-1"></i>Lọc theo khoa phòng
              </label>
              <Form.Select
                value={selectedKhoaPhongFilter}
                onChange={handleKhoaPhongFilterChange}
                disabled={isLoading}
              >
                <option value="">🌐 Tất cả khoa phòng</option>
                {khoaPhongs.map((kp) => (
                  <option key={kp.id} value={kp.id}>
                    {kp.tenKhoaPhong}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>

          {/* *** THÔNG TIN THỐNG KÊ *** */}
          <div className="mt-3">
            <small className="text-muted">
              <i className="ri-information-line me-1"></i>
              Hiển thị <strong>{filteredUsers.length}</strong> / <strong>{users.length}</strong> người dùng
              {selectedKhoaPhongFilter && (
                <span> - Khoa phòng: <strong>{getKhoaPhongName(selectedKhoaPhongFilter)}</strong></span>
              )}
              {searchTerm && (
                <span> - Tìm kiếm: "<strong>{searchTerm}</strong>"</span>
              )}
            </small>
          </div>
        </div>
      </div>

      {/* *** BẢNG DANH SÁCH CẢI THIỆN *** */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Đang tải...</span>
              </div>
              <p className="text-muted mt-2">Đang tải danh sách người dùng...</p>
            </div>
          ) : currentUsers.length > 0 ? (
            <div className="table-responsive">
              <Table className="table table-hover mb-0">
                <thead style={{ backgroundColor: '#4e73df', color: 'white' }}>
                  <tr>
                    <th className="text-center py-3">ID</th>
                    <th className="py-3">Tên đăng nhập</th>
                    <th className="py-3">Email</th>
                    <th className="py-3">Vai trò</th>
                    <th className="py-3">Khoa/Phòng</th>
                    <th className="text-center py-3">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {currentUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="text-center align-middle py-3">{user.id}</td>
                      <td className="align-middle py-3 fw-semibold">{user.tenDangNhap}</td>
                      <td className="align-middle py-3">{user.email}</td>
                      <td className="align-middle py-3">
                        <span className={`badge ${
                          user.role.tenVaiTro === 'ADMIN' ? 'bg-danger' :
                          user.role.tenVaiTro === 'NGUOITONGHOP' ? 'bg-warning' :
                          user.role.tenVaiTro === 'NGUOITONGHOP_1KP' ? 'bg-info' :
                          'bg-primary'
                        }`} style={{ fontSize: '0.85em' }}>
                          {user.role.tenVaiTro}
                        </span>
                      </td>
                      <td className="align-middle py-3">
                        <span className="badge bg-secondary" style={{ fontSize: '0.85em' }}>
                          {user.khoaPhong.tenKhoaPhong}
                        </span>
                      </td>
                      <td className="text-center align-middle py-3">
                        <Button
                          variant="warning"
                          size="sm"
                          className="me-1 mb-1"
                          onClick={() => handleShowEditModal(user)}
                          disabled={isLoading}
                          title="Sửa thông tin"
                        >
                          <i className="ri-edit-line"></i>
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="me-1 mb-1"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={isLoading}
                          title="Xóa người dùng"
                        >
                          <i className="ri-delete-bin-line"></i>
                        </Button>
                        <Button
                          variant="info"
                          size="sm"
                          className="mb-1"
                          onClick={() => handleShowPasswordModal(user)}
                          disabled={isLoading}
                          title="Đổi mật khẩu"
                        >
                          <i className="ri-lock-password-line"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-5">
              <i className="ri-user-unfollow-line text-muted" style={{ fontSize: '64px' }}></i>
              <h5 className="text-muted mt-3">Không có người dùng nào</h5>
              <p className="text-muted">
                {searchTerm || selectedKhoaPhongFilter ? 
                  'Không tìm thấy người dùng với điều kiện lọc hiện tại' : 
                  'Chưa có người dùng nào trong hệ thống'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* *** PHÂN TRANG CẢI THIỆN *** */}
      {totalPages > 1 && (
        <div className="mt-4">
          <nav aria-label="Page navigation">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <i className="ri-arrow-left-line"></i> Trước
                </button>
              </li>
              {Array.from({ length: totalPages }, (_, i) => (
                <li key={i + 1} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => handlePageChange(i + 1)}
                  >
                    {i + 1}
                  </button>
                </li>
              ))}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Sau <i className="ri-arrow-right-line"></i>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Modal thêm người dùng */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="text-primary fw-semibold">
            <i className="ri-user-add-line me-2"></i>Thêm người dùng
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    Tên đăng nhập <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="tenDangNhap"
                    value={formData.tenDangNhap}
                    onChange={handleInputChange}
                    placeholder="Nhập tên đăng nhập"
                    required
                    disabled={isLoading}
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
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Nhập email"
                    required
                    disabled={isLoading}
                  />
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">
                Mật khẩu <span className="text-danger">*</span>
              </Form.Label>
              <InputGroup>
                <Form.Control
                  type={showAddPassword ? 'text' : 'password'}
                  name="matKhau"
                  value={formData.matKhau}
                  onChange={handleInputChange}
                  placeholder="Nhập mật khẩu"
                  required
                  disabled={isLoading}
                />
                <InputGroup.Text
                  onClick={() => setShowAddPassword(!showAddPassword)}
                  style={{ cursor: 'pointer' }}
                >
                  {showAddPassword ? <FaEyeSlash /> : <FaEye />}
                </InputGroup.Text>
              </InputGroup>
            </Form.Group>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    Vai trò <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    name="role"
                    value={formData.role.tenVaiTro}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                  >
                    <option value="">Chọn vai trò</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="NGUOICHAMCONG">NGUOICHAMCONG</option>
                    <option value="NGUOITONGHOP">NGUOITONGHOP</option>
                    <option value="NGUOITONGHOP_1KP">NGUOITONGHOP_1KP</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    Khoa/Phòng <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    name="khoaPhongId"
                    value={formData.khoaPhong.id}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                  >
                    <option value="">Chọn khoa/phòng</option>
                    {khoaPhongs.map((khoaPhong) => (
                      <option key={khoaPhong.id} value={khoaPhong.id}>
                        {khoaPhong.tenKhoaPhong}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={isLoading}>
            <i className="ri-close-line me-1"></i>Đóng
          </Button>
          <Button variant="primary" onClick={handleAddUser} disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="spinner-border spinner-border-sm me-2" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                Đang thêm...
              </>
            ) : (
              <>
                <i className="ri-add-line me-1"></i>Thêm
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal sửa người dùng */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="text-primary fw-semibold">
            <i className="ri-edit-line me-2"></i>Sửa người dùng
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    Tên đăng nhập <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="tenDangNhap"
                    value={formData.tenDangNhap}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
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
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                  />
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">
                Mật khẩu <small className="text-muted">(để trống nếu không thay đổi)</small>
              </Form.Label>
              <InputGroup>
                <Form.Control
                  type={showEditPassword ? 'text' : 'password'}
                  name="matKhau"
                  value={formData.matKhau}
                  onChange={handleInputChange}
                  placeholder="Nhập mật khẩu mới (hoặc để trống)"
                  disabled={isLoading}
                />
                <InputGroup.Text
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  style={{ cursor: 'pointer' }}
                >
                  {showEditPassword ? <FaEyeSlash /> : <FaEye />}
                </InputGroup.Text>
              </InputGroup>
            </Form.Group>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    Vai trò <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    name="role"
                    value={formData.role.tenVaiTro}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                  >
                    <option value="">Chọn vai trò</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="NGUOICHAMCONG">NGUOICHAMCONG</option>
                    <option value="NGUOITONGHOP">NGUOITONGHOP</option>
                    <option value="NGUOITONGHOP_1KP">NGUOITONGHOP_1KP</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    Khoa/Phòng <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    name="khoaPhongId"
                    value={formData.khoaPhong.id}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                  >
                    <option value="">Chọn khoa/phòng</option>
                    {khoaPhongs.map((khoaPhong) => (
                      <option key={khoaPhong.id} value={khoaPhong.id}>
                        {khoaPhong.tenKhoaPhong}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={isLoading}>
            <i className="ri-close-line me-1"></i>Đóng
          </Button>
          <Button variant="primary" onClick={handleEditUser} disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="spinner-border spinner-border-sm me-2" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                Đang lưu...
              </>
            ) : (
              <>
                <i className="ri-save-line me-1"></i>Lưu
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal đổi mật khẩu */}
      <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title className="text-primary fw-semibold">
            <i className="ri-lock-password-line me-2"></i>Đổi mật khẩu
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">
                Mật khẩu mới <span className="text-danger">*</span>
              </Form.Label>
              <InputGroup>
                <Form.Control
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  required
                  disabled={isLoading}
                />
                <InputGroup.Text
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{ cursor: 'pointer' }}
                >
                  {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                </InputGroup.Text>
              </InputGroup>
              <Form.Text className="text-muted">
                <i className="ri-information-line me-1"></i>
                Mật khẩu nên có ít nhất 6 ký tự và bao gồm chữ, số
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPasswordModal(false)} disabled={isLoading}>
            <i className="ri-close-line me-1"></i>Đóng
          </Button>
          <Button variant="primary" onClick={handleChangePassword} disabled={isLoading || !newPassword.trim()}>
            {isLoading ? (
              <>
                <div className="spinner-border spinner-border-sm me-2" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                Đang lưu...
              </>
            ) : (
              <>
                <i className="ri-save-line me-1"></i>Lưu
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default QuanTriUser;
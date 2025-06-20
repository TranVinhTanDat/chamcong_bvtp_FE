import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, InputGroup, Container, Pagination, Row, Col } from 'react-bootstrap';
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
  const usersPerPage = 10;

  // Lấy danh sách người dùng và khoa/phòng
  useEffect(() => {
    fetchUsers();
    fetchKhoaPhongs();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get('/user');
      setUsers(response.data);
      setCurrentPage(1); // Reset về trang 1 khi làm mới danh sách
    } catch (error) {
      toast.error('Lỗi khi lấy danh sách người dùng: ' + error.message);
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

  // Xử lý mở modal thêm người dùng
  const handleShowAddModal = () => {
    setFormData({
      tenDangNhap: '',
      email: '',
      matKhau: '',
      role: { tenVaiTro: '' },
      khoaPhong: { id: '' },
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
    try {
      await axiosInstance.post('/user', formData);
      toast.success('Thêm người dùng thành công');
      setShowAddModal(false);
      fetchUsers();
    } catch (error) {
      toast.error('Lỗi khi thêm người dùng: ' + (error.response?.data || error.message));
    }
  };

  // Xử lý sửa người dùng
  const handleEditUser = async () => {
    try {
      await axiosInstance.put(`/user/${selectedUser.id}`, formData);
      toast.success('Cập nhật người dùng thành công');
      setShowEditModal(false);
      fetchUsers();
    } catch (error) {
      toast.error('Lỗi khi cập nhật người dùng: ' + (error.response?.data || error.message));
    }
  };

  // Xử lý xóa người dùng
  const handleDeleteUser = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa người dùng này?')) {
      try {
        await axiosInstance.delete(`/user/${id}`);
        toast.success('Xóa người dùng thành công');
        fetchUsers();
      } catch (error) {
        toast.error('Lỗi khi xóa người dùng: ' + (error.response?.data || error.message));
      }
    }
  };

  // Xử lý đổi mật khẩu
  const handleChangePassword = async () => {
    try {
      await axiosInstance.put(`/user/${selectedUser.id}/password`, { newPassword });
      toast.success('Đổi mật khẩu thành công');
      setShowPasswordModal(false);
    } catch (error) {
      toast.error('Lỗi khi đổi mật khẩu: ' + (error.response?.data || error.message));
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

  // Lọc người dùng dựa trên tìm kiếm
  const filteredUsers = users.filter(
    (user) =>
      user.tenDangNhap.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Tính toán phân trang
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  // Xử lý thay đổi trang
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <Container>
      <h2 className="my-4">Quản trị User</h2>
      <Row className="mb-3">
        <Col md={6}>
          <Button variant="primary" onClick={handleShowAddModal}>
            Thêm người dùng
          </Button>
        </Col>
        <Col md={6}>
          <Form.Control
            type="text"
            placeholder="Tìm kiếm theo tên đăng nhập hoặc email"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </Col>
      </Row>

      {/* Bảng danh sách người dùng */}
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>ID</th>
            <th>Tên đăng nhập</th>
            <th>Email</th>
            <th>Vai trò</th>
            <th>Khoa/Phòng</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {currentUsers.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.tenDangNhap}</td>
              <td>{user.email}</td>
              <td>{user.role.tenVaiTro}</td>
              <td>{user.khoaPhong.tenKhoaPhong}</td>
              <td>
                <Button
                  variant="warning"
                  size="sm"
                  className="me-2"
                  onClick={() => handleShowEditModal(user)}
                >
                  Sửa
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="me-2"
                  onClick={() => handleDeleteUser(user.id)}
                >
                  Xóa
                </Button>
                <Button
                  variant="info"
                  size="sm"
                  onClick={() => handleShowPasswordModal(user)}
                >
                  Đổi mật khẩu
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Phân trang */}
      {totalPages > 1 && (
        <Pagination className="justify-content-center">
          <Pagination.Prev
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          />
          {[...Array(totalPages)].map((_, index) => (
            <Pagination.Item
              key={index + 1}
              active={index + 1 === currentPage}
              onClick={() => handlePageChange(index + 1)}
            >
              {index + 1}
            </Pagination.Item>
          ))}
          <Pagination.Next
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          />
        </Pagination>
      )}

      {/* Modal thêm người dùng */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Thêm người dùng</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Tên đăng nhập</Form.Label>
              <Form.Control
                type="text"
                name="tenDangNhap"
                value={formData.tenDangNhap}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Mật khẩu</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showAddPassword ? 'text' : 'password'}
                  name="matKhau"
                  value={formData.matKhau}
                  onChange={handleInputChange}
                  required
                />
                <InputGroup.Text
                  onClick={() => setShowAddPassword(!showAddPassword)}
                  style={{ cursor: 'pointer' }}
                >
                  {showAddPassword ? <FaEyeSlash /> : <FaEye />}
                </InputGroup.Text>
              </InputGroup>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Vai trò</Form.Label>
              <Form.Select
                name="role"
                value={formData.role.tenVaiTro}
                onChange={handleInputChange}
                required
              >
                <option value="">Chọn vai trò</option>
                <option value="ADMIN">ADMIN</option>
                <option value="NGUOICHAMCONG">NGUOICHAMCONG</option>
                <option value="NGUOITONGHOP">NGUOITONGHOP</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Khoa/Phòng</Form.Label>
              <Form.Select
                name="khoaPhongId"
                value={formData.khoaPhong.id}
                onChange={handleInputChange}
                required
              >
                <option value="">Chọn khoa/phòng</option>
                {khoaPhongs.map((khoaPhong) => (
                  <option key={khoaPhong.id} value={khoaPhong.id}>
                    {khoaPhong.tenKhoaPhong}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Đóng
          </Button>
          <Button variant="primary" onClick={handleAddUser}>
            Thêm
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal sửa người dùng */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Sửa người dùng</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Tên đăng nhập</Form.Label>
              <Form.Control
                type="text"
                name="tenDangNhap"
                value={formData.tenDangNhap}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Mật khẩu (để trống nếu không thay đổi)</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showEditPassword ? 'text' : 'password'}
                  name="matKhau"
                  value={formData.matKhau}
                  onChange={handleInputChange}
                />
                <InputGroup.Text
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  style={{ cursor: 'pointer' }}
                >
                  {showEditPassword ? <FaEyeSlash /> : <FaEye />}
                </InputGroup.Text>
              </InputGroup>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Vai trò</Form.Label>
              <Form.Select
                name="role"
                value={formData.role.tenVaiTro}
                onChange={handleInputChange}
                required
              >
                <option value="">Chọn vai trò</option>
                <option value="ADMIN">ADMIN</option>
                <option value="NGUOICHAMCONG">NGUOICHAMCONG</option>
                <option value="NGUOITONGHOP">NGUOITONGHOP</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Khoa/Phòng</Form.Label>
              <Form.Select
                name="khoaPhongId"
                value={formData.khoaPhong.id}
                onChange={handleInputChange}
                required
              >
                <option value="">Chọn khoa/phòng</option>
                {khoaPhongs.map((khoaPhong) => (
                  <option key={khoaPhong.id} value={khoaPhong.id}>
                    {khoaPhong.tenKhoaPhong}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Đóng
          </Button>
          <Button variant="primary" onClick={handleEditUser}>
            Lưu
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal đổi mật khẩu */}
      <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Đổi mật khẩu</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Mật khẩu mới</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <InputGroup.Text
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{ cursor: 'pointer' }}
                >
                  {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                </InputGroup.Text>
              </InputGroup>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
            Đóng
          </Button>
          <Button variant="primary" onClick={handleChangePassword}>
            Lưu
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default QuanTriUser;
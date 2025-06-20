// src/components/pages/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="container text-center mt-5">
      <h1>404 - Trang Không Tồn Tại</h1>
      <p>Xin lỗi, trang bạn tìm kiếm không tồn tại.</p>
      <Link to="/" className="btn btn-primary">Quay về Trang Chủ</Link>
    </div>
  );
};

export default NotFound;
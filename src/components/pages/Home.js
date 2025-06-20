import React from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  const handleQuickAction = (action) => {
    switch (action) {
      case 'cham-cong':
        navigate('/cham-cong');
        break;
      case 'them-nhan-vien':
        navigate('/quan-ly-danh-sach-nhan-su');
        break;
      case 'xuat-bao-cao':
        alert('Chức năng xuất báo cáo chưa được triển khai');
        break;
      case 'xem-lich-lam-viec':
        alert('Chức năng xem lịch làm việc chưa được triển khai');
        break;
      default:
        break;
    }
  };

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col-12">
          <div className="bg-white p-4 rounded shadow-sm">
            <h1 className="h3 mb-2 text-primary">
              <i className="ri-home-4-line me-2"></i>
              Chào mừng đến với Hệ thống Chấm công
            </h1>
            <p className="text-muted mb-0">Quản lý chấm công hiệu quả và chính xác</p>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="card-title text-muted mb-1">Tổng nhân viên</h6>
                  <h3 className="mb-0 text-primary">245</h3>
                </div>
                <div className="bg-primary bg-opacity-10 p-3 rounded">
                  <i className="ri-team-line text-primary fs-4"></i>
                </div>
              </div>
              <div className="mt-2">
                <small className="text-success">
                  <i className="ri-arrow-up-line"></i> +2.5% so với tháng trước
                </small>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="card-title text-muted mb-1">Có mặt hôm nay</h6>
                  <h3 className="mb-0 text-success">231</h3>
                </div>
                <div className="bg-success bg-opacity-10 p-3 rounded">
                  <i className="ri-user-check-line text-success fs-4"></i>
                </div>
              </div>
              <div className="mt-2">
                <small className="text-success">
                  <i className="ri-arrow-up-line"></i> 94.3% tỷ lệ có mặt
                </small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="card-title text-muted mb-1">Vắng mặt</h6>
                  <h3 className="mb-0 text-danger">14</h3>
                </div>
                <div className="bg-danger bg-opacity-10 p-3 rounded">
                  <i className="ri-user-unfollow-line text-danger fs-4"></i>
                </div>
              </div>
              <div className="mt-2">
                <small className="text-muted">Bao gồm nghỉ phép và nghỉ ốm</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom">
              <h5 className="card-title mb-0">
                <i className="ri-history-line me-2 text-primary"></i>
                Hoạt động gần đây
              </h5>
            </div>
            <div className="card-body">
              <div className="timeline">
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-success rounded-circle p-2 me-3">
                    <i className="ri-user-check-line text-white"></i>
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="mb-1">Nguyễn Văn A đã chấm công vào</h6>
                    <small className="text-muted">08:15 AM - 2 phút trước</small>
                  </div>
                </div>
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-primary rounded-circle p-2 me-3">
                    <i className="ri-user-add-line text-white"></i>
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="mb-1">Thêm nhân viên mới: Lê Văn C</h6>
                    <small className="text-muted">07:45 AM - 30 phút trước</small>
                  </div>
                </div>
                <div className="d-flex align-items-center">
                  <div className="bg-info rounded-circle p-2 me-3">
                    <i className="ri-file-text-line text-white"></i>
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="mb-1">Báo cáo tháng 6 đã được tạo</h6>
                    <small className="text-muted">07:00 AM - 1 giờ trước</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-4 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom">
              <h5 className="card-title mb-0">
                <i className="ri-flashlight-line me-2 text-primary"></i>
                Thao tác nhanh
              </h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <button
                  className="btn btn-primary d-flex align-items-center justify-content-center"
                  onClick={() => handleQuickAction('cham-cong')}
                >
                  <i className="ri-time-line me-2"></i>
                  Chấm công ngay
                </button>
                <button
                  className="btn btn-outline-primary d-flex align-items-center justify-content-center"
                  onClick={() => handleQuickAction('them-nhan-vien')}
                >
                  <i className="ri-user-add-line me-2"></i>
                  Thêm nhân viên
                </button>
                <button
                  className="btn btn-outline-info d-flex align-items-center justify-content-center"
                  onClick={() => handleQuickAction('xem-lich-lam-viec')}
                >
                  <i className="ri-calendar-check-line me-2"></i>
                  Xem lịch làm việc
                </button>
              </div>
              <div className="mt-4 pt-3 border-top">
                <h6 className="text-muted mb-3">Thống kê nhanh</h6>
                <div className="row text-center">
                  <div className="col-6">
                    <div className="border-end">
                      <h4 className="text-primary mb-0">8.2</h4>
                      <small className="text-muted">Giờ làm TB</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <h4 className="text-success mb-0">96%</h4>
                    <small className="text-muted">Tỷ lệ đúng giờ</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
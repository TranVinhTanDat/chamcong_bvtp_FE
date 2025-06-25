import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { toast } from 'react-toastify';

function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    attendanceRate: 0,
    avgWorkHours: 0,
    onTimeRate: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [userInfo, setUserInfo] = useState({
    role: localStorage.getItem('role'),
    khoaPhongId: localStorage.getItem('khoaPhongId'),
    tenKhoaPhong: localStorage.getItem('tenKhoaPhong')
  });
  const [todayDate] = useState(new Date());

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Parallel fetch các dữ liệu cần thiết
      const promises = [
        fetchStatistics(),
        fetchRecentActivities(),
        fetchUserProfile()
      ];

      await Promise.all(promises);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Có lỗi xảy ra khi tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('/user/current');
      const userData = response.data;
      setUserInfo(prev => ({
        ...prev,
        tenDangNhap: userData.tenDangNhap,
        tenKhoaPhong: userData.tenKhoaPhong
      }));
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const today = new Date();
      const khoaPhongId = userInfo.role === 'NGUOICHAMCONG' ? userInfo.khoaPhongId : null;

      // 1. Lấy tổng số nhân viên
      const employeesResponse = await axiosInstance.get('/nhanvien', {
        params: { 
          page: 0, 
          size: 1000,
          khoaPhongId: khoaPhongId || undefined
        }
      });
      
      const totalEmployees = employeesResponse.data.totalElements || 0;

      // 2. Lấy dữ liệu chấm công hôm nay
      const attendanceResponse = await axiosInstance.get('/chamcong/lichsu', {
        params: {
          year: today.getFullYear(),
          month: today.getMonth() + 1,
          day: today.getDate(),
          khoaPhongId: khoaPhongId || undefined,
          page: 0,
          size: 1000
        }
      });

      // Xử lý dữ liệu chấm công hôm nay
      const attendanceData = attendanceResponse.data.content || [];
      
      // Nhóm theo nhân viên để tránh đếm trùng
      const employeeAttendance = {};
      
      attendanceData.forEach(record => {
        if (record.nhanVien && record.nhanVien.id) {
          const employeeId = record.nhanVien.id;
          
          if (!employeeAttendance[employeeId]) {
            employeeAttendance[employeeId] = {
              employee: record.nhanVien,
              hasWorked: false,
              hasAbsent: false,
              checkInTime: null
            };
          }

          // Kiểm tra trạng thái chấm công
          if (record.trangThaiChamCong?.tenTrangThai === 'LÀM') {
            employeeAttendance[employeeId].hasWorked = true;
            if (!employeeAttendance[employeeId].checkInTime) {
              employeeAttendance[employeeId].checkInTime = record.thoiGianCheckIn;
            }
          } else if (record.trangThaiChamCong?.tenTrangThai === 'NGHỈ') {
            employeeAttendance[employeeId].hasAbsent = true;
          }
        }
      });

      // Tính toán thống kê
      const employeeAttendanceArray = Object.values(employeeAttendance);
      const presentToday = employeeAttendanceArray.filter(emp => emp.hasWorked).length;
      const absentToday = employeeAttendanceArray.filter(emp => emp.hasAbsent && !emp.hasWorked).length;
      const attendanceRate = totalEmployees > 0 ? ((presentToday / totalEmployees) * 100) : 0;

      // Tính tỷ lệ đúng giờ (giả sử 8:00 AM là giờ chuẩn)
      const onTimeEmployees = employeeAttendanceArray.filter(emp => {
        if (!emp.checkInTime || !emp.hasWorked) return false;
        
        const checkInTime = emp.checkInTime.split(' ')[1]; // Lấy phần giờ
        if (!checkInTime) return false;
        
        const [hours, minutes] = checkInTime.split(':').map(Number);
        const checkInMinutes = hours * 60 + minutes;
        const standardTime = 8 * 60; // 8:00 AM
        
        return checkInMinutes <= standardTime + 15; // Cho phép trễ 15 phút
      }).length;

      const onTimeRate = presentToday > 0 ? ((onTimeEmployees / presentToday) * 100) : 0;

      setStatistics({
        totalEmployees,
        presentToday,
        absentToday,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        avgWorkHours: 8.2, // Giá trị mặc định, có thể tính toán phức tạp hơn
        onTimeRate: Math.round(onTimeRate * 10) / 10
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
      // Fallback data
      setStatistics({
        totalEmployees: 0,
        presentToday: 0,
        absentToday: 0,
        attendanceRate: 0,
        avgWorkHours: 0,
        onTimeRate: 0
      });
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const today = new Date();
      const khoaPhongId = userInfo.role === 'NGUOICHAMCONG' ? userInfo.khoaPhongId : null;

      // Lấy dữ liệu chấm công trong 2 ngày gần nhất
      const promises = [];
      
      for (let i = 0; i < 2; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        promises.push(
          axiosInstance.get('/chamcong/lichsu', {
            params: {
              year: date.getFullYear(),
              month: date.getMonth() + 1,
              day: date.getDate(),
              khoaPhongId: khoaPhongId || undefined,
              page: 0,
              size: 50
            }
          })
        );
      }

      const responses = await Promise.all(promises);
      const allActivities = [];

      responses.forEach(response => {
        const activities = response.data.content || [];
        allActivities.push(...activities);
      });

      // Sắp xếp theo thời gian gần nhất và lấy 10 hoạt động đầu
      const sortedActivities = allActivities
        .sort((a, b) => {
          const timeA = parseDateTime(a.thoiGianCheckIn);
          const timeB = parseDateTime(b.thoiGianCheckIn);
          return timeB - timeA;
        })
        .slice(0, 10)
        .map(activity => ({
          id: activity.id,
          type: activity.trangThaiChamCong?.tenTrangThai === 'LÀM' ? 'checkin' : 'absent',
          employeeName: activity.nhanVien?.hoTen || 'Không xác định',
          time: formatActivityTime(activity.thoiGianCheckIn),
          description: activity.trangThaiChamCong?.tenTrangThai === 'LÀM' 
            ? `đã chấm công vào` 
            : `nghỉ ${activity.kyHieuChamCong?.tenKyHieu || 'không xác định'}`,
          icon: activity.trangThaiChamCong?.tenTrangThai === 'LÀM' ? 'ri-user-check-line' : 'ri-user-unfollow-line',
          color: activity.trangThaiChamCong?.tenTrangThai === 'LÀM' ? 'success' : 'danger'
        }));

      setRecentActivities(sortedActivities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      setRecentActivities([]);
    }
  };

  const parseDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return new Date();
    
    const [datePart, timePart] = dateTimeStr.split(' ');
    const [day, month, year] = datePart.split('-');
    const [hours, minutes, seconds] = timePart.split(':');
    
    return new Date(year, month - 1, day, hours, minutes, seconds);
  };

  const formatActivityTime = (dateTimeStr) => {
    const date = parseDateTime(dateTimeStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) {
      return `${days} ngày trước`;
    } else if (hours > 0) {
      return `${hours} giờ trước`;
    } else if (minutes > 0) {
      return `${minutes} phút trước`;
    } else {
      return 'Vừa xong';
    }
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case 'cham-cong':
        navigate('/cham-cong');
        break;
      case 'them-nhan-vien':
        navigate('/quan-ly-danh-sach-nhan-su');
        break;
      case 'xem-bang-cham-cong':
        navigate('/quan-ly-bang-cham-cong');
        break;
      case 'cai-dat':
        if (userInfo.role === 'ADMIN') {
          navigate('/quan-tri-user');
        } else {
          toast.info('Bạn không có quyền truy cập chức năng này');
        }
        break;
      default:
        break;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="d-flex justify-content-center align-items-center min-vh-100">
          <div className="text-center">
            <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
            <div className="mt-3">
              <h5 className="text-muted">Đang tải dashboard...</h5>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header Section */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="bg-gradient-primary text-white p-4 rounded-3 shadow-sm" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <div className="row align-items-center">
              <div className="col-md-8">
                <h1 className="h3 mb-2 fw-bold">
                  <i className="ri-sun-line me-2"></i>
                  {getGreeting()}!
                </h1>
                <p className="mb-1 opacity-90">
                  Chào mừng bạn đến với Hệ thống Chấm công - Bệnh viện Tân Phú
                </p>
                <small className="opacity-75">
                  <i className="ri-calendar-line me-1"></i>
                  {formatDate(todayDate)}
                  {userInfo.tenKhoaPhong && (
                    <>
                      <i className="ri-building-line ms-3 me-1"></i>
                      {userInfo.tenKhoaPhong}
                    </>
                  )}
                </small>
              </div>
              <div className="col-md-4 text-md-end">
                <div className="d-inline-flex align-items-center bg-white bg-opacity-20 rounded-pill px-3 py-2">
                  <i className="ri-time-line me-2"></i>
                  <span className="fw-medium" style={{color:'red'}}>
                    {todayDate.toLocaleTimeString('vi-VN', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100 card-hover">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="card-title text-muted mb-1">Tổng nhân viên</h6>
                  <h3 className="mb-0 text-primary fw-bold">{statistics.totalEmployees}</h3>
                </div>
                <div className="bg-primary bg-opacity-10 p-3 rounded-circle">
                  <i className="ri-team-line text-primary fs-4"></i>
                </div>
              </div>
              <div className="mt-2">
                <small className="text-muted">
                  <i className="ri-group-line me-1"></i>
                  Trong {userInfo.tenKhoaPhong || 'hệ thống'}
                </small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100 card-hover">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="card-title text-muted mb-1">Có mặt hôm nay</h6>
                  <h3 className="mb-0 text-success fw-bold">{statistics.presentToday}</h3>
                </div>
                <div className="bg-success bg-opacity-10 p-3 rounded-circle">
                  <i className="ri-user-check-line text-success fs-4"></i>
                </div>
              </div>
              <div className="mt-2">
                <small className="text-success">
                  <i className="ri-arrow-up-line"></i> 
                  {statistics.attendanceRate}% tỷ lệ có mặt
                </small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100 card-hover">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="card-title text-muted mb-1">Vắng mặt</h6>
                  <h3 className="mb-0 text-danger fw-bold">{statistics.absentToday}</h3>
                </div>
                <div className="bg-danger bg-opacity-10 p-3 rounded-circle">
                  <i className="ri-user-unfollow-line text-danger fs-4"></i>
                </div>
              </div>
              <div className="mt-2">
                <small className="text-muted">Nghỉ phép, nghỉ ốm và khác</small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100 card-hover">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="card-title text-muted mb-1">Tỷ lệ đúng giờ</h6>
                  <h3 className="mb-0 text-info fw-bold">{statistics.onTimeRate}%</h3>
                </div>
                <div className="bg-info bg-opacity-10 p-3 rounded-circle">
                  <i className="ri-time-line text-info fs-4"></i>
                </div>
              </div>
              <div className="mt-2">
                <small className="text-info">
                  <i className="ri-check-line me-1"></i>
                  Chấm công đúng giờ quy định
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="row">
        {/* Recent Activities */}
        <div className="col-lg-8 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom-0 pb-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  <i className="ri-history-line me-2 text-primary"></i>
                  Hoạt động gần đây
                </h5>
                <button 
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => navigate('/quan-ly-bang-cham-cong')}
                >
                  <i className="ri-external-link-line me-1"></i>
                  Xem tất cả
                </button>
              </div>
            </div>
            <div className="card-body">
              {recentActivities.length > 0 ? (
                <div className="timeline">
                  {recentActivities.map((activity, index) => (
                    <div key={activity.id} className="d-flex align-items-start mb-3">
                      <div className={`bg-${activity.color} rounded-circle p-2 me-3 flex-shrink-0`}>
                        <i className={`${activity.icon} text-white`} style={{ fontSize: '14px' }}></i>
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="mb-1 fw-medium">
                          {activity.employeeName} {activity.description}
                        </h6>
                        <small className="text-muted">
                          <i className="ri-time-line me-1"></i>
                          {activity.time}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="ri-history-line text-muted" style={{ fontSize: '48px' }}></i>
                  <p className="text-muted mt-2 mb-0">Chưa có hoạt động nào gần đây</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-lg-4 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom-0 pb-0">
              <h5 className="card-title mb-0">
                <i className="ri-flashlight-line me-2 text-primary"></i>
                Thao tác nhanh
              </h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-3">
                <button
                  className="btn btn-primary btn-lg d-flex align-items-center justify-content-start"
                  onClick={() => handleQuickAction('cham-cong')}
                >
                  <i className="ri-time-line me-3 fs-5"></i>
                  <div className="text-start">
                    <div className="fw-bold">Chấm công ngay</div>
                    <small className="opacity-75">Chấm công cho nhân viên</small>
                  </div>
                </button>

                <button
                  className="btn btn-outline-primary btn-lg d-flex align-items-center justify-content-start"
                  onClick={() => handleQuickAction('xem-bang-cham-cong')}
                >
                  <i className="ri-table-line me-3 fs-5"></i>
                  <div className="text-start">
                    <div className="fw-bold">Bảng chấm công</div>
                    <small className="text-muted">Xem báo cáo chấm công</small>
                  </div>
                </button>

                {(userInfo.role === 'ADMIN' || userInfo.role === 'NGUOITONGHOP') && (
                  <button
                    className="btn btn-outline-success btn-lg d-flex align-items-center justify-content-start"
                    onClick={() => handleQuickAction('them-nhan-vien')}
                  >
                    <i className="ri-user-add-line me-3 fs-5"></i>
                    <div className="text-start">
                      <div className="fw-bold">Quản lý nhân sự</div>
                      <small className="text-muted">Thêm, sửa thông tin nhân viên</small>
                    </div>
                  </button>
                )}

                {userInfo.role === 'ADMIN' && (
                  <button
                    className="btn btn-outline-info btn-lg d-flex align-items-center justify-content-start"
                    onClick={() => handleQuickAction('cai-dat')}
                  >
                    <i className="ri-settings-3-line me-3 fs-5"></i>
                    <div className="text-start">
                      <div className="fw-bold">Quản trị hệ thống</div>
                      <small className="text-muted">Cài đặt user, khoa phòng</small>
                    </div>
                  </button>
                )}
              </div>

              {/* Quick Stats */}
              <div className="mt-4 pt-3 border-top">
                <h6 className="text-muted mb-3">
                  <i className="ri-bar-chart-line me-2"></i>
                  Thống kê nhanh
                </h6>
                <div className="row text-center">
                  <div className="col-6">
                    <div className="border-end">
                      <h4 className="text-primary mb-1 fw-bold">{statistics.avgWorkHours}</h4>
                      <small className="text-muted">Giờ làm TB</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <h4 className="text-success mb-1 fw-bold">{statistics.attendanceRate}%</h4>
                    <small className="text-muted">Tỷ lệ có mặt</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        .card-hover {
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        .card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.1) !important;
        }
        .timeline {
          position: relative;
        }
        .timeline .d-flex:not(:last-child)::after {
          content: '';
          position: absolute;
          left: 18px;
          top: 40px;
          width: 2px;
          height: 20px;
          background-color: #e9ecef;
        }
        .bg-gradient-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        }
      `}</style>
    </div>
  );
}

export default Home;
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { toast } from 'react-toastify';
import * as ExcelJS from 'exceljs';

function QuanLyBangChamCong() {
  const [loading, setLoading] = useState(true);
  const [nhanViens, setNhanViens] = useState([]);
  const [chamCongData, setChamCongData] = useState({});
  const [userKhoaPhongId, setUserKhoaPhongId] = useState(localStorage.getItem('khoaPhongId'));
  const [userRole, setUserRole] = useState(localStorage.getItem('role'));
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [kyHieuChamCongs, setKyHieuChamCongs] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statistics, setStatistics] = useState({});
  const [khoaPhongs, setKhoaPhongs] = useState([]);
  const [selectedKhoaPhongId, setSelectedKhoaPhongId] = useState(() => {
    if (userRole === 'NGUOITONGHOP_1KP') {
      return Number(userKhoaPhongId); // Khóa cứng cho NGUOITONGHOP_1KP
    } else if (userRole === 'NGUOITONGHOP' || userRole === 'ADMIN') {
      return null; // Cho phép chọn tất cả hoặc chọn cụ thể
    }
    return Number(userKhoaPhongId); // Default cho các role khác
  });
  const [isInitialized, setIsInitialized] = useState(false);

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const [summaryData, setSummaryData] = useState([]);
  const [showSummary, setShowSummary] = useState(false);

  const [selectedYearForExport, setSelectedYearForExport] = useState(new Date().getFullYear());

  // *** THÊM STATE CHO CHỈNH SỬA KÝ HIỆU ***
  const [editingCell, setEditingCell] = useState(null); // { employeeId, day, shift }
  const [editSymbol, setEditSymbol] = useState('');
  const [editStatus, setEditStatus] = useState('LÀM'); // THÊM MỚI
  const [editCaLamViec, setEditCaLamViec] = useState(''); // THÊM MỚI
  const [editGhiChu, setEditGhiChu] = useState(''); // THÊM MỚI
  const [showEditModal, setShowEditModal] = useState(false);
  const [editShift, setEditShift] = useState(1);


  const [hasShownCompletionToast, setHasShownCompletionToast] = useState(false);

  // Thêm state cho ca làm việc
  const [caLamViecs, setCaLamViecs] = useState([]);



  // *** HÀM XỬ LÝ CHỈNH SỬA KÝ HIỆU ***
  const handleCellClick = async (employeeId, day, shift, currentSymbol) => {
    // Chỉ ADMIN mới được sửa
    if (userRole !== 'ADMIN') {
      return;
    }

    try {
      // Tìm bản ghi chấm công hiện tại để lấy thông tin đầy đủ
      const attendanceRecord = await findAttendanceRecord(employeeId, day, shift);

      // Xác định thông tin hiện tại
      let currentStatus = 'LÀM';
      let currentCaLamViec = '';
      let currentGhiChu = '';

      if (attendanceRecord) {
        currentStatus = attendanceRecord.trangThaiChamCong?.tenTrangThai || 'LÀM';
        currentCaLamViec = attendanceRecord.caLamViec?.id?.toString() || '';
        currentGhiChu = attendanceRecord.ghiChu || '';
      }

      // Nếu không có bản ghi, set ca mặc định
      if (!currentCaLamViec) {
        const caSang = caLamViecs.find(ca => ca.id === 11);
        const caChieu = caLamViecs.find(ca => ca.id === 12);
        currentCaLamViec = shift === 1 ?
          (caSang ? caSang.id.toString() : caLamViecs[0]?.id?.toString()) :
          (caChieu ? caChieu.id.toString() : caLamViecs[0]?.id?.toString());
      }

      setEditingCell({ employeeId, day, shift });
      setEditSymbol(currentSymbol);
      setEditStatus(currentStatus);
      setEditCaLamViec(currentCaLamViec || '');
      setEditGhiChu(currentGhiChu);
      setEditShift(shift); // *** THÊM MỚI: Set shift hiện tại ***
      setShowEditModal(true);

    } catch (error) {
      console.error('Lỗi khi load thông tin chấm công:', error);
      toast.error('Không thể load thông tin chấm công hiện tại');
    }
  };



  // *** COMPONENT MODAL CHỈNH SỬA ***
  const EditSymbolModal = () => {
    if (!showEditModal || !editingCell) return null;

    const employee = filteredEmployees.find(nv => nv.id === editingCell.employeeId);
    const shiftName = editShift === 1 ? 'sáng' : 'chiều';

    // *** FIXED: Lọc ký hiệu chấm công chỉ cho trạng thái NGHỈ ***
    const availableLeaveSymbols = kyHieuChamCongs
      .filter(kh => !caLamViecs.some(ca => ca.kyHieuChamCong?.maKyHieu === kh.maKyHieu))
      .map(kh => kh.maKyHieu);

    return (
      <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="ri-edit-line me-2"></i>
                Chỉnh sửa chấm công
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={handleModalClose}
              ></button>
            </div>
            <div className="modal-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Nhân viên:</strong> {employee?.hoTen}
                </div>
                <div className="col-md-6">
                  <strong>Mã NV:</strong> {employee?.maNV}
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Ngày:</strong> {editingCell.day}/{selectedMonth}/{selectedYear}
                </div>
                <div className="col-md-6">
                  <strong>Ca hiện tại:</strong>
                  <span className={`badge ms-2 ${editShift === 1 ? 'bg-success' : 'bg-info'}`}>
                    Ca {editShift === 1 ? 'Sáng' : 'Chiều'}
                  </span>
                </div>
              </div>

              {/* *** THÊM MỚI: Lựa chọn shift *** */}
              <div className="mb-3">
                <label className="form-label fw-semibold">Chọn ca để cập nhật:</label>
                <div className="btn-group w-100" role="group">
                  <input
                    type="radio"
                    className="btn-check"
                    name="shiftOptions"
                    id="shift1"
                    value={1}
                    checked={editShift === 1}
                    onChange={(e) => {
                      setEditShift(1);
                      // Tự động cập nhật ca làm việc mặc định
                      const caSang = caLamViecs.find(ca => ca.id === 11);
                      if (caSang) {
                        setEditCaLamViec(caSang.id.toString());
                      }
                    }}
                  />
                  <label className="btn btn-outline-success" htmlFor="shift1">
                    <i className="ri-sun-line me-1"></i>
                    Ca Sáng (Shift 1)
                  </label>

                  <input
                    type="radio"
                    className="btn-check"
                    name="shiftOptions"
                    id="shift2"
                    value={2}
                    checked={editShift === 2}
                    onChange={(e) => {
                      setEditShift(2);
                      // Tự động cập nhật ca làm việc mặc định
                      const caChieu = caLamViecs.find(ca => ca.id === 12);
                      if (caChieu) {
                        setEditCaLamViec(caChieu.id.toString());
                      }
                    }}
                  />
                  <label className="btn btn-outline-info" htmlFor="shift2">
                    <i className="ri-moon-line me-1"></i>
                    Ca Chiều (Shift 2)
                  </label>
                </div>
                <small className="text-muted">
                  Bạn có thể thay đổi ca cần cập nhật. Hiện tại đang chỉnh sửa ca {shiftName}.
                </small>
              </div>

              {/* Trạng thái */}
              <div className="mb-3">
                <label className="form-label fw-semibold">Trạng thái:</label>
                <select
                  className="form-select"
                  value={editStatus}
                  onChange={(e) => {
                    setEditStatus(e.target.value);
                    // *** FIXED: Auto-adjust logic khi thay đổi trạng thái ***
                    if (e.target.value === 'LÀM') {
                      // Trạng thái LÀM: Xóa ký hiệu và ghi chú
                      setEditSymbol(''); // *** KHÔNG CẦN KÝ HIỆU CHO LÀM ***
                      setEditGhiChu(''); // Xóa ghi chú
                    } else {
                      // Trạng thái NGHỈ: Tự động chọn N1 và giữ nguyên ghi chú
                      const defaultN1 = kyHieuChamCongs.find(kh => kh.maKyHieu === 'N1');
                      setEditSymbol(defaultN1?.maKyHieu || (availableLeaveSymbols[0] || ''));
                    }
                  }}
                >
                  <option value="LÀM">Làm</option>
                  <option value="NGHỈ">Nghỉ</option>
                </select>
              </div>

              {/* Ca làm việc */}
              <div className="mb-3">
                <label className="form-label fw-semibold">Ca làm việc:</label>
                <select
                  className="form-select"
                  value={editCaLamViec}
                  onChange={(e) => setEditCaLamViec(e.target.value)}
                  required
                >
                  <option value="">-- Chọn ca làm việc --</option>
                  {caLamViecs.map(ca => (
                    <option key={ca.id} value={ca.id}>
                      {ca.tenCaLamViec} ({ca.kyHieuChamCong?.maKyHieu || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              {/* *** FIXED: Ký hiệu chấm công CHỈ cho trạng thái NGHỈ *** */}
              {editStatus === 'NGHỈ' && (
                <div className="mb-3">
                  <label className="form-label fw-semibold">Ký hiệu chấm công:</label>
                  <select
                    className="form-select"
                    value={editSymbol}
                    onChange={(e) => setEditSymbol(e.target.value)}
                    required
                  >
                    <option value="-">- (Xóa bản ghi)</option>
                    {availableLeaveSymbols.map(symbolCode => {
                      const kyHieu = kyHieuChamCongs.find(kh => kh.maKyHieu === symbolCode);
                      return (
                        <option key={symbolCode} value={symbolCode}>
                          {symbolCode} - {kyHieu?.tenKyHieu || 'N/A'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* *** HIỂN THỊ THÔNG TIN VỀ KÝ HIỆU CHO TRẠNG THÁI LÀM *** */}
              {editStatus === 'LÀM' && (
                <div className="alert alert-info">
                  <i className="ri-information-line me-2"></i>
                  <strong>Lưu ý:</strong> Khi trạng thái là "Làm", ký hiệu chấm công sẽ được tự động lấy từ ca làm việc được chọn.
                  Bạn không cần chọn ký hiệu riêng.
                </div>
              )}

              {/* Ghi chú (chỉ cho trạng thái NGHỈ) */}
              {editStatus === 'NGHỈ' && (
                <div className="mb-3">
                  <label className="form-label fw-semibold">Ghi chú:</label>
                  <textarea
                    className="form-control"
                    value={editGhiChu}
                    onChange={(e) => setEditGhiChu(e.target.value)}
                    placeholder="Nhập ghi chú (tùy chọn)"
                    rows="3"
                  />
                </div>
              )}

              <div className="alert alert-info">
                <i className="ri-information-line me-2"></i>
                <small>
                  Bạn đang cập nhật <strong>ca {shiftName}</strong> cho nhân viên <strong>{employee?.hoTen}</strong>
                  vào ngày <strong>{editingCell.day}/{selectedMonth}/{selectedYear}</strong>.
                </small>
              </div>

              {/* *** THÊM MỚI: Hiển thị thông tin hiện tại của cả 2 ca *** */}
              <div className="card bg-light">
                <div className="card-body p-3">
                  <h6 className="card-title mb-2">
                    <i className="ri-information-line me-1"></i>
                    Thông tin chấm công hiện tại:
                  </h6>
                  <div className="row">
                    <div className="col-6">
                      <small className="text-muted">Ca Sáng:</small>
                      <div className="fw-semibold">
                        {chamCongData[employee?.id]?.[1]?.[editingCell.day] || '-'}
                      </div>
                    </div>
                    <div className="col-6">
                      <small className="text-muted">Ca Chiều:</small>
                      <div className="fw-semibold">
                        {chamCongData[employee?.id]?.[2]?.[editingCell.day] || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleModalClose}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSymbolUpdate}
                disabled={
                  !editCaLamViec || // Luôn cần ca làm việc
                  (editStatus === 'NGHỈ' && !editSymbol) // Chỉ cần ký hiệu khi NGHỈ
                }
              >
                <i className="ri-save-line me-1"></i>
                Cập nhật ca {shiftName}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };


  const handleSymbolUpdate = async () => {
    if (!editingCell) return;

    try {
      const { employeeId, day } = editingCell;
      const targetShift = editShift;

      console.log('🔄 handleSymbolUpdate called with:', {
        employeeId,
        day,
        targetShift,
        editStatus,
        editSymbol,
        editCaLamViec
      });

      // *** FIXED: Xử lý riêng cho trạng thái LÀM và NGHỈ ***
      if (editStatus === 'LÀM') {
        // *** TRẠNG THÁI LÀM: Không cần ký hiệu, sử dụng API update-full ***
        await updateFullAttendanceRecord(employeeId, day, targetShift);

        // Update state local với ký hiệu từ ca làm việc
        const selectedCaLamViec = caLamViecs.find(ca => ca.id.toString() === editCaLamViec);
        const newSymbol = selectedCaLamViec?.kyHieuChamCong?.maKyHieu || 'X';

        setChamCongData(prevData => {
          const newData = { ...prevData };
          if (!newData[employeeId]) {
            newData[employeeId] = { 1: {}, 2: {} };
          }
          newData[employeeId][targetShift][day] = newSymbol;
          return newData;
        });

      } else if (editStatus === 'NGHỈ') {
        // *** TRẠNG THÁI NGHỈ: Cần ký hiệu, có thể dùng API update-symbol hoặc update-full ***
        if (editSymbol === '-') {
          // Xóa bản ghi
          const symbolPayload = {
            nhanVienId: employeeId,
            day: day,
            shift: targetShift,
            month: selectedMonth,
            year: selectedYear,
            newSymbol: '-'
          };
          await axiosInstance.put('/chamcong/update-symbol', symbolPayload);
        } else {
          // Cập nhật trạng thái NGHỈ với ký hiệu
          await updateFullAttendanceRecord(employeeId, day, targetShift);
        }

        // Update state local
        setChamCongData(prevData => {
          const newData = { ...prevData };
          if (!newData[employeeId]) {
            newData[employeeId] = { 1: {}, 2: {} };
          }

          if (editSymbol === '-') {
            delete newData[employeeId][targetShift][day];
          } else {
            newData[employeeId][targetShift][day] = editSymbol;
          }

          return newData;
        });
      }

      // Đóng modal và reset
      handleModalClose();
      toast.success(`Cập nhật ca ${targetShift === 1 ? 'sáng' : 'chiều'} thành công!`);

      // Tự động làm mới
      setTimeout(() => {
        fetchData(false);
      }, 500);

    } catch (error) {
      console.error('❌ Lỗi khi cập nhật chấm công:', error);

      // *** XFIX: Xử lý lỗi chi tiết hơn ***
      let errorMessage = 'Lỗi khi cập nhật chấm công';

      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message.includes('unique result')) {
        errorMessage = 'Có nhiều bản ghi chấm công cho ngày này. Vui lòng liên hệ quản trị viên để xử lý.';
      } else {
        errorMessage = error.message;
      }

      toast.error(`Lỗi: ${errorMessage}`);
    }
  };

  // Hàm xác định trạng thái từ ký hiệu
  const getStatusFromSymbol = (symbol) => {
    const workSymbols = ['X', 'VT', 'RT', 'S', 'C', 'T', 'T12', 'T16', 'CT'];
    return workSymbols.includes(symbol) ? 'LÀM' : 'NGHỈ';
  };

  // Hàm cập nhật đầy đủ bản ghi chấm công
  const updateFullAttendanceRecord = async (employeeId, day, shift) => {
    try {
      // Bước 1: Tìm bản ghi chấm công hiện có
      const attendanceRecord = await findAttendanceRecord(employeeId, day, shift);

      if (!attendanceRecord) {
        throw new Error('Không tìm thấy bản ghi chấm công để cập nhật');
      }

      console.log('🔍 Found attendance record:', {
        id: attendanceRecord.id,
        currentStatus: attendanceRecord.trangThaiChamCong?.tenTrangThai,
        currentSymbol: attendanceRecord.kyHieuChamCong?.maKyHieu,
        currentCaLamViec: attendanceRecord.caLamViec?.id
      });

      // *** BƯỚC 2: Tạo payload tương ứng với trạng thái mới ***
      const updatePayload = {
        trangThai: editStatus,
        caLamViecId: parseInt(editCaLamViec)
      };

      // *** CHỈ THÊM KÝ HIỆU VÀ GHI CHÚ KHI TRẠNG THÁI LÀ NGHỈ ***
      if (editStatus === 'NGHỈ') {
        updatePayload.maKyHieuChamCong = editSymbol;
        updatePayload.ghiChu = editGhiChu;
      }
      // *** KHI TRẠNG THÁI LÀM: Không gửi maKyHieuChamCong và ghiChu ***

      console.log('📤 Update payload:', updatePayload);

      // Bước 3: Cập nhật qua API /{id}/trangthai
      const response = await axiosInstance.put(`/chamcong/${attendanceRecord.id}/trangthai`, updatePayload);

      console.log('✅ Update successful:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ Error in updateFullAttendanceRecord:', error);
      throw error;
    }
  };

  // Hàm tìm bản ghi chấm công cụ thể
  const findAttendanceRecord = async (employeeId, day, shift) => {
    try {
      // Gọi API để lấy lịch sử chấm công của ngày cụ thể
      const dateStr = `${String(day).padStart(2, '0')}-${String(selectedMonth).padStart(2, '0')}-${selectedYear}`;

      const response = await axiosInstance.get('/chamcong/chitiet-homnay', {
        params: {
          nhanVienId: employeeId,
          filterDate: dateStr
        }
      });

      const records = response.data;

      // Sắp xếp theo thời gian và lấy bản ghi theo shift
      records.sort((a, b) => new Date(a.thoiGianCheckIn) - new Date(b.thoiGianCheckIn));

      if (shift === 1 && records.length >= 1) {
        return records[0]; // Ca sáng - bản ghi đầu tiên
      } else if (shift === 2 && records.length >= 2) {
        return records[1]; // Ca chiều - bản ghi thứ hai
      }

      return null;
    } catch (error) {
      console.error('Lỗi khi tìm bản ghi chấm công:', error);
      return null;
    }
  };

  const handleModalClose = () => {
    setShowEditModal(false);
    setEditingCell(null);
    setEditSymbol('');
    setEditStatus('LÀM');
    setEditCaLamViec('');
    setEditGhiChu('');
    setEditShift(1); // *** THÊM MỚI: Reset shift ***
  };



  const getKyHieuDescription = (maKyHieu, kyHieuChamCongs) => {
    // Các ký hiệu làm việc có mô tả mặc định
    const workSymbolDescriptions = {
      'X': 'Làm việc bình thường',
      'VT': 'Làm việc vượt thời gian',
      'RT': 'Làm việc nghỉ thường',
      'S': 'Làm việc sáng',
      'C': 'Làm việc chiều',
      'T': 'Làm việc tối',
      'T12': 'Làm việc 12 tiếng',
      'T16': 'Làm việc 16 tiếng',
      'CT': 'Làm việc ca tối'
    };

    if (workSymbolDescriptions[maKyHieu]) {
      return workSymbolDescriptions[maKyHieu];
    }

    const kyHieu = kyHieuChamCongs.find(kh => kh.maKyHieu === maKyHieu);
    return kyHieu ? kyHieu.tenKyHieu : maKyHieu || 'Không xác định';
  };

  // Tính toán thống kê
  const calculateStatistics = useCallback(() => {
    const stats = {
      totalEmployees: nhanViens.length,
      employeesWithData: Object.keys(chamCongData).length,
      totalWorkDays: 0,
      totalAbsentDays: 0,
      attendanceRate: 0,
    };

    let workDayCount = 0;
    let absentDayCount = 0;

    Object.values(chamCongData).forEach(employeeData => {
      // Handle both shifts
      [1, 2].forEach(shift => {
        if (employeeData[shift]) {
          Object.values(employeeData[shift]).forEach(dayStatus => {
            if (['X', 'VT', 'RT', 'S', 'C', 'T', 'T12', 'T16', 'CT'].includes(dayStatus)) {
              workDayCount++;
            } else if (dayStatus !== '-') {
              absentDayCount++;
            }
          });
        }
      });
    });

    stats.totalWorkDays = workDayCount;
    stats.totalAbsentDays = absentDayCount;
    stats.attendanceRate =
      workDayCount + absentDayCount > 0
        ? ((workDayCount / (workDayCount + absentDayCount)) * 100).toFixed(1)
        : 0;

    setStatistics(stats);
  }, [nhanViens, chamCongData]);

  // Kiểm tra ngày cuối tuần
  const isWeekend = (day) => {
    const date = new Date(selectedYear, selectedMonth - 1, day);
    return date.getDay() === 0 || date.getDay() === 6; // Chủ nhật = 0, Thứ 7 = 6
  };

  // *** SỬA CUỐI CÙNG CHO HÀM calculateSummaryData ***


  const calculateSummaryData = useCallback(() => {
    const summary = filteredEmployees.map(nv => {
      const employeeData = chamCongData[nv.id] || { 1: {}, 2: {} };

      // Validate employeeData structure
      if (!employeeData[1]) employeeData[1] = {};
      if (!employeeData[2]) employeeData[2] = {};

      let workDaysA = 0; // Số ngày làm việc (A) - mỗi ca = 0.5
      let weekendDaysB = 0; // Những ngày nghỉ không làm việc (B) - ký hiệu "N1"
      let phepDaysC = 0; // Phép (C) - PN, PC, PT
      let bhxhDaysD = 0; // BHXH (D) - TẤT CẢ ký hiệu BHXH: Bo, Co, Ts, Ds, KH, NT
      let hocHoiDaysE = 0; // Học, Hội nghị (E) - H, Hn, Hct
      let khacDaysF = 0; // Khác (F) - các loại còn lại
      let absentNotes = [];

      // Duyệt qua từng ngày trong tháng
      for (let day = 1; day <= daysInMonth; day++) {
        const shift1Symbol = employeeData[1][day] || '-';
        const shift2Symbol = employeeData[2][day] || '-';

        // A. Số ngày làm việc (mỗi ca = 0.5, 1 ngày = 1.0)
        // *** FIX: THÊM "NB" VÀO DANH SÁCH LÀM VIỆC ***
        // Các ký hiệu làm việc: X, VT, RT, S, C, T, T12, T16, CT, NB
        if (['X', 'VT', 'RT', 'S', 'C', 'T', 'T12', 'T16', 'CT', 'NB'].includes(shift1Symbol)) {
          workDaysA += 0.5;
        }
        if (['X', 'VT', 'RT', 'S', 'C', 'T', 'T12', 'T16', 'CT', 'NB'].includes(shift2Symbol)) {
          workDaysA += 0.5;
        }

        // B. Những ngày nghỉ không làm việc - ký hiệu "N1"
        if (shift1Symbol === 'N1') {
          weekendDaysB += 0.5;
          absentNotes.push(`Nghỉ không làm việc: ${day} (ca sáng)`);
        }
        if (shift2Symbol === 'N1') {
          weekendDaysB += 0.5;
          absentNotes.push(`Nghỉ không làm việc: ${day} (ca chiều)`);
        }

        // C. Phép (PN, PC, PT)
        if (['PN', 'PC', 'PT'].includes(shift1Symbol)) {
          phepDaysC += 0.5;
          absentNotes.push(`Phép: ${day} (ca sáng)`);
        }
        if (['PN', 'PC', 'PT'].includes(shift2Symbol)) {
          phepDaysC += 0.5;
          absentNotes.push(`Phép: ${day} (ca chiều)`);
        }

        // D. BHXH (TẤT CẢ các ký hiệu BHXH: Bo, Co, Ts, Ds, KH, NT)
        if (['Bo', 'Co', 'Ts', 'Ds', 'KH', 'NT'].includes(shift1Symbol)) {
          bhxhDaysD += 0.5;
          absentNotes.push(`BHXH (${shift1Symbol}): ${day} (ca sáng)`);
        }
        if (['Bo', 'Co', 'Ts', 'Ds', 'KH', 'NT'].includes(shift2Symbol)) {
          bhxhDaysD += 0.5;
          absentNotes.push(`BHXH (${shift2Symbol}): ${day} (ca chiều)`);
        }

        // E. Học, Hội nghị (H, Hn, Hct)
        if (['H', 'Hn', 'Hct'].includes(shift1Symbol)) {
          hocHoiDaysE += 0.5;
          absentNotes.push(`Học/Hội: ${day} (ca sáng)`);
        }
        if (['H', 'Hn', 'Hct'].includes(shift2Symbol)) {
          hocHoiDaysE += 0.5;
          absentNotes.push(`Học/Hội: ${day} (ca chiều)`);
        }

        // F. Khác (các loại còn lại: DL, N, No, K)
        // *** FIX: XÓA "NB" KHỎI DANH SÁCH NÀY ***
        if (['DL', 'N', 'No', 'K'].includes(shift1Symbol)) {
          khacDaysF += 0.5;
          absentNotes.push(`Khác (${shift1Symbol}): ${day} (ca sáng)`);
        }
        if (['DL', 'N', 'No', 'K'].includes(shift2Symbol)) {
          khacDaysF += 0.5;
          absentNotes.push(`Khác (${shift2Symbol}): ${day} (ca chiều)`);
        }
      }

      // *** Tính toán theo yêu cầu ***
      // Tổng số ngày làm (A+B) = A + B + C (bao gồm cả phép)
      const tongSoNgayLamAB = workDaysA + weekendDaysB; // CHỈ A + B

      // Tổng số ngày nghỉ (C+D+E+F) = tất cả các loại nghỉ
      const tongSoNgayNghiCDEF = phepDaysC + bhxhDaysD + hocHoiDaysE + khacDaysF; // C + D + E + F

      // Tổng cộng = A + B + C + D + E + F (tất cả các ngày có lý do)
      const tongCong = workDaysA + weekendDaysB + phepDaysC + bhxhDaysD + hocHoiDaysE + khacDaysF;

      // Tạo ghi chú đơn giản
      const noteArray = [];

      if (weekendDaysB > 0) {
        noteArray.push(`- Ngày nghỉ không làm việc: ${weekendDaysB.toFixed(1)}`);
      }

      if (phepDaysC > 0) {
        noteArray.push(`- Phép năm: ${phepDaysC.toFixed(1)}`);
      }

      if (bhxhDaysD > 0) {
        noteArray.push(`- BHXH: ${bhxhDaysD.toFixed(1)}`);
      }

      if (hocHoiDaysE > 0) {
        noteArray.push(`- Học/Hội: ${hocHoiDaysE.toFixed(1)}`);
      }

      if (khacDaysF > 0) {
        noteArray.push(`- Khác: ${khacDaysF.toFixed(1)}`);
      }

      const note = noteArray.join('\n');

      return {
        ...nv,
        workDaysA: workDaysA.toFixed(1),
        weekendDaysB: weekendDaysB.toFixed(1),
        phepDaysC: phepDaysC.toFixed(1),
        bhxhDaysD: bhxhDaysD.toFixed(1),
        hocHoiDaysE: hocHoiDaysE.toFixed(1),
        khacDaysF: khacDaysF.toFixed(1),
        tongSoNgayLamAB: tongSoNgayLamAB.toFixed(1),
        tongSoNgayNghiCDEF: tongSoNgayNghiCDEF.toFixed(1),
        tongCong: tongCong.toFixed(1),
        note
      };
    });

    return summary;
  }, [filteredEmployees, chamCongData, daysInMonth]);

  // *** DEBUGGING: Log để kiểm tra logic đã fix ***
  console.log('🎯 FINAL BHXH CALCULATION FIXED:', {
    note: 'All BHXH symbols now properly categorized',
    logic: {
      A: 'Work days (X, VT, RT, S, C, T, T12, T16, CT) - 0.5 per shift',
      B: 'Non-working rest days (N1) - 0.5 per shift',
      C: 'Leave days (PN, PC, PT) - 0.5 per shift',
      D: '✅ BHXH (Bo, Co, Ts, Ds, KH, NT) - 0.5 per shift', // ✅ FIXED
      E: 'Training/Meeting (H, Hn, Hct) - 0.5 per shift',
      F: '✅ Others (DL, NB, N, No, K) - 0.5 per shift', // ✅ FIXED
      'Tổng số ngày làm (A+B)': 'A + B + C (includes authorized leave)',
      'Tổng số ngày nghỉ (C+D+E+F)': 'C + D + E + F (all types of leave)',
      'Tổng cộng': 'A + B + C + D + E + F (ALL justified attendance)'
    },
    bhxhSymbols: ['Bo', 'Co', 'Ts', 'Ds', 'KH', 'NT'],
    otherSymbols: ['DL', 'NB', 'N', 'No', 'K']
  });

  // DEBUGGING: Log để kiểm tra
  console.log('Summary calculation updated:', {
    note: 'Cột B now calculates N1 symbols instead of weekend days',
    logic: {
      A: 'Work days (X, VT, RT, S, C, T, T12, T16, CT) - 0.5 per shift',
      B: 'Non-working rest days (N1) - 0.5 per shift',
      C: 'Leave days (PN, PC, PT) - 0.5 per shift',
      D: 'BHXH sick leave (Bo) - 0.5 per shift',
      E: 'Training/Meeting (H, Hn, Hct) - 0.5 per shift',
      F: 'Others (DL, NB, Co, Ts, Ds, KH, NT, N, No) - 0.5 per shift'
    }
  });

  // Lấy danh sách khoa phòng
  const fetchKhoaPhongs = useCallback(async () => {
    if (userRole === 'ADMIN' || userRole === 'NGUOITONGHOP') {
      try {
        const khoaPhongResponse = await axiosInstance.get('/khoa-phong');
        setKhoaPhongs(khoaPhongResponse.data);
      } catch (error) {
        toast.error(`Lỗi khi tải danh sách khoa phòng: ${error.response?.data?.error || error.message}`);
      }
    }
    // THÊM ĐOẠN NÀY CHO NGUOITONGHOP_1KP
    else if (userRole === 'NGUOITONGHOP_1KP') {
      try {
        const khoaPhongResponse = await axiosInstance.get('/khoa-phong');
        const userKhoaPhong = khoaPhongResponse.data.find(kp => kp.id === Number(userKhoaPhongId));
        if (userKhoaPhong) {
          setKhoaPhongs([userKhoaPhong]); // Chỉ set khoa phòng của user này
        }
      } catch (error) {
        toast.error(`Lỗi khi tải thông tin khoa phòng: ${error.response?.data?.error || error.message}`);
      }
    }
  }, [userRole, userKhoaPhongId]);

  // Lấy danh sách nhân viên, dữ liệu chấm công và ký hiệu chấm công
  // *** THAY THẾ HÀM fetchData TRONG QuanLyBangChamCong.js ***

  const fetchData = useCallback(async (showNoDataToast = true) => {
    // FIXED: Logic xác định khoaPhongId để sử dụng
    let khoaPhongIdToUse = null;

    if (userRole === 'NGUOITONGHOP_1KP') {
      // NGUOITONGHOP_1KP: Luôn dùng khoa phòng của mình, không cho chọn khác
      khoaPhongIdToUse = Number(userKhoaPhongId);
    } else if (userRole === 'NGUOITONGHOP' || userRole === 'ADMIN') {
      // NGUOITONGHOP và ADMIN: Có thể chọn khoa phòng cụ thể hoặc "Tất cả"
      if (selectedKhoaPhongId) {
        khoaPhongIdToUse = selectedKhoaPhongId; // Đã chọn khoa phòng cụ thể
      } else {
        khoaPhongIdToUse = null; // Chọn "Tất cả khoa phòng"
      }
    } else {
      // Các role khác (NGUOICHAMCONG): Dùng khoa phòng của mình
      khoaPhongIdToUse = Number(userKhoaPhongId);
    }

    console.log('🔍 fetchData Logic:', {
      userRole,
      userKhoaPhongId,
      selectedKhoaPhongId,
      khoaPhongIdToUse,
      explanation: userRole === 'NGUOITONGHOP_1KP'
        ? 'NGUOITONGHOP_1KP - Khóa cứng khoa phòng'
        : userRole === 'NGUOITONGHOP' || userRole === 'ADMIN'
          ? selectedKhoaPhongId ? 'ADMIN/NGUOITONGHOP - Chọn khoa phòng cụ thể' : 'ADMIN/NGUOITONGHOP - Tất cả khoa phòng'
          : 'Role khác - Dùng khoa phòng của user'
    });

    // Kiểm tra điều kiện dừng
    if (!khoaPhongIdToUse && userRole !== 'ADMIN' && userRole !== 'NGUOITONGHOP') {
      toast.error('Không tìm thấy khoa phòng, vui lòng đăng nhập lại!');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Load nhân viên
      const nhanVienParams = {
        page: 0,
        size: 100
      };
      if (khoaPhongIdToUse) {
        nhanVienParams.khoaPhongId = khoaPhongIdToUse;
      }
      // Nếu khoaPhongIdToUse là null (ADMIN/NGUOITONGHOP chọn "Tất cả"), không truyền khoaPhongId

      const nhanVienResponse = await axiosInstance.get('/nhanvien', {
        params: nhanVienParams,
      });

      const nhanVienData = nhanVienResponse.data.content || [];
      setNhanViens(nhanVienData);
      setFilteredEmployees(nhanVienData);

      console.log('👥 Loaded employees:', {
        total: nhanVienData.length,
        khoaPhongIdFilter: khoaPhongIdToUse,
        sampleEmployees: nhanVienData.slice(0, 3).map(nv => ({
          id: nv.id,
          maNV: nv.maNV,
          hoTen: nv.hoTen,
          khoaPhong: nv.khoaPhong?.tenKhoaPhong
        }))
      });

      if (nhanVienData.length === 0 && showNoDataToast) {
        toast.warn('Không có nhân viên nào trong khoa phòng này.');
        setLoading(false);
        return;
      }

      // *** FIX: LOAD TẤT CẢ DỮ LIỆU CHẤM CÔNG ***
      console.log('🔄 Loading attendance data for:', {
        year: selectedYear,
        month: selectedMonth,
        khoaPhongId: khoaPhongIdToUse
      });

      // STEP 1: Load page đầu tiên để biết tổng số records
      const chamCongParams = {
        year: selectedYear,
        month: selectedMonth,
        page: 0,
        size: 100, // Tăng size để giảm số page cần load
      };

      if (khoaPhongIdToUse) {
        chamCongParams.khoaPhongId = khoaPhongIdToUse;
      }

      console.log('📊 Chamcong API params:', chamCongParams);

      const firstPageResponse = await axiosInstance.get('/chamcong/lichsu', {
        params: chamCongParams,
      });

      console.log('📊 First Page Response:', {
        totalElements: firstPageResponse.data.totalElements,
        totalPages: firstPageResponse.data.totalPages,
        currentPageSize: firstPageResponse.data.size,
        recordsInFirstPage: firstPageResponse.data.content?.length || 0
      });

      // STEP 2: Tính toán và load tất cả pages
      let allRecords = firstPageResponse.data.content || [];
      const totalPages = firstPageResponse.data.totalPages || 1;
      const totalElements = firstPageResponse.data.totalElements || 0;

      console.log(`📄 Total pages to load: ${totalPages} (${totalElements} total records)`);

      // Load remaining pages nếu có
      if (totalPages > 1) {
        const pageLoadPromises = [];

        for (let page = 1; page < totalPages; page++) {
          const pageParams = { ...chamCongParams, page: page };
          pageLoadPromises.push(
            axiosInstance.get('/chamcong/lichsu', {
              params: pageParams,
            })
          );
        }

        // Load tất cả pages parallel
        try {
          const allPagesResponses = await Promise.all(pageLoadPromises);

          allPagesResponses.forEach((response, index) => {
            const pageRecords = response.data.content || [];
            allRecords = [...allRecords, ...pageRecords];
            console.log(`📑 Loaded page ${index + 2}/${totalPages}: ${pageRecords.length} records`);
          });
        } catch (error) {
          console.error('Error loading some pages:', error);
          toast.warning('Một số trang dữ liệu không thể tải được, kết quả có thể không đầy đủ');
        }
      }

      console.log(`✅ FINAL: Loaded ${allRecords.length}/${totalElements} records`);

      if (allRecords.length < totalElements) {
        toast.warning(`Chỉ tải được ${allRecords.length}/${totalElements} bản ghi. Dữ liệu có thể không đầy đủ.`);
      }

      const chamCongMap = {};

      // *** XỬ LÝ DỮ LIỆU GIỐNG NHU TRƯỚC ***
      if (allRecords && Array.isArray(allRecords)) {
        console.log('🔄 Processing attendance records...');

        // Nhóm theo nhân viên ID trước
        const groupedByEmployee = {};

        allRecords.forEach((record, recordIndex) => {
          try {
            if (!record.nhanVien || !record.nhanVien.id || record.nhanVien.trangThai !== 1) {
              return;
            }

            const employeeId = record.nhanVien.id;

            if (!groupedByEmployee[employeeId]) {
              groupedByEmployee[employeeId] = [];
            }

            groupedByEmployee[employeeId].push(record);
          } catch (error) {
            console.error(`Error processing record ${recordIndex}:`, error, record);
          }
        });

        console.log(`👥 Grouped records for ${Object.keys(groupedByEmployee).length} employees`);

        // Xử lý từng nhân viên
        Object.keys(groupedByEmployee).forEach((employeeId) => {
          const employeeIdNum = parseInt(employeeId);
          const employeeRecords = groupedByEmployee[employeeId];

          // Khởi tạo structure
          chamCongMap[employeeIdNum] = { 1: {}, 2: {} };

          // Nhóm theo ngày
          const groupedByDay = {};

          employeeRecords.forEach((record) => {
            const thoiGianCheckIn = record.thoiGianCheckIn;
            if (!thoiGianCheckIn) return;

            const [datePart] = thoiGianCheckIn.split(' ');
            if (!datePart) return;

            const [dayStr, monthStr, yearStr] = datePart.split('-');
            const day = parseInt(dayStr, 10);
            const recordMonth = parseInt(monthStr, 10);
            const recordYear = parseInt(yearStr, 10);

            // Kiểm tra tháng/năm đúng
            if (recordMonth !== selectedMonth || recordYear !== selectedYear) {
              return;
            }

            // Kiểm tra ngày hợp lệ
            if (day < 1 || day > daysInMonth) {
              return;
            }

            if (!groupedByDay[day]) {
              groupedByDay[day] = [];
            }

            groupedByDay[day].push(record);
          });

          // Xử lý từng ngày
          Object.keys(groupedByDay).forEach((dayStr) => {
            const day = parseInt(dayStr);
            const dayRecords = groupedByDay[day];

            // *** SORT THEO THỜI GIAN (cũ nhất đầu tiên) ***
            dayRecords.sort((a, b) => {
              const timeA = a.thoiGianCheckIn || '';
              const timeB = b.thoiGianCheckIn || '';
              return timeA.localeCompare(timeB);
            });

            // *** GÁN SHIFT TUẦN TỰ ***
            dayRecords.forEach((record, index) => {
              if (index < 2) { // Chỉ lấy 2 bản ghi đầu tiên
                const shift = index + 1; // index 0 -> shift 1, index 1 -> shift 2

                // Xác định ký hiệu
                let symbol = '-';
                if (record.trangThaiChamCong?.id === 2 && record.kyHieuChamCong?.maKyHieu) {
                  // NGHỈ - dùng ký hiệu từ kyHieuChamCong
                  symbol = record.kyHieuChamCong.maKyHieu;
                } else if (record.trangThaiChamCong?.id === 1 && record.caLamViec?.kyHieuChamCong?.maKyHieu) {
                  // LÀM - dùng ký hiệu từ ca làm việc
                  symbol = record.caLamViec.kyHieuChamCong.maKyHieu;
                } else if (record.trangThaiChamCong?.id === 1) {
                  // Fallback cho trạng thái LÀM
                  symbol = 'X';
                }

                chamCongMap[employeeIdNum][shift][day] = symbol;
              }
            });
          });
        });
      }

      // *** LỌC CHỈ CÁC NHÂN VIÊN ĐANG ACTIVE ***
      const filteredChamCongData = {};
      Object.keys(chamCongMap).forEach((employeeId) => {
        const employeeIdNum = parseInt(employeeId);
        if (nhanVienData.some(nv => nv.id === employeeIdNum)) {
          filteredChamCongData[employeeId] = chamCongMap[employeeId];
        }
      });

      setChamCongData(filteredChamCongData);

      // *** ENHANCED LOGGING ***
      console.log('🎯 FINAL PROCESSING RESULTS:', {
        totalRawRecords: allRecords.length,
        expectedRecords: totalElements,
        employeesInSystem: nhanVienData.length,
        employeesWithData: Object.keys(filteredChamCongData).length,
        month: selectedMonth,
        year: selectedYear,
        daysInMonth: daysInMonth,
        dataCompletenessPercentage: Math.round((allRecords.length / Math.max(totalElements, 1)) * 100),
        sampleEmployeeData: Object.keys(filteredChamCongData).slice(0, 3).reduce((sample, empId) => {
          const empData = filteredChamCongData[empId];
          const employee = nhanVienData.find(nv => nv.id === parseInt(empId));
          const shift1Days = Object.keys(empData[1] || {}).length;
          const shift2Days = Object.keys(empData[2] || {}).length;

          sample[empId] = {
            name: employee?.hoTen || 'Unknown',
            maNV: employee?.maNV || 'N/A',
            shift1Days,
            shift2Days,
            totalDays: shift1Days + shift2Days,
            maxPossibleDays: daysInMonth * 2,
            completeness: `${Math.round(((shift1Days + shift2Days) / (daysInMonth * 2)) * 100)}%`,
            shift1Sample: Object.entries(empData[1] || {}).slice(0, 5),
            shift2Sample: Object.entries(empData[2] || {}).slice(0, 5)
          };
          return sample;
        }, {})
      });

      // Hiển thị thông báo nếu cần
      if (showNoDataToast && Object.keys(filteredChamCongData).length === 0 && nhanVienData.length > 0) {
        toast.warn('Không có dữ liệu chấm công cho tháng này.');
      } else if (Object.keys(filteredChamCongData).length > 0) {
        const avgCompleteness = Object.values(filteredChamCongData).reduce((acc, empData) => {
          const totalDays = Object.keys(empData[1] || {}).length + Object.keys(empData[2] || {}).length;
          return acc + (totalDays / (daysInMonth * 2));
        }, 0) / Object.keys(filteredChamCongData).length * 100;

        console.log(`📈 Average data completeness: ${avgCompleteness.toFixed(1)}%`);

        // Chỉ hiển thị thông báo completion 1 lần duy nhất
        if (avgCompleteness < 100 && !hasShownCompletionToast && showNoDataToast) {
          toast.warning(`Dữ liệu chấm công chưa đầy đủ (${avgCompleteness.toFixed(1)}% hoàn thành)`);
          setHasShownCompletionToast(true);
        }
      }

      // Load ký hiệu nếu chưa có
      if (kyHieuChamCongs.length === 0) {
        try {
          const kyHieuResponse = await axiosInstance.get('/ky-hieu-cham-cong');
          const activeKyHieuChamCongs = kyHieuResponse.data.filter(kyHieu => kyHieu.trangThai);
          setKyHieuChamCongs(activeKyHieuChamCongs);
        } catch (error) {
          console.error('Error loading attendance symbols:', error);
        }
      }

    } catch (error) {
      toast.error(`Lỗi khi tải dữ liệu: ${error.response?.data?.error || error.message || 'Kiểm tra API'}`);
      console.error('❌ Error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  }, [userKhoaPhongId, userRole, selectedKhoaPhongId, selectedMonth, selectedYear, daysInMonth, kyHieuChamCongs.length]);

  // *** THÊM FUNCTION ĐỂ VERIFY API RESPONSE ***
  window.verifyApiData = async () => {
    try {
      const response = await axiosInstance.get('/chamcong/lichsu', {
        params: {
          year: selectedYear,
          month: selectedMonth,
          khoaPhongId: selectedKhoaPhongId || userKhoaPhongId,
          page: 0,
          size: 10
        }
      });

      console.group('🔍 API Verification');
      console.log('API URL:', response.config.url);
      console.log('Parameters:', response.config.params);
      console.log('Total Elements:', response.data.totalElements);
      console.log('Total Pages:', response.data.totalPages);
      console.log('Current Page:', response.data.number);
      console.log('Page Size:', response.data.size);
      console.log('Records in this page:', response.data.content?.length);
      console.log('First record sample:', response.data.content?.[0]);
      console.groupEnd();

      return response.data;
    } catch (error) {
      console.error('API verification failed:', error);
    }
  };

  // *** THÊM HELPER FUNCTION ĐỂ TEST DỮ LIỆU CỤ THỂ ***
  const testSpecificEmployee = (maNV) => {
    const employee = filteredEmployees.find(nv => nv.maNV === maNV);
    if (!employee) {
      console.error(`❌ Không tìm thấy nhân viên ${maNV}`);
      return;
    }

    const employeeData = chamCongData[employee.id];

    console.group(`🔍 Test nhân viên ${maNV} - ${employee.hoTen}`);
    console.log('Employee ID:', employee.id);
    console.log('Has data:', !!employeeData);

    if (employeeData) {
      console.log('Shift 1 data:', employeeData[1]);
      console.log('Shift 2 data:', employeeData[2]);
      console.log('Shift 1 days count:', Object.keys(employeeData[1] || {}).length);
      console.log('Shift 2 days count:', Object.keys(employeeData[2] || {}).length);
    }

    console.groupEnd();
  };

  // *** EXPOSE TEST FUNCTION TO WINDOW ***
  window.testEmployee = testSpecificEmployee;

  // *** THÊM AUTO-TEST CHO TC001 ***
  useEffect(() => {
    if (Object.keys(chamCongData).length > 0 && process.env.NODE_ENV === 'development') {
      // Auto test TC001 when data loads
      setTimeout(() => {
        testSpecificEmployee('TC001');
      }, 1000);
    }
  }, [chamCongData, filteredEmployees]);

  // Khởi tạo dữ liệu ban đầu
  useEffect(() => {
    const initializeData = async () => {
      if (!isInitialized) {
        await fetchKhoaPhongs();
        await fetchData(false);
        setIsInitialized(true);
      }
    };

    initializeData();
  }, [isInitialized, fetchKhoaPhongs, fetchData]);

  // Tải dữ liệu khi thay đổi khoa phòng, tháng hoặc năm
  useEffect(() => {
    if (isInitialized) {
      setHasShownCompletionToast(false); // Reset toast state
      fetchData(true);
    }
  }, [selectedKhoaPhongId, selectedMonth, selectedYear, fetchData, isInitialized]);

  // Tính toán thống kê khi dữ liệu thay đổi
  useEffect(() => {
    calculateStatistics();
  }, [calculateStatistics]);

  // Tìm kiếm nhân viên
  useEffect(() => {
    const filtered = nhanViens.filter(
      nv =>
        nv.hoTen?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nv.maNV?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEmployees(filtered);
  }, [searchTerm, nhanViens]);


  // *** CSS STYLES CHO HOVER EFFECT ***
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .attendance-cell-editable:hover {
        box-shadow: inset 0 0 0 2px #007bff !important;
        transform: scale(1.05);
        transition: all 0.1s ease;
        z-index: 10;
        position: relative;
      }
      
      .attendance-cell-editable:hover .edit-indicator {
        opacity: 1 !important;
        transform: scale(1.2);
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Thêm vào hàm fetchData hoặc tạo useEffect riêng
  useEffect(() => {
    const fetchCaLamViecs = async () => {
      try {
        const caLamViecResponse = await axiosInstance.get('/ca-lam-viec');
        setCaLamViecs(caLamViecResponse.data);
      } catch (error) {
        console.error('Error loading ca lam viec:', error);
      }
    };

    fetchCaLamViecs();
  }, []);

  // Hàm để lấy màu sắc cho ký hiệu
  const getCellStyle = (symbol) => {
    const colorMap = {
      'X': { bg: '#008000', color: '#FFFFFF' },
      'N1': { bg: '#007bff', color: '#fff' },
      'VT': { bg: '#dc3545', color: '#fff' },
      'RT': { bg: '#dc3545', color: '#fff' },
      'PN': { bg: '#90EE90', color: '#000' },
      'PC': { bg: '#fff3cd', color: '#000' },
      'PT': { bg: '#fff3cd', color: '#000' },
      'S': { bg: '#ffeaa7', color: '#000' },
      'C': { bg: '#ffeaa7', color: '#000' },
      'T': { bg: '#ffeaa7', color: '#000' },
      'T12': { bg: '#ffeaa7', color: '#000' },
      'T16': { bg: '#ffeaa7', color: '#000' },
      'CT': { bg: '#dda0dd', color: '#000' },
      'No': { bg: '#6c757d', color: '#fff' },
      'N': { bg: '#6c757d', color: '#fff' },
      'Bo': { bg: '#f8d7da', color: '#000' },
      'Co': { bg: '#f8d7da', color: '#000' },
      'Ts': { bg: '#f8d7da', color: '#000' },
      'Ds': { bg: '#f8d7da', color: '#000' },
      'KH': { bg: '#f8d7da', color: '#000' },
      'NT': { bg: '#f8d7da', color: '#000' },
      'DL': { bg: '#d1ecf1', color: '#000' },
      'H': { bg: '#6610f2', color: '#fff' },
      'Hn': { bg: '#6610f2', color: '#fff' },
      'Hct': { bg: '#6610f2', color: '#fff' },
      'NB': { bg: '#cce5ff', color: '#000' },
      'K': { bg: '#fd7e14', color: '#fff' },
      '-': { bg: '#ffffff', color: '#6c757d' },
    };

    const style = colorMap[symbol] || { bg: '#f8f9fa', color: '#6c757d' };
    return {
      backgroundColor: style.bg,
      color: style.color,
      fontWeight: 'bold',
      fontSize: '12px',
      border: '1px solid #dee2e6',
    };
  };

  // Xuất file Excel
  // Xuất file Excel với ExcelJS
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const khoaPhongName = khoaPhongs.find(kp => kp.id === selectedKhoaPhongId)?.tenKhoaPhong ||
      nhanViens[0]?.khoaPhong?.tenKhoaPhong || 'TC-HCQT';

    if (showSummary) {
      // =================== XUẤT DỮ LIỆU TỔNG HỢP VỚI EXCELJS ===================
      const summaryData = calculateSummaryData();
      const worksheet = workbook.addWorksheet('Tổng Hợp Chấm Công');

      const totalCols = 5 + daysInMonth + 10; // Thêm 1 cột cho Mã NV

      // 1. HEADER THÔNG TIN BỆNH VIỆN
      worksheet.mergeCells(1, 1, 1, Math.floor(totalCols / 2));
      worksheet.getCell(1, 1).value = 'BỆNH VIỆN QUẬN TÂN PHÚ';

      worksheet.mergeCells(1, Math.floor(totalCols / 2) + 1, 1, totalCols);
      worksheet.getCell(1, Math.floor(totalCols / 2) + 1).value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';

      worksheet.mergeCells(2, 1, 2, Math.floor(totalCols / 2));
      worksheet.getCell(2, 1).value = `KHOA/PHÒNG ${khoaPhongName}`;

      worksheet.mergeCells(2, Math.floor(totalCols / 2) + 1, 2, totalCols);
      worksheet.getCell(2, Math.floor(totalCols / 2) + 1).value = 'Độc lập - Tự do - Hạnh phúc';

      // 2. TIÊU ĐỀ BẢNG
      worksheet.mergeCells(4, Math.floor(totalCols / 2) - 4, 4, Math.floor(totalCols / 2) + 6);
      worksheet.getCell(4, Math.floor(totalCols / 2) - 4).value = 'BẢNG TỔNG HỢP CHẤM CÔNG';

      worksheet.mergeCells(5, Math.floor(totalCols / 2) - 2, 5, Math.floor(totalCols / 2) + 4);
      worksheet.getCell(5, Math.floor(totalCols / 2) - 2).value = `THÁNG ${selectedMonth} NĂM ${selectedYear}`;

      // 3. HEADER CHÍNH (3 dòng)
      const headerRow = 7;

      // Merge các cột chính theo chiều dọc (3 dòng)
      worksheet.mergeCells(headerRow, 1, headerRow + 2, 1); // STT
      worksheet.getCell(headerRow, 1).value = 'STT';

      worksheet.mergeCells(headerRow, 2, headerRow + 2, 2); // Mã NV
      worksheet.getCell(headerRow, 2).value = 'Mã NV';

      worksheet.mergeCells(headerRow, 3, headerRow + 2, 3); // Họ tên
      worksheet.getCell(headerRow, 3).value = 'Họ Tên';

      worksheet.mergeCells(headerRow, 4, headerRow + 2, 4); // Ngày sinh
      worksheet.getCell(headerRow, 4).value = 'Ngày tháng năm sinh';

      worksheet.mergeCells(headerRow, 5, headerRow + 2, 5); // Khoa phòng
      worksheet.getCell(headerRow, 5).value = 'Khoa/phòng';

      // Header "NGÀY TRONG THÁNG" (chỉ merge ngang)
      worksheet.mergeCells(headerRow, 6, headerRow, 5 + daysInMonth);
      worksheet.getCell(headerRow, 6).value = 'NGÀY TRONG THÁNG';

      // Số ngày (1, 2, 3, ...)
      for (let i = 1; i <= daysInMonth; i++) {
        worksheet.getCell(headerRow + 1, 5 + i).value = i;
      }

      // Tên thứ (CN, T2, T3, ...)
      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(selectedYear, selectedMonth - 1, i);
        const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
        worksheet.getCell(headerRow + 2, 5 + i).value = dayName;
      }

      // Header tổng hợp (merge theo chiều dọc)
      // Header tổng hợp (merge theo chiều dọc) với màu sắc
      const summaryHeaders = [
        { text: 'Số ngày làm việc (A)', color: 'FFFFA500' }, // Màu cam
        { text: 'Ngày nghỉ không làm việc (B)', color: 'FFFF6B6B' }, // Màu đỏ nhạt
        { text: 'Phép (C)', color: 'FF51CF66' }, // Màu xanh lá
        { text: 'BHXH (D)', color: 'FF74C0FC' }, // Màu xanh dương nhạt
        { text: 'Học/Hội nghị/Tập huấn (E)', color: 'FFFFD43B' }, // Màu vàng
        { text: 'Khác (F)', color: 'FFE6F3FF' }, // Màu xanh nhạt
        { text: 'Tổng ngày làm (A+B)', color: 'FF69DB7C' }, // Màu xanh lá đậm
        { text: 'Tổng ngày nghỉ (C+D+E+F)', color: 'FFFF8787' }, // Màu đỏ đậm
        { text: 'Tổng cộng', color: 'FFFFD93D' }, // Màu vàng đậm
        { text: 'Ghi chú', color: 'FFE6F3FF' } // Màu xanh nhạt
      ];

      summaryHeaders.forEach((headerObj, index) => {
        const col = 6 + daysInMonth + index;
        worksheet.mergeCells(headerRow, col, headerRow + 2, col);
        const cell = worksheet.getCell(headerRow, col);
        cell.value = headerObj.text;

        // Áp dụng style với màu nền cho header tổng hợp
        cell.style = {
          font: { name: 'Times New Roman', size: 10, bold: true },
          alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: headerObj.color } },
          border: {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' }
          }
        };
      });

      // 4. DỮ LIỆU NHÂN VIÊN
      let currentRow = headerRow + 3;

      summaryData.forEach((nv, index) => {
        const employeeData = chamCongData[nv.id] || { 1: {}, 2: {} };

        // Merge thông tin nhân viên qua 2 dòng (ca 1 và ca 2)
        worksheet.mergeCells(currentRow, 1, currentRow + 1, 1); // STT
        worksheet.getCell(currentRow, 1).value = index + 1;

        worksheet.mergeCells(currentRow, 2, currentRow + 1, 2); // Mã NV
        worksheet.getCell(currentRow, 2).value = nv.maNV || 'N/A';

        worksheet.mergeCells(currentRow, 3, currentRow + 1, 3); // Họ tên
        worksheet.getCell(currentRow, 3).value = nv.hoTen || 'N/A';

        worksheet.mergeCells(currentRow, 4, currentRow + 1, 4); // Ngày sinh
        worksheet.getCell(currentRow, 4).value = nv.ngayThangNamSinh || 'N/A';

        worksheet.mergeCells(currentRow, 5, currentRow + 1, 5); // Khoa phòng
        worksheet.getCell(currentRow, 5).value = nv.khoaPhong?.tenKhoaPhong || khoaPhongName;

        // Dữ liệu ca 1 và ca 2
        for (let day = 1; day <= daysInMonth; day++) {
          const shift1Symbol = employeeData[1][day] || '-';
          const shift2Symbol = employeeData[2][day] || '-';

          worksheet.getCell(currentRow, 5 + day).value = shift1Symbol; // Ca 1
          worksheet.getCell(currentRow + 1, 5 + day).value = shift2Symbol; // Ca 2
        }

        // Merge dữ liệu tổng hợp qua 2 dòng
        // Merge dữ liệu tổng hợp qua 2 dòng với logic hiển thị "-" cho 0.0
        const summaryValues = [
          nv.workDaysA, nv.weekendDaysB, nv.phepDaysC, nv.bhxhDaysD,
          nv.hocHoiDaysE, nv.khacDaysF, nv.tongSoNgayLamAB,
          nv.tongSoNgayNghiCDEF, nv.tongCong, nv.note
        ];

        summaryValues.forEach((data, index) => {
          const col = 6 + daysInMonth + index;
          worksheet.mergeCells(currentRow, col, currentRow + 1, col);
          // Hiển thị "-" thay vì "0.0" cho các cột số (trừ cột note - index 9)
          if (index < 9) { // Các cột số
            worksheet.getCell(currentRow, col).value = data === '0.0' ? '-' : data;
          } else { // Cột note
            worksheet.getCell(currentRow, col).value = data;
          }
        });

        currentRow += 2;
      });

      // 5. STYLING VỚI EXCELJS
      const hospitalTitleStyle = {
        font: { name: 'Times New Roman', size: 12, bold: true },
        alignment: { horizontal: 'center', vertical: 'middle' }
      };

      worksheet.getCell(1, 1).style = hospitalTitleStyle;
      worksheet.getCell(1, Math.floor(totalCols / 2) + 1).style = hospitalTitleStyle;
      worksheet.getCell(2, 1).style = hospitalTitleStyle;
      worksheet.getCell(2, Math.floor(totalCols / 2) + 1).style = hospitalTitleStyle;

      const tableTitleStyle = {
        font: { name: 'Times New Roman', size: 14, bold: true },
        alignment: { horizontal: 'center', vertical: 'middle' }
      };

      worksheet.getCell(4, Math.floor(totalCols / 2) - 4).style = tableTitleStyle;
      worksheet.getCell(5, Math.floor(totalCols / 2) - 2).style = tableTitleStyle;

      const headerStyle = {
        font: { name: 'Times New Roman', size: 10, bold: true },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } },
        border: {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        }
      };

      // Áp dụng style cho tất cả header cells
      // Áp dụng style cho header cells (trừ các cột tổng hợp đã có màu riêng)
      for (let row = headerRow; row <= headerRow + 2; row++) {
        for (let col = 1; col <= totalCols; col++) {
          // Chỉ áp dụng style mặc định cho các cột không phải tổng hợp
          if (col < 6 + daysInMonth || col > 6 + daysInMonth + 9) {
            worksheet.getCell(row, col).style = headerStyle;
          }
        }
      }

      const dataStyle = {
        font: { name: 'Times New Roman', size: 9 },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        }
      };

      const nameStyle = {
        font: { name: 'Times New Roman', size: 9 },
        alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
        border: {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        }
      };

      // Áp dụng style cho dữ liệu
      const dataStartRow = headerRow + 3;
      const dataEndRow = dataStartRow + summaryData.length * 2 - 1;

      for (let row = dataStartRow; row <= dataEndRow; row++) {
        for (let col = 1; col <= totalCols; col++) {
          if (col === 3) {
            worksheet.getCell(row, col).style = nameStyle; // Cột họ tên
          } else if (col === totalCols) {
            worksheet.getCell(row, col).style = nameStyle; // Cột ghi chú
          } else {
            worksheet.getCell(row, col).style = dataStyle; // Các cột khác
          }
        }
      }

      // 6. THIẾT LẬP KÍCH THƯỚC CỘT VÀ DÒNG
      worksheet.getColumn(1).width = 5;   // STT
      worksheet.getColumn(2).width = 12;  // Mã NV
      worksheet.getColumn(3).width = 25;  // Họ tên
      worksheet.getColumn(4).width = 15;  // Ngày sinh
      worksheet.getColumn(5).width = 15;  // Khoa phòng

      // Cột ngày
      for (let i = 0; i < daysInMonth; i++) {
        worksheet.getColumn(6 + i).width = 4;
      }

      // Cột tổng hợp
      const summaryWidths = [16, 20, 8, 10, 22, 8, 16, 18, 10, 20];
      summaryWidths.forEach((width, index) => {
        worksheet.getColumn(6 + daysInMonth + index).width = width;
      });

      // Chiều cao dòng
      worksheet.getRow(headerRow).height = 30;
      worksheet.getRow(headerRow + 1).height = 20;
      worksheet.getRow(headerRow + 2).height = 20;

      for (let i = dataStartRow; i <= dataEndRow; i++) {
        worksheet.getRow(i).height = 18;
      }

      // 7. TÔ MÀU CỘT CUỐI TUẦN (THỨ 7, CHỦ NHẬT) - CHO BẢNG TỔNG HỢP
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(selectedYear, selectedMonth - 1, day);
        const dayOfWeek = date.getDay(); // 0 = Chủ nhật, 6 = Thứ 7

        if (dayOfWeek === 0 || dayOfWeek === 6) { // Cuối tuần
          const dayColumn = 5 + day; // Cột của ngày

          // Style cho header của ngày cuối tuần
          for (let row = headerRow; row <= headerRow + 2; row++) {
            const cell = worksheet.getCell(row, dayColumn);
            cell.style = {
              ...cell.style,
              fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE8F5E8' } // Màu xanh nhạt cho header cuối tuần
              }
            };
          }

          // Style cho dữ liệu của ngày cuối tuần
          for (let row = dataStartRow; row <= dataEndRow; row++) {
            const cell = worksheet.getCell(row, dayColumn);
            cell.style = {
              ...cell.style,
              fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE8F5E8' } // Màu xanh nhạt cho dữ liệu cuối tuần
              }
            };
          }
        }
      }

      // CHÚ THÍCH KÝ HIỆU
      let legendStartRow = dataEndRow + 3;

      worksheet.getCell(legendStartRow, 1).value = 'CHÚ THÍCH KÝ HIỆU:';
      worksheet.mergeCells(legendStartRow, 1, legendStartRow, totalCols);

      const legendTitleStyle = {
        font: { name: 'Times New Roman', size: 12, bold: true },
        alignment: { horizontal: 'left', vertical: 'middle' }
      };
      worksheet.getCell(legendStartRow, 1).style = legendTitleStyle;

      legendStartRow += 2;

      // Header bảng ký hiệu
      worksheet.getCell(legendStartRow, 1).value = 'Ký hiệu';
      worksheet.getCell(legendStartRow, 2).value = 'Ý nghĩa';
      worksheet.getCell(legendStartRow, 4).value = 'Ký hiệu';
      worksheet.getCell(legendStartRow, 5).value = 'Ý nghĩa';

      const legendHeaderStyle = {
        font: { name: 'Times New Roman', size: 10, bold: true },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } },
        border: {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        }
      };

      [1, 2, 4, 5].forEach(col => {
        worksheet.getCell(legendStartRow, col).style = legendHeaderStyle;
      });

      legendStartRow += 1;

      const midPoint = Math.ceil(kyHieuChamCongs.length / 2);
      const leftColumn = kyHieuChamCongs.slice(0, midPoint);
      const rightColumn = kyHieuChamCongs.slice(midPoint);

      const legendDataStyle = {
        font: { name: 'Times New Roman', size: 9 },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        }
      };

      const legendDescStyle = {
        font: { name: 'Times New Roman', size: 9 },
        alignment: { horizontal: 'left', vertical: 'middle' },
        border: {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        }
      };

      for (let i = 0; i < Math.max(leftColumn.length, rightColumn.length); i++) {
        const row = legendStartRow + i;

        if (i < leftColumn.length) {
          worksheet.getCell(row, 1).value = leftColumn[i].maKyHieu;
          worksheet.getCell(row, 2).value = leftColumn[i].tenKyHieu;
          worksheet.getCell(row, 1).style = legendDataStyle;
          worksheet.getCell(row, 2).style = legendDescStyle;
        }

        if (i < rightColumn.length) {
          worksheet.getCell(row, 4).value = rightColumn[i].maKyHieu;
          worksheet.getCell(row, 5).value = rightColumn[i].tenKyHieu;
          worksheet.getCell(row, 4).style = legendDataStyle;
          worksheet.getCell(row, 5).style = legendDescStyle;
        }
      }

      const specialRow = legendStartRow + Math.max(leftColumn.length, rightColumn.length);
      worksheet.getCell(specialRow, 1).value = '-';
      worksheet.getCell(specialRow, 2).value = 'Không có dữ liệu';
      worksheet.getCell(specialRow, 1).style = legendDataStyle;
      worksheet.getCell(specialRow, 2).style = legendDescStyle;

    } else {
      // =================== XUẤT DỮ LIỆU CHI TIẾT ===================
      const worksheet = workbook.addWorksheet('Chấm Công Chi Tiết');
      const totalDetailCols = 5 + daysInMonth; // Thêm 1 cột cho Mã NV

      // 1. HEADER THÔNG TIN BỆNH VIỆN
      worksheet.mergeCells(1, 1, 1, Math.floor(totalDetailCols / 2));
      worksheet.getCell(1, 1).value = 'BỆNH VIỆN QUẬN TÂN PHÚ';

      worksheet.mergeCells(1, Math.floor(totalDetailCols / 2) + 1, 1, totalDetailCols);
      worksheet.getCell(1, Math.floor(totalDetailCols / 2) + 1).value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';

      worksheet.mergeCells(2, 1, 2, Math.floor(totalDetailCols / 2));
      worksheet.getCell(2, 1).value = `KHOA/PHÒNG ${khoaPhongName}`;

      worksheet.mergeCells(2, Math.floor(totalDetailCols / 2) + 1, 2, totalDetailCols);
      worksheet.getCell(2, Math.floor(totalDetailCols / 2) + 1).value = 'Độc lập - Tự do - Hạnh phúc';

      // 2. TIÊU ĐỀ BẢNG
      worksheet.mergeCells(4, Math.floor(totalDetailCols / 2) - 4, 4, Math.floor(totalDetailCols / 2) + 6);
      worksheet.getCell(4, Math.floor(totalDetailCols / 2) - 4).value = 'BẢNG CHẤM CÔNG CHI TIẾT';

      worksheet.mergeCells(5, Math.floor(totalDetailCols / 2) - 2, 5, Math.floor(totalDetailCols / 2) + 4);
      worksheet.getCell(5, Math.floor(totalDetailCols / 2) - 2).value = `THÁNG ${selectedMonth} NĂM ${selectedYear}`;

      // 3. HEADER CHÍNH (3 dòng)
      const detailHeaderRow = 7;

      worksheet.mergeCells(detailHeaderRow, 1, detailHeaderRow + 2, 1); // STT
      worksheet.getCell(detailHeaderRow, 1).value = 'STT';

      worksheet.mergeCells(detailHeaderRow, 2, detailHeaderRow + 2, 2); // Mã NV
      worksheet.getCell(detailHeaderRow, 2).value = 'Mã NV';

      worksheet.mergeCells(detailHeaderRow, 3, detailHeaderRow + 2, 3); // Họ tên
      worksheet.getCell(detailHeaderRow, 3).value = 'Họ Tên';

      worksheet.mergeCells(detailHeaderRow, 4, detailHeaderRow + 2, 4); // Ngày sinh
      worksheet.getCell(detailHeaderRow, 4).value = 'Ngày tháng năm sinh';

      worksheet.mergeCells(detailHeaderRow, 5, detailHeaderRow + 2, 5); // Khoa phòng
      worksheet.getCell(detailHeaderRow, 5).value = 'Khoa/phòng';

      worksheet.mergeCells(detailHeaderRow, 6, detailHeaderRow, 5 + daysInMonth);
      worksheet.getCell(detailHeaderRow, 6).value = 'NGÀY TRONG THÁNG';

      for (let i = 1; i <= daysInMonth; i++) {
        worksheet.getCell(detailHeaderRow + 1, 5 + i).value = i;
      }

      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(selectedYear, selectedMonth - 1, i);
        const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
        worksheet.getCell(detailHeaderRow + 2, 5 + i).value = dayName;
      }

      // 4. DỮ LIỆU NHÂN VIÊN
      let currentDetailRow = detailHeaderRow + 3;

      filteredEmployees.forEach((nv, index) => {
        const employeeData = chamCongData[nv.id] || { 1: {}, 2: {} };

        worksheet.mergeCells(currentDetailRow, 1, currentDetailRow + 1, 1); // STT
        worksheet.getCell(currentDetailRow, 1).value = index + 1;

        worksheet.mergeCells(currentDetailRow, 2, currentDetailRow + 1, 2); // Mã NV
        worksheet.getCell(currentDetailRow, 2).value = nv.maNV || 'N/A';

        worksheet.mergeCells(currentDetailRow, 3, currentDetailRow + 1, 3); // Họ tên
        worksheet.getCell(currentDetailRow, 3).value = nv.hoTen || 'N/A';

        worksheet.mergeCells(currentDetailRow, 4, currentDetailRow + 1, 4); // Ngày sinh
        worksheet.getCell(currentDetailRow, 4).value = nv.ngayThangNamSinh || 'N/A';

        worksheet.mergeCells(currentDetailRow, 5, currentDetailRow + 1, 5); // Khoa phòng
        worksheet.getCell(currentDetailRow, 5).value = nv.khoaPhong?.tenKhoaPhong || khoaPhongName;

        for (let day = 1; day <= daysInMonth; day++) {
          const shift1Symbol = employeeData[1][day] || '-';
          const shift2Symbol = employeeData[2][day] || '-';

          worksheet.getCell(currentDetailRow, 5 + day).value = shift1Symbol; // Ca 1
          worksheet.getCell(currentDetailRow + 1, 5 + day).value = shift2Symbol; // Ca 2
        }

        currentDetailRow += 2;
      });

      // 5. STYLING CHO CHI TIẾT
      const detailHospitalTitleStyle = {
        font: { name: 'Times New Roman', size: 12, bold: true },
        alignment: { horizontal: 'center', vertical: 'middle' }
      };

      worksheet.getCell(1, 1).style = detailHospitalTitleStyle;
      worksheet.getCell(1, Math.floor(totalDetailCols / 2) + 1).style = detailHospitalTitleStyle;
      worksheet.getCell(2, 1).style = detailHospitalTitleStyle;
      worksheet.getCell(2, Math.floor(totalDetailCols / 2) + 1).style = detailHospitalTitleStyle;

      const detailTableTitleStyle = {
        font: { name: 'Times New Roman', size: 14, bold: true },
        alignment: { horizontal: 'center', vertical: 'middle' }
      };

      worksheet.getCell(4, Math.floor(totalDetailCols / 2) - 4).style = detailTableTitleStyle;
      worksheet.getCell(5, Math.floor(totalDetailCols / 2) - 2).style = detailTableTitleStyle;

      const detailHeaderStyle = {
        font: { name: 'Times New Roman', size: 10, bold: true },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } },
        border: {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        }
      };

      for (let row = detailHeaderRow; row <= detailHeaderRow + 2; row++) {
        for (let col = 1; col <= totalDetailCols; col++) {
          worksheet.getCell(row, col).style = detailHeaderStyle;
        }
      }

      const detailDataStyle = {
        font: { name: 'Times New Roman', size: 9 },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        }
      };

      const detailNameStyle = {
        font: { name: 'Times New Roman', size: 9 },
        alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
        border: {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        }
      };

      const detailDataStartRow = detailHeaderRow + 3;
      const detailDataEndRow = detailDataStartRow + filteredEmployees.length * 2 - 1;

      for (let row = detailDataStartRow; row <= detailDataEndRow; row++) {
        for (let col = 1; col <= totalDetailCols; col++) {
          worksheet.getCell(row, col).style = col === 3 ? detailNameStyle : detailDataStyle; // Col 3 là họ tên
        }
      }

      // 6. THIẾT LẬP KÍCH THƯỚC CỘT VÀ DÒNG
      worksheet.getColumn(1).width = 5;   // STT
      worksheet.getColumn(2).width = 12;  // Mã NV
      worksheet.getColumn(3).width = 25;  // Họ tên
      worksheet.getColumn(4).width = 15;  // Ngày sinh
      worksheet.getColumn(5).width = 15;  // Khoa phòng

      for (let i = 0; i < daysInMonth; i++) {
        worksheet.getColumn(6 + i).width = 4;
      }

      worksheet.getRow(detailHeaderRow).height = 30;
      worksheet.getRow(detailHeaderRow + 1).height = 20;
      worksheet.getRow(detailHeaderRow + 2).height = 20;

      for (let i = detailDataStartRow; i <= detailDataEndRow; i++) {
        worksheet.getRow(i).height = 18;
      }

      // 7. TÔ MÀU CỘT CUỐI TUẦN CHO BẢNG CHI TIẾT
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(selectedYear, selectedMonth - 1, day);
        const dayOfWeek = date.getDay(); // 0 = Chủ nhật, 6 = Thứ 7

        if (dayOfWeek === 0 || dayOfWeek === 6) { // Cuối tuần
          const dayColumn = 5 + day; // Cột của ngày

          // Style cho header của ngày cuối tuần
          for (let row = detailHeaderRow; row <= detailHeaderRow + 2; row++) {
            const cell = worksheet.getCell(row, dayColumn);
            cell.style = {
              ...cell.style,
              fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE8F5E8' } // Màu xanh nhạt cho header cuối tuần
              }
            };
          }

          // Style cho dữ liệu của ngày cuối tuần  
          for (let row = detailDataStartRow; row <= detailDataEndRow; row++) {
            const cell = worksheet.getCell(row, dayColumn);
            cell.style = {
              ...cell.style,
              fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE8F5E8' } // Màu xanh nhạt cho dữ liệu cuối tuần
              }
            };
          }
        }
      }

      // CHÚ THÍCH KÝ HIỆU CHO BẢNG CHI TIẾT
      let detailLegendStartRow = detailDataEndRow + 3;

      worksheet.getCell(detailLegendStartRow, 1).value = 'CHÚ THÍCH KÝ HIỆU:';
      worksheet.mergeCells(detailLegendStartRow, 1, detailLegendStartRow, totalDetailCols);

      const detailLegendTitleStyle = {
        font: { name: 'Times New Roman', size: 12, bold: true },
        alignment: { horizontal: 'left', vertical: 'middle' }
      };
      worksheet.getCell(detailLegendStartRow, 1).style = detailLegendTitleStyle;

      detailLegendStartRow += 2;

      // Header bảng ký hiệu
      worksheet.getCell(detailLegendStartRow, 1).value = 'Ký hiệu';
      worksheet.getCell(detailLegendStartRow, 2).value = 'Ý nghĩa';
      worksheet.getCell(detailLegendStartRow, 4).value = 'Ký hiệu';
      worksheet.getCell(detailLegendStartRow, 5).value = 'Ý nghĩa';

      const detailLegendHeaderStyle = {
        font: { name: 'Times New Roman', size: 10, bold: true },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } },
        border: {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        }
      };

      [1, 2, 4, 5].forEach(col => {
        worksheet.getCell(detailLegendStartRow, col).style = detailLegendHeaderStyle;
      });

      detailLegendStartRow += 1;

      // Dữ liệu ký hiệu chi tiết (2 cột)
      const detailMidPoint = Math.ceil(kyHieuChamCongs.length / 2);
      const detailLeftColumn = kyHieuChamCongs.slice(0, detailMidPoint);
      const detailRightColumn = kyHieuChamCongs.slice(detailMidPoint);

      const detailLegendDataStyle = {
        font: { name: 'Times New Roman', size: 9 },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        }
      };

      const detailLegendDescStyle = {
        font: { name: 'Times New Roman', size: 9 },
        alignment: { horizontal: 'left', vertical: 'middle' },
        border: {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        }
      };

      for (let i = 0; i < Math.max(detailLeftColumn.length, detailRightColumn.length); i++) {
        const row = detailLegendStartRow + i;

        if (i < detailLeftColumn.length) {
          worksheet.getCell(row, 1).value = detailLeftColumn[i].maKyHieu;
          worksheet.getCell(row, 2).value = detailLeftColumn[i].tenKyHieu;
          worksheet.getCell(row, 1).style = detailLegendDataStyle;
          worksheet.getCell(row, 2).style = detailLegendDescStyle;
        }

        if (i < detailRightColumn.length) {
          worksheet.getCell(row, 4).value = detailRightColumn[i].maKyHieu;
          worksheet.getCell(row, 5).value = detailRightColumn[i].tenKyHieu;
          worksheet.getCell(row, 4).style = detailLegendDataStyle;
          worksheet.getCell(row, 5).style = detailLegendDescStyle;
        }
      }

      // Ký hiệu đặc biệt chi tiết
      const detailSpecialRow = detailLegendStartRow + Math.max(detailLeftColumn.length, detailRightColumn.length);
      worksheet.getCell(detailSpecialRow, 1).value = '-';
      worksheet.getCell(detailSpecialRow, 2).value = 'Không có dữ liệu';
      worksheet.getCell(detailSpecialRow, 1).style = detailLegendDataStyle;
      worksheet.getCell(detailSpecialRow, 2).style = detailLegendDescStyle;
    }

    // 8. XUẤT FILE
    try {
      const buffer = await workbook.xlsx.writeBuffer();
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const fileName = `${showSummary ? 'TongHop_' : 'ChiTiet_'}ChamCong_Thang${selectedMonth.toString().padStart(2, '0')}_${selectedYear}_${timestamp}.xlsx`;

      // Tạo file download
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success(`Xuất file Excel ${showSummary ? 'tổng hợp' : 'chi tiết'} thành công!`);
    } catch (error) {
      console.error('Lỗi xuất Excel:', error);
      toast.error('Có lỗi xảy ra khi xuất file Excel!');
    }
  };


  // Hàm xuất Excel theo năm với 12 tab tháng
  // *** THAY THẾ HÀM exportToExcelYearly HIỆN TẠI BẰNG PHIÊN BẢN NÀY ***

  const exportToExcelYearly = async () => {
    try {
      // *** KIỂM TRA DỮ LIỆU HIỆN TẠI TRƯỚC KHI BẮT ĐẦU ***
      if (!filteredEmployees || filteredEmployees.length === 0) {
        toast.warning('Không có nhân viên nào để xuất Excel theo năm');
        return;
      }

      console.log('🔄 Starting yearly Excel export with current employees:', {
        filteredEmployeesCount: filteredEmployees.length,
        selectedYear: selectedYearForExport,
        currentDataMonth: selectedMonth,
        currentDataYear: selectedYear
      });

      const workbook = new ExcelJS.Workbook();
      const khoaPhongName = khoaPhongs.find(kp => kp.id === selectedKhoaPhongId)?.tenKhoaPhong ||
        filteredEmployees[0]?.khoaPhong?.tenKhoaPhong || 'TC-HCQT';

      // Lấy danh sách ký hiệu chấm công hiện tại
      const yearlyKyHieuChamCongs = kyHieuChamCongs.length > 0 ? kyHieuChamCongs : [];

      // *** XÁC ĐỊNH NHÂN VIÊN VÀ KHOA PHÒNG TỪ DỮ LIỆU HIỆN TẠI ***
      const baseEmployees = filteredEmployees; // Sử dụng danh sách nhân viên hiện tại
      let khoaPhongIdToUse = null;

      if (userRole === 'NGUOITONGHOP_1KP') {
        khoaPhongIdToUse = Number(userKhoaPhongId);
      } else if (userRole === 'NGUOITONGHOP' || userRole === 'ADMIN') {
        khoaPhongIdToUse = selectedKhoaPhongId;
      } else {
        khoaPhongIdToUse = Number(userKhoaPhongId);
      }

      // Lặp qua 12 tháng
      for (let month = 1; month <= 12; month++) {
        console.log(`📅 Processing month ${month}/${selectedYearForExport}...`);

        // Tính số ngày trong tháng
        const monthDaysInMonth = new Date(selectedYearForExport, month, 0).getDate();

        // *** NẾU LÀ THÁNG HIỆN TẠI, SỬ DỤNG DỮ LIỆU ĐÃ LOAD ***
        let monthChamCongData = {};
        let monthFilteredEmployees = baseEmployees;

        if (month === selectedMonth && selectedYearForExport === selectedYear) {
          // *** THÁNG HIỆN TẠI: SỬ DỤNG DỮ LIỆU ĐÃ LOAD ***
          monthChamCongData = chamCongData;
          console.log(`✅ Using current data for month ${month}: ${Object.keys(monthChamCongData).length} employees with data`);
        } else {
          // *** THÁNG KHÁC: FETCH DỮ LIỆU VỚI LOGIC GIỐNG fetchData ***
          try {
            console.log(`🔄 Fetching data for month ${month}...`);

            // *** STEP 1: Load page đầu tiên để biết tổng số records ***
            const chamCongParams = {
              year: selectedYearForExport,
              month: month,
              page: 0,
              size: 100, // Tăng size để giảm số page cần load
            };

            if (khoaPhongIdToUse) {
              chamCongParams.khoaPhongId = khoaPhongIdToUse;
            }

            console.log(`📊 Month ${month} API params:`, chamCongParams);

            const firstPageResponse = await axiosInstance.get('/chamcong/lichsu', {
              params: chamCongParams,
            });

            console.log(`📊 Month ${month} First Page Response:`, {
              totalElements: firstPageResponse.data.totalElements,
              totalPages: firstPageResponse.data.totalPages,
              currentPageSize: firstPageResponse.data.size,
              recordsInFirstPage: firstPageResponse.data.content?.length || 0
            });

            // *** STEP 2: Tính toán và load tất cả pages ***
            let allRecords = firstPageResponse.data.content || [];
            const totalPages = firstPageResponse.data.totalPages || 1;
            const totalElements = firstPageResponse.data.totalElements || 0;

            console.log(`📄 Month ${month} - Total pages to load: ${totalPages} (${totalElements} total records)`);

            // Load remaining pages nếu có
            if (totalPages > 1) {
              const pageLoadPromises = [];

              for (let page = 1; page < totalPages; page++) {
                const pageParams = { ...chamCongParams, page: page };
                pageLoadPromises.push(
                  axiosInstance.get('/chamcong/lichsu', {
                    params: pageParams,
                  })
                );
              }

              // Load tất cả pages parallel
              try {
                const allPagesResponses = await Promise.all(pageLoadPromises);

                allPagesResponses.forEach((response, index) => {
                  const pageRecords = response.data.content || [];
                  allRecords = [...allRecords, ...pageRecords];
                  console.log(`📑 Month ${month} - Loaded page ${index + 2}/${totalPages}: ${pageRecords.length} records`);
                });
              } catch (error) {
                console.error(`Error loading some pages for month ${month}:`, error);
                toast.warning(`Một số trang dữ liệu tháng ${month} không thể tải được`);
              }
            }

            console.log(`✅ Month ${month} FINAL: Loaded ${allRecords.length}/${totalElements} records`);

            if (allRecords.length < totalElements) {
              console.warn(`⚠️ Month ${month}: Chỉ tải được ${allRecords.length}/${totalElements} bản ghi`);
            }

            // *** SỬ DỤNG CÙNG LOGIC XỬ LÝ NHƯ fetchData ***
            const chamCongMap = {};
            if (allRecords && Array.isArray(allRecords)) {
              console.log(`🔄 Month ${month} - Processing ${allRecords.length} attendance records...`);

              // Nhóm theo nhân viên ID trước
              const groupedByEmployee = {};

              allRecords.forEach((record, recordIndex) => {
                try {
                  if (!record.nhanVien || !record.nhanVien.id || record.nhanVien.trangThai !== 1) {
                    return;
                  }

                  const employeeId = record.nhanVien.id;

                  if (!groupedByEmployee[employeeId]) {
                    groupedByEmployee[employeeId] = [];
                  }

                  groupedByEmployee[employeeId].push(record);
                } catch (error) {
                  console.error(`Month ${month} - Error processing record ${recordIndex}:`, error);
                }
              });

              console.log(`👥 Month ${month} - Grouped records for ${Object.keys(groupedByEmployee).length} employees`);

              // Xử lý từng nhân viên
              Object.keys(groupedByEmployee).forEach((employeeId) => {
                const employeeIdNum = parseInt(employeeId);
                const employeeRecords = groupedByEmployee[employeeId];

                // Khởi tạo structure
                chamCongMap[employeeIdNum] = { 1: {}, 2: {} };

                // Nhóm theo ngày
                const groupedByDay = {};

                employeeRecords.forEach((record) => {
                  const thoiGianCheckIn = record.thoiGianCheckIn;
                  if (!thoiGianCheckIn) return;

                  const [datePart] = thoiGianCheckIn.split(' ');
                  if (!datePart) return;

                  const [dayStr, monthStr, yearStr] = datePart.split('-');
                  const day = parseInt(dayStr, 10);
                  const recordMonth = parseInt(monthStr, 10);
                  const recordYear = parseInt(yearStr, 10);

                  // Kiểm tra tháng/năm đúng
                  if (recordMonth !== month || recordYear !== selectedYearForExport) {
                    return;
                  }

                  // Kiểm tra ngày hợp lệ
                  if (day < 1 || day > monthDaysInMonth) {
                    return;
                  }

                  if (!groupedByDay[day]) {
                    groupedByDay[day] = [];
                  }

                  groupedByDay[day].push(record);
                });

                // Xử lý từng ngày
                Object.keys(groupedByDay).forEach((dayStr) => {
                  const day = parseInt(dayStr);
                  const dayRecords = groupedByDay[day];

                  // *** SORT THEO THỜI GIAN (cũ nhất đầu tiên) ***
                  dayRecords.sort((a, b) => {
                    const timeA = a.thoiGianCheckIn || '';
                    const timeB = b.thoiGianCheckIn || '';
                    return timeA.localeCompare(timeB);
                  });

                  // *** GÁN SHIFT TUẦN TỰ ***
                  dayRecords.forEach((record, index) => {
                    if (index < 2) { // Chỉ lấy 2 bản ghi đầu tiên
                      const shift = index + 1; // index 0 -> shift 1, index 1 -> shift 2

                      // Xác định ký hiệu
                      let symbol = '-';
                      if (record.trangThaiChamCong?.id === 2 && record.kyHieuChamCong?.maKyHieu) {
                        // NGHỈ - dùng ký hiệu từ kyHieuChamCong
                        symbol = record.kyHieuChamCong.maKyHieu;
                      } else if (record.trangThaiChamCong?.id === 1 && record.caLamViec?.kyHieuChamCong?.maKyHieu) {
                        // LÀM - dùng ký hiệu từ ca làm việc
                        symbol = record.caLamViec.kyHieuChamCong.maKyHieu;
                      } else if (record.trangThaiChamCong?.id === 1) {
                        // Fallback cho trạng thái LÀM
                        symbol = 'X';
                      }

                      chamCongMap[employeeIdNum][shift][day] = symbol;
                    }
                  });
                });
              });
            }

            // *** LỌC CHỈ CÁC NHÂN VIÊN TRONG DANH SÁCH HIỆN TẠI ***
            monthChamCongData = {};
            Object.keys(chamCongMap).forEach((employeeId) => {
              const employeeIdNum = parseInt(employeeId);
              if (baseEmployees.some(nv => nv.id === employeeIdNum)) {
                monthChamCongData[employeeId] = chamCongMap[employeeId];
              }
            });

            console.log(`✅ Month ${month} - Final processed data: ${Object.keys(monthChamCongData).length} employees with data`);

            // *** DEBUGGING: Log sample data cho month khác ***
            if (Object.keys(monthChamCongData).length > 0) {
              const sampleEmployeeId = Object.keys(monthChamCongData)[0];
              const sampleData = monthChamCongData[sampleEmployeeId];
              const sampleEmployee = baseEmployees.find(nv => nv.id === parseInt(sampleEmployeeId));

              console.log(`🔍 Month ${month} Sample Data:`, {
                employeeId: sampleEmployeeId,
                employeeName: sampleEmployee?.hoTen,
                employeeCode: sampleEmployee?.maNV,
                shift1Days: Object.keys(sampleData[1] || {}).length,
                shift2Days: Object.keys(sampleData[2] || {}).length,
                shift1Sample: Object.entries(sampleData[1] || {}).slice(0, 5),
                shift2Sample: Object.entries(sampleData[2] || {}).slice(0, 5)
              });
            } else {
              console.warn(`⚠️ Month ${month} - NO DATA after processing ${allRecords.length} records`);

              // Debug: Kiểm tra tại sao không có data
              if (allRecords.length > 0) {
                const sampleRecord = allRecords[0];
                console.log(`🔍 Month ${month} Debug Sample Record:`, {
                  hasNhanVien: !!sampleRecord.nhanVien,
                  nhanVienId: sampleRecord.nhanVien?.id,
                  nhanVienTrangThai: sampleRecord.nhanVien?.trangThai,
                  thoiGianCheckIn: sampleRecord.thoiGianCheckIn,
                  isEmployeeInBaseList: baseEmployees.some(nv => nv.id === sampleRecord.nhanVien?.id)
                });
              }
            }

          } catch (error) {
            console.error(`❌ Error fetching data for month ${month}:`, error);
            monthChamCongData = {};
          }
        }

        // *** TÍNH TOÁN DỮ LIỆU TỔNG HỢP SỬ DỤNG CÙNG LOGIC VỚI calculateSummaryData ***
        const monthSummaryData = monthFilteredEmployees.map(nv => {
          const employeeData = monthChamCongData[nv.id] || { 1: {}, 2: {} };

          // Validate employeeData structure
          if (!employeeData[1]) employeeData[1] = {};
          if (!employeeData[2]) employeeData[2] = {};

          let workDaysA = 0; // Số ngày làm việc (A) - mỗi ca = 0.5
          let weekendDaysB = 0; // Những ngày nghỉ không làm việc (B) - ký hiệu "N1"
          let phepDaysC = 0; // Phép (C) - PN, PC, PT
          let bhxhDaysD = 0; // BHXH (D) - TẤT CẢ ký hiệu BHXH: Bo, Co, Ts, Ds, KH, NT
          let hocHoiDaysE = 0; // Học, Hội nghị (E) - H, Hn, Hct
          let khacDaysF = 0; // Khác (F) - các loại còn lại

          // Duyệt qua từng ngày trong tháng
          for (let day = 1; day <= monthDaysInMonth; day++) {
            const shift1Symbol = employeeData[1][day] || '-';
            const shift2Symbol = employeeData[2][day] || '-';

            // A. Số ngày làm việc (mỗi ca = 0.5, 1 ngày = 1.0)
            // Các ký hiệu làm việc: X, VT, RT, S, C, T, T12, T16, CT
            if (['X', 'VT', 'RT', 'S', 'C', 'T', 'T12', 'T16', 'CT'].includes(shift1Symbol)) {
              workDaysA += 0.5;
            }
            if (['X', 'VT', 'RT', 'S', 'C', 'T', 'T12', 'T16', 'CT'].includes(shift2Symbol)) {
              workDaysA += 0.5;
            }

            // B. Những ngày nghỉ không làm việc - ký hiệu "N1"
            if (shift1Symbol === 'N1') {
              weekendDaysB += 0.5;
            }
            if (shift2Symbol === 'N1') {
              weekendDaysB += 0.5;
            }

            // C. Phép (PN, PC, PT)
            if (['PN', 'PC', 'PT'].includes(shift1Symbol)) {
              phepDaysC += 0.5;
            }
            if (['PN', 'PC', 'PT'].includes(shift2Symbol)) {
              phepDaysC += 0.5;
            }

            // D. BHXH (TẤT CẢ các ký hiệu BHXH: Bo, Co, Ts, Ds, KH, NT)
            if (['Bo', 'Co', 'Ts', 'Ds', 'KH', 'NT'].includes(shift1Symbol)) {
              bhxhDaysD += 0.5;
            }
            if (['Bo', 'Co', 'Ts', 'Ds', 'KH', 'NT'].includes(shift2Symbol)) {
              bhxhDaysD += 0.5;
            }

            // E. Học, Hội nghị (H, Hn, Hct)
            if (['H', 'Hn', 'Hct'].includes(shift1Symbol)) {
              hocHoiDaysE += 0.5;
            }
            if (['H', 'Hn', 'Hct'].includes(shift2Symbol)) {
              hocHoiDaysE += 0.5;
            }

            // F. Khác (các loại còn lại: DL, NB, N, No, K)
            if (['DL', 'NB', 'N', 'No', 'K'].includes(shift1Symbol)) {
              khacDaysF += 0.5;
            }
            if (['DL', 'NB', 'N', 'No', 'K'].includes(shift2Symbol)) {
              khacDaysF += 0.5;
            }
          }

          // *** TÍNH TOÁN THEO CÙNG LOGIC VỚI calculateSummaryData ***
          const tongSoNgayLamAB = workDaysA + weekendDaysB; // CHỈ A + B
          const tongSoNgayNghiCDEF = phepDaysC + bhxhDaysD + hocHoiDaysE + khacDaysF; // C + D + E + F
          const tongCong = workDaysA + weekendDaysB + phepDaysC + bhxhDaysD + hocHoiDaysE + khacDaysF; // A + B + C + D + E + F

          // Tạo ghi chú đơn giản
          const noteArray = [];

          if (weekendDaysB > 0) {
            noteArray.push(`- Ngày nghỉ không làm việc: ${weekendDaysB.toFixed(1)}`);
          }

          if (phepDaysC > 0) {
            noteArray.push(`- Phép năm: ${phepDaysC.toFixed(1)}`);
          }

          if (bhxhDaysD > 0) {
            noteArray.push(`- BHXH: ${bhxhDaysD.toFixed(1)}`);
          }

          if (hocHoiDaysE > 0) {
            noteArray.push(`- Học/Hội: ${hocHoiDaysE.toFixed(1)}`);
          }

          if (khacDaysF > 0) {
            noteArray.push(`- Khác: ${khacDaysF.toFixed(1)}`);
          }

          const note = noteArray.join('\n');

          return {
            ...nv,
            workDaysA: workDaysA.toFixed(1),
            weekendDaysB: weekendDaysB.toFixed(1),
            phepDaysC: phepDaysC.toFixed(1),
            bhxhDaysD: bhxhDaysD.toFixed(1),
            hocHoiDaysE: hocHoiDaysE.toFixed(1),
            khacDaysF: khacDaysF.toFixed(1),
            tongSoNgayLamAB: tongSoNgayLamAB.toFixed(1),
            tongSoNgayNghiCDEF: tongSoNgayNghiCDEF.toFixed(1),
            tongCong: tongCong.toFixed(1),
            note: note,
            chamCongData: monthChamCongData[nv.id] || { 1: {}, 2: {} }
          };
        });

        // Tạo worksheet cho tháng - PHẦN NÀY GIỮ NGUYÊN TỪ CODE CŨ
        const worksheet = workbook.addWorksheet(`T${month}`);
        const totalCols = 5 + monthDaysInMonth + 10;

        // 1. HEADER THÔNG TIN BỆNH VIỆN
        worksheet.mergeCells(1, 1, 1, Math.floor(totalCols / 2));
        worksheet.getCell(1, 1).value = 'BỆNH VIỆN QUẬN TÂN PHÚ';

        worksheet.mergeCells(1, Math.floor(totalCols / 2) + 1, 1, totalCols);
        worksheet.getCell(1, Math.floor(totalCols / 2) + 1).value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';

        worksheet.mergeCells(2, 1, 2, Math.floor(totalCols / 2));
        worksheet.getCell(2, 1).value = `KHOA/PHÒNG ${khoaPhongName}`;

        worksheet.mergeCells(2, Math.floor(totalCols / 2) + 1, 2, totalCols);
        worksheet.getCell(2, Math.floor(totalCols / 2) + 1).value = 'Độc lập - Tự do - Hạnh phúc';

        // 2. TIÊU ĐỀ BẢNG
        worksheet.mergeCells(4, Math.floor(totalCols / 2) - 4, 4, Math.floor(totalCols / 2) + 6);
        worksheet.getCell(4, Math.floor(totalCols / 2) - 4).value = 'BẢNG TỔNG HỢP CHẤM CÔNG';

        worksheet.mergeCells(5, Math.floor(totalCols / 2) - 2, 5, Math.floor(totalCols / 2) + 4);
        worksheet.getCell(5, Math.floor(totalCols / 2) - 2).value = `THÁNG ${month} NĂM ${selectedYearForExport}`;

        // 3. HEADER CHÍNH (3 dòng)
        const headerRow = 7;

        worksheet.mergeCells(headerRow, 1, headerRow + 2, 1); // STT
        worksheet.getCell(headerRow, 1).value = 'STT';

        worksheet.mergeCells(headerRow, 2, headerRow + 2, 2); // Mã NV
        worksheet.getCell(headerRow, 2).value = 'Mã NV';

        worksheet.mergeCells(headerRow, 3, headerRow + 2, 3); // Họ tên
        worksheet.getCell(headerRow, 3).value = 'Họ Tên';

        worksheet.mergeCells(headerRow, 4, headerRow + 2, 4); // Ngày sinh
        worksheet.getCell(headerRow, 4).value = 'Ngày tháng năm sinh';

        worksheet.mergeCells(headerRow, 5, headerRow + 2, 5); // Khoa phòng
        worksheet.getCell(headerRow, 5).value = 'Khoa/phòng';

        worksheet.mergeCells(headerRow, 6, headerRow, 5 + monthDaysInMonth);
        worksheet.getCell(headerRow, 6).value = 'NGÀY TRONG THÁNG';

        for (let i = 1; i <= monthDaysInMonth; i++) {
          worksheet.getCell(headerRow + 1, 5 + i).value = i;
        }

        for (let i = 1; i <= monthDaysInMonth; i++) {
          const date = new Date(selectedYearForExport, month - 1, i);
          const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
          worksheet.getCell(headerRow + 2, 5 + i).value = dayName;
        }

        // Header tổng hợp với màu sắc cho xuất Excel theo năm
        const summaryHeaders = [
          { text: 'Số ngày làm việc (A)', color: 'FFFFA500' }, // Màu cam
          { text: 'Ngày nghỉ không làm việc (B)', color: 'FFFF6B6B' }, // Màu đỏ nhạt
          { text: 'Phép (C)', color: 'FF51CF66' }, // Màu xanh lá
          { text: 'BHXH (D)', color: 'FF74C0FC' }, // Màu xanh dương nhạt
          { text: 'Học/Hội nghị/Tập huấn (E)', color: 'FFFFD43B' }, // Màu vàng
          { text: 'Khác (F)', color: 'FFE6F3FF' }, // Màu xanh nhạt
          { text: 'Tổng ngày làm (A+B)', color: 'FF69DB7C' }, // Màu xanh lá đậm
          { text: 'Tổng ngày nghỉ (C+D+E+F)', color: 'FFFF8787' }, // Màu đỏ đậm
          { text: 'Tổng cộng', color: 'FFFFD93D' }, // Màu vàng đậm
          { text: 'Ghi chú', color: 'FFE6F3FF' } // Màu xanh nhạt
        ];

        summaryHeaders.forEach((headerObj, index) => {
          const col = 6 + monthDaysInMonth + index;
          worksheet.mergeCells(headerRow, col, headerRow + 2, col);
          const cell = worksheet.getCell(headerRow, col);
          cell.value = headerObj.text;

          // Áp dụng style với màu nền cho header tổng hợp
          cell.style = {
            font: { name: 'Times New Roman', size: 10, bold: true },
            alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: headerObj.color } },
            border: {
              top: { style: 'thin' }, bottom: { style: 'thin' },
              left: { style: 'thin' }, right: { style: 'thin' }
            }
          };
        });

        // 4. DỮ LIỆU NHÂN VIÊN - *** SỬ DỤNG DỮ LIỆU ĐÃ TÍNH TOÁN ***
        let currentRow = headerRow + 3;

        monthSummaryData.forEach((nv, index) => {
          const employeeData = nv.chamCongData;

          worksheet.mergeCells(currentRow, 1, currentRow + 1, 1); // STT
          worksheet.getCell(currentRow, 1).value = index + 1;

          worksheet.mergeCells(currentRow, 2, currentRow + 1, 2); // Mã NV
          worksheet.getCell(currentRow, 2).value = nv.maNV || 'N/A';

          worksheet.mergeCells(currentRow, 3, currentRow + 1, 3); // Họ tên
          worksheet.getCell(currentRow, 3).value = nv.hoTen || 'N/A';

          worksheet.mergeCells(currentRow, 4, currentRow + 1, 4); // Ngày sinh
          worksheet.getCell(currentRow, 4).value = nv.ngayThangNamSinh || 'N/A';

          worksheet.mergeCells(currentRow, 5, currentRow + 1, 5); // Khoa phòng
          worksheet.getCell(currentRow, 5).value = nv.khoaPhong?.tenKhoaPhong || khoaPhongName;

          // *** DỮ LIỆU CHẤM CÔNG ĐỒNG BỘ ***
          for (let day = 1; day <= monthDaysInMonth; day++) {
            const shift1Symbol = employeeData[1][day] || '-';
            const shift2Symbol = employeeData[2][day] || '-';

            worksheet.getCell(currentRow, 5 + day).value = shift1Symbol;
            worksheet.getCell(currentRow + 1, 5 + day).value = shift2Symbol;

            // Debug log cho tháng hiện tại
            if (month === selectedMonth && selectedYearForExport === selectedYear && day <= 3 && index === 0) {
              console.log(`📅 Current Month ${month} - Employee ${nv.maNV} Day ${day}: CA1=${shift1Symbol}, CA2=${shift2Symbol}`);
            }
          }

          const summaryValues = [
            nv.workDaysA, nv.weekendDaysB, nv.phepDaysC, nv.bhxhDaysD,
            nv.hocHoiDaysE, nv.khacDaysF, nv.tongSoNgayLamAB,
            nv.tongSoNgayNghiCDEF, nv.tongCong, nv.note
          ];

          summaryValues.forEach((data, index) => {
            const col = 6 + monthDaysInMonth + index;
            worksheet.mergeCells(currentRow, col, currentRow + 1, col);
            // Hiển thị "-" thay vì "0.0" cho các cột số (trừ cột note - index 9)
            if (index < 9) { // Các cột số
              worksheet.getCell(currentRow, col).value = data === '0.0' ? '-' : data;
            } else { // Cột note
              worksheet.getCell(currentRow, col).value = data;
            }
          });

          currentRow += 2;
        });

        // [Các phần styling, column width, legend... giữ nguyên như code cũ]
        // 5. STYLING
        const hospitalTitleStyle = {
          font: { name: 'Times New Roman', size: 12, bold: true },
          alignment: { horizontal: 'center', vertical: 'middle' }
        };

        worksheet.getCell(1, 1).style = hospitalTitleStyle;
        worksheet.getCell(1, Math.floor(totalCols / 2) + 1).style = hospitalTitleStyle;
        worksheet.getCell(2, 1).style = hospitalTitleStyle;
        worksheet.getCell(2, Math.floor(totalCols / 2) + 1).style = hospitalTitleStyle;

        const tableTitleStyle = {
          font: { name: 'Times New Roman', size: 14, bold: true },
          alignment: { horizontal: 'center', vertical: 'middle' }
        };

        worksheet.getCell(4, Math.floor(totalCols / 2) - 4).style = tableTitleStyle;
        worksheet.getCell(5, Math.floor(totalCols / 2) - 2).style = tableTitleStyle;

        const headerStyle = {
          font: { name: 'Times New Roman', size: 10, bold: true },
          alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } },
          border: {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' }
          }
        };

        // Áp dụng style cho header cells (trừ các cột tổng hợp đã có màu riêng)
        for (let row = headerRow; row <= headerRow + 2; row++) {
          for (let col = 1; col <= totalCols; col++) {
            // Chỉ áp dụng style mặc định cho các cột không phải tổng hợp
            if (col < 6 + monthDaysInMonth || col > 6 + monthDaysInMonth + 9) {
              worksheet.getCell(row, col).style = headerStyle;
            }
          }
        }
        const dataStyle = {
          font: { name: 'Times New Roman', size: 9 },
          alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
          border: {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' }
          }
        };

        const nameStyle = {
          font: { name: 'Times New Roman', size: 9 },
          alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
          border: {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' }
          }
        };

        const dataStartRow = headerRow + 3;
        const dataEndRow = dataStartRow + monthSummaryData.length * 2 - 1;

        for (let row = dataStartRow; row <= dataEndRow; row++) {
          for (let col = 1; col <= totalCols; col++) {
            if (col === 3) {
              worksheet.getCell(row, col).style = nameStyle; // Cột họ tên (cột 3)
            } else if (col === totalCols) {
              worksheet.getCell(row, col).style = nameStyle; // Cột ghi chú (cột cuối)
            } else {
              worksheet.getCell(row, col).style = dataStyle;
            }
          }
        }

        // 6. THIẾT LẬP KÍCH THƯỚC CỘT VÀ DÒNG
        worksheet.getColumn(1).width = 5;
        worksheet.getColumn(2).width = 12;
        worksheet.getColumn(3).width = 25;
        worksheet.getColumn(4).width = 15;
        worksheet.getColumn(5).width = 15;

        for (let i = 0; i < monthDaysInMonth; i++) {
          worksheet.getColumn(6 + i).width = 4;
        }

        const summaryWidths = [16, 20, 8, 10, 22, 8, 16, 18, 10, 20];
        summaryWidths.forEach((width, index) => {
          worksheet.getColumn(6 + monthDaysInMonth + index).width = width;
        });

        worksheet.getRow(headerRow).height = 30;
        worksheet.getRow(headerRow + 1).height = 20;
        worksheet.getRow(headerRow + 2).height = 20;

        for (let i = dataStartRow; i <= dataEndRow; i++) {
          worksheet.getRow(i).height = 18;
        }

        // 7. TÔ MÀU CỘT CUỐI TUẦN
        for (let day = 1; day <= monthDaysInMonth; day++) {
          const date = new Date(selectedYearForExport, month - 1, day);
          const dayOfWeek = date.getDay();

          if (dayOfWeek === 0 || dayOfWeek === 6) {
            const dayColumn = 5 + day;

            for (let row = headerRow; row <= headerRow + 2; row++) {
              const cell = worksheet.getCell(row, dayColumn);
              cell.style = {
                ...cell.style,
                fill: {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFE8F5E8' }
                }
              };
            }

            for (let row = dataStartRow; row <= dataEndRow; row++) {
              const cell = worksheet.getCell(row, dayColumn);
              cell.style = {
                ...cell.style,
                fill: {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFE8F5E8' }
                }
              };
            }
          }
        }

        // 8. CHÚ THÍCH KÝ HIỆU
        let legendStartRow = dataEndRow + 3;

        worksheet.getCell(legendStartRow, 1).value = 'CHÚ THÍCH KÝ HIỆU:';
        worksheet.mergeCells(legendStartRow, 1, legendStartRow, totalCols);

        const legendTitleStyle = {
          font: { name: 'Times New Roman', size: 12, bold: true },
          alignment: { horizontal: 'left', vertical: 'middle' }
        };
        worksheet.getCell(legendStartRow, 1).style = legendTitleStyle;

        legendStartRow += 2;

        worksheet.getCell(legendStartRow, 1).value = 'Ký hiệu';
        worksheet.getCell(legendStartRow, 2).value = 'Ý nghĩa';
        worksheet.getCell(legendStartRow, 4).value = 'Ký hiệu';
        worksheet.getCell(legendStartRow, 5).value = 'Ý nghĩa';

        const legendHeaderStyle = {
          font: { name: 'Times New Roman', size: 10, bold: true },
          alignment: { horizontal: 'center', vertical: 'middle' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } },
          border: {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' }
          }
        };

        [1, 2, 4, 5].forEach(col => {
          worksheet.getCell(legendStartRow, col).style = legendHeaderStyle;
        });

        legendStartRow += 1;

        const midPoint = Math.ceil(yearlyKyHieuChamCongs.length / 2);
        const leftColumn = yearlyKyHieuChamCongs.slice(0, midPoint);
        const rightColumn = yearlyKyHieuChamCongs.slice(midPoint);

        const legendDataStyle = {
          font: { name: 'Times New Roman', size: 9 },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' }
          }
        };

        const legendDescStyle = {
          font: { name: 'Times New Roman', size: 9 },
          alignment: { horizontal: 'left', vertical: 'middle' },
          border: {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' }
          }
        };

        for (let i = 0; i < Math.max(leftColumn.length, rightColumn.length); i++) {
          const row = legendStartRow + i;

          if (i < leftColumn.length) {
            worksheet.getCell(row, 1).value = leftColumn[i].maKyHieu;
            worksheet.getCell(row, 2).value = leftColumn[i].tenKyHieu;
            worksheet.getCell(row, 1).style = legendDataStyle;
            worksheet.getCell(row, 2).style = legendDescStyle;
          }

          if (i < rightColumn.length) {
            worksheet.getCell(row, 4).value = rightColumn[i].maKyHieu;
            worksheet.getCell(row, 5).value = rightColumn[i].tenKyHieu;
            worksheet.getCell(row, 4).style = legendDataStyle;
            worksheet.getCell(row, 5).style = legendDescStyle;
          }
        }

        const specialRow = legendStartRow + Math.max(leftColumn.length, rightColumn.length);
        worksheet.getCell(specialRow, 1).value = '-';
        worksheet.getCell(specialRow, 2).value = 'Không có dữ liệu';
        worksheet.getCell(specialRow, 1).style = legendDataStyle;
        worksheet.getCell(specialRow, 2).style = legendDescStyle;

        console.log(`✅ Completed month ${month} with ${monthSummaryData.length} employees`);
      }

      // 9. XUẤT FILE
      console.log('📁 Creating Excel file...');
      const buffer = await workbook.xlsx.writeBuffer();
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const fileName = `TongHop_ChamCong_Nam${selectedYearForExport}_${timestamp}.xlsx`;

      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);

      console.log('🎉 Successfully exported yearly Excel!');
      toast.success(`Xuất file Excel tổng hợp năm ${selectedYearForExport} thành công!`);

    } catch (error) {
      console.error('❌ Error in yearly Excel export:', error);
      toast.error('Có lỗi xảy ra khi xuất file Excel theo năm!');
    }
  };


  const handleRefresh = () => {
    fetchData(true);
  };

  return (
    <div className="container-fluid px-4 py-3" style={{ backgroundColor: '#f8f9fc', minHeight: '100vh' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1 text-primary fw-bold">
            <i className="ri-calendar-check-line me-2"></i>
            Quản Lý Chấm Công
          </h1>
          <p className="text-muted mb-0">Theo dõi và quản lý chấm công nhân viên</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary" onClick={handleRefresh} disabled={loading}>
            <i className="ri-refresh-line me-1"></i>
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
          <button
            className={`btn ${showSummary ? 'btn-info' : 'btn-outline-info'}`}
            onClick={() => setShowSummary(!showSummary)}
            disabled={loading || filteredEmployees.length === 0}
          >
            <i className="ri-table-line me-1"></i>
            {showSummary ? 'Xem chi tiết' : 'Xem tổng hợp'}
          </button>
          {showSummary ? (
            <div className="d-flex gap-2">
              <button
                className="btn btn-success"
                onClick={exportToExcel}
                disabled={loading || filteredEmployees.length === 0}
              >
                <i className="ri-file-excel-2-line me-1"></i>
                Xuất Excel
              </button>
              <div className="d-flex align-items-center gap-2">
                <select
                  className="form-select"
                  style={{ width: '100px' }}
                  value={selectedYearForExport}
                  onChange={(e) => setSelectedYearForExport(parseInt(e.target.value))}
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </select>
                <button
                  className="btn btn-info"
                  onClick={exportToExcelYearly}
                  disabled={loading || filteredEmployees.length === 0}
                >
                  <i className="ri-file-excel-2-line me-1"></i>
                  Xuất Excel theo năm
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-success"
              onClick={exportToExcel}
              disabled={loading || filteredEmployees.length === 0}
            >
              <i className="ri-file-excel-2-line me-1"></i>
              Xuất Excel
            </button>
          )}
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row align-items-end">
            {(userRole === 'ADMIN' || userRole === 'NGUOITONGHOP' || userRole === 'NGUOITONGHOP_1KP') && (
              <div className="col-md-3">
                <label className="form-label fw-semibold text-dark">
                  <i className="ri-building-line me-1"></i>Khoa phòng
                </label>
                <select
                  className="form-select border-2"
                  value={selectedKhoaPhongId || ''}
                  onChange={(e) => setSelectedKhoaPhongId(e.target.value ? Number(e.target.value) : null)}
                  disabled={userRole === 'NGUOITONGHOP_1KP'} // Disable cho NGUOITONGHOP_1KP như NGUOICHAMCONG
                >
                  {userRole === 'NGUOITONGHOP' && <option value="">Tất cả khoa phòng</option>}
                  {khoaPhongs.map(khoaPhong => (
                    <option key={khoaPhong.id} value={khoaPhong.id}>
                      {khoaPhong.tenKhoaPhong}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="col-md-3">
              <label className="form-label fw-semibold text-dark">
                <i className="ri-calendar-line me-1"></i>Tháng
              </label>
              <select
                className="form-select border-2"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold text-dark">
                <i className="ri-calendar-2-line me-1"></i>Năm
              </label>
              <select
                className="form-select border-2"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold text-dark">
                <i className="ri-search-line me-1"></i>Tìm kiếm nhân viên
              </label>
              <input
                type="text"
                className="form-control border-2"
                placeholder="Nhập tên hoặc mã nhân viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Thêm thông báo cho ADMIN */}
      {userRole === 'ADMIN' && (
        <div className="alert alert-info alert-dismissible fade show mb-3" role="alert">
          <i className="ri-information-line me-2"></i>
          <strong>ADMIN:</strong> Bạn có thể click vào ô chấm công để chỉnh sửa ký hiệu.
          Thay đổi sẽ được đồng bộ trong cả bảng chi tiết và tổng hợp.
          <button type="button" className="btn-close" data-bs-dismiss="alert"></button>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Đang tải...</span>
              </div>
              <p className="text-muted">Đang tải dữ liệu chấm công...</p>
            </div>
          ) : filteredEmployees.length > 0 ? (
            <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {!showSummary ? (
                // Bảng chấm công chi tiết - FIXED: Mỗi nhân viên chỉ 1 dòng với 2 ca hiển thị trên cùng 1 dòng
                <table className="table table-hover mb-0">
                  <thead className="sticky-top" style={{ backgroundColor: '#4e73df', color: 'white', zIndex: 1 }}>
                    <tr>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '60px', fontSize: '12px' }}>STT</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '100px', fontSize: '12px' }}>Mã NV</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '180px', fontSize: '12px' }}>Họ và Tên</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '120px', fontSize: '12px' }}>Ngày tháng năm sinh</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '100px', fontSize: '12px' }}>Khoa/phòng</th>
                      <th colSpan={daysInMonth} className="text-center py-2" style={{ fontSize: '12px', color: '#ff0000' }}>NGÀY TRONG THÁNG</th>
                    </tr>

                    <tr>
                      {Array.from({ length: daysInMonth }, (_, i) => (
                        <th key={i + 1} className="text-center py-2" style={{
                          minWidth: '50px',
                          fontSize: '11px',
                          backgroundColor: isWeekend(i + 1) ? '#dc3545' : '#4e73df',
                          color: 'white'
                        }}>
                          {i + 1}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const date = new Date(selectedYear, selectedMonth - 1, i + 1);
                        const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
                        return (
                          <th key={i + 1} className="text-center py-2" style={{
                            minWidth: '50px',
                            fontSize: '10px',
                            backgroundColor: isWeekend(i + 1) ? '#dc3545' : '#4e73df',
                            color: 'white'
                          }}>
                            {dayName}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((nv, index) => {
                      const employeeData = chamCongData[nv.id] || { 1: {}, 2: {} };
                      return (
                        <tr key={nv.id} className="border-bottom">
                          <td className="text-center align-middle py-2 fw-semibold" style={{ fontSize: '12px', backgroundColor: '#f8f9fa' }}>
                            {index + 1}
                          </td>
                          <td className="text-center align-middle py-2" style={{ fontSize: '11px', backgroundColor: '#f8f9fa' }}>
                            {nv.maNV || '-'}
                          </td>
                          <td className="align-middle py-2 fw-semibold" style={{ fontSize: '12px' }}>
                            {nv.hoTen}
                          </td>
                          <td className="text-center align-middle py-2" style={{ fontSize: '11px' }}>
                            {nv.ngayThangNamSinh || 'N/A'}
                          </td>
                          <td className="text-center align-middle py-2" style={{ fontSize: '11px' }}>
                            {nv.khoaPhong?.tenKhoaPhong || 'N/A'}
                          </td>

                          {Array.from({ length: daysInMonth }, (_, day) => {
                            const shift1Symbol = employeeData[1][day + 1] || '-';
                            const shift2Symbol = employeeData[2][day + 1] || '-';
                            const isWeekendDay = isWeekend(day + 1);
                            return (
                              <td
                                key={day + 1}
                                className={`text-center align-middle p-1 ${userRole === 'ADMIN' ? 'attendance-cell-editable' : ''}`}
                                style={{
                                  backgroundColor: isWeekendDay ? '#ffe6e6' : '#ffffff',
                                  minWidth: '50px',
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  border: '1px solid #dee2e6',
                                  verticalAlign: 'middle',
                                  cursor: userRole === 'ADMIN' ? 'pointer' : 'default',
                                  position: 'relative'
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                  <span
                                    style={{
                                      ...getCellStyle(shift1Symbol),
                                      display: 'inline-block',
                                      width: '100%',
                                      padding: '1px',
                                      borderRadius: '2px',
                                      fontSize: '9px'
                                    }}
                                    onClick={() => userRole === 'ADMIN' && handleCellClick(nv.id, day + 1, 1, shift1Symbol)}
                                    title={userRole === 'ADMIN' ? 'Click để sửa ca sáng' : ''}
                                  >
                                    {shift1Symbol}
                                  </span>
                                  <span
                                    style={{
                                      ...getCellStyle(shift2Symbol),
                                      display: 'inline-block',
                                      width: '100%',
                                      padding: '1px',
                                      borderRadius: '2px',
                                      fontSize: '9px'
                                    }}
                                    onClick={() => userRole === 'ADMIN' && handleCellClick(nv.id, day + 1, 2, shift2Symbol)}
                                    title={userRole === 'ADMIN' ? 'Click để sửa ca chiều' : ''}
                                  >
                                    {shift2Symbol}
                                  </span>
                                </div>
                                {userRole === 'ADMIN' && (
                                  <div
                                    className="edit-indicator"
                                    style={{
                                      position: 'absolute',
                                      top: '2px',
                                      right: '2px',
                                      width: '6px',
                                      height: '6px',
                                      backgroundColor: '#007bff',
                                      borderRadius: '50%',
                                      opacity: 0.7
                                    }}
                                  />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                // Bảng tổng hợp với logic mới
                <table className="table table-hover mb-0">
                  <thead className="sticky-top" style={{ backgroundColor: '#4e73df', color: 'white', zIndex: 1 }}>
                    <tr>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '60px', fontSize: '12px' }}>STT</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '100px', fontSize: '12px' }}>Mã NV</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '180px', fontSize: '12px' }}>Họ và Tên</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '120px', fontSize: '12px' }}>Ngày tháng năm sinh</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '100px', fontSize: '12px' }}>Khoa/phòng</th>
                      <th colSpan={daysInMonth} className="text-center py-2" style={{ fontSize: '12px', color: '#ff0000' }}>NGÀY TRONG THÁNG</th>


                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '80px', fontSize: '10px', backgroundColor: '#ffa500' }}>Số ngày làm việc (A)</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '80px', fontSize: '10px', backgroundColor: '#ff6b6b' }}>Những ngày nghỉ không làm việc (B)</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '60px', fontSize: '10px', backgroundColor: '#51cf66' }}>Phép(C)</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '60px', fontSize: '10px', backgroundColor: '#74c0fc' }}>BHXH (D)</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '80px', fontSize: '10px', backgroundColor: '#ffd43b' }}>Học, Hội nghỉ, Tập huấn, Hợp (E)</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '60px', fontSize: '10px' }}>Khác (F)</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '80px', fontSize: '10px', backgroundColor: '#69db7c' }}>Tổng số ngày làm (A+B)</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '80px', fontSize: '10px', backgroundColor: '#ff8787' }}>Tổng số ngày nghỉ (C+D+E+F)</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '70px', fontSize: '10px', backgroundColor: '#ffd93d' }}>Tổng cộng</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '150px', fontSize: '10px' }}>Ghi chú</th>
                    </tr>
                    <tr>
                      {Array.from({ length: daysInMonth }, (_, i) => (
                        <th key={i + 1} className="text-center py-2" style={{
                          minWidth: '30px',
                          fontSize: '11px',
                          backgroundColor: isWeekend(i + 1) ? '#dc3545' : '#4e73df',
                          color: 'white'
                        }}>
                          {i + 1}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const date = new Date(selectedYear, selectedMonth - 1, i + 1);
                        const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
                        return (
                          <th key={i + 1} className="text-center py-2" style={{
                            minWidth: '30px',
                            fontSize: '10px',
                            backgroundColor: isWeekend(i + 1) ? '#dc3545' : '#4e73df',
                            color: 'white'
                          }}>
                            {dayName}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const summaryData = calculateSummaryData();
                      return filteredEmployees.map((nv, index) => {
                        const employeeData = chamCongData[nv.id] || { 1: {}, 2: {} };
                        const summaryItem = summaryData.find(item => item.id === nv.id);

                        return (
                          <>
                            <tr key={nv.id} className="border-bottom">
                              <td rowSpan="2" className="text-center align-middle py-2 fw-semibold" style={{ fontSize: '12px', backgroundColor: '#f8f9fa' }}>
                                {index + 1}
                              </td>
                              <td rowSpan="2" className="text-center align-middle py-2" style={{ fontSize: '11px', backgroundColor: '#f8f9fa' }}>
                                {nv.maNV || '-'}
                              </td>
                              <td rowSpan="2" className="align-middle py-2 fw-semibold" style={{ fontSize: '12px', backgroundColor: '#f8f9fa' }}>
                                {nv.hoTen}
                              </td>
                              <td rowSpan="2" className="text-center align-middle py-2" style={{ fontSize: '11px', backgroundColor: '#f8f9fa' }}>
                                {nv.ngayThangNamSinh || 'N/A'}
                              </td>
                              <td rowSpan="2" className="text-center align-middle py-2" style={{ fontSize: '11px', backgroundColor: '#f8f9fa' }}>
                                {nv.khoaPhong?.tenKhoaPhong || 'N/A'}
                              </td>

                              {Array.from({ length: daysInMonth }, (_, day) => {
                                const shift1Symbol = employeeData[1][day + 1] || '-';
                                const isWeekendDay = isWeekend(day + 1);
                                return (
                                  <td
                                    key={day + 1}
                                    className={`text-center align-middle p-1 ${userRole === 'ADMIN' ? 'attendance-cell-editable' : ''}`}
                                    style={{
                                      ...getCellStyle(shift1Symbol),
                                      backgroundColor: isWeekendDay && shift1Symbol === '-' ? '#ffe6e6' : getCellStyle(shift1Symbol).backgroundColor,
                                      minWidth: '30px',
                                      fontSize: '10px',
                                      fontWeight: 'bold',
                                      cursor: userRole === 'ADMIN' ? 'pointer' : 'default',
                                      position: 'relative'
                                    }}
                                    onClick={() => userRole === 'ADMIN' && handleCellClick(nv.id, day + 1, 1, shift1Symbol)}
                                    title={userRole === 'ADMIN' ? 'Click để sửa ca sáng' : ''}
                                  >
                                    {shift1Symbol}
                                    {userRole === 'ADMIN' && (
                                      <div
                                        className="edit-indicator"
                                        style={{
                                          position: 'absolute',
                                          top: '1px',
                                          right: '1px',
                                          width: '4px',
                                          height: '4px',
                                          backgroundColor: '#007bff',
                                          borderRadius: '50%',
                                          opacity: 0.7
                                        }}
                                      />
                                    )}
                                  </td>
                                );
                              })}

                              <td rowSpan="2" className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#e6f3ff' }}>
                                {summaryItem?.workDaysA === '0.0' ? '-' : summaryItem?.workDaysA || '-'}
                              </td>
                              <td rowSpan="2" className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#ffe6e6' }}>
                                {summaryItem?.weekendDaysB === '0.0' ? '-' : summaryItem?.weekendDaysB || '-'}
                              </td>
                              <td rowSpan="2" className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#e6ffe6' }}>
                                {summaryItem?.phepDaysC === '0.0' ? '-' : summaryItem?.phepDaysC || '-'}
                              </td>
                              <td rowSpan="2" className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#e6f0ff' }}>
                                {summaryItem?.bhxhDaysD === '0.0' ? '-' : summaryItem?.bhxhDaysD || '-'}
                              </td>
                              <td rowSpan="2" className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#fff3e6' }}>
                                {summaryItem?.hocHoiDaysE === '0.0' ? '-' : summaryItem?.hocHoiDaysE || '-'}
                              </td>
                              <td rowSpan="2" className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#f0f0f0' }}>
                                {summaryItem?.khacDaysF === '0.0' ? '-' : summaryItem?.khacDaysF || '-'}
                              </td>
                              <td rowSpan="2" className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#d9f2e6' }}>
                                {summaryItem?.tongSoNgayLamAB === '0.0' ? '-' : summaryItem?.tongSoNgayLamAB || '-'}
                              </td>
                              <td rowSpan="2" className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#ffe6e6' }}>
                                {summaryItem?.tongSoNgayNghiCDEF === '0.0' ? '-' : summaryItem?.tongSoNgayNghiCDEF || '-'}
                              </td>
                              <td rowSpan="2" className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#fff9e6' }}>
                                {summaryItem?.tongCong === '0.0' ? '-' : summaryItem?.tongCong || '-'}
                              </td>


                              <td rowSpan="2" className="align-middle py-2" style={{
                                fontSize: '11px',
                                whiteSpace: 'pre-line',
                                lineHeight: '1.4',
                                verticalAlign: 'top',
                                maxWidth: '150px',
                                backgroundColor: '#f8f9fa'
                              }}>
                                {summaryItem?.note || ''}
                              </td>
                            </tr>
                            <tr key={`${nv.id}_2`} className="border-bottom">
                              {Array.from({ length: daysInMonth }, (_, day) => {
                                const shift2Symbol = employeeData[2][day + 1] || '-';
                                const isWeekendDay = isWeekend(day + 1);
                                return (
                                  <td
                                    key={day + 1}
                                    className={`text-center align-middle p-1 ${userRole === 'ADMIN' ? 'attendance-cell-editable' : ''}`}
                                    style={{
                                      ...getCellStyle(shift2Symbol),
                                      backgroundColor: isWeekendDay && shift2Symbol === '-' ? '#ffe6e6' : getCellStyle(shift2Symbol).backgroundColor,
                                      minWidth: '30px',
                                      fontSize: '10px',
                                      fontWeight: 'bold',
                                      cursor: userRole === 'ADMIN' ? 'pointer' : 'default',
                                      position: 'relative'
                                    }}
                                    onClick={() => userRole === 'ADMIN' && handleCellClick(nv.id, day + 1, 2, shift2Symbol)}
                                    title={userRole === 'ADMIN' ? 'Click để sửa ca chiều' : ''}
                                  >
                                    {shift2Symbol}
                                    {userRole === 'ADMIN' && (
                                      <div
                                        className="edit-indicator"
                                        style={{
                                          position: 'absolute',
                                          top: '1px',
                                          right: '1px',
                                          width: '4px',
                                          height: '4px',
                                          backgroundColor: '#007bff',
                                          borderRadius: '50%',
                                          opacity: 0.7
                                        }}
                                      />
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          </>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="text-center py-5">
              <i className="ri-user-unfollow-line text-muted" style={{ fontSize: '64px' }}></i>
              <h5 className="text-muted mt-3">Không có dữ liệu</h5>
              <p className="text-muted">Không tìm thấy nhân viên hoặc dữ liệu chấm công</p>
            </div>
          )}
        </div>
      </div>

      {!loading && (
        <div className="mt-3">
          <small className="text-muted">
            Hiển thị {filteredEmployees.length} / {nhanViens.length} nhân viên
            {searchTerm && ` - Kết quả tìm kiếm cho "${searchTerm}"`}
          </small>
        </div>
      )}

      <div className="row mt-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="card-title fw-semibold mb-3">
                <i className="ri-information-line me-2"></i>Chú thích ký hiệu
              </h6>
              <div className="row">
                <div className="col-md-6">
                  {kyHieuChamCongs.slice(0, Math.ceil(kyHieuChamCongs.length / 2)).map((kyHieu) => (
                    <div key={kyHieu.id} className="d-flex align-items-center mb-2">
                      <span
                        className="badge me-2"
                        style={{
                          backgroundColor: getCellStyle(kyHieu.maKyHieu).backgroundColor,
                          color: getCellStyle(kyHieu.maKyHieu).color,
                          minWidth: '40px',
                          fontSize: '11px',
                        }}
                      >
                        {kyHieu.maKyHieu}
                      </span>
                      <small className="text-muted">{kyHieu.tenKyHieu}</small>
                    </div>
                  ))}
                  <div className="d-flex align-items-center mb-2">
                    <span className="badge bg-light text-dark border me-2" style={{ minWidth: '40px', fontSize: '11px' }}>
                      -
                    </span>
                    <small className="text-muted">Không có dữ liệu</small>
                  </div>
                </div>
                <div className="col-md-6">
                  {kyHieuChamCongs.slice(Math.ceil(kyHieuChamCongs.length / 2)).map((kyHieu) => (
                    <div key={kyHieu.id} className="d-flex align-items-center mb-2">
                      <span
                        className="badge me-2"
                        style={{
                          backgroundColor: getCellStyle(kyHieu.maKyHieu).backgroundColor,
                          color: getCellStyle(kyHieu.maKyHieu).color,
                          minWidth: '40px',
                          fontSize: '11px',
                        }}
                      >
                        {kyHieu.maKyHieu}
                      </span>
                      <small className="text-muted">{kyHieu.tenKyHieu}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* *** THÊM MODAL CHỈNH SỬA *** */}
      <EditSymbolModal />
    </div>
  );
}

export default QuanLyBangChamCong;
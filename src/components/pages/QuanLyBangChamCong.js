import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';

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
  const [selectedKhoaPhongId, setSelectedKhoaPhongId] = useState(
    userRole === 'ADMIN' ? Number(userKhoaPhongId) : null
  );
  const [isInitialized, setIsInitialized] = useState(false);

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const [summaryData, setSummaryData] = useState([]);
  const [showSummary, setShowSummary] = useState(false);

  const getKyHieuDescription = (maKyHieu, kyHieuChamCongs) => {
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
      Object.values(employeeData).forEach(dayStatus => {
        if (['x', 'VT', 'RT', 'S', 'C', 'T', 'T12', 'T16', 'CT'].includes(dayStatus)) {
          workDayCount++;
        } else if (dayStatus !== '-') {
          absentDayCount++;
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

  // Tính toán dữ liệu tổng hợp cho từng nhân viên
  const calculateSummaryData = useCallback(() => {
    const summary = filteredEmployees.map(nv => {
      const employeeData = chamCongData[nv.id] || { 1: {}, 2: {} };

      // Validate employeeData structure
      if (!employeeData[1]) employeeData[1] = {};
      if (!employeeData[2]) employeeData[2] = {};

      let workDaysA = 0; // Số ngày làm việc (A) - mỗi ca = 0.5
      let weekendDaysB = 0; // Những ngày nghỉ không làm việc (B) - ký hiệu "N1"
      let phepDaysC = 0; // Phép (C) - PN, PC, PT
      let bhxhDaysD = 0; // BHXH (D) - chỉ Bo (bản thân ốm)
      let hocHoiDaysE = 0; // Học, Hội nghị (E) - H, Hn, Hct
      let khacDaysF = 0; // Khác (F) - các loại khác
      let absentNotes = [];

      // Duyệt qua từng ngày trong tháng
      for (let day = 1; day <= daysInMonth; day++) {
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

        // D. BHXH (chỉ Bo - bản thân ốm)
        if (shift1Symbol === 'Bo') {
          bhxhDaysD += 0.5;
          absentNotes.push(`BHXH (bản thân ốm): ${day} (ca sáng)`);
        }
        if (shift2Symbol === 'Bo') {
          bhxhDaysD += 0.5;
          absentNotes.push(`BHXH (bản thân ốm): ${day} (ca chiều)`);
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

        // F. Khác (tất cả các loại khác: DL, NB, Co, Ts, Ds, KH, NT, N, No)
        if (['DL', 'NB', 'Co', 'Ts', 'Ds', 'KH', 'NT', 'N', 'No'].includes(shift1Symbol)) {
          khacDaysF += 0.5;
          absentNotes.push(`Khác (${shift1Symbol}): ${day} (ca sáng)`);
        }
        if (['DL', 'NB', 'Co', 'Ts', 'Ds', 'KH', 'NT', 'N', 'No'].includes(shift2Symbol)) {
          khacDaysF += 0.5;
          absentNotes.push(`Khác (${shift2Symbol}): ${day} (ca chiều)`);
        }
      }

      // *** UPDATED: Tính toán theo yêu cầu mới ***
      // Tổng số ngày làm (A+B) = bao gồm cả phép vì "có nghỉ phép thì vẫn cộng vào"
      const tongSoNgayLamAB = workDaysA + weekendDaysB + phepDaysC; // A + B + C (phép)

      // Tổng số ngày nghỉ (C+D+E+F) = giữ nguyên cách tính cũ, hiển thị bình thường
      const tongSoNgayNghiCDEF = phepDaysC + bhxhDaysD + hocHoiDaysE + khacDaysF; // C + D + E + F

      // Tổng cộng = Tổng số ngày làm (A+B) - bao gồm cả phép
      const tongCong = tongSoNgayLamAB;

      // Tạo ghi chú đơn giản
      const noteArray = [];

      if (weekendDaysB > 0) {
        noteArray.push(`- Ngày nghỉ không làm việc: ${weekendDaysB.toFixed(1)}`);
      }

      if (phepDaysC > 0) {
        noteArray.push(`- Phép năm: ${phepDaysC.toFixed(1)}`);
      }

      if (bhxhDaysD > 0) {
        noteArray.push(`- BHXH (bản thân ốm): ${bhxhDaysD.toFixed(1)}`);
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
        weekendDaysB: weekendDaysB.toFixed(1), // Chỉ N1
        phepDaysC: phepDaysC.toFixed(1),
        bhxhDaysD: bhxhDaysD.toFixed(1),
        hocHoiDaysE: hocHoiDaysE.toFixed(1),
        khacDaysF: khacDaysF.toFixed(1),
        tongSoNgayLamAB: tongSoNgayLamAB.toFixed(1), // A + B + C (bao gồm phép)
        tongSoNgayNghiCDEF: tongSoNgayNghiCDEF.toFixed(1), // C + D + E + F (giữ nguyên)
        tongCong: tongCong.toFixed(1), // = tongSoNgayLamAB
        note
      };
    });

    return summary;
  }, [filteredEmployees, chamCongData, daysInMonth]);

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
  }, [userRole]);

  // Lấy danh sách nhân viên, dữ liệu chấm công và ký hiệu chấm công
  const fetchData = useCallback(async (showNoDataToast = true) => {
    const khoaPhongIdToUse = selectedKhoaPhongId || userKhoaPhongId;

    if (!khoaPhongIdToUse && userRole !== 'ADMIN') {
      toast.error('Không tìm thấy khoa phòng, vui lòng đăng nhập lại!');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const nhanVienResponse = await axiosInstance.get('/nhanvien', {
        params: { khoaPhongId: khoaPhongIdToUse, page: 0, size: 100 },
      });
      const nhanVienData = nhanVienResponse.data.content || [];
      setNhanViens(nhanVienData);
      setFilteredEmployees(nhanVienData);

      if (nhanVienData.length === 0 && showNoDataToast) {
        toast.warn('Không có nhân viên nào trong khoa phòng này.');
      }

      const chamCongResponse = await axiosInstance.get('/chamcong/lichsu', {
        params: {
          year: selectedYear,
          month: selectedMonth,
          khoaPhongId: khoaPhongIdToUse,
          page: 0,
          size: 1000,
        },
      });

      const chamCongMap = {};

      // *** ĐỒNG BỘ VỚI LOGIC ChamCong.js: Nhóm theo nhân viên và ngày, sau đó gán shift tuần tự ***
      if (chamCongResponse.data.content && Array.isArray(chamCongResponse.data.content)) {
        // Nhóm các bản ghi chấm công theo nhân viên và ngày
        const groupedRecords = {};

        chamCongResponse.data.content.forEach((record) => {
          if (record.nhanVien && record.nhanVien.id && record.nhanVien.trangThai === 1) {
            const thoiGianCheckIn = record.thoiGianCheckIn;
            let day;

            if (thoiGianCheckIn) {
              const [datePart] = thoiGianCheckIn.split(' ');
              const [dayStr, monthStr, yearStr] = datePart.split('-');
              day = parseInt(dayStr, 10);
              const recordMonth = parseInt(monthStr, 10);
              const recordYear = parseInt(yearStr, 10);

              if (recordMonth !== selectedMonth || recordYear !== selectedYear) {
                return;
              }
            } else {
              return;
            }

            const nhanVienId = record.nhanVien.id;
            const dateKey = `${nhanVienId}_${day}`;

            if (!groupedRecords[dateKey]) {
              groupedRecords[dateKey] = [];
            }
            groupedRecords[dateKey].push(record);
          }
        });

        // Xử lý từng nhóm (nhân viên + ngày)
        Object.keys(groupedRecords).forEach((dateKey) => {
          const records = groupedRecords[dateKey];
          const [nhanVienId, day] = dateKey.split('_');
          const nhanVienIdNum = parseInt(nhanVienId);
          const dayNum = parseInt(day);

          if (dayNum >= 1 && dayNum <= daysInMonth) {
            if (!chamCongMap[nhanVienIdNum]) {
              chamCongMap[nhanVienIdNum] = { 1: {}, 2: {} };
            }

            // Sắp xếp theo thời gian (cũ nhất đầu tiên)
            records.sort((a, b) => {
              const parseDate = (dateStr) => {
                if (!dateStr) return new Date();
                const [datePart, timePart] = dateStr.split(' ');
                const [day, month, year] = datePart.split('-');
                return new Date(`${year}-${month}-${day}T${timePart}`);
              };
              return new Date(parseDate(a.thoiGianCheckIn)) - new Date(parseDate(b.thoiGianCheckIn));
            });

            // Gán shift theo thứ tự: bản ghi đầu tiên = shift 1, bản ghi thứ 2 = shift 2
            records.forEach((record, index) => {
              if (index < 2) { // Chỉ xử lý 2 bản ghi đầu tiên
                const shift = index + 1; // index 0 -> shift 1, index 1 -> shift 2

                // Xác định ký hiệu hiển thị
                let symbol = '-';
                if (record.trangThaiChamCong?.id === 2 && record.kyHieuChamCong) {
                  // Trạng thái NGHỈ
                  symbol = record.kyHieuChamCong.maKyHieu || 'N';
                } else if (record.trangThaiChamCong?.id === 1 && record.caLamViec) {
                  // Trạng thái LÀM
                  symbol = record.caLamViec.kyHieuChamCong?.maKyHieu || 'X';
                }

                chamCongMap[nhanVienIdNum][shift][dayNum] = symbol;
              }
            });
          }
        });
      }

      const filteredChamCongData = Object.keys(chamCongMap).reduce((acc, nhanVienId) => {
        if (nhanVienData.some(nv => nv.id === parseInt(nhanVienId))) {
          acc[nhanVienId] = chamCongMap[nhanVienId];
        }
        return acc;
      }, {});
      setChamCongData(filteredChamCongData);

      if (showNoDataToast && Object.keys(filteredChamCongData).length === 0 && nhanVienData.length > 0) {
        toast.warn('Không có dữ liệu chấm công cho tháng này.');
      }

      if (kyHieuChamCongs.length === 0) {
        const kyHieuResponse = await axiosInstance.get('/ky-hieu-cham-cong');
        const activeKyHieuChamCongs = kyHieuResponse.data.filter(kyHieu => kyHieu.trangThai);
        setKyHieuChamCongs(activeKyHieuChamCongs);
      }
    } catch (error) {
      toast.error(`Lỗi khi tải dữ liệu: ${error.response?.data?.error || error.message || 'Kiểm tra API'}`);
      console.error('Lỗi chi tiết:', error.response?.data || error);
    } finally {
      setLoading(false);
    }
  }, [userKhoaPhongId, userRole, selectedKhoaPhongId, selectedMonth, selectedYear, daysInMonth, kyHieuChamCongs.length]);

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
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const khoaPhongName = khoaPhongs.find(kp => kp.id === selectedKhoaPhongId)?.tenKhoaPhong ||
      nhanViens[0]?.khoaPhong?.tenKhoaPhong || 'TC-HCQT';

    if (showSummary) {
      // Xuất dữ liệu tổng hợp - CẢI THIỆN
      const summaryData = calculateSummaryData();
      const wsData = [];

      // Header thông tin bệnh viện
      wsData.push(['BỆNH VIỆN QUẬN TÂN PHÚ', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM']);
      wsData.push(['PHÒNG ' + khoaPhongName, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Độc lập - Tự do - Hạnh phúc']);
      wsData.push([]);
      wsData.push([`BẢNG TỔNG HỢP CHẤM CÔNG`]);
      wsData.push([`THÁNG ${selectedMonth} NĂM ${selectedYear}`]);
      wsData.push([]);

      // Header chính - 3 dòng
      const headerRow1 = ['', 'Họ Tên', 'Ngày tháng năm sinh', 'Khoa/phòng'];
      const headerRow2 = ['', '', '', '', 'NGÀY TRONG THÁNG'];
      const headerRow3 = ['STT', '', '', ''];

      // Thêm các ngày trong tháng
      for (let i = 1; i <= daysInMonth; i++) {
        headerRow1.push('');
        headerRow2.push(i.toString());

        // Thêm tên thứ cho dòng 3
        const date = new Date(selectedYear, selectedMonth - 1, i);
        const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
        headerRow3.push(dayName);
      }

      // Thêm các cột tổng hợp
      const summaryColumns = [
        'Số ngày làm việc (A)',
        'Những ngày nghỉ không làm việc (B)',
        'Phép (C)',
        'BHXH (D)',
        'Học, Hội nghỉ, Tập huấn, Hợp (E)',
        'Khác (F)',
        'Tổng số ngày làm (A+B)',
        'Tổng số ngày nghỉ (C+D+E+F)',
        'Tổng cộng',
        'Ghi chú'
      ];

      summaryColumns.forEach(col => {
        headerRow1.push(col);
        headerRow2.push('');
        headerRow3.push('');
      });

      wsData.push(headerRow1);
      wsData.push(headerRow2);
      wsData.push(headerRow3);

      // Dữ liệu nhân viên
      summaryData.forEach((nv, index) => {
        const employeeData = chamCongData[nv.id] || { 1: {}, 2: {} };

        // Dòng ca 1
        const row1 = [
          index + 1,
          nv.hoTen || 'N/A',
          nv.ngayThangNamSinh || 'N/A',
          nv.khoaPhong?.tenKhoaPhong || khoaPhongName
        ];

        for (let day = 1; day <= daysInMonth; day++) {
          const shift1Symbol = employeeData[1][day] || '-';
          row1.push(shift1Symbol);
        }

        row1.push(
          nv.workDaysA,
          nv.weekendDaysB,
          nv.phepDaysC,
          nv.bhxhDaysD,
          nv.hocHoiDaysE,
          nv.khacDaysF,
          nv.tongSoNgayLamAB,
          nv.tongSoNgayNghiCDEF,
          nv.tongCong,
          nv.note
        );
        wsData.push(row1);

        // Dòng ca 2
        const row2 = ['', '', '', ''];
        for (let day = 1; day <= daysInMonth; day++) {
          const shift2Symbol = employeeData[2][day] || '-';
          row2.push(shift2Symbol);
        }
        // Thêm các ô trống cho cột tổng hợp
        summaryColumns.forEach(() => row2.push(''));
        wsData.push(row2);
      });

      // Thêm chú thích ký hiệu - CẢI THIỆN: Chia thành 2 cột
      wsData.push([]);
      wsData.push(['CHÚ THÍCH KÝ HIỆU:']);
      wsData.push([]);

      // Chia ký hiệu thành 2 cột
      const midPoint = Math.ceil(kyHieuChamCongs.length / 2);
      const leftColumn = kyHieuChamCongs.slice(0, midPoint);
      const rightColumn = kyHieuChamCongs.slice(midPoint);

      // Header cho 2 cột ký hiệu
      wsData.push(['Ký hiệu', 'Ý nghĩa', '', 'Ký hiệu', 'Ý nghĩa']);

      // Dữ liệu ký hiệu
      for (let i = 0; i < Math.max(leftColumn.length, rightColumn.length); i++) {
        const row = [];

        // Cột trái
        if (i < leftColumn.length) {
          row.push(leftColumn[i].maKyHieu, leftColumn[i].tenKyHieu);
        } else {
          row.push('', '');
        }

        row.push(''); // Cột trống giữa

        // Cột phải
        if (i < rightColumn.length) {
          row.push(rightColumn[i].maKyHieu, rightColumn[i].tenKyHieu);
        } else {
          row.push('', '');
        }

        wsData.push(row);
      }

      // Thêm ký hiệu đặc biệt
      wsData.push(['-', 'Không có dữ liệu']);

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Thiết lập độ rộng cột
      const colWidths = [
        { wch: 5 },   // STT
        { wch: 25 },  // Họ tên
        { wch: 15 },  // Ngày sinh
        { wch: 15 },  // Khoa phòng
      ];

      // Cột ngày
      for (let i = 0; i < daysInMonth; i++) {
        colWidths.push({ wch: 4 });
      }

      // Cột tổng hợp
      colWidths.push(
        { wch: 12 }, // A
        { wch: 12 }, // B
        { wch: 8 },  // C
        { wch: 8 },  // D
        { wch: 15 }, // E
        { wch: 8 },  // F
        { wch: 12 }, // A+B
        { wch: 12 }, // C+D+E+F
        { wch: 10 }, // Tổng cộng
        { wch: 25 }  // Ghi chú
      );

      ws['!cols'] = colWidths;

      // Thiết lập merge cells
      const merges = [
        // Header bệnh viện
        { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
        { s: { r: 0, c: 17 }, e: { r: 0, c: daysInMonth + 13 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
        { s: { r: 1, c: 17 }, e: { r: 1, c: daysInMonth + 13 } },

        // Tiêu đề bảng
        { s: { r: 3, c: 0 }, e: { r: 3, c: daysInMonth + 13 } },
        { s: { r: 4, c: 0 }, e: { r: 4, c: daysInMonth + 13 } },

        // Header "NGÀY TRONG THÁNG"
        { s: { r: 7, c: 4 }, e: { r: 7, c: 3 + daysInMonth } },
      ];

      // Merge cells cho từng nhân viên (STT, Họ tên, Ngày sinh, Khoa phòng)
      for (let i = 0; i < summaryData.length; i++) {
        const startRow = 9 + i * 2;
        merges.push(
          { s: { r: startRow, c: 0 }, e: { r: startRow + 1, c: 0 } }, // STT
          { s: { r: startRow, c: 1 }, e: { r: startRow + 1, c: 1 } }, // Họ tên
          { s: { r: startRow, c: 2 }, e: { r: startRow + 1, c: 2 } }, // Ngày sinh
          { s: { r: startRow, c: 3 }, e: { r: startRow + 1, c: 3 } }  // Khoa phòng
        );

        // Merge các cột tổng hợp
        for (let col = 4 + daysInMonth; col < 4 + daysInMonth + 10; col++) {
          merges.push({ s: { r: startRow, c: col }, e: { r: startRow + 1, c: col } });
        }
      }

      ws['!merges'] = merges;

      XLSX.utils.book_append_sheet(wb, ws, 'Tổng Hợp Chấm Công');

    } else {
      // Xuất dữ liệu chi tiết - CẢI THIỆN
      const wsData = [];

      // Header thông tin
      wsData.push([`BẢNG CHẤM CÔNG CHI TIẾT THÁNG ${selectedMonth}/${selectedYear}`]);
      wsData.push([`Khoa phòng: ${khoaPhongName}`]);
      wsData.push([`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`]);
      wsData.push([`Tổng số nhân viên: ${filteredEmployees.length}`]);
      wsData.push([]);

      // Header bảng - 3 dòng
      const headerRow1 = ['STT', 'Mã NV', 'Họ và Tên', 'Khoa Phòng'];
      const headerRow2 = ['', '', '', '', 'NGÀY TRONG THÁNG (CA SÁNG / CA CHIỀU)'];
      const headerRow3 = ['', '', '', ''];

      // Thêm header ngày
      for (let i = 1; i <= daysInMonth; i++) {
        headerRow1.push(i.toString());
        headerRow2.push('');

        const date = new Date(selectedYear, selectedMonth - 1, i);
        const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
        headerRow3.push(dayName);
      }

      // Thêm cột thống kê
      headerRow1.push('Số ngày làm việc', 'Số ngày nghỉ', 'Tỷ lệ chấm công (%)', 'Ghi chú');
      headerRow2.push('', '', '', '');
      headerRow3.push('', '', '', '');

      wsData.push(headerRow1);
      wsData.push(headerRow2);
      wsData.push(headerRow3);

      // Dữ liệu nhân viên
      filteredEmployees.forEach((nv, index) => {
        const employeeData = chamCongData[nv.id] || { 1: {}, 2: {} };
        let workDays = 0;
        let absentDays = 0;

        const row = [
          index + 1,
          nv.maNV || 'N/A',
          nv.hoTen || 'N/A',
          nv.khoaPhong?.tenKhoaPhong || 'N/A'
        ];

        for (let day = 1; day <= daysInMonth; day++) {
          const shift1Symbol = employeeData[1][day] || '-';
          const shift2Symbol = employeeData[2][day] || '-';

          // Hiển thị cả 2 ca
          const combinedSymbol = `${shift1Symbol}/${shift2Symbol}`;
          row.push(combinedSymbol);

          // Tính thống kê
          if (['X', 'VT', 'RT', 'S', 'C', 'T', 'T12', 'T16', 'CT'].includes(shift1Symbol)) workDays += 0.5;
          if (['X', 'VT', 'RT', 'S', 'C', 'T', 'T12', 'T16', 'CT'].includes(shift2Symbol)) workDays += 0.5;

          if (shift1Symbol !== '-' && !['X', 'VT', 'RT', 'S', 'C', 'T', 'T12', 'T16', 'CT'].includes(shift1Symbol)) absentDays += 0.5;
          if (shift2Symbol !== '-' && !['X', 'VT', 'RT', 'S', 'C', 'T', 'T12', 'T16', 'CT'].includes(shift2Symbol)) absentDays += 0.5;
        }

        const total = workDays + absentDays;
        const rate = total > 0 ? ((workDays / total) * 100).toFixed(1) : '0';

        row.push(workDays.toFixed(1), absentDays.toFixed(1), rate + '%', '');
        wsData.push(row);
      });

      // Thống kê tổng
      wsData.push([]);
      wsData.push(['THỐNG KÊ TỔNG QUAN:']);
      wsData.push([`- Tổng số nhân viên: ${filteredEmployees.length}`]);
      wsData.push([`- Nhân viên có dữ liệu chấm công: ${Object.keys(chamCongData).length}`]);
      wsData.push([`- Tỷ lệ chấm công trung bình: ${statistics.attendanceRate}%`]);

      // Chú thích ký hiệu - CẢI THIỆN: Chia thành 2 cột
      wsData.push([]);
      wsData.push(['CHÚ THÍCH KÝ HIỆU:']);
      wsData.push([]);

      // Chia ký hiệu thành 2 cột
      const midPoint = Math.ceil(kyHieuChamCongs.length / 2);
      const leftColumn = kyHieuChamCongs.slice(0, midPoint);
      const rightColumn = kyHieuChamCongs.slice(midPoint);

      // Header cho 2 cột ký hiệu
      wsData.push(['Ký hiệu', 'Ý nghĩa', '', 'Ký hiệu', 'Ý nghĩa']);

      // Dữ liệu ký hiệu
      for (let i = 0; i < Math.max(leftColumn.length, rightColumn.length); i++) {
        const row = [];

        // Cột trái
        if (i < leftColumn.length) {
          row.push(leftColumn[i].maKyHieu, leftColumn[i].tenKyHieu);
        } else {
          row.push('', '');
        }

        row.push(''); // Cột trống giữa

        // Cột phải  
        if (i < rightColumn.length) {
          row.push(rightColumn[i].maKyHieu, rightColumn[i].tenKyHieu);
        } else {
          row.push('', '');
        }

        wsData.push(row);
      }

      // Thêm ký hiệu đặc biệt
      wsData.push(['-/-', 'Không có dữ liệu cả 2 ca']);

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Thiết lập độ rộng cột
      const colWidths = [
        { wch: 5 },   // STT
        { wch: 12 },  // Mã NV
        { wch: 25 },  // Họ tên
        { wch: 15 },  // Khoa phòng
      ];

      // Cột ngày (rộng hơn vì hiển thị 2 ca)
      for (let i = 0; i < daysInMonth; i++) {
        colWidths.push({ wch: 8 });
      }

      // Cột thống kê
      colWidths.push(
        { wch: 15 }, // Số ngày làm việc
        { wch: 12 }, // Số ngày nghỉ
        { wch: 15 }, // Tỷ lệ
        { wch: 20 }  // Ghi chú
      );

      ws['!cols'] = colWidths;

      // Merge cells
      const merges = [
        // Header thông tin
        { s: { r: 0, c: 0 }, e: { r: 0, c: daysInMonth + 7 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: daysInMonth + 7 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: daysInMonth + 7 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: daysInMonth + 7 } },

        // Header "NGÀY TRONG THÁNG"
        { s: { r: 6, c: 4 }, e: { r: 6, c: 3 + daysInMonth } },
      ];

      ws['!merges'] = merges;

      XLSX.utils.book_append_sheet(wb, ws, 'Chấm Công Chi Tiết');
    }

    // Tạo tên file
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `${showSummary ? 'TongHop_' : 'ChiTiet_'}ChamCong_Thang${selectedMonth.toString().padStart(2, '0')}_${selectedYear}_${timestamp}.xlsx`;

    // Lưu file
    XLSX.writeFile(wb, fileName);
    toast.success(`Xuất file Excel ${showSummary ? 'tổng hợp' : 'chi tiết'} thành công!`);
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
          <button
            className="btn btn-success"
            onClick={exportToExcel}
            disabled={loading || filteredEmployees.length === 0}
          >
            <i className="ri-file-excel-2-line me-1"></i>
            Xuất Excel
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row align-items-end">
            {(userRole === 'ADMIN' || userRole === 'NGUOITONGHOP') && (
              <div className="col-md-3">
                <label className="form-label fw-semibold text-dark">
                  <i className="ri-building-line me-1"></i>Khoa phòng
                </label>
                <select
                  className="form-select border-2"
                  value={selectedKhoaPhongId || ''}
                  onChange={(e) => setSelectedKhoaPhongId(e.target.value ? Number(e.target.value) : null)}
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
                                className="text-center align-middle p-1"
                                style={{
                                  backgroundColor: isWeekendDay ? '#ffe6e6' : '#ffffff',
                                  minWidth: '50px',
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  border: '1px solid #dee2e6',
                                  verticalAlign: 'middle'
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
                                  >
                                    {shift2Symbol}
                                  </span>
                                </div>
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
                                    className="text-center align-middle p-1"
                                    style={{
                                      ...getCellStyle(shift1Symbol),
                                      backgroundColor: isWeekendDay && shift1Symbol === '-' ? '#ffe6e6' : getCellStyle(shift1Symbol).backgroundColor,
                                      minWidth: '30px',
                                      fontSize: '10px',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    {shift1Symbol}
                                  </td>
                                );
                              })}
                              <td rowSpan="2" className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#e6f3ff' }}>
                                {summaryItem?.workDaysA || '0.0'}
                              </td>
                              <td rowSpan="2" className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#ffe6e6' }}>
                                {summaryItem?.weekendDaysB || '0.0'}
                              </td>
                              <td rowSpan="2" className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#e6ffe6' }}>
                                {summaryItem?.phepDaysC || '0.0'}
                              </td>
                              <td rowSpan="2" className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#e6f0ff' }}>
                                {summaryItem?.bhxhDaysD || '0.0'}
                              </td>
                              <td rowSpan="2" className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#fff3e6' }}>
                                {summaryItem?.hocHoiDaysE || '0.0'}
                              </td>
                              <td rowSpan="2" className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#f0f0f0' }}>
                                {summaryItem?.khacDaysF || '0.0'}
                              </td>
                              <td rowSpan="2" className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#d9f2e6' }}>
                                {summaryItem?.tongSoNgayLamAB || '0.0'}
                              </td>
                              <td rowSpan="2" className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#ffe6e6' }}>
                                {summaryItem?.tongSoNgayNghiCDEF || '0.0'}
                              </td>
                              <td rowSpan="2" className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#fff9e6' }}>
                                {summaryItem?.tongCong || '0.0'}
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
                                    className="text-center align-middle p-1"
                                    style={{
                                      ...getCellStyle(shift2Symbol),
                                      backgroundColor: isWeekendDay && shift2Symbol === '-' ? '#ffe6e6' : getCellStyle(shift2Symbol).backgroundColor,
                                      minWidth: '30px',
                                      fontSize: '10px',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    {shift2Symbol}
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
    </div>
  );
}

export default QuanLyBangChamCong;
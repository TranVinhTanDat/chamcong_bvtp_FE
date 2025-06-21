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
  const [isInitialized, setIsInitialized] = useState(false); // Thêm flag để track initialization

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const [summaryData, setSummaryData] = useState([]);
  const [showSummary, setShowSummary] = useState(false); // Thêm dòng này

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


  // Tính toán dữ liệu tổng hợp cho từng nhân viên
  const calculateSummaryData = useCallback(() => {
    const summary = filteredEmployees.map(nv => {
      const employeeData = chamCongData[nv.id] || {};
      let workDaysA = 0;
      let absentDaysC = 0;
      let phepDays = 0;
      let bhxhDays = 0;
      let hocHoiDays = 0;
      let khacDays = 0;
      let absentNotes = []; // Lưu trữ thông tin các ngày nghỉ

      // Đếm các loại ngày và thu thập ghi chú
      for (let day = 1; day <= daysInMonth; day++) {
        const symbol = employeeData[day] || '-';

        // Số ngày làm việc (A)
        if (['X', 'x', 'VT', 'RT', 'S', 'C', 'T', 'T12', 'T16', 'CT'].includes(symbol)) {
          workDaysA++;
        }
        // Những ngày nghỉ không làm việc (C)
        else if (['N1', 'N', 'No', 'Bo', 'Co', 'Ts', 'Ds', 'KH', 'NT', 'NB'].includes(symbol)) {
          absentDaysC++;
          absentNotes.push(`- Ngày nghỉ không làm việc: ${day}`);
        }
        // Phép
        else if (['PN', 'PC', 'PT'].includes(symbol)) {
          phepDays++;
          absentNotes.push(`- Phép năm: ${day}`);
        }
        // BHXH (D) - bản thân ốm
        else if (['Bo'].includes(symbol)) {
          bhxhDays++;
          absentNotes.push(`- Nghỉ không lương: ${day}`);
        }
        // Học, Hội nghỉ, Tập huấn, Hợp (E)
        else if (['H', 'Hn', 'Hct'].includes(symbol)) {
          hocHoiDays++;
          absentNotes.push(`- Ngày nghỉ không làm việc: ${day}`);
        }
        // Các loại khác
        else if (['DL', 'KH', 'NT'].includes(symbol)) {
          khacDays++;
          absentNotes.push(`- Ngày nghỉ không làm việc: ${day}`);
        }
      }

      // Tính toán theo công thức
      const tongSoNgayLam = workDaysA;
      const tongSoNgayNghi = absentDaysC + phepDays + bhxhDays + hocHoiDays + khacDays;
      const tongCong = tongSoNgayLam + tongSoNgayNghi;

      // Format ghi chú giống như trong ảnh
      let note = '';
      if (absentNotes.length > 0) {
        // Nhóm các loại ghi chú lại
        const phepNotes = absentNotes.filter(n => n.includes('Phép năm'));
        const nghiNotes = absentNotes.filter(n => n.includes('Ngày nghỉ không làm việc'));
        const khongLuongNotes = absentNotes.filter(n => n.includes('Nghỉ không lương'));

        let noteArray = [];

        if (phepNotes.length > 0) {
          const days = phepNotes.map(n => n.split(': ')[1]).join(', ');
          noteArray.push(`- Phép năm: ${phepNotes.length}`);
        }

        if (nghiNotes.length > 0) {
          noteArray.push(`- Ngày nghỉ không làm việc: ${nghiNotes.length}`);
        }

        if (khongLuongNotes.length > 0) {
          noteArray.push(`- Nghỉ không lương: ${khongLuongNotes.length}`);
        }

        note = noteArray.join('\n');
      }

      return {
        ...nv,
        workDaysA,
        absentDaysC,
        phepDays,
        bhxhDays,
        hocHoiDays,
        khacDays,
        tongSoNgayLam,
        tongSoNgayNghi,
        tongCong,
        note
      };
    });

    return summary;
  }, [filteredEmployees, chamCongData, daysInMonth, kyHieuChamCongs]);


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
      // Lấy danh sách nhân viên
      const nhanVienResponse = await axiosInstance.get('/nhanvien', {
        params: { khoaPhongId: khoaPhongIdToUse, page: 0, size: 100 },
      });
      const nhanVienData = nhanVienResponse.data.content || [];
      setNhanViens(nhanVienData);
      setFilteredEmployees(nhanVienData);

      if (nhanVienData.length === 0 && showNoDataToast) {
        toast.warn('Không có nhân viên nào trong khoa phòng này.');
      }
      // Lấy dữ liệu chấm công
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
      (chamCongResponse.data.content || []).forEach(record => {
        const thoiGianCheckIn = record.thoiGianCheckIn;
        let day;

        if (thoiGianCheckIn) {
          const datePart = thoiGianCheckIn.split(' ')[0];
          const [dayStr, monthStr, yearStr] = datePart.split('-');
          day = parseInt(dayStr, 10);
          const recordMonth = parseInt(monthStr, 10);
          const recordYear = parseInt(yearStr, 10);

          if (recordMonth !== selectedMonth || recordYear !== selectedYear) {
            console.warn('Dữ liệu không đúng tháng/năm:', record);
            return;
          }
        }

        const nhanVienId = record.nhanVien?.id;

        if (nhanVienId && day && day >= 1 && day <= daysInMonth) {
          if (!chamCongMap[nhanVienId]) {
            chamCongMap[nhanVienId] = {};
          }

          if (record.trangThaiChamCong?.id === 2 && record.kyHieuChamCong) {
            chamCongMap[nhanVienId][day] = record.kyHieuChamCong.maKyHieu || 'N';
          } else if (record.trangThaiChamCong?.id === 1 && record.caLamViec) {
            chamCongMap[nhanVienId][day] =
              record.caLamViec.kyHieuChamCong?.maKyHieu || 'x';
          } else {
            chamCongMap[nhanVienId][day] = '-';
          }
        } else {
          console.warn('Record thiếu thông tin hoặc ngày không hợp lệ:', record);
        }
      });

      // Lọc dữ liệu chấm công chỉ cho nhân viên có trong nhanViens
      const filteredChamCongData = Object.keys(chamCongMap).reduce((acc, nhanVienId) => {
        if (nhanVienData.some(nv => nv.id === parseInt(nhanVienId))) {
          acc[nhanVienId] = chamCongMap[nhanVienId];
        }
        return acc;
      }, {});
      setChamCongData(filteredChamCongData);

      // Chỉ hiển thị toast khi showNoDataToast = true và không có dữ liệu
      if (showNoDataToast && Object.keys(filteredChamCongData).length === 0 && nhanVienData.length > 0) {
        toast.warn('Không có dữ liệu chấm công cho tháng này.');
      }

      // Lấy danh sách ký hiệu chấm công chỉ lần đầu hoặc khi cần thiết
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
        await fetchData(false); // Không hiển thị toast lần đầu
        setIsInitialized(true);
      }
    };

    initializeData();
  }, [isInitialized, fetchKhoaPhongs, fetchData]);

  // Tải dữ liệu khi thay đổi khoa phòng, tháng hoặc năm (chỉ sau khi đã initialize)
  useEffect(() => {
    if (isInitialized) {
      fetchData(true); // Hiển thị toast khi user thay đổi filter
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
  // Xuất file Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const khoaPhongName = khoaPhongs.find(kp => kp.id === selectedKhoaPhongId)?.tenKhoaPhong ||
      nhanViens[0]?.khoaPhong?.tenKhoaPhong || 'TC-HCQT';

    if (showSummary) {
      // Xuất dữ liệu tổng hợp
      const summaryData = calculateSummaryData();
      const wsData = [];

      // Header chính - 3 dòng đầu
      wsData.push(['BỆNH VIỆN QUẬN TÂN PHÚ', '', '', '', '', '', '', '', '', '', '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM']);
      wsData.push(['PHÒNG ' + khoaPhongName, '', '', '', '', '', '', '', '', '', '', 'Độc lập - Tự do - Hạnh phúc']);
      wsData.push([]);
      wsData.push([`BẢNG TỔNG HỢP CHẤM CÔNG`]);
      wsData.push([`THÁNG ${selectedMonth} NĂM ${selectedYear}`]);
      wsData.push([]);

      // Bảng chấm công chi tiết
      const headerRow1 = ['', 'Họ Tên', 'Ngày tháng năm sinh', 'Khoa/phòng'];
      const headerRow2 = ['', '', '', '', 'NGÀY TRONG THÁNG'];

      // Thêm các ngày trong tháng
      for (let i = 1; i <= daysInMonth; i++) {
        headerRow1.push('');
        headerRow2.push(i.toString());
      }

      // Thêm các cột tổng hợp
      headerRow1.push('Số ngày làm việc (A)', 'Những ngày nghỉ không làm việc (C)', 'Phép', 'BHXH (D)', 'Học, Hội nghỉ, Tập huấn, Hợp (E)', 'Khác (F)', 'Tổng số ngày làm (A+B)', 'Tổng số ngày nghỉ (C+D+E+F)', 'Tổng cộng', 'Ghi chú');
      headerRow2.push('', '', '', '', '', '', '', '', '', '');

      wsData.push(headerRow1);
      wsData.push(headerRow2);

      // Dòng phụ đề cho các cột
      const subHeaderRow = ['STT', '', '', ''];
      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(selectedYear, selectedMonth - 1, i);
        const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
        subHeaderRow.push(dayName);
      }
      subHeaderRow.push('(B)', '', '', '', '', '', '', '', '', '');
      wsData.push(subHeaderRow);

      // Dữ liệu nhân viên
      summaryData.forEach((nv, index) => {
        const employeeData = chamCongData[nv.id] || {};
        const row = [
          index + 1,
          nv.hoTen || 'N/A',
          nv.ngayThangNamSinh || 'N/A',
          nv.khoaPhong?.tenKhoaPhong || khoaPhongName
        ];

        // Thêm dữ liệu chấm công cho từng ngày
        for (let day = 1; day <= daysInMonth; day++) {
          const symbol = employeeData[day] || '';
          row.push(symbol);
        }

        // Thêm các cột tổng hợp
        row.push(
          nv.workDaysA,        // Số ngày làm việc (A)
          nv.absentDaysC,      // Những ngày nghỉ không làm việc (C)
          nv.phepDays,         // Phép
          nv.bhxhDays,         // BHXH (F)
          nv.hocHoiDays,       // Học, Hội nghỉ, Tập huấn, Hợp (E)
          nv.khacDays,         // Khác (H)
          nv.tongSoNgayLam,    // Tổng số ngày làm (A+B+C+D)
          nv.tongSoNgayNghi,   // Tổng số ngày nghỉ (E+F+G+H)
          nv.tongCong,         // Tổng cộng
          nv.note              // Ghi chú
        );
        wsData.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Thiết lập độ rộng cột
      const colWidths = [
        { wch: 5 },   // STT
        { wch: 20 },  // Họ tên
        { wch: 15 },  // Ngày sinh
        { wch: 15 },  // Khoa phòng
      ];

      // Độ rộng cho các ngày
      for (let i = 0; i < daysInMonth; i++) {
        colWidths.push({ wch: 4 });
      }

      // Độ rộng cho các cột tổng hợp
      colWidths.push(
        { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 8 },
        { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
        { wch: 10 }, { wch: 20 }
      );

      ws['!cols'] = colWidths;

      // Merge cells cho header
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },   // BỆNH VIỆN QUẬN TÂN PHÚ
        { s: { r: 0, c: 11 }, e: { r: 0, c: daysInMonth + 13 } }, // CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
        { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },   // PHÒNG
        { s: { r: 1, c: 11 }, e: { r: 1, c: daysInMonth + 13 } }, // Độc lập - Tự do - Hạnh phúc
        { s: { r: 3, c: 0 }, e: { r: 3, c: daysInMonth + 13 } }, // BẢNG TỔNG HỢP CHẤM CÔNG
        { s: { r: 4, c: 0 }, e: { r: 4, c: daysInMonth + 13 } }, // THÁNG X NĂM YYYY
        { s: { r: 6, c: 4 }, e: { r: 6, c: 3 + daysInMonth } },  // NGÀY TRONG THÁNG
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Tổng Hợp Chấm Công');

    } else {
      // Xuất dữ liệu thông thường (code cũ)
      const wsData = [];
      wsData.push([`BẢNG CHẤM CÔNG THÁNG ${selectedMonth}/${selectedYear}`]);
      const khoaPhongName = khoaPhongs.find(kp => kp.id === selectedKhoaPhongId)?.tenKhoaPhong ||
        nhanViens[0]?.khoaPhong?.tenKhoaPhong || 'N/A';
      wsData.push([`Khoa phòng: ${khoaPhongName}`]);
      wsData.push([`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`]);
      wsData.push([]);

      const headerRow = ['STT', 'Mã NV', 'Họ và Tên', 'Khoa Phòng'];
      for (let i = 1; i <= daysInMonth; i++) {
        headerRow.push(i.toString());
      }
      headerRow.push('Tổng làm việc', 'Tổng nghỉ', 'Tỷ lệ (%)', 'Ghi chú');
      wsData.push(headerRow);

      filteredEmployees.forEach((nv, index) => {
        const employeeData = chamCongData[nv.id] || {};
        let workDays = 0;
        let absentDays = 0;

        const row = [index + 1, nv.maNV || 'N/A', nv.hoTen || 'N/A', nv.khoaPhong?.tenKhoaPhong || 'N/A'];

        for (let day = 1; day <= daysInMonth; day++) {
          const symbol = employeeData[day] || '-';
          row.push(symbol);

          if (['x', 'VT', 'RT', 'S', 'C', 'T', 'T12', 'T16', 'CT'].includes(symbol)) {
            workDays++;
          } else if (symbol !== '-') {
            absentDays++;
          }
        }

        const total = workDays + absentDays;
        const rate = total > 0 ? ((workDays / total) * 100).toFixed(1) : '0';
        row.push(workDays, absentDays, rate + '%', '');
        wsData.push(row);
      });

      wsData.push([]);
      wsData.push(['CHÚ THÍCH KÝ HIỆU:']);
      const legendRow = [];
      kyHieuChamCongs.forEach(kh => {
        legendRow.push(`${kh.maKyHieu}: ${kh.tenKyHieu}`);
      });
      wsData.push(legendRow);
      wsData.push(['-: Không có dữ liệu']);

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      const colWidths = [{ wch: 5 }, { wch: 10 }, { wch: 25 }, { wch: 15 }];
      for (let i = 0; i < daysInMonth; i++) {
        colWidths.push({ wch: 4 });
      }
      colWidths.push({ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 });
      ws['!cols'] = colWidths;

      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: daysInMonth + 7 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: daysInMonth + 7 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: daysInMonth + 7 } },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Chấm Công');
    }

    const fileName = `${showSummary ? 'TongHop_' : ''}ChamCong_Thang${selectedMonth.toString().padStart(2, '0')}_${selectedYear}_${new Date().getTime()}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Xuất file Excel thành công!');
  };
  const isWeekend = (day) => {
    const date = new Date(selectedYear, selectedMonth - 1, day);
    return date.getDay() === 0 || date.getDay() === 6;
  };

  // Hàm refresh với toast
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
                // Bảng chấm công chi tiết
                <table className="table table-hover mb-0">
                  <thead className="sticky-top" style={{ backgroundColor: '#4e73df', color: 'white', zIndex: 1 }}>
                    <tr>
                      <th className="text-center py-3" style={{ minWidth: '60px', fontSize: '14px' }}>STT</th>
                      <th className="text-center py-3" style={{ minWidth: '100px', fontSize: '14px' }}>Mã NV</th>
                      <th className="py-3" style={{ minWidth: '200px', fontSize: '14px' }}>Họ và Tên</th>
                      <th className="text-center py-3" style={{ minWidth: '120px', fontSize: '14px' }}>Khoa Phòng</th>
                      {Array.from({ length: daysInMonth }, (_, i) => (
                        <th
                          key={i + 1}
                          className="text-center py-3"
                          style={{
                            minWidth: '35px',
                            fontSize: '12px',
                            backgroundColor: isWeekend(i + 1) ? '#dc3545' : '#4e73df',
                            color: 'white',
                          }}
                        >
                          {i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((nv, index) => (
                      <tr key={nv.id} className="border-bottom">
                        <td className="text-center align-middle py-3 fw-semibold">{index + 1}</td>
                        <td className="text-center align-middle py-3">
                          <span className="badge bg-light text-dark">{nv.maNV || 'N/A'}</span>
                        </td>
                        <td className="align-middle py-3 fw-semibold">{nv.hoTen}</td>
                        <td className="text-center align-middle py-3">
                          <small className="text-muted">{nv.khoaPhong?.tenKhoaPhong || 'N/A'}</small>
                        </td>
                        {Array.from({ length: daysInMonth }, (_, day) => {
                          const symbol = chamCongData[nv.id]?.[day + 1] || '-';
                          const isWeekendDay = isWeekend(day + 1);
                          return (
                            <td
                              key={day + 1}
                              className="text-center align-middle p-1"
                              style={{
                                ...getCellStyle(symbol),
                                backgroundColor: isWeekendDay && symbol === '-' ? '#ffe6e6' : getCellStyle(symbol).backgroundColor,
                                minWidth: '35px',
                                minHeight: '35px',
                              }}
                            >
                              <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '30px' }}>
                                {symbol}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                // Bảng tổng hợp
                <table className="table table-hover mb-0">
                  <thead className="sticky-top" style={{ backgroundColor: '#4e73df', color: 'white', zIndex: 1 }}>
                    <tr>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '60px', fontSize: '12px' }}>STT</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '180px', fontSize: '12px' }}>Họ và Tên</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '120px', fontSize: '12px' }}>Ngày tháng năm sinh</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '100px', fontSize: '12px' }}>Khoa/phòng</th>
                      <th colSpan={daysInMonth} className="text-center py-2" style={{ fontSize: '12px', color: '#ff0000' }}>NGÀY TRONG THÁNG</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '80px', fontSize: '10px', backgroundColor: '#ffa500' }}>Số ngày làm việc (A)</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '80px', fontSize: '10px', backgroundColor: '#ff6b6b' }}>Những ngày nghỉ không làm việc (C)</th>
                      <th rowSpan="3" className="text-center align-middle py-3" style={{ minWidth: '60px', fontSize: '10px', backgroundColor: '#51cf66' }}>Phép</th>
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
                      const summaryData = calculateSummaryData(); // Sử dụng hàm đã sửa
                      return summaryData.map((nv, index) => (
                        <tr key={nv.id} className="border-bottom">
                          <td className="text-center align-middle py-2 fw-semibold" style={{ fontSize: '12px' }}>{index + 1}</td>
                          <td className="align-middle py-2 fw-semibold" style={{ fontSize: '12px' }}>{nv.hoTen}</td>
                          <td className="text-center align-middle py-2" style={{ fontSize: '11px' }}>
                            {nv.ngayThangNamSinh}
                          </td>
                          <td className="text-center align-middle py-2" style={{ fontSize: '11px' }}>
                            {nv.khoaPhong?.tenKhoaPhong || 'N/A'}
                          </td>
                          {Array.from({ length: daysInMonth }, (_, day) => {
                            const symbol = chamCongData[nv.id]?.[day + 1] || '';
                            const isWeekendDay = isWeekend(day + 1);
                            return (
                              <td
                                key={day + 1}
                                className="text-center align-middle p-1"
                                style={{
                                  ...getCellStyle(symbol || '-'),
                                  backgroundColor: isWeekendDay && !symbol ? '#ffe6e6' : getCellStyle(symbol || '-').backgroundColor,
                                  minWidth: '30px',
                                  fontSize: '10px',
                                  fontWeight: 'bold'
                                }}
                              >
                                {symbol}
                              </td>
                            );
                          })}
                          <td className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#fff3cd' }}>
                            {nv.workDaysA}
                          </td>
                          <td className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#f8d7da' }}>
                            {nv.absentDaysC}
                          </td>
                          <td className="text-center align-middle py-2" style={{ fontSize: '12px' }}>
                            {nv.phepDays}
                          </td>
                          <td className="text-center align-middle py-2" style={{ fontSize: '12px' }}>
                            {nv.bhxhDays}
                          </td>
                          <td className="text-center align-middle py-2" style={{ fontSize: '12px' }}>
                            {nv.hocHoiDays}
                          </td>
                          <td className="text-center align-middle py-2" style={{ fontSize: '12px' }}>
                            {nv.khacDays}
                          </td>
                          <td className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#d4edda' }}>
                            {nv.tongSoNgayLam}
                          </td>
                          <td className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#f8d7da' }}>
                            {nv.tongSoNgayNghi}
                          </td>
                          <td className="text-center align-middle py-2" style={{ fontSize: '12px', backgroundColor: '#fff3cd' }}>
                            {nv.tongCong}
                          </td>
                          <td className="align-middle py-2" style={{
                            fontSize: '11px',
                            whiteSpace: 'pre-line',  // Cho phép xuống dòng với \n
                            lineHeight: '1.4',       // Tăng khoảng cách dòng
                            verticalAlign: 'top',    // Canh trên
                            maxWidth: '150px'        // Giới hạn chiều rộng
                          }}>
                            {nv.note}
                          </td>
                        </tr>
                      ));
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
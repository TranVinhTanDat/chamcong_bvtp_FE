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
  const [selectedKhoaPhongId, setSelectedKhoaPhongId] = useState(
    userRole === 'ADMIN' ? Number(userKhoaPhongId) : null
  );
  const [isInitialized, setIsInitialized] = useState(false);

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const [summaryData, setSummaryData] = useState([]);
  const [showSummary, setShowSummary] = useState(false);

  const [selectedYearForExport, setSelectedYearForExport] = useState(new Date().getFullYear());



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

        // F. Khác (tất cả các loại khác: DL, NB, Co, Ts, Ds, KH, NT, N, No, K)
        if (['DL', 'NB', 'Co', 'Ts', 'Ds', 'KH', 'NT', 'N', 'No', 'K'].includes(shift1Symbol)) {
          khacDaysF += 0.5;
          absentNotes.push(`Khác (${shift1Symbol}): ${day} (ca sáng)`);
        }
        if (['DL', 'NB', 'Co', 'Ts', 'Ds', 'KH', 'NT', 'N', 'No', 'K'].includes(shift2Symbol)) {
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

        // *** LOGIC CHÍNH: Xử lý từng nhóm (nhân viên + ngày) ***
        Object.keys(groupedRecords).forEach((dateKey) => {
          const records = groupedRecords[dateKey];
          const [nhanVienId, day] = dateKey.split('_');
          const nhanVienIdNum = parseInt(nhanVienId);
          const dayNum = parseInt(day);

          if (dayNum >= 1 && dayNum <= daysInMonth) {
            if (!chamCongMap[nhanVienIdNum]) {
              chamCongMap[nhanVienIdNum] = { 1: {}, 2: {} };
            }

            // *** QUAN TRỌNG: Sắp xếp theo thời gian (cũ nhất đầu tiên) ***
            records.sort((a, b) => {
              const parseDate = (dateStr) => {
                if (!dateStr) return new Date();
                const [datePart, timePart] = dateStr.split(' ');
                const [day, month, year] = datePart.split('-');
                return new Date(`${year}-${month}-${day}T${timePart}`);
              };
              return new Date(parseDate(a.thoiGianCheckIn)) - new Date(parseDate(b.thoiGianCheckIn));
            });

            // *** LOGIC ĐỒNG BỘ: Gán shift theo thứ tự tuần tự ***
            records.forEach((record, index) => {
              if (index < 2) { // Chỉ xử lý 2 bản ghi đầu tiên
                const shift = index + 1; // index 0 -> shift 1, index 1 -> shift 2

                // *** LOGIC XÁC ĐỊNH KÝ HIỆU HIỂN THỊ ***
                let symbol = '-';
                if (record.trangThaiChamCong?.id === 2 && record.kyHieuChamCong) {
                  // Trạng thái NGHỈ - hiển thị ký hiệu chấm công
                  symbol = record.kyHieuChamCong.maKyHieu || 'N';
                } else if (record.trangThaiChamCong?.id === 1 && record.caLamViec) {
                  // Trạng thái LÀM - hiển thị ký hiệu ca làm việc
                  symbol = record.caLamViec.kyHieuChamCong?.maKyHieu || 'X';
                }

                // Gán ký hiệu vào map
                chamCongMap[nhanVienIdNum][shift][dayNum] = symbol;

                // Debug logging
                console.log(`Employee ${nhanVienIdNum}, Day ${dayNum}, Shift ${shift}: ${symbol}`, {
                  trangThaiId: record.trangThaiChamCong?.id,
                  kyHieuChamCong: record.kyHieuChamCong?.maKyHieu,
                  caLamViecKyHieu: record.caLamViec?.kyHieuChamCong?.maKyHieu,
                  thoiGian: record.thoiGianCheckIn
                });
              }
            });
          }
        });

        // *** LOGGING TỔNG QUAN ***
        console.log('QuanLyBangChamCong - Processed attendance data:', {
          totalRecords: chamCongResponse.data.content?.length || 0,
          groupedRecords: Object.keys(groupedRecords).length,
          processedEmployees: Object.keys(chamCongMap).length,
          sampleData: Object.keys(chamCongMap).slice(0, 3).map(id => ({
            employeeId: id,
            shift1Data: Object.keys(chamCongMap[id]?.[1] || {}).length,
            shift2Data: Object.keys(chamCongMap[id]?.[2] || {}).length
          }))
        });
      }

      // *** QUAN TRỌNG: Lọc dữ liệu để chỉ hiển thị nhân viên có trong danh sách ***
      const filteredChamCongData = Object.keys(chamCongMap).reduce((acc, nhanVienId) => {
        if (nhanVienData.some(nv => nv.id === parseInt(nhanVienId))) {
          acc[nhanVienId] = chamCongMap[nhanVienId];
        }
        return acc;
      }, {});

      setChamCongData(filteredChamCongData);

      console.log('QuanLyBangChamCong - Processed attendance data:', {
        totalRecords: chamCongResponse.data.content?.length || 0,
        processedEmployees: Object.keys(chamCongMap).length,
        sampleData: Object.keys(chamCongMap).slice(0, 3).map(id => ({
          employeeId: id,
          shift1Data: Object.keys(chamCongMap[id]?.[1] || {}).length,
          shift2Data: Object.keys(chamCongMap[id]?.[2] || {}).length
        }))
      });

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
      worksheet.getCell(2, 1).value = `PHÒNG ${khoaPhongName}`;

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
      const summaryHeaders = [
        'Số ngày làm việc (A)', 'Ngày nghỉ không làm việc (B)', 'Phép (C)', 'BHXH (D)',
        'Học/Hội nghị/Tập huấn (E)', 'Khác (F)', 'Tổng ngày làm (A+B)',
        'Tổng ngày nghỉ (C+D+E+F)', 'Tổng cộng', 'Ghi chú'
      ];

      summaryHeaders.forEach((header, index) => {
        const col = 6 + daysInMonth + index;
        worksheet.mergeCells(headerRow, col, headerRow + 2, col);
        worksheet.getCell(headerRow, col).value = header;
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
        const summaryValues = [
          nv.workDaysA, nv.weekendDaysB, nv.phepDaysC, nv.bhxhDaysD,
          nv.hocHoiDaysE, nv.khacDaysF, nv.tongSoNgayLamAB,
          nv.tongSoNgayNghiCDEF, nv.tongCong, nv.note
        ];

        summaryValues.forEach((data, index) => {
          const col = 6 + daysInMonth + index;
          worksheet.mergeCells(currentRow, col, currentRow + 1, col);
          worksheet.getCell(currentRow, col).value = data;
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
      for (let row = headerRow; row <= headerRow + 2; row++) {
        for (let col = 1; col <= totalCols; col++) {
          worksheet.getCell(row, col).style = headerStyle;
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
      worksheet.getCell(2, 1).value = `PHÒNG ${khoaPhongName}`;

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
  const exportToExcelYearly = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const khoaPhongName = khoaPhongs.find(kp => kp.id === selectedKhoaPhongId)?.tenKhoaPhong ||
        nhanViens[0]?.khoaPhong?.tenKhoaPhong || 'TC-HCQT';

      // Lấy danh sách ký hiệu chấm công
      let yearlyKyHieuChamCongs = [];
      try {
        const kyHieuResponse = await axiosInstance.get('/ky-hieu-cham-cong');
        yearlyKyHieuChamCongs = kyHieuResponse.data.filter(kyHieu => kyHieu.trangThai);
      } catch (error) {
        console.error('Lỗi khi tải ký hiệu chấm công:', error);
        yearlyKyHieuChamCongs = kyHieuChamCongs || []; // Fallback về biến hiện tại nếu có lỗi
      }

      // Lặp qua 12 tháng
      for (let month = 1; month <= 12; month++) {
        // Tính số ngày trong tháng
        const monthDaysInMonth = new Date(selectedYearForExport, month, 0).getDate();

        // Lấy dữ liệu chấm công cho tháng này
        let monthChamCongData = {};
        let monthFilteredEmployees = [];

        try {
          const khoaPhongIdToUse = selectedKhoaPhongId || userKhoaPhongId;

          // Lấy dữ liệu nhân viên
          const nhanVienResponse = await axiosInstance.get('/nhanvien', {
            params: { khoaPhongId: khoaPhongIdToUse, page: 0, size: 100 },
          });
          monthFilteredEmployees = nhanVienResponse.data.content || [];

          // Lấy dữ liệu chấm công cho tháng
          const chamCongResponse = await axiosInstance.get('/chamcong/lichsu', {
            params: {
              year: selectedYearForExport,
              month: month,
              khoaPhongId: khoaPhongIdToUse,
              page: 0,
              size: 1000,
            },
          });

          // Xử lý dữ liệu chấm công giống như trong fetchData
          const chamCongMap = {};
          if (chamCongResponse.data.content && Array.isArray(chamCongResponse.data.content)) {
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

                  if (recordMonth !== month || recordYear !== selectedYearForExport) {
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

            // Xử lý từng nhóm
            Object.keys(groupedRecords).forEach((dateKey) => {
              const records = groupedRecords[dateKey];
              const [nhanVienId, day] = dateKey.split('_');
              const nhanVienIdNum = parseInt(nhanVienId);
              const dayNum = parseInt(day);

              if (dayNum >= 1 && dayNum <= monthDaysInMonth) {
                if (!chamCongMap[nhanVienIdNum]) {
                  chamCongMap[nhanVienIdNum] = { 1: {}, 2: {} };
                }

                records.sort((a, b) => {
                  const parseDate = (dateStr) => {
                    if (!dateStr) return new Date();
                    const [datePart, timePart] = dateStr.split(' ');
                    const [day, month, year] = datePart.split('-');
                    return new Date(`${year}-${month}-${day}T${timePart}`);
                  };
                  return new Date(parseDate(a.thoiGianCheckIn)) - new Date(parseDate(b.thoiGianCheckIn));
                });

                records.forEach((record, index) => {
                  if (index < 2) {
                    const shift = index + 1;
                    let symbol = '-';
                    if (record.trangThaiChamCong?.id === 2 && record.kyHieuChamCong) {
                      symbol = record.kyHieuChamCong.maKyHieu || 'N';
                    } else if (record.trangThaiChamCong?.id === 1 && record.caLamViec) {
                      symbol = record.caLamViec.kyHieuChamCong?.maKyHieu || 'X';
                    }
                    chamCongMap[nhanVienIdNum][shift][dayNum] = symbol;
                  }
                });
              }
            });
          }

          monthChamCongData = Object.keys(chamCongMap).reduce((acc, nhanVienId) => {
            if (monthFilteredEmployees.some(nv => nv.id === parseInt(nhanVienId))) {
              acc[nhanVienId] = chamCongMap[nhanVienId];
            }
            return acc;
          }, {});

        } catch (error) {
          console.error(`Lỗi khi lấy dữ liệu tháng ${month}:`, error);
          // Tiếp tục với tháng tiếp theo nếu có lỗi
          monthChamCongData = {};
          monthFilteredEmployees = [];
        }

        // Tính toán dữ liệu tổng hợp cho tháng này
        const monthSummaryData = monthFilteredEmployees.map(nv => {
          const employeeData = monthChamCongData[nv.id] || { 1: {}, 2: {} };

          let workDaysA = 0;
          let weekendDaysB = 0;
          let phepDaysC = 0;
          let bhxhDaysD = 0;
          let hocHoiDaysE = 0;
          let khacDaysF = 0;

          for (let day = 1; day <= monthDaysInMonth; day++) {
            const shift1Symbol = employeeData[1][day] || '-';
            const shift2Symbol = employeeData[2][day] || '-';

            // Tính toán theo logic hiện tại
            if (['X', 'VT', 'RT', 'S', 'C', 'T', 'T12', 'T16', 'CT'].includes(shift1Symbol)) {
              workDaysA += 0.5;
            }
            if (['X', 'VT', 'RT', 'S', 'C', 'T', 'T12', 'T16', 'CT'].includes(shift2Symbol)) {
              workDaysA += 0.5;
            }

            if (shift1Symbol === 'N1') weekendDaysB += 0.5;
            if (shift2Symbol === 'N1') weekendDaysB += 0.5;

            if (['PN', 'PC', 'PT'].includes(shift1Symbol)) phepDaysC += 0.5;
            if (['PN', 'PC', 'PT'].includes(shift2Symbol)) phepDaysC += 0.5;

            if (shift1Symbol === 'Bo') bhxhDaysD += 0.5;
            if (shift2Symbol === 'Bo') bhxhDaysD += 0.5;

            if (['H', 'Hn', 'Hct'].includes(shift1Symbol)) hocHoiDaysE += 0.5;
            if (['H', 'Hn', 'Hct'].includes(shift2Symbol)) hocHoiDaysE += 0.5;

            if (['DL', 'NB', 'Co', 'Ts', 'Ds', 'KH', 'NT', 'N', 'No', 'K'].includes(shift1Symbol)) khacDaysF += 0.5;
            if (['DL', 'NB', 'Co', 'Ts', 'Ds', 'KH', 'NT', 'N', 'No', 'K'].includes(shift2Symbol)) khacDaysF += 0.5;
          }

          const tongSoNgayLamAB = workDaysA + weekendDaysB + phepDaysC;
          const tongSoNgayNghiCDEF = phepDaysC + bhxhDaysD + hocHoiDaysE + khacDaysF;
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

        // Tạo worksheet cho tháng
        const worksheet = workbook.addWorksheet(`T${month}`);
        const totalCols = 5 + monthDaysInMonth + 10; // Thêm 1 cột cho Mã NV

        // 1. HEADER THÔNG TIN BỆNH VIỆN
        worksheet.mergeCells(1, 1, 1, Math.floor(totalCols / 2));
        worksheet.getCell(1, 1).value = 'BỆNH VIỆN QUẬN TÂN PHÚ';

        worksheet.mergeCells(1, Math.floor(totalCols / 2) + 1, 1, totalCols);
        worksheet.getCell(1, Math.floor(totalCols / 2) + 1).value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';

        worksheet.mergeCells(2, 1, 2, Math.floor(totalCols / 2));
        worksheet.getCell(2, 1).value = `PHÒNG ${khoaPhongName}`;

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

        const summaryHeaders = [
          'Số ngày làm việc (A)', 'Ngày nghỉ không làm việc (B)', 'Phép (C)', 'BHXH (D)',
          'Học/Hội nghị/Tập huấn (E)', 'Khác (F)', 'Tổng ngày làm (A+B)',
          'Tổng ngày nghỉ (C+D+E+F)', 'Tổng cộng', 'Ghi chú'
        ];

        summaryHeaders.forEach((header, index) => {
          const col = 6 + monthDaysInMonth + index;
          worksheet.mergeCells(headerRow, col, headerRow + 2, col);
          worksheet.getCell(headerRow, col).value = header;
        });

        // 4. DỮ LIỆU NHÂN VIÊN
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

          for (let day = 1; day <= monthDaysInMonth; day++) {
            const shift1Symbol = employeeData[1][day] || '-';
            const shift2Symbol = employeeData[2][day] || '-';

            worksheet.getCell(currentRow, 5 + day).value = shift1Symbol;
            worksheet.getCell(currentRow + 1, 5 + day).value = shift2Symbol;
          }

          const summaryValues = [
            nv.workDaysA, nv.weekendDaysB, nv.phepDaysC, nv.bhxhDaysD,
            nv.hocHoiDaysE, nv.khacDaysF, nv.tongSoNgayLamAB,
            nv.tongSoNgayNghiCDEF, nv.tongCong, nv.note
          ];

          summaryValues.forEach((data, index) => {
            const col = 6 + monthDaysInMonth + index;
            worksheet.mergeCells(currentRow, col, currentRow + 1, col);
            worksheet.getCell(currentRow, col).value = data;
          });

          currentRow += 2;
        });

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

        for (let row = headerRow; row <= headerRow + 2; row++) {
          for (let col = 1; col <= totalCols; col++) {
            worksheet.getCell(row, col).style = headerStyle;
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
        worksheet.getColumn(1).width = 5;   // STT
        worksheet.getColumn(2).width = 12;  // Mã NV
        worksheet.getColumn(3).width = 25;  // Họ tên
        worksheet.getColumn(4).width = 15;  // Ngày sinh
        worksheet.getColumn(5).width = 15;  // Khoa phòng

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
            const dayColumn = 5 + day; // Cập nhật vị trí cột ngày

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

        // 8. CHÚ THÍCH KÝ HIỆU (THÊM CHO TẤT CẢ CÁC THÁNG)
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
      }

      // 9. XUẤT FILE
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

      toast.success(`Xuất file Excel tổng hợp năm ${selectedYearForExport} thành công!`);
    } catch (error) {
      console.error('Lỗi xuất Excel theo năm:', error);
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
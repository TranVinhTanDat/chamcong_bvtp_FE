import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { toast } from 'react-toastify';

function ChamCong() {
  const [formData, setFormData] = useState({
    nhanVienId: '',
    trangThai: 'LÀM',
    caLamViecId: '',
    kyHieuChamCong: '',
    ghiChu: ''
  });
  const [loading, setLoading] = useState(true);
  const [allNhanViens, setAllNhanViens] = useState([]);
  const [filteredNhanViens, setFilteredNhanViens] = useState([]);
  const [kyHieuChamCongs, setKyHieuChamCongs] = useState([]);
  const [caLamViecs, setCaLamViecs] = useState([]);
  const [khoaPhongs, setKhoaPhongs] = useState([]);
  const [selectedNhanVien, setSelectedNhanVien] = useState(null);
  const [isNghiModalOpen, setIsNghiModalOpen] = useState(false);

  // Logic 2 dòng cố định: sáng (shift 1) và chiều (shift 2)
  const [checkInStatus, setCheckInStatus] = useState({}); // {nhanVienId_shift: 'LÀM'/'NGHỈ'/null}
  const [chamCongDetails, setChamCongDetails] = useState({}); // {nhanVienId_shift: chamCongData}

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterDay, setFilterDay] = useState(new Date().getDate());
  const [filterKhoaPhongId, setFilterKhoaPhongId] = useState(null);
  const [userRole, setUserRole] = useState(localStorage.getItem('role'));
  const [userKhoaPhongId, setUserKhoaPhongId] = useState(localStorage.getItem('khoaPhongId'));
  const [selectedCaLamViec, setSelectedCaLamViec] = useState({}); // {nhanVienId_shift: caId}
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingChamCong, setEditingChamCong] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null); // Track which shift is being processed

  // Bulk attendance states
  const [selectedKhoaPhongForBulk, setSelectedKhoaPhongForBulk] = useState('');
  const [selectedShiftForBulk, setSelectedShiftForBulk] = useState(1);
  const [selectedCaForBulk, setSelectedCaForBulk] = useState('');
  const [isBulkNghiModalOpen, setIsBulkNghiModalOpen] = useState(false);
  const [bulkKyHieuChamCong, setBulkKyHieuChamCong] = useState('');
  const [bulkGhiChu, setBulkGhiChu] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const itemsPerPage = 10;

  // Parse date from backend format (dd-MM-yyyy HH:mm:ss)
  const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    const [datePart, timePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('-');
    return new Date(`${year}-${month}-${day}T${timePart}`);
  };

  // Generate years (last 10 years)
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  // Generate months
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Generate days based on year/month
  const getDaysInMonth = (year, month) => {
    if (!year || !month) return [];
    const days = new Date(year, month, 0).getDate();
    return Array.from({ length: days }, (_, i) => i + 1);
  };

  // Filter employees based on search term
  const filterNhanViens = (nhanViens, term) => {
    if (!term) return nhanViens;
    const lowerCaseTerm = term.toLowerCase();
    return nhanViens.filter(
      (nv) =>
        (nv.maNV && nv.maNV.toLowerCase().includes(lowerCaseTerm)) ||
        (nv.hoTen && nv.hoTen.toLowerCase().includes(lowerCaseTerm))
    );
  };

  // Format date for API (dd-MM-yyyy)
  const formatDateForAPI = (year, month, day) => {
    if (!year || !month || !day) return null;
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    return `${dayStr}-${monthStr}-${year}`;
  };

  // Determine shift based on time for historical data analysis
  const determineShiftFromTime = (thoiGianCheckIn) => {
    // Vì chúng ta không dùng thời gian để xác định shift nữa,
    // function này chỉ dùng cho hiển thị trong modal chi tiết
    if (!thoiGianCheckIn) return 1;

    const timePart = thoiGianCheckIn.split(' ')[1];
    if (!timePart) return 1;

    const [hours] = timePart.split(':');
    const hour = parseInt(hours);

    // Vẫn giữ logic cũ cho việc hiển thị
    return hour < 12 ? 1 : 2;
  };

  // Refresh attendance data from API
  const refreshChamCongData = async () => {
    try {
      const params = {
        page: 0,
        size: 1000,
        year: filterYear || undefined,
        month: filterMonth || undefined,
        day: filterDay || undefined,
        khoaPhongId: filterKhoaPhongId || undefined,
      };

      const lichSuResponse = await axiosInstance.get('/chamcong/lichsu', { params });
      const chamCongPage = lichSuResponse.data;

      // RESET HOÀN TOÀN dữ liệu trước khi xử lý
      const status = {};
      const details = {};
      const caLamViecMap = {};

      // Khởi tạo ca làm việc mặc định cho tất cả nhân viên trước
      if (caLamViecs.length > 0) {
        const caSang = caLamViecs.find(ca => ca.id === 11); // "Ca Sáng" (id=11)
        const caChieu = caLamViecs.find(ca => ca.id === 12); // "Ca Chiều" (id=12)
        const defaultCaSangId = caSang ? caSang.id.toString() : caLamViecs[0].id.toString();
        const defaultCaChieuId = caChieu ? caChieu.id.toString() : caLamViecs[0].id.toString();

        allNhanViens.forEach((nv) => {
          caLamViecMap[`${nv.id}_1`] = defaultCaSangId; // Ca Sáng cho shift 1
          caLamViecMap[`${nv.id}_2`] = defaultCaChieuId; // Ca Chiều cho shift 2
        });
      }

      if (chamCongPage.content && Array.isArray(chamCongPage.content)) {
        // Nhóm các bản ghi chấm công theo nhân viên và ngày
        const groupedRecords = {};

        chamCongPage.content.forEach((chamCong) => {
          if (chamCong.nhanVien && chamCong.nhanVien.id && chamCong.nhanVien.trangThai === 1) {
            const chamCongDate = chamCong.thoiGianCheckIn ? chamCong.thoiGianCheckIn.split(' ')[0] : null;

            // Kiểm tra điều kiện lọc linh hoạt
            let matchFilter = true;

            if (chamCongDate) {
              const [day, month, year] = chamCongDate.split('-');

              if (filterYear && parseInt(year) !== filterYear) {
                matchFilter = false;
              }
              if (filterMonth && parseInt(month) !== filterMonth) {
                matchFilter = false;
              }
              if (filterDay && parseInt(day) !== filterDay) {
                matchFilter = false;
              }
            } else {
              matchFilter = false;
            }

            if (matchFilter) {
              const nhanVienId = chamCong.nhanVien.id;

              if (!groupedRecords[nhanVienId]) {
                groupedRecords[nhanVienId] = [];
              }
              groupedRecords[nhanVienId].push(chamCong);
            }
          }
        });

        // *** FIX: Xử lý từng nhân viên theo thứ tự thời gian, gán shift tuần tự ***
        Object.keys(groupedRecords).forEach((nhanVienId) => {
          const records = groupedRecords[nhanVienId];

          // Sắp xếp theo thời gian (cũ nhất đầu tiên)
          records.sort((a, b) => new Date(parseDate(a.thoiGianCheckIn)) - new Date(parseDate(b.thoiGianCheckIn)));

          // *** LOGIC CHÍNH: Lần chấm công đầu tiên = shift 1 (sáng), lần thứ 2 = shift 2 (chiều) ***
          records.forEach((chamCong, index) => {
            const trangThai = chamCong.trangThaiChamCong?.tenTrangThai;

            // Gán shift theo thứ tự: 0 -> shift 1, 1 -> shift 2
            // Chỉ xử lý 2 bản ghi đầu tiên
            if (index < 2) {
              const shift = index + 1; // index 0 -> shift 1, index 1 -> shift 2
              const key = `${nhanVienId}_${shift}`;

              // *** THÊM MỚI: Set trạng thái và chi tiết ***
              status[key] = trangThai;
              details[key] = chamCong;

              // Update ca lam viec selection from database cho cả LÀM và NGHỈ
              if (chamCong.caLamViec && chamCong.caLamViec.id) {
                caLamViecMap[key] = chamCong.caLamViec.id.toString();
              }
              // Cho trường hợp không có caLamViec thì giữ nguyên ca mặc định đã set ở trên
            }
          });
        });
      }

      // Cập nhật state
      setCheckInStatus(status);
      setChamCongDetails(details);
      setSelectedCaLamViec(caLamViecMap);

      console.log('Refreshed attendance data (Sequential Logic):', {
        status,
        details,
        caLamViecMap,
        filterYear,
        filterMonth,
        filterDay
      });
    } catch (error) {
      console.error('Error refreshing attendance data:', error);
    }
  };

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);

        if (userRole === 'NGUOICHAMCONG') {
          setFilterKhoaPhongId(Number(userKhoaPhongId));
        }

        if (userRole === 'ADMIN' || userRole === 'NGUOITONGHOP') {
          const khoaPhongResponse = await axiosInstance.get('/khoa-phong');
          setKhoaPhongs(khoaPhongResponse.data);
        }

        const kyHieuResponse = await axiosInstance.get('/ky-hieu-cham-cong');
        const activeKyHieuChamCongs = kyHieuResponse.data.filter((kyHieu) => kyHieu.trangThai);
        setKyHieuChamCongs(activeKyHieuChamCongs);

        const caLamViecResponse = await axiosInstance.get('/ca-lam-viec');
        if (!caLamViecResponse.data || caLamViecResponse.data.length === 0) {
          toast.error('Không có ca làm việc nào trong hệ thống!');
        }
        setCaLamViecs(caLamViecResponse.data);

        // Fetch all employees
        const fetchAllNhanViens = async () => {
          let allData = [];
          let page = 0;
          let total = 1;
          while (page < total) {
            const params = { page, size: itemsPerPage, khoaPhongId: filterKhoaPhongId || undefined };
            const response = await axiosInstance.get('/nhanvien', { params });
            const nhanVienPage = response.data;
            allData = [...allData, ...nhanVienPage.content];
            total = nhanVienPage.totalPages;
            page++;
          }
          setAllNhanViens(allData);
          setFilteredNhanViens(allData);
          setTotalPages(Math.ceil(allData.length / itemsPerPage));

          // Initialize default ca lam viec selections with "Ca Sáng" and "Ca Chiều"
          if (caLamViecResponse.data.length > 0) {
            const caSang = caLamViecResponse.data.find(ca => ca.id === 11); // "Ca Sáng" (id=11)
            const caChieu = caLamViecResponse.data.find(ca => ca.id === 12); // "Ca Chiều" (id=12)
            const defaultCaSangId = caSang ? caSang.id.toString() : caLamViecResponse.data[0].id.toString();
            const defaultCaChieuId = caChieu ? caChieu.id.toString() : caLamViecResponse.data[0].id.toString();
            const caLamViecMap = {};
            allData.forEach((nv) => {
              caLamViecMap[`${nv.id}_1`] = defaultCaSangId; // Ca Sáng cho shift 1
              caLamViecMap[`${nv.id}_2`] = defaultCaChieuId; // Ca Chiều cho shift 2
            });
            setSelectedCaLamViec(caLamViecMap);
          }

          return allData;
        };

        await fetchAllNhanViens();

        const today = new Date();
        setFilterYear(today.getFullYear());
        setFilterMonth(today.getMonth() + 1);
        setFilterDay(today.getDate());
      } catch (error) {
        toast.error(`Lỗi khi tải dữ liệu ban đầu: ${error.response?.data?.error || error.message}`);
      } finally {
        setLoading(false);
      }
    };
    if (userRole) fetchInitialData();
  }, [filterKhoaPhongId, userRole, userKhoaPhongId]);

  // Update filteredNhanViens when searchTerm changes
  useEffect(() => {
    const filtered = filterNhanViens(allNhanViens, searchTerm);
    setFilteredNhanViens(filtered);
    setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    setCurrentPage(0);
  }, [searchTerm, allNhanViens]);

  // Fetch attendance data when filters change
  useEffect(() => {
    if (allNhanViens.length > 0 && caLamViecs.length > 0) {
      refreshChamCongData();
    }
  }, [filterYear, filterMonth, filterDay, filterKhoaPhongId, allNhanViens, caLamViecs]);

  // Thêm useEffect này vào component (sau các useEffect hiện có)
  useEffect(() => {
    // Tự động chọn khoa phòng cho người chấm công
    if (userRole === 'NGUOICHAMCONG' && userKhoaPhongId && !selectedKhoaPhongForBulk) {
      setSelectedKhoaPhongForBulk(userKhoaPhongId);
    }
  }, [userRole, userKhoaPhongId, selectedKhoaPhongForBulk]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newFormData = { ...prev, [name]: value };
      if (name === 'trangThai') {
        if (value === 'LÀM' && editingChamCong && selectedShift) {
          newFormData.caLamViecId = selectedCaLamViec[`${editingChamCong.nhanVien.id}_${selectedShift}`] || '';
        } else if (value === 'NGHỈ' && editingChamCong && selectedShift) {
          // Giữ nguyên caLamViecId hiện tại cho trạng thái NGHỈ
          newFormData.caLamViecId = selectedCaLamViec[`${editingChamCong.nhanVien.id}_${selectedShift}`] || '';
        }
      }
      return newFormData;
    });
  };

  const handleCaLamViecChange = (nhanVienId, caLamViecId, shift) => {
    const validNhanVienId = parseInt(nhanVienId);
    const validCaLamViecId = parseInt(caLamViecId);

    if (!validNhanVienId || isNaN(validNhanVienId)) {
      toast.error('ID nhân viên không hợp lệ!');
      return;
    }

    if (!caLamViecId || caLamViecId === '') {
      setSelectedCaLamViec((prev) => {
        const newMap = { ...prev };
        newMap[`${validNhanVienId}_${shift}`] = '';
        return newMap;
      });
      return;
    }

    if (!validCaLamViecId || isNaN(validCaLamViecId) || !caLamViecs.find((ca) => ca.id === validCaLamViecId)) {
      toast.error('ID ca làm việc không hợp lệ!');
      return;
    }

    console.log(`Setting ca ${validCaLamViecId} for employee ${validNhanVienId} shift ${shift}`);

    setSelectedCaLamViec((prev) => {
      const newMap = { ...prev };
      newMap[`${validNhanVienId}_${shift}`] = validCaLamViecId.toString();
      return newMap;
    });

    // Update formData if this is the current employee being processed
    if (formData.nhanVienId === validNhanVienId && !isNghiModalOpen && !isEditModalOpen) {
      setFormData((prev) => ({
        ...prev,
        caLamViecId: validCaLamViecId.toString(),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const nhanVienId = parseInt(formData.nhanVienId);
      if (!nhanVienId || isNaN(nhanVienId)) {
        toast.error('ID nhân viên không hợp lệ!');
        return;
      }

      // THÊM MỚI: Tạo filterDate từ các filter hiện tại (chỉ khi có đủ thông tin)
      const currentFilterDate = (filterYear && filterMonth && filterDay)
        ? formatDateForAPI(filterYear, filterMonth, filterDay)
        : null;

      console.log('Submitting with filterDate:', currentFilterDate, {
        filterYear, filterMonth, filterDay
      });

      const payload = {
        nhanVienId: nhanVienId,
        trangThai: formData.trangThai,
        filterDate: currentFilterDate,
        caLamViecId: parseInt(formData.caLamViecId), // Bắt buộc cho cả LÀM và NGHỈ
        ...(formData.trangThai === 'NGHỈ' && {
          maKyHieuChamCong: formData.kyHieuChamCong,
          ghiChu: formData.ghiChu,
        }),
      };

      const response = await axiosInstance.post('/chamcong/checkin', payload);
      toast.success(response.data.message || 'Chấm công thành công');

      // Refresh data
      await refreshChamCongData();
      closeModal();
    } catch (error) {
      console.error('Lỗi chi tiết:', error.response?.data);
      const errorMsg = error.response?.data?.error || error.message || 'Lỗi khi chấm công';
      toast.error(errorMsg);
    }
  };

  // Handle attendance action
  // Cập nhật trong hàm handleChamCong khi trangThai === 'NGHỈ'
  const handleChamCong = async (nhanVienId, trangThai, shift) => {
    const validNhanVienId = parseInt(nhanVienId);
    if (!validNhanVienId || isNaN(validNhanVienId)) {
      toast.error('ID nhân viên không hợp lệ!');
      return;
    }

    const nhanVien = filteredNhanViens.find((nv) => nv.id === validNhanVienId);
    if (!nhanVien) {
      toast.error('Không tìm thấy nhân viên!');
      return;
    }

    // Check if already checked in for this shift
    const currentStatus = checkInStatus[`${validNhanVienId}_${shift}`];
    if (currentStatus) {
      toast.error(`Nhân viên đã được chấm công cho ca ${shift === 1 ? 'sáng' : 'chiều'}!`);
      return;
    }

    if (trangThai === 'NGHỈ') {
      if (kyHieuChamCongs.length === 0) {
        toast.error('Không có ký hiệu chấm công nào khả dụng!');
        return;
      }

      // Set ca làm việc mặc định cho modal nghỉ
      const defaultCaId = selectedCaLamViec[`${validNhanVienId}_${shift}`] || '';

      // *** THÊM MỚI: Tự động chọn N1 làm ký hiệu mặc định ***
      const defaultKyHieuN1 = kyHieuChamCongs.find(kh => kh.maKyHieu === 'N1');
      const defaultKyHieuChamCong = defaultKyHieuN1 ? defaultKyHieuN1.maKyHieu : '';

      setFormData((prev) => ({
        ...prev,
        nhanVienId: validNhanVienId,
        trangThai,
        kyHieuChamCong: defaultKyHieuChamCong, // *** TỰ ĐỘNG CHỌN N1 ***
        ghiChu: '',
        caLamViecId: defaultCaId,
      }));
      setSelectedNhanVien(nhanVien);
      setSelectedShift(shift);
      setIsNghiModalOpen(true);
      return;
    }

    // Handle 'LÀM' case (giữ nguyên logic cũ)
    let caLamViecId = selectedCaLamViec[`${validNhanVienId}_${shift}`];

    // Auto-select default ca if none selected
    if (!caLamViecId && caLamViecs.length > 0) {
      caLamViecId = caLamViecs[0].id.toString();
      setSelectedCaLamViec((prev) => ({
        ...prev,
        [`${validNhanVienId}_${shift}`]: caLamViecId,
      }));
    }

    // Validate ca làm việc
    if (!caLamViecId || !caLamViecs.find((ca) => ca.id.toString() === caLamViecId)) {
      toast.error('Vui lòng chọn ca làm việc hợp lệ!');
      return;
    }

    console.log(`Chấm công: Employee ${validNhanVienId}, Shift ${shift}, Ca ${caLamViecId}`);

    try {
      // THÊM MỚI: Tạo filterDate từ các filter hiện tại (chỉ khi có đủ thông tin)
      const currentFilterDate = (filterYear && filterMonth && filterDay)
        ? formatDateForAPI(filterYear, filterMonth, filterDay)
        : null;

      console.log('Checking in with filterDate:', currentFilterDate, {
        filterYear, filterMonth, filterDay
      });

      const payload = {
        nhanVienId: validNhanVienId,
        trangThai: 'LÀM',
        caLamViecId: parseInt(caLamViecId),
        filterDate: currentFilterDate, // THÊM MỚI
      };

      const response = await axiosInstance.post('/chamcong/checkin', payload);
      toast.success(response.data.message || 'Chấm công thành công');

      // Refresh data after short delay
      setTimeout(async () => {
        await refreshChamCongData();
      }, 500);
    } catch (error) {
      console.error('Lỗi chi tiết:', error.response?.data);
      const errorMsg = error.response?.data?.error || error.message || 'Lỗi khi chấm công';
      toast.error(errorMsg);
    }
  };

  // Bulk attendance functions
  const handleBulkLam = () => {
    if (!selectedKhoaPhongForBulk) {
      toast.error('Vui lòng chọn khoa phòng!');
      return;
    }
    if (!selectedCaForBulk) {
      toast.error('Vui lòng chọn ca làm việc!');
      return;
    }

    const selectedKhoaPhong = khoaPhongs.find(kp => kp.id.toString() === selectedKhoaPhongForBulk);
    if (window.confirm(
      `Bạn có chắc chắn muốn chấm công "LÀM" cho tất cả nhân viên trong khoa phòng "${selectedKhoaPhong?.tenKhoaPhong}" - Ca ${selectedShiftForBulk === 1 ? 'Sáng' : 'Chiều'}?`
    )) {
      processBulkAttendance('LÀM');
    }
  };

  const handleBulkNghi = () => {
    if (!selectedKhoaPhongForBulk) {
      toast.error('Vui lòng chọn khoa phòng!');
      return;
    }
    if (!selectedCaForBulk) {
      toast.error('Vui lòng chọn ca làm việc!');
      return;
    }

    // Auto-select N1 as default
    const defaultKyHieuN1 = kyHieuChamCongs.find(kh => kh.maKyHieu === 'N1');
    setBulkKyHieuChamCong(defaultKyHieuN1 ? defaultKyHieuN1.maKyHieu : '');
    setBulkGhiChu('');
    setIsBulkNghiModalOpen(true);
  };

  const processBulkAttendance = async (trangThai) => {
    if (!selectedKhoaPhongForBulk || !selectedCaForBulk) {
      toast.error('Vui lòng chọn đầy đủ thông tin!');
      return;
    }

    setBulkProcessing(true);

    try {
      // Get employees from selected department
      const employeesInDepartment = allNhanViens.filter(
        nv => nv.khoaPhong?.id.toString() === selectedKhoaPhongForBulk && nv.trangThai === 1
      );

      if (employeesInDepartment.length === 0) {
        toast.error('Không có nhân viên nào trong khoa phòng này!');
        return;
      }

      const currentFilterDate = (filterYear && filterMonth && filterDay)
        ? formatDateForAPI(filterYear, filterMonth, filterDay)
        : null;

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      // Process each employee
      for (const nhanVien of employeesInDepartment) {
        const key = `${nhanVien.id}_${selectedShiftForBulk}`;
        const currentStatus = checkInStatus[key];

        // Skip if already checked in for this shift
        if (currentStatus) {
          console.log(`Skipping ${nhanVien.hoTen} - already checked in for shift ${selectedShiftForBulk}`);
          continue;
        }

        try {
          const payload = {
            nhanVienId: nhanVien.id,
            trangThai: trangThai,
            caLamViecId: parseInt(selectedCaForBulk),
            filterDate: currentFilterDate,
            ...(trangThai === 'NGHỈ' && {
              maKyHieuChamCong: bulkKyHieuChamCong,
              ghiChu: bulkGhiChu,
            }),
          };

          await axiosInstance.post('/chamcong/checkin', payload);
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(`${nhanVien.hoTen}: ${error.response?.data?.error || error.message}`);
          console.error(`Error processing ${nhanVien.hoTen}:`, error);
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(`Đã chấm công thành công cho ${successCount} nhân viên!`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} nhân viên gặp lỗi. Chi tiết: ${errors.slice(0, 3).join('; ')}`);
      }

      // Refresh data
      await refreshChamCongData();

      // Close modal if it was bulk nghỉ
      if (trangThai === 'NGHỈ') {
        setIsBulkNghiModalOpen(false);
      }

    } catch (error) {
      toast.error(`Lỗi khi xử lý hàng loạt: ${error.message}`);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkNghiSubmit = (e) => {
    e.preventDefault();
    if (!bulkKyHieuChamCong) {
      toast.error('Vui lòng chọn ký hiệu chấm công!');
      return;
    }

    const selectedKhoaPhong = khoaPhongs.find(kp => kp.id.toString() === selectedKhoaPhongForBulk);
    if (window.confirm(
      `Bạn có chắc chắn muốn chấm công "NGHỈ" cho tất cả nhân viên trong khoa phòng "${selectedKhoaPhong?.tenKhoaPhong}" - Ca ${selectedShiftForBulk === 1 ? 'Sáng' : 'Chiều'}?`
    )) {
      processBulkAttendance('NGHỈ');
    }
  };

  // Render action buttons
  const renderActionButtons = (nv, shift) => {
    const key = `${nv.id}_${shift}`;
    const currentStatus = checkInStatus[key];

    const lamButtonClass = currentStatus === 'LÀM' ?
      'btn btn-sm btn-success' :
      'btn btn-sm btn-outline-success';

    const nghiButtonClass = currentStatus === 'NGHỈ' ?
      'btn btn-sm btn-danger' :
      'btn btn-sm btn-outline-danger';

    return (
      <div className="d-flex gap-2">
        <button
          className={lamButtonClass}
          onClick={() => handleChamCong(nv.id, 'LÀM', shift)}
          disabled={!!currentStatus}
          title={currentStatus === 'LÀM' ? 'Đã chấm công làm' : 'Chấm công làm'}
        >
          {currentStatus === 'LÀM' ? '✓ Làm' : 'Làm'}
        </button>
        <button
          className={nghiButtonClass}
          onClick={() => handleChamCong(nv.id, 'NGHỈ', shift)}
          disabled={kyHieuChamCongs.length === 0 || !!currentStatus}
          title={currentStatus === 'NGHỈ' ? 'Đã chấm công nghỉ' : 'Chấm công nghỉ'}
        >
          {currentStatus === 'NGHỈ' ? '✓ Nghỉ' : 'Nghỉ'}
        </button>
      </div>
    );
  };

  const closeModal = () => {
    setIsNghiModalOpen(false);
    setSelectedNhanVien(null);
    setSelectedShift(null);
    setFormData((prev) => ({ ...prev, caLamViecId: '', kyHieuChamCong: '', ghiChu: '' }));
  };

  const showDetail = (nhanVienId, shift) => {
    const detail = chamCongDetails[`${nhanVienId}_${shift}`];
    if (detail) {
      // Thêm thông tin shift vào detail để hiển thị đúng trong modal
      setSelectedDetail({ ...detail, displayShift: shift });
      setShowDetailModal(true);
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedDetail(null);
  };

  const paginatedNhanViens = filteredNhanViens.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  const handleEdit = (nhanVienId, shift) => {
    const chamCongDetail = chamCongDetails[`${nhanVienId}_${shift}`];
    if (chamCongDetail) {
      const currentCaLamViecId = selectedCaLamViec[`${nhanVienId}_${shift}`] || chamCongDetail.caLamViec?.id?.toString() || '';
      setEditingChamCong(chamCongDetail);
      setSelectedShift(shift);
      setFormData({
        nhanVienId: chamCongDetail.nhanVien.id,
        trangThai: chamCongDetail.trangThaiChamCong?.tenTrangThai || 'LÀM',
        caLamViecId: currentCaLamViecId, // Luôn set ca làm việc cho cả LÀM và NGHỈ
        kyHieuChamCong: chamCongDetail.kyHieuChamCong?.maKyHieu || '',
        ghiChu: chamCongDetail.ghiChu || '',
      });
      setIsEditModalOpen(true);
    }
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingChamCong(null);
    setSelectedShift(null);
    setFormData((prev) => ({ ...prev, caLamViecId: '', kyHieuChamCong: '', ghiChu: '' }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        trangThai: formData.trangThai,
        caLamViecId: parseInt(formData.caLamViecId), // Bắt buộc cho cả LÀM và NGHỈ
        ...(formData.trangThai === 'NGHỈ' && {
          maKyHieuChamCong: formData.kyHieuChamCong,
          ghiChu: formData.ghiChu,
        }),
      };

      await axiosInstance.put(`/chamcong/${editingChamCong.id}/trangthai`, payload);
      toast.success('Cập nhật chấm công thành công');

      // Refresh data
      await refreshChamCongData();
      closeEditModal();
    } catch (error) {
      toast.error(`Lỗi khi cập nhật: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <div className="container-fluid p-4">
      <h1 className="h3 mb-4 text-primary d-flex align-items-center">
        <i className="ri-time-line me-2"></i> Chấm công (2 ca/ngày: Sáng & Chiều)
      </h1>

      <div className="card p-4 shadow-sm">
        {/* Bulk attendance controls */}
        <div className="mb-4 p-3 bg-light rounded">
          <h5 className="text-primary mb-3">
            <i className="ri-group-line me-2"></i>Chấm công hàng loạt theo khoa phòng
          </h5>
          <div className="row align-items-end">
            <div className="col-md-3">
              <label className="form-label fw-bold">Chọn khoa phòng</label>
              <select
                className="form-select"
                value={selectedKhoaPhongForBulk}
                onChange={(e) => setSelectedKhoaPhongForBulk(e.target.value)}
              >
                <option value="">-- Chọn khoa phòng --</option>
                {/* ĐOẠN SỬA ĐỔI BẮT ĐẦU TỪ ĐÂY */}
                {userRole === 'ADMIN' || userRole === 'NGUOITONGHOP' ? (
                  // Admin và người tổng hợp: hiển thị tất cả khoa phòng
                  khoaPhongs.map((khoaPhong) => (
                    <option key={khoaPhong.id} value={khoaPhong.id}>
                      {khoaPhong.tenKhoaPhong}
                    </option>
                  ))
                ) : userRole === 'NGUOICHAMCONG' ? (
                  // Người chấm công: chỉ hiển thị khoa phòng của họ
                  khoaPhongs
                    .filter(khoaPhong => khoaPhong.id.toString() === userKhoaPhongId)
                    .map((khoaPhong) => (
                      <option key={khoaPhong.id} value={khoaPhong.id}>
                        {khoaPhong.tenKhoaPhong}
                      </option>
                    ))
                ) : null}
                {/* ĐOẠN SỬA ĐỔI KẾT THÚC */}
              </select>
            </div>
            {/* Các phần còn lại giữ nguyên */}
            <div className="col-md-2">
              <label className="form-label fw-bold">Buổi</label>
              <select
                className="form-select"
                value={selectedShiftForBulk}
                onChange={(e) => setSelectedShiftForBulk(parseInt(e.target.value))}
              >
                <option value={1}>Sáng</option>
                <option value={2}>Chiều</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-bold">Ca làm việc</label>
              <select
                className="form-select"
                value={selectedCaForBulk}
                onChange={(e) => setSelectedCaForBulk(e.target.value)}
              >
                <option value="">-- Chọn ca làm việc --</option>
                {caLamViecs.map((ca) => (
                  <option key={ca.id} value={ca.id}>
                    {ca.tenCaLamViec} ({ca.kyHieuChamCong?.maKyHieu || 'N/A'})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <div className="d-flex gap-2">
                <button
                  className="btn btn-success"
                  onClick={handleBulkLam}
                  disabled={!selectedKhoaPhongForBulk || !selectedCaForBulk || bulkProcessing}
                >
                  <i className="ri-check-line me-1"></i>
                  {bulkProcessing ? 'Đang xử lý...' : 'Tất cả Làm'}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleBulkNghi}
                  disabled={!selectedKhoaPhongForBulk || !selectedCaForBulk || bulkProcessing || kyHieuChamCongs.length === 0}
                >
                  <i className="ri-close-line me-1"></i>
                  {bulkProcessing ? 'Đang xử lý...' : 'Tất cả Nghỉ'}
                </button>
              </div>
            </div>
          </div>
          {selectedKhoaPhongForBulk && (
            <div className="mt-2">
              <small className="text-muted">
                <i className="ri-information-line me-1"></i>
                Sẽ áp dụng cho tất cả nhân viên trong khoa phòng đã chọn (chưa chấm công cho ca này)
              </small>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mb-3 row">
          <div className="col-md-3">
            <input
              type="text"
              className="form-control"
              placeholder="Tìm theo tên hoặc mã NV"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              value={filterYear || ''}
              onChange={(e) => {
                setCurrentPage(0);
                setFilterYear(e.target.value ? Number(e.target.value) : null);
                setFilterMonth(null);
                setFilterDay(null);
              }}
            >
              <option value="">Chọn năm</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              value={filterMonth || ''}
              onChange={(e) => {
                setCurrentPage(0);
                setFilterMonth(e.target.value ? Number(e.target.value) : null);
                setFilterDay(null);
              }}
              disabled={!filterYear}
            >
              <option value="">Chọn tháng</option>
              {months.map((month) => (
                <option key={month} value={month}>
                  Tháng {month}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              value={filterDay || ''}
              onChange={(e) => {
                setCurrentPage(0);
                setFilterDay(e.target.value ? Number(e.target.value) : null);
              }}
              disabled={!filterYear || !filterMonth}
            >
              <option value="">Chọn ngày</option>
              {getDaysInMonth(filterYear, filterMonth).map((day) => (
                <option key={day} value={day}>
                  Ngày {day}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Department filter for admin/tonghop */}
        {(userRole === 'ADMIN' || userRole === 'NGUOITONGHOP') && (
          <div className="mb-3 row">
            <div className="col-md-3">
              <select
                className="form-select"
                value={filterKhoaPhongId || ''}
                onChange={(e) => {
                  setCurrentPage(0);
                  setFilterKhoaPhongId(e.target.value ? Number(e.target.value) : null);
                }}
              >
                <option value="">Tất cả khoa phòng</option>
                {khoaPhongs.map((khoaPhong) => (
                  <option key={khoaPhong.id} value={khoaPhong.id}>
                    {khoaPhong.tenKhoaPhong}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead className="table-light">
                <tr>
                  <th scope="col" className="text-start">STT</th>
                  <th scope="col" className="text-start">Mã NV</th>
                  <th scope="col" className="text-start">Họ tên</th>
                  <th scope="col" className="text-start">Khoa Phòng</th>
                  <th scope="col" className="text-start">Ca làm việc</th>
                  <th scope="col" className="text-start">Chi tiết</th>
                  <th scope="col" className="text-start">Hành động</th>
                  {userRole === 'ADMIN' && (
                    <th scope="col" className="text-start">Sửa</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedNhanViens.length > 0 ? (
                  paginatedNhanViens.flatMap((nv, index) =>
                    [1, 2].map((shift) => {
                      const key = `${nv.id}_${shift}`;
                      const currentStatus = checkInStatus[key];
                      const chamCongDetail = chamCongDetails[key];
                      const globalIndex = currentPage * itemsPerPage + index;
                      const sttIndex = globalIndex + 1;

                      return (
                        <tr key={key} className={shift === 1 ? 'border-bottom' : 'border-bottom border-3'}>
                          <td className="align-middle">
                            {shift === 1 ? sttIndex : ''}
                          </td>
                          <td className="align-middle">{shift === 1 ? (nv.maNV || 'N/A') : ''}</td>
                          <td className="align-middle">{shift === 1 ? nv.hoTen : ''}</td>
                          <td className="align-middle">{shift === 1 ? (nv.khoaPhong?.tenKhoaPhong || 'Chưa có') : ''}</td>
                          <td className="align-middle">
                            <div className="d-flex align-items-center">
                              <span className="me-2 small text-muted fw-bold">
                                {shift === 1 ? 'Sáng:' : 'Chiều:'}
                              </span>
                              <select
                                className="form-select form-select-sm"
                                value={selectedCaLamViec[key] || ''}
                                onChange={(e) => handleCaLamViecChange(nv.id, e.target.value, shift)}
                                disabled={currentStatus || caLamViecs.length === 0}
                                style={{ minWidth: '180px' }}
                              >
                                <option value="">Chọn ca làm việc</option>
                                {caLamViecs.map((ca) => (
                                  <option key={ca.id} value={ca.id}>
                                    {ca.tenCaLamViec} ({ca.kyHieuChamCong?.maKyHieu || 'N/A'})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="align-middle">
                            {currentStatus ? (
                              <button
                                className="btn btn-sm btn-outline-info"
                                onClick={() => showDetail(nv.id, shift)}
                                title="Xem chi tiết chấm công"
                              >
                                <i className="ri-eye-line"></i> Chi tiết
                              </button>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td className="align-middle">
                            {renderActionButtons(nv, shift)}
                          </td>
                          {userRole === 'ADMIN' && (
                            <td className="align-middle">
                              {currentStatus ? (
                                <button
                                  className="btn btn-sm btn-outline-warning"
                                  onClick={() => handleEdit(nv.id, shift)}
                                  title="Sửa chấm công"
                                >
                                  <i className="ri-edit-line"></i>
                                </button>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )
                ) : (
                  <tr>
                    <td colSpan={userRole === 'ADMIN' ? 8 : 7} className="text-center">
                      Không có nhân viên nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <nav>
              <ul className="pagination justify-content-center">
                <li className={`page-item ${currentPage === 0 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)}>
                    Trước
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i).map((page) => (
                  <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(page)}>
                      {page + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages - 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)}>
                    Sau
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* Modal chấm công nghỉ đơn lẻ */}
      <div
        className={`modal fade ${isNghiModalOpen ? 'show' : ''}`}
        style={{ display: isNghiModalOpen ? 'block' : 'none' }}
        tabIndex="-1"
        aria-labelledby="nghiModalLabel"
        aria-hidden={!isNghiModalOpen}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="nghiModalLabel">
                Chấm công nghỉ cho {selectedNhanVien?.hoTen} - Ca {selectedShift === 1 ? 'Sáng' : 'Chiều'}
              </h5>
              <button type="button" className="btn-close" onClick={closeModal}></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="caLamViecNghi" className="form-label">
                    Ca làm việc
                  </label>
                  <select
                    className="form-select"
                    id="caLamViecNghi"
                    name="caLamViecId"
                    value={formData.caLamViecId}
                    onChange={handleChange}
                    required
                    disabled={caLamViecs.length === 0}
                  >
                    <option value="">-- Chọn ca làm việc --</option>
                    {caLamViecs.map((ca) => (
                      <option key={ca.id} value={ca.id}>
                        {ca.tenCaLamViec} ({ca.kyHieuChamCong?.maKyHieu || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="kyHieuChamCong" className="form-label">
                    Ký hiệu chấm công
                  </label>
                  <select
                    className="form-select"
                    id="kyHieuChamCong"
                    name="kyHieuChamCong"
                    value={formData.kyHieuChamCong}
                    onChange={handleChange}
                    required
                    disabled={kyHieuChamCongs.length === 0}
                  >
                    <option value="">-- Chọn ký hiệu chấm công --</option>
                    {kyHieuChamCongs
                      .filter((kh) => !caLamViecs.some((ca) => ca.kyHieuChamCong?.maKyHieu === kh.maKyHieu))
                      .map((kyHieu) => (
                        <option key={kyHieu.id} value={kyHieu.maKyHieu}>
                          {kyHieu.tenKyHieu} ({kyHieu.maKyHieu})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="ghiChu" className="form-label">
                    Ghi chú <span className="text-muted">(tùy chọn)</span>
                  </label>
                  <textarea
                    className="form-control"
                    id="ghiChu"
                    name="ghiChu"
                    value={formData.ghiChu}
                    onChange={handleChange}
                    placeholder="Nhập ghi chú (tùy chọn)"
                    disabled={kyHieuChamCongs.length === 0}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={caLamViecs.length === 0 || kyHieuChamCongs.length === 0 || !formData.caLamViecId || !formData.kyHieuChamCong}
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {isNghiModalOpen && <div className="modal-backdrop fade show"></div>}

      {/* Modal chấm công nghỉ hàng loạt */}
      <div
        className={`modal fade ${isBulkNghiModalOpen ? 'show' : ''}`}
        style={{ display: isBulkNghiModalOpen ? 'block' : 'none' }}
        tabIndex="-1"
        aria-labelledby="bulkNghiModalLabel"
        aria-hidden={!isBulkNghiModalOpen}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="bulkNghiModalLabel">
                <i className="ri-group-line me-2"></i>
                Chấm công nghỉ hàng loạt - Ca {selectedShiftForBulk === 1 ? 'Sáng' : 'Chiều'}
              </h5>
              <button type="button" className="btn-close" onClick={() => setIsBulkNghiModalOpen(false)}></button>
            </div>
            <form onSubmit={handleBulkNghiSubmit}>
              <div className="modal-body">
                <div className="alert alert-info">
                  <i className="ri-information-line me-2"></i>
                  <strong>Khoa phòng:</strong> {khoaPhongs.find(kp => kp.id.toString() === selectedKhoaPhongForBulk)?.tenKhoaPhong}<br />
                  <strong>Ca làm việc:</strong> {caLamViecs.find(ca => ca.id.toString() === selectedCaForBulk)?.tenCaLamViec}
                </div>

                <div className="mb-3">
                  <label htmlFor="bulkKyHieuChamCong" className="form-label">
                    Ký hiệu chấm công
                  </label>
                  <select
                    className="form-select"
                    id="bulkKyHieuChamCong"
                    value={bulkKyHieuChamCong}
                    onChange={(e) => setBulkKyHieuChamCong(e.target.value)}
                    required
                    disabled={kyHieuChamCongs.length === 0}
                  >
                    <option value="">-- Chọn ký hiệu chấm công --</option>
                    {kyHieuChamCongs
                      .filter((kh) => !caLamViecs.some((ca) => ca.kyHieuChamCong?.maKyHieu === kh.maKyHieu))
                      .map((kyHieu) => (
                        <option key={kyHieu.id} value={kyHieu.maKyHieu}>
                          {kyHieu.tenKyHieu} ({kyHieu.maKyHieu})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="bulkGhiChu" className="form-label">
                    Ghi chú chung <span className="text-muted">(tùy chọn)</span>
                  </label>
                  <textarea
                    className="form-control"
                    id="bulkGhiChu"
                    value={bulkGhiChu}
                    onChange={(e) => setBulkGhiChu(e.target.value)}
                    placeholder="Nhập ghi chú chung cho tất cả nhân viên (tùy chọn)"
                    disabled={kyHieuChamCongs.length === 0}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsBulkNghiModalOpen(false)}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={bulkProcessing || kyHieuChamCongs.length === 0 || !bulkKyHieuChamCong}
                >
                  {bulkProcessing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <i className="ri-check-line me-1"></i>
                      Xác nhận chấm công nghỉ hàng loạt
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {isBulkNghiModalOpen && <div className="modal-backdrop fade show"></div>}

      {/* Modal chi tiết chấm công */}
      {showDetailModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Chi tiết chấm công - {selectedDetail?.nhanVien?.hoTen}</h5>
                <button type="button" className="btn-close" onClick={closeDetailModal}></button>
              </div>
              <div className="modal-body">
                {selectedDetail && (
                  <div className="row">
                    <div className="col-md-6">
                      <h6 className="text-primary">Thông tin nhân viên</h6>
                      <table className="table table-sm">
                        <tbody>
                          <tr>
                            <td><strong>Mã NV:</strong></td>
                          </tr>
                          <tr>
                            <td><strong>Họ tên:</strong></td>
                            <td>{selectedDetail.nhanVien?.hoTen}</td>
                          </tr>
                          <tr>
                            <td><strong>Khoa phòng:</strong></td>
                            <td>{selectedDetail.nhanVien?.khoaPhong?.tenKhoaPhong || 'Chưa có'}</td>
                          </tr>
                          <tr>
                            <td><strong>Chức vụ:</strong></td>
                            <td>{selectedDetail.nhanVien?.chucVu?.tenChucVu || 'Chưa có'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="col-md-6">
                      <h6 className="text-primary">Thông tin chấm công</h6>
                      <table className="table table-sm">
                        <tbody>
                          <tr>
                            <td><strong>Thời gian:</strong></td>
                            <td>{selectedDetail.thoiGianCheckIn}</td>
                          </tr>
                          <tr>
                            <td><strong>Ca:</strong></td>
                            <td>
                              <span className="badge bg-info">
                                {selectedDetail.displayShift === 1 ? 'Sáng' : 'Chiều'}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Trạng thái:</strong></td>
                            <td>
                              <span
                                className={`badge ${selectedDetail.trangThaiChamCong?.tenTrangThai === 'LÀM' ? 'bg-success' : 'bg-danger'}`}
                              >
                                {selectedDetail.trangThaiChamCong?.tenTrangThai}
                              </span>
                            </td>
                          </tr>
                          {selectedDetail.caLamViec && (
                            <tr>
                              <td><strong>Ca làm việc:</strong></td>
                              <td>
                                {selectedDetail.caLamViec.tenCaLamViec} ({selectedDetail.caLamViec.kyHieuChamCong?.maKyHieu})
                              </td>
                            </tr>
                          )}
                          {selectedDetail.kyHieuChamCong && (
                            <tr>
                              <td><strong>Ký hiệu chấm công:</strong></td>
                              <td>
                                {selectedDetail.kyHieuChamCong?.tenKyHieu} ({selectedDetail.kyHieuChamCong?.maKyHieu})
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {selectedDetail.ghiChu && (
                      <div className="col-12 mt-3">
                        <h6 className="text-primary">Ghi chú</h6>
                        <div className="alert alert-info" style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                          {selectedDetail.ghiChu}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeDetailModal}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showDetailModal && <div className="modal-backdrop fade show"></div>}

      {/* Modal sửa chấm công */}
      {isEditModalOpen && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Sửa chấm công - {editingChamCong?.nhanVien?.hoTen} - Ca {selectedShift === 1 ? 'Sáng' : 'Chiều'}
                </h5>
                <button type="button" className="btn-close" onClick={closeEditModal}></button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Thời gian gốc</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editingChamCong?.thoiGianCheckIn || ''}
                      disabled
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Trạng thái</label>
                    <select className="form-select" name="trangThai" value={formData.trangThai} onChange={handleChange}>
                      <option value="LÀM">Làm</option>
                      <option value="NGHỈ">Nghỉ</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Ca làm việc</label>
                    <select
                      className="form-select"
                      name="caLamViecId"
                      value={formData.caLamViecId || ''}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Chọn ca làm việc</option>
                      {caLamViecs.map((ca) => (
                        <option key={ca.id} value={ca.id}>
                          {ca.tenCaLamViec} ({ca.kyHieuChamCong?.maKyHieu || 'N/A'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.trangThai === 'NGHỈ' && (
                    <>
                      <div className="mb-3">
                        <label className="form-label">Ký hiệu chấm công</label>
                        <select
                          className="form-select"
                          name="kyHieuChamCong"
                          value={formData.kyHieuChamCong}
                          onChange={handleChange}
                          required
                        >
                          <option value="">-- Chọn ký hiệu --</option>
                          {kyHieuChamCongs
                            .filter((kh) => !caLamViecs.some((ca) => ca.kyHieuChamCong?.maKyHieu === kh.maKyHieu))
                            .map((kyHieu) => (
                              <option key={kyHieu.id} value={kyHieu.maKyHieu}>
                                {kyHieu.tenKyHieu} ({kyHieu.maKyHieu})
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Ghi chú <span className="text-muted">(tùy chọn)</span></label>
                        <textarea
                          className="form-control"
                          name="ghiChu"
                          value={formData.ghiChu}
                          onChange={handleChange}
                          placeholder="Nhập ghi chú (tùy chọn)"
                        ></textarea>
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Cập nhật
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {isEditModalOpen && <div className="modal-backdrop fade show"></div>}
    </div>
  );
}

export default ChamCong;
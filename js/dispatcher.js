// CẤU HÌNH API
const DISPATCHER_API_BASE = 'http://localhost:8080/FleetFlow/api/v1';

// Header dùng cho GET (Không có Content-Type)
function getAuthHeader() {
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Header dùng cho POST/PUT (Bắt buộc phải có Content-Type)
function postAuthHeader() {
    const token = localStorage.getItem('accessToken');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

// ==========================================
// 8. TÍCH HỢP PROFILE TỪ LOCALSTORAGE & LOGOUT
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    const fullName = localStorage.getItem('fullName');
    const userRole = localStorage.getItem('userRole');

    // Cập nhật giao diện nếu đã đăng nhập
    if (fullName) {
        if (!userRole || userRole.toUpperCase() !== 'DISPATCHER') {
            window.location.replace('../../error/403.html');
            return;
        }

        const nameEl = document.querySelector('.profile-name');
        const roleEl = document.querySelector('.profile-role');
        const avatarImg = document.querySelector('.glass-avatar img');

        if (nameEl) nameEl.textContent = fullName;
        if (roleEl) roleEl.textContent = userRole || 'Dispatcher';
        if (avatarImg) {
            avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=00b14f&color=fff`;
        }
    } else {
        // Nếu chưa có Token/Tên (chưa đăng nhập) -> Đá về trang chủ
        window.location.href = '../../index.html';
    }

    // Gắn sự kiện cho nút Đăng xuất trong Dropdown
    const logoutBtn = document.querySelector('.logout-item');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            localStorage.clear(); // Xóa sạch Token
            window.location.href = '../../index.html';
        });
    }
});

// ==========================================
// HÀM ĐĂNG XUẤT AN TOÀN CHO DISPATCHER
// ==========================================
window.handleDispatcherLogout = function () {
    // 1. Xóa sạch mọi Token và dữ liệu cá nhân trong bộ nhớ máy
    localStorage.clear();

    // 2. Chuyển hướng an toàn về trang chủ sau khi đã dọn dẹp xong
    window.location.href = '../../index.html';
};

// ==========================================
// 10. API BƯỚC 2: DUYỆT ĐƠN (APPROVE BOOKING)
// ==========================================
async function approveBooking(bookingId, buttonElement) {
    // 1. Lưu lại giao diện nút cũ và hiển thị hiệu ứng Loading chờ Backend
    const originalText = buttonElement.innerHTML;
    buttonElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    buttonElement.disabled = true;

    try {
        // 2. Gọi API POST để duyệt đơn
        const response = await fetch(`${DISPATCHER_API_BASE}/dispatcher/bookings/${bookingId}/approve`, {
            method: 'POST',
            headers: {
                ...getAuthHeader(),
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        // 3. Xử lý kết quả trả về từ Backend
        if (response.ok && result.success) {
            // Thông báo thành công
            if (typeof showSystemToast === 'function') {
                showSystemToast(result.message, "success");
            }

            // 4. CẬP NHẬT GIAO DIỆN (DOM) TRỰC TIẾP TRÊN BẢNG
            const row = buttonElement.closest('tr');
            if (row) {
                // Đổi nhãn (Badge) trạng thái thành Đã Duyệt (APPROVED)
                const badge = row.querySelector('.glass-badge');
                if (badge) {
                    badge.className = 'glass-badge bg-info text-white';
                    badge.innerHTML = '<i class="fa-solid fa-check-double me-1"></i> Đã duyệt';
                }

                // Đổi nút bấm thành trạng thái đang xử lý tự động
                const tdAction = buttonElement.parentElement;
                tdAction.innerHTML = `
                    <span class="text-success fw-bold"><i class="fa-solid fa-spinner fa-spin me-1"></i> Đang tìm TX</span>
                `;

                // Tùy chọn: Sau 3 giây tự động làm mới bảng PENDING để tải lại danh sách mới
                setTimeout(() => {
                    loadBookings('PENDING', 'tbody-main');
                }, 3000);
            }
        } else {
            // Nếu Backend báo lỗi (Ví dụ: Đơn đã bị người khác duyệt)
            if (typeof showSystemToast === 'function') {
                showSystemToast(result.error || result.message || "Lỗi khi duyệt đơn", "error");
            }
            buttonElement.innerHTML = originalText;
            buttonElement.disabled = false;
        }
    } catch (error) {
        console.error("Lỗi:", error);
        if (typeof showSystemToast === 'function') {
            showSystemToast("Mất kết nối đến máy chủ FleetFlow", "error");
        }
        buttonElement.innerHTML = originalText;
        buttonElement.disabled = false;
    }
}

// ==========================================
// 11. API BƯỚC 2: TỪ CHỐI ĐƠN (REJECT BOOKING) VỚI MODAL
// ==========================================
let pendingRejectBookingId = null;
let pendingRejectButton = null;

// Lắng nghe sự kiện click của nút Xác Nhận bên trong Modal
document.addEventListener("DOMContentLoaded", function () {
    const btnSubmitReject = document.getElementById('btnSubmitReject');
    if (btnSubmitReject) {
        btnSubmitReject.addEventListener('click', processRejectBooking);
    }
});

// PHA 1: Hàm kích hoạt khi bấm nút "Từ chối" trên bảng (Chỉ làm nhiệm vụ mở Modal)
function rejectBooking(bookingId, buttonElement) {
    pendingRejectBookingId = bookingId;
    pendingRejectButton = buttonElement;

    // Reset lại nội dung form và tắt cảnh báo lỗi của lần nhập trước (nếu có)
    const reasonInput = document.getElementById('rejectReasonInput');
    const errorText = document.getElementById('rejectReasonError');
    if (reasonInput) reasonInput.value = '';
    if (errorText) errorText.classList.add('d-none');

    // Khởi tạo và bật Modal lên
    const rejectModal = new bootstrap.Modal(document.getElementById('rejectReasonModal'));
    rejectModal.show();
}

// PHA 2: Xử lý Gửi API sau khi Dispatcher đã nhập lý do và bấm Xác nhận
async function processRejectBooking() {
    const reasonInput = document.getElementById('rejectReasonInput');
    const errorText = document.getElementById('rejectReasonError');
    const reason = reasonInput.value.trim();

    // KIỂM TRA ĐIỀU KIỆN: Nếu bỏ trống -> Chặn lại, hiện lỗi đỏ
    if (!reason) {
        errorText.classList.remove('d-none');
        reasonInput.focus();
        return;
    }

    // Nếu đã nhập -> Ẩn lỗi, tắt Modal
    errorText.classList.add('d-none');
    const modalEl = document.getElementById('rejectReasonModal');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();

    // Lấy lại dữ liệu đơn đang xử lý
    const bookingId = pendingRejectBookingId;
    const buttonElement = pendingRejectButton;
    if (!bookingId || !buttonElement) return;

    // --- Bắt đầu gọi API BackEnd ---
    const originalText = buttonElement.innerHTML;
    buttonElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    buttonElement.disabled = true;

    try {
        const response = await fetch(`${DISPATCHER_API_BASE}/dispatcher/bookings/${bookingId}/reject`, {
            method: 'POST',
            headers: {
                ...getAuthHeader(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason: reason })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            if (typeof showSystemToast === 'function') showSystemToast(result.message, "success");

            // Cập nhật DOM: Đổi thành màu đỏ và xóa nút bấm
            const row = buttonElement.closest('tr');
            if (row) {
                const badge = row.querySelector('.glass-badge');
                if (badge) {
                    badge.className = 'glass-badge bg-danger text-white';
                    badge.innerHTML = '<i class="fa-solid fa-ban me-1"></i> Đã từ chối';
                }
                buttonElement.parentElement.innerHTML = '<span class="text-danger fw-bold"><i class="fa-solid fa-xmark"></i> Hủy bỏ</span>';
            }
        } else {
            if (typeof showSystemToast === 'function') showSystemToast(result.error || "Lỗi khi từ chối đơn", "error");
            buttonElement.innerHTML = originalText;
            buttonElement.disabled = false;
        }
    } catch (error) {
        console.error("Lỗi:", error);
        if (typeof showSystemToast === 'function') showSystemToast("Mất kết nối máy chủ", "error");
        buttonElement.innerHTML = originalText;
        buttonElement.disabled = false;
    } finally {
        // Dọn dẹp bộ nhớ đệm sau khi xử lý xong
        pendingRejectBookingId = null;
        pendingRejectButton = null;
    }
}

// ==========================================
// 13. TẢI DANH SÁCH ĐƠN ĐẶT XE (TÍCH HỢP API GET)
// ==========================================

// Hàm gọi API lấy dữ liệu
async function loadBookings(status, tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    // Hiển thị trạng thái đang tải
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><i class="fa-solid fa-circle-notch fa-spin fs-4 text-secondary"></i><p class="mt-2 text-muted fw-medium">Đang tải dữ liệu hệ thống...</p></td></tr>';

    try {
        let url = `${DISPATCHER_API_BASE}/dispatcher/bookings`;
        // Phân luồng URL theo đúng chuẩn Controller của bạn
        if (status.toUpperCase() === 'PENDING') {
            url += '/pending';
        } else {
            url += `?status=${status}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeader()
        });

        const result = await response.json();

        if (response.ok && result.success) {
            renderBookingTable(result.data, tbody, status);

            // Tự động cập nhật con số thống kê trên thẻ Tab (Nếu bạn có làm ID đếm số)
            const countBadge = document.getElementById(`count-${status.toLowerCase()}`);
            if (countBadge) countBadge.innerText = result.count;
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-3">Lỗi: ${result.error || 'Không thể tải dữ liệu'}</td></tr>`;
        }
    } catch (error) {
        console.error("Lỗi:", error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-3">Mất kết nối đến máy chủ Backend!</td></tr>';
    }
}

// Hàm "Vẽ" dữ liệu lên bảng
function renderBookingTable(bookings, tbody, currentTabStatus) {
    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><i class="fa-regular fa-folder-open fs-1 mb-2 opacity-50"></i><br>Không có đơn đặt xe nào.</td></tr>';
        return;
    }

    tbody.innerHTML = ''; // Xóa rác loading
    bookings.forEach(b => {
        const tr = document.createElement('tr');

        // 1. Format Thời gian cực đẹp
        let depTime = "";
        if (b.departureTime) {
            const d = new Date(b.departureTime);
            depTime = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
        }

        // 2. Xử lý Lộ trình tùy theo Loại hình (BookingType)
        let routeHtml = "";
        if (b.bookingType === 'HOURLY') {
            routeHtml = `<strong>Di chuyển Nội đô HCM</strong> <br><small class="text-muted"><i class="fa-solid fa-location-dot me-1 text-danger"></i> Đón: ${b.pickupAddress}</small>`;
        } else if (b.bookingType === 'DAILY') {
            routeHtml = `<strong>Di chuyển Linh hoạt tự do</strong> <br><small class="text-muted"><i class="fa-solid fa-location-dot me-1 text-danger"></i> Đón: ${b.pickupAddress}</small>`;
        } else {
            routeHtml = `<strong>${b.pickupAddress}</strong> <i class="fa-solid fa-arrow-right mx-1 text-success"></i> <strong>${b.dropoffAddress || 'Chưa XĐ'}</strong>`;
        }

        // 3. Nhãn (Badge) Loại hình dịch vụ
        let typeBadge = '';
        if (b.bookingType === 'HOURLY') typeBadge = '<span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 ms-1">Theo giờ</span>';
        else if (b.bookingType === 'DAILY') typeBadge = '<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 ms-1">Theo ngày</span>';
        else typeBadge = '<span class="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 ms-1">Theo chuyến</span>';

        if (b.tripDirection === 'ROUND_TRIP') typeBadge += ' <span class="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 ms-1">Khứ hồi</span>';

        // 4. Xử lý Nút Bấm & Badge Trạng thái
        let badge = '';
        let actionButtons = '';

        if (b.status === 'PENDING') {
            badge = `<span class="glass-badge bg-secondary text-white">Chờ xử lý</span>`;
            actionButtons = `
                <button class="btn-glass-action btn-glass-approve fw-bold w-100 mb-2" onclick="approveBooking(${b.bookingId}, this)">
                    <i class="fa-solid fa-check me-1"></i> Chấp nhận
                </button>
                <button class="btn-glass-action btn-glass-reject fw-bold w-100" onclick="rejectBooking(${b.bookingId}, this)">
                    <i class="fa-solid fa-xmark me-1"></i> Từ chối
                </button>
            `;
        } else if (b.status === 'UNASSIGNED') {
            badge = `<span class="glass-badge bg-warning text-dark"><i class="fa-solid fa-triangle-exclamation me-1"></i> Thiếu tài xế</span>`;

            // Fallback an toàn cho vehicleId
            const safeVehicleId = b.vehicleId || 0;

            // Thay thế class cũ bằng btn-glass-dispatch
            actionButtons = `
                <button class="btn-glass-action btn-glass-dispatch fw-bold w-100" 
                        onclick="openDispatchModal(${b.bookingId}, ${safeVehicleId})">
                    <i class="fa-solid fa-user-plus me-1"></i> Phân tài thủ công
                </button>
            `;
        } else if (b.status === 'REJECTED') {
            badge = `<span class="glass-badge bg-danger text-white"><i class="fa-solid fa-ban me-1"></i> Đã từ chối</span>`;
            actionButtons = `<span class="text-danger fw-bold"><i class="fa-solid fa-xmark"></i> Đã hủy bỏ</span>`;
        } else if (b.status === 'DISPATCHED') {
            badge = `<span class="glass-badge bg-primary text-white"><i class="fa-solid fa-car-side me-1"></i> Đã phân tài</span>`;
            actionButtons = `<span class="text-success fw-bold"><i class="fa-solid fa-check-circle me-1"></i> Chờ TX nhận</span>`;
        } else if (b.status === 'APPROVED') {
            badge = `<span class="glass-badge bg-info text-white"><i class="fa-solid fa-check-double me-1"></i> Đã duyệt</span>`;
            actionButtons = `<span class="text-primary fw-bold"><i class="fa-solid fa-spinner fa-spin me-1"></i> Tự động tìm TX</span>`;
        }

        tr.innerHTML = `
            <td><strong>#${b.bookingId}</strong><br><small class="text-muted fw-medium">${b.vehicleName}<br>${b.licensePlate || ''}</small></td>
            <td>
                <div class="fw-bold text-dark">${b.customerName}</div>
                <div class="small text-muted fw-medium"><i class="fa-solid fa-phone me-1 text-primary"></i>${b.customerPhone}</div>
            </td>
            <td>
                <div style="font-size: 0.95rem;">${routeHtml} <div class="mt-1">${typeBadge}</div></div>
                <div class="small text-muted mt-2 fw-medium"><i class="fa-regular fa-clock me-1 text-success"></i> Đi: ${depTime}</div>
            </td>
            <td>${badge}</td>
            <td>${actionButtons}</td>
        `;
        tbody.appendChild(tr);
    });
}

// 5. TỰ ĐỘNG TẢI DỮ LIỆU KHI VỪA MỞ TRANG (Mặc định tải PENDING)
document.addEventListener("DOMContentLoaded", () => {
    loadBookings('PENDING', 'tbody-main');
});

// ==========================================
// 14. TÍCH HỢP API: PHÂN TÀI XẾ (DISPATCH)
// ==========================================
let dispatchModalInstance = null;
let currentDispatchBookingId = null;

// Hàm 1: Mở Modal và đổ dữ liệu mồi
window.openDispatchModal = function (bookingId, vehicleId) {
    currentDispatchBookingId = bookingId;

    document.getElementById('dispatchBookingIdDisplay').innerText = `#${bookingId}`;
    document.getElementById('inputDriverId').value = '';

    // Nếu vehicleId = 0 (Chưa có xe), để trống cho Dispatcher tự nhập
    document.getElementById('inputVehicleId').value = (vehicleId && vehicleId !== 0) ? vehicleId : '';

    if (!dispatchModalInstance) {
        dispatchModalInstance = new bootstrap.Modal(document.getElementById('dispatchModal'));
    }
    dispatchModalInstance.show();
};

// Hàm 2: Thực thi API khi bấm Xác nhận
window.executeDispatch = async function () {
    const driverInput = document.getElementById('inputDriverId').value.trim();
    const vehicleInput = document.getElementById('inputVehicleId').value.trim();

    // Bắt lỗi rỗng
    if (!driverInput || !vehicleInput) {
        showSystemToast("Vui lòng nhập đầy đủ ID Tài xế và ID Xe!", "error");
        return;
    }

    // Ép kiểu an toàn (Chống lỗi NaN)
    const driverIdInt = parseInt(driverInput, 10);
    const vehicleIdInt = parseInt(vehicleInput, 10);

    if (isNaN(driverIdInt) || isNaN(vehicleIdInt)) {
        showSystemToast("ID Tài xế và ID Xe bắt buộc phải là số!", "error");
        return;
    }

    const btnSubmit = document.getElementById('btnSubmitDispatch');
    const originalText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-1"></i> Đang xử lý...';
    btnSubmit.disabled = true;

    try {
        console.log(`Đang gửi yêu cầu phân tài: Booking=${currentDispatchBookingId}, Driver=${driverIdInt}, Vehicle=${vehicleIdInt}`);

        const response = await fetch(`${DISPATCHER_API_BASE}/dispatcher/bookings/${currentDispatchBookingId}/dispatch`, {
            method: 'POST',
            headers: postAuthHeader(), // Phải chắc chắn hàm postAuthHeader() tồn tại trên cùng file
            body: JSON.stringify({
                driverId: driverIdInt,
                vehicleId: vehicleIdInt
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showSystemToast(`Đã phân Tài xế #${driverIdInt} cho chuyến #${currentDispatchBookingId} thành công!`, "success");

            // Đóng Modal an toàn
            if (dispatchModalInstance) {
                dispatchModalInstance.hide();
            }

            // Xóa phông nền đen (backdrop) bị kẹt nếu có
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) backdrop.remove();
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';

            // Làm mới bảng danh sách
            loadBookings('UNASSIGNED', 'tbody-main');
        } else {
            showSystemToast(result.error || result.message || "Hệ thống từ chối phân tài!", "error");
        }
    } catch (error) {
        console.error("Lỗi Fetch API Phân tài:", error);
        showSystemToast("Mất kết nối máy chủ FleetFlow!", "error");
    } finally {
        btnSubmit.innerHTML = originalText;
        btnSubmit.disabled = false;
    }
};
// ==========================================
// 15. TÍCH HỢP BẢN ĐỒ LIVE TRACKING (DISPATCHER MAP)
// GET /api/v1/dispatcher/map
// ==========================================

let dispatcherMap = null;
let activeMarkers = {};   // Object lưu trữ các xe đang chạy { bookingId: markerInstance }
let mapInterval = null;   // Biến giữ vòng lặp gọi API

// Tách hàm tạm dừng API để HTML có thể gọi
window.pauseMapTracking = function () {
    if (mapInterval) {
        clearInterval(mapInterval);
        mapInterval = null;
    }
};

// HÀM KHỞI TẠO BẢN ĐỒ VÀ VÒNG LẶP GỌI API
window.initDispatcherMap = function () {
    // 1. NẾU BẢN ĐỒ CHƯA TỒN TẠI -> KHỞI TẠO
    if (!dispatcherMap) {
        dispatcherMap = new vietmapgl.Map({
            container: 'dispatcherMapContainer',
            // style: 'https://maps.vietmap.vn/mt/tm/style.json?apikey=9c63b68ed14a6f2327e9f9fa0170ce81f6f5e0678471c64d', Link url cũ gây lỗi
            style: 'https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=9c63b68ed14a6f2327e9f9fa0170ce81f6f5e0678471c64d',

            center: [106.660172, 10.762622], // Tọa độ trung tâm TP.HCM
            zoom: 12
        });

        dispatcherMap.addControl(new vietmapgl.NavigationControl(), 'top-right');

        // Bắt sự kiện 'load' của bản đồ để chắc chắn style đường phố đã tải xong
        dispatcherMap.on('load', () => {
            console.log("✅ VietMap đã tải nền đường phố thành công!");
            dispatcherMap.resize(); // Ép kích thước ngay khi load xong

            // Bắt đầu gọi API lấy xe
            fetchLiveMapData();
            mapInterval = setInterval(fetchLiveMapData, 30000);
        });
    } else {
        // 2. NẾU BẢN ĐỒ ĐÃ TỒN TẠI (Chỉ là đang chuyển qua lại giữa các Tab)
        if (!mapInterval) {
            fetchLiveMapData();
            mapInterval = setInterval(fetchLiveMapData, 30000);
        }
    }

    // ==========================================
    // CÚ CHỐT: CHIẾN THUẬT RESIZE ÉP BUỘC KHI CHUYỂN TAB
    // ==========================================
    let resizeCount = 0;
    const forceResize = setInterval(() => {
        if (dispatcherMap) {
            dispatcherMap.resize();
        }
        resizeCount++;
        if (resizeCount > 5) clearInterval(forceResize); // Dừng lại sau 1 giây
    }, 200);
};

// HÀM GỌI API XUỐNG BACKEND
async function fetchLiveMapData() {
    try {
        const headers = getAuthHeader();

        // 1. CHẶN NGAY TỪ CLIENT: Nếu không có token, không thèm gọi API đỡ tốn tài nguyên
        if (!headers['Authorization']) {
            console.error("Lỗi: Không tìm thấy Token trong LocalStorage.");
            window.pauseMapTracking();
            return;
        }

        const response = await fetch(`${DISPATCHER_API_BASE}/dispatcher/map`, {
            method: 'GET',
            headers: headers
        });

        // 2. XỬ LÝ LỖI 401 TỪ BACKEND TRẢ VỀ
        if (response.status === 401 || response.status === 403) {
            console.error("Token hết hạn hoặc không có quyền truy cập. Dừng quét map.");

            // Dừng vòng lặp gọi API 30s
            if (typeof window.pauseMapTracking === 'function') {
                window.pauseMapTracking();
            }

            // Báo lỗi cho Dispatcher
            if (typeof showSystemToast === 'function') {
                showSystemToast("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!", "error");
            }

            // Đợi 2 giây rồi đá văng về trang Login an toàn
            setTimeout(() => {
                if (typeof window.handleDispatcherLogout === 'function') {
                    window.handleDispatcherLogout();
                } else {
                    localStorage.clear();
                    window.location.href = '../../index.html';
                }
            }, 2000);

            return; // Thoát hàm ngay lập tức
        }

        // 3. NẾU MỌI THỨ OK -> ĐỔ DỮ LIỆU RA BẢN ĐỒ
        const result = await response.json();
        if (response.ok && result.success) {
            updateMapMarkers(result.data);
        }

    } catch (error) {
        console.error("Lỗi lấy dữ liệu Live Map (Mất mạng hoặc Backend sập):", error);
    }
}

// HÀM XỬ LÝ DỊCH CHUYỂN XE TRÊN BẢN ĐỒ
function updateMapMarkers(ongoingTrips) {
    if (!dispatcherMap || !ongoingTrips) return;

    const currentOngoingIds = [];

    // Duyệt qua từng chiếc xe Backend trả về
    ongoingTrips.forEach(trip => {
        const bId = trip.bookingId;
        const lng = parseFloat(trip.longitude);
        const lat = parseFloat(trip.latitude);

        if (isNaN(lng) || isNaN(lat)) return;

        currentOngoingIds.push(bId);

        // Tính toán thời gian trễ (nếu cần đổi màu marker sau này)
        const recordedTime = new Date(trip.recordedAt);
        const timeString = recordedTime.toLocaleTimeString('vi-VN');

        const tooltipHtml = `
            <div class="live-marker-tooltip">
                <h6 class="fw-bold mb-1 text-primary">Chuyến #${bId}</h6>
                <div class="text-success small fw-bold mt-1" style="font-size: 0.75rem;">
                    <i class="fa-solid fa-satellite-dish"></i> Cập nhật lúc ${timeString}
                </div>
            </div>
        `;

        if (activeMarkers[bId]) {
            // NẾU XE ĐÃ CÓ TRÊN BẢN ĐỒ -> Cập nhật tọa độ & tooltip mới
            activeMarkers[bId].setLngLat([lng, lat]);
            const markerEl = activeMarkers[bId].getElement();
            if (markerEl) {
                markerEl.innerHTML = tooltipHtml;
            }
        } else {
            // NẾU LÀ XE MỚI -> Tạo Marker mới (Chấm xanh hiệu ứng)
            const el = document.createElement('div');
            el.className = 'live-pulse-dot';
            el.innerHTML = tooltipHtml;

            const newMarker = new vietmapgl.Marker(el)
                .setLngLat([lng, lat])
                .addTo(dispatcherMap);

            activeMarkers[bId] = newMarker;
        }
    });

    // DỌN RÁC (Xóa xe đã hoàn thành khỏi map)
    Object.keys(activeMarkers).forEach(storedBookingId => {
        if (!currentOngoingIds.includes(parseInt(storedBookingId))) {
            activeMarkers[storedBookingId].remove();
            delete activeMarkers[storedBookingId];
        }
    });
}// ==========================================
// 16. QUẢN LÝ KHIẾU NẠI (COMPLAINTS)
// ==========================================
let currentResolveComplaintId = null;
let resolveModalInstance = null;

// Hàm tải danh sách khiếu nại
window.loadComplaints = async function () {
    const tbody = document.getElementById('complaintsListBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-white-50 py-4"><i class="fa-solid fa-circle-notch fa-spin me-2"></i> Đang tải dữ liệu...</td></tr>';

    try {
        const response = await fetch(`${DISPATCHER_API_BASE}/dispatcher/complaints`, {
            method: 'GET',
            headers: getAuthHeader()
        });

        const result = await response.json();

        if (response.ok && result.success) {
            if (!result.data || result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4"><i class="fa-regular fa-folder-open fs-1 mb-2 opacity-50"></i><br>Không có khiếu nại nào.</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            result.data.forEach(c => {
                const isPending = c.status === 'PENDING';
                let statusBadge = isPending ? '<span class="glass-badge bg-warning text-dark" style="font-size: 12px;">Chờ xử lý</span>' : '<span class="glass-badge bg-success text-white" style="font-size: 12px;">Đã giải quyết</span>';

                let actionHtml = isPending ? `<button class="btn-glass-action bg-success text-white border-success w-100" onclick="openResolveModal(${c.complaintId})"><i class="fa-solid fa-check-to-slot me-1"></i> Xử lý</button>` : `<span class="text-success fw-bold"><i class="fa-solid fa-shield-check"></i> Hoàn tất</span>`;

                let dateStr = new Date(c.createdAt).toLocaleString('vi-VN');

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>#${c.complaintId}</strong></td>
                    <td><strong>${c.bookingId}</strong></td>
                    <td>${c.customerId}</td>
                    <td>
                        <div class="fw-bold mb-1" style="max-width: 250px; white-space: normal; color: var(--text-color);">${c.content}</div>
                        ${c.resolution ? `<div class="small text-success mt-1"><strong>Giải quyết:</strong> ${c.resolution}</div>` : ''}
                    </td>
                    <td>${statusBadge}<br><small class=" mt-1 d-block">${dateStr}</small></td>
                    <td>${actionHtml}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-3">Lỗi: ${result.error || 'Không thể tải dữ liệu'}</td></tr>`;
        }
    } catch (error) {
        console.error("Lỗi:", error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-3">Mất kết nối đến máy chủ!</td></tr>';
    }
};

// Hàm mở Modal giải quyết
window.openResolveModal = function (complaintId) {
    currentResolveComplaintId = complaintId;
    document.getElementById('complaintResolutionInput').value = '';
    document.getElementById('complaintResolutionError').classList.add('d-none');

    document.getElementById('resolveComplaintModal').classList.add('active');
};

window.closeResolveModal = function () {
    document.getElementById('resolveComplaintModal').classList.remove('active');
};

// Hàm Submit giải quyết
window.executeResolveComplaint = async function () {
    const input = document.getElementById('complaintResolutionInput');
    const errorMsg = document.getElementById('complaintResolutionError');
    const resolutionText = input.value.trim();

    if (!resolutionText) {
        errorMsg.classList.remove('d-none');
        input.focus();
        return;
    }
    errorMsg.classList.add('d-none');

    const btn = document.getElementById('btnSubmitResolution');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Đang xử lý...';
    btn.disabled = true;

    try {
        const response = await fetch(`${DISPATCHER_API_BASE}/dispatcher/complaints/${currentResolveComplaintId}/resolve`, {
            method: 'PUT',
            headers: postAuthHeader(),
            body: JSON.stringify({ resolution: resolutionText })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            if (typeof showSystemToast === 'function') showSystemToast("Đã ghi nhận giải quyết khiếu nại!", "success");
            closeResolveModal();
            loadComplaints(); // reload
        } else {
            if (typeof showSystemToast === 'function') showSystemToast(result.error || "Lỗi xử lý!", "error");
        }
    } catch (error) {
        if (typeof showSystemToast === 'function') showSystemToast("Mất kết nối server!", "error");
    } finally {
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
};

// Lắng nghe sự kiện chuyển Tab để tự động load dữ liệu
document.addEventListener('DOMContentLoaded', () => {
    const complaintsLink = document.querySelector('a[href="#disputes"]');
    if (complaintsLink) {
        complaintsLink.addEventListener('click', () => {
            loadComplaints();
        });
    }
});

// ==========================================
// 10. NOTIFICATION MODULE
// ==========================================

const DISPATCHER_NOTIFICATION_API_URL = `${DISPATCHER_API_BASE}/dispatcher/notifications`;

// Gọi API lấy danh sách notification
async function fetchDispatcherNotifications() {
    try {
        const response = await fetch(DISPATCHER_NOTIFICATION_API_URL, {
            method: 'GET',
            headers: getAuthHeader()
        });
        const result = await response.json();

        if (result.success && result.data) {
            renderNotifications(result.data);
        }
    } catch (error) {
        console.error("Lỗi khi fetch notifications:", error);
    }
}

// Render notification vào UI
function renderNotifications(notifications) {
    const listEl = document.getElementById('notificationList');
    const countEl = document.getElementById('notiCount');

    if (!listEl) return;

    // Tính tổng chưa đọc
    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Update Badge
    if (countEl) {
        if (unreadCount > 0) {
            countEl.textContent = unreadCount > 99 ? '99+' : unreadCount;
            countEl.style.display = 'flex'; // Hiện
        } else {
            countEl.style.display = 'none'; // Ẩn
        }
    }

    // Render list
    if (notifications.length === 0) {
        listEl.innerHTML = '<div class="text-center p-4 text-muted">Không có thông báo nào</div>';
        return;
    }

    let html = '';
    notifications.forEach(noti => {
        const isUnread = !noti.isRead;
        // Icon tuỳ loại thông báo
        let iconClass = 'fa-bell';
        if (noti.type === 'BOOKING_DRIVER_ASSIGNED') iconClass = 'fa-solid fa-truck-fast';
        else if (noti.type === 'BOOKING_DRIVER_ACCEPTED') iconClass = 'fa-solid fa-check text-success';
        else if (noti.type === 'BOOKING_DRIVER_REJECTED') iconClass = 'fa-solid fa-xmark text-danger';

        // Format Date
        let timeStr = noti.createdAt;
        try {
            if (timeStr) {
                const date = new Date(timeStr);
                if (!isNaN(date.getTime())) {
                    timeStr = date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
                }
            }
        } catch (e) { }

        html += `
            <div class="notification-item ${isUnread ? 'unread' : ''}" onclick="markNotificationAsRead(${noti.NotificationID}, this)">
                <div class="notification-icon-wrapper">
                    <i class="${iconClass}"></i>
                </div>
                <div class="notification-content">
                    <h6>${noti.title}</h6>
                    <p>${noti.message}</p>
                    <div class="notification-time">${timeStr || ''}</div>
                </div>
            </div>
        `;
    });

    listEl.innerHTML = html;
}

// Đánh dấu đã đọc
async function markNotificationAsRead(id, element) {
    // Nếu element đã nhạt màu (đã đọc) thì ko gọi API thừa
    if (element && !element.classList.contains('unread')) {
        return;
    }

    try {
        const response = await fetch(`${DISPATCHER_NOTIFICATION_API_URL}/${id}/read`, {
            method: 'POST',
            headers: postAuthHeader()
        });
        const result = await response.json();
        if (result.success) {
            if (element) {
                element.classList.remove('unread'); // Remove unread class
            }
            fetchDispatcherNotifications(); // Cập nhật lại số lượng
        }
    } catch (error) {
        console.error("Lỗi đánh dấu notification:", error);
    }
}

// Khởi chạy khi tải trang
document.addEventListener('DOMContentLoaded', () => {
    // Lần đầu tải
    fetchDispatcherNotifications();
    // Lặp mỗi 15 giây
    setInterval(fetchDispatcherNotifications, 15000);
});


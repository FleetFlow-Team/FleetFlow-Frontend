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
// HÀM KIỂM TRA TOKEN JWT HẾT HẠN
// ==========================================
function isJwtExpired(token) {
    if (!token) return true;
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        if (payload && payload.exp) {
            return (payload.exp * 1000) < Date.now();
        }
        return false;
    } catch (e) {
        return true; // Token sai định dạng coi như hết hạn
    }
}

// ==========================================
// HÀM XỬ LÝ ĐĂNG XUẤT KHI HẾT HẠN TOKEN
// ==========================================
function handleTokenExpiredLogout() {
    if (window.isLoggedOutByToken) return;
    window.isLoggedOutByToken = true;

    if (typeof window.pauseMapTracking === 'function') {
        window.pauseMapTracking();
    }

    alert("Phiên đăng nhập hoặc Token JWT đã hết hạn! Hệ thống sẽ tự động đăng xuất về trang chủ.");
    localStorage.clear();
    window.location.href = '../../index.html';
}

// ==========================================
// BỘ ĐÁNH CHẶN FETCH TOÀN CỤC (GLOBAL INTERCEPTOR)
// ==========================================
const originalFetch = window.fetch;
window.fetch = async function (...args) {
    const response = await originalFetch(...args);
    if (response.status === 401 || response.status === 403) {
        handleTokenExpiredLogout();
    }
    return response;
};

// ==========================================
// 8. TÍCH HỢP PROFILE TỪ LOCALSTORAGE & LOGOUT
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    const fullName = localStorage.getItem('fullName');
    const userRole = localStorage.getItem('userRole');
    const token = localStorage.getItem('accessToken');

    // Kiểm tra Token JWT ngay khi tải trang
    if (!token || isJwtExpired(token)) {
        handleTokenExpiredLogout();
        return;
    }

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
                    // GỌI THÊM API NOTIFICATION để bắt thông báo "Hệ thống tự động phân tài"
                    if (typeof fetchDispatcherNotifications === 'function') {
                        fetchDispatcherNotifications();
                    }
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

    // Tự động cập nhật class active cho các tab button
    document.querySelectorAll('.btn-glass-tab').forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick') || '';
        if (onclickAttr.includes(`'${status}'`)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

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
            if (b.driverName) {
                actionButtons = `<div class="text-success fw-bold" style="font-size: 0.9rem;"><i class="fa-solid fa-check-circle me-1"></i> TX: ${b.driverName}</div>
                                 <div class="small text-muted"><i class="fa-solid fa-phone me-1"></i> ${b.driverPhone || ''}</div>`;
            } else {
                actionButtons = `<span class="text-success fw-bold"><i class="fa-solid fa-check-circle me-1"></i> Chờ TX nhận</span>`;
            }
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

            // Cập nhật lại Bảng & kích hoạt lại Notifications API để bắt thông báo Phân tài xế
            loadBookings('UNASSIGNED', 'tbody-main');
            if (typeof fetchDispatcherNotifications === 'function') {
                fetchDispatcherNotifications();
            }
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
            handleTokenExpiredLogout();
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
}

// ==========================================
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

            // --- BỘ SIÊU BÓC TÁCH (SUPER FALLBACK PARSER) ---
            const parseSuperFeedback = (rawStr) => {
                if (!rawStr) return { issue: 'Vấn đề chung', actualContent: 'Không có chi tiết', fullName: null, phone: null, email: null, type: null, resolution: null };
                let str = rawStr.trim();
                let issue = '';
                let actualContent = str;
                let fullName = null, phone = null, email = null, type = null, resolution = null;

                if (str.includes('Giải quyết:')) {
                    let idx = str.indexOf('Giải quyết:');
                    resolution = str.substring(idx + 11).trim();
                    str = str.substring(0, idx).trim();
                }
                if (str.includes('Nội dung:')) {
                    let idx = str.indexOf('Nội dung:');
                    actualContent = str.substring(idx + 9).trim();
                    str = str.substring(0, idx).trim();
                }
                if (str.includes('Liên hệ:')) {
                    let idx = str.indexOf('Liên hệ:');
                    let contactStr = str.substring(idx + 8).trim();
                    if (contactStr.includes('@')) email = contactStr;
                    else phone = contactStr;
                    str = str.substring(0, idx).trim();
                }
                if (str.includes('Họ tên:')) {
                    let idx = str.indexOf('Họ tên:');
                    fullName = str.substring(idx + 7).trim();
                    str = str.substring(0, idx).trim();
                }
                if (str.startsWith('[')) {
                    let closeIdx = str.indexOf(']');
                    if (closeIdx !== -1) {
                        type = str.substring(1, closeIdx).trim();
                        issue = str.substring(closeIdx + 1).replace(/^[-\s]+/, '').trim();
                        if (!actualContent || actualContent === rawStr.trim()) {
                            if (!issue) actualContent = str.substring(closeIdx + 1).trim();
                        }
                    } else {
                        issue = str.replace(/^[-\s]+/, '').trim();
                    }
                } else if (str !== actualContent && str.length > 0) {
                    issue = str;
                }
                return { issue, actualContent: actualContent || 'Không có chi tiết', fullName, phone, email, type, resolution };
            };

            window.currentComplaintsList = result.data;
            tbody.innerHTML = '';

            result.data.forEach(c => {
                const id = c.complaintId || c.ComplaintID || 'N/A';
                const rawContent = c.content || c.Content || '';
                const parsed = parseSuperFeedback(rawContent);

                let fullName = (c.fullName && c.fullName !== 'N/A' && isNaN(c.fullName)) ? c.fullName : (parsed.fullName || (c.customerId ? `Thành viên #${c.customerId}` : 'Khách vãng lai'));
                let email = (c.email && c.email !== 'N/A' && c.email !== 'Chưa có Email') ? c.email : (parsed.email || 'Chưa có Email');
                let phone = (c.phone && c.phone !== 'N/A' && c.phone !== 'Chưa có SĐT') ? c.phone : (parsed.phone || 'Chưa có SĐT');
                let province = c.province || c.region || 'Không xác định';

                const type = (c.type && c.type !== 'OTHER') ? c.type : (parsed.type || c.type || c.complaintType || 'OTHER');
                const issueType = (c.issueType && !c.issueType.includes('Họ tên:')) ? c.issueType : (parsed.issue || 'Vấn đề chung');
                const content = (c.content && !c.content.includes('Họ tên:')) ? c.content : (parsed.actualContent || 'Không có chi tiết');
                const resolution = c.resolution || c.Resolution || parsed.resolution || '';

                const status = c.status || 'PENDING';
                const formatTime = (timeStr) => {
                    if (!timeStr) return '';
                    const d = new Date(timeStr);
                    if (isNaN(d.getTime())) return timeStr;
                    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                };
                const createdAt = formatTime(c.createdAt);
                const resolvedAt = formatTime(c.resolvedAt);

                // Cột 2: Khách hàng
                const customerHtml = `
                    <div class="fw-bold fs-6 mb-1" style="color: var(--text-color); ">${fullName}</div>
                    <div class="small fw-medium mb-1" style="color: var(--text-color); font-size: 0.82rem;"><i class="fa-solid fa-phone me-1"></i>${phone}</div>
                    <div class="small fw-medium" style="color: var(--text-color); font-size: 0.82rem;"><i class="fa-solid fa-envelope me-1""></i>${email}</div>
                    ${c.bookingId ? `<div class="fw-bold small mt-1" style="color: var(--text-color); font-size: 0.78rem;"><i class="fa-solid fa-receipt me-1"></i>Đơn #${c.bookingId}</div>` : ''}
                `;

                // // Cột 3: Khu vực
                // const provinceHtml = `<span class="glass-badge" style=" font-size: 0.82rem;"><i class="fa-solid fa-location-dot me-1"></i>${province}</span>`;

                // Cột 4: Vấn đề
                let typeBadge = '';
                if (type === 'SERVICE_FEEDBACK') {
                    typeBadge = `<span class="glass-badge mb-1 d-inline-block" style="background: rgba(255, 255, 255, 0.387); border: 1px solid rgba(49, 130, 206, 0.6); color: #63b6ed; font-size: 0.78rem;"><i class="fa-solid fa-user-check me-1"></i> Thái độ / Dịch vụ</span>`;
                } else if (type === 'LOST_LUGGAGE') {
                    typeBadge = `<span class="glass-badge mb-1 d-inline-block" style="background: rgba(255, 255, 255, 0.387); border: 1px solid rgba(237, 137, 54, 0.6); color: #F7B942; font-size: 0.78rem;"><i class="fa-solid fa-suitcase me-1"></i> Thất lạc hành lý</span>`;
                } else {
                    typeBadge = `<span class="glass-badge mb-1 d-inline-block" style="background: rgba(255, 255, 255, 0.387); border: 1px solid rgba(160, 174, 192, 0.6); color: gray; font-size: 0.78rem;"><i class="fa-solid fa-circle-question me-1"></i> Vấn đề khác</span>`;
                }

                let problemHtml = `
                    ${typeBadge}
                    <div class="p-2 mt-1" style="background: rgba(255, 255, 255, 0.387); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px; color: var(--text-color); font-size: 0.85rem; line-height: 1.4; box-shadow: inset 0 2px 6px rgba(0,0,0,0.3);">
                        "${content}"
                    </div>
                `;
                if (resolution) {
                    problemHtml += `<div class="p-2 mt-2" style="background: rgba(0, 177, 79, 0.2); border: 1px solid rgba(0, 177, 79, 0.5); border-radius: 12px; color: #00B14F; font-size: 0.8rem;"><i class="fa-solid fa-check-double me-1"></i><strong>Giải quyết:</strong> ${resolution}</div>`;
                }

                // Cột 5: Tình trạng
                let statusHtml = '';
                if (status === 'PENDING') {
                    statusHtml = `<span class="glass-badge mb-1 d-inline-block" style="background: #FBFFB3; border: 1px solid rgba(255, 215, 0, 0.6); color: #ffd700;"><i class="fa-solid fa-hourglass-half me-1"></i>Chờ xử lý</span>`;
                } else {
                    statusHtml = `<span class="glass-badge mb-1 d-inline-block" style="background: rgba(0, 177, 79, 0.2); border: 1px solid rgba(0, 177, 79, 0.6); color: #00B14F;"><i class="fa-solid fa-check-double me-1"></i>Đã giải quyết</span>`;
                }
                statusHtml += `<div class="small mt-1 " title="Thời gian tạo" style="font-size: 0.9rem;"><i class="fa-regular fa-clock me-1" "></i>${createdAt}</div>`;
                if (resolvedAt) {
                    statusHtml += `<div class="small" title="Thời gian hoàn tất" style=" font-size: 0.9rem;"><i class="fa-solid fa-check me-1"></i>${resolvedAt}</div>`;
                }

                // Cột 6: Thao tác (Liquid Glass Actions)
                let actionHtml = '';
                if (status === 'PENDING') {
                    actionHtml += `<button class="btn btn-glass-approve w-100 mb-2 fw-bold" style="font-size: 0.82rem;" onclick="openResolveModal(${id})"><i class="fa-solid fa-gavel me-1"></i> Giải Quyết</button>`;
                }
                actionHtml += `<button class="btn btn-glass-dispatch w-100 fw-bold" style="font-size: 0.82rem;" onclick="openComplaintDetailModal(${id})"><i class="fa-solid fa-eye me-1"></i> Chi tiết</button>`;


                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="fw-bold">#${id}</td>
                    <td>${customerHtml}</td>
                    <td style="font-size: 0.85rem; max-width: 320px;">${problemHtml}</td>
                    <td>${statusHtml}</td>
                    <td class="text-center">${actionHtml}</td>
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

// --- MỞ & ĐÓNG MODAL CHI TIẾT KHIẾU NẠI (LIQUID GLASS APPLE THEME) ---
window.openComplaintDetailModal = function (complaintId) {
    if (!window.currentComplaintsList) return;
    const c = window.currentComplaintsList.find(item => (item.complaintId || item.ComplaintID) == complaintId);
    if (!c) return;

    const rawContent = c.content || c.Content || '';
    let str = rawContent.trim();
    let issue = '';
    let actualContent = str;
    let fullName = null, phone = null, email = null, type = null, resolution = null;

    if (str.includes('Giải quyết:')) {
        let idx = str.indexOf('Giải quyết:');
        resolution = str.substring(idx + 11).trim();
        str = str.substring(0, idx).trim();
    }
    if (str.includes('Nội dung:')) {
        let idx = str.indexOf('Nội dung:');
        actualContent = str.substring(idx + 9).trim();
        str = str.substring(0, idx).trim();
    }
    if (str.includes('Liên hệ:')) {
        let idx = str.indexOf('Liên hệ:');
        let contactStr = str.substring(idx + 8).trim();
        if (contactStr.includes('@')) email = contactStr;
        else phone = contactStr;
        str = str.substring(0, idx).trim();
    }
    if (str.includes('Họ tên:')) {
        let idx = str.indexOf('Họ tên:');
        fullName = str.substring(idx + 7).trim();
        str = str.substring(0, idx).trim();
    }
    if (str.startsWith('[')) {
        let closeIdx = str.indexOf(']');
        if (closeIdx !== -1) {
            type = str.substring(1, closeIdx).trim();
            issue = str.substring(closeIdx + 1).replace(/^[-\s]+/, '').trim();
            if (!actualContent || actualContent === rawContent.trim()) {
                if (!issue) actualContent = str.substring(closeIdx + 1).trim();
            }
        } else {
            issue = str.replace(/^[-\s]+/, '').trim();
        }
    } else if (str !== actualContent && str.length > 0) {
        issue = str;
    }

    const finalFullName = (c.fullName && c.fullName !== 'N/A' && isNaN(c.fullName)) ? c.fullName : (fullName || (c.customerId ? `Thành viên #${c.customerId}` : 'Khách vãng lai'));
    const finalEmail = (c.email && c.email !== 'N/A' && c.email !== 'Chưa có Email') ? c.email : (email || 'Chưa cập nhật Email');
    const finalPhone = (c.phone && c.phone !== 'N/A' && c.phone !== 'Chưa có SĐT') ? c.phone : (phone || 'Chưa cập nhật SĐT');
    const finalProvince = c.province || c.region || 'Không xác định';
    const finalType = (c.type && c.type !== 'OTHER') ? c.type : (type || c.complaintType || 'OTHER');
    const finalIssue = (c.issueType && !c.issueType.includes('Họ tên:')) ? c.issueType : (issue || 'Vấn đề chung');
    const finalContent = (c.content && !c.content.includes('Họ tên:')) ? c.content : (actualContent || 'Không có chi tiết');
    const finalResolution = c.resolution || c.Resolution || resolution || '';
    const finalStatus = c.status || 'PENDING';

    const formatTime = (timeStr) => {
        if (!timeStr) return 'N/A';
        const d = new Date(timeStr);
        if (isNaN(d.getTime())) return timeStr;
        return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setHtml = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };

    setTxt('detailComplaintId', '#' + complaintId);
    setTxt('detailFullName', finalFullName);
    setTxt('detailPhone', finalPhone);
    setTxt('detailEmail', finalEmail);
    setTxt('detailBookingId', c.bookingId ? '#' + c.bookingId : 'Không gắn với đơn cụ thể');
    setTxt('detailProvince', finalProvince);
    setTxt('detailIssueType', finalIssue);
    setTxt('detailContent', finalContent);
    setTxt('detailCreatedAt', formatTime(c.createdAt));

    let typeBadgeHtml = '';
    if (finalType === 'SERVICE_FEEDBACK') {
        typeBadgeHtml = `<span class="glass-badge" style="background: rgba(49, 130, 206, 0.25); border: 1px solid rgba(49, 130, 206, 0.6); color: #63b3ed; font-size: 0.8rem;"><i class="fa-solid fa-user-check me-1"></i> Thái độ / Dịch vụ</span>`;
    } else if (finalType === 'LOST_LUGGAGE') {
        typeBadgeHtml = `<span class="glass-badge" style="background: rgba(237, 137, 54, 0.25); border: 1px solid rgba(237, 137, 54, 0.6); color: #fbd38d; font-size: 0.8rem;"><i class="fa-solid fa-suitcase me-1"></i> Thất lạc hành lý</span>`;
    } else {
        typeBadgeHtml = `<span class="glass-badge" style="background: rgba(160, 174, 192, 0.25); border: 1px solid rgba(160, 174, 192, 0.6); color: #e2e8f0; font-size: 0.8rem;"><i class="fa-solid fa-circle-question me-1"></i> Vấn đề khác</span>`;
    }
    setHtml('detailTypeBadge', typeBadgeHtml);

    let statusHtml = '';
    if (finalStatus === 'PENDING') {
        statusHtml = `<span class="glass-badge" style="background: #FBFFB3; border: 1px solid rgba(255, 215, 0, 0.6); color: #ffd700;"><i class="fa-solid fa-hourglass-half me-1"></i> Đang chờ xử lý</span>`;
    } else {
        statusHtml = `<span class="glass-badge" style="background: rgba(0, 177, 79, 0.2); border: 1px solid rgba(0, 177, 79, 0.6); color: #00B14F;"><i class="fa-solid fa-check-double me-1"></i> Đã giải quyết xong</span>`;
    }
    setHtml('detailStatus', statusHtml);

    const resBox = document.getElementById('detailResolutionBox');
    if (resBox) {
        if (finalResolution) {
            setTxt('detailResolution', finalResolution);
            resBox.classList.remove('d-none');
        } else {
            resBox.classList.add('d-none');
        }
    }

    const modal = document.getElementById('complaintDetailModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
};

window.closeComplaintDetailModal = function () {
    const modal = document.getElementById('complaintDetailModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
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
// 10. NOTIFICATION MODULE (Tích hợp API thực tế)
// ==========================================

const DISPATCHER_NOTIFICATION_API_URL = `${DISPATCHER_API_BASE}/dispatcher/notifications`;
let knownNotificationIds = new Set();
let isFirstFetchNoti = true;

// Gọi API lấy danh sách notification
async function fetchDispatcherNotifications() {
    try {
        const response = await fetch(DISPATCHER_NOTIFICATION_API_URL, {
            method: 'GET',
            headers: getAuthHeader()
        });
        const result = await response.json();

        if (response.ok && result.success && result.data) {
            renderNotifications(result.data);
        }
    } catch (error) {
        console.error("Lỗi khi fetch notifications:", error);
    }
}

// Render notification vào UI (Dropdown & Toast)
function renderNotifications(notifications) {
    const listEl = document.getElementById('notificationList');
    const countEl = document.getElementById('notiCount');

    if (!listEl) return;

    // 1. Tính tổng chưa đọc (API trả về boolean IsRead)
    const unreadCount = notifications.filter(n => n.IsRead === false).length;

    // 2. Cập nhật con số trên quả chuông (Badge)
    if (countEl) {
        if (unreadCount > 0) {
            countEl.textContent = unreadCount > 99 ? '99+' : unreadCount;
            countEl.style.display = 'flex'; // Hiện
        } else {
            countEl.style.display = 'none'; // Ẩn
        }
    }

    // 3. Hiển thị Toast Popup cho thông báo MỚI (bỏ qua lần fetch mồi đầu tiên)
    if (!isFirstFetchNoti) {
        notifications.forEach(noti => {
            if (noti.IsRead === false && noti.NotificationID && !knownNotificationIds.has(noti.NotificationID)) {
                if (typeof showSystemToast === 'function') {
                    // Nổ popup nhỏ xíu ở góc màn hình
                    showSystemToast(`[${noti.Title}] ${noti.Message}`, "info");
                }
            }
        });
    }

    // 4. Cập nhật bộ nhớ đệm chống spam Toast
    notifications.forEach(noti => {
        if (noti.NotificationID) knownNotificationIds.add(noti.NotificationID);
    });
    isFirstFetchNoti = false;

    // 5. Render danh sách vào Dropdown
    if (notifications.length === 0) {
        listEl.innerHTML = '<div class="text-center p-4 text-muted">Chưa có thông báo nào.</div>';
        return;
    }

    let html = '';
    notifications.forEach(noti => {
        const isUnread = noti.IsRead === false;

        // Xử lý Ngày Giờ ("Jun 30, 2026 10:49:51 AM")
        let formattedTime = noti.CreatedAt;
        try {
            const date = new Date(noti.CreatedAt);
            if (!isNaN(date.getTime())) {
                formattedTime = date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
            }
        } catch (e) { }

        // Diễn giải trường "Type" thành Icon và Màu sắc Badge
        let typeText = 'Hệ Thống';
        let typeBadgeClass = 'bg-secondary';
        let typeIconColor = 'text-secondary';
        let iconClass = 'fa-bell';

        if (noti.Type === 'BOOKING_DRIVER_ASSIGNED') {
            typeText = 'Phân Tài';
            typeBadgeClass = 'bg-primary';
            typeIconColor = 'text-primary';
            iconClass = 'fa-car-side';
        } else if (noti.Type === 'NEW_BOOKING') {
            typeText = 'Đơn Mới';
            typeBadgeClass = 'bg-warning';
            typeIconColor = 'text-warning';
            iconClass = 'fa-file-invoice-dollar';
        } else if (noti.Type === 'BOOKING_DRIVER_ACCEPTED') {
            typeText = 'Tài xế Nhận';
            typeBadgeClass = 'bg-success';
            typeIconColor = 'text-success';
            iconClass = 'fa-circle-check';
        } else if (noti.Type === 'BOOKING_DRIVER_REJECTED') {
            typeText = 'Tài xế Hủy';
            typeBadgeClass = 'bg-danger';
            typeIconColor = 'text-danger';
            iconClass = 'fa-circle-xmark';
        }

        // Tình trạng Chưa đọc / Đã đọc
        const readStatusHtml = isUnread
            ? `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25" style="font-size: 0.65rem;">Chưa đọc</span>`
            : `<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25" style="font-size: 0.65rem;">Đã đọc</span>`;

        html += `
            <div class="notification-item ${isUnread ? 'unread' : ''}" onclick="markNotificationAsRead(${noti.NotificationID}, this)">
                <div class="notification-icon-wrapper ${typeIconColor}">
                    <i class="fa-solid ${iconClass}"></i>
                </div>
                <div class="notification-content" style="flex-grow: 1;">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="badge ${typeBadgeClass} bg-opacity-25 text-white border border-opacity-25 rounded-pill px-2 py-1" style="font-size: 0.65rem; font-weight: 600;">${typeText}</span>
                        ${readStatusHtml}
                    </div>
                    <h6 class="fw-bold text-white mt-2 mb-1" style="font-size: 0.95rem;">${noti.Title}</h6>
                    <p class="text-white-50 mb-2" style="font-size: 0.85rem; line-height: 1.4;">${noti.Message}</p>
                    <div class="d-flex align-items-center text-white-50" style="font-size: 0.75rem;">
                        <i class="fa-regular fa-clock me-1"></i> ${formattedTime}
                    </div>
                </div>
            </div>
        `;
    });

    listEl.innerHTML = html;
}

// 6. Gửi API Đánh dấu đã đọc khi Dispatcher click vào thông báo
async function markNotificationAsRead(id, element) {
    // Nếu element đã nhạt màu (đã đọc rồi) thì ko gọi API thừa nữa
    if (element && !element.classList.contains('unread')) {
        return;
    }

    try {
        const response = await fetch(`${DISPATCHER_NOTIFICATION_API_URL}/${id}/read`, {
            method: 'POST',
            headers: postAuthHeader()
        });
        const result = await response.json();

        if (response.ok && result.success) {
            // Thay đổi giao diện tức thì (Client-side prediction) để mượt mà
            if (element) {
                element.classList.remove('unread');
                const readBadge = element.querySelector('.badge.bg-danger.bg-opacity-10');
                if (readBadge) {
                    readBadge.className = 'badge bg-success bg-opacity-10 text-success border border-success border-opacity-25';
                    readBadge.textContent = 'Đã đọc';
                }
            }
            // Background fetch lại để đồng bộ tổng số đếm trên quả chuông
            fetchDispatcherNotifications();
        }
    } catch (error) {
        console.error("Lỗi đánh dấu notification:", error);
    }
}

// Khởi chạy khi tải trang
document.addEventListener('DOMContentLoaded', () => {
    // Lần đầu tải mồi
    fetchDispatcherNotifications();
    // Vòng lặp lấy thông báo (Polling) mỗi 5 giây
    setInterval(fetchDispatcherNotifications, 5000);
});


// Tự động tải sẵn khi load trang
document.addEventListener("DOMContentLoaded", function () {
    loadComplaints();
});

// Tự động chuyển trạng thái active cho các nút tab
document.querySelectorAll('.btn-glass-tab').forEach(btn => {
    const onclickAttr = btn.getAttribute('onclick') || '';
    if (onclickAttr.includes(`'${status}'`)) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }
});

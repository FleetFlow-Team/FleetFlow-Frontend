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
window.handleDispatcherLogout = function() {
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
                
                // Thay vì gọi dispatchDriver, ta gọi đúng hàm openDispatchModal.
                // Truyền tham số 0 vào vị trí vehicleId để Modal hiểu là cho phép Dispatcher tự nhập ID Xe.
                // Đổi nút bấm thành nút Phân tài chuẩn Liquid Glass
                const tdAction = buttonElement.parentElement;
                tdAction.innerHTML = `
                    <button class="btn-glass-action btn-glass-dispatch fw-bold w-100" 
                            onclick="openDispatchModal(${bookingId}, 0)">
                        Phân tài
                    </button>
                `;
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
            depTime = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')} - ${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
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
            badge = `<span class="glass-badge bg-secondary text-white">Chờ duyệt</span>`;
            actionButtons = `
                <button class="btn-glass-action btn-glass-approve fw-bold w-100 mb-2" onclick="approveBooking(${b.bookingId}, this)">
                    <i class="fa-solid fa-check me-1"></i> Duyệt
                </button>
                <button class="btn-glass-action btn-glass-reject fw-bold w-100" onclick="rejectBooking(${b.bookingId}, this)">
                    <i class="fa-solid fa-xmark me-1"></i> Từ chối
                </button>
            `;
        } else if (b.status === 'APPROVED') {
            badge = `<span class="glass-badge bg-info text-white"><i class="fa-solid fa-check-double me-1"></i> Đã duyệt</span>`;
            
            // Fallback an toàn cho vehicleId
            const safeVehicleId = b.vehicleId || 0; 
            
            // Thay thế class cũ bằng btn-glass-dispatch
            actionButtons = `
                <button class="btn-glass-action btn-glass-dispatch fw-bold w-100" 
                        onclick="openDispatchModal(${b.bookingId}, ${safeVehicleId})">
                    Phân tài
                </button>
            `;
        } else if (b.status === 'REJECTED') {
            badge = `<span class="glass-badge bg-danger text-white"><i class="fa-solid fa-ban me-1"></i> Đã từ chối</span>`;
            actionButtons = `<span class="text-danger fw-bold"><i class="fa-solid fa-xmark"></i> Đã hủy bỏ</span>`;
        } else if (b.status === 'DISPATCHED') {
            badge = `<span class="glass-badge bg-primary text-white"><i class="fa-solid fa-car-side me-1"></i> Đã phân tài</span>`;
            actionButtons = `<span class="text-success fw-bold"><i class="fa-solid fa-check-circle me-1"></i> Chờ TX nhận</span>`;
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
    loadBookings('PENDING', 'tbody-pending');
});

// ==========================================
// 14. TÍCH HỢP API: PHÂN TÀI XẾ (DISPATCH)
// ==========================================
let dispatchModalInstance = null;
let currentDispatchBookingId = null;

// Hàm 1: Mở Modal và đổ dữ liệu mồi
window.openDispatchModal = function(bookingId, vehicleId) {
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
window.executeDispatch = async function() {
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
            if(dispatchModalInstance) {
                dispatchModalInstance.hide();
            }
            
            // Xóa phông nền đen (backdrop) bị kẹt nếu có
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) backdrop.remove();
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';

            // Làm mới bảng danh sách
            loadBookings('APPROVED', 'tbody-main');
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
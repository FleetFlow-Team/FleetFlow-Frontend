const DISPATCHER_API_BASE = 'http://localhost:8080/FleetFlow/api/v1';

// Lấy Token của Dispatcher để đính kèm vào Header
function getAuthHeader() {
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
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
                
                // Đổi nút bấm thành nút Phân tài (Chuẩn bị cho luồng tiếp theo)
                const tdAction = buttonElement.parentElement;
                tdAction.innerHTML = `<button class="btn-glass-action" onclick="dispatchDriver(${bookingId}, this)">Phân tài</button>`;
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
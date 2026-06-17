// ============================================================================
// FLEETFLOW - TRIP HISTORY API INTEGRATION (TRẠM 4)
// ============================================================================

const CUSTOMER_API_BASE = 'http://localhost:8080/FleetFlow/api/v1/customer';
let globalTripData = [];
let selectedTripId = null;
let cModalInstance, rModalInstance;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Khởi tạo Bootstrap Modals
    cModalInstance = new bootstrap.Modal(document.getElementById('cancelTripModal'));
    rModalInstance = new bootstrap.Modal(document.getElementById('ratingModal'));
    
    // 2. Setup vị trí ban đầu cho khối trượt (Liquid Slider)
    const activeTab = document.querySelector('.tab-pill.active');
    if (activeTab) moveIndicator(activeTab);

    // 3. Tự động tải dữ liệu khi mở trang
    fetchTripHistory();
});

// Hàm hỗ trợ: Kẹp Token vào Header
function getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

// ==========================================
// API 1: TẢI DANH SÁCH CHUYẾN ĐI (GET)
// ==========================================
async function fetchTripHistory() {
    const customerId = localStorage.getItem('customerId') || localStorage.getItem('accountId');
    
    if (!customerId) {
        return window.location.href = 'login.html'; // Ép văng ra login nếu mất session
    }

    const container = document.getElementById('tripListContainer');
    container.innerHTML = '<div class="text-center py-5"><i class="fa-solid fa-circle-notch fa-spin fa-2x text-success"></i><p class="mt-2 text-muted fw-medium">Đang đồng bộ dữ liệu hệ thống...</p></div>';

    try {
        const res = await fetch(`${CUSTOMER_API_BASE}/bookings?customerId=${customerId}`, { 
            headers: getAuthHeaders() 
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            globalTripData = data.data;
            renderTripList('all'); // Hiển thị tab "Tất cả" mặc định
        } else {
            container.innerHTML = `<div class="alert alert-danger mx-3" style="border-radius:15px;">${data.error || 'Lỗi tải dữ liệu'}</div>`;
        }
    } catch (e) {
        container.innerHTML = `<div class="alert alert-danger mx-3" style="border-radius:15px;">Mất kết nối với máy chủ FleetFlow!</div>`;
    }
}

// ==========================================
// RENDER DANH SÁCH LÊN UI KÍNH LỎNG
// ==========================================
function renderTripList(filterMode) {
    const container = document.getElementById('tripListContainer');
    const emptyState = document.getElementById('emptyState');
    container.innerHTML = '';

    // Lọc dữ liệu theo Tab
    const filtered = globalTripData.filter(trip => {
        if (filterMode === 'all') return true;
        if (filterMode === 'pending' && trip.status === 'PENDING') return true;
        if (filterMode === 'active' && ['CONFIRMED', 'DISPATCHED', 'IN_PROGRESS'].includes(trip.status)) return true;
        if (filterMode === 'completed' && trip.status === 'COMPLETED') return true;
        if (filterMode === 'cancelled' && trip.status === 'CANCELLED') return true;
        return false;
    });

    if (filtered.length === 0) { 
        emptyState.style.display = 'block'; 
        return; 
    }
    emptyState.style.display = 'none';

    // Đảo ngược mảng để chuyến mới nhất nằm trên cùng
    filtered.reverse().forEach(trip => {
        let statusText = '', badgeClass = '', uiStatus = '';
        
        switch(trip.status) {
            case 'PENDING': statusText = 'Đang chờ duyệt'; badgeClass = 'badge-pending'; uiStatus = 'pending'; break;
            case 'CONFIRMED': 
            case 'DISPATCHED': 
            case 'IN_PROGRESS': statusText = 'Đang tiến hành'; badgeClass = 'badge-active'; uiStatus = 'active'; break;
            case 'COMPLETED': statusText = 'Hoàn thành'; badgeClass = 'badge-completed'; uiStatus = 'completed'; break;
            case 'CANCELLED': statusText = 'Đã hủy'; badgeClass = 'badge-cancelled'; uiStatus = 'cancelled'; break;
            default: statusText = trip.status; badgeClass = 'badge-pending'; uiStatus = 'pending';
        }

        // Fomat ngày tháng
        const d = new Date(trip.departureTime);
        const formattedDate = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}`;

        // Đổ thẻ HTML chuẩn Glassmorphism
        const cardHtml = `
            <article class="trip-item-card glass-card-30 status-${uiStatus}-card" onclick="viewTripDetails(${trip.bookingId})">
                <div class="status-indicator"></div>
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="text-muted font-monospace small fw-bold"><i class="fa-regular fa-clock me-1"></i> ${formattedDate}</span>
                    <span class="trip-status-badge ${badgeClass}">${statusText}</span>
                </div>
                <div class="location-flow">${trip.pickupAddress.split(',')[0]} <i class="fa-solid fa-arrow-right text-muted fs-6 mx-2"></i> ${trip.dropoffAddress.split(',')[0]}</div>
                <div class="d-flex justify-content-between align-items-end mt-2">
                    <div class="card-meta"><span><i class="fa-solid fa-car me-1 text-primary"></i> ${trip.vehicleName}</span></div>
                    <div class="fw-bold text-success fs-5">${trip.distanceKm} km</div>
                </div>
            </article>
        `;
        container.insertAdjacentHTML('beforeend', cardHtml);
    });
}

// Logic Trượt Tab
window.filterTrips = function(status, buttonElement) {
    document.querySelectorAll('.tab-pill').forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');
    moveIndicator(buttonElement);
    renderTripList(status);
};

function moveIndicator(buttonElement) {
    const indicator = document.getElementById('tabIndicator');
    indicator.style.transform = `translateX(${buttonElement.offsetLeft}px)`;
    indicator.style.width = `${buttonElement.offsetWidth}px`;
}

// ==========================================
// CHUYỂN CẢNH SANG PANEL CHI TIẾT
// ==========================================
window.viewTripDetails = function(bookingId) {
    selectedTripId = bookingId;
    const trip = globalTripData.find(t => t.bookingId === bookingId);
    if (!trip) return;

    // Kích hoạt animation trượt màn hình
    document.getElementById('historyViewSection').classList.remove('view-active');
    document.getElementById('detailsViewSection').classList.add('view-active');

    const d = new Date(trip.departureTime);
    document.getElementById('lblDepartureTime').innerText = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}`;
    document.getElementById('lblPickupAddress').innerText = trip.pickupAddress;
    document.getElementById('lblDropoffAddress').innerText = trip.dropoffAddress;
    
    document.getElementById('lblDriverName').innerText = "Hệ thống FleetFlow"; 
    document.getElementById('lblCarSpecs').innerText = `${trip.vehicleName} - ${trip.licensePlate}`;
    
    // API Lịch sử không trả về giá chi tiết, ta sẽ dùng khoảng cách làm biểu tượng
    document.getElementById('lblBasePrice').innerText = '---';
    document.getElementById('lblSurcharge').innerText = '---';
    document.getElementById('lblDiscount').innerText = `---`;
    document.getElementById('lblTotalAmount').innerText = `${trip.distanceKm} km`;

    // Sinh Badge
    const badgeContainer = document.getElementById('detailBadgeContainer');
    if(trip.status === 'PENDING') badgeContainer.innerHTML = '<span class="trip-status-badge badge-pending">Đang chờ điều phối</span>';
    if(['CONFIRMED', 'DISPATCHED', 'IN_PROGRESS'].includes(trip.status)) badgeContainer.innerHTML = '<span class="trip-status-badge badge-active">Đang tiến hành</span>';
    if(trip.status === 'COMPLETED') badgeContainer.innerHTML = '<span class="trip-status-badge badge-completed">Hoàn thành</span>';
    if(trip.status === 'CANCELLED') badgeContainer.innerHTML = '<span class="trip-status-badge badge-cancelled">Đã hủy</span>';

    // Sinh nút Hành động (Action Grid)
    const actionGrid = document.getElementById('detailActionGrid');
    if (trip.status === 'PENDING' || trip.status === 'CONFIRMED') {
        actionGrid.innerHTML = `<button class="btn-control-action btn-cancel-action" onclick="triggerCancellationLogic()">Yêu cầu Hủy chuyến</button>`;
    } else if (trip.status === 'COMPLETED') {
        actionGrid.innerHTML = `<button class="btn-control-action btn-rate-action" onclick="rModalInstance.show()">Đánh giá dịch vụ</button>`;
    } else {
        actionGrid.innerHTML = `<button class="btn-control-action action-locked w-100" disabled>Không có hành động khả dụng</button>`;
    }
};

window.navigateBackToHistory = function() {
    document.getElementById('detailsViewSection').classList.remove('view-active');
    document.getElementById('historyViewSection').classList.add('view-active');
};

// ==========================================
// API 2: XỬ LÝ HỦY CHUYẾN (POST /cancel)
// ==========================================
window.triggerCancellationLogic = function() {
    const trip = globalTripData.find(t => t.bookingId === selectedTripId);
    const warningBox = document.getElementById('penaltyWarningMessage');
    
    const now = new Date().getTime();
    const departure = new Date(trip.departureTime).getTime();
    const diffHours = (departure - now) / (1000 * 60 * 60);

    // Tính toán giả lập cho UI trước khi gọi API (API sẽ tính chính xác lại)
    if (diffHours < 6) {
        warningBox.innerHTML = `<i class="fa-solid fa-circle-exclamation me-1"></i> <strong>Cảnh báo:</strong> Do thời gian khởi hành chỉ còn ít hơn 6 tiếng, bạn có thể bị phạt <span class="fw-bold text-decoration-underline">lên đến 50% chi phí đặt cọc</span> theo chính sách.`;
    } else if (diffHours >= 6 && diffHours <= 12) {
        warningBox.innerHTML = `<i class="fa-solid fa-circle-exclamation me-1"></i> <strong>Lưu ý:</strong> Thời gian tới giờ khởi hành còn dưới 12 tiếng. Việc hủy chuyến lúc này sẽ áp dụng mức phạt <span class="fw-bold">30% phí đặt cọc</span>.`;
    } else {
        warningBox.innerHTML = `<i class="fa-solid fa-circle-check me-1"></i> Chuyến đi này đủ điều kiện <strong>Hủy hoàn toàn miễn phí</strong>.`;
    }
    
    // Gán hàm vào nút
    document.getElementById('btnConfirmCancelTrip').onclick = () => executeCancelTrip();
    cModalInstance.show();
};

async function executeCancelTrip() {
    const reasonObj = document.querySelector('#cancelTripModal textarea');
    const reason = reasonObj ? reasonObj.value.trim() : "";
    const customerId = localStorage.getItem('customerId') || localStorage.getItem('accountId');

    const btn = document.getElementById('btnConfirmCancelTrip');
    const originalText = btn.innerHTML;
    
    // Đổi trạng thái UI
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-2"></i> Đang gửi yêu cầu...';
    btn.disabled = true;

    try {
        const res = await fetch(`${CUSTOMER_API_BASE}/bookings/cancel`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                bookingId: selectedTripId,
                customerId: parseInt(customerId),
                reason: reason
            })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            cModalInstance.hide();
            navigateBackToHistory(); // Đẩy về danh sách
            
            // Xử lý thông báo trừ tiền cọc
            let msg = 'Chuyến đi của bạn đã được hủy thành công.';
            if (data.penaltyAmount > 0) {
                msg = `Hủy thành công. Do bạn hủy sát giờ khởi hành, hệ thống áp dụng mức phạt ${data.penaltyPercent}%: ${data.penaltyAmount.toLocaleString('vi-VN')} đ (Đã trừ vào tiền cọc).`;
            }

            Swal.fire({
                icon: data.penaltyAmount > 0 ? 'warning' : 'success',
                title: 'Đã hủy chuyến',
                text: msg,
                confirmButtonColor: '#00B14F'
            });

            fetchTripHistory(); // Reload lại API lấy data mới
        } else {
            Swal.fire({ icon: 'error', title: 'Hủy thất bại', text: data.error || 'Có lỗi xảy ra, vui lòng liên hệ tổng đài.' });
        }
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Lỗi mạng', text: 'Mất kết nối máy chủ, vui lòng thử lại sau.' });
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
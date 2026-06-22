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
        return window.location.href = '../index.html'; // Ép văng ra login nếu mất session
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
// ==========================================
// API 3 & 4: XEM CHI TIẾT VÀ VẼ BẢN ĐỒ LỘ TRÌNH
// ==========================================
let tripMapInstance = null; // Biến toàn cục giữ trạng thái Bản đồ

window.viewTripDetails = async function(bookingId) {
    selectedTripId = bookingId;
    const tripSummary = globalTripData.find(t => t.bookingId === bookingId);
    if (!tripSummary) return;

    // Kích hoạt animation trượt màn hình sang Panel Chi tiết
    document.getElementById('historyViewSection').classList.remove('view-active');
    document.getElementById('detailsViewSection').classList.add('view-active');

    // Hiển thị trạng thái Loading
    document.getElementById('lblDepartureTime').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    document.getElementById('lblPickupAddress').innerHTML = '<i class="fa-solid fa-spinner fa-spin text-muted"></i> Đang truy xuất dữ liệu...';
    document.getElementById('lblDropoffAddress').innerHTML = '<i class="fa-solid fa-spinner fa-spin text-muted"></i> Đang truy xuất dữ liệu...';

    try {
        // GỌI API LẤY CHI TIẾT ĐƠN HÀNG (Kèm Tọa độ)
        const res = await fetch(`http://localhost:8080/FleetFlow/api/v1/bookings/${bookingId}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        const data = await res.json();

        if (res.ok && data.detail) {
            const detail = data.detail;
            const bType = data.bookingType;
            const tDir = data.tripDirection;

            // 1. In thời gian khởi hành
            const d = new Date(detail.departureTime);
            document.getElementById('lblDepartureTime').innerText = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}`;

            // 2. Phân luồng In Địa chỉ tùy Dịch vụ
            document.getElementById('lblPickupAddress').innerText = detail.pickupAddress || tripSummary.pickupAddress;
            
            if (bType === 'HOURLY') {
                document.getElementById('lblDropoffAddress').innerHTML = `Thuê di chuyển nội đô <span class="badge bg-primary ms-2">${detail.durationHours} Tiếng</span>`;
            } else if (bType === 'DAILY') {
                document.getElementById('lblDropoffAddress').innerHTML = `Thuê di chuyển tự do <span class="badge bg-success ms-2">${detail.durationDays} Ngày</span>`;
            } else {
                // Luồng Chuyến đi (DISTANCE)
                let dropoffText = detail.dropoffAddress || tripSummary.dropoffAddress;
                
                // Nếu là Khứ hồi, bóc tách giờ về và hiển thị nổi bật
                if (tDir === 'ROUND_TRIP' && detail.returnTime) {
                    const rd = new Date(detail.returnTime);
                    const rTime = `${rd.getHours().toString().padStart(2, '0')}:${rd.getMinutes().toString().padStart(2, '0')} - ${rd.getDate().toString().padStart(2, '0')}/${(rd.getMonth()+1).toString().padStart(2, '0')}`;
                    dropoffText += `<br><span class="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 mt-2"><i class="fa-solid fa-clock-rotate-left me-1"></i> Chiều về lúc: ${rTime}</span>`;
                }
                document.getElementById('lblDropoffAddress').innerHTML = dropoffText;
            }

            // 3. In Thông tin xe
            document.getElementById('lblDriverName').innerText = "Hệ thống FleetFlow"; 
            document.getElementById('lblCarSpecs').innerText = `${tripSummary.vehicleName} - ${tripSummary.licensePlate}`;
            
            // 4. KÍCH HOẠT VẼ BẢN ĐỒ (Nếu có tọa độ)
            if (detail.pickupLat && detail.pickupLng && typeof vietmapgl !== 'undefined') {
                drawTripMap(detail.pickupLat, detail.pickupLng, detail.dropoffLat, detail.dropoffLng, tDir);
            } else {
                document.getElementById('tripMapContainer').innerHTML = `
                    <div class="text-center w-100 text-muted">
                        <i class="fa-solid fa-map-location-dot fs-2 text-primary mb-2 d-block"></i>
                        Lộ trình theo thời gian thực (Dành cho thuê giờ/ngày)
                    </div>`;
            }

            // 5. Cập nhật Hóa đơn 
            // (Nếu BackEnd của bạn đã nối bảng BookingPricing vào API này, nó sẽ đọc data.pricing. 
            // Nếu chưa, hệ thống sẽ Fallback hiện số Km/Giờ)
            // ==============================================================
            // 5. PHỤC HỒI HÓA ĐƠN BẰNG CÁCH GỌI NGƯỢC LẠI API CHECK-PRICE
            // ==============================================================
            if (data.pricing) {
                // Dự phòng nếu tương lai Backend của bạn có trả về giá
                document.getElementById('lblBasePrice').innerText = data.pricing.baseFare.toLocaleString('vi-VN') + ' ₫';
                document.getElementById('lblSurcharge').innerText = data.pricing.weekendSurcharge ? '+' + data.pricing.weekendSurcharge.toLocaleString('vi-VN') + ' ₫' : '0 ₫';
                document.getElementById('lblDiscount').innerText = data.pricing.discountAmount ? '-' + data.pricing.discountAmount.toLocaleString('vi-VN') + ' ₫' : '0 ₫';
                document.getElementById('lblTotalAmount').innerText = data.pricing.estimatedTotal.toLocaleString('vi-VN') + ' ₫';
            } else {
                // TỰ ĐỘNG KHÔI PHỤC HÓA ĐƠN TỪ CÁC THÔNG SỐ CỦA CHUYẾN ĐI
                document.getElementById('lblBasePrice').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                document.getElementById('lblTotalAmount').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

                const pricePayload = {
                    vehicleId: tripSummary.vehicleId,
                    bookingType: bType,
                    tripDirection: tDir,
                    // Cắt bỏ phần mili-giây nếu có để API check-price không bị lỗi parse Date
                    departureTime: detail.departureTime.split('.')[0] 
                };

                // Phân luồng đẩy tham số cho API
                if (bType === 'DISTANCE') {
                    pricePayload.distanceKm = detail.distanceKm || tripSummary.distanceKm || 0;
                    if (tDir === 'ROUND_TRIP') {
                        pricePayload.returnDistanceKm = detail.returnDistanceKm || detail.distanceKm || 0;
                    }
                } else if (bType === 'HOURLY') {
                    pricePayload.durationHours = detail.durationHours || 1;
                } else if (bType === 'DAILY') {
                    pricePayload.durationDays = detail.durationDays || 1;
                }

                try {
                    const priceRes = await fetch('http://localhost:8080/FleetFlow/api/v1/customer/bookings/check-price', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(pricePayload)
                    });
                    const priceData = await priceRes.json();

                    if (priceRes.ok && priceData.success) {
                        const fmt = new Intl.NumberFormat('vi-VN');
                        document.getElementById('lblBasePrice').innerText = fmt.format(priceData.baseFare) + ' ₫';
                        document.getElementById('lblSurcharge').innerText = priceData.weekendSurcharge > 0 ? '+' + fmt.format(priceData.weekendSurcharge) + ' ₫' : '0 ₫';
                        
                        // Backend Get History không có giá trị Voucher thực tế, ta chỉ hiện dòng thông báo
                        document.getElementById('lblDiscount').innerText = tripSummary.voucherId ? 'Đã áp dụng mã' : '0 ₫'; 
                        
                        document.getElementById('lblTotalAmount').innerText = fmt.format(priceData.estimatedTotal) + ' ₫';
                    } else {
                        document.getElementById('lblTotalAmount').innerText = 'Lỗi tính giá';
                    }
                } catch(e) {
                    console.error("Không thể khôi phục giá:", e);
                    document.getElementById('lblTotalAmount').innerText = 'Không xác định';
                }
            }

        } else {
            alert('Không thể tải chi tiết lộ trình: ' + (data.error || 'Lỗi không xác định'));
            navigateBackToHistory();
        }
    } catch(e) {
        console.error(e);
        alert('Mất kết nối máy chủ khi lấy chi tiết chuyến đi!');
        navigateBackToHistory();
    }

    // 6. Xử lý Sinh Badge Status & Nút Hủy (Action Grid)
    const badgeContainer = document.getElementById('detailBadgeContainer');
    if(tripSummary.status === 'PENDING') badgeContainer.innerHTML = '<span class="trip-status-badge badge-pending">Đang chờ duyệt</span>';
    if(['APPROVED', 'DISPATCHED', 'IN_PROGRESS'].includes(tripSummary.status)) badgeContainer.innerHTML = '<span class="trip-status-badge badge-active">Đang tiến hành</span>';
    if(tripSummary.status === 'COMPLETED') badgeContainer.innerHTML = '<span class="trip-status-badge badge-completed">Hoàn thành</span>';
    if(tripSummary.status === 'REJECTED' || tripSummary.status === 'CANCELLED') badgeContainer.innerHTML = '<span class="trip-status-badge badge-cancelled">Đã hủy</span>';

    const actionGrid = document.getElementById('detailActionGrid');
    if (tripSummary.status === 'PENDING' || tripSummary.status === 'APPROVED') {
        actionGrid.innerHTML = `<button class="btn-control-action btn-cancel-action" onclick="triggerCancellationLogic()">Yêu cầu Hủy chuyến</button>`;
    } else if (tripSummary.status === 'COMPLETED') {
        actionGrid.innerHTML = `<button class="btn-control-action btn-rate-action" onclick="rModalInstance.show()">Đánh giá dịch vụ</button>`;
    } else {
        actionGrid.innerHTML = `<button class="btn-control-action action-locked w-100" disabled>Giao dịch đã đóng</button>`;
    }
};

// Hàm Vẽ Bản đồ Lên Khung Kính
function drawTripMap(pLat, pLng, dLat, dLng, tDir) {
    const mapContainer = document.getElementById('tripMapContainer');
    mapContainer.innerHTML = ''; 

    if (tripMapInstance) { tripMapInstance.remove(); }

    tripMapInstance = new vietmapgl.Map({
        container: 'tripMapContainer',
        style: 'https://maps.vietmap.vn/mt/tm/style.json?apikey=YOUR_API_KEY_HERE', // Thay key VietMap nếu có, nếu ko thẻ map sẽ báo lỗi key nhưng vẫn giữ DOM
        center: [pLng, pLat],
        zoom: 14
    });

    // Điểm Đón (Màu Xanh)
    new vietmapgl.Marker({ color: '#00B14F' }).setLngLat([pLng, pLat]).addTo(tripMapInstance);
    
    // Điểm Trả (Màu Đỏ)
    if (dLat && dLng) {
        new vietmapgl.Marker({ color: '#e53e3e' }).setLngLat([dLng, dLat]).addTo(tripMapInstance);
        
        // Tự động zoom bản đồ bao quát cả 2 điểm
        const bounds = [
            [Math.min(pLng, dLng), Math.min(pLat, dLat)],
            [Math.max(pLng, dLng), Math.max(pLat, dLat)]
        ];
        tripMapInstance.fitBounds(bounds, { padding: 40 });
    }
}

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
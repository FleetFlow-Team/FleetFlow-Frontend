// =====================================================================
// 1. CẤU HÌNH MAP HÌNH ẢNH XE ĐỒNG BỘ TOÀN HỆ THỐNG
// =====================================================================
const vehicleImageMap = {
    1: 'ToyotaVios4.jpg', 2: 'HondaCity4.jpg', 3: 'HyundaiAccent4.jpg', 4: 'MazdaMazda34.jpg', 5: 'KiaSoluto4.jpg',
    6: 'ToyotaVios4.jpg', 7: 'HondaCity4.jpg', 8: 'HyundaiAccent4.jpg', 9: 'MazdaMazda34.jpg', 10: 'KiaSoluto4.jpg',
    11: 'ToyotaVios4.jpg', 12: 'HondaCity4.jpg', 13: 'HyundaiAccent4.jpg', 14: 'MazdaMazda34.jpg', 15: 'ToyotaInnova7.jpg',
    16: 'MitsubishiXpander7.jpg', 17: 'HondaCR-V7.jpg', 18: 'HyundaiCustin7.jpg', 19: 'KiaCarens7.jpg', 20: 'ToyotaInnova7.jpg',
    21: 'MitsubishiXpander7.jpg', 22: 'HondaCR-V7.jpg', 23: 'HyundaiCustin7.jpg', 24: 'KiaCarens7.jpg', 25: 'ToyotaInnova7.jpg',
    26: 'MitsubishiXpander7.jpg', 27: 'HondaCR-V7.jpg', 28: 'HyundaiCustin7.jpg', 29: 'KiaCarnival9.jpg', 30: 'HyundaiSolatiLimo9.jpg',
    31: 'FordTourneo9.jpg', 32: 'KiaCarnival9.jpg', 33: 'HyundaiSolatiLimo9.jpg', 34: 'FordTourneo9.jpg', 35: 'KiaCarnival9.jpg',
    36: 'HyundaiSolatiLimo9.jpg', 37: 'FordTransit16.jpg', 38: 'HyundaiSolati16.jpg', 39: 'MercedesSprinter16.jpg', 40: 'FordTransit16.jpg',
    41: 'HyundaiSolati16.jpg', 42: 'MercedesSprinter16.jpg', 43: 'ThacoTB7929.jpg', 44: 'HyundaiCounty29.jpg', 45: 'SamcoFelix29.jpg',
    46: 'ThacoTB7929.jpg', 47: 'ThacoUniverse45.jpg', 48: 'HyundaiUniverse45.jpg', 49: 'SamcoGrowin45.jpg', 50: 'ThacoUniverse45.jpg'
};

// Hàm tiện ích lấy đường dẫn ảnh chính xác từ ID xe
function getCarImage(vehicleId) {
    if (!vehicleId) return 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?q=80&w=600'; // Fallback nếu API lỗi mất ID
    
    // Loại bỏ khoảng trắng hoặc ép kiểu về chuỗi để đảm bảo map chính xác
    let fileName = vehicleImageMap[String(vehicleId).trim()];
    return fileName 
        ? `../../assets/img/car-show/ImageUrl/${fileName}`
        : 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?q=80&w=600';
}

// =====================================================================
// 2. KHỞI TẠO USER PROFILE UI
// =====================================================================
document.addEventListener("DOMContentLoaded", function() {
    const fullName = localStorage.getItem('fullName');
    const accessToken = localStorage.getItem('accessToken');
    const userRole = localStorage.getItem('userRole') || 'Khách hàng';

    if (!accessToken || !fullName) {
        alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
        window.location.href = '../../index.html'; 
        return; 
    }

    const avatarName = encodeURIComponent(fullName);

    // Xử lý Desktop
    const btnDesktop = document.getElementById('btnLogin');
    if (btnDesktop) {
        btnDesktop.className = 'user-profile-btn position-relative';
        btnDesktop.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <div class="d-flex flex-column align-items-end text-end" style="line-height: 1.2;">
                    <span class="fw-bold" style="font-size: 0.95rem; color: var(--color-dark);">${fullName}</span>
                    <span class="fw-medium" style="font-size: 0.75rem; color: #64748b;">${userRole}</span>
                </div>
                <img src="https://ui-avatars.com/api/?name=${avatarName}&background=00B14F&color=fff" style="width: 34px; height: 34px; border-radius: 50%;" />
            </div>
            
            <div class="dropdown-menu-modern shadow">
                <a href="../customer/profile.html" class="dropdown-item-custom"><i class="fa-regular fa-user"></i> Hồ sơ của tôi</a>
                <a href="tripHistory.html" class="dropdown-item-custom active"><i class="fa-solid fa-clock-rotate-left"></i> Lịch sử chuyến đi</a>
                <hr style="margin: 5px 0; opacity: 0.1;">
                <a href="#" id="btnLogout" class="dropdown-item-custom text-danger"><i class="fa-solid fa-arrow-right-from-bracket"></i> Đăng xuất</a>
            </div>
        `;

        document.getElementById('btnLogout').addEventListener('click', (e) => { 
            e.preventDefault(); 
            if(confirm('Đăng xuất khỏi FleetFlow?')) { 
                localStorage.clear(); 
                window.location.href = '../../index.html'; 
            } 
        });
    }

    // Xử lý Mobile (Navbar đáy)
    const btnMobile = document.getElementById('btnLoginMobile');
    if (btnMobile) {
        btnMobile.className = 'nav-link-center user-profile-btn'; 
        btnMobile.innerHTML = `
            <img src="https://ui-avatars.com/api/?name=${avatarName}&background=00B14F&color=fff" style="width: 24px; height: 24px; border-radius: 50%; margin-bottom: 2px;" />
            <span class="nav-text text-truncate" style="max-width: 60px;">${fullName.split(' ').pop()}</span>
        `;
    }
});

// =====================================================================
// 3. LOGIC HIỂN THỊ DANH SÁCH CHUYẾN ĐI & HÌNH ẢNH XE
// =====================================================================
let globalTrips = []; 

document.addEventListener("DOMContentLoaded", function() {
    loadTripHistory();
});

async function loadTripHistory() {
    const customerId = localStorage.getItem('customerId') || localStorage.getItem('accountId') || 1;
    
    try {
        // GỌI API BACKEND THỰC TẾ (Mở comment khối này và xóa Mock Data khi ráp API)
        /*
        const response = await fetch(`http://localhost:8080/FleetFlow/api/v1/bookings/customer/${customerId}`);
        const result = await response.json();
        if(result.success && result.data) {
            globalTrips = result.data;
        }
        */
        
        // DỮ LIỆU MẪU (Giả lập cả trường hợp DB SQL chuẩn hóa)
        globalTrips = [
            { bookingId: 1001, vehicleId: 1, carName: "Toyota Vios Tiêu chuẩn", status: "COMPLETED", price: 850000, date: "22/06/2026", pickup: "Đại học FPT, TP.HCM", dropoff: "Vũng Tàu" },
            { BookingID: 1002, VehicleID: 29, Brand: "Kia", Model: "Carnival", Status: "PENDING", TotalAmount: 1500000, DepartureTime: "2026-06-25T14:30:00", PickupAddress: "Quận 7, TP.HCM", DropoffAddress: "Sân bay Tân Sơn Nhất" },
            { bookingId: 1003, vehicleId: 16, carName: "Mitsubishi Xpander", status: "ACTIVE", price: 1200000, date: "23/06/2026", pickup: "Bình Thạnh, TP.HCM", dropoff: "Đồng Nai" }
        ];

        renderTripList(globalTrips);

    } catch (error) {
        console.error("Lỗi tải lịch sử:", error);
    }
}

function renderTripList(trips) {
    const container = document.getElementById('tripListContainer');
    const emptyState = document.getElementById('emptyState');
    container.innerHTML = '';

    if (!trips || trips.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    let html = '';

    trips.forEach(trip => {
        // 1. BÓC TÁCH ID XE AN TOÀN (Bao cả trường hợp API trả về kiểu VehicleID hoa/thường)
        const vId = trip.vehicleId || trip.VehicleID || trip.vehicleID || null;
        const bId = trip.bookingId || trip.BookingID || trip.bookingID || "N/A";
        
        // 2. LẤY ĐƯỜNG DẪN ẢNH TỪ BỘ TỪ ĐIỂN
        const carImgUrl = getCarImage(vId);

        // 3. BÓC TÁCH DỮ LIỆU HIỂN THỊ AN TOÀN (Đề phòng API trả về null)
        let carName = "Phương tiện FleetFlow";
        if (trip.carName) carName = trip.carName;
        else if (trip.Brand && trip.Model) carName = `${trip.Brand} ${trip.Model}`;
        else if (trip.brand && trip.model) carName = `${trip.brand} ${trip.model}`;

        const price = trip.price || trip.TotalAmount || trip.estimatedTotal || trip.EstimatedTotal || parseInt(localStorage.getItem('currentDepositAmount')) || 0;
        const pickup = trip.pickup || trip.PickupAddress || trip.pickupAddress || '--';
        
        // --- XỬ LÝ HIỂN THỊ ĐIỂM TRẢ & SỐ GIỜ/NGÀY ---
        const bType = trip.bookingType || trip.BookingType || localStorage.getItem('bookingType') || 'DISTANCE';
        const sHours = parseInt(localStorage.getItem('savedDurationHours')) || 1;
        const sDays = parseInt(localStorage.getItem('savedDurationDays')) || 1;

        let dropoff = trip.dropoff || trip.DropoffAddress || trip.dropoffAddress || '--';
        if (bType === 'HOURLY') dropoff = `Di chuyển nội đô (${sHours} giờ)`;
        if (bType === 'DAILY') dropoff = `Di chuyển tự do (${sDays} ngày)`;

        // 4. XỬ LÝ BADGE TRẠNG THÁI
        const rawStatus = trip.status || trip.Status || "PENDING";
        let statusClass = "status-pending-card";
        let badgeClass = "badge-pending";
        let statusText = "Đang chờ";

        if (rawStatus.toUpperCase() === "COMPLETED") { 
            statusClass = "status-completed-card"; badgeClass = "badge-completed"; statusText = "Hoàn thành"; 
        } else if (rawStatus.toUpperCase() === "ACTIVE") { 
            statusClass = "status-active-card"; badgeClass = "badge-active"; statusText = "Đang chạy"; 
        } else if (rawStatus.toUpperCase() === "CANCELLED") { 
            statusClass = "status-cancelled-card"; badgeClass = "badge-cancelled"; statusText = "Đã hủy"; 
        }

        // Format tiền tệ VNĐ
        const fmtPrice = new Intl.NumberFormat('vi-VN').format(price) + ' ₫';

        // Gắn sự kiện `onerror` vào ảnh để tránh lỗi biểu tượng ảnh vỡ nếu DB trả về ID lạ
        html += `
        <div class="trip-item-card glass-card-30 ${statusClass}" onclick="viewTripDetail(${bId})">
            <div class="status-indicator"></div>
            <div class="trip-card-layout">
                <img src="${carImgUrl}" class="trip-thumbnail" alt="${carName}" onerror="this.src='https://images.unsplash.com/photo-1609521263047-f8f205293f24?q=80&w=600'">
                
                <div class="trip-info-core">
                    <div class="card-meta">
                        <span><i class="fa-regular fa-calendar me-1 text-success"></i> ${dateStr}</span>
                        <span> ${bId}</span>
                    </div>
                    <div class="location-flow">
                        ${pickup} <i class="fa-solid fa-arrow-right text-success" style="font-size: 0.85rem;"></i> ${dropoff}
                    </div>
                    <span class="fw-bold text-dark" style="font-size: 0.95rem;">${carName}</span>
                </div>
                
                <div class="trip-price-status">
                    <div class="trip-status-badge ${badgeClass}">${statusText}</div>
                    <h5 class="fw-bold text-success m-0 mt-2">${fmtPrice}</h5>
                </div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

// =====================================================================
// 4. LOGIC XEM CHI TIẾT & CHUYỂN TAB
// =====================================================================
function viewTripDetail(bookingId) {
    // Tìm kiếm thông minh dù ID là String hay Number, camelCase hay PascalCase
    const trip = globalTrips.find(t => (t.bookingId || t.BookingID || t.bookingID) == bookingId);
    if (!trip) return;

    // 1. Hiệu ứng chuyển màn hình 
    document.getElementById('historyViewSection').classList.remove('view-active');
    document.getElementById('detailsViewSection').classList.add('view-active');

    // 2. GẮN HÌNH ẢNH XE VÀO MÀN CHI TIẾT AN TOÀN
    const detailImg = document.getElementById('detailCarImage');
    if (detailImg) {
        const vId = trip.vehicleId || trip.VehicleID || trip.vehicleID || null;
        detailImg.src = getCarImage(vId); 
    }

    // 3. Đổ Text Data an toàn (Tránh in ra undefined)
    let carName = "Phương tiện FleetFlow";
    if (trip.carName) carName = trip.carName;
    else if (trip.Brand && trip.Model) carName = `${trip.Brand} ${trip.Model}`;
    
    const bId = trip.bookingId || trip.BookingID || trip.bookingID || "N/A";
    const pickup = trip.pickup || trip.PickupAddress || trip.pickupAddress || '--';
    
    // --- LẤY DỮ LIỆU TỪ BỘ NHỚ LÀM DỰ PHÒNG ---
    const bType = trip.bookingType || trip.BookingType || localStorage.getItem('bookingType') || 'DISTANCE';
    const sHours = parseInt(localStorage.getItem('savedDurationHours')) || 1;
    const sDays = parseInt(localStorage.getItem('savedDurationDays')) || 1;

    let dropoffHTML = trip.dropoff || trip.DropoffAddress || trip.dropoffAddress || '--';
    if (bType === 'HOURLY') {
        dropoffHTML = `Di chuyển nội đô <span class="badge bg-primary ms-2">${sHours} Tiếng</span>`;
    } else if (bType === 'DAILY') {
        dropoffHTML = `Di chuyển tự do <span class="badge bg-success ms-2">${sDays} Ngày</span>`;
    }

    const price = trip.price || trip.TotalAmount || trip.estimatedTotal || trip.EstimatedTotal || parseInt(localStorage.getItem('currentDepositAmount')) || 0;

    document.getElementById('lblMainInfo').innerText = carName;
    document.getElementById('lblSubInfo').innerText = `Mã chuyến: #${bId}`;
    document.getElementById('lblPickupAddress').innerText = pickup;
    
    // Dùng innerHTML để render được thẻ Badge màu sắc
    document.getElementById('lblDropoffAddress').innerHTML = dropoffHTML;
    
    const fmtPrice = new Intl.NumberFormat('vi-VN').format(price) + ' ₫';
    document.getElementById('lblBasePrice').innerText = fmtPrice;
    document.getElementById('lblTotalAmount').innerText = fmtPrice;
    
    // Cuộn lên đầu trang
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigateBackToHistory() {
    document.getElementById('detailsViewSection').classList.remove('view-active');
    document.getElementById('historyViewSection').classList.add('view-active');
}

// Logic chuyển Tab (Tất cả / Đang chờ / Hoàn thành...)
function filterTrips(status, btnElement) {
    const tabs = document.querySelectorAll('.tab-pill');
    tabs.forEach(tab => tab.classList.remove('active'));
    btnElement.classList.add('active');

    const indicator = document.getElementById('tabIndicator');
    if (indicator) {
        indicator.style.width = `${btnElement.offsetWidth}px`;
        indicator.style.transform = `translateX(${btnElement.offsetLeft - 6}px)`;
    }

    let filtered = globalTrips;
    if (status !== 'all') {
        filtered = globalTrips.filter(t => {
            const rawStatus = t.status || t.Status || "PENDING";
            return rawStatus.toLowerCase() === status.toLowerCase();
        });
    }
    renderTripList(filtered);
}
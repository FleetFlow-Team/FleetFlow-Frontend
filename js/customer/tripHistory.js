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
        const response = await fetch(`http://localhost:8080/FleetFlow/api/v1/bookings/customer/${customerId}`);
        const result = await response.json();
        if(result.success && result.data) {
            globalTrips = result.data;
        }
        
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
        // 1. BÓC TÁCH ID XE AN TOÀN
        const vId = trip.vehicleId || trip.VehicleID || trip.vehicleID || null;
        const bId = trip.bookingId || trip.BookingID || trip.bookingID || "N/A";
        
        // 2. LẤY ĐƯỜNG DẪN ẢNH TỪ BỘ TỪ ĐIỂN
        const carImgUrl = getCarImage(vId);

        // 3. BÓC TÁCH DỮ LIỆU HIỂN THỊ AN TOÀN
        let carName = "Phương tiện FleetFlow";
        if (trip.carName) carName = trip.carName;
        else if (trip.Brand && trip.Model) carName = `${trip.Brand} ${trip.Model}`;
        else if (trip.brand && trip.model) carName = `${trip.brand} ${trip.model}`;

        const price = trip.price || trip.TotalAmount || trip.estimatedTotal || trip.EstimatedTotal || parseInt(localStorage.getItem('currentDepositAmount')) || 0;
        const pickup = trip.pickup || trip.PickupAddress || trip.pickupAddress || '--';
        
        // --- SỬA LỖI 1 & 2: XỬ LÝ HOA/THƯỜNG VÀ HIỂN THỊ SỐ GIỜ/NGÀY ---
        const bType = (trip.bookingType || trip.BookingType || localStorage.getItem('bookingType') || 'DISTANCE').toUpperCase();
        
        const sHours = trip.durationHours || trip.DurationHours || parseInt(localStorage.getItem('savedDurationHours')) || 1;
        const sDays = trip.durationDays || trip.DurationDays || parseInt(localStorage.getItem('savedDurationDays')) || 1;

        let dropoff = trip.dropoff || trip.DropoffAddress || trip.dropoffAddress || '--';
        if (bType === 'HOURLY') dropoff = `Di chuyển nội đô (${sHours} giờ)`;
        if (bType === 'DAILY') dropoff = `Di chuyển tự do (${sDays} ngày)`;

        // --- SỬA LỖI HIỂN THỊ NGÀY THÁNG BỊ UNDEFINED ---
        let displayDate = "Chưa xác định";
        const rawDate = trip.date || trip.DepartureTime || trip.departureTime || trip.createdAt;
        if (rawDate) {
            const d = new Date(rawDate);
            if (!isNaN(d)) {
                 displayDate = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}`;
            } else {
                 displayDate = rawDate; 
            }
        }

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

        const fmtPrice = new Intl.NumberFormat('vi-VN').format(price) + ' ₫';

        // GẮN CHUỖI HTML ĐỘNG (Đã cập nhật biến displayDate)
        html += `
        <div class="trip-item-card glass-card-30 ${statusClass}" onclick="viewTripDetail(${bId})">
            <div class="status-indicator"></div>
            <div class="trip-card-layout">
                <img src="${carImgUrl}" class="trip-thumbnail" alt="${carName}" onerror="this.src='https://images.unsplash.com/photo-1609521263047-f8f205293f24?q=80&w=600'">
                
                <div class="trip-info-core">
                    <div class="card-meta">
                        <span><i class="fa-regular fa-calendar me-1 text-success"></i> ${displayDate}</span>
                        <span> MÃ: #${bId}</span>
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
async function viewTripDetail(bookingId) {
    // 1. Tìm thông tin sơ bộ trong danh sách trước để lấy tên xe (Vì API chi tiết gốc chỉ trả về vehicleId)
    const summaryTrip = globalTrips.find(t => (t.bookingId || t.BookingID || t.bookingID) == bookingId);
    let carName = "Phương tiện FleetFlow";
    if (summaryTrip) {
        if (summaryTrip.carName) carName = summaryTrip.carName;
        else if (summaryTrip.brand && summaryTrip.model) carName = `${summaryTrip.brand} ${summaryTrip.model}`;
        else if (summaryTrip.Brand && summaryTrip.Model) carName = `${summaryTrip.Brand} ${summaryTrip.Model}`;
    }

    try {
        // 2. Gọi API thực tế từ BookingController để lấy đối tượng chi tiết (bao gồm cả khối detail)
        const response = await fetch(`http://localhost:8080/FleetFlow/api/v1/bookings/${bookingId}`);
        if (!response.ok) {
            throw new Error("Không thể kết nối đến máy chủ để lấy thông tin chi tiết.");
        }
        
        // Nhận Object Booking trọn vẹn từ Backend
        const trip = await response.json();

        // 3. Kích hoạt hiệu ứng ẩn/hiển thị màn hình chi tiết
        document.getElementById('historyViewSection').classList.remove('view-active');
        document.getElementById('detailsViewSection').classList.add('view-active');

        // 4. Đồng bộ hình ảnh xe dựa vào vehicleId thực tế của chuyến đi
        const detailImg = document.getElementById('detailCarImage');
        if (detailImg) {
            detailImg.src = getCarImage(trip.vehicleId); 
        }

        // 5. Đổ dữ liệu định danh lên giao diện
        document.getElementById('lblMainInfo').innerText = carName;
        document.getElementById('lblSubInfo').innerText = `Mã chuyến: #${trip.bookingId}`;

        // 6. Khai thác dữ liệu từ khối cấu trúc lồng nhau "detail" của Backend
        if (trip.detail) {
            // Định dạng lại giờ đón khách hiển thị trên Timeline
            if (trip.detail.departureTime) {
                const depDate = new Date(trip.detail.departureTime);
                document.getElementById('lblDepartureTime').innerText = !isNaN(depDate) 
                    ? `${depDate.getHours().toString().padStart(2, '0')}:${depDate.getMinutes().toString().padStart(2, '0')}`
                    : trip.detail.departureTime;
            }

            // Gắn địa chỉ đón khách thực tế
            document.getElementById('lblPickupAddress').innerText = trip.detail.pickupAddress || '--';
            
            // Phân tích hiển thị điểm trả khách theo phương thức đặt xe (bookingType)
            const bType = (trip.bookingType || 'DISTANCE').toUpperCase();
            let dropoffHTML = trip.detail.dropoffAddress || '--';
            
            if (bType === 'HOURLY') {
                dropoffHTML = `Di chuyển nội đô <span class="badge bg-primary ms-2">Theo Giờ</span>`;
            } else if (bType === 'DAILY') {
                dropoffHTML = `Di chuyển tự do <span class="badge bg-success ms-2">Theo Ngày</span>`;
            } else {
                // Nếu là hình thức tính theo khoảng cách, kiểm tra lộ trình khứ hồi công tác
                const tDir = (trip.tripDirection || '').toUpperCase();
                if (tDir === 'ROUND_TRIP') {
                    dropoffHTML += `<br><span class="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 mt-2"><i class="fa-solid fa-arrows-turn-right me-1"></i> Chuyến Khứ Hồi</span>`;
                }
            }
            document.getElementById('lblDropoffAddress').innerHTML = dropoffHTML;
        }

        // 7. Đồng bộ hiển thị hóa đơn tài chính (Lấy giá trị thực tế của chuyến đi)
        const price = summaryTrip ? (summaryTrip.price || summaryTrip.TotalAmount || summaryTrip.estimatedTotal || 0) : 0;
        const fmtPrice = new Intl.NumberFormat('vi-VN').format(price) + ' ₫';
        document.getElementById('lblBasePrice').innerText = fmtPrice;
        document.getElementById('lblTotalAmount').innerText = fmtPrice;
        
        // 8. Cuộn mượt mà màn hình lên vị trí đầu trang chi tiết
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error("Lỗi xử lý luồng hiển thị chi tiết hành trình:", error);
        // Tận dụng SweetAlert2 đã được import trong HTML của bạn để thông báo lỗi trực quan
        Swal.fire({
            icon: 'error',
            title: 'Tải dữ liệu thất bại',
            text: 'Hệ thống không thể truy xuất thông tin chi tiết lộ trình vào lúc này.'
        });
    }
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
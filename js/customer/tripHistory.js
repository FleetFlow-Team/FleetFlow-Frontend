// =====================================================================
// 2. KHỞI TẠO USER PROFILE UI
// =====================================================================
document.addEventListener("DOMContentLoaded", function () {
    const fullName = localStorage.getItem('fullName');
    const accessToken = localStorage.getItem('accessToken');
    const userRole = localStorage.getItem('userRole') || 'Khách hàng';

    if (!accessToken || !fullName) {
        showModalAlert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!", "Cảnh báo", "warning");
        setTimeout(() => { window.location.href = '../../index.html'; }, 1500);
        return;
    }
    const roleUpper = userRole.trim().toUpperCase();
    if (roleUpper !== 'CUSTOMER' && roleUpper !== 'KHÁCH HÀNG') {
        window.location.replace('../../error/403.html');
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
                <a href="../profile.html" class="dropdown-item-custom"><i class="fa-regular fa-user"></i> Hồ sơ của tôi</a>
                <a href="tripHistory.html" class="dropdown-item-custom active"><i class="fa-solid fa-clock-rotate-left"></i> Lịch sử chuyến đi</a>
                <hr style="margin: 5px 0; opacity: 0.1;">
                <a href="#" id="btnLogout" class="dropdown-item-custom text-danger"><i class="fa-solid fa-arrow-right-from-bracket"></i> Đăng xuất</a>
            </div>
        `;


        document.getElementById('btnLogout').addEventListener('click', async (e) => {
            e.preventDefault();
            if (await showModalConfirm('Đăng xuất khỏi FleetFlow?')) {
                const fakeComplaints = localStorage.getItem('customerFakeComplaints');
                localStorage.clear();
                if (fakeComplaints) localStorage.setItem('customerFakeComplaints', fakeComplaints);
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
window.globalHolidaysList = [];

// Fetch ngày lễ một lần khi tải trang
fetch('http://localhost:8080/FleetFlow/api/v1/admin/holidays')
    .then(res => res.json())
    .then(data => { if (data.success) window.globalHolidaysList = data.data; })
    .catch(e => console.error("Lỗi fetch ngày lễ:", e));

document.addEventListener("DOMContentLoaded", function () {
    const urlParams = new URLSearchParams(window.location.search);
    const isPaymentSuccess = urlParams.get('paymentStatus') === 'success' ||
        urlParams.get('vnpay_status') === 'success' ||
        sessionStorage.getItem('showPaymentSuccessPopup') === 'true';

    if (isPaymentSuccess) {
        sessionStorage.removeItem('showPaymentSuccessPopup');
        // Làm sạch URL trên thanh địa chỉ để reload không bị hiện lại popup
        if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        const keysToRemove = [
            'bookingType', 'tripDirection', 'pickupAddress', 'dropoffAddress',
            'pickupLat', 'pickupLng', 'dropoffLat', 'dropoffLng',
            'returnPickupAddress', 'returnDropoffAddress', 'returnPickupLat', 'returnPickupLng',
            'returnDropoffLat', 'returnDropoffLng', 'mapDepartureTime', 'mapReturnTime',
            'distanceKm', 'returnDistanceKm', 'mapBaseFare', 'mapWeekendSurcharge',
            'mapEstimatedTotal', 'currentDepositAmount', 'appliedVoucherId', 'selectedVehicleId', 'pendingBookingId'
        ];
        keysToRemove.forEach(k => localStorage.removeItem(k));

        // HIỂN THỊ POPUP LIQUID GLASSMORPHISM SANG TRỌNG KHI VỪA CHUYỂN TRANG
        Swal.fire({
            icon: "success",
            title: "Thanh Toán Thành Công!",
            html: `
                <div style="background: rgba(240, 253, 244, 0.75); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(34, 197, 94, 0.35); border-radius: 20px; box-shadow: 0 8px 32px rgba(34, 197, 94, 0.12); padding: 20px; margin-top: 15px; text-align: left;">
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <div style="width: 36px; height: 36px; border-radius: 12px; background: rgba(34, 197, 94, 0.15); display: flex; align-items: center; justify-content: center; color: #16a34a;">
                            <i class="fa-solid fa-circle-check fs-5"></i>
                        </div>
                        <div class="fw-bold" style="color: #14532d; font-size: 0.95rem;">XÁC NHẬN THANH TOÁN THÀNH CÔNG</div>
                    </div>
                    <div class="fs-5 fw-bold" style="color: #16a34a;">Giao dịch VNPay đã hoàn tất</div>
                    <div class="small mt-2" style="color: #14532d;">Chuyến đi của bạn đã được xác nhận và ghi nhận thanh toán vào hệ thống FleetFlow.</div>
                </div>
            `,
            confirmButtonColor: "#00B14F",
            confirmButtonText: "Tuyệt vời!",
            customClass: {
                popup: "rounded-4 shadow-lg border border-white border-opacity-75"
            }
        });
    }

    const isPaymentCancelled = urlParams.get('paymentStatus') === 'cancelled' ||
        urlParams.get('vnpay_status') === 'failed' ||
        sessionStorage.getItem('showPaymentCancelPopup') === 'true';

    if (isPaymentCancelled && !isPaymentSuccess) {
        sessionStorage.removeItem('showPaymentCancelPopup');
        if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        Swal.fire({
            icon: "warning",
            title: "Chưa Hoàn Tất Thanh Toán",
            html: `
                <div style="background: rgba(255, 247, 237, 0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(249, 115, 22, 0.35); border-radius: 20px; box-shadow: 0 8px 32px rgba(249, 115, 22, 0.12); padding: 20px; margin-top: 15px; text-align: left;">
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <div style="width: 36px; height: 36px; border-radius: 12px; background: rgba(249, 115, 22, 0.15); display: flex; align-items: center; justify-content: center; color: #ea580c;">
                            <i class="fa-solid fa-triangle-exclamation fs-5"></i>
                        </div>
                        <div class="fw-bold" style="color: #9a3412; font-size: 0.95rem;">THÔNG BÁO GIAO DỊCH CHƯA HOÀN TẤT</div>
                    </div>
                    <div class="fs-5 fw-bold" style="color: #ea580c;">Khách hàng chưa thanh toán thành công</div>
                    <div class="small mt-2" style="color: #7c2d12;">Đơn hàng của bạn đã được khởi tạo và lưu ở trạng thái <b>Chờ thanh toán</b>. Bạn có thể tiếp tục thanh toán lại bất kỳ lúc nào tại danh sách Lịch sử chuyến đi.</div>
                </div>
            `,
            confirmButtonColor: "#f97316",
            confirmButtonText: "Đã hiểu",
            customClass: {
                popup: "rounded-4 shadow-lg border border-white border-opacity-75"
            }
        });
    }

    loadTripHistory();
});

function getCarImage(vId, imageUrl) {
    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
        return imageUrl;
    }
    const map = {
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
    if (vId && map[vId]) {
        let fileName = map[vId];
        return fileName.startsWith('http') ? fileName : `../../assets/img/car-show/ImageUrl/${fileName}`;
    }
    return 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?q=80&w=600';
}

async function loadTripHistory() {
    const customerId = localStorage.getItem('customerId') || localStorage.getItem('accountId') || 1;

    try {
        const response = await fetch(`http://localhost:8080/FleetFlow/api/v1/customer/bookings?customerId=${customerId}`);
        const result = await response.json();
        if (result.success && result.data) {
            globalTrips = result.data;
        }

        renderTripList(globalTrips);

    } catch (error) {
        console.error("Lỗi tải lịch sử:", error);
    }
}

function renderTripList(trips) {
    const container = document.getElementById('tripListContainer');
    const emptyState = document.getElementById('emptyState');

    if (!container) return;
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

        // 2. LẤY ĐƯỜNG DẪN ẢNH TỪ BỘ TỪ ĐIỂN HOẶC URL DB
        const carImgUrl = getCarImage(vId, trip.imageUrl || trip.ImageUrl);

        // 3. BÓC TÁCH DỮ LIỆU HIỂN THỊ AN TOÀN
        let carName = "Phương tiện FleetFlow";
        if (trip.carName) carName = trip.carName;
        else if (trip.vehicleName) carName = trip.vehicleName;
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
                displayDate = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            } else {
                displayDate = rawDate;
            }
        }

        // 4. XỬ LÝ BADGE TRẠNG THÁI
        const rawStatus = (trip.status || trip.Status || "PENDING").toUpperCase();
        let statusClass = "status-pending-card";
        let badgeClass = "badge-pending";
        let statusText = (rawStatus === "PENDING" || rawStatus === "WAITING_PAYMENT") ? "Chờ thanh toán" : "Đang chờ";

        if (rawStatus === "COMPLETED" || rawStatus === "UNPAID") {
            statusClass = "status-completed-card"; badgeClass = "badge-completed"; statusText = "Hoàn thành";
        } else if (rawStatus === "ACTIVE" || rawStatus === "IN_PROGRESS" || rawStatus === "ONGOING") {
            statusClass = "status-active-card"; badgeClass = "badge-active"; statusText = "Đang chạy";
            // Kểm tra quá giờ
            const returnTimeStr = trip.returnTime || trip.ReturnTime;
            if (returnTimeStr) {
                const rtDate = new Date(returnTimeStr);
                if (!isNaN(rtDate) && rtDate < new Date()) {
                    statusText = "QUÁ GIỜ";
                    badgeClass = "badge-cancelled"; // dùng class màu đỏ có sẵn
                    statusClass = "status-cancelled-card border-danger";
                }
            }
        } else if (rawStatus === "CANCELLED" || rawStatus === "REJECTED") {
            statusClass = "status-cancelled-card"; badgeClass = "badge-cancelled"; statusText = "Đã hủy";
        } else if (rawStatus === "CONFIRMED") {
            const depositPaid = trip.depositPaid === true;
            statusClass = "status-pending-card"; badgeClass = "badge-pending";
            statusText = depositPaid ? "Đã cọc - Chờ tài xế" : "Chờ thanh toán cọc";
        } else if (rawStatus === "ACCEPTED") {
            statusClass = "status-pending-card"; badgeClass = "badge-pending"; statusText = "Đã nhận";
        }

        // --- YÊU CẦU MỚI: BỎ GIÁ TIỀN, THAY BẰNG QUÃNG ĐƯỜNG/THỜI GIAN ---
        let displayMetric = "";
        if (bType === 'HOURLY') {
            displayMetric = `${sHours} giờ`;
        } else if (bType === 'DAILY') {
            displayMetric = `${sDays} ngày`;
        } else {
            const dist = trip.distanceKm || trip.DistanceKm || 0;
            displayMetric = `${parseFloat(dist).toFixed(1)} km`;
        }

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
                    <h5 class="fw-bold text-success m-0 mt-2">${displayMetric}</h5>
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
        else if (summaryTrip.vehicleName) carName = summaryTrip.vehicleName;
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

        let totalExtensionAmount = 0;
        try {
            const token = localStorage.getItem("accessToken");
            const extRes = await fetch(`http://localhost:8080/FleetFlow/api/v1/bookings/${bookingId}/extend/history`, {
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
            });
            if (extRes.ok) {
                const extData = await extRes.json();
                if (extData.success && extData.data) {
                    extData.data.forEach(ext => {
                        if ((ext.status || ext.Status || "").toUpperCase() === 'APPROVED') {
                            totalExtensionAmount += parseFloat(ext.extraAmount || ext.ExtraAmount || 0);
                        }
                    });
                }
            }
        } catch (e) { console.error("Lỗi fetch extension history:", e); }

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

        // =================================================================
        // 7. BÓC TÁCH CHI PHÍ DỰ KIẾN (Cho chuyến Pending/Active)
        // =================================================================
        const fVND = (val) => Number(val || 0).toLocaleString('vi-VN') + ' đ';

        // Bóc tách dữ liệu BookingPricing lồng trong API GET /bookings/{id}
        const pricing = trip.pricing || trip.BookingPricing || trip.bookingPricing || trip;
        const baseFare = parseFloat(pricing.BaseFare || pricing.baseFare) || 0;
        let weekendSurcharge = parseFloat(pricing.WeekendSurcharge || pricing.weekendSurcharge) || 0;
        const discountAmount = parseFloat(pricing.DiscountAmount || pricing.discountAmount) || 0;
        let estimatedTotal = parseFloat(pricing.EstimatedTotal || pricing.estimatedTotal || summaryTrip.price) || 0;

        // TÍNH PHỤ PHÍ NGÀY LỄ TRÊN FRONTEND (DO BACKEND ĐÃ BỎ)
        let holidaySurcharge = 0;
        let matchedHolidayName = "";

        // Lấy departureTime từ trip, summaryTrip hoặc trip.detail
        let rawDepartureTime = trip.departureTime || trip.DepartureTime || (summaryTrip && summaryTrip.departureTime) || (trip.detail && trip.detail.departureTime);
        let depDateStr = null;
        if (rawDepartureTime) {
            const match = String(rawDepartureTime).match(/(\d{4}-\d{2}-\d{2})/);
            if (match) depDateStr = match[1];
        }

        // Dịch ngược holidaySurcharge từ estimatedTotal vì trong DB không lưu riêng rẽ
        holidaySurcharge = estimatedTotal - baseFare - weekendSurcharge - totalExtensionAmount + discountAmount;
        if (holidaySurcharge < 0) holidaySurcharge = 0;

        if (holidaySurcharge > 0 && depDateStr && window.globalHolidaysList) {
            const matchedHoliday = window.globalHolidaysList.find(h => h.holidayDate === depDateStr);
            if (matchedHoliday) {
                matchedHolidayName = matchedHoliday.description || "Ngày lễ";
            }
        }

        // Cập nhật lại UI hiển thị
        const totalSurcharge = weekendSurcharge + holidaySurcharge;
        let surchargeHtml = `+ ${fVND(totalSurcharge)}`;
        if (holidaySurcharge > 0) {
            surchargeHtml += ` <br><small class="text-danger">(${matchedHolidayName})</small>`;
        }

        // Đổ giá trị bóc tách dự kiến ra UI
        document.getElementById('lblBasePrice').innerText = fVND(baseFare);
        document.getElementById('lblSurcharge').innerHTML = surchargeHtml;
        const rowExtension = document.getElementById('rowExtensionCost');
        if (totalExtensionAmount > 0) {
            document.getElementById('lblExtensionCost').innerText = `+ ${fVND(totalExtensionAmount)}`;
            if (rowExtension) rowExtension.style.setProperty('display', 'flex', 'important');
        } else {
            if (rowExtension) rowExtension.style.display = 'none';
        }
        document.getElementById('lblDiscount').innerText = `- ${fVND(discountAmount)}`;
        document.getElementById('lblTotalAmount').innerHTML = `${fVND(estimatedTotal)} <span style="font-size: 0.85rem; font-weight: 500;" class="text-muted">(Tạm tính)</span>`;

        const isDepositPaid = summaryTrip ? summaryTrip.depositPaid === true : trip.depositPaid === true;
        const rowDeposit = document.getElementById('rowDepositPaid');
        const rowRemaining = document.getElementById('rowRemainingAmount');
        const lblDeposit = document.getElementById('lblDepositPaid');
        const lblRemaining = document.getElementById('lblRemainingAmount');

        if (isDepositPaid && rowDeposit && rowRemaining && lblDeposit && lblRemaining) {
            const originalTotal = estimatedTotal - totalExtensionAmount;
            const depositAmount = Math.round(originalTotal * 0.3);
            const remainingAmount = estimatedTotal - depositAmount;

            lblDeposit.innerText = `- ${fVND(depositAmount)}`;
            lblRemaining.innerText = fVND(remainingAmount);

            rowDeposit.style.setProperty('display', 'flex', 'important');
            rowRemaining.style.setProperty('display', 'flex', 'important');
        } else {
            if (rowDeposit) rowDeposit.style.display = 'none';
            if (rowRemaining) rowRemaining.style.display = 'none';
        }
        // =================================================================

        // 8. TÍCH HỢP ACTION BUTTONS THEO STATUS
        const actionGrid = document.getElementById('detailActionGrid');
        const inlineInvoicePanel = document.getElementById('inlineInvoicePanel');
        const rawStatus = summaryTrip ? (summaryTrip.status || summaryTrip.Status) : (trip.status || trip.Status || "PENDING");
        const statusCheck = (rawStatus || '').toUpperCase();

        // 8b. Badge trạng thái đơn ngay trên trang chi tiết (giống badge ở danh sách)
        const detailBadgeContainer = document.getElementById('detailBadgeContainer');
        if (detailBadgeContainer) {
            let badgeBg = '#f59e0b', badgeText = 'Đang chờ';
            if (statusCheck === 'COMPLETED' || statusCheck === 'UNPAID') {
                badgeBg = '#00B14F'; badgeText = 'Hoàn thành';
            } else if (statusCheck === 'ACTIVE' || statusCheck === 'IN_PROGRESS' || statusCheck === 'ONGOING') {
                badgeBg = '#0077cc'; badgeText = 'Đang di chuyển';
            } else if (statusCheck === 'CANCELLED' || statusCheck === 'REJECTED') {
                badgeBg = '#dc3545'; badgeText = 'Đã hủy';
            } else if (['CONFIRMED', 'DISPATCHED', 'ACCEPTED', 'UNASSIGNED', 'APPROVED'].includes(statusCheck)) {
                const depositPaidBadge = summaryTrip ? summaryTrip.depositPaid === true : trip.depositPaid === true;
                if (depositPaidBadge) {
                    if (statusCheck === 'CONFIRMED') badgeText = 'Đã cọc - Chờ khởi hành';
                    else if (statusCheck === 'DISPATCHED') badgeText = 'Đã điều phối';
                    else if (statusCheck === 'ACCEPTED') badgeText = 'Đã nhận';
                    else if (statusCheck === 'UNASSIGNED') badgeText = 'Chờ điều phối';
                    else if (statusCheck === 'APPROVED') badgeText = 'Đã duyệt';
                } else {
                    badgeText = 'Chờ thanh toán cọc';
                }
            } else if (statusCheck === 'PENDING' || statusCheck === 'WAITING_PAYMENT') {
                badgeText = 'Chờ thanh toán';
            }
            detailBadgeContainer.innerHTML = `<span class="badge" style="background:${badgeBg}; font-size:0.8rem; padding:6px 12px; border-radius:20px;">${badgeText}</span>`;
        }
        const depositAlreadyPaid = summaryTrip ? summaryTrip.depositPaid === true : trip.depositPaid === true;
        const needsDepositPayment = ['PENDING', 'UNPAID', 'WAITING_PAYMENT', 'CHỜ THANH TOÁN'].includes(statusCheck)
            || (['CONFIRMED', 'DISPATCHED', 'ACCEPTED', 'UNASSIGNED', 'APPROVED'].includes(statusCheck) && !depositAlreadyPaid);

        let actionHtml = '';
        if (needsDepositPayment) {
            actionHtml = `
                <button type="button" class="btn btn-control-action m-0" style="flex:1.3; background: linear-gradient(135deg, #00B14F, #059669); color: #fff; font-weight: 600; border: none; box-shadow: 0 4px 15px rgba(0, 177, 79, 0.35); transition: all 0.3s ease;" onclick="payPendingBooking(${bookingId})">
                    <i class="fa-solid fa-credit-card me-2"></i>VNPay
                </button>
                <!-- <button type="button" class="btn btn-control-action m-0" style="flex:1.3; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; font-weight: 600; border: none;" onclick="payViaSePay(${bookingId})">
                    <i class="fa-solid fa-qrcode me-2"></i>SePay QR
                </button> -->
                <button type="button" class="btn btn-control-action btn-cancel-action m-0" style="flex:0.9" onclick="openCancelModal(${bookingId})">Hủy chuyến</button>
            `;
            if (inlineInvoicePanel) inlineInvoicePanel.style.display = 'block';
        } else if (statusCheck === 'ONGOING') {
            // Cho phép trả 70% còn lại ngay khi chuyến đang chạy — không cần đợi tài xế
            // bấm hoàn thành (backend giờ chặn hoàn thành nếu khách chưa trả xong, nên
            // khách phải trả được TRƯỚC COMPLETED, ngay trong lúc ONGOING).
            const remainingOngoing = summaryTrip ? (summaryTrip.remainingAmount || 0) : (trip.remainingAmount || 0);
            const pendingCash = summaryTrip ? summaryTrip.pendingCashFinal === true : trip.pendingCashFinal === true;

            let extendBtnHtml = '';
            const currentBType = (trip.bookingType || (summaryTrip && summaryTrip.bookingType) || 'DISTANCE').toUpperCase();
            if (currentBType === 'HOURLY') {
                extendBtnHtml = `<button type="button" class="btn btn-control-action m-0 py-2" style="flex:1; background: linear-gradient(135deg, #ff9800, #f57c00); color: #fff; font-weight: 600; border: none; box-shadow: 0 4px 10px rgba(255,152,0,0.3);" onclick="openExtendModal(${bookingId}, '${currentBType}')"><i class="fa-solid fa-clock-rotate-left me-1"></i>Gia hạn giờ</button>`;
            } else if (currentBType === 'DAILY') {
                extendBtnHtml = `<button type="button" class="btn btn-control-action m-0 py-2" style="flex:1; background: linear-gradient(135deg, #ff9800, #f57c00); color: #fff; font-weight: 600; border: none; box-shadow: 0 4px 10px rgba(255,152,0,0.3);" onclick="openExtendModal(${bookingId}, '${currentBType}')"><i class="fa-solid fa-calendar-plus me-1"></i>Gia hạn ngày</button>`;
            }

            if (remainingOngoing <= 0) {
                actionHtml = `<div class="text-success small fw-bold"><i class="fa-solid fa-circle-check me-1"></i>Đã thanh toán đủ — đang chờ tài xế hoàn thành chuyến</div>`;
            } else if (pendingCash) {
                actionHtml = `<div class="text-warning small fw-bold"><i class="fa-solid fa-hourglass-half me-1"></i>Đã chọn thanh toán tiền mặt — đang chờ tài xế xác nhận khi nhận tiền</div>`;
            } else {
                actionHtml = `
                <div class="d-flex w-100 gap-2">
                    <button type="button" class="btn btn-control-action m-0 py-2" style="flex:1; background: linear-gradient(135deg, #005A9C, #0077cc); color: #fff; font-weight: 600; border: none;" onclick="payFinal(${bookingId}, 'VNPAY')">
                        <i class="fa-solid fa-credit-card me-1"></i>VNPay
                    </button>
                    <button type="button" class="btn btn-control-action m-0 py-2" style="flex:1; background: linear-gradient(135deg, #10b981, #059669); color: #fff; font-weight: 600; border: none;" onclick="payFinal(${bookingId}, 'CASH')">
                        <i class="fa-solid fa-money-bill-wave me-1"></i>Tiền mặt
                    </button>
                    ${extendBtnHtml}
                </div>`;
            }
            if (inlineInvoicePanel) inlineInvoicePanel.style.display = 'block';
        } else if (!['COMPLETED', 'CANCELLED'].includes(statusCheck)) {
            actionHtml = `<button type="button" class="btn btn-control-action btn-cancel-action m-0" style="flex:1" onclick="openCancelModal(${bookingId})">Hủy chuyến</button>`;
            if (inlineInvoicePanel) inlineInvoicePanel.style.display = 'block';
        } else if (statusCheck === 'COMPLETED') {
            const remainingAmount = summaryTrip ? (summaryTrip.remainingAmount || 0) : (trip.remainingAmount || 0);
            const payButtonHtml = remainingAmount > 0 ? `
                <div class="d-flex w-100 gap-2 mb-2">
                    <button type="button" class="btn btn-control-action m-0 py-2" style="flex:1; background: linear-gradient(135deg, #005A9C, #0077cc); color: #fff; font-weight: 600; border: none;" onclick="payFinal(${bookingId}, 'VNPAY')">
                        <i class="fa-solid fa-credit-card me-1"></i>Thanh toán
                    </button>
                    <button type="button" class="btn btn-control-action m-0 py-2" style="flex:1; background: linear-gradient(135deg, #10b981, #059669); color: #fff; font-weight: 600; border: none;" onclick="payFinal(${bookingId}, 'CASH')">
                        <i class="fa-solid fa-money-bill-wave me-1"></i>Tiền mặt
                    </button>
                </div>` : '';
            actionHtml = `
                ${payButtonHtml}
                <button type="button" class="btn btn-control-action border-primary text-primary m-0" style="flex:1; background: rgba(59, 130, 246, 0.1);" onclick="viewInvoiceModal(${bookingId})">Xem hóa đơn</button>
                <button type="button" class="btn btn-control-action btn-rate-action m-0" style="flex:1" onclick="openRatingModal(${bookingId})">Đánh giá</button>
                <button type="button" class="btn btn-control-action border-danger text-danger m-0" style="flex:1; background: rgba(220, 53, 69, 0.1);" onclick="openComplaintModal(${bookingId})">Khiếu nại</button>
            `;
            if (inlineInvoicePanel) inlineInvoicePanel.style.display = 'none';
        } else {
            if (inlineInvoicePanel) inlineInvoicePanel.style.display = 'none';
        }

        if (actionGrid) {
            actionGrid.innerHTML = actionHtml;
        }

        // 9. Cuộn mượt mà màn hình lên vị trí đầu trang chi tiết
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

// Logic Fetch và hiển thị Modal Hóa Đơn
async function viewInvoiceModal(bookingId) {
    const token = localStorage.getItem("accessToken");
    const fVND = (val) => Number(val || 0).toLocaleString('vi-VN') + ' đ';

    // Đặt hiệu ứng loading
    document.getElementById('lblInvoiceBasePrice').innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-muted"></i>';
    document.getElementById('lblInvoiceSurcharge').innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-muted"></i>';
    document.getElementById('lblInvoiceDiscount').innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-muted"></i>';
    document.getElementById('lblInvoiceTotalAmount').innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-muted"></i>';
    document.getElementById('invoiceModalFooter').innerHTML = '<button type="button" class="btn btn-control-action btn-rate-action w-100 m-0" data-bs-dismiss="modal">Đóng</button>';

    // Mở modal ngay để người dùng thấy feedback
    const invoiceModal = new bootstrap.Modal(document.getElementById('invoiceModal'));
    invoiceModal.show();

    try {
        const invRes = await fetch(`http://localhost:8080/FleetFlow/api/v1/bookings/${bookingId}`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });
        const invResult = await invRes.json();

        if (invRes.ok && invResult.pricing) {
            const inv = invResult.pricing;
            const baseFare = parseFloat(inv.baseFare) || 0;
            const weekendSur = parseFloat(inv.weekendSurcharge) || 0;
            const tollSur = 0; // Toll surcharge is not available in pricing
            const discountAmount = parseFloat(inv.discountAmount) || 0;
            const totalAmount = parseFloat(inv.estimatedTotal) || 0;

            let totalExtensionAmount = 0;
            try {
                const extRes = await fetch(`http://localhost:8080/FleetFlow/api/v1/bookings/${bookingId}/extend/history`, {
                    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
                });
                if (extRes.ok) {
                    const extData = await extRes.json();
                    if (extData.success && extData.data) {
                        extData.data.forEach(ext => {
                            if ((ext.status || ext.Status || "").toUpperCase() === 'APPROVED') {
                                totalExtensionAmount += parseFloat(ext.extraAmount || ext.ExtraAmount || 0);
                            }
                        });
                    }
                }
            } catch (e) { console.error("Lỗi fetch extension history:", e); }

            let holidaySurcharge = totalAmount - baseFare - weekendSur - totalExtensionAmount + discountAmount;
            if (holidaySurcharge < 0) holidaySurcharge = 0;

            document.getElementById('lblInvoiceBasePrice').innerText = fVND(baseFare);
            document.getElementById('lblInvoiceSurcharge').innerText = `+ ${fVND(weekendSur + tollSur + holidaySurcharge)}`;
            const rowInvoiceExtension = document.getElementById('rowInvoiceExtensionCost');
            if (totalExtensionAmount > 0) {
                document.getElementById('lblInvoiceExtensionCost').innerText = `+ ${fVND(totalExtensionAmount)}`;
                if (rowInvoiceExtension) rowInvoiceExtension.style.setProperty('display', 'flex', 'important');
            } else {
                if (rowInvoiceExtension) rowInvoiceExtension.style.display = 'none';
            }
            document.getElementById('lblInvoiceDiscount').innerText = `- ${fVND(discountAmount)}`;

            // KHÔNG được gọi POST /payments/final ở đây để "xem trước" số tiền:
            // BE mới ghi nhận thanh toán CASH ngay khi endpoint này được gọi, nên gọi trước
            // khi khách xác nhận sẽ vô tình tất toán đơn bằng tiền mặt mà khách không hề bấm nút nào.
            // finalAmount thật sự chỉ được biết khi khách bấm nút thanh toán (payFinal).
            document.getElementById('lblInvoiceTotalAmount').innerText = fVND(totalAmount);

            const isDepositPaid = invResult.depositPaid === true || (invResult.detail && invResult.detail.depositPaid === true);
            const rowInvoiceDeposit = document.getElementById('rowInvoiceDeposit');
            const rowInvoiceRemaining = document.getElementById('rowInvoiceRemaining');

            if (isDepositPaid && rowInvoiceDeposit && rowInvoiceRemaining) {
                const originalTotal = totalAmount - totalExtensionAmount;
                const depositAmt = Math.round(originalTotal * 0.3);
                const remainAmt = totalAmount - depositAmt;

                document.getElementById('lblInvoiceDeposit').innerText = `- ${fVND(depositAmt)}`;
                document.getElementById('lblInvoiceRemaining').innerText = fVND(remainAmt);

                rowInvoiceDeposit.style.setProperty('display', 'flex', 'important');
                rowInvoiceRemaining.style.setProperty('display', 'flex', 'important');
            } else {
                if (rowInvoiceDeposit) rowInvoiceDeposit.style.display = 'none';
                if (rowInvoiceRemaining) rowInvoiceRemaining.style.display = 'none';
            }
            // Modal hóa đơn CHỈ để xem lại — không đặt nút thanh toán ở đây nữa để tránh
            // trùng lặp với nút "Thanh toán còn lại" đã hiện trực tiếp ngoài danh sách khi
            // remainingAmount > 0. Thanh toán làm ở ngoài, ở đây chỉ xem.
            document.getElementById('invoiceModalFooter').innerHTML = `<button type="button" class="btn btn-control-action btn-rate-action w-100 m-0" data-bs-dismiss="modal">Đóng</button>`;
        } else {
            throw new Error(invResult.error || "Hệ thống chưa tạo dữ liệu giá cho chuyến đi này.");
        }
    } catch (error) {
        console.error("Lỗi xem hóa đơn:", error);
        invoiceModal.hide();
        Swal.fire({
            icon: 'error',
            title: 'Lỗi hóa đơn',
            text: error.message || 'Hệ thống không thể tải hóa đơn lúc này.'
        });
    }
}

// Logic chuyển Tab (Tất cả / Đang chờ / Đang chạy / Hoàn thành...)
// Logic chuyển Tab (Tất cả / Đang chờ / Đang chạy / Hoàn thành...)
function filterTrips(status, btnElement) {
    const tabs = document.querySelectorAll('.tab-pill');
    tabs.forEach(tab => tab.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    if (btnElement) {
        const indicator = document.getElementById('tabIndicator');
        if (indicator) {
            indicator.style.width = `${btnElement.offsetWidth}px`;
            indicator.style.transform = `translateX(${btnElement.offsetLeft - 6}px)`;
        }
    }

    if (status === 'ratings' || status === 'complaints') {
        renderRatingsTab(status);
        return;
    }

    let filtered = globalTrips;
    if (status !== 'all') {
        filtered = globalTrips.filter(t => {
            const rawStatus = (t.status || t.Status || "PENDING").toUpperCase();

            if (status === 'pending') {
                return ['PENDING', 'ACCEPTED', 'APPROVED', 'DISPATCHED', 'CONFIRMED'].includes(rawStatus);
            } else if (status === 'active') {
                return ['ACTIVE', 'IN_PROGRESS', 'ONGOING'].includes(rawStatus);
            } else if (status === 'completed') {
                return ['COMPLETED', 'UNPAID'].includes(rawStatus);
            } else if (status === 'cancelled') {
                return ['CANCELLED', 'REJECTED'].includes(rawStatus);
            }
            return rawStatus === status.toUpperCase();
        });
    }
    renderTripList(filtered);
}

// Giả lập dữ liệu Khiếu nại khi Backend đang lỗi
window.fakeComplaints = window.fakeComplaints || [];

// Hàm render cho tab Nhận xét & Đánh giá hoặc Khiếu nại
async function renderRatingsTab(mode = 'ratings') {
    const container = document.getElementById('tripListContainer');
    const emptyState = document.getElementById('emptyState');
    if (!container) return;

    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-success"></div></div>';
    if (emptyState) emptyState.style.display = 'none';

    try {
        const token = localStorage.getItem('accessToken');
        const headers = { 'Authorization': `Bearer ${token}` };
        let html = '';

        // Nếu là tab đánh giá (hoặc cả 2)
        if (mode === 'ratings' || mode === 'both') {
            const ratingsRes = await fetch('http://localhost:8080/FleetFlow/api/v1/customer/ratings', { headers });
            const ratingsResult = await ratingsRes.json();
            const ratings = (ratingsResult.success && ratingsResult.data) ? ratingsResult.data : [];

            html += '<h4 class="fw-bold mb-4 mt-2 text-dark"><i class="fa-solid fa-star text-warning me-2"></i> Lịch sử Đánh giá</h4>';
            if (ratings.length === 0) {
                html += '<div class="alert alert-light border border-secondary text-center text-muted">Bạn chưa có đánh giá nào.</div>';
            } else {
                ratings.forEach(r => {
                    let stars = '';
                    for (let i = 1; i <= 5; i++) {
                        stars += `<i class="fa-solid fa-star ${i <= r.driverRating ? 'text-warning' : 'text-muted opacity-25'}"></i>`;
                    }
                    let dateStr = r.createdAt || '';
                    if (dateStr.endsWith('.0')) dateStr = dateStr.slice(0, -2);

                    html += `
                        <div class="glass-panel bg-white p-4 mb-3 border border-success border-opacity-25 shadow-sm rounded-4">
                            <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                                <span class="fw-bold text-dark fs-5">Chuyến #${r.bookingId} <span class="badge bg-light text-dark border ms-2 fs-6 fw-normal">${r.vehicleName || ''} (${r.licensePlate || ''})</span></span>
                                <span class="text-muted small"><i class="fa-regular fa-clock me-1"></i> ${dateStr}</span>
                            </div>
                            <div class="mb-3 d-flex align-items-center">
                                <div class="me-3 fs-5">${stars}</div>
                                <span class="fw-semibold text-dark"><i class="fa-solid fa-id-card text-muted me-1"></i> Tài xế: ${r.driverName || 'N/A'}</span>
                            </div>
                            <div class="text-secondary fst-italic p-3 bg-light rounded-3">"${r.comment || 'Không có nhận xét'}"</div>
                        </div>
                    `;
                });
            }
        }

        // Nếu là tab khiếu nại (hoặc cả 2)
        if (mode === 'complaints' || mode === 'both') {
            const complaintsRes = await fetch('http://localhost:8080/FleetFlow/api/v1/customer/complaints', { headers });
            const complaintsResult = await complaintsRes.json();
            const complaints = (complaintsResult.success && complaintsResult.data) ? complaintsResult.data : [];

            html += `<h4 class="fw-bold mb-4 ${mode === 'both' ? 'mt-5' : 'mt-2'} text-dark"><i class="fa-solid fa-triangle-exclamation text-danger me-2"></i> Lịch sử Khiếu nại</h4>`;
            if (complaints.length === 0) {
                html += '<div class="alert alert-light border border-secondary text-center text-muted">Bạn chưa có khiếu nại nào.</div>';
            } else {
                complaints.forEach(c => {
                    let dateStr = c.createdAt || '';
                    if (dateStr.endsWith('.0')) dateStr = dateStr.slice(0, -2);

                    let statusBadge = '';
                    switch ((c.status || '').toUpperCase()) {
                        case 'PENDING': statusBadge = '<span class="badge bg-warning text-dark">Đang chờ thụ lý</span>'; break;
                        case 'IN_PROGRESS': statusBadge = '<span class="badge bg-info text-dark">Đang xử lý</span>'; break;
                        case 'RESOLVED': statusBadge = '<span class="badge bg-success">Đã giải quyết</span>'; break;
                        case 'CLOSED': statusBadge = '<span class="badge bg-secondary">Đã đóng</span>'; break;
                        case 'CLOSED_UNRESOLVED': statusBadge = '<span class="badge bg-light text-dark border">Không giải quyết</span>'; break;
                        default: statusBadge = `<span class="badge bg-light text-dark border">${c.status || 'Chưa rõ'}</span>`;
                    }

                    let typeTitle = 'Khiếu nại dịch vụ';
                    if (c.type === 'LOST_LUGGAGE') typeTitle = 'Thất lạc hành lý / Tài sản';
                    else if (c.type === 'SERVICE_FEEDBACK') typeTitle = 'Phản ánh chất lượng dịch vụ / Tài xế';
                    else if (c.type === 'OTHER') typeTitle = 'Vấn đề khác';

                    let resolutionHtml = '';
                    if (c.resolution && c.resolution.trim() !== '') {
                        resolutionHtml = `<div class="mt-2 text-success fw-medium small"><i class="fa-solid fa-check-circle me-1"></i>Kết quả xử lý: ${c.resolution}</div>`;
                    }

                    html += `
                        <div class="glass-panel bg-white p-4 mb-3 border border-danger border-opacity-25 shadow-sm rounded-4">
                            <div class="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2">
                                <span class="fw-bold text-dark fs-5">Đơn #${c.complaintId || 'N/A'} ${c.bookingId ? `<span class="badge bg-light text-dark border ms-2">Chuyến #${c.bookingId}</span>` : ''}</span>
                                <div class="d-flex align-items-center gap-2">
                                    ${statusBadge}
                                    <span class="text-muted small"><i class="fa-regular fa-clock me-1"></i> ${dateStr}</span>
                                </div>
                            </div>
                            <div class="text-danger fw-bold mb-2 fs-5">${typeTitle}</div>
                            <div class="text-secondary p-3 bg-light rounded-3" style="line-height: 1.5;">"${c.content || c.description || c.comment || 'Không có chi tiết'}"</div>
                            ${resolutionHtml}
                            <div class="mt-3 text-end">
                                <button class="btn btn-sm btn-outline-success" onclick="openComplaintTimelineModal(${c.complaintId})">
                                    <i class="fa-solid fa-timeline me-1"></i>Xem Tiến Trình Xử Lý
                                </button>
                            </div>
                        </div>
                    `;
                });
            }
        }

        container.innerHTML = html;

    } catch (error) {
        console.error("Lỗi tải ratings/complaints:", error);
        container.innerHTML = '<div class="text-danger text-center py-5 fw-bold"><i class="fa-solid fa-circle-exclamation me-2"></i> Lỗi kết nối khi tải dữ liệu.</div>';
    }
}

// =====================================================================
// XỬ LÝ API HỦY CHUYẾN ĐI (TÍCH HỢP PENALTY AMOUNT)
// =====================================================================
let currentCancelBookingId = null; // Biến lưu tạm ID chuyến đi đang muốn hủy
let currentRateBookingId = null; // Biến lưu tạm ID chuyến đi đang muốn đánh giá

// Hàm này được gọi khi bấm nút "Hủy chuyến" ở trang chi tiết
function openCancelModal(bookingId) {
    currentCancelBookingId = bookingId;
    const warningMsg = document.getElementById('penaltyWarningMessage');
    if (warningMsg) {
        warningMsg.innerHTML = '<i class="fa-solid fa-circle-info me-1"></i> Hủy chuyến trước 12 tiếng sẽ được miễn phí. Nếu hủy sát giờ, bạn sẽ bị <b>mất cọc (30% tổng tiền)</b> theo chính sách.';
    }
    const modal = new bootstrap.Modal(document.getElementById('cancelTripModal'));
    modal.show();
}

// Hàm này được gọi khi bấm nút "Đánh giá chuyến đi" ở trang chi tiết
function openRatingModal(bookingId) {
    currentRateBookingId = bookingId;

    // Reset form
    const driverRadios = document.querySelectorAll('input[name="driverStars"]');
    driverRadios.forEach(r => r.checked = false);

    const carRadios = document.querySelectorAll('input[name="carStars"]');
    carRadios.forEach(r => r.checked = false);

    const commentInput = document.getElementById('ratingComment');
    if (commentInput) commentInput.value = '';

    const modal = new bootstrap.Modal(document.getElementById('ratingModal'));
    modal.show();
}

// Hàm này được gắn vào nút "Xác nhận hủy" trong Modal
async function executeSubmitAction(actionType) {
    if (actionType === 'cancel') {
        if (!currentCancelBookingId) return;

        const reasonInput = document.querySelector('#cancelTripModal textarea');
        let rawReason = reasonInput ? reasonInput.value.trim() : '';
        const customerName = localStorage.getItem('fullName') || 'Khách hàng';
        let finalReason = rawReason ? `[Khách: ${customerName}] ${rawReason}` : `[Khách: ${customerName}] Không ghi lý do`;

        const btnConfirm = document.getElementById('btnConfirmCancelTrip');
        const originalText = btnConfirm.innerText;
        btnConfirm.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
        btnConfirm.disabled = true;

        try {
            const token = localStorage.getItem('accessToken');
            const customerId = localStorage.getItem('customerId') || localStorage.getItem('accountId') || 1;
            // GỌI API BACKEND VỪA CẬP NHẬT
            const response = await fetch(`http://localhost:8080/FleetFlow/api/v1/customer/bookings/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    bookingId: parseInt(currentCancelBookingId),
                    customerId: parseInt(customerId),
                    reason: finalReason
                })
            });

            const result = await response.json();

            // Đóng Modal hiện tại
            const cancelModalEl = document.getElementById('cancelTripModal');
            const cancelModal = bootstrap.Modal.getInstance(cancelModalEl);
            if (cancelModal) cancelModal.hide();

            // XỬ LÝ KẾT QUẢ TỪ BACKEND
            if (response.ok && result.success) {
                const fVND = (v) => Number(v || 0).toLocaleString('vi-VN') + ' đ';

                // Trích xuất các trường Backend trả về
                const isForfeit = result.forfeitDeposit;
                const pAmount = parseFloat(result.penaltyAmount) || 0;
                const rAmount = parseFloat(result.refundedAmount) || 0;

                let msgHtml = `<div class="mb-2 text-muted" style="font-size: 0.95rem;">Chuyến đi <b>#${result.bookingId}</b> đã được hủy thành công!</div>`;

                // LOGIC HIỂN THỊ DỰA TRÊN PENALTY VÀ REFUND (LIQUID GLASSMORPHISM UI)
                if (isForfeit && pAmount > 0) {
                    msgHtml += `
                        <div style="background: rgba(254, 242, 242, 0.75); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 20px; box-shadow: 0 8px 32px rgba(239, 68, 68, 0.12); padding: 20px; margin-top: 15px; text-align: left;">
                            <div class="d-flex align-items-center gap-2 mb-2">
                                <div style="width: 36px; height: 36px; border-radius: 12px; background: rgba(239, 68, 68, 0.15); display: flex; align-items: center; justify-content: center; color: #dc2626;">
                                    <i class="fa-solid fa-triangle-exclamation fs-5"></i>
                                </div>
                                <div class="fw-bold" style="color: #991b1b; font-size: 0.95rem;">MẤT TIỀN CỌC HỦY MUỘN</div>
                            </div>
                            <div class="fs-4 fw-bold" style="color: #dc2626; letter-spacing: -0.5px;">-${fVND(pAmount)}</div>
                            <div class="small mt-2" style="color: #7f1d1d; line-height: 1.4;">Khoản tiền cọc đã đặt không được hoàn lại do bạn hủy chuyến trong vòng <b>12 giờ</b> trước khi khởi hành.</div>
                        </div>
                    `;
                } else if (rAmount > 0) {
                    msgHtml += `
                        <div style="background: rgba(240, 253, 244, 0.75); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(34, 197, 94, 0.35); border-radius: 20px; box-shadow: 0 8px 32px rgba(34, 197, 94, 0.12); padding: 20px; margin-top: 15px; text-align: left;">
                            <div class="d-flex align-items-center gap-2 mb-2">
                                <div style="width: 36px; height: 36px; border-radius: 12px; background: rgba(34, 197, 94, 0.15); display: flex; align-items: center; justify-content: center; color: #16a34a;">
                                    <i class="fa-solid fa-shield-check fs-5"></i>
                                </div>
                                <div class="fw-bold" style="color: #14532d; font-size: 0.95rem;">HỦY MIỄN PHÍ & HOÀN CỌC</div>
                            </div>
                            <div class="fs-4 fw-bold" style="color: #16a34a; letter-spacing: -0.5px;">+${fVND(rAmount)}</div>
                            <div class="small mt-2" style="color: #14532d; line-height: 1.4;">Bạn hủy trước <b>12 giờ</b>. Toàn bộ tiền cọc đã được tự động hoàn lại vào ví tài khoản của bạn.</div>
                        </div>
                    `;
                } else {
                    msgHtml += `
                        <div style="background: rgba(240, 253, 244, 0.75); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(34, 197, 94, 0.35); border-radius: 20px; box-shadow: 0 8px 32px rgba(34, 197, 94, 0.12); padding: 18px; margin-top: 15px; text-align: left;">
                            <div class="d-flex align-items-center gap-2">
                                <div style="width: 36px; height: 36px; border-radius: 12px; background: rgba(34, 197, 94, 0.15); display: flex; align-items: center; justify-content: center; color: #16a34a;">
                                    <i class="fa-solid fa-circle-check fs-5"></i>
                                </div>
                                <div>
                                    <div class="fw-bold" style="color: #14532d; font-size: 0.95rem;">HỦY CHUYẾN MIỄN PHÍ</div>
                                    <div class="small mt-1" style="color: #166534;">Bạn không bị tính bất kỳ chi phí phạt nào cho lần hủy này.</div>
                                </div>
                            </div>
                        </div>
                    `;
                }

                // Hiển thị thông báo bằng SweetAlert2 với Glassmorphism UI
                Swal.fire({
                    icon: isForfeit && pAmount > 0 ? 'warning' : 'success',
                    title: 'Đã hủy chuyến đi',
                    html: msgHtml,
                    confirmButtonColor: '#00B14F',
                    confirmButtonText: 'Đóng',
                    customClass: {
                        popup: 'rounded-4 shadow-lg border border-white border-opacity-75'
                    }
                }).then(() => {
                    // Tải lại danh sách chuyến đi sau khi tắt thông báo
                    window.location.reload();
                });

            } else {
                // Backend từ chối hủy (VD: Đang chạy, Đã hoàn thành...)
                Swal.fire({
                    icon: 'error',
                    title: 'Không thể hủy chuyến',
                    text: result.error || 'Vui lòng liên hệ tổng đài để được hỗ trợ.',
                    confirmButtonColor: '#d33',
                    customClass: {
                        popup: 'rounded-4 shadow-lg border border-white border-opacity-75'
                    }
                });
            }
        } catch (error) {
            console.error("Lỗi gọi API Hủy chuyến:", error);
            Swal.fire({ icon: 'error', title: 'Lỗi mạng', text: 'Không thể kết nối đến máy chủ FleetFlow.' });
        } finally {
            // Trả lại trạng thái UI cho nút bấm
            btnConfirm.innerHTML = originalText;
            btnConfirm.disabled = false;
            if (reasonInput) reasonInput.value = ''; // Xóa text lý do cũ
        }
    } else if (actionType === 'rate') {
        if (!currentRateBookingId) return;

        const driverStarEl = document.querySelector('input[name="driverStars"]:checked');
        const carStarEl = document.querySelector('input[name="carStars"]:checked');

        if (!driverStarEl || !carStarEl) {
            Swal.fire({
                icon: 'warning',
                title: 'Thiếu thông tin',
                text: 'Vui lòng chọn số sao đánh giá cho cả Tài xế và Phương tiện!'
            });
            return;
        }

        const driverRating = parseInt(driverStarEl.value);
        const carRating = parseInt(carStarEl.value);
        const commentEl = document.getElementById('ratingComment');
        const comment = commentEl ? commentEl.value.trim() : '';

        const token = localStorage.getItem('accessToken');

        const btnSubmit = document.getElementById('btnSubmitRatingForm');
        const originalText = btnSubmit.innerText;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...';
        btnSubmit.disabled = true;

        try {
            const response = await fetch(`http://localhost:8080/FleetFlow/api/v1/ratings/customer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    bookingId: parseInt(currentRateBookingId),
                    driverRating: driverRating,
                    carRating: carRating,
                    comment: comment
                })
            });

            const result = await response.json();

            const ratingModalEl = document.getElementById('ratingModal');
            const ratingModal = bootstrap.Modal.getInstance(ratingModalEl);
            if (ratingModal) ratingModal.hide();

            if (response.ok && result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Cảm ơn bạn!',
                    text: result.message || 'Đánh giá của bạn đã được ghi nhận.',
                    confirmButtonColor: '#00B14F'
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Không thể đánh giá',
                    text: result.message || 'Có lỗi xảy ra khi gửi đánh giá.'
                });
            }
        } catch (error) {
            console.error("Lỗi gửi đánh giá:", error);
            Swal.fire({ icon: 'error', title: 'Lỗi mạng', text: 'Không thể kết nối đến máy chủ FleetFlow.' });
        } finally {
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
        }
    }
}

async function payPendingBooking(bookingId) {
    const confirm = await Swal.fire({
        title: 'Thanh toán đơn hàng #' + bookingId,
        text: 'Tiếp tục thanh toán cọc/đơn hàng qua cổng VNPay?',
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#00B14F',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="fa-solid fa-credit-card me-1"></i> Thanh toán VNPay',
        cancelButtonText: 'Đóng'
    });

    if (!confirm.isConfirmed) return;

    Swal.showLoading();
    try {
        const token = localStorage.getItem("accessToken");
        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        };

        const res = await fetch('http://localhost:8080/FleetFlow/api/v1/payments/vnpay/create', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ bookingId: bookingId })
        });
        const data = await res.json();

        if (res.ok && data.success && data.paymentUrl) {
            localStorage.setItem('pendingBookingId', bookingId);
            window.isVnPayCompleted = false;
            const vnpPopup = window.open(data.paymentUrl, "VNPayPayment", "width=850,height=700,top=100,left=300");
            const popupMonitor = setInterval(async () => {
                if (vnpPopup && vnpPopup.closed) {
                    clearInterval(popupMonitor);
                    if (!window.isVnPayCompleted) {
                        Swal.fire({
                            icon: "warning",
                            title: "Chưa Hoàn Tất Thanh Toán",
                            html: `
                                <div style="background: rgba(255, 247, 237, 0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(249, 115, 22, 0.35); border-radius: 20px; box-shadow: 0 8px 32px rgba(249, 115, 22, 0.12); padding: 20px; margin-top: 15px; text-align: left;">
                                    <div class="d-flex align-items-center gap-2 mb-2">
                                        <div style="width: 36px; height: 36px; border-radius: 12px; background: rgba(249, 115, 22, 0.15); display: flex; align-items: center; justify-content: center; color: #ea580c;">
                                            <i class="fa-solid fa-triangle-exclamation fs-5"></i>
                                        </div>
                                        <div class="fw-bold" style="color: #9a3412; font-size: 0.95rem;">THÔNG BÁO GIAO DỊCH CHƯA HOÀN TẤT</div>
                                    </div>
                                    <div class="fs-5 fw-bold" style="color: #ea580c;">Khách hàng chưa thanh toán thành công</div>
                                    <div class="small mt-2" style="color: #7c2d12;">Đơn hàng #${bookingId} vẫn đang ở trạng thái <b>Chờ thanh toán</b>. Bạn có thể tiếp tục thanh toán lại bất kỳ lúc nào.</div>
                                </div>
                            `,
                            confirmButtonColor: "#f97316",
                            confirmButtonText: "Đã hiểu",
                            customClass: {
                                popup: "rounded-4 shadow-lg border border-white border-opacity-75"
                            }
                        });
                    }
                    await loadTripHistory();
                    await viewTripDetail(bookingId);
                }
            }, 800);
        } else {
            Swal.fire({ icon: 'error', title: 'Lỗi VNPay', text: data.message || 'Không thể tạo link thanh toán VNPay.' });
        }
    } catch (error) {
        console.error("Lỗi tạo thanh toán VNPay:", error);
        Swal.fire({ icon: 'error', title: 'Lỗi mạng', text: 'Không thể kết nối đến máy chủ FleetFlow.' });
    }
}

async function payFinal(bookingId, method) {
    const isVnpay = method === 'VNPAY';
    const confirmMsg = isVnpay
        ? "Thanh toán phần còn lại bằng VNPay?"
        : "Xác nhận thanh toán bằng Tiền mặt?";

    const result = await Swal.fire({
        title: 'Xác nhận thanh toán',
        text: confirmMsg,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Đồng ý',
        cancelButtonText: 'Hủy'
    });

    if (!result.isConfirmed) return;

    // Ẩn modal invoice trước khi xử lý
    const invoiceModalEl = document.getElementById('invoiceModal');
    const invoiceModal = bootstrap.Modal.getInstance(invoiceModalEl);
    if (invoiceModal) invoiceModal.hide();

    Swal.showLoading();
    try {
        const token = localStorage.getItem("accessToken");
        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        };

        // BƯỚC 1: Gọi API /payments/final để hệ thống tính lại thực tế và trừ cọc (70% tiền còn lại cho HOURLY/DAILY)
        // Lưu ý: API này cũng ghi nhận tạm thời transaction hoặc tính toán finalAmount chuẩn xác từ Backend.
        const finalRes = await fetch('http://localhost:8080/FleetFlow/api/v1/payments/final', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                bookingId: bookingId,
                paymentMethod: method
            })
        });

        const finalData = await finalRes.json();

        if (!finalRes.ok || !finalData.success) {
            Swal.fire('Lỗi', 'Không thể tính toán hoặc xử lý thanh toán: ' + (finalData.message || 'Unknown'), 'error');
            return;
        }

        if (isVnpay) {
            const res = await fetch('http://localhost:8080/FleetFlow/api/v1/payments/vnpay/create', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ bookingId: bookingId })
            });
            const data = await res.json();

            if (res.ok && data.success && data.paymentUrl) {
                localStorage.setItem('pendingBookingId', bookingId);
                window.isVnPayCompleted = false;
                const vnpPopup = window.open(data.paymentUrl, "VNPayPayment", "width=850,height=700,top=100,left=300");
                const popupMonitor = setInterval(async () => {
                    if (vnpPopup && vnpPopup.closed) {
                        clearInterval(popupMonitor);
                        if (!window.isVnPayCompleted) {
                            Swal.fire({
                                icon: "warning",
                                title: "Chưa Hoàn Tất Thanh Toán",
                                html: `
                                    <div style="background: rgba(255, 247, 237, 0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(249, 115, 22, 0.35); border-radius: 20px; box-shadow: 0 8px 32px rgba(249, 115, 22, 0.12); padding: 20px; margin-top: 15px; text-align: left;">
                                        <div class="d-flex align-items-center gap-2 mb-2">
                                            <div style="width: 36px; height: 36px; border-radius: 12px; background: rgba(249, 115, 22, 0.15); display: flex; align-items: center; justify-content: center; color: #ea580c;">
                                                <i class="fa-solid fa-triangle-exclamation fs-5"></i>
                                            </div>
                                            <div class="fw-bold" style="color: #9a3412; font-size: 0.95rem;">THÔNG BÁO GIAO DỊCH CHƯA HOÀN TẤT</div>
                                        </div>
                                        <div class="fs-5 fw-bold" style="color: #ea580c;">Khách hàng chưa thanh toán thành công</div>
                                        <div class="small mt-2" style="color: #7c2d12;">Đơn hàng của bạn vẫn đang ở trạng thái <b>Chờ thanh toán</b>. Bạn có thể tiếp tục thanh toán lại bất kỳ lúc nào tại danh sách bên dưới.</div>
                                    </div>
                                `,
                                confirmButtonColor: "#f97316",
                                confirmButtonText: "Đã hiểu",
                                customClass: {
                                    popup: "rounded-4 shadow-lg border border-white border-opacity-75"
                                }
                            });
                        }
                        await loadTripHistory();
                        await viewTripDetail(bookingId);
                    }
                }, 800);
            } else {
                Swal.fire({ icon: 'error', title: 'Lỗi VNPay', text: data.message || 'Không thể tạo link thanh toán VNPay.' });
            }
        } else {
            // CASH giờ chỉ là ghi nhận Ý ĐỊNH — tài xế mới là người xác nhận đã thực
            // nhận tiền (chống khách tự khai khống). finalData.message đã có sẵn câu
            // đúng ý nghĩa từ backend ("Đã ghi nhận... tài xế sẽ xác nhận...").
            Swal.fire({
                icon: 'info',
                title: 'Đã ghi nhận',
                text: finalData.message || 'Đã ghi nhận yêu cầu thanh toán tiền mặt — tài xế sẽ xác nhận khi nhận đủ tiền.',
                confirmButtonText: 'Đóng'
            }).then(async () => {
                const invoiceModal = bootstrap.Modal.getInstance(document.getElementById('invoiceModal'));
                if (invoiceModal) invoiceModal.hide();
                await loadTripHistory();
                await viewTripDetail(bookingId);
            });
        }
    } catch (error) {
        console.error("Lỗi giao dịch:", error);
        Swal.fire({ icon: 'error', title: 'Lỗi mạng', text: 'Không thể kết nối đến máy chủ FleetFlow.' });
    }
}

let sepayPollInterval = null;

// Thanh toán qua SePay (QR chuyển khoản) — server tự quyết DEPOSIT hay FINAL,
// giống VNPay/CASH. BE không đẩy tin báo khi thanh toán xong (không có
// webhook/WebSocket) — FE tự short-poll /status/{paymentId} mỗi 3s trong lúc
// modal QR đang mở để phát hiện lúc cron đối soát xong.
async function payViaSePay(bookingId) {
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch('http://localhost:8080/FleetFlow/api/v1/payments/sepay/create', {
            method: 'POST',
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId: bookingId })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            Swal.fire({ icon: 'error', title: 'Lỗi', text: data.message || 'Không thể tạo mã QR SePay lúc này.' });
            return;
        }

        document.getElementById('sepayQrImage').src = data.qrImageUrl;
        document.getElementById('sepayQrAmount').innerText = Number(data.amount || 0).toLocaleString('vi-VN') + ' đ';
        document.getElementById('sepayQrContent').innerText = data.transactionCode;
        document.getElementById('sepayQrStatusText').innerText = 'Đang chờ thanh toán...';

        const modalEl = document.getElementById('sepayQrModal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        const stopPolling = () => {
            if (sepayPollInterval) {
                clearInterval(sepayPollInterval);
                sepayPollInterval = null;
            }
        };
        document.getElementById('btnCloseSepayModal').onclick = stopPolling;
        document.getElementById('btnCancelSepayModal').onclick = () => { stopPolling(); modal.hide(); };
        modalEl.addEventListener('hidden.bs.modal', stopPolling, { once: true });

        stopPolling();
        sepayPollInterval = setInterval(async () => {
            try {
                const statusRes = await fetch(`http://localhost:8080/FleetFlow/api/v1/payments/sepay/status/${data.paymentId}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const statusData = await statusRes.json();
                if (!statusData.success) return;

                if (statusData.status === 'COMPLETED') {
                    stopPolling();
                    modal.hide();
                    Swal.fire({
                        icon: 'success',
                        title: 'Thanh toán thành công!',
                        text: `Đã nhận ${Number(statusData.amount || 0).toLocaleString('vi-VN')} đ qua SePay.`,
                        confirmButtonText: 'Đóng'
                    }).then(async () => {
                        await loadTripHistory();
                        await viewTripDetail(bookingId);
                    });
                } else if (statusData.status === 'FAILED') {
                    stopPolling();
                    document.getElementById('sepayQrStatusText').innerText = 'Giao dịch đã bị hủy.';
                }
            } catch (pollErr) {
                console.error("Lỗi poll trạng thái SePay:", pollErr);
            }
        }, 3000);
    } catch (error) {
        console.error("Lỗi tạo thanh toán SePay:", error);
        Swal.fire({ icon: 'error', title: 'Lỗi mạng', text: 'Không thể kết nối đến máy chủ FleetFlow.' });
    }
}

let currentComplaintBookingId = null;

function openComplaintModal(bookingId) {
    currentComplaintBookingId = bookingId;
    document.getElementById('complaintContent').value = '';
    const modal = new bootstrap.Modal(document.getElementById('complaintModal'));
    modal.show();
}

async function submitComplaint() {
    if (!currentComplaintBookingId) return;

    const content = document.getElementById('complaintContent').value.trim();
    const typeSelect = document.getElementById('complaintType');
    const type = typeSelect ? typeSelect.value : 'OTHER';

    if (!content) {
        Swal.fire({ icon: 'warning', title: 'Thiếu thông tin', text: 'Vui lòng nhập chi tiết nội dung khiếu nại của bạn.' });
        document.getElementById('complaintContent').focus();
        return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
        Swal.fire({ icon: 'warning', title: 'Chưa đăng nhập', text: 'Vui lòng đăng nhập lại tài khoản Khách hàng để gửi khiếu nại.' });
        return;
    }

    const btn = document.getElementById('btnSubmitComplaint');
    const oldText = btn.innerText;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tiếp nhận...';
    btn.disabled = true;

    try {
        const API_BASE_URL = typeof API_BASE !== 'undefined' ? API_BASE : 'http://localhost:8080/FleetFlow/api/v1';

        const res = await fetch(`${API_BASE_URL}/complaints`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                type: type,
                bookingId: parseInt(currentComplaintBookingId, 10),
                content: content
            })
        });

        const data = await res.json();

        const modalEl = document.getElementById('complaintModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        if (res.ok && (data.success || data.complaintId || (data.message && data.message.toLowerCase().includes('thành công')))) {
            Swal.fire({
                icon: 'success',
                title: 'Ghi Nhận Khiếu Nại',
                text: `Đơn khiếu nại ${data.complaintId ? '#' + data.complaintId : ''} cho chuyến đi #${currentComplaintBookingId} đã được tiếp nhận. Đội ngũ Điều phối viên sẽ sớm xử lý.`
            });

            if (typeof renderRatingsTab === 'function') {
                setTimeout(() => {
                    const complaintsTabBtn = document.querySelector('.tab-pill[onclick*="complaints"]') || document.querySelector('.tab-pill[onclick*="ratings"]');
                    if (complaintsTabBtn) complaintsTabBtn.click();
                }, 800);
            } else if (typeof loadTrips === 'function') {
                loadTrips();
            }
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Không thể tiếp nhận',
                text: data.message || data.error || 'Gửi khiếu nại thất bại. Vui lòng đảm bảo chuyến đi đã hoàn thành và bạn chưa gửi khiếu nại cho chuyến này trước đó.'
            });
        }
    } catch (error) {
        console.error("Lỗi submitComplaint:", error);
        Swal.fire({ icon: 'error', title: 'Lỗi mạng', text: 'Không thể kết nối đến máy chủ FleetFlow lúc này.' });
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
    }
}

// Hàm hiển thị tiến trình khiếu nại cho Customer
window.openComplaintTimelineModal = async function (complaintId) {
    if (!complaintId || complaintId === 'N/A') return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
        Swal.fire({
            icon: 'warning',
            title: 'Chưa đăng nhập',
            text: 'Vui lòng đăng nhập lại để xem timeline.',
            customClass: { popup: 'swal-glass-popup', title: 'swal-glass-title', htmlContainer: 'swal-glass-text' }
        });
        return;
    }

    try {
        Swal.showLoading();
        const API_BASE_URL = typeof API_BASE !== 'undefined' ? API_BASE : 'http://localhost:8080/FleetFlow/api/v1';
        const response = await fetch(`${API_BASE_URL}/customer/complaints/timeline?complaintId=${complaintId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        Swal.close();

        if (response.ok && result.success && result.timeline) {
            if (result.timeline.length === 0) {
                Swal.fire({
                    title: `Tiến trình Đơn #${complaintId}`,
                    text: 'Đơn khiếu nại đang chờ bộ phận CSKH tiếp nhận xử lý.',
                    icon: 'info',
                    confirmButtonColor: '#16a34a',
                    customClass: { popup: 'swal-glass-popup', title: 'swal-glass-title', htmlContainer: 'swal-glass-text' }
                });
                return;
            }

            let timelineHtml = `<div class="swal-timeline-container text-start mt-3">`;

            result.timeline.forEach((item, index) => {
                let timeStr = item.time ? item.time.substring(0, 16).replace('T', ' ') : '';
                let isLatest = (index === result.timeline.length - 1);

                timelineHtml += `
                    <div class="swal-timeline-node ${isLatest ? 'node-destination' : ''}">
                        <span class="swal-timeline-dot"></span>
                        <div class="fw-bold ${isLatest ? 'text-primary' : 'text-success'} mb-1" style="font-size: 0.9rem;">
                            <i class="fa-regular fa-clock me-1"></i> [${timeStr}] - ${item.actionCode || 'CẬP NHẬT'}
                        </div>
                        <div class="swal-timeline-card text-dark" style="font-size: 0.92rem; line-height: 1.5;">
                            ${item.message || 'Cập nhật tiến trình xử lý đơn khiếu nại.'}
                        </div>
                    </div>
                `;
            });

            timelineHtml += `</div>`;

            Swal.fire({
                title: `<i class="fa-solid fa-timeline text-success me-2"></i>Tiến trình Đơn #${complaintId}`,
                html: timelineHtml,
                width: '680px',
                showCloseButton: true,
                confirmButtonText: '<i class="fa-solid fa-check me-1"></i> Đóng lại',
                confirmButtonColor: '#16a34a',
                customClass: {
                    popup: 'swal-glass-popup',
                    title: 'swal-glass-title',
                    htmlContainer: 'swal-glass-text'
                }
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Không thể xem tiến trình',
                text: result.message || 'Đơn khiếu nại không tồn tại hoặc không thuộc quyền sở hữu của bạn.',
                customClass: { popup: 'swal-glass-popup', title: 'swal-glass-title', htmlContainer: 'swal-glass-text' }
            });
        }
    } catch (error) {
        console.error("Lỗi tải timeline khiếu nại:", error);
        Swal.fire({
            icon: 'error',
            title: 'Lỗi kết nối',
            text: 'Không thể tải thông tin tiến trình từ máy chủ lúc này.',
            customClass: { popup: 'swal-glass-popup', title: 'swal-glass-title', htmlContainer: 'swal-glass-text' }
        });
    }
};

// LẮNG NGHE KẾT QUẢ THANH TOÁN TỪ CỬA SỔ POPUP VNPAY (MÔ HÌNH 1 - SIÊU MƯỢT)
window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "VNPAY_RESULT") {
        if (event.data.success) {
            window.isVnPayCompleted = true;
            const amountFormatted = (parseInt(event.data.amount || 0)).toLocaleString('vi-VN') + " đ";
            Swal.fire({
                icon: "success",
                title: "Thanh Toán Thành Công!",
                html: `
                    <div style="background: rgba(240, 253, 244, 0.75); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(34, 197, 94, 0.35); border-radius: 20px; box-shadow: 0 8px 32px rgba(34, 197, 94, 0.12); padding: 20px; margin-top: 15px; text-align: left;">
                        <div class="d-flex align-items-center gap-2 mb-2">
                            <div style="width: 36px; height: 36px; border-radius: 12px; background: rgba(34, 197, 94, 0.15); display: flex; align-items: center; justify-content: center; color: #16a34a;">
                                <i class="fa-solid fa-circle-check fs-5"></i>
                            </div>
                            <div class="fw-bold" style="color: #14532d; font-size: 0.95rem;">GIAO DỊCH #${event.data.paymentId || ""} ĐÃ HOÀN TẤT</div>
                        </div>
                        <div class="fs-4 fw-bold" style="color: #16a34a;">+${amountFormatted}</div>
                        <div class="small mt-2" style="color: #14532d;">Đã cập nhật trạng thái thanh toán chuyến đi thành công.</div>
                    </div>
                `,
                confirmButtonColor: "#00B14F",
                confirmButtonText: "Đóng",
                customClass: {
                    popup: "rounded-4 shadow-lg border border-white border-opacity-75"
                }
            }).then(async () => {
                // Tự động làm mới danh sách chuyến đi mà không cần load lại cả trang
                if (typeof loadTripHistory === "function") {
                    await loadTripHistory();
                    const pendingId = localStorage.getItem('pendingBookingId');
                    if (pendingId) await viewTripDetail(pendingId);
                } else {
                    window.location.reload();
                }
            });
        } else {
            Swal.fire({
                icon: "error",
                title: "Thanh Toán Thất Bại",
                text: event.data.message || "Giao dịch qua VNPay chưa thành công hoặc đã bị hủy",
                confirmButtonColor: "#d33",
                confirmButtonText: "Đóng",
                customClass: {
                    popup: "rounded-4 shadow-lg border border-white border-opacity-75"
                }
            });
        }
    }
});

// =====================================================================
// XỬ LÝ GIA HẠN GIỜ (EXTENSION)
// =====================================================================
let currentExtendBookingId = null;

function openExtendModal(bookingId, bookingType) {
    currentExtendBookingId = bookingId;

    const extendModalTitle = document.getElementById('extendModalTitle');
    const extendModalText = document.getElementById('extendModalText');
    const extendUnitsSelect = document.getElementById('extendUnits');

    if (extendUnitsSelect) {
        extendUnitsSelect.innerHTML = '';
        if (bookingType === 'DAILY') {
            if (extendModalTitle) extendModalTitle.innerHTML = '<i class="fa-solid fa-calendar-plus me-2"></i> Gia hạn ngày thuê';
            if (extendModalText) extendModalText.innerText = 'Bạn muốn gia hạn thêm bao nhiêu ngày cho chuyến đi này?';
            extendUnitsSelect.innerHTML = '<option value="1">1 Ngày</option>';
        } else {
            if (extendModalTitle) extendModalTitle.innerHTML = '<i class="fa-solid fa-clock-rotate-left me-2"></i> Gia hạn giờ thuê';
            if (extendModalText) extendModalText.innerText = 'Bạn muốn gia hạn thêm bao nhiêu giờ cho chuyến đi này?';
            extendUnitsSelect.innerHTML = `
                <option value="1">1 Giờ</option>
                <option value="2">2 Giờ</option>
            `;
        }
    }

    const extendModal = new bootstrap.Modal(document.getElementById('extendModal'));
    extendModal.show();
}

async function executeExtendAction() {
    if (!currentExtendBookingId) return;
    const units = parseInt(document.getElementById('extendUnits').value) || 1;
    const accountId = localStorage.getItem('accountId') || localStorage.getItem('customerId') || 1;

    const btnSubmit = document.getElementById('btnSubmitExtend');
    const oldHtml = btnSubmit.innerHTML;
    btnSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> ĐANG GỬI...';
    btnSubmit.disabled = true;

    try {
        const payload = {
            requestedByRole: "CUSTOMER",
            requestedByAccountId: parseInt(accountId),
            extraUnits: units
        };
        const response = await fetch(`http://localhost:8080/FleetFlow/api/v1/bookings/${currentExtendBookingId}/extend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (response.ok && result.success) {
            // Ẩn modal
            const extendModalEl = document.getElementById('extendModal');
            const extendModalInst = bootstrap.Modal.getInstance(extendModalEl);
            if (extendModalInst) extendModalInst.hide();

            Swal.fire({
                icon: 'success',
                title: 'Đã gửi yêu cầu',
                text: 'Hệ thống đã nhận yêu cầu gia hạn, vui lòng đợi tài xế xác nhận trong ít phút.'
            });
            // Update the view (thực tế backend sẽ trả về status pending)
            setTimeout(() => {
                viewTripDetail(currentExtendBookingId);
            }, 1000);
        } else {
            Swal.fire({ icon: 'error', title: 'Thất bại', text: result.error || result.message || 'Không thể gửi yêu cầu gia hạn lúc này.' });
        }
    } catch (error) {
        console.error("Error extending booking:", error);
        Swal.fire({ icon: 'error', title: 'Lỗi kết nối', text: 'Không thể kết nối đến máy chủ.' });
    } finally {
        btnSubmit.innerHTML = oldHtml;
        btnSubmit.disabled = false;
    }
}

// =========================================================================
// POLLING ĐỂ BẮT THÔNG BÁO GIA HẠN/QUÁ GIỜ CHO KHÁCH HÀNG
// =========================================================================
let customerPollInterval = null;

async function pollCustomerExtensionNotifications() {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    // Only poll if there's an ongoing trip - checked by looking at active tab or existing DOM elements
    // But since this is Trip History, they might be on any tab. Let's just poll it silently.
    try {
        const response = await fetch('http://localhost:8080/FleetFlow/api/v1/customer/notifications', {
            method: "GET",
            headers: { "Authorization": 'Bearer ' + token }
        });
        const result = await response.json();

        if (response.ok && result.success && result.data) {
            const notifications = result.data;
            const unreadExtNotifs = notifications.filter(n =>
                (n.IsRead === false || n.IsRead === 0) &&
                (n.Type === 'EXTENSION_APPROVED' || n.Type === 'EXTENSION_REJECTED' || n.Type === 'OVERTIME_STARTED' || n.Type === 'OVERTIME_CAP_REACHED' || n.Type === 'OVERTIME_SETTLED')
            );

            if (unreadExtNotifs.length > 0) {
                // Play notification sound or show sweetalert for the first one
                const noti = unreadExtNotifs[0];
                let icon = 'info';
                if (noti.Type === 'EXTENSION_APPROVED' || noti.Type === 'OVERTIME_SETTLED') icon = 'success';
                else if (noti.Type === 'EXTENSION_REJECTED') icon = 'error';
                else if (noti.Type === 'OVERTIME_STARTED' || noti.Type === 'OVERTIME_CAP_REACHED') icon = 'warning';

                Swal.fire({
                    icon: icon,
                    title: noti.Title || 'Thông báo mới',
                    text: noti.Message || 'Có cập nhật về chuyến đi của bạn',
                    confirmButtonText: 'Đóng'
                });

                // Mark as read
                await fetch('http://localhost:8080/FleetFlow/api/v1/customer/notifications/' + noti.NotificationID + '/read', {
                    method: 'POST',
                    headers: { "Authorization": 'Bearer ' + token }
                });

                // Refresh list and global notifications
                loadTripHistory();
                if (typeof loadNotifications === 'function') {
                    loadNotifications();
                }
            }
        }
    } catch (e) {
        // Silent error
    }
}

document.addEventListener("DOMContentLoaded", () => {
    customerPollInterval = setInterval(pollCustomerExtensionNotifications, 15000);
});


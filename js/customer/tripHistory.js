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
    if (userRole.toUpperCase() !== 'CUSTOMER') {
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

document.addEventListener("DOMContentLoaded", function () {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('paymentStatus') === 'success') {
        const keysToRemove = [
            'bookingType', 'tripDirection', 'pickupAddress', 'dropoffAddress',
            'pickupLat', 'pickupLng', 'dropoffLat', 'dropoffLng',
            'returnPickupAddress', 'returnDropoffAddress', 'returnPickupLat', 'returnPickupLng',
            'returnDropoffLat', 'returnDropoffLng', 'mapDepartureTime', 'mapReturnTime',
            'distanceKm', 'returnDistanceKm', 'mapBaseFare', 'mapWeekendSurcharge',
            'mapEstimatedTotal', 'currentDepositAmount', 'appliedVoucherId', 'selectedVehicleId', 'pendingBookingId'
        ];
        keysToRemove.forEach(k => localStorage.removeItem(k));
        window.history.replaceState({}, document.title, window.location.pathname);
        Swal.fire({ icon: 'success', title: 'Thành công', text: 'Thanh toán MoMo thành công!' });
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
        let statusText = "Đang chờ";

        if (rawStatus === "COMPLETED" || rawStatus === "UNPAID") {
            statusClass = "status-completed-card"; badgeClass = "badge-completed"; statusText = "Hoàn thành";
        } else if (rawStatus === "ACTIVE" || rawStatus === "IN_PROGRESS" || rawStatus === "ONGOING") {
            statusClass = "status-active-card"; badgeClass = "badge-active"; statusText = "Đang chạy";
        } else if (rawStatus === "CANCELLED" || rawStatus === "REJECTED") {
            statusClass = "status-cancelled-card"; badgeClass = "badge-cancelled"; statusText = "Đã hủy";
        } else if (rawStatus === "ACCEPTED" || rawStatus === "CONFIRMED") {
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

        // =================================================================
        // 7. BÓC TÁCH CHI PHÍ DỰ KIẾN (Cho chuyến Pending/Active)
        // =================================================================
        const fVND = (val) => Number(val || 0).toLocaleString('vi-VN') + ' đ';

        // Bóc tách dữ liệu BookingPricing lồng trong API GET /bookings/{id}
        const pricing = trip.pricing || trip.BookingPricing || trip.bookingPricing || trip;
        const baseFare = parseFloat(pricing.BaseFare || pricing.baseFare) || 0;
        const weekendSurcharge = parseFloat(pricing.WeekendSurcharge || pricing.weekendSurcharge) || 0;
        const discountAmount = parseFloat(pricing.DiscountAmount || pricing.discountAmount) || 0;
        const estimatedTotal = parseFloat(pricing.EstimatedTotal || pricing.estimatedTotal || summaryTrip.price) || 0;

        // Đổ giá trị bóc tách dự kiến ra UI
        document.getElementById('lblBasePrice').innerText = fVND(baseFare);
        document.getElementById('lblSurcharge').innerText = `+ ${fVND(weekendSurcharge)}`;
        document.getElementById('lblDiscount').innerText = `- ${fVND(discountAmount)}`;
        document.getElementById('lblTotalAmount').innerHTML = `${fVND(estimatedTotal)} <span style="font-size: 0.85rem; font-weight: 500;" class="text-muted">(Tạm tính)</span>`;
        // =================================================================

        // 8. TÍCH HỢP ACTION BUTTONS THEO STATUS
        const actionGrid = document.getElementById('detailActionGrid');
        const inlineInvoicePanel = document.getElementById('inlineInvoicePanel');
        const rawStatus = summaryTrip ? (summaryTrip.status || summaryTrip.Status) : (trip.status || trip.Status || "PENDING");
        const statusCheck = (rawStatus || '').toUpperCase();

        let actionHtml = '';
        if (!['COMPLETED', 'CANCELLED'].includes(statusCheck)) {
            actionHtml = `<button type="button" class="btn btn-control-action btn-cancel-action m-0" style="flex:1" onclick="openCancelModal(${bookingId})">Hủy chuyến</button>`;
            if (inlineInvoicePanel) inlineInvoicePanel.style.display = 'block';
        } else if (statusCheck === 'COMPLETED') {
            actionHtml = `
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

            document.getElementById('lblInvoiceBasePrice').innerText = fVND(baseFare);
            document.getElementById('lblInvoiceSurcharge').innerText = `+ ${fVND(weekendSur + tollSur)}`;
            document.getElementById('lblInvoiceDiscount').innerText = `- ${fVND(discountAmount)}`;

            // Gọi API kiểm tra số tiền CÒN LẠI cần thanh toán
            let finalAmount = totalAmount;
            try {
                const finalRes = await fetch(`http://localhost:8080/FleetFlow/api/v1/payments/final`, {
                    method: 'POST',
                    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ bookingId: bookingId, paymentMethod: 'MOMO' }) // Truyền tạm để tính tiền
                });
                const finalData = await finalRes.json();
                if (finalData.finalAmount !== undefined) {
                    finalAmount = parseFloat(finalData.finalAmount) || 0;
                }
            } catch(e) {}
            
            const depositPaid = totalAmount - finalAmount;
            
            // Xóa dòng Cọc cũ nếu có để tránh trùng
            const oldDepositRow = document.getElementById('rowInvoiceDeposit');
            if(oldDepositRow) oldDepositRow.remove();

            if (depositPaid > 0) {
                const discountRow = document.getElementById('lblInvoiceDiscount').parentElement;
                const depositHtml = `<div class="billing-row text-primary fw-semibold" id="rowInvoiceDeposit"><span>Đã thanh toán (Cọc/Trước)</span><span>- ${fVND(depositPaid)}</span></div>`;
                discountRow.insertAdjacentHTML('afterend', depositHtml);
            }

            document.getElementById('lblInvoiceTotalAmount').innerText = fVND(finalAmount);

            // Kiểm tra trạng thái chuyến đi để hiển thị nút thanh toán
            const status = invResult.status || 'COMPLETED';
            if ((status === 'UNPAID' || status === 'COMPLETED') && finalAmount > 0) {
                document.getElementById('invoiceModalFooter').innerHTML = `
                    <button type="button" class="btn btn-control-action m-0 text-white w-100 mb-2" style="background-color: #a50064;" onclick="payFinal(${bookingId}, 'MOMO')">Thanh toán MoMo (Còn lại)</button>
                    <button type="button" class="btn btn-control-action m-0 text-white w-100 mb-2" style="background-color: #10b981;" onclick="payFinal(${bookingId}, 'CASH')">Thanh toán Tiền mặt</button>
                    <button type="button" class="btn btn-control-action btn-rate-action w-100 m-0" data-bs-dismiss="modal">Đóng</button>
                `;
            } else {
                 document.getElementById('invoiceModalFooter').innerHTML = `<button type="button" class="btn btn-control-action btn-rate-action w-100 m-0" data-bs-dismiss="modal">Đóng</button>`;
            }
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
            const rawStatus = (t.status || t.Status || "PENDING").toUpperCase();
            
            if (status === 'pending') {
                return ['PENDING', 'ACCEPTED', 'APPROVED', 'DISPATCHED', 'CONFIRMED'].includes(rawStatus);
            } else if (status === 'active') {
                return ['ACTIVE', 'IN_PROGRESS', 'ONGOING'].includes(rawStatus);
            } else if (status === 'completed') {
                return ['COMPLETED', 'CANCELLED', 'UNPAID', 'REJECTED'].includes(rawStatus);
            }
            return rawStatus === status.toUpperCase();
        });
    }
    renderTripList(filtered);
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

        const customerId = localStorage.getItem('customerId') || localStorage.getItem('accountId') || 1;
        const token = localStorage.getItem('accessToken');
        const reasonInput = document.querySelector('#cancelTripModal textarea');
        const reason = reasonInput ? reasonInput.value.trim() : "Khách hàng yêu cầu hủy";

        // Đổi trạng thái UI nút bấm sang Loading
        const btnConfirm = document.getElementById('btnConfirmCancelTrip');
        const originalText = btnConfirm.innerText;
        btnConfirm.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
        btnConfirm.disabled = true;

        try {
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
                    reason: reason
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

                // Trích xuất 2 trường Backend trả về: forfeitDeposit và penaltyAmount
                const isForfeit = result.forfeitDeposit;
                const pAmount = parseFloat(result.penaltyAmount) || 0;

                let msgHtml = `Chuyến đi <b>#${result.bookingId}</b> đã được hủy thành công!`;

                // LOGIC HIỂN THỊ DỰA TRÊN PENALTY AMOUNT VÀ FORFEIT
                if (isForfeit && pAmount > 0) {
                    msgHtml += `
                        <div class="mt-3 p-3 bg-danger bg-opacity-10 border border-danger border-opacity-25 rounded-3 text-start">
                            <div class="text-danger fw-bold mb-1"><i class="fa-solid fa-triangle-exclamation me-1"></i> Phí phạt hủy chuyến (Mất cọc):</div>
                            <div class="fs-4 fw-bold text-danger">${fVND(pAmount)}</div>
                            <div class="small text-muted mt-1">Khoản phí này đã được ghi nhận vào công nợ tài khoản của bạn theo chính sách hệ thống.</div>
                        </div>
                    `;
                } else {
                    msgHtml += `
                        <div class="mt-3 p-3 bg-success bg-opacity-10 border border-success border-opacity-25 rounded-3">
                            <span class="text-success fw-bold"><i class="fa-solid fa-shield-check me-1"></i> Bạn không bị tính phí phạt cho lần hủy này.</span>
                        </div>
                    `;
                }

                // Hiển thị thông báo bằng SweetAlert2
                Swal.fire({
                    icon: 'success',
                    title: 'Đã hủy chuyến',
                    html: msgHtml,
                    confirmButtonColor: '#00B14F',
                    confirmButtonText: 'Đóng'
                }).then(() => {
                    // Tải lại danh sách chuyến đi sau khi tắt thông báo
                    window.location.reload();
                });

            } else {
                // Backend từ chối hủy (VD: Đang chạy, Đã hoàn thành...)
                Swal.fire({
                    icon: 'error',
                    title: 'Không thể hủy chuyến',
                    text: result.error || 'Vui lòng liên hệ tổng đài để được hỗ trợ.'
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

async function payFinal(bookingId, method) {
    const isMomo = method === 'MOMO';
    const confirmMsg = isMomo
        ? "Thanh toán phần còn lại bằng MoMo?"
        : "Xác nhận bạn đã thanh toán tiền mặt trực tiếp cho Tài xế?";

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

        if (isMomo) {
            // Đề phòng Backend (do dữ liệu test) trả về finalAmount bị null -> Gson bỏ field này đi -> JS undefined
            let finalAmt = finalData.finalAmount;
            if (finalAmt === undefined || finalAmt === null) {
                let uiAmountStr = document.getElementById('lblInvoiceTotalAmount') ? document.getElementById('lblInvoiceTotalAmount').innerText : "0";
                finalAmt = parseInt(uiAmountStr.replace(/[^\d]/g, ''), 10) || 59000;
            }

            // BƯỚC 2: Nếu là MoMo, dùng finalAmt vừa tính được từ Backend (hoặc fallback) để gọi tạo Link MoMo
            const res = await fetch('http://localhost:8080/FleetFlow/api/v1/payments/momo/create', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    bookingId: bookingId,
                    amount: Math.round(finalAmt).toString()
                })
            });
            const data = await res.json();
            
            if (res.ok && data.success && data.paymentUrl) {
                // Lưu ID để phục vụ hủy chuyến nếu thất bại
                localStorage.setItem('pendingBookingId', bookingId);
                window.location.href = data.paymentUrl;
            } else {
                Swal.fire({ icon: 'error', title: 'Lỗi MoMo', text: data.message || 'Không thể tạo link thanh toán MoMo.' });
            }
        } else {
            // Thanh toán Tiền mặt (CASH) đã được ghi nhận thành công từ API /final
            let finalAmt = finalData.finalAmount;
            if (finalAmt === undefined || finalAmt === null) {
                let uiAmountStr = document.getElementById('lblInvoiceTotalAmount') ? document.getElementById('lblInvoiceTotalAmount').innerText : "0";
                finalAmt = parseInt(uiAmountStr.replace(/[^\d]/g, ''), 10) || 59000;
            }
            Swal.fire({
                icon: 'success',
                title: 'Thành công',
                text: `Thanh toán Tiền mặt thành công (${new Intl.NumberFormat('vi-VN').format(finalAmt)} ₫)`
            }).then(() => {
                location.reload();
            });
        }

    } catch (error) {
        console.error("Lỗi giao dịch:", error);
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
    const type = document.getElementById('complaintType').value;
    if (!content) {
        Swal.fire({ icon: 'warning', title: 'Thiếu thông tin', text: 'Vui lòng nhập nội dung khiếu nại.' });
        return;
    }

    const customerId = localStorage.getItem('customerId') || localStorage.getItem('accountId') || 1;
    const token = localStorage.getItem('accessToken');
    const btn = document.getElementById('btnSubmitComplaint');
    const oldText = btn.innerText;
    btn.innerHTML = '<i class=\"fa-solid fa-spinner fa-spin\"></i> Đang gửi...';
    btn.disabled = true;

    try {
        const res = await fetch('http://localhost:8080/FleetFlow/api/v1/complaints', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                bookingId: parseInt(currentComplaintBookingId),
                customerId: parseInt(customerId),
                type: type,
                content: content,
                fullName: localStorage.getItem('fullName') || 'Khách hàng',
                phone: localStorage.getItem('phone') || '0900000000',
                email: localStorage.getItem('email') || '',
                issueType: type === 'SERVICE_FEEDBACK' ? 'Thái độ tài xế / Chất lượng dịch vụ' : null
            })
        });

        const data = await res.json();

        // Đóng modal
        const modalEl = document.getElementById('complaintModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        if (data.success) {
            Swal.fire({ icon: 'success', title: 'Thành công', text: 'Đã gửi khiếu nại. Quản trị viên sẽ sớm liên hệ với bạn.' });

            // Reload Notifications
            if (typeof loadNotifications === 'function') {
                loadNotifications();
            }
        } else {
            Swal.fire({ icon: 'error', title: 'Lỗi', text: data.message || 'Gửi khiếu nại thất bại.' });
        }
    } catch (error) {
        console.error(error);
        Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Không thể kết nối đến máy chủ.' });
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
    }
}

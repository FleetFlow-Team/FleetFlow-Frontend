/**
 * ============================================================================
 * FLEETFLOW - DRIVER UI LAYER
 * File này chỉ chứa các hàm xử lý giao diện (DOM Manipulation, Hiệu ứng, 
 * Render dữ liệu), KHÔNG chứa logic gọi API Backend.
 * ============================================================================
 */

let incomeChartInstance = null; // Biến lưu trữ biểu đồ để tránh lỗi vẽ đè

// ============================================================================
// 1. KHỞI TẠO GIAO DIỆN KHI TRANG TẢI XONG
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Khởi tạo Bootstrap Toasts
    window.toastError = new bootstrap.Toast(document.getElementById("systemErrorToast"), { delay: 3000 });
    window.toastConflict = new bootstrap.Toast(document.getElementById("conflictToast"), { delay: 3000 });

    // ================== BỔ SUNG ĐOẠN NÀY ==================
    // 2. Lấy thông tin thật của tài xế từ LocalStorage (Lưu lúc đăng nhập)
    const token = localStorage.getItem('accessToken');
    const fullName = localStorage.getItem('fullName');
    const userRole = localStorage.getItem('userRole');

    if (!token || !fullName) {
        window.location.replace('../../index.html');
        return;
    }

    if (userRole.toUpperCase() !== 'DRIVER') {
        window.location.replace('../../error/403.html');
        return;
    }

    const avgRating = localStorage.getItem('averageRating') || '5.0';
    const status = localStorage.getItem('availabilityStatus') || 'OFFLINE';
    const wallet = parseFloat(localStorage.getItem('walletBalance') || 0);

    // 3. Đổ dữ liệu thật đè lên chữ "Nguyễn Quang" trên Header
    renderSessionHeader(fullName, userRole);

    // 4. Đổ dữ liệu thật đè lên phần "Đang tải..." trong tab Tài Khoản
    renderDriverProfile({
        fullName: fullName,
        averageRating: avgRating,
        availabilityStatus: status,
        walletBalance: wallet
    });
    // Gọi API lấy rating tài xế từ server
    if (typeof fetchDriverRatings === 'function') {
        fetchDriverRatings();
    }
    // ======================================================

    // 5. Khởi tạo vị trí cục kính ban đầu cho tab đang kích hoạt mặc định
    setTimeout(() => {
        const initialActiveLink = document.querySelector("#driver-nav .toc-link.active");
        if (initialActiveLink) {
            updateDriverVerticalIndicator(initialActiveLink);
        }
    }, 150);

    // 6. Cập nhật lại vị trí khi thay đổi kích thước cửa sổ
    window.addEventListener('resize', () => {
        const currentActiveSidebar = document.querySelector("#driver-nav .toc-link.active");
        updateDriverVerticalIndicator(currentActiveSidebar);
    });

    // 8. TỰ ĐỘNG KHÔI PHỤC CHUYẾN ĐI DANG DỞ (CHỐNG F5)
    const activeBookingId = localStorage.getItem('activeBookingId');
    if (activeBookingId) {
        console.log("[App Restore] Phát hiện chuyến đi đang dang dở, tự động khôi phục luồng GPS...");
        // Đợi 1 giây để load xong các hàm rồi mới gọi GPS
        setTimeout(() => {
            if (typeof startGpsTracking === 'function') {
                startGpsTracking(activeBookingId);
            }
        }, 1000);
    }

    // 7. Gọi API quét tín hiệu đơn hàng ngay khi mở Web lên (Hàm bạn đã viết ở bước trước)
    if (typeof fetchPendingJobs === "function") {
        fetchPendingJobs();
    }

    // Tải thông báo khi mở trang và thiết lập lặp mỗi 10s
    if (typeof loadDriverNotifications === "function") {
        loadDriverNotifications();
        setInterval(loadDriverNotifications, 10000);
    }
    // Lắng nghe sự kiện bật/tắt ô nhập "Lý do khác" của Modal Từ chối
    const rejectRadios = document.querySelectorAll('input[name="rejectReason"]');
    const otherReasonContainer = document.getElementById('otherReasonContainer');

    if (rejectRadios.length > 0) {
        rejectRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'other') {
                    otherReasonContainer.style.display = 'block';
                    document.getElementById('otherReasonInput').focus();
                } else {
                    otherReasonContainer.style.display = 'none';
                }
            });
        });
    }
});

// ============================================================================
// 2. XỬ LÝ ĐIỀU HƯỚNG & HIỆU ỨNG CHUYỂN TAB
// ============================================================================

/**
 * Hiệu ứng thanh trượt dọc (cục kính) chạy theo menu
 */
function updateDriverVerticalIndicator(activeLink) {
    const verticalIndicator = document.getElementById("vertical-indicator");
    if (!activeLink || !verticalIndicator) return;

    const container = activeLink.closest(".toc-list");
    if (!container) return;

    const linkRect = activeLink.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const topPos = linkRect.top - containerRect.top;

    verticalIndicator.style.transform = `translateY(${topPos}px)`;
    verticalIndicator.style.height = `${linkRect.height}px`;
}

/**
 * Chuyển tab giữa các section (Đồng bộ Desktop & Mobile)
 */
window.switchTab = function (tabId, element) {
    // Xóa class 'active' của tất cả các menu
    document.querySelectorAll("#driver-nav .toc-link, .bottom-nav-glass .nav-item")
        .forEach(a => a.classList.remove("active"));

    // Bôi sáng menu được bấm
    if (element.classList.contains('toc-link')) {
        element.classList.add("active");
        updateDriverVerticalIndicator(element);

        document.querySelectorAll(`.bottom-nav-glass .nav-item`).forEach(a => {
            if (a.getAttribute("onclick").includes(tabId)) a.classList.add("active");
        });
    } else {
        element.classList.add("active");

        document.querySelectorAll(`#driver-nav .toc-link`).forEach(a => {
            if (a.getAttribute("onclick").includes(tabId)) {
                a.classList.add("active");
                updateDriverVerticalIndicator(a);
            }
        });
    }

    // Ẩn section cũ, hiện section mới và cuộn lên đầu
    document.querySelectorAll(".dashboard-section").forEach(sec => sec.classList.remove("active"));
    const targetSection = document.getElementById(tabId);
    if (targetSection) {
        targetSection.classList.add("active");
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (tabId === 'tab-history') {
        if (typeof fetchDriverHistory === 'function') {
            fetchDriverHistory('COMPLETED_AND_CANCELLED'); // Cờ đặc biệt xử lý trong hàm
        }
    }

    if (tabId === 'tab-account') {
        if (typeof loadDriverRatings === 'function') {
            loadDriverRatings();
        }
    }
};

// ============================================================================
// 3. TƯƠNG TÁC NGƯỜI DÙNG (NÚT BẤM, NÚT GẠT, CARD)
// ============================================================================

/**
 * Xóa một thẻ (Card) cuốc xe mềm mại khỏi DOM
 */
window.removeCardSmoothly = function (card) {
    if (card) {
        card.style.transition = "transform 0.4s ease, opacity 0.4s ease";
        card.style.transform = "scale(0.9)";
        card.style.opacity = "0";

        setTimeout(() => {
            card.remove();

            const count = document.querySelectorAll(".broadcast-card-item").length;
            const badge = document.getElementById("jobBadge");
            if (badge) badge.innerText = count;

            if (count === 0) {
                if (badge) badge.style.display = "none";
                const emptyState = document.getElementById("emptyState");
                if (emptyState) emptyState.style.display = "block";
            }
        }, 400);
    }
}

/**
 * Xử lý giao diện và gọi API khi bấm "Nhận chuyến"
 * @param {HTMLElement} btnElement Nút bấm vừa tương tác
 * @param {number} broadcastId Mã lệnh điều động
 */
window.acceptJob = async function (btnElement, broadcastId, explicitBookingId) {
    // 1. Lưu lại giao diện nút ban đầu và Block UI (chống spam click)
    const originalText = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang tải...';

    // 2. Lấy Token từ LocalStorage
    const token = localStorage.getItem("accessToken");
    if (!token) {
        showModalAlert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!", "Thông báo", "warning");
        window.location.href = '../../index.html';
        return;
    }

    try {
        // 3. Gọi API Accept
        const response = await fetch(`${API_DISPATCH_BASE}/${broadcastId}/accept`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const result = await response.json();

        // 4. Xử lý phản hồi từ Backend
        if (response.ok && result.success) {
            // KHÔNG tự gọi startTrip() ở đây nữa — luồng thanh toán mới yêu cầu khách
            // phải đóng cọc 30% SAU khi tài xế nhận chuyến (Booking=CONFIRMED) rồi mới
            // được phép bắt đầu chuyến. Gọi start ngay ở bước accept này chắc chắn bị
            // backend từ chối "Khách hàng chưa đóng cọc 30%". Driver giờ bắt đầu chuyến
            // từ tab "Chuyến đi cũ" (nút "Bắt đầu chuyến đi" hiện khi trạng thái CONFIRMED),
            // sau khi khách đã thanh toán cọc.
            showModalAlert(
                "Nhận chuyến thành công! Bạn có thể quản lý và bắt đầu chuyến đi ngay tại tab này.",
                "Nhận chuyến thành công", "success"
            );
            // Cập nhật lại UI sau khi nhận thành công
            if (typeof fetchPendingJobs === "function") fetchPendingJobs();
            const jobTabElement = document.querySelector('a[onclick*="tab-job-board"]');
            if (jobTabElement) window.switchTab('tab-job-board', jobTabElement);
        } else {
            // [THẤT BẠI] - Trả lại nút bấm như cũ
            btnElement.disabled = false;
            btnElement.innerHTML = originalText;

            // Kiểm tra xem có phải lỗi do người khác nhận mất đơn (Conflict)
            if (result.error && result.error.includes("không tìm thấy lệnh dispatch hợp lệ")) {
                const cardId = `job-card-${broadcastId}`;
                removeCardSmoothly(document.getElementById(cardId));
                if (window.toastConflict) window.toastConflict.show();
            } else {
                const errorSpan = document.querySelector("#systemErrorToast .toast-body span");
                if (errorSpan) errorSpan.innerText = result.error || "Thao tác thất bại!";
                if (window.toastError) window.toastError.show();
            }
        }

    } catch (error) {
        console.error("Lỗi khi Accept Job:", error);
        btnElement.disabled = false;
        btnElement.innerHTML = originalText;

        const errorSpan = document.querySelector("#systemErrorToast .toast-body span");
        if (errorSpan) errorSpan.innerText = "Lỗi kết nối máy chủ!";
        if (window.toastError) window.toastError.show();
    }
};

/**
 * Xử lý giao diện khi gạt nút "Online / Offline"
 */
window.handleOnlineToggle = function (currentInput, walletBalance = 100000) {
    const toggleInputs = document.querySelectorAll(".navOnlineToggle");

    // Kiểm tra ví: Dưới 50k không cho phép Online
    if (walletBalance < 50000 && currentInput.checked) {
        toggleInputs.forEach(input => input.checked = false);
        const alertBanner = document.getElementById("walletAlertBanner");
        if (alertBanner) alertBanner.style.display = "block";
        return;
    } else {
        const alertBanner = document.getElementById("walletAlertBanner");
        if (alertBanner) alertBanner.style.display = "none";
    }

    // Đồng bộ nút gạt
    toggleInputs.forEach(input => input.checked = currentInput.checked);

};

// ============================================================================
// 4. RENDER DỮ LIỆU LÊN GIAO DIỆN (UI DATA BINDING)
// ============================================================================

/**
 * Hiển thị thông tin phiên đăng nhập lên Header
 */
function renderSessionHeader(fullName, userRole) {
    const headerName = document.querySelector('.user-info-block .profile-name');
    const headerRole = document.querySelector('.user-info-block .profile-role');

    // Đã sửa lại selector: Tìm đúng thẻ ảnh có class header-avatar-img
    const headerAvatar = document.querySelector('.header-avatar-img');

    if (headerName) headerName.innerText = fullName;
    if (headerRole) headerRole.innerText = userRole;
    if (headerAvatar) {
        // Tự động tạo Avatar dựa trên chữ cái đầu của tên (VD: Long Tạ -> LT)
        headerAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1a1c1a&color=fff`;
    }
}

/**
 * Hiển thị Profile Tài xế (Tên, Đánh giá, Trạng thái)
 */
function renderDriverProfile(data) {
    const accName = document.getElementById('accDriverName');
    const accAvatar = document.getElementById('accDriverAvatar');
    const accRating = document.getElementById('accDriverRating');

    if (accName) accName.innerText = data.fullName;
    if (accAvatar) accAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullName)}&background=1a1c1a&color=fff`;
    if (accRating) accRating.innerHTML = `<i class="fa-solid fa-star me-1"></i> ${data.averageRating} đánh giá`;

    // Đồng bộ nút gạt Online
    const isOnline = (data.availabilityStatus === 'ONLINE');
    document.querySelectorAll(".navOnlineToggle").forEach(input => input.checked = isOnline);
    window.handleOnlineToggle({ checked: isOnline }, data.walletBalance);
}

/**
 * Hiển thị thông số Dashboard (Doanh thu, Số chuyến)
 */
function renderDashboardMetrics(data) {
    const dashNetIncomeEl = document.getElementById('dashNetIncome');
    const dashTotalTripsEl = document.getElementById('dashTotalTrips');
    const dashBonusEl = document.getElementById('dashBonus');

    if (dashNetIncomeEl) dashNetIncomeEl.innerText = (data.totalEarnings || 0).toLocaleString("vi-VN");
    if (dashTotalTripsEl) dashTotalTripsEl.innerText = data.completedTrips || 0;
    if (dashBonusEl) dashBonusEl.innerText = (data.cancellationCompensation || 0).toLocaleString("vi-VN");
}

/**
 * Render bảng lịch sử giao dịch ví
 */
function renderTransactionTableFromData(transactions) {
    const tbody = document.getElementById('transactionTableBody');
    if (!tbody) return;

    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-white-50 py-4">Chưa có lịch sử biến động số dư nào.</td></tr>`;
        return;
    }

    let html = '';
    transactions.forEach(trx => {
        const isCancellation = (trx.earningType === 'CancellationCompensation');
        const badgeColor = isCancellation ? 'warning' : 'info';
        const typeText = isCancellation ? 'Đền bù hủy chuyến' : 'Cước chuyến đi';
        const icon = isCancellation ? 'fa-hand-holding-dollar' : 'fa-car-side';
        const formattedTime = trx.createdAt ? new Date(trx.createdAt).toLocaleString("vi-VN", { hour12: false }) : '...';
        const grossAmount = (trx.fareShare || 0) + (trx.surchargeShare || 0) + (trx.cancellationCompensation || 0);

        html += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td class="py-3">
                    <div class="fw-bold text-white">#GD-${trx.earningID}</div>
                    <div class="text-white-50 small">Đơn: #BK-${trx.bookingID}</div>
                    <div class="text-white-50 mt-1" style="font-size: 0.75rem;">${formattedTime}</div>
                </td>
                <td class="py-3 align-middle">
                    <span class="badge bg-${badgeColor} bg-opacity-25 text-${badgeColor} border border-${badgeColor} p-2 px-3 rounded-pill">
                        <i class="fa-solid ${icon} me-1"></i> ${typeText}
                    </span>
                </td>
                <td class="text-white fw-bold py-3 align-middle">${grossAmount.toLocaleString("vi-VN")} đ</td>
                <td class="text-danger fw-bold py-3 align-middle">
                    ${trx.companyCommission > 0
                ? '-' + trx.companyCommission.toLocaleString("vi-VN") + ' đ'
                : '<span class="badge bg-secondary bg-opacity-50 text-white border border-secondary px-2">Miễn phí</span>'}
                </td>
                <td class="text-success fw-bold fs-5 py-3 align-middle">+ ${(trx.netAmount || 0).toLocaleString("vi-VN")} đ</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

/**
 * Vẽ Biểu đồ Chart.js
 */
function renderIncomeChartFromData(monthlyData) {
    const chartEl = document.getElementById("incomeChart");
    if (!chartEl) return;
    const ctx = chartEl.getContext("2d");

    if (incomeChartInstance) {
        incomeChartInstance.destroy();
    }

    const sortedData = [...monthlyData].reverse();
    const labels = sortedData.map(item => `Tháng ${item.month}/${item.year}`);
    const netIncomes = sortedData.map(item => item.monthlyNetIncome || 0);
    const transactionsCount = sortedData.map(item => item.totalTransactions || 0);

    let gradientBlue = ctx.createLinearGradient(0, 0, 0, 400);
    gradientBlue.addColorStop(0, "rgba(56, 189, 248, 0.8)");
    gradientBlue.addColorStop(1, "rgba(56, 189, 248, 0.2)");

    incomeChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Thu nhập thực nhận (Net)",
                data: netIncomes,
                backgroundColor: gradientBlue,
                borderRadius: 8,
                barThickness: 28,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "top", align: "end", labels: { color: "#ffffff", usePointStyle: true } },
                tooltip: {
                    backgroundColor: "rgba(0,0,0,0.85)",
                    cornerRadius: 8,
                    callbacks: {
                        footer: (tooltipItems) => {
                            const index = tooltipItems[0].dataIndex;
                            return `Tổng số đơn: ${transactionsCount[index]} cuốc`;
                        }
                    }
                },
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: "rgba(255,255,255,0.7)" } },
                y: {
                    border: { display: false },
                    grid: { color: "rgba(255,255,255,0.1)" },
                    ticks: {
                        color: "rgba(255,255,255,0.5)",
                        callback: function (value) { return value.toLocaleString("vi-VN") + " đ"; }
                    }
                },
            },
        },
    });
}
// ============================================================================
// 5. TÍCH HỢP API: TÀI XẾ NHẬN LỆNH ĐIỀU ĐỘNG (GET PENDING)
// ============================================================================

const API_DISPATCH_BASE = 'http://localhost:8080/FleetFlow/api/v1/driver/dispatch';

/**
 * Hàm lấy danh sách cuốc xe chờ nhận
 */
async function fetchPendingJobs() {
    const jobListContainer = document.getElementById("jobList");
    const emptyState = document.getElementById("emptyState");
    const jobBadge = document.getElementById("jobBadge");

    // 1. Lấy token từ LocalStorage (Bạn nhớ set 'DRIVER_TOKEN' lúc tài xế đăng nhập)
    const token = localStorage.getItem("accessToken");

    if (!token) {
        console.warn("Chưa có DRIVER_TOKEN. Vui lòng đăng nhập!");
        // return; // Bỏ comment chữ return này khi đã ráp form đăng nhập hoàn chỉnh
    }

    // 2. Hiển thị UI Loading (Spinner)
    jobListContainer.innerHTML = `
        <div class="w-100 text-center py-5 text-white" id="loadingState">
            <div class="spinner-border text-primary mb-3" role="status"></div>
            <p class="text-white-50 fw-bold">Đang đồng bộ tín hiệu từ trạm điều phối...</p>
        </div>
    `;
    if (jobBadge) jobBadge.style.display = "none"; // Ẩn badge lúc đang tải

    try {
        // 3. Gọi API (Backend sẽ tự map token thành AccountId -> DriverId)
        const response = await fetch(`${API_DISPATCH_BASE}/pending`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const result = await response.json();

        // 4. Kiểm tra thành công và render View
        if (response.ok && result.success) {
            let pendingJobs = result.data || [];

            // Gọi thêm API lịch sử để lấy các chuyến đang chạy (CONFIRMED, ONGOING)
            let activeJobs = [];
            try {
                const req1 = await fetch(`${API_DISPATCH_BASE}/history?status=CONFIRMED`, { headers: { "Authorization": `Bearer ${token}` } });
                const res1 = await req1.json();
                if (res1.success) activeJobs = activeJobs.concat(res1.data || []);

                const req2 = await fetch(`${API_DISPATCH_BASE}/history?status=ONGOING`, { headers: { "Authorization": `Bearer ${token}` } });
                const res2 = await req2.json();
                if (res2.success) activeJobs = activeJobs.concat(res2.data || []);
            } catch (e) { console.error("Lỗi lấy chuyến đang chạy", e); }

            if (pendingJobs.length > 0 || activeJobs.length > 0) {
                // Nếu có cuốc xe -> Render ra thẻ HTML
                renderPendingJobs(pendingJobs, activeJobs);

                // Hiển thị số lượng lên dấu chấm đỏ (Badge)
                if (jobBadge) {
                    jobBadge.innerText = result.data.length;
                    jobBadge.style.display = "inline-block";
                }
            } else {
                // Nếu mảng rỗng -> Render trạng thái không có đơn
                showEmptyState();
            }
        } else {
            throw new Error(result.error || "Lỗi phản hồi từ server.");
        }

    } catch (error) {
        console.error("Lỗi Fetch Pending Jobs:", error);
        showEmptyState(); // Fallback về màn hình trống
        if (window.toastError) {
            // Thay đổi text của toast theo lỗi thực tế (nếu muốn)
            window.toastError.show();
        }
    }
}

/**
 * Xử lý sự kiện bấm nút Tải lại đơn mới tại tab Nhận chuyến
 */
window.triggerRefreshJobs = async function (btnElement) {
    if (btnElement) {
        btnElement.disabled = true;
        const icon = btnElement.querySelector('.icon-refresh');
        if (icon) icon.classList.add('fa-spin');
    }

    await fetchPendingJobs();

    if (btnElement) {
        setTimeout(() => {
            btnElement.disabled = false;
            const icon = btnElement.querySelector('.icon-refresh');
            if (icon) icon.classList.remove('fa-spin');
        }, 800);
    }
};

/**
 * Hàm biến đổi JSON Data thành cấu trúc HTML Card
 * @param {Array} jobs Mảng chứa các lệnh broadcast 
 */
function renderPendingJobs(pendingJobs, activeJobs = []) {
    const jobListContainer = document.getElementById("jobList");

    // Khởi tạo HTML với trạng thái EmptyState bị ẩn (để tái sử dụng khi xóa hết card)
    let html = `
        <div class="empty-state w-100 text-center py-5" id="emptyState" style="display: none;">
            <i class="fa-solid fa-satellite-dish radar-icon text-white-50 fs-1 mb-3"></i>
            <p class="text-white-50">Hệ thống đang dò tìm chuyến đi quanh bạn...</p>
        </div>
    `;

    // Lặp qua từng chuyến xe ĐANG CHẠY (CONFIRMED/ONGOING)
    activeJobs.forEach(trip => {
        const moneyStr = trip.estimatedTotal ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(trip.estimatedTotal) : '0 ₫';
        let typeBadge = trip.bookingType === 'HOURLY' ? '<span class="badge bg-secondary ms-2">Thuê theo giờ</span>' : '<span class="badge bg-info text-dark ms-2">Chuyến đường dài</span>';

        let statusBadge = '';
        if (trip.bookingStatus === 'CONFIRMED') statusBadge = '<span class="badge bg-warning text-dark">Chờ khởi hành</span>';
        if (trip.bookingStatus === 'ONGOING') statusBadge = '<span class="badge bg-primary">Đang di chuyển</span>';

        html += `
            <div class="col-xl-6 broadcast-card-item">
                <div class="glass-panel h-100 p-3 border border-warning rounded-3" style="box-shadow: 0 0 15px rgba(245,158,11,0.2);">
                    <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary">
                        <div>
                            <span class="fw-bold text-white fs-5">#BK-${trip.bookingId}</span>
                            ${typeBadge}
                        </div>
                        ${statusBadge}
                    </div>
                    <div class="text-white-50 small mb-2"><i class="fa-regular fa-clock me-1"></i> ${trip.departureTime || trip.acceptedAt || 'N/A'}</div>
                    <div class="text-white mb-2">
                        <i class="fa-solid fa-location-dot text-primary me-2"></i> ${trip.pickupAddress || 'N/A'}
                    </div>
                    <div class="text-white mb-3">
                        <i class="fa-solid fa-location-dot text-danger me-2"></i> ${trip.dropoffAddress || 'N/A'}
                    </div>
                    <div class="d-flex justify-content-between align-items-center border-top border-secondary pt-2 mb-3">
                        <span class="text-white-50 small">
                            <i class="fa-solid fa-road me-1"></i> Quãng đường: <strong class="text-white">${trip.distanceKm ? trip.distanceKm + ' km' : 'N/A'}</strong>
                        </span>
                        <span class="fw-bold text-success">${moneyStr}</span>
                    </div>
                    ${trip.bookingStatus === 'CONFIRMED' ? `
                    <button type="button" class="btn btn-success w-100 fw-bold py-2 mb-2"
                        onclick="(async()=>{await window.startTrip(this, ${trip.bookingId}); fetchPendingJobs();})()">
                        <i class="fa-solid fa-play me-2"></i> Bắt đầu chuyến đi
                    </button>` : ''}
                    ${trip.bookingStatus === 'ONGOING' ? `
                    <div class="mb-2">
                        <label for="completionPhoto-${trip.bookingId}" class="form-label text-white fw-bold small mb-1">Ảnh xác nhận điểm đến <span class="text-danger">*</span></label>
                        <input type="file" id="completionPhoto-${trip.bookingId}" accept="image/*" class="form-control" />
                    </div>
                    <button type="button" class="btn btn-primary w-100 fw-bold py-2"
                        onclick="(async()=>{await window.completeTrip(this, ${trip.bookingId}, ${trip.pendingCashFinal === true}); fetchPendingJobs();})()">
                        <i class="fa-solid fa-flag-checkered me-2"></i> Hoàn thành chuyến đi
                    </button>` : ''}
                </div>
            </div>
        `;
    });

    // Lặp qua từng chuyến xe CHỜ NHẬN (PENDING)
    pendingJobs.forEach(job => {
        // Format thời gian từ chuỗi ISO
        const dateObj = new Date(job.dispatchedAt);
        const timeFormatted = dateObj.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
        const dateFormatted = dateObj.toLocaleDateString("vi-VN");

        const distanceText = job.distanceKm ? parseFloat(job.distanceKm).toFixed(1) + ' km' : 'N/A';
        const customerName = job.customerName || 'Khách vãng lai';
        const customerPhone = job.customerPhone || 'N/A';
        const pickupAddr = job.pickupAddress || 'N/A';
        const dropoffAddr = job.dropoffAddress || 'N/A';

        html += `
            <div class="col-xl-6 broadcast-card-item" id="job-card-${job.broadcastId}">
                <div class="glass-panel h-100 d-flex flex-column" id="trip-card-${job.bookingId}">
                    <div class="d-flex justify-content-between align-items-start border-bottom border-secondary pb-3 mb-3">
                        <div>
                            <span class="fw-bold text-white fs-5 d-block">#BK-${job.bookingId}</span>
                            <span class="text-white-50 small" id="trip-status-${job.bookingId}">
                                <i class="fa-regular fa-clock me-1"></i> Nhận lệnh: ${timeFormatted} - ${dateFormatted}
                            </span>
                        </div>
                    </div>
                    
                    <div class="flex-grow-1 mb-4 text-white">
                        <div class="p-3 bg-white bg-opacity-10 border border-secondary rounded-3 d-flex flex-column gap-3 text-start">
                            <div class="d-flex align-items-center gap-3">
                                <div class="bg-primary bg-opacity-25 p-2 rounded-circle">
                                    <i class="fa-solid fa-user text-primary fs-5"></i>
                                </div>
                                <div>
                                    <div class="small text-white-50 mb-1">Khách hàng</div>
                                    <div class="fw-bold fs-6">${customerName} <span class="ms-2 fw-normal opacity-75">(${customerPhone})</span></div>
                                </div>
                            </div>
                            
                            <div class="d-flex align-items-start gap-3">
                                <div class="bg-danger bg-opacity-25 p-2 rounded-circle">
                                    <i class="fa-solid fa-location-dot text-danger fs-5"></i>
                                </div>
                                <div>
                                    <div class="small text-white-50 mb-1">Điểm đón</div>
                                    <div class="fw-bold">${pickupAddr}</div>
                                </div>
                            </div>
                            
                            <div class="d-flex align-items-start gap-3">
                                <div class="bg-success bg-opacity-25 p-2 rounded-circle">
                                    <i class="fa-solid fa-flag-checkered text-success fs-5"></i>
                                </div>
                                <div>
                                    <div class="small text-white-50 mb-1">Điểm đến</div>
                                    <div class="fw-bold">${dropoffAddr}</div>
                                </div>
                            </div>
                            
                            <div class="d-flex align-items-center gap-3">
                                <div class="bg-info bg-opacity-25 p-2 rounded-circle">
                                    <i class="fa-solid fa-route text-info fs-5"></i>
                                </div>
                                <div>
                                    <div class="small text-white-50 mb-1">Quãng đường</div>
                                    <div class="fw-bold">${distanceText}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="border-top border-secondary pt-3 mt-auto">
                        <div class="row g-2" id="action-buttons-${job.bookingId}">
                            <div class="col-6">
                                <button class="btn-glass-action border-warning text-warning w-100 py-3 fs-6 fw-bold" 
                                        style="background: rgba(245, 158, 11, 0.1);" 
                                        onclick="rejectJob(this, ${job.broadcastId})">
                                    Từ chối
                                </button>
                            </div>
                            <div class="col-6">
                                <button class="btn-glass-action bg-primary border-primary text-white w-100 py-3 fs-6 fw-bold" 
                                        onclick="acceptJob(this, ${job.broadcastId}, ${job.bookingId})">
                                    Nhận chuyến
                                </button>
                            </div>
                        </div>
                        <div class="row g-2" id="btn-complete-${job.bookingId}" style="display:none;">
                            <div class="col-12 mb-2">
                                <label for="completionPhoto-${job.bookingId}" class="form-label text-white fw-bold small mb-1">Ảnh xác nhận điểm đến <span class="text-danger">*</span></label>
                                <input type="file" id="completionPhoto-${job.bookingId}" accept="image/*" class="form-control" />
                            </div>
                            <div class="col-12">
                                <button class="btn-glass-action border-success text-white w-100 py-3 fs-6 fw-bold shadow-lg" 
                                        style="background: #10b981;" 
                                        onclick="completeTrip(this, ${job.bookingId}, ${job.pendingCashFinal === true})">
                                    Hoàn thành chuyến đi <i class="fa-solid fa-flag-checkered ms-2"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    jobListContainer.innerHTML = html;
}

/**
 * Hiển thị thẻ rỗng khi hết cuốc xe
 */
function showEmptyState() {
    const jobListContainer = document.getElementById("jobList");
    jobListContainer.innerHTML = `
        <div class="empty-state w-100 text-center py-5" id="emptyState" style="display: block;">
            <i class="fa-solid fa-satellite-dish radar-icon text-white-50 fs-1 mb-3"></i>
            <p class="text-white-50">Hiện tại chưa có cuốc xe nào được phân bổ.</p>
        </div>
    `;
}

// ============================================================================
// 7. TOÀN BỘ LOGIC XỬ LÝ TỪ CHỐI CHUYỂN (ĐỒNG BỘ HOÀN CHỈNH CHỐNG SẬP)
// ============================================================================

// Biến toàn cục lưu ID của đơn hàng đang thực hiện từ chối
window.currentRejectBroadcastId = null;

/**
 * Mở Modal hỏi lý do khi bấm "Từ chối" trên thẻ chuyến xe
 */
window.rejectJob = function (btnElement, broadcastId) {
    window.currentRejectBroadcastId = broadcastId;

    // Reset lại Modal về trạng thái mặc định cho sạch sẽ
    const reason1 = document.getElementById('reason1');
    if (reason1) reason1.checked = true;

    const otherContainer = document.getElementById('otherReasonContainer');
    if (otherContainer) otherContainer.style.display = 'none';

    const otherInput = document.getElementById('otherReasonInput');
    if (otherInput) otherInput.value = '';

    // Gọi Modal của Bootstrap hiện lên
    const rejectModalEl = document.getElementById("rejectModal");
    if (rejectModalEl) {
        const rejectModal = new bootstrap.Modal(rejectModalEl);
        rejectModal.show();
    } else {
        showModalAlert("Lỗi: Không tìm thấy khung giao diện 'rejectModal' trong file HTML!", "Lỗi", "error");
    }
};

/**
 * Gửi API POST Từ chối khi bấm nút "Xác nhận Từ chối" trong Modal
 */
window.confirmRejectJob = async function () {
    if (!window.currentRejectBroadcastId) return;

    // 1. Thu thập dữ liệu Lý do từ các nút Radio chọn lựa
    const checkedRadio = document.querySelector('input[name="rejectReason"]:checked');
    if (!checkedRadio) {
        showModalAlert("Vui lòng chọn một lý do từ chối!", "Cảnh báo", "warning");
        return;
    }

    let reason = checkedRadio.value;
    if (reason === 'other') {
        const otherInput = document.getElementById('otherReasonInput');
        reason = otherInput ? otherInput.value.trim() : '';
        if (!reason) {
            showModalAlert("Vui lòng nhập lý do từ chối cụ thể của bạn!", "Cảnh báo", "warning");
            return;
        }
    }

    // 2. Chặn tương tác nút để tránh tài xế spam nhấn liên tục (Block UI)
    const btnSubmit = document.getElementById("btnSubmitReject");
    const originalText = btnSubmit ? btnSubmit.innerHTML : "Xác nhận Từ chối";
    if (btnSubmit) {
        btnSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang gửi...';
        btnSubmit.disabled = true;
    }

    // 3. Kiểm tra và xác thực mã quyền Token đăng nhập
    const token = localStorage.getItem("accessToken");
    if (!token) {
        showModalAlert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!", "Thông báo", "warning");
        window.location.replace('../../index.html');
        return;
    }

    try {
        // 4. Đóng gói dữ liệu JSON và bắn API POST lên hệ thống Backend
        const response = await fetch(`${API_DISPATCH_BASE}/${window.currentRejectBroadcastId}/reject`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ reason: reason }) // Gửi kèm lý do từ chối lên DB
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // [XỬ LÝ THÀNH CÔNG]
            // Ẩn Modal Popup Từ chối trên màn hình
            const modalEl = document.getElementById("rejectModal");
            if (modalEl) {
                const modalInstance = bootstrap.Modal.getInstance(modalEl);
                if (modalInstance) modalInstance.hide();
            }

            // Xóa thẻ xe này khỏi giao diện Chờ Nhận một cách mượt mà
            const cardId = `job-card-${window.currentRejectBroadcastId}`;
            const cardEl = document.getElementById(cardId);
            if (cardEl) {
                removeCardSmoothly(cardEl);
            }

            // Thông báo cho người dùng
            setTimeout(() => {
                showModalAlert("Đã từ chối chuyến thành công!", "Thành công", "success");
            }, 500);

        } else {
            // [THẤT BẠI TỪ SERVER]
            showModalAlert(result.error || "Có lỗi xảy ra từ máy chủ khi thực hiện từ chối chuyến.", "Lỗi", "error");
        }

    } catch (error) {
        console.error("Lỗi kết nối API Reject:", error);
        showModalAlert("Mất kết nối! Không thể gửi tín hiệu đến máy chủ Backend.", "Lỗi mạng", "error");
    } finally {
        // Khôi phục lại trạng thái ban đầu cho nút bấm
        if (btnSubmit) {
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
        }
        window.currentRejectBroadcastId = null; // Làm sạch biến tạm
    }
};

// ============================================================================
// 8. XỬ LÝ VẬN HÀNH CHUYẾN ĐI (START / GPS / COMPLETE)
// ============================================================================

const API_TRIPS_BASE = 'http://localhost:8080/FleetFlow/api/v1/driver/trips';
let currentGpsInterval = null; // Biến giữ đồng hồ đếm giờ bắn GPS

/**
 * Xử lý khi tài xế bấm nút "Bắt đầu chuyến đi"
 */
window.startTrip = async function (btnElement, bookingId) {
    const originalText = btnElement.innerHTML;

    // 1. Chặn UI chống click đúp
    btnElement.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang kết nối...';
    btnElement.disabled = true;

    // 2. Lấy Token
    const token = localStorage.getItem("accessToken");
    if (!token) {
        showModalAlert("Vui lòng đăng nhập lại!", "Cảnh báo", "warning");
        return;
    }

    try {
        // 3. Gọi API Bắt đầu
        const response = await fetch(`${API_TRIPS_BASE}/${bookingId}/start`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // [THÀNH CÔNG] - Bắt đầu biến đổi Giao diện
            // LƯU VÀO BỘ NHỚ: Ghi nhớ ID của chuyến đi đang chạy để chống F5
            localStorage.setItem('activeBookingId', bookingId);
            // a. Ẩn nút Start, Hiện nút Complete
            btnElement.style.display = 'none';
            const btnComplete = document.getElementById(`btn-complete-${bookingId}`);
            if (btnComplete) btnComplete.style.display = 'block';

            // b. Đổi màu viền thẻ xe sang Xanh lá (Đang chạy)
            const tripCard = document.getElementById(`trip-card-${bookingId}`);
            if (tripCard) {
                tripCard.style.borderLeft = '4px solid #10b981';
                tripCard.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.2)'; // Thêm viền sáng đẹp mắt
            }

            // c. Đổi chữ Trạng thái
            const statusText = document.getElementById(`trip-status-${bookingId}`);
            if (statusText) {
                statusText.className = 'text-success small fw-bold';
                statusText.innerHTML = '<i class="fa-solid fa-car-side fa-fade me-1"></i> ĐANG DI CHUYỂN';
            }

            // d. KÍCH HOẠT BẮN GPS NGẦM (Sẽ viết code ở Bước 2)
            showModalAlert("Đã bắt đầu chuyến đi. Hệ thống định vị đã được bật!", "Thành công", "success");
            startGpsTracking(bookingId);

        } else {
            // [THẤT BẠI]
            showModalAlert(result.error || "Không thể bắt đầu chuyến đi lúc này!", "Lỗi", "error");
            btnElement.innerHTML = originalText;
            btnElement.disabled = false;
        }

    } catch (error) {
        console.error("Lỗi API Start Trip:", error);
        showModalAlert("Lỗi kết nối máy chủ!", "Lỗi mạng", "error");
        btnElement.innerHTML = originalText;
        btnElement.disabled = false;
    }
}

/**
 * BƯỚC 2: Hàm kích hoạt bắn tọa độ GPS ngầm (Chạy mỗi 30 giây)
 * @param {number} bookingId - Mã chuyến đi đang thực hiện
 */
function startGpsTracking(bookingId) {
    console.log("Đã kích hoạt định vị ngầm cho Booking ID: " + bookingId);

    // Xóa bộ đếm cũ (nếu có) để tránh việc chạy trùng lặp nhiều vòng lặp cùng lúc
    if (currentGpsInterval) {
        clearInterval(currentGpsInterval);
    }

    // Hàm nội bộ dùng để lấy GPS và gọi API
    const sendLocationToServer = () => {
        // 1. Kiểm tra xem trình duyệt/điện thoại có hỗ trợ định vị không
        if (!navigator.geolocation) {
            console.error("[GPS] Thiết bị này không hỗ trợ định vị!");
            return;
        }

        // 2. Yêu cầu lấy tọa độ hiện tại
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                // Lấy kinh độ và vĩ độ
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Lấy Token để xác thực
                const token = localStorage.getItem("accessToken");
                if (!token) return;

                try {
                    // 3. Gọi API gửi tọa độ (Hoàn toàn âm thầm, không block UI)
                    const response = await fetch(`${API_TRIPS_BASE}/${bookingId}/gps`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            latitude: lat,
                            longitude: lng
                        })
                    });

                    if (response.ok) {
                        // Log ra console để bạn dễ debug, không hiển thị cho tài xế thấy
                        console.log(`[GPS - BK#${bookingId}] Đã gửi tọa độ thành công: ${lat}, ${lng}`);
                    } else if (response.status === 400) {
                        console.log("[GPS] Server từ chối cập nhật tọa độ (có thể chuyến đi đã kết thúc).");
                        if (currentGpsInterval) {
                            clearInterval(currentGpsInterval);
                            currentGpsInterval = null;
                        }
                    } else {
                        console.error("[GPS] Lỗi từ Server khi lưu tọa độ.");
                    }
                } catch (error) {
                    console.error("[GPS] Mất mạng, không thể gửi tọa độ ngầm.");
                }
            },
            (error) => {
                // Xử lý lỗi nếu tài xế tắt GPS hoặc từ chối cấp quyền
                console.error("[GPS] Lỗi lấy tọa độ: ", error.message);
                if (error.code === 1) { // 1 = PERMISSION_DENIED
                    showModalAlert("CẢNH BÁO: Cần cấp quyền truy cập vị trí để hệ thống theo dõi chuyến đi!", "Quyền vị trí", "warning");
                }
            },
            {
                // Cấu hình GPS: Yêu cầu độ chính xác cao nhất (dùng cho xe cộ)
                enableHighAccuracy: true,
                timeout: 10000,   // Hủy nếu sau 10s không lấy được vị trí
                maximumAge: 0     // Không dùng vị trí cũ lưu trong cache
            }
        );
    };

    // Gọi hàm lần đầu tiên NGAY LẬP TỨC khi vừa bấm "Bắt đầu chuyến đi"
    sendLocationToServer();

    // Thiết lập vòng lặp GPS (30s)
    currentGpsInterval = setInterval(sendLocationToServer, 30000);
}

// Biến lưu trữ notification ID đã hiển thị để không báo lại liên tục
let lastNotifiedIds = new Set();

/**
 * BƯỚC 3: Xử lý khi tài xế bấm "Hoàn thành chuyến"
 */
/**
 * Xử lý khi tài xế bấm "Hoàn thành chuyến"
 * Đổi trạng thái dưới DB, tắt GPS, xóa thẻ xe khỏi UI và dọn dẹp bộ nhớ máy
 */
window.completeTrip = async function (btnElement, bookingId, isCashTrip = false) {
    window.currentTripIsCash = isCashTrip;

    // Kiểm tra ảnh trước khi xử lý gọi API
    const fileInput = document.getElementById(`completionPhoto-${bookingId}`);
    if (!fileInput || fileInput.files.length === 0) {
        showModalAlert("Vui lòng chọn hoặc chụp ảnh xác nhận điểm đến!", "Thiếu ảnh", "warning");
        return;
    }
    const completionPhoto = fileInput.files[0];

    const originalText = btnElement.innerHTML;

    // 1. Chặn UI tránh việc tài xế bấm đúp nhiều lần gây lỗi trùng gửi lệnh
    btnElement.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang xử lý...';
    btnElement.disabled = true;

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
        if (isCashTrip) {
            await fetch(`http://localhost:8080/FleetFlow/api/v1/driver/trips/${bookingId}/confirm-cash`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
        }

        // Tạo FormData để upload ảnh
        const formData = new FormData();
        formData.append("completionPhoto", completionPhoto);

        // 2. Gọi API Hoàn thành chuyến xe về Server Backend
        const response = await fetch(`http://localhost:8080/FleetFlow/api/v1/driver/trips/${bookingId}/complete`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // [XỬ LÝ THÀNH CÔNG Ở BACKEND]
            console.log(`[Success] Cuốc xe #${bookingId} đã hoàn thành thành công.`);

            // a. Tắt ngay vòng lặp định vị GPS ngầm để tiết kiệm pin/băng thông
            if (currentGpsInterval) {
                clearInterval(currentGpsInterval);
                currentGpsInterval = null;
                console.log("[GPS] Đã tắt định vị ngầm do chuyến đi hoàn tất.");
            }

            // b. DỌN SẠCH LOCALSTORAGE: Xóa ID cuốc xe này khỏi bộ nhớ máy để chống lỗi F5 hiện lại
            let acceptedIds = JSON.parse(localStorage.getItem('acceptedBookingIds') || '[]');
            acceptedIds = acceptedIds.filter(id => id != bookingId);
            localStorage.setItem('acceptedBookingIds', JSON.stringify(acceptedIds));

            // Xóa cờ chuyến đi đang chạy dở
            localStorage.removeItem('activeBookingId');

            // c. BIẾN MẤT KHỎI TAB ĐÃ NHẬN (Hiệu ứng UI mượt mà)
            const tripCard = document.getElementById(`trip-card-${bookingId}`);
            if (tripCard) {
                // Tìm thẻ bao ngoài cùng của thẻ xe (.broadcast-card-item)
                const cardWrapper = tripCard.closest('.broadcast-card-item');
                if (cardWrapper) {
                    // Kích hoạt CSS hiệu ứng mờ dần và thu nhỏ dọn bớt không gian
                    cardWrapper.style.transition = "all 0.5s ease";
                    cardWrapper.style.opacity = "0";
                    cardWrapper.style.transform = "scale(0.8) translateY(-20px)";

                    // Chờ hiệu ứng CSS chạy xong (500ms) thì chính thức xóa phần tử khỏi cây DOM
                    setTimeout(() => {
                        cardWrapper.remove();

                        // Kiểm tra xem sau khi xóa, tab "Đã Nhận" có bị trống không
                        const acceptedListContainer = document.getElementById("jobList");
                        const remainingCards = acceptedListContainer.querySelectorAll('.broadcast-card-item');

                        // Nếu không còn cuốc xe nào, tự động trả về giao diện Trống (Empty State) nền nã
                        if (remainingCards.length === 0) {
                            acceptedListContainer.innerHTML = `
                                <div class="empty-state w-100 text-center py-5">
                                    <i class="fa-solid fa-car-on radar-icon text-white-50 fs-1 mb-3"></i>
                                    <p class="text-white-50">Bạn chưa có chuyến xe nào đang thực hiện.</p>
                                </div>
                            `;
                        }
                    }, 500);
                }
            }

            // d. Hiển thị Popup Modal thông báo chúc mừng tài xế
            showDriverRatingModal(bookingId);

        } else {
            // [THẤT BẠI TỪ SERVER]
            showModalAlert(result.error || "Không thể hoàn thành chuyến đi lúc này!", "Lỗi", "error");
            btnElement.innerHTML = originalText;
            btnElement.disabled = false;
        }

    } catch (error) {
        // [LỖI MẤT KẾT NỐI]
        console.error("Lỗi kết nối API Complete Trip:", error);
        showModalAlert("Mất tín hiệu đường truyền máy chủ! Vui lòng kiểm tra lại mạng.", "Lỗi mạng", "error");
        btnElement.innerHTML = originalText;
        btnElement.disabled = false;
    }
}

/**
 * Xử lý khi tài xế bấm "Xác nhận đã nhận tiền mặt" — khách đã chọn trả FINAL
 * bằng tiền mặt (pendingCashFinal=true), tài xế xác nhận sau khi thực nhận tiền.
 * Sau khi xác nhận, nút "Hoàn thành chuyến đi" mới thực sự dùng được.
 */
window.confirmCashPayment = async function (btnElement, bookingId) {
    const originalText = btnElement.innerHTML;
    btnElement.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang xác nhận...';
    btnElement.disabled = true;

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
        const response = await fetch(`${API_TRIPS_BASE}/${bookingId}/confirm-cash`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });
        const result = await response.json();

        if (response.ok && result.success) {
            showModalAlert(result.message || "Đã xác nhận nhận tiền mặt!", "Thành công", "success");
        } else {
            showModalAlert(result.error || "Không thể xác nhận lúc này!", "Lỗi", "error");
            btnElement.innerHTML = originalText;
            btnElement.disabled = false;
        }
    } catch (error) {
        console.error("Lỗi API Confirm Cash:", error);
        showModalAlert("Mất tín hiệu đường truyền máy chủ! Vui lòng kiểm tra lại mạng.", "Lỗi mạng", "error");
        btnElement.innerHTML = originalText;
        btnElement.disabled = false;
    }
}

// 13. LOAD THÔNG BÁO TÀI XẾ
// ============================================================================
window.driverNotificationCache = window.driverNotificationCache || [];
window.driverUnreadCount = window.driverUnreadCount || 0;

async function loadDriverNotifications() {
    const listEl = document.getElementById("notificationList");
    if (!listEl) return;

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
        const response = await fetch(`${API_DISPATCH_BASE}/notifications`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();
        if (response.ok && result.success) {
            const newNotis = result.notifications || [];

            let hasNewNotification = false;
            let shouldRefreshTrips = false;

            if (newNotis.length > 0) {
                window.driverNotificationCache = [...newNotis, ...window.driverNotificationCache];
                window.driverUnreadCount += newNotis.length;
                hasNewNotification = true;

                newNotis.forEach(n => {
                    if (!lastNotifiedIds.has(n.notificationId)) {
                        lastNotifiedIds.add(n.notificationId);

                        const toastEl = document.getElementById("systemErrorToast");
                        if (toastEl) {
                            const errorSpan = toastEl.querySelector(".toast-body span");
                            const errorIcon = toastEl.querySelector(".toast-body i");

                            if (errorSpan && errorIcon) {
                                errorSpan.innerText = n.title;

                                toastEl.classList.remove('bg-danger', 'bg-info', 'bg-dark');
                                if (n.type === 'BOOKING_CANCELLED') {
                                    errorIcon.className = "fa-solid fa-circle-xmark fs-3 text-white";
                                    toastEl.classList.add('bg-danger', 'text-white');
                                    shouldRefreshTrips = true;
                                } else if (n.type === 'DISPATCH_ASSIGNED') {
                                    errorIcon.className = "fa-solid fa-user-tie fs-3 text-white";
                                    toastEl.classList.add('bg-primary', 'text-white');
                                    shouldRefreshTrips = true;
                                } else {
                                    errorIcon.className = "fa-solid fa-bell fs-3 text-white";
                                    toastEl.classList.add('bg-info', 'text-white');
                                    shouldRefreshTrips = true;
                                }

                                if (typeof window.toastError !== 'undefined' && window.toastError) {
                                    window.toastError.show();
                                } else {
                                    const t = new bootstrap.Toast(toastEl, { delay: 5000 });
                                    t.show();
                                }
                            }
                        }
                    }
                });
            }

            if (shouldRefreshTrips) {
                if (typeof fetchPendingJobs === "function") fetchPendingJobs();
            }

            renderDriverNotifications();
        } else {
            console.error("Lỗi lấy thông báo:", result);
        }
    } catch (error) {
        console.error("Mất kết nối server khi load thông báo", error);
    }
}

function renderDriverNotifications() {
    const listEl = document.getElementById("notificationList");
    if (!listEl) return;

    const badge = document.getElementById("notiCount");
    if (badge) {
        if (window.driverUnreadCount > 0) {
            badge.innerText = window.driverUnreadCount > 99 ? '99+' : window.driverUnreadCount;
            badge.classList.remove('d-none');
        } else {
            badge.classList.add('d-none');
        }
    }

    if (window.driverNotificationCache.length === 0) {
        listEl.innerHTML = `
            <li>
                <div class="dropdown-item-custom text-center text-white-50 py-4">
                    Không có thông báo nào.
                </div>
            </li>
        `;
        return;
    }

    listEl.innerHTML = '';
    window.driverNotificationCache.forEach((n, index) => {
        const li = document.createElement("li");

        let timeStr = n.createdAt;
        try {
            const d = new Date(n.createdAt);
            timeStr = isNaN(d) ? n.createdAt : d.toLocaleString('vi-VN');
        } catch (e) { }

        const isUnread = index < window.driverUnreadCount;

        // Define colors based on type
        let typeBadgeClass = 'bg-success';
        let typeText = 'Thông báo';
        let typeIconColor = 'text-success';
        let iconClass = 'fa-check';

        if (n.type === 'BOOKING_CANCELLED') {
            typeBadgeClass = 'bg-danger';
            typeText = 'Khách Hủy';
            typeIconColor = 'text-danger';
            iconClass = 'fa-xmark';

            // Xử lý lại giao diện chuỗi thông báo từ Backend 
            // Vd backend: "Khách hàng đã hủy booking #81. Lý do: [Khách: Huy Nguyễn] đặt nhầm ngày."
            let msg = n.message || '';
            let bIdMatch = msg.match(/booking #(\d+)/i);
            let bId = bIdMatch ? bIdMatch[1] : '';

            let reason = '';
            let cName = 'Khách hàng';

            if (msg.includes('Lý do:')) {
                let rPart = msg.split('Lý do:')[1].trim();
                let cMatch = rPart.match(/\[Khách: (.*?)\]/);
                if (cMatch) {
                    cName = cMatch[1];
                    reason = rPart.replace(cMatch[0], '').trim();
                    if (reason.endsWith('.')) reason = reason.slice(0, -1);
                } else {
                    reason = rPart;
                    if (reason.endsWith('.')) reason = reason.slice(0, -1);
                }
            }

            if (bId) {
                n.title = 'Khách Hủy Chuyến!';
                n.message = `Khách: ${cName} | Chuyến: #${bId}` + (reason ? ` | Lý do hủy: ${reason}` : '');
            }

        } else if (n.type === 'NEW_BOOKING') {
            typeBadgeClass = 'bg-info';
            typeText = 'Chuyến Mới';
            typeIconColor = 'text-info';
            iconClass = 'fa-car';
        } else if (n.type === 'DRIVER_ACCEPTED') {
            typeBadgeClass = 'bg-success';
            typeText = 'Tài xế Nhận';
            typeIconColor = 'text-warning'; // as per screenshot yellow check
            iconClass = 'fa-check';
        } else if (n.type === 'DISPATCH_ASSIGNED') {
            typeBadgeClass = 'bg-primary';
            typeText = 'Dispatcher Gán';
            typeIconColor = 'text-primary';
            iconClass = 'fa-user-tie';
        }

        const readStatusHtml = isUnread
            ? `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25" style="font-size: 0.65rem;">Chưa đọc</span>`
            : `<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25" style="font-size: 0.65rem;">Đã đọc</span>`;

        // Use text-dark if unread (light background), else text-white if read (dark background)
        const textClass = 'text-white';
        const mutedClass = 'text-white-50';

        li.innerHTML = `
            <div class="notification-item ${isUnread ? 'unread' : ''}">
                <div class="notification-icon-wrapper ${typeIconColor}">
                    <i class="fa-solid ${iconClass}"></i>
                </div>
                <div class="notification-content" style="flex-grow: 1;">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="badge ${typeBadgeClass} bg-opacity-25 ${isUnread ? 'text-white' : 'text-white'} border border-opacity-25 rounded-pill px-2 py-1" style="font-size: 0.65rem; font-weight: 600;">${typeText}</span>
                        ${readStatusHtml}
                    </div>
                    <h6 class="fw-bold ${textClass} mt-2 mb-1">${n.title || 'Thông báo'}</h6>
                    <p class="${mutedClass} mb-2">${n.message || ''}</p>
                    <div class="d-flex align-items-center ${mutedClass}" style="font-size: 0.75rem;">
                        <i class="fa-regular fa-clock me-1"></i> ${timeStr}
                    </div>
                </div>
            </div>
        `;


        li.addEventListener('click', () => {
            if (window.driverUnreadCount > 0) {
                window.driverUnreadCount = 0;
                renderDriverNotifications();
            }
        });

        listEl.appendChild(li);
    });
}
// ============================================================================
// 14. LỊCH SỬ CHUYẾN ĐI VÀ ĐÁNH GIÁ KHÁCH HÀNG
// ============================================================================
async function fetchDriverHistory(statusFilter = '') {
    const historyListContainer = document.getElementById("driverHistoryList");
    if (!historyListContainer) return;

    historyListContainer.innerHTML = '<div class="w-100 text-center py-5"><div class="spinner-border text-primary"></div></div>';
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
        let trips = [];
        if (statusFilter === 'COMPLETED_AND_CANCELLED') {
            // Backend không hỗ trợ query IN () nên ta gọi 2 lần
            const [req1, req2] = await Promise.all([
                fetch(`${API_DISPATCH_BASE}/history?status=COMPLETED`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_DISPATCH_BASE}/history?status=CANCELLED`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            const res1 = await req1.json();
            const res2 = await req2.json();
            if (res1.success) trips = trips.concat(res1.data || []);
            if (res2.success) trips = trips.concat(res2.data || []);

            // Sắp xếp lại theo thời gian mới nhất (RespondedAt)
            trips.sort((a, b) => new Date(b.respondedAt || 0) - new Date(a.respondedAt || 0));
        } else {
            let url = `${API_DISPATCH_BASE}/history`;
            if (statusFilter) url += `?status=${statusFilter}`;
            const response = await fetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } });
            const result = await response.json();
            if (response.ok && result.success) {
                trips = result.data || [];
            }
        }

        if (trips.length === 0) {
            historyListContainer.innerHTML = '<div class="text-center py-5 text-white-50">Chưa có chuyến đi nào.</div>';
            return;
        }

        let html = '';
        trips.forEach(trip => {
            let badge;
            switch (trip.bookingStatus) {
                case 'COMPLETED':
                    badge = '<span class="badge bg-success">Hoàn thành</span>';
                    break;
                case 'ONGOING':
                    badge = '<span class="badge bg-primary">Đang di chuyển</span>';
                    break;
                case 'CONFIRMED':
                    badge = '<span class="badge bg-warning text-dark">Chờ khởi hành</span>';
                    break;
                case 'CANCELLED':
                    badge = '<span class="badge bg-danger">Đã hủy</span>';
                    break;
                default:
                    badge = `<span class="badge bg-secondary">${trip.bookingStatus || 'Không xác định'}</span>`;
            }
            const moneyStr = trip.estimatedTotal ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(trip.estimatedTotal) : '0 ₫';

            let typeBadge = trip.bookingType === 'HOURLY' ? '<span class="badge bg-secondary ms-2">Thuê theo giờ</span>' : '<span class="badge bg-info text-dark ms-2">Chuyến đường dài</span>';
            let directionText = '';
            if (trip.bookingType === 'DISTANCE') {
                directionText = trip.tripDirection === 'TWO_WAY' ? '<span class="badge bg-warning text-dark ms-1">Hai chiều</span>' : '<span class="badge bg-light text-dark ms-1">Một chiều</span>';
            }

            html += `
                    <div class="col-md-6 mb-3">
                        <div class="glass-panel p-3 border border-secondary rounded-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <div>
                                    <span class="fw-bold text-white fs-6">#BK-${trip.bookingId}</span>
                                    ${typeBadge}
                                    ${directionText}
                                </div>
                                ${badge}
                            </div>
                            <div class="text-white-50 small mb-2"><i class="fa-regular fa-clock me-1"></i> ${trip.departureTime || trip.acceptedAt || 'N/A'}</div>
                            <div class="text-white mb-2">
                                <i class="fa-solid fa-location-dot text-primary me-2"></i> ${trip.pickupAddress || 'N/A'}
                            </div>
                            <div class="text-white mb-3">
                                <i class="fa-solid fa-location-dot text-danger me-2"></i> ${trip.dropoffAddress || 'N/A'}
                            </div>
                            <div class="d-flex justify-content-between align-items-center border-top border-secondary pt-2 mb-2">
                                <span class="text-white-50 small">
                                    <i class="fa-solid fa-road me-1"></i> Quãng đường: <strong class="text-white">${trip.distanceKm ? trip.distanceKm + ' km' : 'N/A'}</strong>
                                </span>
                                <span class="fw-bold text-success">${moneyStr}</span>
                            </div>
                        </div>
                    </div>
                `;
        });
        historyListContainer.innerHTML = html;
    } catch (e) {
        historyListContainer.innerHTML = '<div class="text-center py-4 text-danger">Lỗi kết nối.</div>';
    }
}

let currentRatingBookingId = null;
let currentRatingValue = 0;

window.showDriverRatingModal = function (bookingId) {
    currentRatingBookingId = bookingId;
    currentRatingValue = 0;
    document.getElementById("driverRatingComment").value = '';
    document.querySelectorAll('#driverRatingModal .rating-star').forEach(s => s.classList.replace('fa-solid', 'fa-regular'));

    const ratingModal = new bootstrap.Modal(document.getElementById("driverRatingModal"));
    ratingModal.show();
}

window.rateCustomer = function (star) {
    currentRatingValue = star;
    document.querySelectorAll('#driverRatingModal .rating-star').forEach((s, idx) => {
        if (5 - idx <= star) {
            s.classList.replace('fa-regular', 'fa-solid');
            s.classList.add('text-warning');
        } else {
            s.classList.replace('fa-solid', 'fa-regular');
            s.classList.remove('text-warning');
        }
    });
}

window.skipDriverRating = function () {
    const modal = bootstrap.Modal.getInstance(document.getElementById("driverRatingModal"));
    if (modal) modal.hide();

    const cashMsg = document.getElementById("cashCollectMessage");
    if (cashMsg) cashMsg.style.display = window.currentTripIsCash ? "block" : "none";

    const completeModal = new bootstrap.Modal(document.getElementById("completeTripModal"));
    completeModal.show();
}

window.submitDriverRating = async function () {
    const selectedStar = document.querySelector('input[name="driverRateStars"]:checked');
    const starValue = selectedStar ? parseInt(selectedStar.value) : 0;

    if (!currentRatingBookingId || starValue === 0) {
        showModalAlert("Vui lòng chọn số sao!", "Cảnh báo", "warning");
        return;
    }

    const token = localStorage.getItem("accessToken");
    const comment = document.getElementById("driverRatingComment").value;

    document.getElementById("btnSubmitDriverRating").disabled = true;
    document.getElementById("btnSubmitDriverRating").innerHTML = 'Đang gửi...';

    try {
        const res = await fetch('http://localhost:8080/FleetFlow/api/v1/ratings/driver', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId: currentRatingBookingId, customerRating: starValue, comment: comment })
        });

        const data = await res.json();
        const modal = bootstrap.Modal.getInstance(document.getElementById("driverRatingModal"));
        if (modal) modal.hide();

        if (!res.ok || !data.success) {
            showModalAlert(data.message || "Không thể gửi đánh giá.", "Thất bại", "error");
            // Vẫn cho phép hiện Modal thanh toán nếu có lỗi đánh giá?
            // Hoặc có thể return luôn tùy logic, nhưng vì cuốc xe đã complete trên server, nên cứ show completeTripModal
        }

        const cashMsg = document.getElementById("cashCollectMessage");
        if (cashMsg) cashMsg.style.display = window.currentTripIsCash ? "block" : "none";

        const completeModal = new bootstrap.Modal(document.getElementById("completeTripModal"));
        completeModal.show();
    } catch (e) {
        showModalAlert("Lỗi kết nối!", "Lỗi mạng", "error");
    } finally {
        document.getElementById("btnSubmitDriverRating").disabled = false;
        document.getElementById("btnSubmitDriverRating").innerHTML = 'Gửi đánh giá';
    }
}

// ============================================================================
// 10. TÍCH HỢP API: LỊCH SỬ ĐÁNH GIÁ TÀI XẾ (DRIVER RATINGS)
// ============================================================================
window.loadDriverRatings = async function () {
    const listContainer = document.getElementById('driverRatingsContainer');
    const accRating = document.getElementById('accDriverRating');
    if (!listContainer) return;

    const token = localStorage.getItem("accessToken");
    if (!token) {
        listContainer.innerHTML = `<div class="alert alert-warning">Vui lòng đăng nhập để xem đánh giá.</div>`;
        return;
    }

    try {
        const response = await fetch(`http://localhost:8080/FleetFlow/api/v1/driver/ratings`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Update Summary (Badge)
            const avg = result.averageRating != null ? parseFloat(result.averageRating).toFixed(1) : "0.0";
            const count = result.ratingCount || 0;
            if (accRating) {
                accRating.innerHTML = `<i class="fa-solid fa-star me-1"></i> ${avg} (${count} đánh giá)`;
            }

            // Render List
            const ratings = result.data || [];
            if (ratings.length === 0) {
                listContainer.innerHTML = `
                    <div class="text-center py-4 rounded-3 border border-secondary bg-white bg-opacity-10">
                        <i class="fa-regular fa-comment-dots fs-1 text-white-50 mb-3"></i>
                        <h6 class="text-white-50">Chưa có đánh giá nào từ khách hàng</h6>
                    </div>`;
                return;
            }

            let htmlContent = '';
            ratings.forEach(rating => {
                const dateString = rating.createdAt ? String(rating.createdAt).replace(' ', 'T') : new Date().toISOString();
                const dateObj = new Date(dateString);
                const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
                
                const comment = rating.comment ? rating.comment : "<i class='text-white-50'>Không có nhận xét</i>";

                htmlContent += `
                    <div class="p-3 mb-3 bg-white bg-opacity-10 rounded-3 border border-secondary text-white">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div>
                                <span class="badge bg-light text-dark border me-2">Chuyến #${rating.bookingId}</span>
                                <small class="text-white-50"><i class="fa-regular fa-clock me-1"></i> ${formattedDate}</small>
                            </div>
                            <div class="text-warning">
                                ${generateStars(rating.driverRating)}
                            </div>
                        </div>
                        <p class="mb-0 text-white" style="font-size: 0.95rem;">${comment}</p>
                    </div>
                `;
            });

            listContainer.innerHTML = htmlContent;
        } else {
            listContainer.innerHTML = `<div class="text-danger p-3 border border-danger rounded bg-white bg-opacity-10">Lỗi tải dữ liệu: ${result.message || 'Không xác định'}</div>`;
        }
    } catch (error) {
        console.error("Lỗi tải API Đánh giá:", error);
        listContainer.innerHTML = `<div class="text-danger p-3 border border-danger rounded bg-white bg-opacity-10"><i class="fa-solid fa-triangle-exclamation me-2"></i>Không thể kết nối đến máy chủ.</div>`;
    }
};

function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fa-solid fa-star"></i>';
        } else {
            stars += '<i class="fa-regular fa-star text-secondary"></i>';
        }
    }
    return stars;
}


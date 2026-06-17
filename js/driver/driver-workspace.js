/**
 * ============================================================================
 * FLEETFLOW - DRIVER WORKSPACE MAIN SCRIPT
 * File xử lý toàn bộ nghiệp vụ trên bảng điều khiển của Đối tác Tài xế.
 * Bao gồm: Xác thực phiên, Gọi API Dashboard/Profile, Vẽ Biểu đồ và Xử lý UI.
 * ============================================================================
 */

// 1. KHAI BÁO CÁC BIẾN TOÀN CỤC & CẤU HÌNH API
const API_BASE = 'http://localhost:8080/FleetFlow/api/v1/driver';
let incomeChartInstance = null; // Biến lưu trữ biểu đồ để tránh lỗi vẽ đè (Canvas duplication)
let isChartInitialized = false;

// ============================================================================
// 2. KHỞI TẠO KHI TRANG TẢI XONG (LIFECYCLE HOOK)
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
    if (!initDriverSession()) return; 

    fetchDriverProfile();

    // KIỂM TRA TRẠNG THÁI eKYC
    const isEkycComplete = localStorage.getItem('isEkycComplete') === 'true';
    if (!isEkycComplete) {
        const ekycToast = document.getElementById('ekycWarningToast');
        if (ekycToast) {
            ekycToast.style.display = 'block';
            ekycToast.classList.add('show');
            ekycToast.style.opacity = '1';
        }
    }

    // KIỂM TRA TRẠNG THÁI ĐIỀU KHOẢN TỪ BỘ NHỚ
    const isTermsAccepted = localStorage.getItem('termsAccepted'); // Đổi thành termsAccepted
    if (isTermsAccepted === 'false') {
        const termsToast = document.getElementById('termsWarningToast');
        if (termsToast) {
            termsToast.style.display = 'block';
            termsToast.classList.add('show');
            termsToast.style.opacity = '1';
            
            // Kích hoạt Bootstrap
            try {
                const bsToast = new bootstrap.Toast(termsToast, { autohide: false });
                bsToast.show();
            } catch (e) {}
        }
    }

    window.toastError = new bootstrap.Toast(document.getElementById("systemErrorToast"), { delay: 3000 });
    window.toastConflict = new bootstrap.Toast(document.getElementById("conflictToast"), { delay: 3000 });
});

// ============================================================================
// 3. QUẢN LÝ PHIÊN ĐĂNG NHẬP (SESSION MANAGEMENT)
// ============================================================================
/**
 * Hàm kiểm tra bộ nhớ trình duyệt và cập nhật thông tin lên thanh Header
 */
function initDriverSession() {
    const accountId = localStorage.getItem('accountId');
    const fullName = localStorage.getItem('fullName') || 'Tài xế';
    const userRole = localStorage.getItem('userRole') || 'Đối tác Tài xế';

    // Rào chắn bảo mật: Không có Account ID tức là chưa đăng nhập chuẩn
    if (!accountId) {
        alert("Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại!");
        localStorage.clear();
        window.location.href = '../../index.html';
        return false;
    }

    // Cập nhật thông tin lên thanh Navbar phía trên cùng của Driver
    const headerName = document.querySelector('.user-info-block .profile-name');
    const headerRole = document.querySelector('.user-info-block .profile-role');
    const headerAvatar = document.querySelector('.user-info-block img');

    if (headerName) headerName.innerText = fullName;
    
    // Nếu role tiếng Anh là DRIVER thì việt hóa lại cho đẹp
    if (headerRole) headerRole.innerText = (userRole.toUpperCase() === 'DRIVER' || userRole.toUpperCase() === 'TÀI XẾ') ? 'Đối tác Tài xế' : userRole;
    
    // Tạo avatar tự động từ Tên
    if (headerAvatar) headerAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1a1c1a&color=fff`;

    return true; // Phiên hợp lệ
}

// ============================================================================
// 4. KẾT NỐI API BACKEND (DATA FETCHING)
// ============================================================================

/**
 * Gọi API GET /profile để lấy thông tin chi tiết của tài xế và lưu LocalStorage
 */
async function fetchDriverProfile() {
    const accountId = localStorage.getItem('accountId') || localStorage.getItem('accountID');
    
    if (!accountId || accountId === 'undefined') {
        window.location.replace('../../index.html');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/profile?accountID=${accountId}`);
        const result = await response.json();

        if (result.success && result.data) {
            const data = result.data;
            
            // 1. LƯU TOÀN BỘ TRƯỜNG DỮ LIỆU VÀO LOCAL STORAGE
            localStorage.setItem('driverId', data.id || data.driverID || data.driverId || '');
            localStorage.setItem('accountId', data.accountId || data.accountID || accountId);
            localStorage.setItem('approvalStatus', String(data.approvalStatus || 'PENDING').toUpperCase());
            localStorage.setItem('availabilityStatus', data.availabilityStatus || '');
            localStorage.setItem('termsAcceptedAt', data.termsAcceptedAt || '');
            localStorage.setItem('averageRating', data.averageRating || '0');
            localStorage.setItem('walletBalance', data.walletBalance || '0');
            localStorage.setItem('createdAt', data.createdAt || '');
            
            // Xử lý parse Boolean chính xác cho TermsAccepted
            let rawTerms = data.termsAccepted ?? data.TermsAccepted ?? false;
            let isTermsAccepted = (rawTerms === true || String(rawTerms).toLowerCase() === 'true' || rawTerms === 1 || rawTerms === '1');
            localStorage.setItem('termsAccepted', isTermsAccepted ? 'true' : 'false');

            // 2. CHỐT CHẶN (ROUTE GUARD): KICK RA KHỎI WORKSPACE NẾU CHƯA ĐỦ ĐIỀU KIỆN
            const storedTerms = localStorage.getItem('termsAccepted');
            const storedApproval = localStorage.getItem('approvalStatus');

            if (storedTerms !== 'true' || storedApproval !== 'APPROVED') {
                alert("Tài khoản chưa đủ điều kiện nhận chuyến!\nVui lòng vào trang Profile để hoàn tất eKYC và đồng ý Điều khoản.");
                window.location.replace('../../pages/profile.html'); 
                return;
            }

            // 3. RENDER UI CHO TÀI XẾ HỢP LỆ
            const accName = document.getElementById('accDriverName');
            const accAvatar = document.getElementById('accDriverAvatar');
            const accRating = document.getElementById('accDriverRating');
            const accVehicle = document.getElementById('accDriverVehicle');

            if(accName) accName.innerText = data.fullName || localStorage.getItem('fullName');
            if(accAvatar) accAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullName || 'Driver')}&background=1a1c1a&color=fff`;
            if(accRating) accRating.innerHTML = `<i class="fa-solid fa-star me-1"></i> ${localStorage.getItem('averageRating')} đánh giá`;
            if(accVehicle) accVehicle.innerHTML = `<i class="fa-solid fa-car me-1"></i> Sẵn sàng`;
            
        } else {
            localStorage.setItem('termsAccepted', 'false');
            localStorage.setItem('approvalStatus', 'PENDING');
            alert("Tài khoản chưa sẵn sàng! Vui lòng hoàn tất Hồ sơ cá nhân.");
            window.location.replace('../../pages/profile.html');
        }
    } catch (error) {
        console.error("Lỗi đồng bộ Profile:", error);
        window.location.replace('../../pages/profile.html');
    }
}

// ============================================================================
// ĐỒNG BỘ & SỬA LỖI LOGIC PHÂN HỆ TÀI CHÍNH (API 2, API 8, API 9)
// ============================================================================

/**
 * [API 2] Lấy các chỉ số KPI tổng quan hiển thị trên Dashboard 
 */
async function fetchDriverDashboardMetrics() {
    const accountId = localStorage.getItem('accountId') || localStorage.getItem('accountID');
    if (!accountId) return;

    try {
        const response = await fetch(`${API_BASE}/dashboard?accountID=${accountId}`);
        const result = await response.json();

        if (result.success && result.data) {
            const data = result.data;

            // Đố chuẩn key từ DriverDAO: totalEarnings, completedTrips, cancellationCompensation
            const dashNetIncomeEl = document.getElementById('dashNetIncome');
            const dashTotalTripsEl = document.getElementById('dashTotalTrips');
            const dashBonusEl = document.getElementById('dashBonus');

            if (dashNetIncomeEl) dashNetIncomeEl.innerText = (data.totalEarnings || 0).toLocaleString("vi-VN");
            if (dashTotalTripsEl) dashTotalTripsEl.innerText = data.completedTrips || 0;
            if (dashBonusEl) dashBonusEl.innerText = (data.cancellationCompensation || 0).toLocaleString("vi-VN");
            
            // Đồng bộ trạng thái kiểm duyệt nếu cần
            if (data.approvalStatus) localStorage.setItem('approvalStatus', String(data.approvalStatus).toUpperCase());
            if (data.availabilityStatus) localStorage.setItem('availabilityStatus', data.availabilityStatus);
        }
    } catch (error) {
        console.error("Lỗi lấy chỉ số KPI Dashboard (API 2):", error);
    }
}

/**
 * [API 8] Lấy số dư ví hiện tại và mảng lịch sử giao dịch tăng/giảm tiền chi tiết
 */
/**
 * [API 8] Lấy số dư ví hiện tại và mảng lịch sử giao dịch chi tiết
 */
async function fetchDriverWalletData() {
    const accountId = localStorage.getItem('accountId') || localStorage.getItem('accountID');
    if (!accountId) return;

    try {
        const response = await fetch(`${API_BASE}/wallet?accountID=${accountId}`);
        const result = await response.json();

        if (result.success && result.data) {
            const data = result.data;
            
            // Cập nhật Wallet Balance (Số dư ví) vào LocalStorage
            // Dùng để logic chặn nhận chuyến nếu ví < 50k hoạt động chính xác
            if (data.walletBalance !== undefined) {
                localStorage.setItem('walletBalance', data.walletBalance);
            }

            // Đổ mảng lịch sử giao dịch vào bảng (Table)
            renderTransactionTableFromBackend(data.transactions || []);
        }
    } catch (error) {
        console.error("Lỗi lấy dữ liệu ví và lịch sử công nợ (API 8):", error);
    }
}

/**
 * [API 9] Lấy thống kê thu nhập và mảng doanh thu nhóm theo từng tháng/năm đổ vào biểu đồ
 */
async function fetchDriverIncomeSummary() {
    const accountId = localStorage.getItem('accountId') || localStorage.getItem('accountID');
    if (!accountId) return;

    try {
        const response = await fetch(`${API_BASE}/income-summary?accountID=${accountId}`);
        const result = await response.json();

        if (result.success && result.data) {
            const data = result.data;

            // Truyền mảng dữ liệu tháng vào hàm render Chart
            if (data.monthlyBreakdown && data.monthlyBreakdown.length > 0) {
                renderIncomeChartFromBackend(data.monthlyBreakdown);
            }
        }
    } catch (error) {
        console.error("Lỗi lấy thống kê thu nhập dựng biểu đồ (API 9):", error);
    }
}

/**
 * Render bảng lịch sử giao dịch từ cấu trúc DriverEarning
 * @param {Array} transactions Mảng chứa các object trả về từ API 8
 */
function renderTransactionTableFromBackend(transactions) {
    // ID 'transactionTableBody' đã được chúng ta thêm vào file HTML ở bước trước
    const tbody = document.getElementById('transactionTableBody');
    if (!tbody) return;

    if (transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-white-50 py-4">Chưa có lịch sử biến động số dư nào.</td></tr>`;
        return;
    }

    let html = '';
    transactions.forEach(trx => {
        // 1. Phân loại giao dịch dựa vào EarningType
        const isCancellation = (trx.earningType === 'CancellationCompensation');
        const badgeColor = isCancellation ? 'warning' : 'info';
        const typeText = isCancellation ? 'Đền bù hủy chuyến' : 'Cước chuyến đi';
        const icon = isCancellation ? 'fa-hand-holding-dollar' : 'fa-car-side';
        
        // 2. Format thời gian (Giả định BE trả về chuẩn ISO String)
        const formattedTime = trx.createdAt ? new Date(trx.createdAt).toLocaleString("vi-VN", { hour12: false }) : '...';
        
        // 3. Tính toán cột Tiền Gross (Tổng thu của cuốc xe trước khi trừ phí)
        const grossAmount = (trx.fareShare || 0) + (trx.surchargeShare || 0) + (trx.cancellationCompensation || 0);

        // 4. Dựng HTML
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
 * Biến đổi dữ liệu Backend thành cấu trúc hiển thị của Chart.js
 * @param {Array} monthlyData Mảng từ API: { month, year, monthlyNetIncome, totalTransactions }
 */
function renderIncomeChartFromBackend(monthlyData) {
    const chartEl = document.getElementById("incomeChart");
    if (!chartEl) return;
    const ctx = chartEl.getContext("2d");

    // Clear biểu đồ cũ nếu đã tồn tại để tránh lỗi Hover "bóng ma" của Chart.js
    if (incomeChartInstance) {
        incomeChartInstance.destroy();
    }

    // LƯU Ý NGHIỆP VỤ: Đảo ngược mảng để vẽ biểu đồ theo trình tự thời gian (Cũ -> Mới)
    const sortedData = [...monthlyData].reverse();

    // Dùng hàm map() để bóc tách các trường dữ liệu thành 3 mảng độc lập
    const labels = sortedData.map(item => `Tháng ${item.month}/${item.year}`); // Trục X
    const netIncomes = sortedData.map(item => item.monthlyNetIncome || 0); // Trục Y
    const transactionsCount = sortedData.map(item => item.totalTransactions || 0); // Tooltip phụ

    // Tạo dải màu gradient từ Xanh lam đậm đến Xanh lam nhạt cho cột
    let gradientBlue = ctx.createLinearGradient(0, 0, 0, 400);
    gradientBlue.addColorStop(0, "rgba(56, 189, 248, 0.8)");
    gradientBlue.addColorStop(1, "rgba(56, 189, 248, 0.2)");

    // Khởi tạo Chart
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
                        // Tích hợp UX: Hiển thị thêm số cuốc xe khi tài xế hover chuột vào cột
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
// 6. XỬ LÝ SỰ KIỆN TƯƠNG TÁC (USER INTERACTIONS)
// ============================================================================

/**
 * Hàm điều hướng giữa các Tab (Trang chủ, Thu nhập, Tài khoản)
 * @param {string} tabId ID của thẻ Section cần mở
 * @param {HTMLElement} element Thẻ HTML (Link/Button) vừa được bấm vào
 */
window.switchTab = function(tabId, element) {
    
    // 1. Xóa class 'active' của tất cả các menu trên Desktop và Mobile
    document.querySelectorAll("#driver-nav .toc-link, .bottom-nav-glass .nav-item")
            .forEach(a => a.classList.remove("active"));
    
    // 2. Bôi sáng (active) menu vừa bấm vào
    if(element.classList.contains('toc-link')) {
        // Nếu click trên Desktop -> Đồng bộ bôi sáng xuống Mobile
        element.classList.add("active");
        document.querySelectorAll(`.bottom-nav-glass .nav-item`).forEach(a => { if(a.getAttribute("onclick").includes(tabId)) a.classList.add("active"); });
    } else {
        // Nếu click trên Mobile -> Đồng bộ bôi sáng lên Desktop
        element.classList.add("active");
        document.querySelectorAll(`#driver-nav .toc-link`).forEach(a => { if(a.getAttribute("onclick").includes(tabId)) a.classList.add("active"); });
    }

    // 3. Ẩn tất cả section và hiện section mục tiêu
    document.querySelectorAll(".dashboard-section").forEach(sec => sec.classList.remove("active"));
    document.getElementById(tabId).classList.add("active");

    // 4. Kỹ thuật Lazy-Load chuẩn hóa theo API Backend mới
    if (tabId === "tab-job-board") {
        fetchDriverDashboardMetrics(); // Gọi API 2 nạp nhanh 3 số chỉ báo KPI ở màn chính
    } else if (tabId === "tab-income") {
        fetchDriverDashboardMetrics(); // Nạp KPI
        fetchDriverWalletData();       // [API 8] Đổ dữ liệu lịch sử bảng công nợ
        fetchDriverIncomeSummary();    // [API 9] Vẽ biểu đồ động theo tháng/năm
    } else if (tabId === "tab-account") {
        fetchDriverProfile();          // [API 1] Gọi lại hồ sơ cá nhân mới nhất
    }
};

/**
 * Hàm giả lập thao tác nhấn nút "Nhận chuyến" của thẻ Open Job
 * @param {HTMLElement} btnElement Nút bấm vừa tương tác
 * @param {string} cardId ID của khối HTML chứa chuyến xe
 * @param {string} scenario Kịch bản test (success, error409: có người nhận mất, error500: lỗi server)
 */
window.acceptJob = function(btnElement, cardId, scenario) {
    const originalText = btnElement.innerHTML;
    
    // Chặn người dùng spam click (Trạng thái Loading)
    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang tải...';

    // Giả lập độ trễ mạng 1.2s trước khi phản hồi
    setTimeout(() => {
        if (scenario === "error409") {
            // Trường hợp: Tài xế khác nhận mất
            removeCardSmoothly(document.getElementById(cardId));
            if (window.toastConflict) window.toastConflict.show();
        } else if (scenario === "error500") {
            // Trường hợp: Lỗi Server (Trả lại nút để bấm lại)
            btnElement.disabled = false;
            btnElement.innerHTML = originalText;
            if (window.toastError) window.toastError.show();
        } else if (scenario === "success") {
            // Trường hợp: Nhận thành công -> Ẩn thẻ xe và bật Modal chúc mừng
            removeCardSmoothly(document.getElementById(cardId));
            const sm = new bootstrap.Modal(document.getElementById("successModal"));
            sm.show();
        }
    }, 1200);
}

/**
 * Hiệu ứng xóa một thẻ (Card) mềm mại khỏi DOM (Mờ dần + Thu nhỏ)
 */
window.removeCardSmoothly = function(card) {
    if (card) {
        card.style.transition = "transform 0.4s ease, opacity 0.4s ease";
        card.style.transform = "scale(0.9)";
        card.style.opacity = "0";
        
        // Chờ animation chạy xong mới xóa hẳn element bằng JS
        setTimeout(() => {
            card.remove();
            
            // Cập nhật lại số lượng xe đang hiển thị trên dấu chấm đỏ Notification
            const count = document.querySelectorAll(".broadcast-card-item").length;
            const badge = document.getElementById("jobBadge");
            if (badge) badge.innerText = count;
            
            // Nếu không còn đơn nào -> Hiện thông báo "Chưa có cuốc xe"
            if (count === 0) {
                if (badge) badge.style.display = "none";
                const emptyState = document.getElementById("emptyState");
                if(emptyState) emptyState.style.display = "block";
            }
        }, 400);
    }
}
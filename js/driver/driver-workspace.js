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
    const isTermsAccepted = localStorage.getItem('isTermsAccepted');
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
 * Gọi API GET /profile để lấy thông tin chi tiết của tài xế
 */
async function fetchDriverProfile() {
    const accountId = localStorage.getItem('accountId');
    
    // Chặn ngay lập tức nếu mất AccountID khỏi bộ nhớ
    if (!accountId || accountId === 'undefined') {
        window.location.replace('../../index.html');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/profile?accountID=${accountId}`);
        const result = await response.json();

        // 🚨 NẾU API THÀNH CÔNG VÀ TRẢ VỀ DỮ LIỆU
        if (result.success && result.data) {
            const data = result.data;
            const getVal = (key) => {
                const lowerKey = key.toLowerCase();
                for (let k in data) { if (k.toLowerCase() === lowerKey && data[k] !== null) return data[k]; }
                return null;
            };
            
            // 🚀 BẮT TRỰC TIẾP GIÁ TRỊ BOOLEAN TỪ BACKEND MỚI
            const isTermsAccepted = data.termsAccepted === true;
            const approvalStatus = String(getVal('approvalStatus') || 'PENDING').toUpperCase();

            // 🚨 BỨC TƯỜNG LỬA CHỐT CHẶN (ROUTE GUARD) 🚨
            if (!isTermsAccepted || approvalStatus !== 'APPROVED') {
                alert("Tài khoản chưa đủ điều kiện nhận chuyến!\nVui lòng vào trang Profile để hoàn tất Hồ sơ và xác nhận Điều khoản.");
                window.location.replace('../../pages/profile.html'); 
                return;
            }

            // NẾU PASS CẢ 2 ĐIỀU KIỆN -> HIỂN THỊ DỮ LIỆU BÌNH THƯỜNG VÀO WORKSPACE
            const accName = document.getElementById('accDriverName');
            const accAvatar = document.getElementById('accDriverAvatar');
            const accRating = document.getElementById('accDriverRating');
            const accVehicle = document.getElementById('accDriverVehicle');

            if(accName) accName.innerText = getVal('fullName') || localStorage.getItem('fullName');
            if(accAvatar) accAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getVal('fullName') || 'Driver')}&background=1a1c1a&color=fff`;
            if(accRating) accRating.innerHTML = `<i class="fa-solid fa-star me-1"></i> ${getVal('averageRating') || '5.0'} (${getVal('reviewCount') || 0} đánh giá)`;
            if(accVehicle) accVehicle.innerHTML = `<i class="fa-solid fa-car me-1"></i> ${getVal('vehicleName') || 'Đang cập nhật'} (${getVal('plateNumber') || '...'})`;
        } else {
            // 🚨 NẾU API THẤT BẠI (VD: TÀI XẾ PENDING BỊ ẨN), MẶC ĐỊNH ĐÁ VĂNG
            alert("Tài khoản chưa sẵn sàng hoặc đang chờ duyệt!\nVui lòng kiểm tra lại Hồ sơ cá nhân.");
            window.location.replace('../../pages/profile.html');
        }
    } catch (error) {
        console.error("Lỗi lấy Profile Tài xế:", error);
        window.location.replace('../../pages/profile.html');
    }
}

/**
 * Gọi API GET /dashboard để lấy báo cáo doanh thu, chuyến đi và lịch sử giao dịch
 */
async function fetchDriverDashboard() {
    const accountId = localStorage.getItem('accountId');
    if (!accountId) return;

    try {
        const response = await fetch(`${API_BASE}/dashboard?accountID=${accountId}`);
        const result = await response.json();

        if (result.success && result.data) {
            const data = result.data;

            // 1. Cập nhật 3 chỉ số KPI chính (Thu nhập, Số chuyến, Tiền thưởng)
            document.getElementById('dashNetIncome').innerText = (data.netIncome || 0).toLocaleString("vi-VN");
            document.getElementById('dashTotalTrips').innerText = data.totalTrips || 0;
            document.getElementById('dashBonus').innerText = (data.bonus || 0).toLocaleString("vi-VN");

            // 2. Vẽ bảng chi tiết lịch sử giao dịch
            renderTransactionTable(data.transactions || []);

            // 3. Vẽ biểu đồ Chart.js (Dữ liệu tuần)
            if (data.chartData) {
                renderIncomeChart(data.chartData);
            }
        } else {
            console.warn("Lỗi API Dashboard:", result.message);
        }
    } catch (error) {
        console.error("Lỗi lấy dữ liệu Dashboard:", error);
        if (window.toastError) window.toastError.show();
    }
}

// ============================================================================
// 5. RENDER GIAO DIỆN (UI RENDERERS)
// ============================================================================

/**
 * Vẽ biểu đồ cột thu nhập bằng Chart.js
 * @param {Object} chartData Đối tượng chứa labels, income (cước) và bonus (thưởng)
 */
function renderIncomeChart(chartData) {
    const chartEl = document.getElementById("incomeChart");
    if (!chartEl) return;
    const ctx = chartEl.getContext("2d");
    
    // RẤT QUAN TRỌNG: Phải hủy (destroy) biểu đồ cũ trước khi vẽ cái mới 
    // Nếu không Chart.js sẽ bị lỗi giật lag (hover bị nhấp nháy do 2 canvas đè nhau)
    if (incomeChartInstance) {
        incomeChartInstance.destroy();
    }

    // Tạo màu gradient (chuyển sắc) cho cột xanh dương (Cước)
    let gradientBlue = ctx.createLinearGradient(0, 0, 0, 400);
    gradientBlue.addColorStop(0, "rgba(56, 189, 248, 0.8)");
    gradientBlue.addColorStop(1, "rgba(56, 189, 248, 0.2)");
    
    // Tạo màu gradient cho cột màu cam (Thưởng)
    let gradientOrange = ctx.createLinearGradient(0, 0, 0, 400);
    gradientOrange.addColorStop(0, "rgba(251, 191, 36, 0.8)");
    gradientOrange.addColorStop(1, "rgba(251, 191, 36, 0.2)");

    // Cấu hình vẽ Chart
    incomeChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: chartData.labels || ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
            datasets: [
                {
                    label: "Cước chuyến đi",
                    data: chartData.income || [0,0,0,0,0,0,0],
                    backgroundColor: gradientBlue,
                    borderRadius: 8,
                    barThickness: 24,
                },
                {
                    label: "Thưởng / Phụ phí",
                    data: chartData.bonus || [0,0,0,0,0,0,0],
                    backgroundColor: gradientOrange,
                    borderRadius: 8,
                    barThickness: 24,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false }, // Hover 1 lúc lên cả 2 cột
            plugins: {
                legend: { position: "top", align: "end", labels: { color: "#ffffff", usePointStyle: true } },
                tooltip: { backgroundColor: "rgba(0,0,0,0.8)", cornerRadius: 8 },
            },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { color: "rgba(255,255,255,0.7)" } },
                y: { 
                    stacked: true, 
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

/**
 * Đổ dữ liệu các giao dịch thành các hàng (<tr>) trong bảng
 * @param {Array} transactions Mảng các giao dịch từ Backend
 */
function renderTransactionTable(transactions) {
    const tbody = document.getElementById('transactionTableBody');
    if(!tbody) return;

    if (transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-white-50 py-4">Chưa có giao dịch nào trong kỳ.</td></tr>`;
        return;
    }

    let html = '';
    transactions.forEach(trx => {
        // Tùy chỉnh màu sắc Badge (Thẻ trạng thái) dựa theo loại giao dịch
        const isPenalty = trx.type.includes('Phạt') || trx.type.includes('Hủy');
        const badgeColor = isPenalty ? 'warning' : 'info';
        const icon = isPenalty ? 'fa-hand-holding-dollar' : 'fa-car-side';
        
        html += `
            <tr>
                <td>
                    <div class="fw-bold text-white">${trx.id}</div>
                    <div class="text-white-50 small">${trx.time}</div>
                </td>
                <td><span class="badge bg-${badgeColor} bg-opacity-25 text-${badgeColor} border border-${badgeColor} p-2"><i class="fa-solid ${icon} me-1"></i> ${trx.type}</span></td>
                <td class="text-white fw-bold">${(trx.gross || 0).toLocaleString("vi-VN")} đ</td>
                <td class="text-danger fw-bold">${trx.discount ? '-' + trx.discount.toLocaleString("vi-VN") + ' đ' : '<span class="badge bg-secondary bg-opacity-50 text-white border border-secondary">Miễn phí</span>'}</td>
                <td class="text-success fw-bold fs-6">+ ${(trx.net || 0).toLocaleString("vi-VN")} đ</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
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

    // 4. Kỹ thuật Lazy-Load (Chỉ gọi API khi nào cần thiết)
    if (tabId === "tab-income") {
        fetchDriverDashboard(); // Gọi API khi bấm vào tab Lịch sử Thu nhập
    } else if (tabId === "tab-account") {
        fetchDriverProfile();   // Gọi lại API khi bấm vào Tài khoản để cập nhật dữ liệu mới nhất
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
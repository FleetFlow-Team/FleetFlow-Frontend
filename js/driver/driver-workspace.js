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
    const fullName = localStorage.getItem('fullName') || 'Tài xế chưa rõ tên';
    const userRole = localStorage.getItem('userRole') || 'Đối tác Tài xế';
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

    // 7. Gọi API quét tín hiệu đơn hàng ngay khi mở Web lên (Hàm bạn đã viết ở bước trước)
    if (typeof fetchPendingJobs === "function") {
        fetchPendingJobs();
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
window.switchTab = function(tabId, element) {
    // Xóa class 'active' của tất cả các menu
    document.querySelectorAll("#driver-nav .toc-link, .bottom-nav-glass .nav-item")
            .forEach(a => a.classList.remove("active"));
    
    // Bôi sáng menu được bấm
    if(element.classList.contains('toc-link')) {
        element.classList.add("active");
        updateDriverVerticalIndicator(element); 

        document.querySelectorAll(`.bottom-nav-glass .nav-item`).forEach(a => { 
            if(a.getAttribute("onclick").includes(tabId)) a.classList.add("active"); 
        });
    } else {
        element.classList.add("active");
        
        document.querySelectorAll(`#driver-nav .toc-link`).forEach(a => { 
            if(a.getAttribute("onclick").includes(tabId)) {
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
};

// ============================================================================
// 3. TƯƠNG TÁC NGƯỜI DÙNG (NÚT BẤM, NÚT GẠT, CARD)
// ============================================================================

/**
 * Xóa một thẻ (Card) cuốc xe mềm mại khỏi DOM
 */
window.removeCardSmoothly = function(card) {
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
                if(emptyState) emptyState.style.display = "block";
            }
        }, 400);
    }
}

/**
 * Xử lý giao diện và gọi API khi bấm "Nhận chuyến"
 * @param {HTMLElement} btnElement Nút bấm vừa tương tác
 * @param {number} broadcastId Mã lệnh điều động
 */
window.acceptJob = async function(btnElement, broadcastId) {
    // 1. Lưu lại giao diện nút ban đầu và Block UI (chống spam click)
    const originalText = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang tải...';

    // 2. Lấy Token từ LocalStorage
    const token = localStorage.getItem("accessToken");
    if (!token) {
        alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!");
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
            // [THÀNH CÔNG]
            const cardId = `job-card-${broadcastId}`;
            const cardEl = document.getElementById(cardId);
            
            // --- THỦ THUẬT: Sao chép thông tin thẻ đang chờ đẩy sang bộ nhớ cục bộ ---
            if (cardEl) {
                const bookingIdText = cardEl.querySelector('.fw-bold.fs-5').innerText.replace('#BK-', '');
                const timeText = cardEl.querySelector('.text-white-50.small').innerText.replace('Nhận lệnh: ', '');
                
                let tempJobs = JSON.parse(localStorage.getItem('tempAcceptedJobs') || '[]');
                tempJobs.push({
                    bookingId: bookingIdText,
                    pickupAddress: "Đang đợi API Lộ trình chi tiết...",
                    dropoffAddress: "Đang đợi API Lộ trình chi tiết...",
                    customerName: "Khách hàng FleetFlow",
                    customerPhone: "*** *** ****",
                    time: timeText,
                    status: "Vừa nhận"
                });
                localStorage.setItem('tempAcceptedJobs', JSON.stringify(tempJobs));
            }
            // ----------------------------------------------------------------------

            // Xóa thẻ xe này khỏi danh sách Chờ Nhận
            removeCardSmoothly(cardEl);
            
            // Hiển thị Modal chúc mừng nhận chuyến thành công
            const sm = new bootstrap.Modal(document.getElementById("successModal"));
            sm.show();

        } else {
            // [THẤT BẠI] - Trả lại nút bấm như cũ
            btnElement.disabled = false;
            btnElement.innerHTML = originalText;

            // Kiểm tra xem có phải lỗi do người khác nhận mất đơn (Conflict)
            if (result.error && result.error.includes("không tìm thấy lệnh dispatch hợp lệ")) {
                const cardId = `job-card-${broadcastId}`;
                removeCardSmoothly(document.getElementById(cardId)); // Xóa thẻ vì đơn không còn
                
                if (window.toastConflict) window.toastConflict.show();
            } else {
                // Lỗi hệ thống khác
                const errorSpan = document.querySelector("#systemErrorToast .toast-body span");
                if (errorSpan) errorSpan.innerText = result.error || "Thao tác thất bại!";
                if (window.toastError) window.toastError.show();
            }
        }

    } catch (error) {
        // Lỗi sập server hoặc rớt mạng
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
window.handleOnlineToggle = function(currentInput, walletBalance = 100000) {
    const toggleInputs = document.querySelectorAll(".navOnlineToggle");

    // Kiểm tra ví: Dưới 50k không cho phép Online
    if (walletBalance < 50000 && currentInput.checked) {
        toggleInputs.forEach(input => input.checked = false);
        const alertBanner = document.getElementById("walletAlertBanner");
        if(alertBanner) alertBanner.style.display = "block";
        return; 
    } else {
        const alertBanner = document.getElementById("walletAlertBanner");
        if(alertBanner) alertBanner.style.display = "none";
    }

    // Đồng bộ nút gạt
    toggleInputs.forEach(input => input.checked = currentInput.checked);

    // Cập nhật thẻ trạng thái UI
    const accVehicle = document.getElementById('accDriverVehicle');
    if(accVehicle) {
        if(currentInput.checked) {
            accVehicle.innerHTML = `<i class="fa-solid fa-car me-1"></i> Đang trực tuyến`;
            accVehicle.className = "badge bg-success bg-opacity-25 text-success border border-success p-2 px-3";
        } else {
            accVehicle.innerHTML = `<i class="fa-solid fa-moon me-1"></i> Tạm nghỉ`;
            accVehicle.className = "badge bg-secondary bg-opacity-25 text-secondary border border-secondary p-2 px-3";
        }
    }
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
    
    if(accName) accName.innerText = data.fullName;
    if(accAvatar) accAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullName)}&background=1a1c1a&color=fff`;
    if(accRating) accRating.innerHTML = `<i class="fa-solid fa-star me-1"></i> ${data.averageRating} đánh giá`;

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
            if (result.data && result.data.length > 0) {
                // Nếu có cuốc xe -> Render ra thẻ HTML
                renderPendingJobs(result.data);
                
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
 * Hàm biến đổi JSON Data thành cấu trúc HTML Card
 * @param {Array} jobs Mảng chứa các lệnh broadcast 
 */
function renderPendingJobs(jobs) {
    const jobListContainer = document.getElementById("jobList");
    
    // Khởi tạo HTML với trạng thái EmptyState bị ẩn (để tái sử dụng khi xóa hết card)
    let html = `
        <div class="empty-state w-100 text-center py-5" id="emptyState" style="display: none;">
            <i class="fa-solid fa-satellite-dish radar-icon text-white-50 fs-1 mb-3"></i>
            <p class="text-white-50">Hệ thống đang dò tìm chuyến đi quanh bạn...</p>
        </div>
    `;

    // Lặp qua từng chuyến xe
    jobs.forEach(job => {
        // Format thời gian từ chuỗi ISO
        const dateObj = new Date(job.dispatchedAt);
        const timeFormatted = dateObj.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
        const dateFormatted = dateObj.toLocaleDateString("vi-VN");

        html += `
            <div class="col-xl-6 broadcast-card-item" id="job-card-${job.broadcastId}">
                <div class="glass-panel h-100 d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start border-bottom border-secondary pb-3 mb-3">
                        <div>
                            <span class="fw-bold text-white fs-5 d-block">#BK-${job.bookingId}</span>
                            <span class="text-white-50 small">
                                <i class="fa-regular fa-clock me-1"></i> Nhận lệnh: ${timeFormatted} - ${dateFormatted}
                            </span>
                        </div>
                    </div>
                    
                    <div class="flex-grow-1 mb-4 text-white-50">
                        <div class="p-3 bg-white bg-opacity-10 border border-secondary rounded-3 d-flex gap-3 align-items-center">
                            <i class="fa-solid fa-location-crosshairs fs-1 text-primary"></i>
                            <p class="mb-0 small text-start">Lộ trình và thông tin liên hệ của khách hàng sẽ được mở khóa ngay sau khi bạn Nhận chuyến.</p>
                        </div>
                    </div>
                    
                    <div class="border-top border-secondary pt-3 mt-auto">
                        <div class="row g-2">
                            <div class="col-6">
                                <button class="btn-glass-action border-warning text-warning w-100 py-3 fs-6 fw-bold" 
                                        style="background: rgba(245, 158, 11, 0.1);" 
                                        onclick="rejectJob(this, ${job.broadcastId})">
                                    Từ chối
                                </button>
                            </div>
                            <div class="col-6">
                                <button class="btn-glass-action bg-primary border-primary text-white w-100 py-3 fs-6 fw-bold" 
                                        onclick="acceptJob(this, ${job.broadcastId})">
                                    Nhận Chuyến
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
// 6. XỬ LÝ CHUYỂN TAB VÀ HIỂN THỊ CHUYẾN ĐI "ĐÃ NHẬN"
// ============================================================================

window.switchJobTab = function(tabType) {
    const btnPending = document.getElementById('tab-btn-pending');
    const btnAccepted = document.getElementById('tab-btn-accepted');
    const listPending = document.getElementById('jobList');
    const listAccepted = document.getElementById('acceptedJobList');

    // Reset style
    [btnPending, btnAccepted].forEach(el => {
        el.classList.remove("active", "text-white", "border-bottom", "border-2", "border-white");
        el.classList.add("text-white-50");
    });

    if (tabType === 'PENDING') {
        btnPending.classList.add("active", "text-white", "border-bottom", "border-2", "border-white");
        btnPending.classList.remove("text-white-50");
        listPending.style.display = 'flex';
        listAccepted.style.display = 'none';
        
        fetchPendingJobs(); // Làm mới lại danh sách chờ

    } else if (tabType === 'ACCEPTED') {
        btnAccepted.classList.add("active", "text-white", "border-bottom", "border-2", "border-white");
        btnAccepted.classList.remove("text-white-50");
        listPending.style.display = 'none';
        listAccepted.style.display = 'flex';
        
        fetchAcceptedJobs(); // Gọi API lấy đơn đã nhận
    }
}

async function fetchAcceptedJobs() {
    const acceptedListContainer = document.getElementById("acceptedJobList");
    
    // Giao diện Loading
    acceptedListContainer.innerHTML = `
        <div class="w-100 text-center py-5 text-white">
            <div class="spinner-border text-success mb-3" role="status"></div>
            <p class="text-white-50 fw-bold">Đang tải lịch trình của bạn...</p>
        </div>
    `;

    setTimeout(() => {
        // Lấy các đơn vừa được bấm nhận trên giao diện
        const tempJobs = JSON.parse(localStorage.getItem('tempAcceptedJobs') || '[]');
        
        // Dữ liệu mẫu (Gắn ở cuối để test)
        let jobsToRender = [
            {
                bookingId: 8842,
                pickupAddress: "Chợ Bến Thành, Quận 1",
                dropoffAddress: "Sân bay Tân Sơn Nhất",
                customerName: "Nguyễn Văn A",
                customerPhone: "0901234567",
                time: "14:30 - Hôm nay",
                status: "Đang tiến hành"
            }
        ];

        // Trộn đơn vừa nhận lên đầu danh sách
        jobsToRender = [...tempJobs.reverse(), ...jobsToRender];

        if (jobsToRender.length > 0) {
            renderAcceptedJobs(jobsToRender);
        } else {
            acceptedListContainer.innerHTML = `
                <div class="empty-state w-100 text-center py-5">
                    <i class="fa-solid fa-car-on radar-icon text-white-50 fs-1 mb-3"></i>
                    <p class="text-white-50">Bạn chưa có chuyến xe nào đang thực hiện.</p>
                </div>
            `;
        }
    }, 800);
}

function renderAcceptedJobs(jobs) {
    const acceptedListContainer = document.getElementById("acceptedJobList");
    let html = '';

    jobs.forEach(job => {
        html += `
            <div class="col-xl-6 broadcast-card-item">
                <div class="glass-panel h-100 d-flex flex-column" style="border-left: 4px solid #10b981;">
                    <div class="d-flex justify-content-between align-items-start border-bottom border-secondary pb-3 mb-3">
                        <div>
                            <span class="fw-bold text-white fs-5 d-block">#BK-${job.bookingId}</span>
                            <span class="text-success small fw-bold"><i class="fa-solid fa-circle-play me-1"></i> ${job.status}</span>
                        </div>
                        <div class="text-end">
                            <span class="text-white-50 small d-block">Khởi hành</span>
                            <span class="fw-bold text-white">${job.time}</span>
                        </div>
                    </div>
                    
                    <div class="flex-grow-1 mb-4">
                        <div class="route-stepper text-white mb-4 position-relative border-start border-secondary ms-2 ps-3">
                            <div class="mb-3 position-relative"><i class="fa-solid fa-circle position-absolute top-50 translate-middle-y text-primary" style="left: -21px; font-size: 0.6rem;"></i> ${job.pickupAddress}</div>
                            <div class="position-relative"><i class="fa-solid fa-location-dot position-absolute top-50 translate-middle-y text-danger" style="left: -21px; font-size: 0.8rem;"></i> ${job.dropoffAddress}</div>
                        </div>
                        
                        <div class="p-3 bg-white bg-opacity-10 border border-secondary rounded-3 d-flex justify-content-between align-items-center">
                            <div>
                                <div class="text-white fw-bold"><i class="fa-solid fa-user-astronaut me-2"></i>${job.customerName}</div>
                                <div class="text-white-50 small mt-1"><i class="fa-solid fa-phone me-2"></i>${job.customerPhone}</div>
                            </div>
                            <button class="btn btn-success rounded-circle" style="width: 45px; height: 45px;"><i class="fa-solid fa-phone-volume"></i></button>
                        </div>
                    </div>
                    
                    <div class="border-top border-secondary pt-3 mt-auto">
                        <button class="btn-glass-action border-info text-info w-100 py-3 fs-6 fw-bold" style="background: rgba(13, 202, 240, 0.1);">
                            <i class="fa-solid fa-map-location-dot me-2"></i> Mở bản đồ dẫn đường
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    acceptedListContainer.innerHTML = html;
}
/**
 * Đóng Modal và tự động chuyển qua tab Đã Nhận
 */
window.goToAcceptedTab = function() {
    // 1. Ẩn Modal đi
    const modalEl = document.getElementById("successModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) {
        modalInstance.hide();
    }
    
    // 2. Chuyển sang tab Đã nhận
    switchJobTab('ACCEPTED');
}
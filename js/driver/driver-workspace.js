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
        // 8. TỰ ĐỘNG KHÔI PHỤC CHUYẾN ĐI DANG DỞ (CHỐNG F5)
 
    }
    // Lắng nghe sự kiện bật/tắt ô nhập "Lý do khác" của Modal Từ chối
    const rejectRadios = document.querySelectorAll('input[name="rejectReason"]');
    const otherReasonContainer = document.getElementById('otherReasonContainer');
    
    if(rejectRadios.length > 0) {
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
            
            // --- CẬP NHẬT MỚI: Chỉ lưu lại Booking ID thật để chuẩn bị gọi API Lộ trình ---
            if (cardEl) {
                const bookingIdText = cardEl.querySelector('.fw-bold.fs-5').innerText.replace('#BK-', '').trim();
                let acceptedIds = JSON.parse(localStorage.getItem('acceptedBookingIds') || '[]');
                if (!acceptedIds.includes(bookingIdText)) {
                    acceptedIds.push(bookingIdText);
                    localStorage.setItem('acceptedBookingIds', JSON.stringify(acceptedIds));
                }
            }
            // ----------------------------------------------------------------------------

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

/**
 * Hàm lấy danh sách lộ trình chi tiết của các cuốc xe đã nhận từ Backend
 */
async function fetchAcceptedJobs() {
    const acceptedListContainer = document.getElementById("acceptedJobList");
    
    // Giao diện Loading xoay tròn cao cấp
    acceptedListContainer.innerHTML = `
        <div class="w-100 text-center py-5 text-white">
            <div class="spinner-border text-success mb-3" role="status"></div>
            <p class="text-white-50 fw-bold">Đang kết nối trạm vệ tinh tải lộ trình chi tiết...</p>
        </div>
    `;

    const token = localStorage.getItem("accessToken");
    
    // Đọc danh sách các ID đơn hàng đã nhấn nhận hoặc đang chạy dở
    let acceptedIds = JSON.parse(localStorage.getItem('acceptedBookingIds') || '[]');
    const activeId = localStorage.getItem('activeBookingId');
    if (activeId && !acceptedIds.includes(activeId)) {
        acceptedIds.push(activeId);
    }

    // Cơ chế an toàn (Fallback): Nếu danh sách hoàn toàn trống, tự nạp 1 cuốc mẫu #8842 để bạn luôn test được giao diện UI
    if (acceptedIds.length === 0) {
        acceptedIds = [8842];
    }

    try {
        const jobsData = [];

        // Chạy vòng lặp kích hoạt gọi API chi tiết song song cho từng ID đơn hàng
        await Promise.all(acceptedIds.map(async (id) => {
            try {
                // Nếu trùng ID mẫu thử nghiệm thì nạp data mock để không bị lỗi rớt mạng
                if (id == 8842) {
                    jobsData.push({
                        bookingId: 8842,
                        pickupAddress: "Chợ Bến Thành, Quận 1",
                        dropoffAddress: "Sân bay Tân Sơn Nhất",
                        customerName: "Nguyễn Văn A",
                        customerPhone: "0901234567",
                        time: "14:30 - Hôm nay",
                        status: "CONFIRMED",
                        distanceKm: 12.5
                    });
                    return;
                }

                // Gọi API thật từ Server Java
                const response = await fetch(`http://localhost:8080/FleetFlow/api/v1/bookings/${id}`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                });

                if (response.ok) {
                    const result = await response.json();
                    
                    // Đổ và cấu trúc lại các trường dữ liệu trả về từ API Backend
                    jobsData.push({
                        bookingId: result.bookingId,
                        pickupAddress: result.detail?.pickupAddress || "Đang cập nhật địa chỉ đón",
                        dropoffAddress: result.detail?.dropoffAddress || "Đang cập nhật địa chỉ trả",
                        // Lấy thông tin khách hàng (Nếu BE chưa kịp trả tên/SĐT thì dùng thông tin dự phòng)
                        customerName: result.customerName || `Khách hàng FleetFlow (#${result.customerId})`,
                        customerPhone: result.customerPhone || "090 ••• ••••",
                        time: result.detail?.departureTime ? new Date(result.detail.departureTime).toLocaleString("vi-VN", {hour12: false}) : "Chưa rõ giờ đi",
                        status: result.status,
                        distanceKm: result.detail?.distanceKm || 0
                    });
                }
            } catch (err) {
                console.error(`[API Error] Lỗi khi tải chi tiết cuốc xe #${id}:`, err);
            }
        }));

        // Tiến hành render dữ liệu thật ra màn hình
        if (jobsData.length > 0) {
            renderAcceptedJobs(jobsData);
        } else {
            acceptedListContainer.innerHTML = `
                <div class="empty-state w-100 text-center py-5">
                    <i class="fa-solid fa-car-on radar-icon text-white-50 fs-1 mb-3"></i>
                    <p class="text-white-50">Bạn chưa có chuyến xe nào đang thực hiện.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error("Lỗi tổng luồng fetchAcceptedJobs:", error);
        acceptedListContainer.innerHTML = `<div class="text-center text-danger py-4 fw-bold">Mất tín hiệu kết nối API Lộ trình!</div>`;
    }
}

/**
 * Render giao diện thẻ xe "Đã Nhận" từ nguồn dữ liệu API thật
 */
function renderAcceptedJobs(jobs) {
    const acceptedListContainer = document.getElementById("acceptedJobList");
    let html = '';
    const activeBookingId = localStorage.getItem('activeBookingId');

    jobs.forEach(job => {
        // Kiểm tra xem cuốc xe này đang chạy thực tế hay không (Bằng DB status hoặc cờ cắm Local)
        const isActive = (String(job.bookingId) === activeBookingId || job.status === 'ONGOING');

        const cardBorder = isActive ? '4px solid #10b981' : '4px solid #0dcaf0';
        const cardShadow = isActive ? '0 0 15px rgba(16, 185, 129, 0.2)' : 'none';
        const statusTextClass = isActive ? 'text-success small fw-bold' : 'text-info small fw-bold';
        const statusHtml = isActive 
            ? '<i class="fa-solid fa-car-side fa-fade me-1"></i> ĐANG DI CHUYỂN' 
            : '<i class="fa-solid fa-clock me-1"></i> Đang chờ khách lên xe';
            
        const startBtnDisplay = isActive ? 'none' : 'block';
        const completeBtnDisplay = isActive ? 'block' : 'none';

        html += `
            <div class="col-xl-6 broadcast-card-item">
                <div class="glass-panel h-100 d-flex flex-column" id="trip-card-${job.bookingId}" style="border-left: ${cardBorder}; box-shadow: ${cardShadow}; transition: all 0.4s ease;">
                    <div class="d-flex justify-content-between align-items-start border-bottom border-secondary pb-3 mb-3">
                        <div>
                            <span class="fw-bold text-white fs-5 d-block">#BK-${job.bookingId}</span>
                            <span id="trip-status-${job.bookingId}" class="${statusTextClass}">
                                ${statusHtml}
                            </span>
                        </div>
                        <div class="text-end">
                            <span class="text-white-50 small d-block">Khởi hành</span>
                            <span class="fw-bold text-white" style="font-size: 0.9rem;">${job.time}</span>
                        </div>
                    </div>
                    
                    <div class="flex-grow-1 mb-4">
                        <div class="route-stepper text-white mb-3 position-relative border-start border-secondary ms-2 ps-3">
                            <div class="mb-3 position-relative" style="font-size: 0.95rem;"><i class="fa-solid fa-circle position-absolute top-50 translate-middle-y text-primary" style="left: -21px; font-size: 0.6rem;"></i> ${job.pickupAddress}</div>
                            <div class="position-relative" style="font-size: 0.95rem;"><i class="fa-solid fa-location-dot position-absolute top-50 translate-middle-y text-danger" style="left: -21px; font-size: 0.8rem;"></i> ${job.dropoffAddress}</div>
                        </div>
                        
                        <div class="mb-3 text-white-50 small d-flex align-items-center gap-2 ps-2">
                            <i class="fa-solid fa-route text-info"></i> Quãng di chuyển: <strong class="text-white">${job.distanceKm} km</strong>
                        </div>
                        
                        <div class="p-3 bg-white bg-opacity-10 border border-secondary rounded-3 d-flex justify-content-between align-items-center">
                            <div>
                                <div class="text-white fw-bold"><i class="fa-solid fa-user-astronaut me-2 text-warning"></i>${job.customerName}</div>
                                <div class="text-white-50 small mt-1"><i class="fa-solid fa-phone me-2"></i>${job.customerPhone}</div>
                            </div>
                            <a href="tel:${job.customerPhone}" class="btn btn-success rounded-circle d-flex align-items-center justify-content-center text-white" style="width: 45px; height: 45px;">
                                <i class="fa-solid fa-phone-volume"></i>
                            </a>
                        </div>
                    </div>
                    
                    <div class="border-top border-secondary pt-3 mt-auto">
                        <button id="btn-start-${job.bookingId}" class="btn-glass-action border-info text-info w-100 py-3 fs-6 fw-bold mb-2" style="background: rgba(13, 202, 240, 0.1); display: ${startBtnDisplay};" onclick="startTrip(this, ${job.bookingId})">
                            <i class="fa-solid fa-play me-2"></i> Bắt đầu chuyến đi
                        </button>

                        <button id="btn-complete-${job.bookingId}" class="btn-glass-action border-success text-success w-100 py-3 fs-6 fw-bold" style="background: rgba(16, 185, 129, 0.1); display: ${completeBtnDisplay};" onclick="completeTrip(this, ${job.bookingId})">
                            <i class="fa-solid fa-flag-checkered me-2"></i> Hoàn thành chuyến
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
// ============================================================================
// 7. TOÀN BỘ LOGIC XỬ LÝ TỪ CHỐI CHUYỂN (ĐỒNG BỘ HOÀN CHỈNH CHỐNG SẬP)
// ============================================================================

// Biến toàn cục lưu ID của đơn hàng đang thực hiện từ chối
window.currentRejectBroadcastId = null;

/**
 * Mở Modal hỏi lý do khi bấm "Từ chối" trên thẻ chuyến xe
 */
window.rejectJob = function(btnElement, broadcastId) {
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
        alert("Lỗi: Không tìm thấy khung giao diện 'rejectModal' trong file HTML!");
    }
};

/**
 * Gửi API POST Từ chối khi bấm nút "Xác nhận Từ chối" trong Modal
 */
window.confirmRejectJob = async function() {
    if (!window.currentRejectBroadcastId) return;

    // 1. Thu thập dữ liệu Lý do từ các nút Radio chọn lựa
    const checkedRadio = document.querySelector('input[name="rejectReason"]:checked');
    if (!checkedRadio) {
        alert("Vui lòng chọn một lý do từ chối!");
        return;
    }

    let reason = checkedRadio.value;
    if (reason === 'other') {
        const otherInput = document.getElementById('otherReasonInput');
        reason = otherInput ? otherInput.value.trim() : '';
        if (!reason) {
            alert("Vui lòng nhập lý do từ chối cụ thể của bạn!");
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
        alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!");
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
                alert("Đã từ chối chuyến thành công!");
            }, 500);

        } else {
            // [THẤT BẠI TỪ SERVER]
            alert(result.error || "Có lỗi xảy ra từ máy chủ khi thực hiện từ chối chuyến.");
        }

    } catch (error) {
        console.error("Lỗi kết nối API Reject:", error);
        alert("Mất kết nối! Không thể gửi tín hiệu đến máy chủ Backend.");
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
window.startTrip = async function(btnElement, bookingId) {
    const originalText = btnElement.innerHTML;
    
    // 1. Chặn UI chống click đúp
    btnElement.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang kết nối...';
    btnElement.disabled = true;

    // 2. Lấy Token
    const token = localStorage.getItem("accessToken");
    if (!token) {
        alert("Vui lòng đăng nhập lại!");
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
            alert("Đã bắt đầu chuyến đi. Hệ thống định vị đã được bật!");
            startGpsTracking(bookingId); 

        } else {
            // [THẤT BẠI]
            alert(result.error || "Không thể bắt đầu chuyến đi lúc này!");
            btnElement.innerHTML = originalText;
            btnElement.disabled = false;
        }

    } catch (error) {
        console.error("Lỗi API Start Trip:", error);
        alert("Lỗi kết nối máy chủ!");
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
                    alert("CẢNH BÁO: Cần cấp quyền truy cập vị trí để hệ thống theo dõi chuyến đi!");
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

    // Thiết lập vòng lặp cứ đúng 30 giây (30000 ms) thì gọi lại hàm trên
    currentGpsInterval = setInterval(sendLocationToServer, 30000);
}

/**
 * BƯỚC 3: Xử lý khi tài xế bấm "Hoàn thành chuyến"
 */
window.completeTrip = async function(btnElement, bookingId) {
    const originalText = btnElement.innerHTML;
    
    // 1. Chặn UI tránh bấm đúp nhiều lần
    btnElement.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang xử lý...';
    btnElement.disabled = true;

    // 2. Lấy Token từ LocalStorage
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
        // 3. Bắn API Hoàn thành chuyến về máy chủ
        const response = await fetch(`${API_TRIPS_BASE}/${bookingId}/complete`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
// [XỬ LÝ THÀNH CÔNG]
            
            // a. QUAN TRỌNG: Tắt ngay vòng lặp bắn GPS ngầm
            if (currentGpsInterval) {
                clearInterval(currentGpsInterval);
                currentGpsInterval = null;
                console.log("[GPS] Đã tắt định vị ngầm do chuyến đi hoàn thành.");
            }

            // b. Xóa thẻ xe này khỏi giao diện của tab "Đã Nhận"
            const tripCard = document.getElementById(`trip-card-${bookingId}`);
            if (tripCard) {
                removeCardSmoothly(tripCard.closest('.broadcast-card-item'));
            }

            // c. CẬP NHẬT MỚI: Xóa ID đơn hàng khỏi danh sách đã nhận trong bộ nhớ máy
            let acceptedIds = JSON.parse(localStorage.getItem('acceptedBookingIds') || '[]');
            acceptedIds = acceptedIds.filter(id => id != bookingId);
            localStorage.setItem('acceptedBookingIds', JSON.stringify(acceptedIds));
            
            localStorage.removeItem('activeBookingId');

            // d. Hiển thị Modal chúc mừng tài xế
            const completeModal = new bootstrap.Modal(document.getElementById("completeTripModal"));
            completeModal.show();

        } else {
            // [THẤT BẠI TỪ SERVER]
            alert(result.error || "Không thể hoàn thành chuyến đi lúc này!");
            btnElement.innerHTML = originalText;
            btnElement.disabled = false;
        }

    } catch (error) {
        // [LỖI MẠNG]
        console.error("Lỗi API Complete Trip:", error);
        alert("Lỗi kết nối máy chủ! Vui lòng thử lại.");
        btnElement.innerHTML = originalText;
        btnElement.disabled = false;
    }
}

/**
 * Tiện ích bổ sung: Sau khi tắt Popup thành công, tự đẩy tài xế về lại Tab Chờ chuyến
 */
window.refreshAfterComplete = function() {
    switchJobTab('PENDING');
}
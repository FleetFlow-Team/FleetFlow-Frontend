/**
 * FleetFlow - Master Admin Workspace Core Engine
 * Architecture: Liquid Glass Interactive Controller & Data Visualization
 */

// Khai báo biến toàn cục để API Dashboard có thể cập nhật lại biểu đồ trạng thái
window.globalStatusChart = null;
let currentViewingAccountId = null; // Biến lưu tài xế đang xem eKYC
let currentPendingDrivers = []; // Biến lưu danh sách tài xế chờ duyệt
let globalAdminVehicles = []; // Biến lưu danh sách xe

document.addEventListener("DOMContentLoaded", function () {
    // 🚀 BẬT CHỐT CHẶN VÀ ĐỒNG BỘ NAVBAR ĐẦU TIÊN
    if (!initAdminSession()) return;

    // TẢI DỮ LIỆU BAN ĐẦU
    fetchAndRenderEkycQueue();
    fetchAndRenderAdminVehicles();
    fetchDashboardData(); // Gọi API thống kê Dashboard ngay khi vào trang

    // Bắt sự kiện cho nút Đăng xuất
    const logoutBtn = document.querySelector('.logout-item');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleAdminLogout);
    }

    // === 1. ĐIỀU HƯỚNG SIDEBAR SINGLE-PAGE & KHỐI KÍNH TRƯỢT DỌC ===
    const tocLinks = document.querySelectorAll(".toc-link");
    const verticalIndicator = document.getElementById("vertical-indicator");
    const sections = document.querySelectorAll(".dashboard-section");

    function updateVerticalIndicator(activeLink) {
        if (!activeLink || !verticalIndicator) return;

        const linkRect = activeLink.getBoundingClientRect();
        const containerRect = activeLink.closest(".toc-list").getBoundingClientRect();
        const topPos = linkRect.top - containerRect.top;

        verticalIndicator.style.transform = `translateY(${topPos}px)`;
        verticalIndicator.style.height = `${linkRect.height}px`;
    }

    const initialActiveLink = document.querySelector(".toc-link.active");
    if (initialActiveLink) {
        setTimeout(() => updateVerticalIndicator(initialActiveLink), 150);
    }

    tocLinks.forEach(link => {
        link.addEventListener("click", function (e) {
            if (this.getAttribute("href").startsWith("#")) {
                e.preventDefault();
                if (this.classList.contains("active")) return;

                tocLinks.forEach(l => l.classList.remove("active"));
                this.classList.add("active");
                updateVerticalIndicator(this);

                const targetId = this.getAttribute("href").substring(1);
                sections.forEach(section => {
                    section.classList.remove("active");
                });

                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.classList.add("active");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                }
            }
        });
    });

    window.addEventListener("resize", () => {
        const currentActiveSidebar = document.querySelector(".toc-link.active");
        if (currentActiveSidebar) updateVerticalIndicator(currentActiveSidebar);
    });

    // === 2. XỬ LÝ ĐỔI TRẠNG THÁI NAVBAR KHI SCROLL ===
    const navbar = document.querySelector(".dispatcher-navbar");
    function handleNavbarScroll() {
        if (!navbar) return;
        if (window.scrollY > 50) {
            navbar.classList.add("is-scrolled");
        } else {
            navbar.classList.remove("is-scrolled");
        }
    }
    window.addEventListener("scroll", handleNavbarScroll);
    handleNavbarScroll();

    // === 3. KHỞI TẠO HỆ THỐNG BIỂU ĐỒ DATA VISUALIZATION ===
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = "rgba(255, 255, 255, 0.7)";
    Chart.defaults.scale.grid.color = "rgba(255, 255, 255, 0.08)";

    // 3.1 Biểu đồ doanh thu (Revenue Chart)
    const ctxRevenue = document.getElementById("revenueChart");
    if (ctxRevenue) {
        new Chart(ctxRevenue, {
            type: "line",
            data: {
                labels: Array.from({ length: 15 }, (_, i) => `Ngày ${i * 2 + 1}`),
                datasets: [{
                    label: "Doanh thu (Triệu VNĐ)",
                    data: [45, 52, 49, 62, 58, 75, 80, 72, 88, 95, 89, 102, 115, 110, 125],
                    borderColor: "#00b14f",
                    borderWidth: 3,
                    pointBackgroundColor: "#ffffff",
                    pointBorderColor: "#00b14f",
                    pointHoverRadius: 7,
                    tension: 0.35,
                    fill: true,
                    backgroundColor: function (context) {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return null;
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, "rgba(0, 177, 79, 0.25)");
                        gradient.addColorStop(1, "rgba(0, 177, 79, 0.0)");
                        return gradient;
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // 3.2 Biểu đồ trạng thái chuyến đi (Status Chart) -> Đã gán vào window.globalStatusChart
    const ctxStatus = document.getElementById("statusChart");
    if (ctxStatus) {
        window.globalStatusChart = new Chart(ctxStatus, {
            type: "doughnut",
            data: {
                labels: ["Hoàn thành", "Đang chạy", "Đang chờ", "Hủy chuyến"],
                datasets: [{
                    data: [0, 0, 0, 0], // Ban đầu để 0, API Dashboard sẽ tự đổ vào
                    backgroundColor: [
                        "rgba(0, 177, 79, 0.75)",
                        "rgba(0, 122, 255, 0.75)",
                        "rgba(255, 222, 89, 0.75)",
                        "rgba(239, 68, 68, 0.75)"
                    ],
                    borderColor: "rgba(255, 255, 255, 0.15)",
                    borderWidth: 2,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "bottom", labels: { padding: 15, boxWidth: 12 } }
                }
            }
        });
    }

    // 3.3 Biểu đồ Phổ điểm đánh giá tài xế (Quality Radar Chart)
    const ctxQuality = document.getElementById("qualityRadarChart");
    if (ctxQuality) {
        new Chart(ctxQuality, {
            type: "radar",
            data: {
                labels: ["Đúng giờ", "Thái độ", "An toàn", "Sạch sẽ", "Ứng xử"],
                datasets: [{
                    label: "Điểm trung bình",
                    data: [4.8, 4.6, 4.9, 4.7, 4.5],
                    backgroundColor: "rgba(255, 222, 89, 0.15)",
                    borderColor: "#ffde59",
                    borderWidth: 2,
                    pointBackgroundColor: "#ffffff"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: "rgba(255, 255, 255, 0.1)" },
                        grid: { color: "rgba(255, 255, 255, 0.1)" },
                        pointLabels: { color: "rgba(255, 255, 255, 0.8)", font: { size: 11 } },
                        suggestedMin: 3,
                        suggestedMax: 5
                    }
                }
            }
        });
    }

    // 3.4 Biểu đồ phân tích lý do hủy chuyến (Cancel Reason Chart)
    const ctxCancel = document.getElementById("cancelReasonChart");
    if (ctxCancel) {
        new Chart(ctxCancel, {
            type: "bar",
            data: {
                labels: ["Khách đổi ý", "Đợi quá lâu", "Sai vị trí", "Thời tiết", "Tài xế hủy"],
                datasets: [{
                    data: [45, 28, 14, 8, 5],
                    backgroundColor: "rgba(239, 68, 68, 0.4)",
                    borderColor: "#ef4444",
                    borderWidth: 1.5,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { grid: { display: false } }, y: { beginAtZero: true } }
            }
        });
    }

    // === 4. CẤU HÌNH KANBAN BOARD DRAG & DROP ===
    const dragItems = document.querySelectorAll(".kanban-card-item[draggable='true']");
    const dropzone = document.querySelector(".target-dropzone");

    dragItems.forEach(item => {
        item.addEventListener("dragstart", function () { this.classList.add("dragging"); });
        item.addEventListener("dragend", function () { this.classList.remove("dragging"); });
    });

    if (dropzone) {
        dropzone.addEventListener("dragover", function (e) {
            e.preventDefault();
            this.style.background = "rgba(0, 177, 79, 0.05)";
            this.style.borderColor = "var(--color-1)";
        });

        dropzone.addEventListener("dragleave", function () {
            this.style.background = "";
            this.style.borderColor = "";
        });

        dropzone.addEventListener("drop", function () {
            this.style.background = "";
            this.style.borderColor = "";
            const draggingCard = document.querySelector(".dragging");
            if (draggingCard) {
                const newTag = draggingCard.cloneNode(true);
                newTag.removeAttribute("draggable");
                newTag.className = "badge bg-white bg-opacity-10 text-white border border-secondary p-2 m-1";
                this.appendChild(newTag);
                showSystemToast("Đã gán thuộc tính AI vào phương tiện thành công!", "success");
            }
        });
    }
});

// =========================================================================
// PHÂN HỆ 1: UI / UX CHUNG & QUẢN LÝ PHIÊN LÀM VIỆC (SESSION)
// =========================================================================

function initAdminSession() {
    const userRole = localStorage.getItem('userRole') || '';
    const fullName = localStorage.getItem('fullName') || 'Administrator';
    const email = localStorage.getItem('email') || 'admin@fleetflow.vn';

    if (userRole.toUpperCase() !== 'ADMIN') {
        window.location.replace('../error/403.html');
        return false;
    }

    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=00b14f&color=fff`;
    const nameElements = document.querySelectorAll('.profile-name, .dropdown-header-custom .fw-bold');
    const roleElements = document.querySelectorAll('.profile-role');
    const emailElements = document.querySelectorAll('.dropdown-header-custom .small.text-white-50');
    const avatarImg = document.querySelector('.glass-avatar img');

    nameElements.forEach(el => { if (el) el.innerText = fullName; });
    roleElements.forEach(el => { if (el) el.innerText = userRole.toUpperCase(); });
    emailElements.forEach(el => { if (el) el.innerText = email; });
    if (avatarImg) avatarImg.src = avatarUrl;

    return true;
}

function handleAdminLogout(e) {
    e.preventDefault();
    if (confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống quản trị?")) {
        localStorage.clear();
        window.location.replace('../../index.html');
    }
}

window.showSystemToast = function (message, type = "success") {
    const toastContainer = document.getElementById("systemErrorToast");
    const toastMessageSpan = document.getElementById("toastMsg");
    if (!toastContainer || !toastMessageSpan) return;

    toastMessageSpan.textContent = message;
    const iconElement = toastContainer.querySelector("i");

    if (type === "error") {
        toastContainer.className = "toast align-items-center toast-premium border border-danger shadow-lg show";
        if (iconElement) iconElement.className = "fa-solid fa-circle-xmark fs-3 text-danger";
    } else {
        toastContainer.className = "toast align-items-center toast-premium border border-success shadow-lg show";
        if (iconElement) iconElement.className = "fa-solid fa-circle-check fs-3 text-success";
    }

    setTimeout(() => { toastContainer.classList.remove("show"); }, 4000);
};

window.simulateSaveConfig = function (button) {
    if (!button) return;
    const originalContent = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin me-2"></i> Đang ghi dữ liệu...`;

    setTimeout(() => {
        button.disabled = false;
        button.innerHTML = originalContent;
        showSystemToast("Hệ thống đã đồng bộ cấu hình hoàn tất!", "success");
        const activeModal = button.closest(".modal");
        if (activeModal) {
            const modalInstance = bootstrap.Modal.getInstance(activeModal);
            if (modalInstance) modalInstance.hide();
        }
    }, 1300);
};

window.openDiffModal = function () {
    const diffModalEl = document.getElementById("diffModal");
    if (diffModalEl) {
        bootstrap.Modal.getOrCreateInstance(diffModalEl).show();
    }
};

// =========================================================================
// PHÂN HỆ 2: DASHBOARD TỔNG QUAN VÀ BẢNG THỐNG KÊ CHI TIẾT
// =========================================================================

const ADMIN_DASHBOARD_API_URL = 'http://localhost:8080/FleetFlow/api/v1/admin/bookings';

window.currentDashboardFilter = { fromDate: '', toDate: '' };

window.testGlobalError = function (selectElement) {
    if (!selectElement) return;
    const val = selectElement.value;

    if (val === "Test Lỗi Mạng") {
        showSystemToast("Mất kết nối API Gateway. Vui lòng kiểm tra lại cấu hình định tuyến.", "error");
        selectElement.selectedIndex = 0;
        return;
    }

    showSystemToast(`Đang đồng bộ dữ liệu: "${val}"`, "success");
    const today = new Date();

    if (val === "Tháng này") {
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        window.currentDashboardFilter.fromDate = `${year}-${month}-01`;
        window.currentDashboardFilter.toDate = `${year}-${month}-${String(today.getDate()).padStart(2, '0')}`;
    } else if (val === "Tháng trước") {
        let lastMonth = today.getMonth();
        let year = today.getFullYear();
        if (lastMonth === 0) { lastMonth = 12; year--; }
        const lastDay = new Date(year, lastMonth, 0).getDate();
        window.currentDashboardFilter.fromDate = `${year}-${String(lastMonth).padStart(2, '0')}-01`;
        window.currentDashboardFilter.toDate = `${year}-${String(lastMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    const statusVal = document.getElementById('dashboardStatusFilter')?.value || '';
    fetchDashboardData(statusVal, window.currentDashboardFilter.fromDate, window.currentDashboardFilter.toDate);
};

window.fetchDashboardDetail = function (status) {
    fetchDashboardData(status, window.currentDashboardFilter.fromDate, window.currentDashboardFilter.toDate);
};

window.fetchDashboardData = async function (status = '', fromDate = '', toDate = '') {
    let url = ADMIN_DASHBOARD_API_URL + "?";
    if (status) url += `status=${status}&`;
    if (fromDate) url += `fromDate=${fromDate}&`;
    if (toDate) url += `toDate=${toDate}&`;

    const token = localStorage.getItem('accessToken');
    const tbody = document.getElementById('dashboardDetailBody');

    try {
        if (tbody && status) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><i class="fa-solid fa-circle-notch fa-spin text-info fs-3"></i></td></tr>`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        const result = await response.json();

        if (result.success && result.summary) {
            updateDashboardKPIs(result.summary);

            if (window.globalStatusChart) {
                const byStatus = result.summary.byStatus;
                window.globalStatusChart.data.datasets[0].data = [
                    byStatus.COMPLETED || 0,
                    byStatus.ONGOING || 0,
                    byStatus.PENDING || 0,
                    byStatus.CANCELLED || 0
                ];
                window.globalStatusChart.update();
            }

            if (status) {
                renderDashboardTable(result.data || [], status);
            }

        } else {
            showSystemToast(result.error || "Tải dữ liệu thống kê thất bại", "error");
        }
    } catch (error) {
        console.error("Fetch Dashboard Error:", error);
        showSystemToast("Mất kết nối API Gateway phân tích dữ liệu.", "error");
    }
};

function updateDashboardKPIs(summary) {
    const kpiValues = document.querySelectorAll('#tab-dashboard .kpi-glass-card h3');
    if (kpiValues.length >= 4) {
        kpiValues[0].innerText = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summary.totalRevenue || 0);
        const estimatedProfit = (summary.totalRevenue || 0) * 0.25;
        kpiValues[1].innerText = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(estimatedProfit);
        kpiValues[2].innerText = (summary.byStatus.COMPLETED || 0).toLocaleString('vi-VN');
        kpiValues[3].innerText = (summary.driverRejectCount || 0) + " Lượt";
    }
}

function renderDashboardTable(data, status) {
    const thead = document.getElementById('dashboardDetailHead');
    const tbody = document.getElementById('dashboardDetailBody');
    if (!thead || !tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-white-50 py-5">Hệ thống không ghi nhận dữ liệu cho trạng thái [${status}] trong thời gian này.</td></tr>`;
        return;
    }

    let headerHtml = `
        <th width="10%">Mã chuyến</th>
        <th width="20%">Khách hàng</th>
        <th width="20%">Phương tiện</th>
        <th width="15%">Loại di chuyển</th>
    `;

    if (status === "CANCELLED") {
        headerHtml += `<th width="20%">Lý do & Tiền phạt</th>`;
    } else if (status === "REJECTED") {
        headerHtml += `<th width="20%">Chi tiết từ chối</th>`;
    } else if (status === "COMPLETED") {
        headerHtml += `<th width="20%">Chi tiết dòng tiền</th>`;
    } else {
        headerHtml += `<th width="20%">Ghi chú</th>`;
    }

    headerHtml += `<th width="15%">Thời gian tạo</th>`;
    thead.innerHTML = headerHtml;

    let bodyHtml = "";
    data.forEach(item => {
        let timeStr = "Chưa cập nhật";
        if (item.createdAt) {
            const d = new Date(item.createdAt);
            timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} <br> <span class="text-white-50 small">${d.toLocaleDateString('vi-VN')}</span>`;
        }

        bodyHtml += `<tr>`;
        bodyHtml += `<td><span class="badge bg-white bg-opacity-10 text-white border border-secondary fw-bold fs-6">#BK-${item.bookingId}</span></td>`;
        bodyHtml += `
            <td>
                <div class="fw-bold text-white">${item.customerName || 'Khách vãng lai'}</div>
                <div class="small text-info mt-1"><i class="fa-solid fa-phone me-1"></i>${item.customerPhone || 'Không có SĐT'}</div>
            </td>`;
        bodyHtml += `
            <td>
                <div class="fw-bold text-white">${item.licensePlate || '--'}</div>
                <div class="small text-white-50 mt-1">${item.vehicleName || 'Chưa điều xe'}</div>
            </td>`;

        const isRoundTrip = item.tripDirection === "ROUND_TRIP";
        bodyHtml += `
            <td>
                <div class="small text-white fw-bold mb-1">${item.bookingType}</div>
                <span class="badge ${isRoundTrip ? 'bg-success text-success' : 'bg-primary text-primary'} bg-opacity-25 border border-${isRoundTrip ? 'success' : 'primary'}">
                    ${isRoundTrip ? '<i class="fa-solid fa-arrows-rotate me-1"></i> Khứ hồi' : '<i class="fa-solid fa-arrow-right me-1"></i> Một chiều'}
                </span>
            </td>`;

        if (status === "CANCELLED") {
            const penalty = item.penaltyAmount ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.penaltyAmount) : '0 đ';
            bodyHtml += `
                <td>
                    <div class="small text-danger fw-bold text-truncate" style="max-width:200px;" title="${item.cancelReason || ''}">${item.cancelReason || 'Không rõ lý do'}</div>
                    <div class="small text-warning mt-1"><i class="fa-solid fa-coins me-1"></i> Phạt: ${penalty}</div>
                </td>`;
        } else if (status === "REJECTED") {
            bodyHtml += `
                <td>
                    <div class="small text-danger fw-bold text-truncate" style="max-width:200px;">${item.rejectDetail || 'Không rõ lý do'}</div>
                    <div class="small text-white-50 mt-1">Từ chối lúc: ${item.rejectedAt ? new Date(item.rejectedAt).toLocaleTimeString('vi-VN') : '--'}</div>
                </td>`;
        } else if (status === "COMPLETED") {
            const total = item.totalAmount ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.totalAmount) : '0 đ';
            const discount = item.discountAmount ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.discountAmount) : '0 đ';
            bodyHtml += `
                <td>
                    <div class="fw-bold text-success fs-6">${total}</div>
                    <div class="small text-warning mt-1"><i class="fa-solid fa-tag me-1"></i> Giảm: ${discount}</div>
                </td>`;
        } else {
            bodyHtml += `
                <td>
                    <div class="small text-white-50 text-truncate" style="max-width: 200px;" title="${item.note || ''}">${item.note || '- Không có ghi chú -'}</div>
                </td>`;
        }

        bodyHtml += `<td>${timeStr}</td>`;
        bodyHtml += `</tr>`;
    });
    tbody.innerHTML = bodyHtml;
}

// =========================================================================
// PHÂN HỆ 3: KIỂM DUYỆT HỒ SƠ TÀI XẾ (eKYC)
// =========================================================================

const ADMIN_API_BASE = 'http://localhost:8080/FleetFlow/api/v1/admin/drivers';

let imageStates = {
    'cccdFrontImg': { scale: 1, rotate: 0 },
    'cccdBackImg': { scale: 1, rotate: 0 },
    'licenseFrontImg': { scale: 1, rotate: 0 },
    'licenseBackImg': { scale: 1, rotate: 0 }
};

window.zoomImg = function (imgId, factor) {
    const img = document.getElementById(imgId);
    let state = imageStates[imgId];
    if (img && state) {
        state.scale = Math.max(0.5, Math.min(state.scale * factor, 3));
        img.style.transform = `scale(${state.scale}) rotate(${state.rotate}deg)`;
    }
};

window.rotateImg = function (imgId) {
    const img = document.getElementById(imgId);
    let state = imageStates[imgId];
    if (img && state) {
        state.rotate += 90;
        img.style.transform = `scale(${state.scale}) rotate(${state.rotate}deg)`;
    }
};

window.fetchAndRenderEkycQueue = async function () {
    const queueList = document.getElementById("ekycQueueList");
    if (!queueList) return;

    queueList.innerHTML = `<tr><td colspan="4" class="text-center p-5"><i class="fa-solid fa-circle-notch fa-spin fs-2 text-info"></i><p class="mt-2 text-white-50 small fw-bold">Đang tải dữ liệu hồ sơ...</p></td></tr>`;

    const token = localStorage.getItem('accessToken');
    try {
        const response = await fetch(`${ADMIN_API_BASE}/pending`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        const result = await response.json();

        if (result.success && result.data) {
            currentPendingDrivers = result.data;
            const badge = document.querySelector('a[href="#tab-drivers"] .badge');
            if (badge) badge.innerText = currentPendingDrivers.length;

            if (currentPendingDrivers.length === 0) {
                queueList.innerHTML = `<tr><td colspan="4" class="text-center py-5"><i class="fa-solid fa-check-double text-success mb-3" style="font-size: 3rem;"></i><h5 class="text-white fw-bold">Tuyệt vời!</h5><p class="text-white-50 small">Tất cả hồ sơ eKYC đã được xử lý xong.</p></td></tr>`;
                return;
            }

            queueList.innerHTML = "";
            currentPendingDrivers.forEach(driver => {
                const dateStr = driver.createdAt || '';
                const timeOnly = dateStr.includes(' ') ? dateStr.split(' ')[1].substring(0, 5) : '--:--';
                const dateOnly = dateStr.includes(' ') ? dateStr.split(' ')[0] : 'Chưa cập nhật';

                let cccdUrl = '../../assets/img/default-doc.png';
                let licenseUrl = '../../assets/img/default-doc.png';

                if (driver.documents && driver.documents.length > 0) {
                    driver.documents.forEach(doc => {
                        if (doc.docType && doc.docType.toUpperCase() === 'NATIONALID') cccdUrl = doc.fileUrl;
                        if (doc.docType && doc.docType.toUpperCase() === 'DRIVERLICENSE') licenseUrl = doc.fileUrl;
                    });
                }

                driver.extractedCccd = cccdUrl;
                driver.extractedLicense = licenseUrl;

                const rowHtml = `
                    <tr>
                        <td>
                            <div class="d-flex align-items-center gap-3">
                                <div class="bg-success bg-opacity-25 text-success border border-success border-opacity-50 fw-bold fs-5 d-flex align-items-center justify-content-center rounded-circle" style="width:45px; height:45px;">
                                    ${driver.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div class="fw-bold text-white fs-6">${driver.fullName}</div>
                                    <div class="small text-white-50 mt-1"><i class="fa-solid fa-phone me-1"></i> ${driver.phoneNumber || 'Trống'}</div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <div class="small fw-bold text-white">${timeOnly}</div>
                            <div class="small text-white-50 mt-1">${dateOnly}</div>
                        </td>
                        <td>
                            <span class="badge bg-warning bg-opacity-25 text-warning border border-warning p-2 px-3 fw-bold glass-badge-hover" style="cursor:pointer;" onclick="openEkycModal(${driver.accountId})">
                                <i class="fa-solid fa-fingerprint fa-beat-fade me-1"></i> Chờ Thẩm Định
                            </span>
                        </td>
                        <td class="text-end">
                            <button class="btn-glass-action border-info text-info me-2 fw-bold" onclick="openEkycModal(${driver.accountId})">Xem Hồ Sơ</button>
                        </td>
                    </tr>`;
                queueList.insertAdjacentHTML('beforeend', rowHtml);
            });
        } else {
            queueList.innerHTML = `<tr><td colspan="4" class="text-danger fw-bold p-3 text-center">Lỗi tải dữ liệu: ${result.message || 'Phiên đăng nhập không hợp lệ'}</td></tr>`;
        }
    } catch (error) {
        queueList.innerHTML = `<tr><td colspan="4" class="text-danger fw-bold p-3 text-center">Lỗi kết nối máy chủ NetBeans.</td></tr>`;
    }
};

window.openEkycModal = function (accountId) {
    const driver = currentPendingDrivers.find(d => d.accountId === accountId);
    if (!driver) return;

    currentViewingAccountId = accountId;

    const modalName = document.getElementById("modalDriverName");
    const modalPhone = document.getElementById("modalDriverPhone");
    const modalDate = document.getElementById("modalDriverDate");

    if (modalName) modalName.innerText = driver.fullName;
    if (modalPhone) modalPhone.innerHTML = `<i class="fa-solid fa-phone me-2"></i> ${driver.phoneNumber || 'Không có SĐT'}`;
    const dateStr = driver.createdAt ? driver.createdAt.split('.')[0] : 'Chưa cập nhật';
    if (modalDate) modalDate.innerText = `Thời gian nộp: ${dateStr}`;

    const imgConfigs = [
        { id: "cccdFrontImg", emptyId: "cccdFrontEmpty", ctrlId: "cccdFrontControls", url: driver.extractedCccd },
        { id: "cccdBackImg", emptyId: "cccdBackEmpty", ctrlId: "cccdBackControls", url: driver.extractedCccd },
        { id: "licenseFrontImg", emptyId: "licenseFrontEmpty", ctrlId: "licenseFrontControls", url: driver.extractedLicense },
        { id: "licenseBackImg", emptyId: "licenseBackEmpty", ctrlId: "licenseBackControls", url: driver.extractedLicense }
    ];

    imgConfigs.forEach(config => {
        const imgDOM = document.getElementById(config.id);
        const emptyDOM = document.getElementById(config.emptyId);
        const ctrlDOM = document.getElementById(config.ctrlId);
        const isValidUrl = config.url && config.url.trim() !== '' && !config.url.includes('default-doc.png');

        if (imgDOM && emptyDOM) {
            if (isValidUrl) {
                imgDOM.src = config.url;
                imgDOM.classList.remove('d-none');
                emptyDOM.classList.add('d-none');
                if (ctrlDOM) ctrlDOM.classList.remove('d-none');
                if (imageStates[config.id]) imageStates[config.id] = { scale: 1, rotate: 0 };
                imgDOM.style.transform = `scale(1) rotate(0deg)`;
            } else {
                imgDOM.classList.add('d-none');
                emptyDOM.classList.remove('d-none');
                if (ctrlDOM) ctrlDOM.classList.add('d-none');
            }
        }
    });

    const rejectContainer = document.getElementById('rejectReasonContainer');
    const actionButtons = document.getElementById('ekycActionButtons');
    const rejectInput = document.getElementById('rejectReasonInput');

    if (rejectContainer && actionButtons && rejectInput) {
        rejectContainer.classList.add('d-none');
        actionButtons.classList.remove('d-none');
        rejectInput.value = '';
    }

    const ekycModalEl = document.getElementById("ekycModal");
    if (ekycModalEl) bootstrap.Modal.getOrCreateInstance(ekycModalEl).show();
};

window.approveEkyc = async function () {
    if (!currentViewingAccountId) return;
    const token = localStorage.getItem('accessToken');
    try {
        const response = await fetch(`${ADMIN_API_BASE}/${currentViewingAccountId}/approve`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        if (data.success) {
            showSystemToast("Đã phê duyệt hồ sơ đối tác tài xế thành công!", "success");
            bootstrap.Modal.getInstance(document.getElementById('ekycModal')).hide();
            fetchAndRenderEkycQueue();
        } else alert("Không thể duyệt: " + data.message);
    } catch (error) { alert("Mất kết nối đến máy chủ khi duyệt hồ sơ."); }
};

window.prepareReject = function () {
    document.getElementById('ekycActionButtons').classList.add('d-none');
    document.getElementById('rejectReasonContainer').classList.remove('d-none');
    document.getElementById('rejectReasonInput').focus();
};

window.cancelReject = function () {
    document.getElementById('rejectReasonContainer').classList.add('d-none');
    document.getElementById('rejectReasonInput').value = '';
    document.getElementById('ekycActionButtons').classList.remove('d-none');
};

window.executeRejectApi = async function () {
    const reason = document.getElementById('rejectReasonInput').value.trim();
    if (!reason) {
        alert("Vui lòng nhập lý do từ chối để tài xế biết cách khắc phục hồ sơ!");
        return;
    }
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${ADMIN_API_BASE}/${currentViewingAccountId}/reject`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ rejectReason: reason })
        });
        const data = await response.json();
        if (data.success) {
            showSystemToast("Đã từ chối và gửi lý do cho tài xế!", "success");
            bootstrap.Modal.getInstance(document.getElementById('ekycModal')).hide();
            cancelReject();
            fetchAndRenderEkycQueue();
        } else alert("Lỗi từ chối: " + data.message);
    } catch (error) { alert("Mất kết nối đến máy chủ."); }
};


// =========================================================================
// PHÂN HỆ 4: QUẢN LÝ VÒNG ĐỜI XE (FLEET MANAGEMENT)
// =========================================================================

const ADMIN_VEHICLE_API_URL = 'http://localhost:8080/FleetFlow/api/v1/admin/vehicles';

window.fetchAndRenderAdminVehicles = async function () {
    const tbody = document.getElementById("adminFleetList");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-5"><i class="fa-solid fa-circle-notch fa-spin fs-3 text-info"></i><div class="mt-2 text-white-50">Đang đồng bộ dữ liệu đội xe...</div></td></tr>`;

    const token = localStorage.getItem('accessToken');
    try {
        const response = await fetch(ADMIN_VEHICLE_API_URL, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        const result = await response.json();

        if (result.success && result.data) {
            globalAdminVehicles = result.data;
            renderAdminVehicles(globalAdminVehicles);
        } else {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-danger fw-bold"><i class="fa-solid fa-triangle-exclamation me-2"></i> Lỗi: ${result.message || 'Không thể lấy dữ liệu'}</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-danger fw-bold"><i class="fa-solid fa-server me-2"></i> Mất kết nối đến máy chủ NetBeans.</td></tr>`;
    }
};

function renderAdminVehicles(vehicles) {
    const tbody = document.getElementById("adminFleetList");
    if (!tbody) return;

    if (vehicles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-5 text-white-50"><i class="fa-solid fa-car-tunnel fs-1 mb-3"></i><br>Hệ thống chưa có phương tiện nào.</td></tr>`;
        return;
    }

    let html = '';
    vehicles.forEach(v => {
        const icon = (v.seatCount > 5) ? 'fa-truck-pickup' : 'fa-car-side';
        const isAvailable = (v.status === 'Available');
        const statusColor = isAvailable ? 'success' : 'danger';

        const selectHtml = `
            <select class="form-select form-select-sm glass-select text-${statusColor} fw-bold border-${statusColor}" onchange="changeVehicleStatus(${v.vehicleId}, this.value)">
                <option value="Available" ${isAvailable ? 'selected' : ''}>Sẵn sàng hoạt động</option>
                <option value="Unavailable" ${!isAvailable ? 'selected' : ''}>Khóa / Bảo dưỡng</option>
            </select>
        `;

        html += `
        <tr>
            <td>
                <div class="d-flex align-items-center gap-3">
                    <div class="bg-white bg-opacity-10 rounded-3 p-2 text-center" style="width: 55px; border: 1px solid rgba(255,255,255,0.2);">
                        <i class="fa-solid ${icon} fs-4 text-white-50"></i>
                    </div>
                    <div>
                        <div class="fw-bold fs-6 text-white" style="letter-spacing: 0.5px;">${v.licensePlate}</div>
                        <div class="small text-white-50 fw-medium mt-1">${v.brand} ${v.model} | ${v.seatCount} Chỗ</div>
                    </div>
                </div>
            </td>
            <td>
                <div class="small text-info fw-bold mb-1"><i class="fa-solid fa-barcode me-2"></i>SK: ${v.chassisNumber || 'Chưa cập nhật'}</div>
                <div class="small text-warning fw-bold mb-1"><i class="fa-solid fa-gear me-2"></i>SM: ${v.engineNumber || 'Chưa cập nhật'}</div>
                <div class="small text-success fw-bold"><i class="fa-solid fa-gauge-high me-2"></i>ODO: ${(v.accumulatedKm || 0).toLocaleString('vi-VN')} km</div>
            </td>
            <td>
                <div class="d-flex flex-wrap gap-1">
                    <span class="badge bg-white bg-opacity-10 text-white border border-secondary">${v.typeName || 'Chưa phân loại'}</span>
                </div>
            </td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    ${selectHtml}
                    <button class="btn-glass-action border-info text-info p-1 px-2 shadow-sm" onclick="viewAdminVehicleDetail(${v.vehicleId})">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

window.viewAdminVehicleDetail = async function (id) {
    showSystemToast("Đang truy xuất dữ liệu từ kho lưu trữ...", "success");
    const token = localStorage.getItem('accessToken');
    try {
        const response = await fetch(`${ADMIN_VEHICLE_API_URL}/${id}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (result.success && result.data) {
            const v = result.data;
            alert(`🔍 HỒ SƠ LƯU TRỮ PHƯƠNG TIỆN #${v.vehicleId}\n` +
                `-----------------------------------------\n` +
                `Biển số kiểm soát: ${v.licensePlate}\n` +
                `Hãng & Dòng xe: ${v.brand} ${v.model} (${v.seatCount} Chỗ)\n\n` +
                `Số khung: ${v.chassisNumber}\n` +
                `Số máy: ${v.engineNumber}\n` +
                `ODO: ${v.accumulatedKm} km\n\n` +
                `Trạng thái: ${v.status === 'Available' ? 'Đang hoạt động' : 'Tạm khóa'}`);
        } else showSystemToast(result.message || "Không tìm thấy dữ liệu phương tiện!", "error");
    } catch (error) { showSystemToast("Lỗi đường truyền! Vui lòng thử lại.", "error"); }
};

window.changeVehicleStatus = async function (id, newStatus) {
    if (!confirm(`Xác nhận đổi trạng thái xe thành: ${newStatus === 'Available' ? 'SẴN SÀNG' : 'TẠM KHÓA / BẢO DƯỠNG'} ?`)) {
        fetchAndRenderAdminVehicles();
        return;
    }
    const token = localStorage.getItem('accessToken');
    try {
        const response = await fetch(`${ADMIN_VEHICLE_API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const result = await response.json();
        if (response.ok && result.success) showSystemToast(`Đã đổi trạng thái thành công phương tiện #${id}`, "success");
        else showSystemToast(result.error || result.message || "Lỗi cập nhật", "error");
    } catch (error) { showSystemToast("Mất kết nối máy chủ", "error"); }
    finally { fetchAndRenderAdminVehicles(); }
};

window.submitNewVehicle = async function (event) {
    event.preventDefault();
    const btn = document.getElementById('btnSubmitVehicle');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-2"></i>Đang lưu...';
    btn.disabled = true;

    const payload = {
        vehicleTypeId: parseInt(document.getElementById('vTypeId').value),
        licensePlate: document.getElementById('vLicensePlate').value.trim(),
        chassisNumber: document.getElementById('vChassis').value.trim(),
        engineNumber: document.getElementById('vEngine').value.trim(),
        brand: document.getElementById('vBrand').value.trim(),
        model: document.getElementById('vModel').value.trim(),
        seatCount: parseInt(document.getElementById('vSeatCount').value),
        status: document.getElementById('vStatus').value,
        accumulatedKm: parseInt(document.getElementById('vKm').value),
        description: document.getElementById('vDescription').value.trim()
    };

    const token = localStorage.getItem('accessToken');
    try {
        const response = await fetch(ADMIN_VEHICLE_API_URL + "/", {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (response.ok && result.success) {
            showSystemToast("Đưa phương tiện mới vào hệ thống thành công!", "success");
            document.getElementById('addVehicleForm').reset();
            bootstrap.Modal.getInstance(document.getElementById('addVehicleModal')).hide();
            fetchAndRenderAdminVehicles();
        } else showSystemToast("Lỗi: " + (result.error || result.message), "error");
    } catch (error) { showSystemToast("Mất kết nối API Gateway.", "error"); }
    finally { btn.innerHTML = originalText; btn.disabled = false; }
};

window.deleteAdminVehicle = async function (id, plate) {
    if (!confirm(`⚠️ XÓA VĨNH VIỄN phương tiện [${plate}] khỏi hệ thống?`)) return;
    const token = localStorage.getItem('accessToken');
    try {
        const response = await fetch(`${ADMIN_VEHICLE_API_URL}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (response.ok && result.success) {
            showSystemToast(`Đã thanh lý thành công [${plate}]`, "success");
            fetchAndRenderAdminVehicles();
        } else showSystemToast(result.error || result.message, "error");
    } catch (error) { showSystemToast("Lỗi đường truyền", "error"); }
};
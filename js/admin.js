/**
 * FleetFlow - Master Admin Workspace Core Engine
 * Architecture: Liquid Glass Interactive Controller & Data Visualization
 */

// Khai báo biến toàn cục để API Dashboard có thể cập nhật lại biểu đồ trạng thái
window.globalStatusChart = null;

let currentPendingDrivers = []; // Biến lưu danh sách tài xế chờ duyệt
let globalAdminVehicles = []; // Biến lưu danh sách xe

// Giao diện thông báo Glassmorphism Pop-up dùng chung cho Admin
window.showGlassAlert = function (message, type = 'info', title = null) {
    const modalEl = document.getElementById('glassAlertModal');
    if (!modalEl) {
        alert(message);
        return;
    }
    const titleEl = document.getElementById('glassAlertTitle');
    const msgEl = document.getElementById('glassAlertMessage');
    const iconEl = document.getElementById('glassAlertIcon');

    msgEl.textContent = message;
    if (type === 'error') {
        titleEl.textContent = title || 'Đã xảy ra lỗi';
        iconEl.innerHTML = '<i class="fa-solid fa-circle-xmark text-danger"></i>';
    } else if (type === 'warning') {
        titleEl.textContent = title || 'Cảnh báo';
        iconEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-warning"></i>';
    } else {
        titleEl.textContent = title || 'Thông báo';
        iconEl.innerHTML = '<i class="fa-solid fa-circle-check text-success"></i>';
    }

    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
};

// Giao diện xác nhận Glassmorphism Pop-up dùng chung cho Admin
window.showGlassConfirm = function (message, onConfirmCallback, options = {}) {
    const modalEl = document.getElementById('glassConfirmModal');
    if (!modalEl) {
        if (confirm(message)) {
            if (typeof onConfirmCallback === 'function') onConfirmCallback();
        } else {
            if (typeof options.onCancel === 'function') options.onCancel();
        }
        return;
    }
    const titleEl = document.getElementById('glassConfirmTitle');
    const msgEl = document.getElementById('glassConfirmMessage');
    const iconEl = document.getElementById('glassConfirmIcon');
    const btnEl = document.getElementById('glassConfirmBtn');

    titleEl.textContent = options.title || 'Xác nhận hành động';
    msgEl.textContent = message;
    btnEl.textContent = options.confirmText || 'Xác nhận';

    if (options.btnColor) {
        btnEl.style.background = options.btnColor;
    } else if (options.type === 'danger') {
        btnEl.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    } else if (options.type === 'success') {
        btnEl.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    } else {
        btnEl.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
    }

    if (options.icon) {
        iconEl.innerHTML = options.icon;
    } else if (options.type === 'danger') {
        iconEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-danger"></i>';
    } else if (options.type === 'success') {
        iconEl.innerHTML = '<i class="fa-solid fa-circle-check text-success"></i>';
    } else {
        iconEl.innerHTML = '<i class="fa-solid fa-circle-question text-warning"></i>';
    }

    const bsModal = new bootstrap.Modal(modalEl);
    let isConfirmed = false;

    btnEl.onclick = function () {
        isConfirmed = true;
        bsModal.hide();
        if (typeof onConfirmCallback === 'function') onConfirmCallback();
    };

    const hiddenHandler = function () {
        modalEl.removeEventListener('hidden.bs.modal', hiddenHandler);
        if (!isConfirmed && typeof options.onCancel === 'function') {
            options.onCancel();
        }
    };
    modalEl.addEventListener('hidden.bs.modal', hiddenHandler);

    bsModal.show();
};

// =========================================================================
// HÀM HIỆN MODAL HẾT HẠN TOKEN & ĐẾM NGƯỢC 5 GIÂY (APPLE GLASSMORPHISM)
// =========================================================================
let expiredInterval = null;

window.showSessionExpiredModal = function () {
    const modalEl = document.getElementById('tokenExpiredModal');
    if (!modalEl) {
        alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        localStorage.clear();
        window.location.replace('../../index.html');
        return;
    }

    // Xóa session storage/local storage ngay lập tức vì token đã hết hiệu lực
    localStorage.clear();
    sessionStorage.clear();

    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();

    let timeLeft = 5;
    const timerSpan = document.getElementById('countdownTimer');
    const progressBar = document.getElementById('countdownProgress');

    if (expiredInterval) clearInterval(expiredInterval);

    expiredInterval = setInterval(() => {
        timeLeft--;
        if (timerSpan) timerSpan.textContent = timeLeft;
        if (progressBar) progressBar.style.width = `${(timeLeft / 5) * 100}%`;

        if (timeLeft <= 0) {
            clearInterval(expiredInterval);
            window.forceRedirectHome();
        }
    }, 1000);
};

window.forceRedirectHome = function () {
    if (expiredInterval) clearInterval(expiredInterval);
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('../../index.html');
};

document.addEventListener("DOMContentLoaded", function () {
    // 🚀 BẬT CHỐT CHẶN VÀ ĐỒNG BỘ NAVBAR ĐẦU TIÊN
    if (!initAdminSession()) return;

    // TẢI DỮ LIỆU BAN ĐẦU

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

                    // Nạp dữ liệu tự động nếu vào tab cấu hình Tags
                    if (targetId === 'tab-vehicle-tags' && typeof loadVehicleTagsList === 'function') {
                        loadVehicleTagsList();
                    }
                    if (targetId === 'tab-landmarks' && typeof fetchLandmarks === 'function') {
                        fetchLandmarks();
                    }
                    if (targetId === 'tab-reports' && typeof fetchAdminRatings === 'function') {
                        fetchAdminRatings();
                    }
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
    const token = localStorage.getItem('accessToken');
    if (!token) {
        if (typeof window.showSessionExpiredModal === 'function') {
            window.showSessionExpiredModal();
        } else {
            localStorage.clear();
            window.location.replace('../../index.html');
        }
        return false;
    }

    const userRole = localStorage.getItem('userRole') || '';
    const fullName = localStorage.getItem('fullName') || 'Administrator';
    const email = localStorage.getItem('email') || 'admin@fleetflow.vn';

    if (userRole.toUpperCase() !== 'ADMIN') {
        window.location.replace('../../error/403.html');
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
    showGlassConfirm(
        "Bạn có chắc chắn muốn đăng xuất khỏi hệ thống quản trị?",
        () => {
            localStorage.clear();
            window.location.replace('../../index.html');
        },
        { title: "Đăng xuất hệ thống", confirmText: "Đăng xuất", type: "danger" }
    );
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
        const isAvailable = (v.status && v.status.toUpperCase() === 'AVAILABLE');
        const statusColor = isAvailable ? 'success' : 'danger';

        const selectHtml = `
            <select class="form-select form-select-sm glass-select text-${statusColor} fw-bold border-${statusColor}" onchange="changeVehicleStatus(${v.vehicleId}, this.value)">
                <option value="AVAILABLE" ${isAvailable ? 'selected' : ''}>Sẵn sàng hoạt động</option>
                <option value="UNAVAILABLE" ${!isAvailable ? 'selected' : ''}>Khóa / Bảo dưỡng</option>
            </select>
        `;

        html += `
        <tr>
            <td class="text-info fw-bold">#${v.vehicleId}</td>
            <td>
                <div class="d-flex align-items-center gap-3">
                    
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
            document.getElementById('vdTitle').innerText = `Hồ Sơ Phương Tiện #${v.vehicleId}`;
            document.getElementById('vdStatus').innerText = v.status === 'Available' ? 'Đang hoạt động' : (v.status || 'Không xác định');
            document.getElementById('vdStatus').className = v.status === 'Available' ? 'badge bg-success' : 'badge bg-danger';
            document.getElementById('vdLicense').innerText = v.licensePlate;
            document.getElementById('vdModel').innerText = `${v.brand} ${v.model} (${v.seatCount} Chỗ)`;
            document.getElementById('vdEngine').innerText = v.engineNumber;
            document.getElementById('vdChassis').innerText = v.chassisNumber;
            document.getElementById('vdOdo').innerText = `${new Intl.NumberFormat('vi-VN').format(v.accumulatedKm)} km`;

            document.getElementById('vehicleDetailModal').classList.add('active');
        } else {
            showSystemToast(result.message || "Không tìm thấy dữ liệu phương tiện!", "error");
        }
    } catch (error) {
        showSystemToast("Lỗi đường truyền! Vui lòng thử lại.", "error");
    }
};

window.closeVehicleDetailModal = function () {
    document.getElementById('vehicleDetailModal').classList.remove('active');
};

window.changeVehicleStatus = function (id, newStatus) {
    const isAvail = newStatus.toUpperCase() === 'AVAILABLE';
    const statusText = isAvail ? 'SẴN SÀNG' : 'TẠM KHÓA / BẢO DƯỠNG';
    const btnColor = isAvail ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)';

    showGlassConfirm(
        `Xác nhận đổi trạng thái xe thành: ${statusText} ?`,
        async () => {
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
        },
        {
            title: "Đổi trạng thái phương tiện",
            confirmText: "Xác nhận đổi",
            btnColor: btnColor,
            onCancel: () => fetchAndRenderAdminVehicles()
        }
    );
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

window.deleteAdminVehicle = function (id, plate) {
    showGlassConfirm(
        `⚠️ XÓA VĨNH VIỄN phương tiện [${plate}] khỏi hệ thống?`,
        async () => {
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
        },
        { title: "Thanh lý phương tiện", confirmText: "Xóa vĩnh viễn", type: "danger" }
    );
};

// =========================================================================
// PHÂN HỆ 9: QUẢN LÝ BẢNG GIÁ (PRICING RULES)
// =========================================================================

let globalPricingRules = [];

window.loadPricingRules = async function () {
    const tbody = document.getElementById('pricingRulesBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5"><i class="fa-solid fa-circle-notch fa-spin fs-3 text-info"></i><div class="mt-2 text-white-50">Đang đồng bộ dữ liệu Bảng giá...</div></td></tr>';

    const token = localStorage.getItem('accessToken');
    try {
        const response = await fetch('http://localhost:8080/FleetFlow/api/v1/admin/pricing-rules', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        const result = await response.json();
        if (result.success && result.data) {
            globalPricingRules = result.data;
            if (globalPricingRules.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-white-50">Hệ thống chưa có bảng giá nào.</td></tr>';
                return;
            }

            let html = '';
            globalPricingRules.forEach(r => {
                const basePrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(r.basePrice || 0);
                const priceKm = r.pricePerKm > 0 ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(r.pricePerKm) : '--';
                const priceHD = r.pricePerHour > 0 ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(r.pricePerHour) + ' / giờ' :
                    (r.pricePerDay > 0 ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(r.pricePerDay) + ' / ngày' : '--');

                html += `
                    <tr>
                        <td>
                            <div class="fw-bold text-white">${r.vehicleTypeId}</div>
                        </td>
                        <td>
                            <div class="small fw-bold text-primary">${r.bookingType}</div>
                            <div class="small text-white-50">${r.tripDirection}</div>
                        </td>
                        <td class="text-success fw-bold">${basePrice}</td>
                        <td class="text-warning">${priceKm}</td>
                        <td class="text-warning">${priceHD}</td>
                        <td>
                            <span class="badge ${r.weekendMultiplier > 1 ? 'bg-danger' : 'bg-secondary'} bg-opacity-50">
                                x${r.weekendMultiplier}
                            </span>
                        </td>
                        <td>
                            <button class="btn-glass-action bg-warning text-dark fw-bold border-warning" onclick="openEditPricingModal(${r.ruleId})">
                                <i class="fa-solid fa-pen-to-square"></i> Sửa
                            </button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger fw-bold"><i class="fa-solid fa-triangle-exclamation me-2"></i> Lỗi: ${result.message || 'Không thể lấy dữ liệu'}</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger fw-bold"><i class="fa-solid fa-server me-2"></i> Mất kết nối đến máy chủ NetBeans.</td></tr>`;
    }
};

window.openEditPricingModal = function (ruleId) {
    const rule = globalPricingRules.find(r => r.ruleId === ruleId);
    if (!rule) return;

    document.getElementById('editRuleId').value = rule.ruleId;
    document.getElementById('editBasePrice').value = rule.basePrice || 0;
    document.getElementById('editPricePerKm').value = rule.pricePerKm || 0;
    document.getElementById('editPricePerHour').value = rule.pricePerHour || 0;
    document.getElementById('editPricePerDay').value = rule.pricePerDay || 0;
    document.getElementById('editWeekendMultiplier').value = rule.weekendMultiplier || 1.0;

    const desc = document.getElementById('pricingRuleModalDesc');
    if (desc) desc.innerText = `Chỉnh sửa cấu hình giá [Loại Xe #${rule.vehicleTypeId} - ${rule.bookingType} - ${rule.tripDirection}]`;

    document.getElementById('editPricingRuleModal').classList.add('active');
};

window.closeEditPricingModal = function () {
    document.getElementById('editPricingRuleModal').classList.remove('active');
};

window.submitEditPricingRule = async function () {
    const ruleId = document.getElementById('editRuleId').value;
    const btn = document.getElementById('btnSubmitPricingRule');

    const bodyData = {
        basePrice: parseFloat(document.getElementById('editBasePrice').value) || 0,
        pricePerKm: parseFloat(document.getElementById('editPricePerKm').value) || 0,
        pricePerHour: parseFloat(document.getElementById('editPricePerHour').value) || 0,
        pricePerDay: parseFloat(document.getElementById('editPricePerDay').value) || 0,
        weekendMultiplier: parseFloat(document.getElementById('editWeekendMultiplier').value) || 1.0
    };

    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Đang lưu...';
    btn.disabled = true;

    const token = localStorage.getItem('accessToken');
    try {
        const response = await fetch(`http://localhost:8080/FleetFlow/api/v1/admin/pricing-rules/${ruleId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });

        const result = await response.json();
        if (result.success) {
            showSystemToast('Đã lưu Cấu Hình Giá thành công!', 'success');
            closeEditPricingModal();
            loadPricingRules(); // Tải lại bảng giá
        } else {
            showGlassAlert('Lỗi lưu Cấu hình giá: ' + result.message, 'error');
        }
    } catch (error) {
        showGlassAlert('Mất kết nối máy chủ!', 'error');
    } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
};

// Khởi chạy khi bấm vào Tab Giá Cước
document.addEventListener('DOMContentLoaded', () => {
    const pricingTabBtn = document.querySelector('a[href="#tab-pricing"]');
    if (pricingTabBtn) {
        pricingTabBtn.addEventListener('click', () => {
            loadPricingRules();
        });
    }

    const holidayTabBtn = document.querySelector('a[href="#tab-holiday"]');
    if (holidayTabBtn) {
        holidayTabBtn.addEventListener('click', () => {
            loadHolidays();
        });
    }
});

// ==========================================
// ADMIN HOLIDAY MANAGEMENT (QUẢN LÝ NGÀY LỄ)
// ==========================================
let globalHolidays = [];

window.loadHolidays = async function () {
    const tbody = document.getElementById("holidayListBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-white-50"><i class="fa-solid fa-spinner fa-spin me-2"></i>Đang tải dữ liệu...</td></tr>`;

    const token = localStorage.getItem('accessToken');
    try {
        const response = await fetch('http://localhost:8080/FleetFlow/api/v1/admin/holidays', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.success && result.data) {
            globalHolidays = result.data;
            let html = '';
            if (globalHolidays.length === 0) {
                html = `<tr><td colspan="4" class="text-center py-3 text-white-50">Chưa có ngày lễ nào.</td></tr>`;
            } else {
                globalHolidays.forEach(h => {
                    let formattedDate = h.holidayDate;
                    if (h.holidayDate && h.holidayDate.includes('-')) {
                        const parts = h.holidayDate.split('-');
                        if (parts.length >= 3) {
                            formattedDate = `${parts[2].substring(0, 2)}/${parts[1]}/${parts[0]}`;
                        }
                    }
                    html += `
                        <tr class="align-middle">
                            <td class="fw-bold text-white">#${h.holidayId}</td>
                            <td class="text-warning fw-semibold">${h.description}</td>
                            <td class="text-white">${formattedDate}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteHoliday(${h.holidayId})">
                                    <i class="fa-solid fa-trash-can"></i> Xóa
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }
            tbody.innerHTML = html;
        } else {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-danger fw-bold">Lỗi: ${result.message || 'Không thể lấy dữ liệu'}</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-danger fw-bold">Mất kết nối đến máy chủ.</td></tr>`;
    }
};

window.openAddHolidayModal = function () {
    document.getElementById('addHolidayDate').value = '';
    document.getElementById('addHolidayDesc').value = '';
    document.getElementById('addHolidayModal').classList.add('active');
};

window.closeAddHolidayModal = function () {
    document.getElementById('addHolidayModal').classList.remove('active');
};

window.submitAddHoliday = async function () {
    const dateInput = document.getElementById('addHolidayDate').value;
    const descInput = document.getElementById('addHolidayDesc').value;

    if (!dateInput || !descInput) {
        showGlassAlert("Vui lòng nhập đầy đủ ngày và tên ngày lễ!", "warning");
        return;
    }

    const btn = document.getElementById('btnSubmitHoliday');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Đang lưu...';
    btn.disabled = true;

    const token = localStorage.getItem('accessToken');
    try {
        const response = await fetch(`http://localhost:8080/FleetFlow/api/v1/admin/holidays`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ holidayDate: dateInput, description: descInput })
        });
        const result = await response.json();

        if (result.success) {
            showSystemToast('Đã thêm Ngày lễ mới thành công!', 'success');
            closeAddHolidayModal();
            loadHolidays();
        } else {
            showGlassAlert("Lỗi khi thêm ngày lễ: " + (result.message || "Unknown error"), "error");
        }
    } catch (err) {
        showGlassAlert("Lỗi kết nối máy chủ!", "error");
    } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
};

window.deleteHoliday = function (id) {
    showGlassConfirm(
        "Bạn có chắc chắn muốn xóa ngày lễ này không? Hành động này sẽ ảnh hưởng đến việc tính giá dịch vụ.",
        async () => {
            const token = localStorage.getItem('accessToken');
            try {
                const response = await fetch(`http://localhost:8080/FleetFlow/api/v1/admin/holidays/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await response.json();

                if (result.success) {
                    showSystemToast('Đã xóa ngày lễ thành công!', 'success');
                    loadHolidays();
                } else {
                    showGlassAlert("Lỗi khi xóa ngày lễ: " + (result.message || "Unknown error"), "error");
                }
            } catch (err) {
                showGlassAlert("Lỗi kết nối máy chủ!", "error");
            }
        },
        { title: "Xóa ngày lễ", confirmText: "Xóa ngay", type: "danger" }
    );
};
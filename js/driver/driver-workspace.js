/**
 * TỆP XỬ LÝ NGHIỆP VỤ CHÍNH CHO DRIVER WORKSPACE
 * Quản lý API Dashboard, Profile, Tab Switch và Chart
 */

const API_BASE = 'http://localhost:8080/FleetFlow/api/v1/driver';
let incomeChartInstance = null;
let isChartInitialized = false;

// Khởi tạo các thành phần giao diện khi trang tải xong
document.addEventListener("DOMContentLoaded", () => {
    // 1. Tải thông tin Profile (Tab Tài Khoản) ngầm định ngay khi vào trang
    fetchDriverProfile();

    // 2. Kiểm tra Cờ eKYC (Kế thừa từ base.js hoặc chạy riêng)
    const isEkycComplete = localStorage.getItem('isEkycComplete') === 'true';
    if (!isEkycComplete) {
        const warningToast = document.getElementById('ekycWarningToast');
        if (warningToast) warningToast.style.display = 'block';
    }

    // 3. Khởi tạo Toasts Bootstrap
    window.toastError = new bootstrap.Toast(document.getElementById("systemErrorToast"), { delay: 3000 });
    window.toastConflict = new bootstrap.Toast(document.getElementById("conflictToast"), { delay: 3000 });
});

/**
 * ---------------------------------------------------------
 * HÀM 1: GỌI API LẤY PROFILE TÀI XẾ (GET /profile)
 * ---------------------------------------------------------
 */
async function fetchDriverProfile() {
    const accountId = localStorage.getItem('accountId');
    if (!accountId) return;

    try {
        const response = await fetch(`${API_BASE}/profile?accountID=${accountId}`);
        const result = await response.json();

        if (result.success && result.data) {
            const data = result.data;
            
            // Cập nhật Tab Tài khoản
            const accName = document.getElementById('accDriverName');
            const accAvatar = document.getElementById('accDriverAvatar');
            const accRating = document.getElementById('accDriverRating');
            const accVehicle = document.getElementById('accDriverVehicle');

            if(accName) accName.innerText = data.fullName || 'Tài xế FleetFlow';
            if(accAvatar) accAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullName || 'Driver')}&background=1a1c1a&color=fff`;
            
            // Render Rating & Đánh giá
            if(accRating) {
                accRating.innerHTML = `<i class="fa-solid fa-star me-1"></i> ${data.averageRating || '5.0'} (${data.reviewCount || 0} đánh giá)`;
            }
            
            // Render Xe
            if(accVehicle) {
                accVehicle.innerHTML = `<i class="fa-solid fa-car me-1"></i> ${data.vehicleName || 'Đang cập nhật'} (${data.plateNumber || '...'})`;
            }

            // Đồng bộ lên Navbar Header
            const headerName = document.querySelector('.user-info-block .profile-name');
            if(headerName) headerName.innerText = data.fullName;
        }
    } catch (error) {
        console.error("Lỗi lấy Profile Tài xế:", error);
    }
}

/**
 * ---------------------------------------------------------
 * HÀM 2: GỌI API LẤY DASHBOARD (GET /dashboard)
 * ---------------------------------------------------------
 */
async function fetchDriverDashboard() {
    const accountId = localStorage.getItem('accountId');
    if (!accountId) {
        alert("Lỗi phiên làm việc: Không tìm thấy Account ID. Vui lòng đăng nhập lại.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/dashboard?accountID=${accountId}`);
        const result = await response.json();

        if (result.success && result.data) {
            const data = result.data;

            // 1. Cập nhật các con số tổng quan (KPIs)
            document.getElementById('dashNetIncome').innerText = (data.netIncome || 0).toLocaleString("vi-VN");
            document.getElementById('dashTotalTrips').innerText = data.totalTrips || 0;
            document.getElementById('dashBonus').innerText = (data.bonus || 0).toLocaleString("vi-VN");

            // 2. Vẽ bảng chi tiết giao dịch
            renderTransactionTable(data.transactions || []);

            // 3. Vẽ biểu đồ Chart.js
            if (data.chartData) {
                renderIncomeChart(data.chartData);
            }
        } else {
            console.warn("Không có dữ liệu Dashboard hoặc API trả về lỗi:", result.message);
        }
    } catch (error) {
        console.error("Lỗi lấy dữ liệu Dashboard:", error);
        window.toastError.show(); // Báo lỗi góc màn hình
    }
}

/**
 * ---------------------------------------------------------
 * HÀM 3: XỬ LÝ CHUYỂN TAB MƯỢT MÀ
 * ---------------------------------------------------------
 */
window.switchTab = function(tabId, element) {
    // Xóa active menu Desktop & Mobile
    document.querySelectorAll("#driver-nav .toc-link, .bottom-nav-glass .nav-item")
            .forEach(a => a.classList.remove("active"));
    
    // Gắn lại active
    if(element.classList.contains('toc-link')) {
        element.classList.add("active");
        document.querySelectorAll(`.bottom-nav-glass .nav-item`).forEach(a => { if(a.getAttribute("onclick").includes(tabId)) a.classList.add("active"); });
    } else {
        element.classList.add("active");
        document.querySelectorAll(`#driver-nav .toc-link`).forEach(a => { if(a.getAttribute("onclick").includes(tabId)) a.classList.add("active"); });
    }

    // Đổi Section Content
    document.querySelectorAll(".dashboard-section").forEach(sec => sec.classList.remove("active"));
    document.getElementById(tabId).classList.add("active");

    // XỬ LÝ GỌI API THEO TAB:
    if (tabId === "tab-income") {
        // Chỉ gọi API Dashboard khi người dùng bấm vào tab Thu Nhập để tiết kiệm tài nguyên
        fetchDriverDashboard();
    } else if (tabId === "tab-account") {
        fetchDriverProfile();
    }
};

/**
 * ---------------------------------------------------------
 * HELPER: VẼ BIỂU ĐỒ (DỮ LIỆU TỪ API)
 * ---------------------------------------------------------
 */
function renderIncomeChart(chartData) {
    const chartEl = document.getElementById("incomeChart");
    if (!chartEl) return;
    const ctx = chartEl.getContext("2d");
    
    // Hủy biểu đồ cũ nếu đã vẽ trước đó (để tránh lỗi ghi đè)
    if (incomeChartInstance) {
        incomeChartInstance.destroy();
    }

    let gradientBlue = ctx.createLinearGradient(0, 0, 0, 400);
    gradientBlue.addColorStop(0, "rgba(56, 189, 248, 0.8)");
    gradientBlue.addColorStop(1, "rgba(56, 189, 248, 0.2)");
    
    let gradientOrange = ctx.createLinearGradient(0, 0, 0, 400);
    gradientOrange.addColorStop(0, "rgba(251, 191, 36, 0.8)");
    gradientOrange.addColorStop(1, "rgba(251, 191, 36, 0.2)");

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
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: { position: "top", align: "end", labels: { color: "#ffffff", usePointStyle: true, boxWidth: 10, padding: 20, font: { family: "Inter", weight: "600" } } },
                tooltip: { backgroundColor: "rgba(0,0,0,0.8)", titleFont: { family: "Inter", size: 14 }, bodyFont: { family: "Inter", size: 13 }, padding: 12, cornerRadius: 8 },
            },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { font: { family: "Inter", weight: "600" }, color: "rgba(255,255,255,0.7)" } },
                y: { stacked: true, border: { display: false }, grid: { color: "rgba(255,255,255,0.1)" }, ticks: { font: { family: "Inter" }, color: "rgba(255,255,255,0.5)", callback: function (value) { return value.toLocaleString("vi-VN") + " đ"; } } },
            },
        },
    });
}

/**
 * ---------------------------------------------------------
 * HELPER: VẼ BẢNG GIAO DỊCH
 * ---------------------------------------------------------
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
        // Tùy chỉnh màu sắc dựa theo loại giao dịch
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

/**
 * ---------------------------------------------------------
 * XỬ LÝ NHẬN CHUYẾN (MOCK GIAO DIỆN)
 * ---------------------------------------------------------
 */
window.acceptJob = function(btnElement, cardId, scenario) {
    const originalText = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang tải...';

    setTimeout(() => {
        if (scenario === "error409") {
            removeCardSmoothly(document.getElementById(cardId));
            if (window.toastConflict) window.toastConflict.show();
        } else if (scenario === "error500") {
            btnElement.disabled = false;
            btnElement.innerHTML = originalText;
            if (window.toastError) window.toastError.show();
        } else if (scenario === "success") {
            removeCardSmoothly(document.getElementById(cardId));
            const sm = new bootstrap.Modal(document.getElementById("successModal"));
            sm.show();
        }
    }, 1200);
}

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
                document.getElementById("emptyState").style.display = "block";
            }
        }, 400);
    }
}
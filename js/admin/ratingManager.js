/**
 * ratingManager.js - Quản lý Đánh giá Chất lượng Dịch vụ (Admin Workspace)
 * Tích hợp API GET /api/v1/admin/ratings
 * Quy chuẩn 4 Màu: Slate Dark (#1a1e29), Apple Gold (#ffde59), Clean White (#ffffff), Alert Red (#ef4444)
 */

const ADMIN_RATINGS_API_URL = 'http://localhost:8080/FleetFlow/api/v1/admin/ratings';

let currentRatingType = 'customer'; // 'customer' hoặc 'driver'
let isLowOnlyFilter = false;
let currentFilterDriverId = null;
let allRatingsData = [];
let allDriverQualityList = [];
let ratingDistributionChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    // Tải dữ liệu ban đầu nếu đang ở tab reports
    const activeLink = document.querySelector(".toc-link.active");
    if (activeLink && activeLink.getAttribute("href") === "#tab-reports") {
        fetchAdminRatings();
    }
});

/**
 * Gọi API GET /api/v1/admin/ratings với các bộ lọc hiện tại
 */
async function fetchAdminRatings(customDriverId = undefined) {
    if (customDriverId !== undefined) {
        currentFilterDriverId = customDriverId;
    }

    const summaryContainer = document.getElementById('ratingSummaryKPIs');
    const leaderboardBody = document.getElementById('driverQualityLeaderboardBody');
    const ratingsTableBody = document.getElementById('ratingsDetailTableBody');

    // Hiển thị trạng thái loading
    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div class="col-12 text-center py-4">
                <div style="color: rgba(255, 255, 255, 0.6);">Đang tổng hợp số liệu đánh giá chất lượng...</div>
            </div>`;
    }
    if (leaderboardBody) {
        leaderboardBody.innerHTML = `<tr><td colspan="7" class="text-center py-4" style="color: rgba(255, 255, 255, 0.5);">Đang tải bảng xếp hạng tài xế...</td></tr>`;
    }
    if (ratingsTableBody) {
        ratingsTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-5" style="color: rgba(255, 255, 255, 0.5);">Đang tải chi tiết phản hồi...</td></tr>`;
    }

    try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            if (ratingsTableBody) ratingsTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4" style="color: #ef4444;">Chưa đăng nhập quyền Admin.</td></tr>`;
            return;
        }

        const params = new URLSearchParams();
        params.append('type', currentRatingType);
        if (isLowOnlyFilter) {
            params.append('lowOnly', 'true');
        }
        if (currentFilterDriverId !== null && currentFilterDriverId !== '') {
            params.append('driverId', currentFilterDriverId);
        }

        const fromDateEl = document.getElementById('ratingFromDate');
        const toDateEl = document.getElementById('ratingToDate');
        if (fromDateEl && fromDateEl.value) params.append('fromDate', fromDateEl.value);
        if (toDateEl && toDateEl.value) params.append('toDate', toDateEl.value);

        const url = `${ADMIN_RATINGS_API_URL}?${params.toString()}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            allRatingsData = result.data || [];
            allDriverQualityList = result.driverQuality || [];

            renderRatingSummary(result.summary || {}, result.type);
            renderRatingDistributionChart(allRatingsData, result.type);
            renderDriverQualityLeaderboard(allDriverQualityList);
            renderRatingsTable(allRatingsData, result.type);
            updateActiveDriverFilterNotice();
        } else {
            const errMsg = result.error || result.message || "Không thể tải số liệu đánh giá";
            if (ratingsTableBody) ratingsTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4" style="color: #ef4444;">${errMsg}</td></tr>`;
            if (window.showGlassAlert) window.showGlassAlert(errMsg, 'error');
        }
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu rating:", error);
        if (ratingsTableBody) ratingsTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4" style="color: #ef4444;">Lỗi kết nối máy chủ khi tải báo cáo đánh giá.</td></tr>`;
    }
}

/**
 * Chuyển đổi giữa chế độ Khách hàng đánh giá và Tài xế đánh giá
 */
function switchRatingType(type) {
    if (currentRatingType === type) return;
    currentRatingType = type;

    const btnCustomer = document.getElementById('btnTypeCustomer');
    const btnDriver = document.getElementById('btnTypeDriver');

    if (btnCustomer && btnDriver) {
        if (type === 'customer') {
            btnCustomer.classList.add('active', 'fw-bold');
            btnCustomer.style.background = '#ffde59';
            btnCustomer.style.color = '#1a1e29';
            btnDriver.classList.remove('active', 'fw-bold');
            btnDriver.style.background = 'transparent';
            btnDriver.style.color = 'rgba(255, 255, 255, 0.7)';
        } else {
            btnDriver.classList.add('active', 'fw-bold');
            btnDriver.style.background = '#ffde59';
            btnDriver.style.color = '#1a1e29';
            btnCustomer.classList.remove('active', 'fw-bold');
            btnCustomer.style.background = 'transparent';
            btnCustomer.style.color = 'rgba(255, 255, 255, 0.7)';
        }
    }

    // Cập nhật tiêu đề bảng chi tiết & Ẩn/hiện Bảng xếp hạng tài xế
    const headerTitle = document.getElementById('ratingTableHeaderTitle');
    if (headerTitle) {
        if (type === 'customer') {
            headerTitle.innerHTML = `Khách hàng Đánh giá Tài xế & Xe`;
        } else {
            headerTitle.innerHTML = `Tài xế Đánh giá Khách hàng`;
        }
    }

    const leaderboardSection = document.getElementById('driverQualityLeaderboardSection');
    if (leaderboardSection) {
        leaderboardSection.style.display = (type === 'customer') ? 'block' : 'none';
    }

    fetchAdminRatings();
}

/**
 * Bật/tắt bộ lọc chỉ xem phản hồi thấp (<= 2 sao)
 */
function toggleLowOnlyFilter(checkboxEl) {
    isLowOnlyFilter = checkboxEl ? checkboxEl.checked : !isLowOnlyFilter;
    fetchAdminRatings();
}

/**
 * Lọc riêng đánh giá theo một tài xế từ bảng xếp hạng
 */
function filterByDriverQuality(driverId, driverName) {
    currentFilterDriverId = driverId;
    fetchAdminRatings(driverId);
    if (window.showGlassAlert) {
        window.showGlassAlert(`Đang lọc đánh giá tài xế: ${driverName || '#' + driverId}`, 'info');
    }
}

/**
 * Đặt lại toàn bộ bộ lọc
 */
function resetRatingFilters() {
    isLowOnlyFilter = false;
    currentFilterDriverId = null;
    const lowCheckbox = document.getElementById('checkLowOnly');
    if (lowCheckbox) lowCheckbox.checked = false;

    const fromDateEl = document.getElementById('ratingFromDate');
    const toDateEl = document.getElementById('ratingToDate');
    if (fromDateEl) fromDateEl.value = '';
    if (toDateEl) toDateEl.value = '';

    fetchAdminRatings(null);
}

function updateActiveDriverFilterNotice() {
    const noticeEl = document.getElementById('activeDriverFilterNotice');
    if (!noticeEl) return;

    if (currentFilterDriverId !== null && currentFilterDriverId !== '') {
        const driverObj = allDriverQualityList.find(d => d.driverId == currentFilterDriverId);
        const nameText = driverObj ? `${driverObj.driverName} (#${currentFilterDriverId})` : `#${currentFilterDriverId}`;
        noticeEl.innerHTML = `
            <div class="d-inline-flex align-items-center px-3 py-2 rounded-pill shadow-sm" style="background: rgba(255, 222, 89, 0.15); color: #ffde59; border: 1px solid rgba(255, 222, 89, 0.4);">
                <span>Đang lọc theo tài xế: <strong style="color: #ffffff;">${nameText}</strong></span>
                <button type="button" class="btn-close ms-2 btn-close-white" style="font-size: 0.65rem;" onclick="resetRatingFilters()"></button>
            </div>`;
        noticeEl.style.display = 'block';
    } else {
        noticeEl.style.display = 'none';
        noticeEl.innerHTML = '';
    }
}

/**
 * Render 4 thẻ KPI Thống Kê Tổng Quan (Tối giản Icon - 4 Màu)
 */
function renderRatingSummary(summary, type) {
    const container = document.getElementById('ratingSummaryKPIs');
    if (!container) return;

    const total = summary.totalRatings || 0;
    const lowCount = summary.lowRatingCount || 0;

    let kpi2Label = "Điểm TB Tài xế";
    let kpi2Value = summary.averageDriverRating ? Number(summary.averageDriverRating).toFixed(2) : "0.00";

    let kpi3Label = "Điểm TB Xe";
    let kpi3Value = summary.averageCarRating ? Number(summary.averageCarRating).toFixed(2) : "0.00";

    if (type === 'driver') {
        kpi2Label = "Điểm TB Khách hàng";
        kpi2Value = summary.averageCustomerRating ? Number(summary.averageCustomerRating).toFixed(2) : "0.00";

        kpi3Label = "Tỷ lệ Hài lòng";
        const satisfactionRate = total > 0 ? (((total - lowCount) / total) * 100).toFixed(1) + "%" : "100%";
        kpi3Value = satisfactionRate;
    }

    const lowCardBg = lowCount > 0 ? "rgba(239, 68, 68, 0.18)" : "rgba(255, 255, 255, 0.15)";
    const lowCardBorder = lowCount > 0 ? "#ef4444" : "rgba(255, 255, 255, 0.12)";
    const lowTextClass = lowCount > 0 ? "color: #ef4444; font-weight: bold;" : "color: #ffffff; font-weight: bold;";

    container.innerHTML = `
        <div class="col-6 col-md-3">
            <div class="p-3 rounded-4 h-100 d-flex align-items-center justify-content-between" style="background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.25);">
                <div>
                    <span class="small d-block" style="color: rgba(255, 255, 255, 0.6);">Tổng lượt đánh giá</span>
                    <h3 class="fw-bold mb-0 mt-1" style="color: #ffffff;">${total.toLocaleString('vi-VN')}</h3>
                </div>
                <span style="color: #ffde59; font-size: 1.5rem; font-weight: 800;">★</span>
            </div>
        </div>

        <div class="col-6 col-md-3">
            <div class="p-3 rounded-4 h-100 d-flex align-items-center justify-content-between" style="background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.25);">
                <div>
                    <span class="small d-block" style="color: rgba(255, 255, 255, 0.6);">${kpi2Label}</span>
                    <h3 class="fw-bold mb-0 mt-1" style="color: #ffffff;">${kpi2Value} <span class="fs-6" style="color: #ffde59;">★</span></h3>
                </div>
                <span style="color: #ffde59; font-size: 1.5rem; font-weight: 800;">★</span>
            </div>
        </div>

        <div class="col-6 col-md-3">
            <div class="p-3 rounded-4 h-100 d-flex align-items-center justify-content-between" style="background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.25);">
                <div>
                    <span class="small d-block" style="color: rgba(255, 255, 255, 0.6);">${kpi3Label}</span>
                    <h3 class="fw-bold mb-0 mt-1" style="color: #ffffff;">${kpi3Value} ${type === 'driver' ? '' : '<span class="fs-6" style="color: #ffde59;">★</span>'}</h3>
                </div>
                <span style="color: #ffde59; font-size: 1.5rem; font-weight: 800;">★</span>
            </div>
        </div>

        <div class="col-6 col-md-3">
            <div class="p-3 rounded-4 h-100 d-flex align-items-center justify-content-between" style="background: ${lowCardBg}; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid ${lowCardBorder}; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.25);">
                <div>
                    <span class="small d-block" style="color: rgba(255, 255, 255, 0.6);">Phản hồi thấp (≤ 2 ★)</span>
                    <h3 class="mb-0 mt-1" style="${lowTextClass}">${lowCount.toLocaleString('vi-VN')}</h3>
                </div>
                <span style="color: #ef4444; font-size: 1.5rem; font-weight: 800;">!</span>
            </div>
        </div>
    `;
}

/**
 * Render Biểu đồ Phân bổ Điểm số (Chart.js)
 */
function renderRatingDistributionChart(data, type) {
    const ctx = document.getElementById('ratingDistributionChart');
    if (!ctx || typeof Chart === 'undefined') return;

    if (ratingDistributionChartInstance) {
        ratingDistributionChartInstance.destroy();
        ratingDistributionChartInstance = null;
    }

    const counts = [0, 0, 0, 0, 0]; // 1★, 2★, 3★, 4★, 5★
    if (data && data.length > 0) {
        data.forEach(item => {
            const score = Number(type === 'customer' ? item.driverRating : item.customerRating) || 0;
            if (score >= 1 && score <= 5) {
                counts[score - 1]++;
            }
        });
    }

    ratingDistributionChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['1 ★ (Rất tệ)', '2 ★ (Kém)', '3 ★ (Trung bình)', '4 ★ (Tốt)', '5 ★ (Tuyệt vời)'],
            datasets: [{
                label: 'Số lượng phản hồi',
                data: counts,
                backgroundColor: [
                    '#ef4444', // 1★ Red
                    '#ef4444', // 2★ Red
                    'rgba(255, 255, 255, 0.6)', // 3★ White
                    '#ffde59', // 4★ Gold
                    '#ffde59'  // 5★ Gold
                ],
                borderColor: [
                    '#ef4444',
                    '#ef4444',
                    '#ffffff',
                    '#ffde59',
                    '#ffde59'
                ],
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1a1e29',
                    titleColor: '#ffde59',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#ffffff', font: { weight: 'bold' } }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: 'rgba(255, 255, 255, 0.7)', stepSize: 1 },
                    grid: { color: 'rgba(255, 255, 255, 0.08)' }
                }
            }
        }
    });
}

/**
 * Render Bảng xếp hạng cảnh báo Tài xế (driverQuality)
 */
function renderDriverQualityLeaderboard(driverQuality) {
    const leaderboardSection = document.getElementById('driverQualityLeaderboardSection');
    if (leaderboardSection) {
        leaderboardSection.style.display = (currentRatingType === 'customer') ? 'block' : 'none';
    }

    const tbody = document.getElementById('driverQualityLeaderboardBody');
    if (!tbody) return;

    if (!driverQuality || driverQuality.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4" style="color: rgba(255, 255, 255, 0.5);">Chưa có dữ liệu xếp hạng tài xế.</td></tr>`;
        return;
    }

    let html = '';
    driverQuality.forEach((d, index) => {
        const avgDriver = d.avgDriverRating ? Number(d.avgDriverRating).toFixed(2) : "N/A";
        const avgCar = d.avgCarRating ? Number(d.avgCarRating).toFixed(2) : "N/A";
        const lowCount = d.lowRatingCount || 0;
        const totalCount = d.ratingCount || 0;

        let rowStyle = '';
        let badgeQuality = '<span class="badge" style="background: rgba(255, 255, 255, 0.15); color: #ffffff;">Xuất sắc</span>';

        if (avgDriver !== "N/A" && Number(avgDriver) <= 3.5 || lowCount > 0) {
            if (Number(avgDriver) <= 2.8 || lowCount >= 2) {
                rowStyle = 'style="background: rgba(239, 68, 68, 0.12); border-left: 4px solid #ef4444;"';
                badgeQuality = '<span class="badge" style="background: #ef4444; color: #ffffff;">Cảnh báo đỏ</span>';
            } else {
                rowStyle = 'style="background: rgba(255, 222, 89, 0.08); border-left: 4px solid #ffde59;"';
                badgeQuality = '<span class="badge" style="background: #ffde59; color: #1a1e29; font-weight: bold;">Cần theo dõi</span>';
            }
        }

        const isFiltered = currentFilterDriverId == d.driverId;
        const filterBtnStyle = isFiltered ? "background: #ffde59; color: #1a1e29; font-weight: bold;" : "background: rgba(255, 255, 255, 0.08); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.15);";

        html += `
        <tr ${rowStyle}>
            <td class="text-center fw-bold" style="color: rgba(255, 255, 255, 0.5);">${index + 1}</td>
            <td>
                <div class="fw-bold" style="color: #ffffff;">${d.driverName || 'N/A'}</div>
                <div class="small" style="color: rgba(255, 255, 255, 0.5);">ID: #${d.driverId}</div>
            </td>
            <td class="text-center">
                <span class="fw-bold fs-6" style="color: ${Number(avgDriver) < 4 ? '#ffde59' : '#ffffff'};">${avgDriver} ★</span>
            </td>
            <td class="text-center">
                <span class="fw-semibold" style="color: #ffffff;">${avgCar} ★</span>
            </td>
            <td class="text-center" style="color: #ffffff;">${totalCount}</td>
            <td class="text-center">
                ${lowCount > 0 ? `<span class="badge rounded-pill px-3 py-1 fw-bold" style="background: #ef4444; color: #ffffff;">${lowCount}</span>` : `<span style="color: rgba(255, 255, 255, 0.5);">0</span>`}
            </td>
            <td class="text-center">
                <div class="d-flex align-items-center justify-content-center gap-2">
                    ${badgeQuality}
                    <button type="button" class="btn btn-sm rounded-circle p-1 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; ${filterBtnStyle}" onclick="filterByDriverQuality(${d.driverId}, '${(d.driverName || '').replace(/'/g, "\\'")}')" title="Lọc xem riêng tài xế">
                        ▼
                    </button>
                </div>
            </td>
        </tr>`;
    });

    tbody.innerHTML = html;
}

/**
 * Render Bảng Chi Tiết Đánh Giá (Tối giản: Ẩn Nhận xét & Thời gian khỏi bảng)
 */
function renderRatingsTable(data, type) {
    const tbody = document.getElementById('ratingsDetailTableBody');
    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-5" style="color: rgba(255, 255, 255, 0.5);">Không có phản hồi nào phù hợp với bộ lọc hiện tại.</td></tr>`;
        return;
    }

    let html = '';
    data.forEach(item => {
        if (type === 'customer') {
            const driverRating = item.driverRating || 0;
            const carRating = item.carRating || 0;
            const isLow = driverRating <= 2 || carRating <= 2;

            html += `
            <tr ${isLow ? 'style="background: rgba(239, 68, 68, 0.1);"' : ''}>
                <td class="text-center fw-bold" style="color: #ffde59;">#${item.bookingId}</td>
                <td>
                    <div class="fw-bold" style="color: #ffffff;">${item.customerName || 'Khách hàng'}</div>
                    <div class="small" style="color: rgba(255, 255, 255, 0.5);">ID: #${item.customerId}</div>
                </td>
                <td>
                    <div class="fw-semibold" style="color: #ffffff;">${item.driverName || 'N/A'} <span class="small" style="color: rgba(255, 255, 255, 0.5);">(#${item.driverId || '?'})</span></div>
                    <div class="small" style="color: rgba(255, 255, 255, 0.7);">Xe: ${item.vehicleName || 'Không rõ'} <span class="badge ms-1" style="background: rgba(255, 255, 255, 0.15); color: #ffffff;">${item.licensePlate || ''}</span></div>
                </td>
                <td class="text-center">
                    <span class="badge px-2 py-1" style="background: ${isLow ? '#ef4444' : '#ffde59'}; color: ${isLow ? '#ffffff' : '#1a1e29'}; font-weight: bold;">
                        PV: ${driverRating}★ | Xe: ${carRating}★
                    </span>
                </td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm rounded-pill px-3 py-1 fw-bold" style="background: rgba(255, 255, 255, 0.1); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.2);" onclick="openRatingDetailModal(${item.ratingId})">
                        Xem chi tiết
                    </button>
                </td>
            </tr>`;
        } else {
            const customerRating = item.customerRating || 0;
            const isLow = customerRating <= 2;

            html += `
            <tr ${isLow ? 'style="background: rgba(239, 68, 68, 0.1);"' : ''}>
                <td class="text-center fw-bold" style="color: #ffde59;">#${item.bookingId}</td>
                <td>
                    <div class="fw-bold" style="color: #ffffff;">${item.driverName || 'Tài xế'}</div>
                    <div class="small" style="color: rgba(255, 255, 255, 0.5);">ID: #${item.driverId || '?'}</div>
                </td>
                <td>
                    <div class="fw-bold" style="color: #ffffff;">${item.customerName || 'Khách hàng'}</div>
                    <div class="small" style="color: rgba(255, 255, 255, 0.5);">ID: #${item.customerId}</div>
                </td>
                <td class="text-center">
                    <span class="badge px-3 py-1" style="background: ${isLow ? '#ef4444' : '#ffde59'}; color: ${isLow ? '#ffffff' : '#1a1e29'}; font-weight: bold;">
                        ${customerRating} ★
                    </span>
                </td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm rounded-pill px-3 py-1 fw-bold" style="background: rgba(255, 255, 255, 0.1); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.2);" onclick="openRatingDetailModal(${item.ratingId})">
                        Xem chi tiết
                    </button>
                </td>
            </tr>`;
        }
    });

    tbody.innerHTML = html;
}

/**
 * Helper: Tạo chuỗi 5 ngôi sao trực quan (Gold + Gray stars) & Nhãn trạng thái
 */
function renderStarScoreVisual(score) {
    const num = Number(score) || 0;
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= num) {
            starsHtml += `<span style="color: #ffde59; font-size: 1.25rem;">★</span>`;
        } else {
            starsHtml += `<span style="color: rgba(255, 255, 255, 0.2); font-size: 1.25rem;">★</span>`;
        }
    }

    let badgeClass = '';
    let statusText = '';
    if (num <= 2) {
        badgeClass = 'background: #ef4444; color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.3);';
        statusText = '⚠ CẢNH BÁO / KHÔNG HÀI LÒNG';
    } else if (num === 3) {
        badgeClass = 'background: rgba(255, 222, 89, 0.2); color: #ffde59; border: 1px solid #ffde59;';
        statusText = 'Bình thường / Chấp nhận được';
    } else if (num === 4) {
        badgeClass = 'background: rgba(255, 255, 255, 0.15); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.3);';
        statusText = 'Tốt / Hài lòng';
    } else {
        badgeClass = 'background: #ffde59; color: #1a1e29; font-weight: 800;';
        statusText = '★ Xuất sắc / Tuyệt vời';
    }

    return {
        starsHtml,
        statusBadgeHtml: `<span class="badge px-3 py-1 rounded-pill" style="${badgeClass}; font-size: 0.78rem;">${statusText}</span>`
    };
}

/**
 * Mở Modal Xem Chi Tiết Đánh Giá (#ratingDetailModal)
 */
function openRatingDetailModal(ratingId) {
    const item = allRatingsData.find(r => r.ratingId == ratingId);
    if (!item) {
        if (window.showGlassAlert) window.showGlassAlert("Không tìm thấy dữ liệu đánh giá chi tiết.", "error");
        return;
    }

    const titleEl = document.getElementById('modalRatingTitle');
    const timeEl = document.getElementById('modalRatingTime');
    const bookingTypeBadgeEl = document.getElementById('modalBookingTypeBadge');
    const reviewerNameEl = document.getElementById('modalReviewerName');
    const reviewerRoleEl = document.getElementById('modalReviewerRole');
    const reviewerIconEl = document.getElementById('modalReviewerIcon');
    const targetNameEl = document.getElementById('modalTargetName');
    const targetDetailEl = document.getElementById('modalTargetDetail');
    const targetIconEl = document.getElementById('modalTargetIcon');
    const scoresContainer = document.getElementById('modalScoresContainer');
    const commentBoxEl = document.getElementById('modalRatingCommentBox');
    const commentEl = document.getElementById('modalRatingComment');
    const ratingIdFootEl = document.getElementById('modalRatingIdFoot');
    const headerIconBoxEl = document.getElementById('modalHeaderIconBox');

    // 1. Cập nhật Header & Booking Type
    if (titleEl) titleEl.innerText = `Chi Tiết Đánh Giá Chuyến #${item.bookingId || 'N/A'}`;
    if (timeEl) timeEl.innerText = `Thời gian phản hồi: ${item.createdAt ? item.createdAt.substring(0, 16) : 'N/A'}`;
    if (ratingIdFootEl) ratingIdFootEl.innerText = `Rating ID: #${item.ratingId || 'N/A'}`;

    if (bookingTypeBadgeEl) {
        if (item.bookingType) {
            bookingTypeBadgeEl.style.display = 'inline-block';
            bookingTypeBadgeEl.innerText = item.bookingType.replace('_', ' ');
        } else {
            bookingTypeBadgeEl.style.display = 'none';
        }
    }

    // 2. Kiểm tra mức điểm thấp nhất để đổ màu cảnh báo cho Header Box & Comment Box
    const minScore = currentRatingType === 'customer' 

        ? Math.min(Number(item.driverRating || 5), Number(item.carRating || 5))
        : Number(item.customerRating || 5);

    if (minScore <= 2) {
        if (headerIconBoxEl) {
            headerIconBoxEl.style.background = 'rgba(239, 68, 68, 0.2)';
            headerIconBoxEl.style.color = '#ef4444';
            headerIconBoxEl.style.borderColor = '#ef4444';
        }
        if (commentBoxEl) {
            commentBoxEl.style.background = 'rgba(239, 68, 68, 0.12)';
            commentBoxEl.style.border = '1px solid #ef4444';
        }
    } else {
        if (headerIconBoxEl) {
            headerIconBoxEl.style.background = 'rgba(255, 222, 89, 0.15)';
            headerIconBoxEl.style.color = '#ffde59';
            headerIconBoxEl.style.borderColor = 'rgba(255, 222, 89, 0.3)';
        }
        if (commentBoxEl) {
            commentBoxEl.style.background = 'rgba(255, 255, 255, 0.06)';
            commentBoxEl.style.border = '1px solid rgba(255, 255, 255, 0.12)';
        }
    }

    // 3. Đổ dữ liệu Khối 1 & Khối 2 theo chế độ
    if (currentRatingType === 'customer') {
        // Khách hàng đánh giá Tài xế & Xe
        if (reviewerIconEl) reviewerIconEl.innerText = '👤';
        if (reviewerNameEl) reviewerNameEl.innerText = item.customerName || 'Khách hàng';
        if (reviewerRoleEl) reviewerRoleEl.innerText = `Khách hàng | ID: #${item.customerId}`;

        if (targetIconEl) targetIconEl.innerText = '🚖';
        if (targetNameEl) targetNameEl.innerText = item.driverName || 'Tài xế không xác định';
        const carInfo = item.vehicleName ? `${item.vehicleName} (${item.licensePlate || 'N/A'})` : (item.licensePlate || 'Chưa rõ phương tiện');
        if (targetDetailEl) targetDetailEl.innerText = `Tài xế #${item.driverId || '?'} | Phương tiện: ${carInfo}`;

        if (scoresContainer) {
            const driverVis = renderStarScoreVisual(item.driverRating);
            const carVis = renderStarScoreVisual(item.carRating);

            scoresContainer.innerHTML = `
                <div class="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center pb-2 border-bottom border-light border-opacity-10 gap-2">
                    <div class="d-flex align-items-center gap-3">
                        <span class="badge rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 36px; height: 36px; background: rgba(255, 255, 255, 0.1); font-size: 1rem;">🧑‍✈️</span>
                        <div>
                            <div class="fw-bold" style="color: #ffffff;">Điểm Phục Vụ & Thái Độ Tài Xế</div>
                            <div class="small" style="color: rgba(255, 255, 255, 0.5);">Đánh giá sự chuyên nghiệp, đúng giờ, thân thiện</div>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-3">
                        <div class="d-flex align-items-center gap-1">${driverVis.starsHtml}</div>
                        <span class="fw-bold fs-5 font-monospace" style="color: #ffde59; min-width: 40px; text-align: right;">${item.driverRating || 0}/5</span>
                        ${driverVis.statusBadgeHtml}
                    </div>
                </div>
                <div class="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center pt-1 gap-2">
                    <div class="d-flex align-items-center gap-3">
                        <span class="badge rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 36px; height: 36px; background: rgba(255, 255, 255, 0.1); font-size: 1rem;">🚘</span>
                        <div>
                            <div class="fw-bold" style="color: #ffffff;">Điểm Chất Lượng & Vệ Sinh Xe</div>
                            <div class="small" style="color: rgba(255, 255, 255, 0.5);">Đánh giá độ êm ái, sạch sẽ, tiện nghi trên xe</div>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-3">
                        <div class="d-flex align-items-center gap-1">${carVis.starsHtml}</div>
                        <span class="fw-bold fs-5 font-monospace" style="color: #ffde59; min-width: 40px; text-align: right;">${item.carRating || 0}/5</span>
                        ${carVis.statusBadgeHtml}
                    </div>
                </div>
            `;
        }
    } else {
        // Tài xế đánh giá Khách hàng
        if (reviewerIconEl) reviewerIconEl.innerText = '🧑‍✈️';
        if (reviewerNameEl) reviewerNameEl.innerText = item.driverName || 'Tài xế';
        if (reviewerRoleEl) reviewerRoleEl.innerText = `Tài xế | ID: #${item.driverId || '?'}`;

        if (targetIconEl) targetIconEl.innerText = '👤';
        if (targetNameEl) targetNameEl.innerText = item.customerName || 'Khách hàng';
        if (targetDetailEl) targetDetailEl.innerText = `Khách hàng | ID: #${item.customerId}`;

        if (scoresContainer) {
            const custVis = renderStarScoreVisual(item.customerRating);
            scoresContainer.innerHTML = `
                <div class="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
                    <div class="d-flex align-items-center gap-3">
                        <span class="badge rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 36px; height: 36px; background: rgba(255, 255, 255, 0.1); font-size: 1rem;">🤝</span>
                        <div>
                            <div class="fw-bold" style="color: #ffffff;">Điểm Ý Thức & Hợp Tác Khách Hàng</div>
                            <div class="small" style="color: rgba(255, 255, 255, 0.5);">Đánh giá sự đúng giờ, lịch sự, tôn trọng tài xế</div>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-3">
                        <div class="d-flex align-items-center gap-1">${custVis.starsHtml}</div>
                        <span class="fw-bold fs-5 font-monospace" style="color: #ffde59; min-width: 40px; text-align: right;">${item.customerRating || 0}/5</span>
                        ${custVis.statusBadgeHtml}
                    </div>
                </div>
            `;
        }
    }

    // 4. Nội dung nhận xét
    if (commentEl) {
        const commentText = item.comment ? item.comment.trim() : '';
        if (commentText) {
            commentEl.style.color = minScore <= 2 ? '#ef4444' : '#ffffff';
            commentEl.style.fontWeight = minScore <= 2 ? 'bold' : 'normal';
            commentEl.innerText = minScore <= 2 ? `[⚠ CÁC VẤN ĐỀ ĐƯỢC GÓP Ý]\n${commentText}` : commentText;
        } else {
            commentEl.style.color = 'rgba(255, 255, 255, 0.4)';
            commentEl.style.fontWeight = 'normal';
            commentEl.innerText = "(Người đánh giá không để lại lời bình bằng văn bản cho chuyến đi này)";
        }
    }

    // 5. Hiển thị modal
    const modalEl = document.getElementById('ratingDetailModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        const bsModal = new bootstrap.Modal(modalEl);
        bsModal.show();
    }
}



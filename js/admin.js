/**
 * FleetFlow - Master Admin Workspace Core Engine
 * Architecture: Liquid Glass Interactive Controller & Data Visualization
 */

document.addEventListener("DOMContentLoaded", function () {
    // 🚀 BẬT CHỐT CHẶN VÀ ĐỒNG BỘ NAVBAR ĐẦU TIÊN
    if (!initAdminSession()) return; 

    fetchAndRenderEkycQueue();

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
        
        // Tịnh tiến khối kính và co giãn chiều cao tương thích với mục lục tương tự Dispatcher
        verticalIndicator.style.transform = `translateY(${topPos}px)`;
        verticalIndicator.style.height = `${linkRect.height}px`;
    }

    // Khởi tạo vị trí thanh kính trượt ban đầu sau khi layout ổn định
    const initialActiveLink = document.querySelector(".toc-link.active");
    if (initialActiveLink) {
        setTimeout(() => updateVerticalIndicator(initialActiveLink), 150);
    }

    // Đăng ký sự kiện click chuyển tab Single-Page mượt mà
    tocLinks.forEach(link => {
        link.addEventListener("click", function (e) {
            // Chỉ chặn sự kiện nếu href liên kết đến tab ID nội bộ
            if (this.getAttribute("href").startsWith("#")) {
                e.preventDefault();
                
                if (this.classList.contains("active")) return;
                
                // Cập nhật trạng thái Active trên Sidebar
                tocLinks.forEach(l => l.classList.remove("active"));
                this.classList.add("active");
                updateVerticalIndicator(this);
                
                // Trượt và hoán đổi hiển thị các Section nội dung chính
                const targetId = this.getAttribute("href").substring(1);
                sections.forEach(section => {
                    section.classList.remove("active");
                });
                
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.classList.add("active");
                    // Cuộn nhẹ nhàng lên đỉnh nội dung làm việc mới
                    window.scrollTo({ top: 0, behavior: "smooth" });
                }
            }
        });
    });

    // Tự động căn chỉnh lại thanh kính trượt khi resize màn hình
    window.addEventListener("resize", () => {
        const currentActiveSidebar = document.querySelector(".toc-link.active");
        if (currentActiveSidebar) updateVerticalIndicator(currentActiveSidebar);
    });

    // === 2. XỬ LÝ ĐỔI TRẠNG THÁI NAVBAR KHI SCROLL (IS-SCROLLED) ===
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

    // === 3. KHỞI TẠO HỆ THỐNG BIỂU ĐỒ DATA VISUALIZATION (CHART.JS Premium) ===
    // Định hình font và màu sắc chung hòa hợp với theme kính tối
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = "rgba(255, 255, 255, 0.7)";
    Chart.defaults.scale.grid.color = "rgba(255, 255, 255, 0.08)";

    // 3.1 Biểu đồ doanh thu (Revenue Chart) - Khuếch tán vệt sáng Neon
    const ctxRevenue = document.getElementById("revenueChart");
    if (ctxRevenue) {
        new Chart(ctxRevenue, {
            type: "line",
            data: {
                labels: Array.from({length: 15}, (_, i) => `Ngày ${i*2 + 1}`),
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
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
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

    // 3.2 Biểu đồ trạng thái chuyến đi (Status Chart) - Doughnut Ring khuyết kính
    const ctxStatus = document.getElementById("statusChart");
    if (ctxStatus) {
        new Chart(ctxStatus, {
            type: "doughnut",
            data: {
                labels: ["Hoàn thành", "Đang chạy", "Đang chờ", "Hủy chuyến"],
                datasets: [{
                    data: [75, 15, 7, 3],
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

    // === 4. CẤU HÌNH KANBAN BOARD DRAG & DROP (AI TAGS INTERACTIVE) ===
    const dragItems = document.querySelectorAll(".kanban-card-item[draggable='true']");
    const dropzone = document.querySelector(".target-dropzone");

    dragItems.forEach(item => {
        item.addEventListener("dragstart", function () {
            this.classList.add("dragging");
        });
        item.addEventListener("dragend", function () {
            this.classList.remove("dragging");
        });
    });

    if (dropzone) {
        dropzone.addEventListener("dragover", function (e) {
            e.preventDefault(); // Cho phép thả
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
                // Nhân bản hoặc di chuyển thẻ tag vào cấu trúc xe tương ứng
                const newTag = draggingCard.cloneNode(true);
                newTag.removeAttribute("draggable");
                newTag.className = "badge bg-white bg-opacity-10 text-white border border-secondary p-2 m-1";
                // Chèn lên trước khối hiển thị biển số xe ổn định
                this.appendChild(newTag);
                showSystemToast("Đã gán thuộc tính AI vào phương tiện thành công!", "success");
            }
        });
    }
});

// === 5. CÁC HÀM TƯƠNG TÁC TOÀN CỤC (GLOBAL SCOPE FUNCTIONS - BIND TO WINDOW) ===

// 5.1 Xử lý xem tài liệu eKYC nâng cao (Zoom & Rotate Image Physics)
// Biến lưu trạng thái Zoom/Rotate độc lập cho 4 ảnh
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
        state.scale = Math.max(0.5, Math.min(state.scale * factor, 3)); // Khống chế zoom từ 0.5x đến 3x
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

let currentViewingAccountId = null;

// 5.2 Mở các Modals chương trình bằng Bootstrap API
// =========================================================================
// TASK 2: HÀM MỞ MODAL VÀ ĐỔ DỮ LIỆU CHI TIẾT TÀI XẾ
// =========================================================================
window.openEkycModal = function (accountId) {
    // 1. Tìm tài xế trong mảng dữ liệu đã lưu từ API
    const driver = currentPendingDrivers.find(d => d.accountId === accountId);
    if (!driver) {
        console.error("Không tìm thấy dữ liệu hồ sơ của tài xế này!");
        return;
    }

    // 2. Lưu lại ID vào biến toàn cục để sử dụng cho thao tác Duyệt/Từ chối
    currentViewingAccountId = accountId;

    // 3. Đổ dữ liệu dạng Text (Tên, SĐT, Ngày tạo) vào Modal
    const modalName = document.getElementById("modalDriverName");
    const modalPhone = document.getElementById("modalDriverPhone");
    const modalDate = document.getElementById("modalDriverDate");

    if (modalName) modalName.innerText = driver.fullName;
    if (modalPhone) modalPhone.innerHTML = `<i class="fa-solid fa-phone me-2"></i> ${driver.phoneNumber || 'Không có SĐT'}`;
    
    const dateStr = driver.createdAt ? driver.createdAt.split('.')[0] : 'Chưa cập nhật';
    if (modalDate) modalDate.innerText = `Thời gian nộp: ${dateStr}`;

    // 4. Đổ dữ liệu Hình ảnh và Reset hiệu ứng hiển thị ảnh (Zoom/Rotate)
    const imgConfigs = [
        { id: "cccdFrontImg", url: driver.extractedCccd },
        { id: "cccdBackImg", url: driver.extractedCccd },
        { id: "licenseFrontImg", url: driver.extractedLicense },
        { id: "licenseBackImg", url: driver.extractedLicense }
    ];

    imgConfigs.forEach(config => {
        const imgDOM = document.getElementById(config.imgId);
        const emptyDOM = document.getElementById(config.emptyId);
        const ctrlDOM = document.getElementById(config.ctrlId);

        // Kiểm tra xem URL có hợp lệ không (Không rỗng và không chứa chữ 'default-doc')
        const isValidUrl = config.url && config.url.trim() !== '' && !config.url.includes('default-doc.png');

        if (imgDOM && emptyDOM) {
            if (isValidUrl) {
                // CÓ ẢNH: Hiện thẻ img, ẩn khung empty, hiện nút điều khiển
                imgDOM.src = config.url;
                imgDOM.classList.remove('d-none');
                emptyDOM.classList.add('d-none');
                if (ctrlDOM) ctrlDOM.classList.remove('d-none');

                // Reset trạng thái zoom/xoay
                if (imageStates[config.imgId]) imageStates[config.imgId] = { scale: 1, rotate: 0 };
                imgDOM.style.transform = `scale(1) rotate(0deg)`;
            } else {
                // KHÔNG CÓ ẢNH: Ẩn thẻ img, hiện khung empty, ẩn nút điều khiển
                imgDOM.classList.add('d-none');
                emptyDOM.classList.remove('d-none');
                if (ctrlDOM) ctrlDOM.classList.add('d-none');
            }
        }
    });

    // 5. Khôi phục (Reset) giao diện của form Từ chối về trạng thái gốc
    const rejectContainer = document.getElementById('rejectReasonContainer');
    const actionButtons = document.getElementById('ekycActionButtons');
    const rejectInput = document.getElementById('rejectReasonInput');
    
    if (rejectContainer && actionButtons && rejectInput) {
        rejectContainer.classList.add('d-none');     // Ẩn khu vực nhập lý do
        actionButtons.classList.remove('d-none');    // Hiển thị lại 2 nút Duyệt/Từ chối
        rejectInput.value = '';                      // Xóa sạch đoạn văn gõ dở trước đó
    }

    // 6. Kích hoạt và hiển thị Modal lên màn hình
    const ekycModalEl = document.getElementById("ekycModal");
    if (ekycModalEl) {
        const modalInstance = bootstrap.Modal.getOrCreateInstance(ekycModalEl);
        modalInstance.show();
    }
};

window.openDiffModal = function () {
    const diffModalEl = document.getElementById("diffModal");
    if (diffModalEl) {
        const modalInstance = bootstrap.Modal.getOrCreateInstance(diffModalEl);
        modalInstance.show();
    }
};

// 5.3 Giả lập Lưu cấu hình hệ thống & Tạo hiệu ứng Loading (UX Feedback)
window.simulateSaveConfig = function (button) {
    if (!button) return;
    const originalContent = button.innerHTML;
    
    button.disabled = true;
    button.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin me-2"></i> Đang ghi dữ liệu...`;
    
    setTimeout(() => {
        button.disabled = false;
        button.innerHTML = originalContent;
        showSystemToast("Hệ thống đã đồng bộ cấu hình bất biến hoàn tất!", "success");
        
        // Tự động đóng modal bọc ngoài (nếu hành động xuất phát từ modal)
        const activeModal = button.closest(".modal");
        if (activeModal) {
            const modalInstance = bootstrap.Modal.getInstance(activeModal);
            if (modalInstance) modalInstance.hide();
        }
    }, 1300);
};

// 5.4 Giả lập Test Lỗi Mạng khi thay đổi Select Combobox
window.testGlobalError = function (selectElement) {
    if (!selectElement) return;
    if (selectElement.value === "Test Lỗi Mạng") {
        showSystemToast("Mất kết nối API Gateway. Vui lòng kiểm tra lại cấu hình định tuyến (BR-17).", "error");
        // Trả select về lựa chọn đầu tiên sau khi test
        selectElement.selectedIndex = 0;
    } else {
        showSystemToast(`Đã lọc dữ liệu theo bộ lọc: "${selectElement.value}"`, "success");
    }
};

// 5.5 Hiển thị Thông báo Hệ thống Cao cấp (Premium Toast Controller)
window.showSystemToast = function (message, type = "success") {
    const toastContainer = document.getElementById("systemErrorToast");
    const toastMessageSpan = document.getElementById("toastMsg");
    
    if (!toastContainer || !toastMessageSpan) return;
    
    toastMessageSpan.textContent = message;
    const iconElement = toastContainer.querySelector("i");
    
    // Tự động hoán đổi class và icon tùy theo ngữ cảnh Success / Error giống Dispatcher
    if (type === "error") {
        toastContainer.className = "toast align-items-center toast-premium border border-danger shadow-lg show";
        if (iconElement) iconElement.className = "fa-solid fa-circle-xmark fs-3 text-danger";
    } else {
        toastContainer.className = "toast align-items-center toast-premium border border-success shadow-lg show";
        if (iconElement) iconElement.className = "fa-solid fa-circle-check fs-3 text-success";
    }
    
    // Tự động ẩn Toast sau 4 giây phóng chiếu hiển thị
    setTimeout(() => {
        toastContainer.classList.remove("show");
    }, 4000);
};

// Script mới lưu session cho admin
// === 6. QUẢN LÝ PHIÊN LÀM VIỆC (SESSION & ROUTE GUARD) ===
function initAdminSession() {
    const userRole = localStorage.getItem('userRole') || '';
    const fullName = localStorage.getItem('fullName') || 'Administrator';
    const email = localStorage.getItem('email') || 'admin@fleetflow.vn';

    // 🚨 TASK 5: CHỐT CHẶN BẢO MẬT (ROUTE GUARD) 🚨
    // Nếu Role không tồn tại hoặc không phải ADMIN -> Lập tức đá văng
    if (userRole.toUpperCase() !== 'ADMIN') {
        console.warn("CẢNH BÁO BẢO MẬT: Phát hiện truy cập trái phép vào trang Admin!");
        window.location.replace('../error/403.html'); // Đá văng ra trang lỗi 403
        return false; // Trả về false để chặn toàn bộ API bên dưới chạy
    }

    // --- (Phần code dưới giữ nguyên: Đồng bộ Avatar và Tên lên Navbar) ---
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=00b14f&color=fff`;
    const nameElements = document.querySelectorAll('.profile-name, .dropdown-header-custom .fw-bold');
    const roleElements = document.querySelectorAll('.profile-role');
    const emailElements = document.querySelectorAll('.dropdown-header-custom .small.text-white-50');
    const avatarImg = document.querySelector('.glass-avatar img');

    nameElements.forEach(el => { if (el) el.innerText = fullName; });
    roleElements.forEach(el => { if (el) el.innerText = userRole.toUpperCase(); });
    emailElements.forEach(el => { if (el) el.innerText = email; });
    if (avatarImg) avatarImg.src = avatarUrl;

    return true; // Trả về true cho phép DOMContentLoaded chạy tiếp API
}

// Hàm xử lý đăng xuất
function handleAdminLogout(e) {
    e.preventDefault();
    if (confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống quản trị?")) {
        localStorage.clear(); // Xóa sạch phiên làm việc
        window.location.replace('../../index.html');
    }
}

// Xử lí luồng duyệt Driver
// =========================================================================
// API TÍCH HỢP: QUẢN LÝ TÀI XẾ (KIỂM DUYỆT HỒ SƠ EKYC)
// =========================================================================
const ADMIN_API_BASE = 'http://localhost:8080/FleetFlow/api/v1/admin/drivers';
let currentPendingDrivers = []; // Biến toàn cục lưu trữ danh sách tài xế chờ duyệt

// TASK 1: API GET PENDING DRIVERS & DATA MAPPING
window.fetchAndRenderEkycQueue = async function () {
    const queueList = document.getElementById("ekycQueueList");
    if (!queueList) return;
    
    // Hiển thị trạng thái Loading
    queueList.innerHTML = `
        <tr>
            <td colspan="4" class="text-center p-5">
                <i class="fa-solid fa-circle-notch fa-spin fs-2 text-info"></i>
                <p class="mt-2 text-white-50 small fw-bold">Đang tải dữ liệu hồ sơ...</p>
            </td>
        </tr>`;

    try {
        const response = await fetch(`${ADMIN_API_BASE}/pending`, { 
            method: 'GET',
            credentials: 'include' // Bắt buộc để gửi Session Cookie của Admin lên Backend
        });
        
        const result = await response.json();

        if (result.success && result.data) {
            currentPendingDrivers = result.data;
            
            // Cập nhật số lượng hiển thị trên Badge của Sidebar
            const badge = document.querySelector('a[href="#tab-drivers"] .badge');
            if (badge) badge.innerText = currentPendingDrivers.length;

            if (currentPendingDrivers.length === 0) {
                queueList.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center py-5">
                            <i class="fa-solid fa-check-double text-success mb-3" style="font-size: 3rem;"></i>
                            <h5 class="text-white fw-bold">Tuyệt vời!</h5>
                            <p class="text-white-50 small">Tất cả hồ sơ eKYC đã được xử lý xong.</p>
                        </td>
                    </tr>`;
                return;
            }

            queueList.innerHTML = ""; // Xóa dòng Loading
            
            // Lặp dữ liệu và vẽ giao diện
            currentPendingDrivers.forEach(driver => {
                // Tách chuỗi thời gian (VD: "2026-04-18 08:51:00.0")
                const dateStr = driver.createdAt || '';
                const timeOnly = dateStr.includes(' ') ? dateStr.split(' ')[1].substring(0, 5) : '--:--';
                const dateOnly = dateStr.includes(' ') ? dateStr.split(' ')[0] : 'Chưa cập nhật';
                
                // --- BẮT ĐẦU: LOGIC DATA MAPPING TÁCH ẢNH ---
                let cccdUrl = '../../assets/img/default-doc.png';
                let licenseUrl = '../../assets/img/default-doc.png';

                if (driver.documents && driver.documents.length > 0) {
                    driver.documents.forEach(doc => {
                        if (doc.docType && doc.docType.toUpperCase() === 'NATIONALID') {
                            cccdUrl = doc.fileUrl;
                        }
                        if (doc.docType && doc.docType.toUpperCase() === 'DRIVERLICENSE') {
                            licenseUrl = doc.fileUrl;
                        }
                    });
                }
                
                // Lưu ngược ảnh vào object để truyền cho Task 2 (Bật Modal)
                driver.extractedCccd = cccdUrl;
                driver.extractedLicense = licenseUrl;
                // --- KẾT THÚC: DATA MAPPING ---

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
                    </tr>
                `;
                queueList.insertAdjacentHTML('beforeend', rowHtml);
            });
        } else {
            queueList.innerHTML = `<tr><td colspan="4" class="text-danger fw-bold p-3 text-center">Lỗi tải dữ liệu: ${result.message || 'Phiên đăng nhập không hợp lệ'}</td></tr>`;
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        queueList.innerHTML = `<tr><td colspan="4" class="text-danger fw-bold p-3 text-center">Lỗi kết nối máy chủ NetBeans.</td></tr>`;
    }
};

// =========================================================================
// TASK 3: TÍCH HỢP API DUYỆT HỒ SƠ (APPROVE)
// =========================================================================
async function approveEkyc() {
    if (!currentViewingAccountId) {
        alert("Lỗi: Không xác định được ID tài xế đang xem.");
        return;
    }

    const btn = document.getElementById('btnApprove');
    const originalText = btn ? btn.innerHTML : 'Phê Duyệt';
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang duyệt...';
        btn.disabled = true;
    }

    try {
        const response = await fetch(`${ADMIN_API_BASE}/${currentViewingAccountId}/approve`, {
            method: 'POST',
            credentials: 'include' // Bắt buộc để gửi Session Cookie lên Java Backend
        });

        const data = await response.json();

        if (data.success) {
            showSystemToast("Đã phê duyệt hồ sơ đối tác tài xế thành công!", "success");

            // Đóng Modal (Đã sửa đúng ID là ekycModal)
            const modalEl = document.getElementById('ekycModal');
            if (modalEl) bootstrap.Modal.getInstance(modalEl).hide();

            // Load lại danh sách (Làm biến mất tài xế vừa duyệt)
            fetchAndRenderEkycQueue();
        } else {
            alert("Không thể duyệt: " + data.message);
        }
    } catch (error) {
        console.error("Lỗi duyệt hồ sơ:", error);
        alert("Mất kết nối đến máy chủ khi duyệt hồ sơ.");
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

// =========================================================================
// TASK 4: TÍCH HỢP API TỪ CHỐI (REJECT) KÈM LÝ DO
// =========================================================================

// 1. Khi bấm nút "Từ chối" màu đỏ
window.prepareReject = function() {
    // Ẩn 2 nút gốc và hiện Textarea
    document.getElementById('ekycActionButtons').classList.add('d-none');
    document.getElementById('rejectReasonContainer').classList.remove('d-none');
    document.getElementById('rejectReasonInput').focus();
}

// 2. Khi bấm "Hủy" nhập lý do
window.cancelReject = function() {
    // Ẩn Textarea, hiện lại 2 nút gốc
    document.getElementById('rejectReasonContainer').classList.add('d-none');
    document.getElementById('rejectReasonInput').value = '';
    document.getElementById('ekycActionButtons').classList.remove('d-none');
}

// 3. Khi bấm "Xác nhận Gửi"
function confirmRejectEkyc() {
    const reasonInput = document.getElementById('rejectReasonInput');
    const reason = reasonInput ? reasonInput.value.trim() : '';

    if (!reason) {
        alert("Vui lòng nhập lý do từ chối để tài xế biết cách khắc phục hồ sơ!");
        reasonInput.focus();
        return;
    }

    executeRejectApi(reason);
}

// 4. Lõi gọi API Từ chối
window.executeRejectApi = async function(reason) {
    const btn = document.querySelector('#rejectReasonContainer .btn-danger');
    const originalText = btn ? btn.innerHTML : 'Xác nhận Gửi';
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang gửi...';
        btn.disabled = true;
    }

    try {
        const response = await fetch(`${ADMIN_API_BASE}/${currentViewingAccountId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ rejectReason: reason }) // Gửi kèm lý do dạng JSON
        });

        const data = await response.json();

        if (data.success) {
            showSystemToast("Đã từ chối và gửi email lý do cho tài xế!", "success");

            // Đóng Modal và Reset trạng thái nút bấm
            const modalEl = document.getElementById('ekycModal');
            if (modalEl) bootstrap.Modal.getInstance(modalEl).hide();
            cancelReject();

            // Load lại danh sách hàng đợi
            fetchAndRenderEkycQueue();
        } else {
            alert("Lỗi từ chối: " + data.message);
        }
    } catch (error) {
        console.error("Lỗi từ chối hồ sơ:", error);
        alert("Mất kết nối đến máy chủ.");
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

// =========================================================================
// PHÂN HỆ 4: QUẢN LÝ VÒNG ĐỜI XE (MASTER ADMIN FLEET MANAGEMENT)
// Tích hợp API GET Danh sách và GET Chi tiết
// =========================================================================

const ADMIN_VEHICLE_API_URL = 'http://localhost:8080/FleetFlow/api/v1/admin/vehicles';
let globalAdminVehicles = [];

// 1. Tự động tải danh sách xe khi Admin vào trang
document.addEventListener("DOMContentLoaded", () => {
    fetchAndRenderAdminVehicles();
});

// 2. Hàm gọi API Lấy toàn bộ danh sách xe (GET)
async function fetchAndRenderAdminVehicles() {
    const tbody = document.getElementById("adminFleetList");
    if (!tbody) return;

    // Hiển thị trạng thái Loading chuyên nghiệp
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-5"><i class="fa-solid fa-circle-notch fa-spin fs-3 text-info"></i><div class="mt-2 text-white-50">Đang đồng bộ dữ liệu đội xe...</div></td></tr>`;

    try {
        const response = await fetch(ADMIN_VEHICLE_API_URL, {
            method: 'GET',
            credentials: 'include' // Bắt buộc gửi kèm Session Cookie xác thực quyền Admin
        });
        const result = await response.json();

        if (result.success && result.data) {
            globalAdminVehicles = result.data;
            renderAdminVehicles(globalAdminVehicles);
        } else {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-danger fw-bold"><i class="fa-solid fa-triangle-exclamation me-2"></i> Lỗi: ${result.message || 'Không thể lấy dữ liệu'}</td></tr>`;
        }
    } catch (error) {
        console.error("Lỗi fetch fleet:", error);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-danger fw-bold"><i class="fa-solid fa-server me-2"></i> Mất kết nối đến máy chủ NetBeans.</td></tr>`;
    }
}

// 3. Hàm Render dữ liệu lên UI Glassmorphism
function renderAdminVehicles(vehicles) {
    const tbody = document.getElementById("adminFleetList");
    if (!tbody) return;
    
    if (vehicles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-5 text-white-50"><i class="fa-solid fa-car-tunnel fs-1 mb-3"></i><br>Hệ thống chưa có phương tiện nào.</td></tr>`;
        return;
    }

    let html = '';
    vehicles.forEach(v => {
        // Tự động chọn Icon xe tùy thuộc vào số chỗ
        const icon = (v.seatCount > 5) ? 'fa-truck-pickup' : 'fa-car-side';
        
        // Xử lý hiển thị UI cho Dropdown Đổi trạng thái
        const isAvailable = (v.status === 'Available');
        const statusColor = isAvailable ? 'success' : 'danger';
        
        // Cấu trúc Form Select cho API PUT thay đổi trạng thái sau này
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
                <div class="small text-info fw-bold mb-1" title="Số khung"><i class="fa-solid fa-barcode me-2"></i>SK: ${v.chassisNumber || 'Chưa cập nhật'}</div>
                <div class="small text-warning fw-bold mb-1" title="Số máy"><i class="fa-solid fa-gear me-2"></i>SM: ${v.engineNumber || 'Chưa cập nhật'}</div>
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
                    <button class="btn-glass-action border-info text-info p-1 px-2 shadow-sm" onclick="viewAdminVehicleDetail(${v.vehicleId})" title="Xem chi tiết hồ sơ gốc">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

// 4. API GET: Xem chi tiết giấy tờ 1 phương tiện (GET /{id})
window.viewAdminVehicleDetail = async function(id) {
    try {
        // Gọi nút bấm hiển thị trạng thái đang xử lý (tuỳ chọn)
        showSystemToast("Đang truy xuất dữ liệu từ kho lưu trữ...", "success");

        const response = await fetch(`${ADMIN_VEHICLE_API_URL}/${id}`, { 
            method: 'GET',
            credentials: 'include' 
        });
        const result = await response.json();
        
        if (result.success && result.data) {
            const v = result.data;
            // Hiện tại UI chưa có Modal chi tiết cho xe, ta hiển thị tạm bằng hộp thoại Browser Alert
            // Sau này bạn có thể map dữ liệu này vào 1 Glass Modal tương tự eKycModal
            alert(`🔍 HỒ SƠ LƯU TRỮ PHƯƠNG TIỆN #${v.vehicleId}\n` +
                  `-----------------------------------------\n` +
                  `Biển số kiểm soát: ${v.licensePlate}\n` +
                  `Hãng & Dòng xe: ${v.brand} ${v.model} (${v.seatCount} Chỗ)\n\n` +
                  `[THÔNG TIN PHÁP LÝ BẢO MẬT]\n` +
                  `Số khung (Chassis): ${v.chassisNumber}\n` +
                  `Số máy (Engine): ${v.engineNumber}\n` +
                  `Đồng hồ ODO: ${v.accumulatedKm} km\n\n` +
                  `Trạng thái: ${v.status === 'Available' ? 'Đang hoạt động' : 'Tạm khóa'}\n` +
                  `Ghi chú: ${v.description || 'Không có mô tả bổ sung'}`);
        } else {
            showSystemToast(result.message || "Không tìm thấy dữ liệu phương tiện!", "error");
        }
    } catch (error) {
        console.error("Lỗi lấy chi tiết xe:", error);
        showSystemToast("Lỗi đường truyền! Vui lòng thử lại.", "error");
    }
};

// 5. Chuẩn bị Luồng API PUT: Cập nhật trạng thái
window.changeVehicleStatus = async function(id, newStatus) {
    if(!confirm(`Xác nhận đổi trạng thái xe thành: ${newStatus === 'Available' ? 'SẴN SÀNG' : 'TẠM KHÓA / BẢO DƯỠNG'} ?`)) {
        // Rollback lại giá trị dropdown nếu user chọn Cancel
        fetchAndRenderAdminVehicles(); 
        return;
    }
    
    // Nơi đây sẽ móc nối với lệnh fetch PUT xuống backend sau này.
    // Tạm thời hiển thị Toast giả lập thành công:
    showSystemToast(`Đã thay đổi trạng thái thành công cho phương tiện #${id}`, "success");
    
    // Ghi đè UI cho đồng bộ màu sắc
    fetchAndRenderAdminVehicles();
};

// 5. API PUT: Cập nhật trạng thái xe (Bảo dưỡng / Hoạt động)
window.changeVehicleStatus = async function(id, newStatus) {
    if(!confirm(`Xác nhận đổi trạng thái xe thành: ${newStatus === 'Available' ? 'SẴN SÀNG' : 'TẠM KHÓA / BẢO DƯỠNG'} ?`)) {
        fetchAndRenderAdminVehicles(); // Khôi phục lại trạng thái cũ trên UI nếu chọn Cancel
        return;
    }
    
    const token = localStorage.getItem('accessToken');
    try {
        const response = await fetch(`${ADMIN_VEHICLE_API_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            // Chỉ cập nhật trạng thái
            body: JSON.stringify({ status: newStatus })
        });
        
        const result = await response.json();
        if (response.ok && result.success) {
            showSystemToast(`Đã thay đổi trạng thái thành công cho phương tiện #${id}`, "success");
        } else {
            showSystemToast(result.error || result.message || "Lỗi cập nhật trạng thái", "error");
        }
    } catch (error) {
        showSystemToast("Mất kết nối máy chủ khi cập nhật.", "error");
    } finally {
        fetchAndRenderAdminVehicles(); // Đồng bộ lại Data bảng
    }
};

// 6. API POST: Thêm mới phương tiện vào Fleet
window.submitNewVehicle = async function(event) {
    event.preventDefault(); // Chặn hành vi load lại trang mặc định của form
    
    const btn = document.getElementById('btnSubmitVehicle');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-2"></i>Đang lưu...';
    btn.disabled = true;

    // Bóc tách dữ liệu từ form
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
        // Có dấu "/" ở cuối theo đúng cấu hình API Servlet POST
        const response = await fetch(ADMIN_VEHICLE_API_URL + "/", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showSystemToast("Đưa phương tiện mới vào hệ thống thành công!", "success");
            
            // Đóng Modal mượt mà & Xóa trắng Form
            document.getElementById('addVehicleForm').reset();
            const modalEl = document.getElementById('addVehicleModal');
            bootstrap.Modal.getInstance(modalEl).hide();
            
            // Cập nhật lại danh sách xe
            fetchAndRenderAdminVehicles();
        } else {
            showSystemToast("Lỗi: " + (result.error || result.message), "error");
        }
    } catch (error) {
        console.error("Lỗi POST Vehicle:", error);
        showSystemToast("Mất kết nối API Gateway.", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

// 7. API DELETE: Xóa phương tiện vĩnh viễn (Thanh lý)
window.deleteAdminVehicle = async function(id, plate) {
    if(!confirm(`⚠️ NGUY HIỂM: Bạn có chắc chắn muốn XÓA VĨNH VIỄN phương tiện biển số [${plate}] khỏi hệ thống?\nThao tác này không thể hoàn tác!`)) {
        return;
    }
    
    const token = localStorage.getItem('accessToken');
    try {
        const response = await fetch(`${ADMIN_VEHICLE_API_URL}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showSystemToast(`Đã thanh lý thành công phương tiện [${plate}]`, "success");
            fetchAndRenderAdminVehicles(); 
        } else {
            showSystemToast(result.error || result.message || "Xóa thất bại", "error");
        }
    } catch (error) {
        showSystemToast("Mất kết nối máy chủ khi thực hiện Xóa.", "error");
    }
};
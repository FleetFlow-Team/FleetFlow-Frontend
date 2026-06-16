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
let currentScale = 1.0;
let currentRotation = 0;

window.zoomImg = function (factor) {
    const img = document.getElementById("cccdImg");
    if (!img) return;
    currentScale *= factor;
    // Giới hạn zoom từ 0.5x đến 3x tránh vỡ layout
    if (currentScale < 0.5) currentScale = 0.5;
    if (currentScale > 3.0) currentScale = 3.0;
    applyTransformations(img);
};

window.rotateImg = function () {
    const img = document.getElementById("cccdImg");
    if (!img) return;
    currentRotation = (currentRotation + 90) % 360;
    applyTransformations(img);
};

function applyTransformations(element) {
    element.style.transform = `scale(${currentScale}) rotate(${currentRotation}deg)`;
}

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
    const cccdImgDOM = document.getElementById("cccdImg");
    if (cccdImgDOM) {
        cccdImgDOM.src = driver.extractedCccd || '../../assets/img/default-doc.png';
        if (typeof currentScale !== 'undefined') currentScale = 1.0;
        if (typeof currentRotation !== 'undefined') currentRotation = 0;
        cccdImgDOM.style.transform = `scale(1) rotate(0deg)`;
    }

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
        window.location.replace('../../403.html'); // Đá văng ra trang lỗi 403
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
function rejectEkyc() {
    // Ẩn 2 nút gốc và hiện Textarea
    document.getElementById('ekycActionButtons').classList.add('d-none');
    document.getElementById('rejectReasonContainer').classList.remove('d-none');
    document.getElementById('rejectReasonInput').focus();
}

// 2. Khi bấm "Hủy" nhập lý do
function cancelReject() {
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
async function executeRejectApi(reason) {
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
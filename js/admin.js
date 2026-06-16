/**
 * FleetFlow - Master Admin Workspace Core Engine
 * Architecture: Liquid Glass Interactive Controller & Data Visualization
 */

document.addEventListener("DOMContentLoaded", function () {
    // 🚀 BẬT CHỐT CHẶN VÀ ĐỒNG BỘ NAVBAR ĐẦU TIÊN
    if (!initAdminSession()) return; 

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

// 5.2 Mở các Modals chương trình bằng Bootstrap API
window.openEkycModal = function () {
    // Reset thông số ảnh mỗi lần mở modal thẩm định mới
    currentScale = 1.0;
    currentRotation = 0;
    const img = document.getElementById("cccdImg");
    if (img) applyTransformations(img);
    
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

    // 1. Chốt chặn bảo mật (Route Guard): Đá văng nếu không phải Admin
    if (userRole.toUpperCase() !== 'ADMIN') {
        alert("Lỗi phân quyền: Bạn không có quyền truy cập không gian Quản trị viên!");
        window.location.replace('../../index.html'); // Đẩy về trang chủ hoặc trang đăng nhập
        return false;
    }

    // 2. Tạo Link Avatar động từ tên
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=00b14f&color=fff`;

    // 3. Đồng bộ dữ liệu lên Navbar
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

// Hàm xử lý đăng xuất
function handleAdminLogout(e) {
    e.preventDefault();
    if (confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống quản trị?")) {
        localStorage.clear(); // Xóa sạch phiên làm việc
        window.location.replace('../../index.html');
    }
}
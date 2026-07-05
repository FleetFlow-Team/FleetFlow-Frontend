document.addEventListener("DOMContentLoaded", function () {
    // =========================================
    // 1. HIỆU ỨNG REVEAL ON SCROLL
    // =========================================
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal-on-scroll').forEach((elem) => {
        observer.observe(elem);
    });

    // =========================================
    // 2. NAVBAR ĐỔI TRẠNG THÁI KHI CUỘN
    // =========================================
    const navbar = document.querySelector('.custom-navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('is-scrolled');
            } else {
                navbar.classList.remove('is-scrolled');
            }
        });
    }
});

document.addEventListener("DOMContentLoaded", function () {
    // Logic cho Mobile Dropdown Glass Menu
    const mobileBtn = document.getElementById('mobileToggleBtn');
    const mobileDropdown = document.getElementById('mobileDropdown');

    if (mobileBtn && mobileDropdown) {
        mobileBtn.addEventListener('click', function (e) {
            e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài
            this.classList.toggle('active');
            mobileDropdown.classList.toggle('show');
        });

        // Click ra ngoài màn hình sẽ tự động đóng menu
        document.addEventListener('click', function (event) {
            if (!mobileDropdown.contains(event.target) && !mobileBtn.contains(event.target)) {
                mobileDropdown.classList.remove('show');
                mobileBtn.classList.remove('active');
            }
        });
    }
});

// =========================================
// 3. LOGIN MODAL LOGIC (Đã fix lỗi Mobile)
// =========================================
const btnLogins = document.querySelectorAll('.btn-login'); // Lấy toàn bộ các nút đăng nhập
const loginModal = document.getElementById('loginModal');
const closeLoginModal = document.getElementById('closeLoginModal');

if (btnLogins.length > 0 && loginModal && closeLoginModal) {

    // Gắn sự kiện click cho từng nút đăng nhập (cả Desktop lẫn Mobile)
    btnLogins.forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            loginModal.classList.add('active');
            document.body.style.overflow = 'hidden';

            // UX Tinh tế: Tự động đóng dropdown mobile nếu nó đang mở
            const mobileDropdown = document.getElementById('mobileDropdown');
            const mobileBtn = document.getElementById('mobileToggleBtn');
            if (mobileDropdown && mobileDropdown.classList.contains('show')) {
                mobileDropdown.classList.remove('show');
                mobileBtn.classList.remove('active');
            }
        });
    });

    // Đóng Modal khi bấm nút X
    closeLoginModal.addEventListener('click', function () {
        loginModal.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Đóng Modal khi bấm ra vùng tối bên ngoài
    loginModal.addEventListener('click', function (e) {
        if (e.target === loginModal) {
            loginModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

document.addEventListener("DOMContentLoaded", function () {
    // Luôn gọi hàm khởi tạo trạng thái tài khoản khi tải trang
    initUserProfile();
});

function initUserProfile() {
    const fullName = localStorage.getItem('fullName');
    const accessToken = localStorage.getItem('accessToken');
    const userRole = localStorage.getItem('userRole') || 'Khách hàng';

    // Nếu chưa đăng nhập thì giữ nguyên giao diện nút bấm ban đầu
    if (!accessToken || !fullName) return;

    const avatarName = encodeURIComponent(fullName);

    // TỰ ĐỘNG GIẢI QUYẾT ĐƯỜNG DẪN DỰA TRÊN VỊ TRÍ FILE HIỆN TẠI
    const currentPath = window.location.pathname.toLowerCase();
    let profileUrl = 'pages/profile.html';
    let indexUrl = 'index.html';
    let driverWorkspaceUrl = 'pages/driver/driver-workspace.html'; // Thêm biến đường dẫn cho Driver

    if (currentPath.includes('/pages/customer/') ||
        currentPath.includes('/pages/driver/') ||
        currentPath.includes('/pages/admin/') ||
        currentPath.includes('/pages/dispatcher/')) {
        profileUrl = '../profile.html';
        indexUrl = '../../index.html';
        driverWorkspaceUrl = '../driver/driver-workspace.html';
    } else if (currentPath.includes('/pages/')) {
        profileUrl = 'profile.html';
        indexUrl = '../index.html';
        driverWorkspaceUrl = 'driver/driver-workspace.html';
    }

    // ======================================================================
    // LOGIC: ẨN MENU KHÔNG CẦN THIẾT NẾU LÀ TÀI XẾ (DRIVER)
    // ======================================================================
    const upperRole = userRole.toUpperCase();
    let workspaceLinkHtml = ''; // Biến chứa HTML của nút Chế độ Tài xế

    if (upperRole === 'DRIVER' || upperRole === 'TÀI XẾ') {

        // Tạo nút bấm vào Workspace (Chỉ khi là tài xế)
        workspaceLinkHtml = `
            <a href="${driverWorkspaceUrl}" class="dropdown-item-custom text-success">
                <i class="fa-solid fa-car-side"></i> Chế độ Tài xế
            </a>
        `;

        // Lọc trên PC và Bottom Nav Mobile (Đoạn code cũ của bạn giữ nguyên)
        const navMenus = document.querySelectorAll('.navbar-center-links, .desktop-menu, .mobile-bottom-nav');
        navMenus.forEach(menu => {
            menu.querySelectorAll('a').forEach(link => {
                if (!link.innerText.toLowerCase().includes('chính sách')) {
                    link.style.setProperty('display', 'none', 'important');
                }
            });
        });

        // Lọc trong Dropdown Menu Mobile
        const dropdownItems = document.querySelectorAll('.mobile-glass-dropdown .mobile-nav-item, .mobile-glass-dropdown a');
        dropdownItems.forEach(item => {
            const text = item.innerText.toLowerCase();
            if (text.includes('trở thành tài xế') || text.includes('trang chủ') || text.includes('đặt xe')) {
                item.style.setProperty('display', 'none', 'important');
            }
        });
    }
    // ======================================================================

    // Khối giao diện Avatar hiển thị thay thế nút Đăng nhập (Đã chèn thêm workspaceLinkHtml)
    const getProfileTemplate = () => `
        <div class="d-flex flex-column align-items-end text-end" style="line-height: 1.2; padding-right: 10px;">
            <span class="fw-bold" style="font-size: 0.95rem; color: var(--color-dark);">${fullName}</span>
            <span class="fw-medium" style="font-size: 0.75rem; color: #64748b;">${userRole}</span>
        </div>
        <img src="https://ui-avatars.com/api/?name=${avatarName}&background=00B14F&color=fff" style="width: 34px; height: 34px; border-radius: 50%;" />
        
        <div class="dropdown-menu-modern shadow-lg">        
            <a href="${profileUrl}" class="dropdown-item-custom">
                <i class="fa-solid fa-user-shield"></i> Hồ sơ cá nhân
            </a>
            ${workspaceLinkHtml} 
            <hr class="divider-custom">
            <a href="#" class="dropdown-item-custom text-danger fw-bold logout-item">
                <i class="fa-solid fa-arrow-right-from-bracket"></i> Đăng xuất
            </a>
        </div>
    `;

    const targetButtons = [
        { id: 'btnLogin', isMobile: false },
        { id: 'btnLoginMobile', isMobile: true }
    ];

    targetButtons.forEach(target => {
        const oldBtn = document.getElementById(target.id);
        if (oldBtn) {
            const btnProfile = oldBtn.cloneNode(false);
            oldBtn.parentNode.replaceChild(btnProfile, oldBtn);

            btnProfile.id = target.id;
            btnProfile.className = oldBtn.className;
            btnProfile.classList.remove('btn-login');
            btnProfile.classList.add('user-profile-btn');
            if (target.isMobile) btnProfile.classList.add('mt-2');

            btnProfile.innerHTML = getProfileTemplate();

            btnProfile.addEventListener('click', (e) => {
                if (!e.target.closest('.logout-item') && !e.target.closest('a')) {
                    e.preventDefault();
                }
            });

            const logoutBtn = btnProfile.querySelector('.logout-item');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const fakeComplaints = localStorage.getItem('customerFakeComplaints');
                    localStorage.clear();
                    if (fakeComplaints) localStorage.setItem('customerFakeComplaints', fakeComplaints);
                    window.location.href = indexUrl;
                });
            }
        }
    });
}

// =========================================
// 4. API ĐĂNG NHẬP & ĐIỀU PHỐI (LIÊN KẾT BACKEND)
// =========================================
async function handleLogin(event) {
    // Ngăn form tự động reload trang
    event.preventDefault();

    // Lấy dữ liệu từ form HTML
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    // Đóng gói dữ liệu dạng Form Data cho Servlet
    const formData = new URLSearchParams();
    formData.append('email', email);
    formData.append('password', password);

    try {
        const apiUrl = 'http://localhost:8080/FleetFlow/api/v1/auth/login';

        // Gọi API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });

        const data = await response.json();

        // Xử lý phản hồi
        if (data.success) {
            // 1. Lưu Token & Phân quyền
            if (data.accessToken || data.token) {
                localStorage.setItem('accessToken', data.accessToken || data.token);
                if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
            }

            // 2. LƯU THÔNG TIN ACCOUNT (TÀI KHOẢN)
            if (data.user) {
                localStorage.setItem('fullName', data.user.fullName);
                localStorage.setItem('userRole', data.user.roleName);
                localStorage.setItem('email', data.user.email || email);

                const accId = data.user.id || data.user.accountId;
                if (accId) localStorage.setItem('accountId', accId);
            }

            // 3. LƯU THÔNG TIN CUSTOMER (Cải tiến check điều kiện)
            let custId = data.customerId || (data.customer && data.customer.id) || (data.user && data.user.customerId);

            // FIX 2: Check tường minh, tránh bị bỏ qua nếu ID = 0
            if (custId !== undefined && custId !== null) {
                localStorage.setItem('customerId', custId);
                console.log("Đã lưu CustomerID thành công:", custId); // Console log để theo dõi
            } else {
                console.warn("Backend không trả về CustomerID. Hãy check lại RoleName trong Database!");
            }

            // Dọn dẹp UI
            document.getElementById('loginModal').classList.remove('active');
            document.body.style.overflow = '';

            // 4. ĐIỀU PHỐI TRANG
            const userRole = (data.user.roleName || '').toUpperCase();
            switch (userRole) {
                case 'ADMIN': window.location.href = '../pages/admin/admin-workspace.html'; break;
                case 'DRIVER': window.location.href = '../pages/driver/driver-workspace.html'; break;
                case 'CUSTOMER':
                case 'KHÁCH HÀNG':
                    window.location.href = '../pages/findCar.html';
                    break;
                case 'DISPATCHER': window.location.href = '../pages/dispatcher/dispatcher-workspace.html'; break;
                default:
                    alert('Lỗi: Vai trò của bạn không hợp lệ hoặc chưa được phân quyền trong hệ thống.');
                    const fakeComplaints = localStorage.getItem('customerFakeComplaints');
                    localStorage.clear();
                    if (fakeComplaints) localStorage.setItem('customerFakeComplaints', fakeComplaints);
                    break;
            }
        } else {
            // NẾU ĐĂNG NHẬP SAI:
            const pwdInput = document.getElementById('loginPassword');
            pwdInput.value = '';
            pwdInput.focus();

            const errorHelper = document.getElementById('errorHelperText');
            if (errorHelper) errorHelper.classList.remove('d-none');
        }

    } catch (error) {
        console.error('Lỗi kết nối tới Backend:', error);
        alert('Không thể kết nối tới máy chủ. Vui lòng kiểm tra Server NetBeans đã được bật chưa.');
    }
}


// Warning cho tài xế đã bị gỡ bỏ

// =========================================================================
// HỆ THỐNG THÔNG BÁO VÀ ĐÁNH DẤU ĐÃ ĐỌC (OPTIMISTIC UI)
// =========================================================================

// 1. API 4: GỌI API LẤY DANH SÁCH THÔNG BÁO
async function loadNotifications() {
    const container = document.getElementById('notificationList');
    if (!container) return;

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    // Không gọi API này nếu đang ở role Dispatcher, Admin hoặc Driver
    const userRole = (localStorage.getItem('userRole') || '').toUpperCase();
    if (userRole && userRole !== 'CUSTOMER' && userRole !== 'KHÁCH HÀNG') {
        return;
    }

    // Hiển thị Loading mượt mà khi vừa bấm vào chuông
    container.innerHTML = `<li class="text-center p-4 text-muted"><i class="fa-solid fa-circle-notch fa-spin me-2"></i> Đang tải thông báo...</li>`;

    try {
        const response = await fetch(`http://localhost:8080/FleetFlow/api/v1/customer/notifications`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (response.ok && result.success && result.data) {
            const notifications = result.data;
            let unreadCount = 0;

            if (notifications.length === 0) {
                container.innerHTML = `<li class="text-center p-4 text-muted"><i class="fa-regular fa-bell-slash fs-3 mb-2 d-block"></i> Bạn chưa có thông báo nào</li>`;
                if (typeof updateUnreadBadge === 'function') updateUnreadBadge(0);
                return;
            }

            let htmlContent = `
                <li class="p-3 border-bottom bg-light sticky-top" style="z-index: 10;">
                    <h6 class="m-0 fw-bold text-dark">Thông báo của bạn</h6>
                </li>`;

            // Render từng dòng thông báo
            notifications.forEach(n => {
                // CHUẨN HÓA DATA TỪ BACKEND TRẢ VỀ (Bắt chuẩn Key viết Hoa)
                const notifId = n.NotificationID;
                const title = n.Title || "Thông báo hệ thống";
                const message = n.Message || ""; // Code cũ bị lỗi do dùng n.Content

                // Đảm bảo isRead luôn là boolean (DB trả về 0/1 hoặc true/false)
                const isRead = (n.IsRead === 1 || n.IsRead === true);

                if (!isRead) unreadCount++;

                // LOGIC GIAO DIỆN UX: Giống giao diện Driver/Dispatcher
                const isUnread = !isRead;
                const readStatusHtml = isUnread
                    ? `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25" style="font-size: 0.65rem;">Chưa đọc</span>`
                    : `<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25" style="font-size: 0.65rem;">Đã đọc</span>`;

                let typeBadgeClass = 'bg-info';
                let typeText = 'Hệ Thống';
                let typeIconColor = 'text-info';
                let iconClass = 'fa-bell';

                const titleLower = title.toLowerCase();
                const notifType = n.Type || n.type || '';
                
                if (titleLower.includes('hủy') || titleLower.includes('từ chối') || notifType === 'BOOKING_CANCELLED') {
                    typeBadgeClass = 'bg-danger';
                    typeText = 'Đã Hủy';
                    typeIconColor = 'text-danger';
                    iconClass = 'fa-xmark-circle';
                } else if (titleLower.includes('hoàn thành') || notifType === 'BOOKING_COMPLETED') {
                    typeBadgeClass = 'bg-success';
                    typeText = 'Hoàn Thành';
                    typeIconColor = 'text-success';
                    iconClass = 'fa-check-circle';
                } else if (titleLower.includes('tìm thấy') || titleLower.includes('đã nhận') || titleLower.includes('tìm được') || notifType === 'BOOKING_DRIVER_ASSIGNED') {
                    typeBadgeClass = 'bg-success';
                    typeText = 'Có Tài Xế';
                    typeIconColor = 'text-warning';
                    iconClass = 'fa-car';
                } else if (titleLower.includes('duyệt') || notifType === 'BOOKING_APPROVED') {
                    typeBadgeClass = 'bg-primary';
                    typeText = 'Đã Duyệt';
                    typeIconColor = 'text-primary';
                    iconClass = 'fa-clipboard-check';
                } else if (notifType === 'BOOKING_UNASSIGNED' || titleLower.includes('đang tìm')) {
                    typeBadgeClass = 'bg-warning';
                    typeText = 'Đang Tìm';
                    typeIconColor = 'text-warning';
                    iconClass = 'fa-magnifying-glass';
                }

                const textClass = isUnread ? 'text-dark' : 'text-secondary';
                const mutedClass = isUnread ? 'text-secondary' : 'text-muted';
                const bgWrap = isUnread ? 'bg-white' : 'bg-light';
                const borderLeft = isUnread ? 'border-start border-4 border-danger' : 'border-start border-4 border-transparent';

                // Format ngày giờ thân thiện
                const d = new Date(n.CreatedAt);
                const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

                htmlContent += `
                    <li class="border-bottom p-0" style="cursor: pointer; transition: background 0.2s;" 
                        onclick="markAsRead('${notifId}', '${n.BookingID || ''}', this, ${isRead})">
                        <div class="notification-item p-3 ${bgWrap} ${borderLeft}">
                            <div class="d-flex w-100">
                                <div class="me-3 d-flex align-items-center justify-content-center ${typeBadgeClass} bg-opacity-10 rounded-circle ${typeIconColor}" style="width: 42px; height: 42px; flex-shrink: 0;">
                                    <i class="fa-solid ${iconClass} fs-5"></i>
                                </div>
                                <div class="notification-content" style="flex-grow: 1; min-width: 0;">
                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                        <span class="badge ${typeBadgeClass} bg-opacity-10 text-dark border ${typeBadgeClass} border-opacity-25 rounded-pill px-2 py-1" style="font-size: 0.65rem; font-weight: 600;">${typeText}</span>
                                        ${readStatusHtml}
                                    </div>
                                    <h6 class="fw-bold ${textClass} mt-2 mb-1" style="font-size: 0.95rem; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${title}</h6>
                                    <p class="${mutedClass} mb-2 small" style="line-height: 1.4;">${message}</p>
                                    <div class="d-flex align-items-center ${mutedClass}" style="font-size: 0.75rem;">
                                        <i class="fa-regular fa-clock me-1"></i> ${timeStr}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </li>
                `;
            });

            container.innerHTML = htmlContent;

            // Cập nhật số lượng ra cái chuông tổng
            if (typeof updateUnreadBadge === 'function') updateUnreadBadge(unreadCount);

        } else {
            container.innerHTML = `<li class="text-center p-3 text-danger">Lỗi tải dữ liệu</li>`;
        }
    } catch (error) {
        console.error("Lỗi tải thông báo:", error);
        container.innerHTML = `<li class="text-center p-3 text-danger">Lỗi kết nối máy chủ</li>`;
    }
}

// 2. API 5: GỌI API ĐÁNH DẤU ĐÃ ĐỌC (OPTIMISTIC UI - Đổi UI trước, gọi Server sau)
async function markAsRead(notifId, bookingId, element, isAlreadyRead) {
    const token = localStorage.getItem("accessToken");

    // Hàm tiện ích xác định đường dẫn đúng tới tripHistory.html
    const getTripHistoryUrl = (bId) => {
        let path = window.location.pathname;
        let url = 'tripHistory.html';
        if (path.includes('/pages/customer/')) {
            url = 'tripHistory.html';
        } else if (path.includes('/pages/')) {
            url = 'customer/tripHistory.html';
        } else {
            url = 'pages/customer/tripHistory.html';
        }
        return url + '?bookingId=' + bId;
    };

    // Nếu ĐÃ ĐỌC RỒI, chỉ việc chuyển trang (nếu có bookingId)
    if (isAlreadyRead) {
        if (bookingId && bookingId !== 'null') {
            window.location.href = getTripHistoryUrl(bookingId);
        }
        return;
    }

    if (!token) return;

    // ----------------------------------------------------
    // BƯỚC 1: XỬ LÝ GIAO DIỆN NGAY LẬP TỨC (KHÔNG ĐỢI API)
    // ----------------------------------------------------
    element.classList.remove('bg-white');
    element.classList.add('bg-light'); // Đổi nền mờ đi

    const titleEl = element.querySelector('.title-text');
    if (titleEl) {
        titleEl.classList.remove('fw-bold', 'text-dark');
        titleEl.classList.add('text-muted'); // Bỏ in đậm
    }

    const contentEl = element.querySelector('.content-text');
    if (contentEl) {
        contentEl.classList.remove('text-secondary');
        contentEl.classList.add('text-muted');
    }

    // Xóa chấm đỏ bên cạnh thông báo
    const dotEl = element.querySelector('.unread-dot');
    if (dotEl) dotEl.classList.add('d-none');

    // Khóa sự kiện onclick để lần sau nhấn vào không gọi API nữa
    element.setAttribute("onclick", `markAsRead('${notifId}', '${bookingId}', this, true)`);

    // Giảm số lượng chuông báo trên Navbar ngoài cùng đi 1
    decreaseUnreadBadge();

    // ----------------------------------------------------
    // BƯỚC 2: GỌI NGẦM API LÊN SERVER ĐỂ UPDATE DATABASE
    // ----------------------------------------------------
    try {
        await fetch(`http://localhost:8080/FleetFlow/api/v1/customer/notifications/${notifId}/read`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });

        // Sau khi báo đã đọc thành công, điều hướng nếu có bookingId
        if (bookingId && bookingId !== 'null') {
            window.location.href = getTripHistoryUrl(bookingId);
        }
    } catch (error) {
        console.error("Lỗi đồng bộ trạng thái đọc lên Server:", error);
    }
}

// =========================================
// CÁC HÀM TIỆN ÍCH HỖ TRỢ THÔNG BÁO
// =========================================
function updateUnreadBadge(count) {
    const badge = document.getElementById('unreadBadge');
    if (!badge) return;
    badge.dataset.count = count; // Lưu data ngầm
    if (count > 0) {
        badge.classList.remove('d-none');
    } else {
        badge.classList.add('d-none');
    }
}

function decreaseUnreadBadge() {
    const badge = document.getElementById('unreadBadge');
    if (!badge) return;
    let currentCount = parseInt(badge.dataset.count || 0);
    if (currentCount > 0) {
        currentCount--;
        updateUnreadBadge(currentCount);
    }
}

// Tự động check thông báo ngầm 1 lần khi người dùng vừa load trang xong để hiện dấu chấm đỏ
document.addEventListener("DOMContentLoaded", () => {
    // Chỉ cần kiểm tra nếu hàm tồn tại thì cho chạy ngầm 1 lần để check chấm đỏ
    if (typeof loadNotifications === 'function') {
        loadNotifications();
    }
});

// =========================================
// X. GLOBAL MODAL (ALERT & CONFIRM)
// =========================================
document.addEventListener("DOMContentLoaded", function () {
    const modalHtml = `
    <!-- Global Alert Modal -->
    <div class="modal fade" id="globalAlertModal" tabindex="-1" aria-labelledby="globalAlertLabel" aria-hidden="true" style="z-index: 9999;">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content" style="border-radius: 15px; border: none; box-shadow: 0 10px 30px rgba(0,0,0,0.15);">
                <div class="modal-body text-center p-4">
                    <div id="globalAlertIcon" class="mb-3" style="font-size: 3rem;"></div>
                    <h5 id="globalAlertTitle" class="fw-bold mb-3">Thông báo</h5>
                    <p id="globalAlertMessage" class="text-muted mb-4"></p>
                    <button type="button" class="btn btn-dark w-100 fw-bold" style="border-radius: 10px; padding: 12px;" data-bs-dismiss="modal">Đóng</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Global Confirm Modal -->
    <div class="modal fade" id="globalConfirmModal" tabindex="-1" aria-labelledby="globalConfirmLabel" aria-hidden="true" style="z-index: 9999;">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content" style="border-radius: 15px; border: none; box-shadow: 0 10px 30px rgba(0,0,0,0.15);">
                <div class="modal-body text-center p-4">
                    <div id="globalConfirmIcon" class="mb-3 text-warning" style="font-size: 3rem;"><i class="fa-solid fa-circle-question"></i></div>
                    <h5 id="globalConfirmTitle" class="fw-bold mb-3">Xác nhận</h5>
                    <p id="globalConfirmMessage" class="text-muted mb-4"></p>
                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-light w-50 fw-bold" style="border-radius: 10px; padding: 12px;" id="btnGlobalConfirmCancel">Hủy</button>
                        <button type="button" class="btn btn-primary w-50 fw-bold" style="border-radius: 10px; padding: 12px;" id="btnGlobalConfirmOk">Đồng ý</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    // Chèn HTML modal vào cuối body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
});

// Hàm gọi Alert Modal
window.showModalAlert = function (message, title = 'Thông báo', type = 'info') {
    let iconHtml = '<i class="fa-solid fa-circle-info text-info"></i>';
    if (type === 'success') iconHtml = '<i class="fa-solid fa-circle-check text-success"></i>';
    else if (type === 'error') iconHtml = '<i class="fa-solid fa-circle-xmark text-danger"></i>';
    else if (type === 'warning') iconHtml = '<i class="fa-solid fa-triangle-exclamation text-warning"></i>';

    document.getElementById('globalAlertIcon').innerHTML = iconHtml;
    document.getElementById('globalAlertTitle').innerText = title;
    document.getElementById('globalAlertMessage').innerText = message;

    const alertModalEl = document.getElementById('globalAlertModal');
    if (alertModalEl) {
        const alertModal = bootstrap.Modal.getOrCreateInstance(alertModalEl);
        alertModal.show();
    }
};

// Hàm gọi Confirm Modal (Trả về Promise)
window.showModalConfirm = function (message, title = 'Xác nhận', type = 'warning') {
    return new Promise((resolve) => {
        let iconHtml = '<i class="fa-solid fa-circle-question text-warning"></i>';
        if (type === 'danger') iconHtml = '<i class="fa-solid fa-triangle-exclamation text-danger"></i>';

        document.getElementById('globalConfirmIcon').innerHTML = iconHtml;
        document.getElementById('globalConfirmTitle').innerText = title;
        document.getElementById('globalConfirmMessage').innerText = message;

        const confirmModalEl = document.getElementById('globalConfirmModal');
        const confirmModal = bootstrap.Modal.getOrCreateInstance(confirmModalEl);

        const btnOk = document.getElementById('btnGlobalConfirmOk');
        const btnCancel = document.getElementById('btnGlobalConfirmCancel');

        // Cập nhật giao diện nút Ok nếu là dạng Danger
        if (type === 'danger') {
            btnOk.className = 'btn btn-danger w-50 fw-bold';
        } else {
            btnOk.className = 'btn btn-primary w-50 fw-bold';
        }

        // Remove old event listeners by cloning
        const newBtnOk = btnOk.cloneNode(true);
        const newBtnCancel = btnCancel.cloneNode(true);
        btnOk.parentNode.replaceChild(newBtnOk, btnOk);
        btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);

        let isResolved = false;

        newBtnOk.addEventListener('click', () => {
            if (!isResolved) {
                isResolved = true;
                confirmModal.hide();
                resolve(true);
            }
        });


        newBtnCancel.addEventListener('click', () => {
            if (!isResolved) {
                isResolved = true;
                confirmModal.hide();
                resolve(false);
            }
        });

        // Xử lý khi bấm nút X hoặc click ra ngoài Modal
        confirmModalEl.addEventListener('hidden.bs.modal', function onHidden() {
            confirmModalEl.removeEventListener('hidden.bs.modal', onHidden);
            if (!isResolved) {
                isResolved = true;
                resolve(false);
            }
        });

        confirmModal.show();
    });
};

document.addEventListener("DOMContentLoaded", function() {
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

document.addEventListener("DOMContentLoaded", function() {
    // Logic cho Mobile Dropdown Glass Menu
    const mobileBtn = document.getElementById('mobileToggleBtn');
    const mobileDropdown = document.getElementById('mobileDropdown');

    if (mobileBtn && mobileDropdown) {
        mobileBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài
            this.classList.toggle('active');
            mobileDropdown.classList.toggle('show');
        });

        // Click ra ngoài màn hình sẽ tự động đóng menu
        document.addEventListener('click', function(event) {
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
        btn.addEventListener('click', function(e) {
            e.preventDefault(); 
            loginModal.classList.add('active');
            document.body.style.overflow = 'hidden'; 
            
            // UX Tinh tế: Tự động đóng dropdown mobile nếu nó đang mở
            const mobileDropdown = document.getElementById('mobileDropdown');
            const mobileBtn = document.getElementById('mobileToggleBtn');
            if(mobileDropdown && mobileDropdown.classList.contains('show')) {
                mobileDropdown.classList.remove('show');
                mobileBtn.classList.remove('active');
            }
        });
    });

    // Đóng Modal khi bấm nút X
    closeLoginModal.addEventListener('click', function() {
        loginModal.classList.remove('active');
        document.body.style.overflow = ''; 
    });

    // Đóng Modal khi bấm ra vùng tối bên ngoài
    loginModal.addEventListener('click', function(e) {
        if (e.target === loginModal) {
            loginModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

document.addEventListener("DOMContentLoaded", function() {
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

    if (currentPath.includes('/pages/customer/') || 
        currentPath.includes('/pages/driver/') || 
        currentPath.includes('/pages/admin/') || 
        currentPath.includes('/pages/dispatcher/')) {
        profileUrl = '../profile.html';
        indexUrl = '../../index.html';
    } else if (currentPath.includes('/pages/')) {
        profileUrl = 'profile.html';
        indexUrl = '../index.html';
    }

    // Khối giao diện Avatar hiển thị thay thế nút Đăng nhập
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
                    localStorage.clear(); 
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
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString()
        });

        const data = await response.json();

        // Xử lý phản hồi
        if (data.success) {    
            // Nếu đăng nhập đúng, ẩn dòng quên mật khẩu đi (nếu nó đang hiện)
            const errorHelper = document.getElementById('errorHelperText');
            if (errorHelper) errorHelper.classList.add('d-none');

            // Lưu Token...
            if (data.accessToken || data.token) { 
                const tokenToSave = data.accessToken || data.token; 
                localStorage.setItem('accessToken', tokenToSave);
                if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
                
                localStorage.setItem('fullName', data.user.fullName);
                localStorage.setItem('userRole', data.user.roleName);
                localStorage.setItem('email', email); 
            }

            // Dọn dẹp UI
            document.getElementById('loginModal').classList.remove('active');
            document.body.style.overflow = '';

            // ĐIỀU PHỐI TRANG... (Phần switch case giữ nguyên)
            const userRole = data.user.roleName.toUpperCase();
            switch (userRole) {
                case 'ADMIN': window.location.href = '../pages/admin/admin-workspace.html'; break;
                case 'DRIVER': window.location.href = '../pages/driver/driver-workspace.html'; break;
                case 'CUSTOMER': window.location.href = '../pages/findCar.html'; break;
                case 'DISPATCHER': window.location.href = '../pages/dispatcher/dispatcher-workspace.html'; break;
                default:
                    alert('Lỗi: Vai trò của bạn không hợp lệ hoặc chưa được phân quyền trong hệ thống.');
                    localStorage.clear();
                    break;
            }
        } else {
            // NẾU ĐĂNG NHẬP SAI:
            alert('Lỗi đăng nhập: ' + data.message);
            
            // Xóa dữ liệu ô mật khẩu và focus lại để khách dễ nhập lại
            const pwdInput = document.getElementById('loginPassword');
            pwdInput.value = '';
            pwdInput.focus();

            // Hiển thị nút "Quên tài khoản hoặc mật khẩu?"
            const errorHelper = document.getElementById('errorHelperText');
            if (errorHelper) {
                errorHelper.classList.remove('d-none');
            }
        }

    } catch (error) {
        console.error('Lỗi kết nối tới Backend:', error);
        alert('Không thể kết nối tới máy chủ. Vui lòng kiểm tra Server NetBeans (Tomcat/Glassfish) đã được bật chưa.');
    }
}
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

document.addEventListener("DOMContentLoaded", function () {
    const introOverlay = document.getElementById("intro-overlay");
    const introVideo = document.getElementById("intro-video");
    const skipBtn = document.getElementById("skip-btn");

    if (introOverlay && introVideo && skipBtn) {
        function hideIntro() {
            introOverlay.classList.add("fade-out");
            setTimeout(() => {
                introVideo.pause();
            }, 800);
        }

        introVideo.addEventListener("ended", hideIntro);
        skipBtn.addEventListener("click", hideIntro);
    }
});

document.addEventListener("DOMContentLoaded", function() {
        const fullName = localStorage.getItem('fullName');
        const accessToken = localStorage.getItem('accessToken');

        if (accessToken && fullName) {
            const avatarName = encodeURIComponent(fullName);

            // ==========================================
            // XỬ LÝ NÚT DESKTOP
            // ==========================================
            const oldBtnDesktop = document.getElementById('btnLogin');
            if (oldBtnDesktop) {
                // 1. Tuyệt chiêu Clone: Tạo ra một nút mới tinh để rũ bỏ mọi Event Listener mở Modal cũ
                const btnDesktop = oldBtnDesktop.cloneNode(false);
                oldBtnDesktop.parentNode.replaceChild(btnDesktop, oldBtnDesktop);
                
                // 2. Gán lại ID và cấp Class giao diện mới
                btnDesktop.id = 'btnLogin';
                btnDesktop.className = oldBtnDesktop.className; // Kế thừa class cũ (như d-none, d-lg-flex)
                btnDesktop.classList.remove('btn-login');       // Xóa class nút đăng nhập
                btnDesktop.classList.add('user-profile-btn');   // Thêm class nút Profile
                
                // 3. Đổ HTML (Giao diện Profile + Dropdown)
                btnDesktop.innerHTML = `
                    <div class="d-flex flex-column align-items-end text-end" style="line-height: 1.2; padding-right: 10px;">
                        <span class="fw-bold" style="font-size: 0.95rem; color: var(--color-dark);">${fullName}</span>
                        <span class="fw-medium" style="font-size: 0.75rem; color: #64748b;">Khách hàng</span>
                    </div>
                    <img src="https://ui-avatars.com/api/?name=${avatarName}&background=00B14F&color=fff" style="width: 34px; height: 34px; border-radius: 50%;" />
                    
                    <div class="dropdown-menu-modern shadow-lg">        
                        <a href="#profile" class="dropdown-item-custom">
                            <i class="fa-solid fa-user-shield"></i> Hồ sơ cá nhân
                        </a>
                        <hr class="divider-custom">
                        <a href="#" class="dropdown-item-custom text-danger fw-bold logout-item">
                            <i class="fa-solid fa-arrow-right-from-bracket"></i> Đăng xuất
                        </a>
                    </div>
                `;

                // 4. Ngăn chặn click vào nút profile làm trang bị nhảy lên trên cùng
                btnDesktop.addEventListener('click', (e) => {
                    // Nếu click vào phần tử chứa class logout-item thì bỏ qua để xử lý đăng xuất
                    if (!e.target.closest('.logout-item')) {
                        e.preventDefault();
                    }
                });

                // 5. Gắn sự kiện Đăng xuất an toàn
                const logoutBtn = btnDesktop.querySelector('.logout-item');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation(); // Ngăn sự kiện click vô tình bong bóng (bubble) ra ngoài
                        
                        localStorage.clear(); 
                        window.location.href = '../index.html'; // Đẩy về trang chủ
                        
                    });
                }
            }

            // ==========================================
            // XỬ LÝ NÚT MOBILE (LÀM TƯƠNG TỰ)
            // ==========================================
            const oldBtnMobile = document.getElementById('btnLoginMobile');
            if (oldBtnMobile) {
                const btnMobile = oldBtnMobile.cloneNode(false);
                oldBtnMobile.parentNode.replaceChild(btnMobile, oldBtnMobile);
                
                btnMobile.id = 'btnLoginMobile';
                                // Thay thế dòng: btnMobile.className = 'user-profile-btn w-100 mt-2';
                // Thành 4 dòng sau:
                btnMobile.className = oldBtnMobile.className;   // Kế thừa class cũ (như d-lg-none)
                btnMobile.classList.remove('btn-login');
                btnMobile.classList.add('user-profile-btn');
                btnMobile.classList.add('mt-2');                // Thêm margin-top cho menu điện thoại
                
                btnMobile.innerHTML = `
                    <div class="d-flex flex-column align-items-end text-end" style="line-height: 1.2; padding-right: 10px;">
                        <span class="fw-bold" style="font-size: 0.95rem; color: var(--color-dark);">${fullName}</span>
                        <span class="fw-medium" style="font-size: 0.75rem; color: #64748b;">Khách hàng</span>
                    </div>
                    <img src="https://ui-avatars.com/api/?name=${avatarName}&background=00B14F&color=fff" style="width: 34px; height: 34px; border-radius: 50%;" />
                    
                    <div class="dropdown-menu-modern shadow-lg">        
                        <a href="#profile" class="dropdown-item-custom">
                            <i class="fa-solid fa-user-shield"></i> Hồ sơ cá nhân
                        </a>
                        <hr class="divider-custom">
                        <a href="#" class="dropdown-item-custom text-danger fw-bold logout-item">
                            <i class="fa-solid fa-arrow-right-from-bracket"></i> Đăng xuất
                        </a>
                    </div>
                `;

                btnMobile.addEventListener('click', (e) => {
                    if (!e.target.closest('.logout-item')) e.preventDefault();
                });

                const logoutBtnMb = btnMobile.querySelector('.logout-item');
                if (logoutBtnMb) {
                    logoutBtnMb.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        localStorage.clear(); 
                            window.location.href = '../index.html';
                    });
                }
            }
        }
    });

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
            // Lưu Token
            if (data.accessToken) {
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                
                // THÊM DÒNG NÀY: Lưu tên và role người dùng để trang khác dùng lại
                localStorage.setItem('fullName', data.user.fullName);
                localStorage.setItem('userRole', data.user.roleName);
            }

            // Dọn dẹp UI
            document.getElementById('loginModal').classList.remove('active');
            document.body.style.overflow = '';

            // ----------------------------------------------------
            // ĐIỀU PHỐI TRANG 
            const userRole = data.user.roleName.toUpperCase(); // Chuyển thành in hoa để dễ so sánh

            switch (userRole) {
                case 'ADMIN':
                    window.location.href = '../pages/admin/admin-workspace.html';
                    break;
                case 'DRIVER':
                    window.location.href = '../pages/driver/driver-workspace.html';
                    break;
                case 'CUSTOMER':
                    window.location.href = '../pages/findCar.html';
                    break;
                default:
                    alert('Lỗi: Vai trò của bạn không hợp lệ hoặc chưa được phân quyền trong hệ thống.');
                    localStorage.clear();
                    break;
            }
        } else {
            alert('Lỗi đăng nhập: ' + data.message);
        }

    } catch (error) {
        console.error('Lỗi kết nối tới Backend:', error);
        alert('Không thể kết nối tới máy chủ. Vui lòng kiểm tra Server NetBeans (Tomcat/Glassfish) đã được bật chưa.');
    }
}
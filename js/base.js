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
        // QUAN TRỌNG: Sửa "TenProjectCuaBan" thành Context Path thực tế trên NetBeans
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
            alert('Đăng nhập thành công! Chào mừng ' + data.user.fullName);
            
            // Lưu Token
            if (data.accessToken) {
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
            }

            // Dọn dẹp UI
            document.getElementById('loginModal').classList.remove('active');
            document.body.style.overflow = '';

            // ----------------------------------------------------
            // ĐIỀU PHỐI TRANG 
            // Nếu admin.html nằm trong thư mục pages/, hãy sửa thành 'pages/admin.html'
            // ----------------------------------------------------
            window.location.href = '../../pages/admin/admin-workspace.html'; 

        } else {
            alert('Lỗi đăng nhập: ' + data.message);
        }

    } catch (error) {
        console.error('Lỗi kết nối tới Backend:', error);
        alert('Không thể kết nối tới máy chủ. Vui lòng kiểm tra Server NetBeans (Tomcat/Glassfish) đã được bật chưa.');
    }
}
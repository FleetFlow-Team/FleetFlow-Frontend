document.addEventListener("DOMContentLoaded", function() {
    const fullName = localStorage.getItem('fullName');
    const accessToken = localStorage.getItem('accessToken');
    const userRole = localStorage.getItem('userRole') || 'Khách hàng';

    // 1. KIỂM TRA: Nếu không có Token hoặc Tên -> Chặn và đẩy về Trang chủ
    if (!accessToken || !fullName) {
        alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
        window.location.href = '../../index.html'; 
        return; 
    }

    // 2. TẠO AVATAR VÀ RENDER GIAO DIỆN
    const avatarName = encodeURIComponent(fullName);

    // Xử lý Desktop
    const btnDesktop = document.getElementById('btnLogin');
    if (btnDesktop) {
        btnDesktop.className = 'user-profile-btn position-relative';
        btnDesktop.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <div class="d-flex flex-column align-items-end text-end" style="line-height: 1.2;">
                    <span class="fw-bold" style="font-size: 0.95rem; color: var(--color-dark);">${fullName}</span>
                    <span class="fw-medium" style="font-size: 0.75rem; color: #64748b;">${userRole}</span>
                </div>
                <img src="https://ui-avatars.com/api/?name=${avatarName}&background=00B14F&color=fff" style="width: 34px; height: 34px; border-radius: 50%;" />
            </div>
            
            <div class="dropdown-menu-modern shadow">
                <a href="../customer/profile.html" class="dropdown-item-custom"><i class="fa-regular fa-user"></i> Hồ sơ của tôi</a>
                <a href="tripHistory.html" class="dropdown-item-custom active"><i class="fa-solid fa-clock-rotate-left"></i> Lịch sử chuyến đi</a>
                <hr style="margin: 5px 0; opacity: 0.1;">
                <a href="#" id="btnLogout" class="dropdown-item-custom text-danger"><i class="fa-solid fa-arrow-right-from-bracket"></i> Đăng xuất</a>
            </div>
        `;

        // Bắt sự kiện đăng xuất cho Desktop
        document.getElementById('btnLogout').addEventListener('click', (e) => { 
            e.preventDefault(); 
            if(confirm('Đăng xuất khỏi FleetFlow?')) { 
                localStorage.clear(); 
                window.location.href = '../../index.html'; 
            } 
        });
    }

    // Xử lý Mobile (Navbar đáy)
    const btnMobile = document.getElementById('btnLoginMobile');
    if (btnMobile) {
        btnMobile.className = 'nav-link-center user-profile-btn'; 
        btnMobile.innerHTML = `
            <img src="https://ui-avatars.com/api/?name=${avatarName}&background=00B14F&color=fff" style="width: 24px; height: 24px; border-radius: 50%; margin-bottom: 2px;" />
            <span class="nav-text text-truncate" style="max-width: 60px;">${fullName.split(' ').pop()}</span>
        `;
    }
});
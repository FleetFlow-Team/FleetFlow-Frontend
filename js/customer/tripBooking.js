document.addEventListener("DOMContentLoaded", function() {
    // 1. Lấy dữ liệu từ localStorage
    const fullName = localStorage.getItem('fullName');
    const accessToken = localStorage.getItem('accessToken');
    const userRole = localStorage.getItem('userRole') || 'Khách hàng';

    // 2. Lấy các phần tử trên DOM
    const authContainer = document.getElementById('desktopAuthContainer');
    const notiBtn = document.getElementById('notificationBtn');
    const btnMobile = document.getElementById('btnLoginMobile');

    // 3. Nếu ĐÃ ĐĂNG NHẬP
    if (accessToken && fullName) {
        // Mã hóa tên để làm URL Avatar
        const avatarName = encodeURIComponent(fullName);

        // --- GIAO DIỆN DESKTOP ---
        if (authContainer) {
            authContainer.innerHTML = `
                <div class="user-profile-btn d-flex align-items-center gap-2 position-relative" style="cursor: pointer;">
                    <div class="d-flex flex-column align-items-end text-end" style="line-height: 1.2;">
                        <span class="fw-bold" style="font-size: 0.95rem; color: var(--color-dark); padding-left: 10px">${fullName}</span>
                        <span class="fw-medium" style="font-size: 0.75rem; color: #64748b;">${userRole}</span>
                    </div>
                    <img src="https://ui-avatars.com/api/?name=${avatarName}&background=00B14F&color=fff" style="width: 34px; height: 34px; border-radius: 50%;" />
                    
                    <div class="dropdown-menu-modern shadow">
                        <a href="profile.html" class="dropdown-item-custom"><i class="fa-regular fa-user"></i> Hồ sơ của tôi</a>
                        <a href="tripHistory.html" class="dropdown-item-custom"><i class="fa-solid fa-clock-rotate-left"></i> Lịch sử chuyến đi</a>
                        <hr style="margin: 5px 0; opacity: 0.1;">
                        <a href="#" id="btnLogout" class="dropdown-item-custom text-danger"><i class="fa-solid fa-arrow-right-from-bracket"></i> Đăng xuất</a>
                    </div>
                </div>
            `;

            // Kích hoạt sự kiện Đăng xuất
            document.getElementById('btnLogout').addEventListener('click', function(e) {
                e.preventDefault();
                if(confirm('Bạn có chắc chắn muốn đăng xuất khỏi FleetFlow?')) {
                    localStorage.clear(); // Xóa token
                    window.location.reload(); // Tải lại trang (sẽ tự quay về trạng thái chưa đăng nhập)
                }
            });
        }

        // --- GIAO DIỆN MOBILE ---
        if (btnMobile) {
            btnMobile.href = "profile.html"; // Trỏ về trang cá nhân thay vì trang login
            
            btnMobile.innerHTML = `
                <img src="https://ui-avatars.com/api/?name=${avatarName}&background=00B14F&color=fff" style="width: 22px; height: 22px; border-radius: 50%; margin-bottom: 3px;" />
                <span class="nav-text">Tài khoản</span>
            `;
        }

        // Hiển thị nút chuông thông báo
        if (notiBtn) notiBtn.style.display = 'block';

    } else {
        // NẾU CHƯA ĐĂNG NHẬP
        // Giao diện đã có sẵn nút "Đăng nhập" ở HTML, ta chỉ cần chắc chắn ẩn chuông
        if (notiBtn) notiBtn.style.display = 'none';

        // (Tùy chọn) Nếu bạn muốn bắt buộc phải đăng nhập mới được đặt xe, hãy mở comment dòng dưới:
        // window.location.href = 'login.html'; 
    }
});
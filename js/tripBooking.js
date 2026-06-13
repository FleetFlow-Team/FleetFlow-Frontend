document.addEventListener("DOMContentLoaded", function() {
        const fullName = localStorage.getItem('fullName');
        const accessToken = localStorage.getItem('accessToken');

        if (accessToken && fullName) {
            // Tự động xử lý khoảng trắng để truyền vào API tạo Avatar
            const avatarName = encodeURIComponent(fullName);

            // Sửa nút Desktop
            const btnDesktop = document.getElementById('btnLogin');
            if (btnDesktop) {
                // Thay thế class cũ thành class mới của bạn
                btnDesktop.className = 'user-profile-btn';
                btnDesktop.innerHTML = `
                    <div class="d-flex flex-column align-items-end text-end" style="line-height: 1.2; padding-right: 10px;">
                        <span class="fw-bold" style="font-size: 0.95rem; color: var(--color-dark);">${fullName}</span>
                        <span class="fw-medium" style="font-size: 0.75rem; color: #64748b;">Khách hàng</span>
                    </div>
                    <img src="https://ui-avatars.com/api/?name=${avatarName}&background=00B14F&color=fff" style="width: 34px; height: 34px; border-radius: 50%;" />
                `;
                btnDesktop.onclick = (e) => { e.preventDefault(); if(confirm('Đăng xuất khỏi FleetFlow?')) { localStorage.clear(); window.location.reload(); } };
            }

            // Sửa nút Mobile (Giữ nguyên form giống desktop cho đồng bộ)
            const btnMobile = document.getElementById('btnLoginMobile');
            if (btnMobile) {
                btnMobile.className = 'user-profile-btn w-100 mt-2'; // Thêm w-100 để bung đầy menu mobile
                btnMobile.innerHTML = `
                    <div class="d-flex flex-column align-items-end text-end" style="line-height: 1.2; padding-right: 10px;">
                        <span class="fw-bold" style="font-size: 0.95rem; color: var(--color-dark);">${fullName}</span>
                        <span class="fw-medium" style="font-size: 0.75rem; color: #64748b;">Khách hàng</span>
                    </div>
                    <img src="https://ui-avatars.com/api/?name=${avatarName}&background=00B14F&color=fff" style="width: 34px; height: 34px; border-radius: 50%;" />
                `;
                btnMobile.onclick = (e) => { e.preventDefault(); if(confirm('Đăng xuất khỏi FleetFlow?')) { localStorage.clear(); window.location.reload(); } };
            }
        }
    });
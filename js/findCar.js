document.addEventListener("DOMContentLoaded", function() {
    // 1. Lấy thông tin từ localStorage
    const fullName = localStorage.getItem('fullName');
    const accessToken = localStorage.getItem('accessToken');

    // 2. Nếu đã đăng nhập (có token và có tên)
    if (accessToken && fullName) {
        
        // --- XỬ LÝ NAVBAR DESKTOP ---
        const btnLoginDesktop = document.getElementById('btnLogin');
        if (btnLoginDesktop) {
            // Thay đổi cấu trúc HTML của nút thành Tên + Icon User
            btnLoginDesktop.innerHTML = `
                <span class="fw-bold">${fullName}</span>
                <i class="fa-solid fa-circle-user fs-4"></i>
            `;
            // Biến nút đăng nhập thành một nút drop-down hoặc nút profile (Xóa nền xanh, chỉ để lại text trắng)
            btnLoginDesktop.style.background = 'rgba(255, 255, 255, 0.15)';
            btnLoginDesktop.style.color = 'white';
            
            // Thêm chức năng Đăng xuất khi click vào tên
            btnLoginDesktop.onclick = function(e) {
                e.preventDefault();
                if(confirm('Bạn có muốn đăng xuất khỏi FleetFlow không?')) {
                    localStorage.clear(); // Xóa sạch dữ liệu
                    window.location.reload(); // Tải lại trang (sẽ quay về giao diện chưa đăng nhập)
                }
            };
        }

        // --- XỬ LÝ NAVBAR MOBILE ---
        // (Trong file HTML của bạn nút mobile có id="btnLoginMobile")
        const btnLoginMobile = document.getElementById('btnLoginMobile');
        if (btnLoginMobile) {
            btnLoginMobile.innerHTML = `
                <span class="fw-bold">${fullName}</span>
                <i class="fa-solid fa-circle-user fs-4 text-white"></i>
            `;
            btnLoginMobile.style.background = 'var(--color-1)'; // Đổi màu nền xanh
            btnLoginMobile.style.color = 'white';
            
            btnLoginMobile.onclick = function(e) {
                e.preventDefault();
                if(confirm('Bạn có muốn đăng xuất khỏi FleetFlow không?')) {
                    localStorage.clear();
                    window.location.reload();
                }
            };
        }
    }
});
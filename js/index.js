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
            alert('Đăng nhập thành công! Chào mừng ' + data.user.fullName);
    
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
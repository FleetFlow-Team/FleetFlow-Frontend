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
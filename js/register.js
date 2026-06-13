// Đợi DOM tải xong trước khi gán sự kiện
document.addEventListener('DOMContentLoaded', function() {
    
    // Lấy form đăng ký dựa trên ID được định nghĩa trong HTML[cite: 1]
    const registerForm = document.getElementById('registerForm');

    if (registerForm) {
        registerForm.addEventListener('submit', async function(event) {
            // Ngăn chặn hành vi reload trang mặc định của form
            event.preventDefault();

            // 1. Lấy dữ liệu từ các ô input trong HTML[cite: 1]
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const rePassword = document.getElementById('rePassword').value;
            const phoneNumber = document.getElementById('phoneNumber').value.trim();

            // 2. Validate cơ bản ở Frontend
            if (password !== rePassword) {
                alert('Mật khẩu nhập lại không khớp. Vui lòng kiểm tra lại!');
                return;
            }

            // 3. Chuẩn bị dữ liệu gửi xuống Backend
            // Vì Backend dùng request.getParameter() nên ta phải gửi dạng x-www-form-urlencoded
            const formData = new URLSearchParams();
            formData.append('fullName', name);       // Khớp với String fullName = request.getParameter("fullName");
            formData.append('email', email);         // Khớp với String email = request.getParameter("email");
            formData.append('password', password);   // Khớp với String password = request.getParameter("password");
            formData.append('phoneNumber', phoneNumber); // Khớp với String phoneNumber = request.getParameter("phoneNumber");[cite: 2]
            // Lưu ý: roleName sẽ tự động mặ định là "Customer" ở Backend nếu không gửi[cite: 2]

            try {
                // Đổi "FleetFlow" thành tên Context Path thực tế của bạn trên NetBeans nếu cần
                const apiUrl = 'http://localhost:8080/FleetFlow/api/v1/auth/register'; 

                // Hiển thị trạng thái loading (tùy chọn)
                const submitBtn = registerForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.innerText;
                submitBtn.innerText = 'Đang xử lý...';
                submitBtn.disabled = true;

                // 4. Gọi API bằng Fetch
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
                    },
                    body: formData.toString()
                });

                // 5. Đọc JSON trả về từ Servlet (Map<String, Object> apiResponse)[cite: 2]
                const data = await response.json();

                // Phục hồi lại nút submit
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;

                // 6. Xử lý logic theo kết quả Backend trả về[cite: 2]
                if (data.success) {
                    // Hiển thị thông báo thành công (message từ Backend: "Đăng ký tài khoản thành công với vai trò...")[cite: 2]
                    alert(data.message); 
                    
                    // Chuyển hướng người dùng về trang đăng nhập
                    window.location.href = '../index.html'; 
                } else {
                    // Nếu thất bại (VD: email đã tồn tại), hiển thị thông báo lỗi[cite: 2]
                    alert('Lỗi: ' + data.message);
                }

            } catch (error) {
                console.error('Lỗi khi gọi API đăng ký:', error);
                alert('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại server NetBeans!');
                
                // Phục hồi lại nút submit nếu có lỗi mạng
                const submitBtn = registerForm.querySelector('button[type="submit"]');
                submitBtn.innerText = 'Đăng kí tài khoản';
                submitBtn.disabled = false;
            }
        });
    }
});
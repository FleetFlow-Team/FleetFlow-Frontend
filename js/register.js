// Đợi DOM tải xong trước khi gán sự kiện
document.addEventListener('DOMContentLoaded', function() {
    
    const registerForm = document.getElementById('registerForm');

    if (registerForm) {
        registerForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            // 1. Lấy và chuẩn hóa dữ liệu từ form
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const rePassword = document.getElementById('rePassword').value;
            const phoneNumber = document.getElementById('phoneNumber').value.trim();
            const roleName = document.getElementById('roleName').value; // Bắt buộc là "Customer" hoặc "Driver"

            // 2. Validate Frontend
            if (password !== rePassword) {
                alert('Mật khẩu nhập lại không khớp. Vui lòng kiểm tra lại!');
                return;
            }

            // 3. Đóng gói dữ liệu (Ánh xạ chuẩn xác với request.getParameter trong Controller)
            const formData = new URLSearchParams();
            formData.append('fullName', name);       
            formData.append('email', email);         
            formData.append('password', password);   
            formData.append('phoneNumber', phoneNumber); 
            formData.append('roleName', roleName);
            // Controller có nhận tham số address, ta có thể gửi rỗng để tránh lỗi null pointer tiềm ẩn
            formData.append('address', ''); 

            try {
                // Đảm bảo URL trỏ đúng vào Endpoint của Controller
                const apiUrl = 'http://localhost:8080/FleetFlow/api/v1/auth/register'; 

                // 4. Cập nhật UI trạng thái Loading
                const submitBtn = registerForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.innerText;
                submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang xử lý...';
                submitBtn.disabled = true;

                // 5. Gửi request
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
                    },
                    body: formData.toString()
                });

                // 6. Xử lý phản hồi từ RegisterController
                const data = await response.json();

                // Phục hồi nút bấm
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;

                if (data.success) {
                    // Đăng ký thành công
                    alert("Thành công: " + data.message); 
                    
                    // Bạn có thể tận dụng data.accountID ở đây nếu cần lưu vào sessionStorage
                    // sessionStorage.setItem('tempAccountId', data.accountID);
                    
                    registerForm.reset();
                    window.location.href = '../index.html'; 
                } else {
                    // Đăng ký thất bại (Sai định dạng role, trùng email, v.v.)
                    alert("Thất bại: " + data.message);
                }

            } catch (error) {
                console.error('Lỗi khi gọi API đăng ký:', error);
                alert('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại trạng thái server Tomcat/Glassfish!');
                
                const submitBtn = registerForm.querySelector('button[type="submit"]');
                submitBtn.innerText = 'Đăng kí tài khoản';
                submitBtn.disabled = false;
            }
        });
    }
});
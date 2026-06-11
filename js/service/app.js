        // ==========================================
        // KẾT NỐI API ĐĂNG NHẬP VỚI JAVA NETBEANS
        // ==========================================
        // Đổi "8080" thành Port Tomcat của bạn và "FleetFlow" thành tên project NetBeans
        const API_BASE_URL = "http://localhost:8080/FleetFlow/api/auth";

        function handleLogin(e) {
            e.preventDefault(); // Chặn việc load lại trang khi bấm submit form
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const btn = document.getElementById('btnSubmitLogin');
            const originalHTML = btn.innerHTML;
            
            // 1. Hiệu ứng Loading cho nút bấm
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang xác thực...';

            // 2. Gửi API bằng Fetch
            fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email, password: password })
            })
            .then(async response => {
                const data = await response.json();
                
                if (response.ok && data.status === 'success') {
                    // Thành công: Lưu token vào LocalStorage
                    localStorage.setItem('fleetflow_token', data.token);
                    
                    // Chuyển hướng sang trang Admin/Dispatcher do Backend chỉ định
                    window.location.href = data.redirectUrl || "pages/demo-admin.html"; 
                } else {
                    // Thất bại (Sai mật khẩu, v.v.)
                    alert(data.message || "Sai email hoặc mật khẩu!");
                    btn.disabled = false;
                    btn.innerHTML = originalHTML; // Trả lại giao diện nút cũ
                }
            })
            .catch(error => {
                // Lỗi không kết nối được Server (Do tắt NetBeans, sai CORS, sai URL...)
                console.error("Lỗi kết nối:", error);
                alert("Lỗi kết nối máy chủ. Vui lòng kiểm tra lại NetBeans/Tomcat!");
                btn.disabled = false;
                btn.innerHTML = originalHTML;
            });
        }
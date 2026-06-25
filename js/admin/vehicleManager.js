document.addEventListener('DOMContentLoaded', () => {
    const addVehicleForm = document.getElementById('addVehicleForm');
    
    if (addVehicleForm) {
        addVehicleForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // Lấy giá trị từ các trường
            const licensePlate = document.getElementById('vLicensePlate').value.trim();
            const brand = document.getElementById('vBrand').value.trim();
            const model = document.getElementById('vModel').value.trim();
            const seatCount = parseInt(document.getElementById('vSeatCount').value, 10);
            const yearOfManufacture = document.getElementById('vYear').value ? parseInt(document.getElementById('vYear').value, 10) : null;
            const color = document.getElementById('vColor').value.trim();

            if (!licensePlate || !brand || !seatCount) {
                showSystemToast("Vui lòng điền các trường bắt buộc (*).", "error");
                return;
            }

            const payload = {
                licensePlate,
                brand,
                model,
                seatCount,
                yearOfManufacture,
                color,
                // Các thông số mặc định khác nếu cần thiết
                status: 'AVAILABLE'
            };

            const btnSubmit = addVehicleForm.querySelector('button[type="submit"]');
            const originalBtnText = btnSubmit.innerHTML;
            btnSubmit.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin me-2"></i> Đang đăng ký...`;
            btnSubmit.disabled = true;

            try {
                // Gọi API backend (cần đảm bảo đã có API hoặc dùng mock)
                // Thay API_BASE_URL hoặc đường dẫn tương ứng với Backend của bạn
                const response = await fetch('http://localhost:8080/FleetFlow/api/v1/admin/vehicles', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('accessToken')}`
                    },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    showSystemToast("Đăng ký phương tiện mới thành công!", "success");
                    addVehicleForm.reset();
                    // Bạn có thể reload lại bảng fleet ở tab Quản lý Bảo dưỡng ở đây nếu cần
                } else {
                    showSystemToast(result.message || result.error || "Có lỗi xảy ra khi tạo xe", "error");
                }
            } catch (err) {
                console.error("Vehicle creation error:", err);
                showSystemToast("Mất kết nối tới máy chủ khi tạo xe", "error");
            } finally {
                btnSubmit.innerHTML = originalBtnText;
                btnSubmit.disabled = false;
            }
        });
    }
});

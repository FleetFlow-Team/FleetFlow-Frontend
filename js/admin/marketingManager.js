/**
 * marketingManager.js - Quản lý chức năng Chiến dịch Marketing cho Admin Workspace
 */

async function triggerMarketingEmail() {
    const btn = document.getElementById('btnTriggerMarketing');
    const resultBox = document.getElementById('marketingResultBox');
    const resultMessage = document.getElementById('marketingResultMessage');

    if (!btn || !resultBox || !resultMessage) return;

    // Loading state
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin me-2"></i> Đang quét và gửi...`;
    btn.disabled = true;
    
    // Reset UI
    resultBox.classList.add('d-none');
    resultBox.style.borderColor = 'rgba(255,255,255,0.1)';
    resultMessage.className = 'm-0 text-white-50 small';

    try {
        const response = await fetch('http://localhost:8080/FleetFlow/api/v1/marketing/email/trigger', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // API yêu cầu cứng khóa bảo mật này
                'Authorization': 'Bearer CRON_SECRET_KEY_123'
            }
        });

        const result = await response.json();

        // Hiện result box
        resultBox.classList.remove('d-none');

        if (response.ok && result.success) {
            // Thành công
            resultBox.style.borderColor = 'rgba(16, 185, 129, 0.5)'; // Border xanh lá
            resultMessage.className = 'm-0 text-success fw-bold';
            resultMessage.innerHTML = `<i class="fa-solid fa-check-circle me-2"></i>${result.message}`;
            
            // Toast thông báo góc phải dưới
            if (typeof showSystemToast === 'function') {
                showSystemToast(result.message, "success");
            }
        } else {
            // Thất bại
            resultBox.style.borderColor = 'rgba(239, 68, 68, 0.5)'; // Border đỏ
            resultMessage.className = 'm-0 text-danger fw-bold';
            resultMessage.innerHTML = `<i class="fa-solid fa-circle-xmark me-2"></i>${result.message || 'Lỗi cấu hình hoặc server.'}`;
            
            if (typeof showSystemToast === 'function') {
                showSystemToast(result.message || 'Lỗi gửi email marketing', "error");
            }
        }
    } catch (error) {
        console.error("Lỗi khi gọi API trigger marketing:", error);
        
        resultBox.classList.remove('d-none');
        resultBox.style.borderColor = 'rgba(239, 68, 68, 0.5)';
        resultMessage.className = 'm-0 text-danger fw-bold';
        resultMessage.innerHTML = `<i class="fa-solid fa-circle-xmark me-2"></i>Không thể kết nối đến máy chủ. Vui lòng thử lại sau.`;
        
        if (typeof showSystemToast === 'function') {
            showSystemToast("Lỗi kết nối mạng", "error");
        }
    } finally {
        // Trả lại trạng thái cho nút
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

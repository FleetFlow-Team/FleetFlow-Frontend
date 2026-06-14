// ==========================================================================
// 6. KHỞI TẠO DOM & LOGIC BOTTOM SHEET (MOBILE) - BẢN HOÀN THIỆN
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Khởi tạo Toast
    const distanceToastEl = document.getElementById('distanceErrorToast');
    const systemErrorToastEl = document.getElementById('systemErrorToast');
    if (distanceToastEl) new bootstrap.Toast(distanceToastEl);
    if (systemErrorToastEl) new bootstrap.Toast(systemErrorToastEl);
    
    // 2. Thiết lập thời gian tối thiểu cho Date input
    const inputTime = document.getElementById('inputDepartureTime');
    if (inputTime) {
        const now = new Date();
        const localISOTime = (new Date(now.getTime() - now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        inputTime.min = localISOTime;
    }

    // 3. Logic vuốt Bottom Sheet cho Mobile
    initBottomSheetUX();
});

function initBottomSheetUX() {
    const sheet = document.getElementById('filterSheet'); 
    const header = document.getElementById('filterHeader'); 
    
    if (!sheet || !header) return; 

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    function getClientY(e) {
        return e.touches ? e.touches[0].clientY : e.clientY;
    }

    // Chạm vào Header để Mở/Đóng
    header.addEventListener('click', () => {
        if (Math.abs(currentY - startY) > 10 && isDragging) return; // Tránh click nhầm khi đang vuốt
        if (window.innerWidth < 1200) {
            sheet.classList.toggle('expanded');
        }
    });

    function handleDragStart(e) {
        if (window.innerWidth >= 1200) return;
        isDragging = true;
        startY = getClientY(e);
        currentY = startY;
        
        // VÁ LỖI CỐT LÕI: Dùng setProperty kèm 'important' để đánh bại CSS gốc
        sheet.style.setProperty('transition', 'none', 'important'); 
    }

    function handleDragMove(e) {
        if (!isDragging || window.innerWidth >= 1200) return;
        
        currentY = getClientY(e);
        let deltaY = currentY - startY;
        
        if(sheet.classList.contains('expanded')) {
            // Đang mở -> Kéo xuống
            if(deltaY > 0) sheet.style.setProperty('transform', `translate(-50%, ${deltaY}px)`, 'important'); 
        } else {
            // Đang đóng -> Kéo lên
            if(deltaY < 0) sheet.style.setProperty('transform', `translate(-50%, calc(100% - 190px + ${deltaY}px))`, 'important'); 
            // Lưu ý: Đổi 190px thành 85px nếu bạn đang áp dụng đoạn JS này cho trang findCar.html (Bộ lọc)
        }
    }

    function handleDragEnd(e) {
        if (!isDragging || window.innerWidth >= 1200) return;
        isDragging = false;
        
        // VÁ LỖI CỐT LÕI: Gỡ bỏ CSS inline để trả lại quyền điều khiển cho Class CSS gốc
        sheet.style.removeProperty('transition'); 
        sheet.style.removeProperty('transform'); 
        
        let deltaY = currentY - startY;
        
        if (sheet.classList.contains('expanded')) {
            if (deltaY > 50) sheet.classList.remove('expanded'); // Kéo xuống đủ xa -> Thu gọn
        } else {
            if (deltaY < -50) sheet.classList.add('expanded'); // Kéo lên đủ xa -> Mở rộng
        }
    }

    // Sự kiện Mobile (Touch)
    header.addEventListener('touchstart', handleDragStart, {passive: true});
    window.addEventListener('touchmove', handleDragMove, {passive: true}); 
    window.addEventListener('touchend', handleDragEnd);

    // Sự kiện PC (Mouse - dành cho test giả lập mobile)
    header.addEventListener('mousedown', handleDragStart);
    window.addEventListener('mousemove', handleDragMove); 
    window.addEventListener('mouseup', handleDragEnd);
}
// ==========================================================================
// 6. KHỞI TẠO DOM & LOGIC BOTTOM SHEET (MOBILE) - ĐÃ VÁ LỖI LIỆT CLICK
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

    // Chạm vào Header để Mở/Đóng (Đã fix lỗi bị liệt click)
    header.addEventListener('click', (e) => {
        // Bỏ qua nếu người dùng cố tình bấm vào nút "Xóa"
        if(e.target.tagName.toLowerCase() === 'button') return; 

        // Nếu khoảng cách ngón tay di chuyển > 10px thì xem như là vuốt, không kích hoạt Click
        if (Math.abs(currentY - startY) > 10) return; 
        
        if (window.innerWidth < 1200) {
            sheet.classList.toggle('expanded');
            // Thêm class này cho body để ẩn/hiện cục AI Chat
            document.body.classList.toggle('filter-open'); 
        }
    });

    function handleDragStart(e) {
        if (window.innerWidth >= 1200) return;
        isDragging = true;
        startY = getClientY(e);
        currentY = startY;
        
        // Dùng setProperty kèm 'important' để đánh bại CSS gốc
        sheet.style.setProperty('transition', 'none', 'important'); 
    }

    function handleDragMove(e) {
        if (!isDragging || window.innerWidth >= 1200) return;
        
        currentY = getClientY(e);
        let deltaY = currentY - startY;
        
        if(sheet.classList.contains('expanded')) {
            // Đang mở -> Ép kéo xuống
            if(deltaY > 0) sheet.style.setProperty('transform', `translate(-50%, ${deltaY}px)`, 'important'); 
        } else {
            // Đang đóng -> Ép kéo lên
            if(deltaY < 0) sheet.style.setProperty('transform', `translate(-50%, calc(100% - 85px + ${deltaY}px))`, 'important'); 
        }
    }

    function handleDragEnd(e) {
        if (!isDragging || window.innerWidth >= 1200) return;
        isDragging = false;
        
        // Gỡ bỏ CSS inline để trả lại hiệu ứng nảy lỏng cho CSS gốc
        sheet.style.removeProperty('transition'); 
        sheet.style.removeProperty('transform'); 
        
        let deltaY = currentY - startY;
        
        if (sheet.classList.contains('expanded')) {
            if (deltaY > 50) {
                sheet.classList.remove('expanded'); // Kéo xuống đủ xa -> Thu gọn
                document.body.classList.remove('filter-open'); // Mở lại AI Chat
            }
        } else {
            if (deltaY < -50) {
                sheet.classList.add('expanded'); // Kéo lên đủ xa -> Mở rộng
                document.body.classList.add('filter-open'); // Ẩn AI Chat đi
            }
        }

        // ========================================================
        // DÒNG QUAN TRỌNG NHẤT: XÓA TRÍ NHỚ TỌA ĐỘ
        // Đảm bảo click vẫn hoạt động bình thường ở những lần sau
        // ========================================================
        setTimeout(() => { 
            startY = 0; 
            currentY = 0; 
        }, 50);
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


document.addEventListener("DOMContentLoaded", function() {
    // =========================================
    // 1. HIỆU ỨNG REVEAL ON SCROLL
    // =========================================
    // Cấu hình con mắt quan sát
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15 // Kích hoạt khi 15% khối xuất hiện trên màn hình
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Thêm class is-visible để bắt đầu hiệu ứng CSS
                entry.target.classList.add('is-visible');
                // Ngừng quan sát sau khi đã hiện (để không bị lặp lại khi cuộn lên)
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Tìm tất cả các thẻ có class reveal-on-scroll và gắn mắt quan sát
    document.querySelectorAll('.reveal-on-scroll').forEach((elem) => {
        observer.observe(elem);
    });

    // =========================================
    // 2. NAVBAR ĐỔI TRẠNG THÁI KHI CUỘN
    // =========================================
    const navbar = document.querySelector('.custom-navbar');

    // Kiểm tra xem trang có navbar không trước khi gắn sự kiện cuộn
    if (navbar) {
        window.addEventListener('scroll', () => {
            // Nếu cuộn xuống quá 50px, thêm class 'is-scrolled' để kích hoạt Liquid Glass
            if (window.scrollY > 50) {
                navbar.classList.add('is-scrolled');
            } else {
                // Nếu cuộn ngược lên lại đỉnh, gỡ bỏ class để trả về nguyên trạng
                navbar.classList.remove('is-scrolled');
            }
        });
    }
});
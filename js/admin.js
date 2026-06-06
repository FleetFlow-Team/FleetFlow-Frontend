// ==========================================
// KHỞI TẠO BIỂU ĐỒ BÁO CÁO CHẤT LƯỢNG (REPORT TAB)
// ==========================================

// 1. Khởi tạo Radar Chart (Đo lường điểm đánh giá tài xế)
if(document.getElementById('qualityRadarChart')) {
    const ctxRadar = document.getElementById('qualityRadarChart').getContext('2d');
    new Chart(ctxRadar, {
        type: 'radar',
        data: {
            labels: ['Đúng giờ', 'Thái độ', 'Lái xe an toàn', 'Vệ sinh xe', 'Hỗ trợ khách'],
            datasets: [{
                label: 'Điểm TB Hệ thống',
                data: [4.5, 4.2, 4.8, 4.6, 4.1],
                backgroundColor: 'rgba(0, 177, 79, 0.2)',
                borderColor: '#00B14F',
                pointBackgroundColor: '#00B14F',
                borderWidth: 2
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            scales: { 
                r: { 
                    angleLines: { color: '#e2e8f0' }, 
                    grid: { color: '#e2e8f0' }, 
                    pointLabels: { font: { family: 'Inter', weight: '600' } } 
                } 
            } 
        }
    });
}

// 2. Khởi tạo Stacked Bar Chart (Phân tích lý do hủy chuyến)
if(document.getElementById('cancelReasonChart')) {
    const ctxBar = document.getElementById('cancelReasonChart').getContext('2d');
    new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'],
            datasets: [
                { label: 'Khách đổi ý', data: [120, 90, 100, 80], backgroundColor: '#F59E0B', borderRadius: 4 },
                { label: 'Tài xế đến trễ', data: [40, 30, 20, 15], backgroundColor: '#EF4444', borderRadius: 4 },
                { label: 'Lỗi hệ thống', data: [10, 5, 2, 0], backgroundColor: '#64748b', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true, 
            maintainAspectRatio: false,
            scales: { 
                x: { stacked: true, grid: { display: false } }, 
                y: { stacked: true, border: { display: false } } 
            },
            plugins: { 
                legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } } 
            }
        }
    });
}

// ==========================================
// ĐIỀU KHIỂN MODAL DIFF VIEW (XEM LỊCH SỬ THAY ĐỔI DỮ LIỆU)
// ==========================================
let diffModalInstance;
function openDiffModal() {
    // Nếu modal chưa được khởi tạo thì tiến hành tạo mới
    if(!diffModalInstance) diffModalInstance = new bootstrap.Modal(document.getElementById('diffModal'));
    diffModalInstance.show();
}

// ==========================================
// CHỨC NĂNG CHUYỂN TAB (NAVIGATION TAB SWITCHER)
// ==========================================
function switchTab(tabId, element) {
    // 1. Xóa class 'active' khỏi toàn bộ các link ở Sidebar menu
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    // 2. Thêm class 'active' vào link vừa được click
    element.classList.add('active');
    
    // 3. Xóa class 'active' khỏi toàn bộ các Tab Sections đang hiển thị
    document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
    // 4. Tìm và kích hoạt Tab Section tương ứng với tabId được truyền vào
    document.getElementById(tabId).classList.add('active');
}

// ==========================================
// KHỞI TẠO CÁC BIỂU ĐỒ DASHBOARD KHI TRANG LOAD XONG
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    // 1. Khởi tạo Biểu đồ Doanh Thu (Line Chart)
    if (document.getElementById('revenueChart')) {
        const ctxRev = document.getElementById('revenueChart').getContext('2d');
        // Tạo dải màu gradient mờ dần cho đồ thị line
        let gradientRev = ctxRev.createLinearGradient(0, 0, 0, 300);
        gradientRev.addColorStop(0, 'rgba(0, 177, 79, 0.4)');
        gradientRev.addColorStop(1, 'rgba(0, 177, 79, 0)');

        new Chart(ctxRev, {
            type: 'line',
            data: {
                labels: ['1/6', '5/6', '10/6', '15/6', '20/6', '25/6', '30/6'],
                datasets: [{
                    label: 'Doanh thu',
                    data: [120, 150, 140, 200, 180, 250, 220],
                    borderColor: '#00B14F',
                    backgroundColor: gradientRev,
                    borderWidth: 3, tension: 0.4, fill: true, pointBackgroundColor: '#fff', pointBorderColor: '#00B14F'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    // 2. Khởi tạo Biểu đồ Trạng thái chuyến đi (Doughnut Chart)
    if(document.getElementById('statusChart')) {
        const ctxStatus = document.getElementById('statusChart').getContext('2d');
        new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['Hoàn thành', 'Hủy', 'Tranh chấp'],
                datasets: [{
                    data: [85, 10, 5],
                    backgroundColor: ['#10B981', '#EF4444', '#F59E0B'],
                    borderWidth: 0, cutout: '75%'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }
});

// ==========================================
// ĐIỀU KHIỂN MODAL eKYC (HỒ SƠ TÀI XẾ) VÀ TRÌNH XEM ẢNH
// ==========================================

// Biến điều khiển Modal eKYC
let ekycModal;
function openEkycModal() { 
    if(!ekycModal) ekycModal = new bootstrap.Modal(document.getElementById('ekycModal'));
    ekycModal.show(); 
}

// Các hàm xử lý phóng to, thu nhỏ và xoay ảnh chụp CCCD trong Modal
let currentScale = 1; 
let currentRotation = 0;

function zoomImg(factor) { 
    currentScale *= factor; 
    applyImgTransform(); 
}

function rotateImg() { 
    currentRotation += 90; 
    applyImgTransform(); 
}

// Cập nhật lại style transform của thẻ <img>
function applyImgTransform() { 
    document.getElementById('cccdImg').style.transform = `scale(${currentScale}) rotate(${currentRotation}deg)`; 
}

// ==========================================
// GIẢ LẬP LỖI HỆ THỐNG VÀ XỬ LÝ NÚT BẤM (TOAST CONTROLLER)
// ==========================================

let toastError;

// Hàm giả lập kiểm tra lỗi mạng ở mục Chọn thời gian của Dashboard
function testGlobalError(selectObj) {
    if(!toastError) toastError = new bootstrap.Toast(document.getElementById('systemErrorToast'), { delay: 3000 });
    
    // Nếu chọn Option giả lập lỗi
    if(selectObj.value === 'Test Lỗi Mạng') {
        selectObj.disabled = true; // Khóa dropdown
        setTimeout(() => {
            selectObj.disabled = false; // Mở lại dropdown sau 1s
            selectObj.selectedIndex = 0; // Đặt lại về option mặc định
            toastError.show(); // Hiển thị Toast báo lỗi góc màn hình
        }, 1000);
    }
}

// Hàm giả lập xử lý khi ấn nút Lưu/Phê duyệt
function simulateSaveConfig(btn) {
    if(!toastError) toastError = new bootstrap.Toast(document.getElementById('systemErrorToast'), { delay: 3000 });
    
    // Lưu lại nội dung gốc của nút
    const originalHTML = btn.innerHTML;
    // Đổi nội dung thành hiệu ứng loading xoay
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Xử lý...';
    btn.disabled = true;

    // Giả lập xử lý tác vụ trong 1 giây, sau đó trả lại trạng thái gốc và bắn ra lỗi (test UI)
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        toastError.show(); 
    }, 1000);
}
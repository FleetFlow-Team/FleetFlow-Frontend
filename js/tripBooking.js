// ==========================================
// CẤU HÌNH VÀ KHỞI TẠO VIETMAP
// ==========================================
const VIETMAP_API_KEY = '16069deeb411f94746f9bd2eafb5f123aabbef05c2f21740';

// Khởi tạo bản đồ VietMap GL dựa trên id 'fleetMap' trong HTML
const map = new vietmapgl.Map({
    container: 'fleetMap', 
    style: `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=${VIETMAP_API_KEY}`,
    center: [106.702872, 10.774339], // Tọa độ mặc định tại trung tâm TP.HCM (Kinh độ, Vĩ độ)
    zoom: 13 // Mức độ thu phóng ban đầu
});

// Thêm các nút chức năng điều hướng (Phóng to, thu nhỏ, xoay bản đồ) vào góc trên bên trái
map.addControl(new vietmapgl.NavigationControl(), 'top-left');

// Xử lý sự kiện sau khi bản đồ đã tải xong hoàn toàn các lớp dữ liệu
map.on('load', () => {
    // Tìm và ẩn dòng chữ "Đang khởi tạo bản đồ..." trên giao diện
    const placeholder = document.getElementById('mapPlaceholder');
    if (placeholder) {
        placeholder.style.setProperty('display', 'none', 'important');
    }
    
    console.log("VietMap đã được tích hợp thành công lên giao diện.");
});
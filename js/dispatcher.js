// ==========================================
// 1. ĐIỀU HƯỚNG TABS & SUB-TABS BÊN TRÁI
// Mục đích: Xử lý thay đổi các màn hình chính (Tổng quan, Quản lý đơn, GPS, Sự cố).
// ==========================================
function switchTab(tabId, element) {
    document.querySelectorAll('.sidebar-menu a').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

// ==========================================
// 2. CHUYỂN ĐỔI BẢNG LƯỚI BÊN TRONG TAB "QUẢN LÝ ĐƠN"
// Mục đích: Chuyển đổi giữa 3 bảng: Chờ duyệt, Đang di chuyển và Đóng băng.
// ==========================================
function switchGridTab(tabName) {
    // Đổi màu Tab Button
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('btn-tab-' + tabName).classList.add('active');

    // Đổi Content Lưới
    document.querySelectorAll('.grid-tab-content').forEach(content => content.classList.remove('active'));
    const target = document.getElementById('grid-' + tabName);
    void target.offsetWidth; // Khởi động lại animation
    target.classList.add('active');
}

// ==========================================
// 3. MOCK DATA & BẢN ĐỒ STATEFUL (CẬP NHẬT MƯỢT MÀ)
// Mục đích: Khởi tạo mảng xe và mô phỏng xe chạy/mất tín hiệu theo thời gian thực.
// ==========================================
const vehicles = [
    { id: 'v1', plate: '51H-123.45', driver: 'Nguyễn Trọng A', lat: 35, lng: 40, heading: 45, speed: 62, status: 'moving', lastPing: Date.now() },
    { id: 'v2', plate: '60A-987.65', driver: 'Trần Văn B', lat: 60, lng: 70, heading: 120, speed: 0, status: 'lost', lastPing: Date.now() - 100000 },
    { id: 'v3', plate: '29C-456.78', driver: 'Lê Hoàng C', lat: 20, lng: 80, heading: -30, speed: 55, status: 'moving', lastPing: Date.now() }
];

let focusedVehicleId = null;

// Hàm sinh ra DOM ban đầu cho Bản đồ và Danh sách xe
function initMapUI() {
    const mapArea = document.getElementById('simulatedMap');
    const listArea = document.getElementById('vehicleList');
    mapArea.innerHTML = ''; listArea.innerHTML = '';

    vehicles.forEach(v => {
        // Tạo Marker trên bản đồ
        const marker = document.createElement('div');
        marker.id = `marker-${v.id}`;
        marker.className = `vehicle-marker ${v.status === 'lost' ? 'lost' : ''}`;
        marker.style.left = `${v.lng}%`;
        marker.style.top = `${v.lat}%`;
        marker.style.setProperty('--heading', `${v.heading}deg`);
        
        marker.innerHTML = `
            <div class="marker-tooltip" id="tooltip-${v.id}">
                <div>${v.plate}</div>
                <div class="tooltip-speed">
                    <i class="fa-solid fa-gauge-high"></i> <span id="speed-${v.id}">${v.speed} km/h</span>
                </div>
            </div>
        `;
        
        // Tạo Card hiển thị xe bên Sidebar
        const card = document.createElement('div');
        card.id = `card-${v.id}`;
        card.className = `vehicle-card ${v.status === 'lost' ? 'lost-card' : ''}`;
        card.innerHTML = `
            <div>
                <div class="v-plate ${v.status === 'lost' ? 'text-danger' : ''}" id="card-plate-${v.id}">${v.plate}</div>
                <div class="v-driver">${v.driver} <span class="mx-1">•</span> <span id="card-speed-${v.id}">${v.speed} km/h</span></div>
            </div>
            <div class="v-status"></div>
        `;

        // Sự kiện liên kết: Ấn vào Marker hay Card thì đều Focus vào chiếc xe đó
        const focusAction = () => focusVehicle(v.id);
        marker.addEventListener('click', focusAction);
        card.addEventListener('click', focusAction);

        mapArea.appendChild(marker);
        listArea.appendChild(card);
    });

    // Sự kiện ô Tìm kiếm xe
    const searchInput = document.getElementById('mapSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            vehicles.forEach(v => {
                const match = v.plate.toLowerCase().includes(term) || v.driver.toLowerCase().includes(term);
                const card = document.getElementById(`card-${v.id}`);
                const marker = document.getElementById(`marker-${v.id}`);
                
                if(card) card.style.display = match ? 'flex' : 'none';
                if(marker) {
                    marker.style.opacity = match ? '1' : '0.1';
                    marker.style.pointerEvents = match ? 'auto' : 'none';
                }
            });
        });
    }
}

// ==========================================
// 4. FOCUS XE
// Mục đích: Làm nổi bật xe đang được chọn trên cả Bản đồ và Danh sách.
// ==========================================
function focusVehicle(id) {
    focusedVehicleId = id;
    
    // Gỡ highlight tất cả xe hiện tại
    document.querySelectorAll('.vehicle-marker').forEach(m => m.classList.remove('focused'));
    document.querySelectorAll('.vehicle-card').forEach(c => c.classList.remove('active-card'));
    
    // Đánh dấu highlight cho xe đang tương tác
    const marker = document.getElementById(`marker-${id}`);
    const card = document.getElementById(`card-${id}`);
    
    if(marker) marker.classList.add('focused');
    if(card) {
        card.classList.add('active-card');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// ==========================================
// 5. MÔ PHỎNG XE DI CHUYỂN LIVE TRACKING
// Mục đích: Tính toán tốc độ, toạ độ di chuyển mới và cập nhật giao diện mà không load lại trang.
// ==========================================
function simulateLiveTracking() {
    vehicles.forEach(v => {
        // Chỉ xử lý những xe đang hoạt động (không bị lost)
        if (v.status !== 'lost') {
            v.heading += (Math.random() * 30 - 15); // Góc lái ngẫu nhiên
            v.speed = Math.floor(Math.random() * 20 + 45); // Tốc độ chạy 45-65km/h
            
            // Công thức tính tọa độ di chuyển theo hướng (heading)
            const rad = (v.heading - 90) * (Math.PI / 180); 
            v.lng += Math.cos(rad) * 1.2; 
            v.lat += Math.sin(rad) * 1.2;

            // Cơ chế nảy (Giữ xe chạy loanh quanh trong khung màn hình thay vì trôi mất)
            if(v.lng < 5 || v.lng > 95) v.heading += 180;
            if(v.lat < 5 || v.lat > 95) v.heading += 180;
            
            v.lastPing = Date.now();
        }

        // Logic Mất tín hiệu sau 90 giây
        const isLost = (Date.now() - v.lastPing) >= 90000;
        v.status = isLost ? 'lost' : 'moving';

        // Thay đổi trực tiếp CSS/DOM để tạo mượt mà
        const marker = document.getElementById(`marker-${v.id}`);
        const card = document.getElementById(`card-${v.id}`);
        
        if (marker) {
            marker.style.left = `${v.lng}%`;
            marker.style.top = `${v.lat}%`;
            marker.style.setProperty('--heading', `${v.heading}deg`);

            marker.classList.toggle('lost', isLost);
            const speedEl = document.getElementById(`speed-${v.id}`);
            if(speedEl) speedEl.innerHTML = isLost ? '<span class="text-danger">Mất tín hiệu</span>' : `${v.speed} km/h`;
        }

        if (card) {
            card.classList.toggle('lost-card', isLost);
            const plateText = document.getElementById(`card-plate-${v.id}`);
            if(plateText) plateText.classList.toggle('text-danger', isLost);
            
            const cardSpeedEl = document.getElementById(`card-speed-${v.id}`);
            if(cardSpeedEl) cardSpeedEl.innerHTML = isLost ? '<span class="text-danger fw-bold">Offline</span>' : `${v.speed} km/h`;
        }
    });
}

// Khởi chạy Live Map khi Load
initMapUI();
setInterval(simulateLiveTracking, 2500); 

// Trình diễn Toast thông báo lỗi Mạng GPS giả định sau 1.5s
setTimeout(() => {
    document.getElementById('toastMsg').innerText = "Location Alert: Mất tín hiệu định vị xe 60A-987.65 quá 90s";
    new bootstrap.Toast(document.getElementById('systemErrorToast')).show();
}, 1500);


// ==========================================
// 6. LOGIC TRANH CHẤP & ĐÓNG BĂNG HÓA ĐƠN
// Mục đích: Các hàm kích hoạt pop-up, check Form và di chuyển Row giữa các Tab Lưới.
// ==========================================
let currentDisputeRowId = null;
let disputeModal, resolveModal;

function openDisputeModal(rowId, bookingId) {
    if(!disputeModal) disputeModal = new bootstrap.Modal(document.getElementById('disputeModal'));
    currentDisputeRowId = rowId;
    document.getElementById('disputeBookingId').innerText = bookingId;
    document.getElementById('disputeReason').value = '';
    validateDisputeForm();
    disputeModal.show();
}

function validateDisputeForm() {
    const text = document.getElementById('disputeReason').value.trim();
    const btn1 = document.getElementById('btnTestError');
    const btn2 = document.getElementById('btnFreeze');
    if (text.length > 5) {
        btn1.disabled = false; btn2.disabled = false;
    } else {
        btn1.disabled = true; btn2.disabled = true;
    }
}

// Hàm Xử lý xác nhận hành động Đóng Băng
function submitDispute(isForceError) {
    const btn = isForceError ? document.getElementById('btnTestError') : document.getElementById('btnFreeze');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin fs-5"></i>';
    btn.disabled = true;

    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;

        if (isForceError) {
            // Trường hợp lỗi API (Kiểm thử Toast Đỏ)
            document.getElementById('toastMsg').innerText = "Update failed";
            new bootstrap.Toast(document.getElementById('systemErrorToast')).show();
        } else {
            // Trường hợp Đóng băng thành công: Di chuyển dòng sang Bảng Đóng Băng
            disputeModal.hide();
            const row = document.getElementById(currentDisputeRowId);
            const bookingId = row.querySelector('.bk-id').innerText;
            const reason = document.getElementById('disputeReason').value;

            // Tạo Dòng dữ liệu mới nằm ở Bảng Frozen
            const tbodyFrozen = document.querySelector('#table-frozen tbody');
            const newRowId = currentDisputeRowId + '-frozen';
            const newRow = document.createElement('tr');
            newRow.className = 'frozen-row';
            newRow.id = newRowId;
            
            const passengerHtml = row.cells[2].innerHTML;
            const driverHtml = row.cells[3].innerHTML;

            newRow.innerHTML = `
                <td>
                    <span class="bk-id">${bookingId}</span>
                    <div class="mt-2"><span class="pill-badge bg-frozen" style="padding: 4px 10px; font-size: 0.7rem;"><i class="fa-solid fa-snowflake me-1"></i> Bị đóng băng</span></div>
                </td>
                <td>${passengerHtml}</td>
                <td>${driverHtml}</td>
                <td class="frozen-reason"><i class="fa-solid fa-lock me-1"></i> ${reason}</td>
                <td>
                    <div class="action-group">
                        <button class="btn-act act-resolve" title="Giải quyết & Mở khóa" onclick="resolveDispute('${newRowId}')"><i class="fa-solid fa-gavel"></i></button>
                    </div>
                </td>
            `;
            tbodyFrozen.appendChild(newRow);

            row.remove(); // Gỡ dòng này khỏi Tab cũ

            // Cộng bộ đếm Badge
            let frozenBadge = document.getElementById('frozenCountBadge');
            frozenBadge.innerText = parseInt(frozenBadge.innerText) + 1;

            switchGridTab('frozen'); // Dịch người dùng xem kết quả
        }
    }, 1200);
}

// Bật Modal Phán Quyết
function resolveDispute(rowId) {
    if(!resolveModal) resolveModal = new bootstrap.Modal(document.getElementById('resolveModal'));
    currentDisputeRowId = rowId;
    resolveModal.show();
}

// ==========================================
// 7. TIỆN ÍCH CHUNG (SIMULATE API CHUNG)
// Mục đích: Dùng giả lập Loader khi call dữ liệu chờ.
// ==========================================
function simulateAction(btn, isResolve = false) {
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;

    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        
        if(isResolve) {
            resolveModal.hide();
            document.getElementById(currentDisputeRowId).remove();
            let frozenBadge = document.getElementById('frozenCountBadge');
            frozenBadge.innerText = parseInt(frozenBadge.innerText) - 1;
        } else {
            // Giả lập lỗi Call mạng thất bại
            document.getElementById('toastMsg').innerText = "Update failed";
            new bootstrap.Toast(document.getElementById('systemErrorToast')).show();
        }
    }, 1000);
}
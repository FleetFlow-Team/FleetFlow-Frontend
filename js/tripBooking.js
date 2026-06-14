/**
 * ============================================================================
 * FLEETFLOW - TRIP BOOKING JAVASCRIPT
 * Tích hợp VietMap GL & Xử lý logic đặt xe đường dài
 * ============================================================================
 */

// ==========================================
// 1. CẤU HÌNH API & KHỞI TẠO BẢN ĐỒ
// ==========================================
const MAPS_API_BASE = 'http://localhost:8080/FleetFlow/api/v1/maps';
const VIETMAP_API_KEY = '9c63b68ed14a6f2327e9f9fa0170ce81f6f5e0678471c64d';

// Khai báo biến lưu trữ Marker để quản lý việc xóa/thêm khi tạo route mới
let currentPickupMarker = null;
let currentDropoffMarker = null;

// Khởi tạo bản đồ VietMap GL
const map = new vietmapgl.Map({
    container: 'fleetMap', 
    style: `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=${VIETMAP_API_KEY}`,
    center: [106.702872, 10.774339], // Mặc định trung tâm TP.HCM
    zoom: 13
});

map.addControl(new vietmapgl.NavigationControl(), 'top-left');

// Xử lý khi bản đồ tải xong
map.on('load', () => {
    // Ẩn placeholder loading
    const placeholder = document.getElementById('mapPlaceholder');
    if (placeholder) placeholder.style.setProperty('display', 'none', 'important');
    
    // Thêm Source và Layer để vẽ lộ trình
    map.addSource('route', {
        'type': 'geojson',
        'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': {
                'type': 'LineString',
                'coordinates': []
            }
        }
    });

    map.addLayer({
        'id': 'route-line',
        'type': 'line',
        'source': 'route',
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-color': '#00B14F', // Màu chủ đạo FleetFlow
            'line-width': 6,
            'line-opacity': 0.8
        }
    });
});

// ==========================================
// 2. HÀM HỖ TRỢ (UTILITIES)
// ==========================================

// Giải mã Polyline từ Backend trả về thành mảng tọa độ [lng, lat]
function decodePolyline(str, precision = 5) {
    let index = 0, lat = 0, lng = 0, coordinates = [], shift = 0, result = 0, byte = null, latitude_change, longitude_change, factor = Math.pow(10, precision);
    while (index < str.length) {
        byte = null; shift = 0; result = 0;
        do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
        latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
        shift = result = 0;
        do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
        longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += latitude_change; lng += longitude_change;
        coordinates.push([lng / factor, lat / factor]); 
    }
    return coordinates;
}

// Xóa lộ trình và Marker trên bản đồ
function clearRouteOnMap() {
    if (map.getSource('route')) {
        map.getSource('route').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] } });
    }
    
    // Xóa ghim điểm đón / trả cũ
    if (currentPickupMarker) currentPickupMarker.remove();
    if (currentDropoffMarker) currentDropoffMarker.remove();
}

// ==========================================
// 3. KẾT NỐI API FLEETFLOW BACKEND
// ==========================================

async function fetchGeocode(address) {
    const res = await fetch(`${MAPS_API_BASE}/geocode?address=${encodeURIComponent(address)}`);
    if (!res.ok) throw new Error("Không thể tìm thấy địa chỉ");
    return await res.json();
}

async function fetchDistanceValidation(pLat, pLng, dLat, dLng) {
    const res = await fetch(`${MAPS_API_BASE}/distance?pickupLat=${pLat}&pickupLng=${pLng}&dropoffLat=${dLat}&dropoffLng=${dLng}`);
    return await res.json();
}

async function fetchRoute(pLat, pLng, dLat, dLng) {
    const res = await fetch(`${MAPS_API_BASE}/route?fromLat=${pLat}&fromLng=${pLng}&toLat=${dLat}&toLng=${dLng}`);
    if (!res.ok) throw new Error("Không thể lấy lộ trình");
    return await res.json();
}

// ==========================================
// 4. LUỒNG XỬ LÝ CHÍNH & VẼ BẢN ĐỒ
// ==========================================

window.triggerMapCalculation = async function() {
    const pickupAddress = document.getElementById('inputPickup').value.trim();
    const dropoffAddress = document.getElementById('inputDropoff').value.trim();
    const btnContinue = document.getElementById('btnContinue');
    const distBadge = document.getElementById('lblDistanceDisplay');
    const distValueText = document.getElementById('distValue');

    if (!pickupAddress || !dropoffAddress) {
        clearRouteOnMap();
        distValueText.innerText = "--";
        btnContinue.disabled = true;
        return;
    }

    try {
        // UI Feedback: Đang tính toán
        distValueText.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
        distBadge.classList.remove('active-route');
        btnContinue.disabled = true;

        // B1: Geocode
        const pickupData = await fetchGeocode(pickupAddress);
        const dropoffData = await fetchGeocode(dropoffAddress);

        // B2: Validate Khoảng cách
        const distanceData = await fetchDistanceValidation(
            pickupData.lat, pickupData.lng, 
            dropoffData.lat, dropoffData.lng
        );

        if (!distanceData.valid) {
            const toastBody = document.querySelector('#distanceErrorToast .toast-body');
            toastBody.innerHTML = `<i class="fa-solid fa-triangle-exclamation me-2 fs-5"></i> ${distanceData.error || 'Khoảng cách không hợp lệ.'}`;
            new bootstrap.Toast(document.getElementById('distanceErrorToast')).show();
            
            clearRouteOnMap();
            distValueText.innerText = "--";
            return;
        }

        // B3: Lấy Lộ trình
        const routeData = await fetchRoute(
            pickupData.lat, pickupData.lng, 
            dropoffData.lat, dropoffData.lng
        );

        // Vẽ đường lên bản đồ
        const coordinates = decodePolyline(routeData.points);
        map.getSource('route').setData({
            'type': 'Feature',
            'properties': {},
            'geometry': {
                'type': 'LineString',
                'coordinates': coordinates
            }
        });

        // ----------------------------------------------------
        // VẼ MARKER ĐIỂM ĐẦU (ĐÓN) VÀ ĐIỂM CUỐI (TRẢ)
        // ----------------------------------------------------
        // Xóa marker cũ nếu có
        if (currentPickupMarker) currentPickupMarker.remove();
        if (currentDropoffMarker) currentDropoffMarker.remove();

        const startCoord = coordinates[0];
        const endCoord = coordinates[coordinates.length - 1];

        // Tạo element DOM cho Điểm Đón
        const elPickup = document.createElement('div');
        elPickup.className = 'map-marker-pickup';
        
        // Tạo element DOM cho Điểm Trả
        const elDropoff = document.createElement('div');
        elDropoff.className = 'map-marker-dropoff';

        // Gắn Marker Đón lên bản đồ (tâm ở giữa)
        currentPickupMarker = new vietmapgl.Marker({ element: elPickup })
            .setLngLat(startCoord)
            .addTo(map);

        // Gắn Marker Trả lên bản đồ (tâm ở góc nhọn dưới cùng)
        currentDropoffMarker = new vietmapgl.Marker({ 
            element: elDropoff, 
            anchor: 'bottom'
        })
            .setLngLat(endCoord)
            .addTo(map);

        // Zoom bản đồ vừa vặn với đường đi
        const bounds = coordinates.reduce((b, coord) => b.extend(coord), new vietmapgl.LngLatBounds(coordinates[0], coordinates[0]));
        map.fitBounds(bounds, { padding: { top: 80, bottom: 250, left: 80, right: 80 } });

        // Cập nhật UI Thành công
        distValueText.innerText = routeData.distanceKm;
        distBadge.classList.add('active-route');
        
        // Kiểm tra xem giờ đón đã hợp lệ chưa trước khi mở nút
        validateDepartureTime(); 

    } catch (error) {
        console.error("Lỗi quy trình xử lý map:", error);
        new bootstrap.Toast(document.getElementById('systemErrorToast')).show();
        clearRouteOnMap();
        distValueText.innerText = "--";
        btnContinue.disabled = true;
    }
};

// ==========================================
// 5. CÁC HÀM XỬ LÝ GIAO DIỆN (UI EVENTS)
// ==========================================

// Đảo chiều điểm đón - trả
window.swapLocations = function() {
    const pickupInput = document.getElementById('inputPickup');
    const dropoffInput = document.getElementById('inputDropoff');
    
    let temp = pickupInput.value;
    pickupInput.value = dropoffInput.value;
    dropoffInput.value = temp;
    
    triggerMapCalculation();
};

// Hiển thị dropdown gợi ý địa điểm (Mockup)
window.showMockAutocomplete = function(dropdownId) {
    // Ẩn tất cả dropdown trước
    document.querySelectorAll('.autocomplete-dropdown').forEach(el => el.style.display = 'none');
    
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) dropdown.style.display = 'block';
};

// Chọn địa điểm từ dropdown
window.selectLocation = function(inputId, text, dropdownId) {
    document.getElementById(inputId).value = text;
    document.getElementById(dropdownId).style.display = 'none';
    triggerMapCalculation();
};

// Ẩn dropdown khi click ra ngoài
document.addEventListener('click', function(event) {
    const isClickInsidePickup = document.getElementById('inputPickup').contains(event.target);
    const isClickInsideDropoff = document.getElementById('inputDropoff').contains(event.target);
    
    const pickupDropdown = document.getElementById('pickupDropdown');
    const dropoffDropdown = document.getElementById('dropoffDropdown');

    if (!isClickInsidePickup && pickupDropdown) pickupDropdown.style.display = 'none';
    if (!isClickInsideDropoff && dropoffDropdown) dropoffDropdown.style.display = 'none';
});

// Validate thời gian khởi hành (Phải cách hiện tại ít nhất 120 phút)
window.validateDepartureTime = function() {
    const inputTime = document.getElementById('inputDepartureTime');
    const errorMsg = document.getElementById('timeErrorMsg');
    const btnContinue = document.getElementById('btnContinue');
    const distValueText = document.getElementById('distValue').innerText;

    if (!inputTime || !inputTime.value) {
        if(btnContinue) btnContinue.disabled = true;
        return;
    }

    const selectedTime = new Date(inputTime.value).getTime();
    const currentTime = new Date().getTime();
    const diffMinutes = (selectedTime - currentTime) / (1000 * 60);

    if (diffMinutes < 120) {
        inputTime.classList.add('is-invalid');
        errorMsg.classList.add('d-block');
        btnContinue.disabled = true;
    } else {
        inputTime.classList.remove('is-invalid');
        errorMsg.classList.remove('d-block');
        
        // Mở nút nếu đã có khoảng cách hợp lệ
        if (distValueText !== "--" && !distValueText.includes('spinner')) {
            btnContinue.disabled = false;
        }
    }
};

// Xử lý nút Chốt lộ trình
window.simulateBookingSubmit = function() {
    const btn = document.getElementById('btnContinue');
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin me-2"></i> Đang xử lý...`;
    btn.disabled = true;

    // Giả lập delay chuyển trang hoặc gọi API tạo chuyến
    setTimeout(() => {
        alert("Lộ trình đã được chốt! Đang đợi tài xế...");
        // window.location.href = 'selectCar.html'; // Bật dòng này khi có trang tiếp theo
        btn.innerHTML = `Chốt lộ trình`;
        btn.disabled = false;
    }, 1500);
};

// ==========================================================================
// 6. KHỞI TẠO DOM & LOGIC BOTTOM SHEET (MOBILE)
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
    const sheet = document.getElementById('bookingSheet');
    const header = document.getElementById('sheetHeader');
    
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
        sheet.style.transition = 'none'; // Tắt mượt để bám ngón tay
    }

    function handleDragMove(e) {
        if (!isDragging || window.innerWidth >= 1200) return;
        
        currentY = getClientY(e);
        let deltaY = currentY - startY;
        
        if(sheet.classList.contains('expanded')) {
            if(deltaY > 0) sheet.style.transform = `translate(-50%, ${deltaY}px)`; // Đang vuốt xuống
        } else {
            if(deltaY < 0) sheet.style.transform = `translate(-50%, calc(100% - 190px + ${deltaY}px))`; // Đang vuốt lên
        }
    }

    function handleDragEnd(e) {
        if (!isDragging || window.innerWidth >= 1200) return;
        isDragging = false;
        
        // Trả lại hiệu ứng transition
        sheet.style.transition = ''; 
        sheet.style.transform = ''; 
        
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
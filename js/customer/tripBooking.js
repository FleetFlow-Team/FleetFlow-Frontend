// GIAO DIỆN
document.addEventListener("DOMContentLoaded", function() {
    // 1. Lấy dữ liệu từ localStorage
    const fullName = localStorage.getItem('fullName');
    const accessToken = localStorage.getItem('accessToken');
    const userRole = localStorage.getItem('userRole') || 'Khách hàng';

    // 2. Lấy các phần tử trên DOM
    const authContainer = document.getElementById('desktopAuthContainer');
    const notiBtn = document.getElementById('notificationBtn');
    const btnMobile = document.getElementById('btnLoginMobile');

    // 3. Nếu ĐÃ ĐĂNG NHẬP
    if (accessToken && fullName) {
        // Mã hóa tên để làm URL Avatar
        const avatarName = encodeURIComponent(fullName);

        // --- GIAO DIỆN DESKTOP ---
        if (authContainer) {
            authContainer.innerHTML = `
                <div class="user-profile-btn d-flex align-items-center gap-2 position-relative" style="cursor: pointer;">
                    <div class="d-flex flex-column align-items-end text-end" style="line-height: 1.2;">
                        <span class="fw-bold" style="font-size: 0.95rem; color: var(--color-dark); padding-left: 10px">${fullName}</span>
                        <span class="fw-medium" style="font-size: 0.75rem; color: #64748b;">${userRole}</span>
                    </div>
                    <img src="https://ui-avatars.com/api/?name=${avatarName}&background=00B14F&color=fff" style="width: 34px; height: 34px; border-radius: 50%;" />
                    
                    <div class="dropdown-menu-modern shadow">
                        <a href="profile.html" class="dropdown-item-custom"><i class="fa-regular fa-user"></i> Hồ sơ của tôi</a>
                        <a href="tripHistory.html" class="dropdown-item-custom"><i class="fa-solid fa-clock-rotate-left"></i> Lịch sử chuyến đi</a>
                        <hr style="margin: 5px 0; opacity: 0.1;">
                        <a href="#" id="btnLogout" class="dropdown-item-custom text-danger"><i class="fa-solid fa-arrow-right-from-bracket"></i> Đăng xuất</a>
                    </div>
                </div>
            `;

            // Kích hoạt sự kiện Đăng xuất
            document.getElementById('btnLogout').addEventListener('click', function(e) {
                e.preventDefault();
                if(confirm('Bạn có chắc chắn muốn đăng xuất khỏi FleetFlow?')) {
                    localStorage.clear(); // Xóa token
                    window.location.reload(); // Tải lại trang (sẽ tự quay về trạng thái chưa đăng nhập)
                }
            });
        }

        // --- GIAO DIỆN MOBILE ---
        if (btnMobile) {
            btnMobile.href = "profile.html"; // Trỏ về trang cá nhân thay vì trang login
            
            btnMobile.innerHTML = `
                <img src="https://ui-avatars.com/api/?name=${avatarName}&background=00B14F&color=fff" style="width: 22px; height: 22px; border-radius: 50%; margin-bottom: 3px;" />
                <span class="nav-text">Tài khoản</span>
            `;
        }

        // Hiển thị nút chuông thông báo
        if (notiBtn) notiBtn.style.display = 'block';

    } else {
        // NẾU CHƯA ĐĂNG NHẬP
        // Giao diện đã có sẵn nút "Đăng nhập" ở HTML, ta chỉ cần chắc chắn ẩn chuông
        if (notiBtn) notiBtn.style.display = 'none';

        // (Tùy chọn) Nếu bạn muốn bắt buộc phải đăng nhập mới được đặt xe, hãy mở comment dòng dưới:
        // window.location.href = 'login.html'; 
    }
});




// THỰC THI LOGIC
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

// ==========================================
// CẤU HÌNH API VÀ BIẾN TOÀN CỤC TRẠM 2
// ==========================================
const CUSTOMER_API_BASE = 'http://localhost:8080/FleetFlow/api/v1/customer';
const CORE_API_BASE = 'http://localhost:8080/FleetFlow/api/v1';

// Đọc ID xe khách đã chọn từ findCar.html
const currentVehicleId = parseInt(localStorage.getItem('selectedVehicleId'));

// 🚀 BẢO MẬT LUỒNG: Nếu khách chưa chọn xe mà vào thẳng trang này -> Đuổi về Trạm 1
if (!currentVehicleId) {
    alert("Vui lòng chọn loại phương tiện trước khi thiết lập lộ trình!");
    window.location.replace("../../pages/findCar.html");
}

let currentDistanceKm = 0;
let currentEstimatedTotal = 0;
let tripCoordinates = {}; // Lưu tọa độ Lat/Lng để tạo Booking
let currentVoucherId = null; // Lưu ID voucher nếu áp dụng thành công


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
    const btnSubmitBooking = document.getElementById('btnSubmitBooking');
    const distBadge = document.getElementById('lblDistanceDisplay');
    const distValueText = document.getElementById('distValue');

    if (!pickupAddress || !dropoffAddress) {
        clearRouteOnMap();
        distValueText.innerText = "--";
        btnSubmitBooking.disabled = true;
        return;
    }

    try {
        // UI Feedback: Đang tính toán
        distValueText.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
        distBadge.classList.remove('active-route');
        btnSubmitBooking.disabled = true;

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

        // 👉 1. Lưu khoảng cách và tọa độ vào biến toàn cục để dùng cho các API sau
        currentDistanceKm = routeData.distanceKm;
        tripCoordinates = {
            pickupLat: pickupData.lat, pickupLng: pickupData.lng,
            dropoffLat: dropoffData.lat, dropoffLng: dropoffData.lng
        };

        if (currentDistanceKm < 20) {
            // Xóa lộ trình trên map
            clearRouteOnMap();
            document.getElementById('distValue').innerText = "--";
            document.getElementById('btnSubmitBooking').disabled = true;

            // Báo lỗi bằng Toast Bootstrap (như thiết kế của bạn)
            const toastBody = document.querySelector('#distanceErrorToast .toast-body');
            toastBody.innerHTML = `<i class="fa-solid fa-triangle-exclamation me-2 fs-5"></i> Quãng đường ${currentDistanceKm}km quá ngắn. Tối thiểu phải >= 20km!`;
            new bootstrap.Toast(document.getElementById('distanceErrorToast')).show();
            
            return; // Dừng luồng, không gọi báo giá
        }



        // Cập nhật UI Thành công
        distValueText.innerText = currentDistanceKm;
        distBadge.classList.add('active-route');
        
        // 👉 2. TỰ ĐỘNG GỌI API BÁO GIÁ ĐỘNG NGAY KHI CÓ KHOẢNG CÁCH!
        calculateRealPrice();

        // Kiểm tra xem giờ đón đã hợp lệ chưa trước khi mở nút
        validateDepartureTime();

    } catch (error) {
        console.error("Lỗi quy trình xử lý map:", error);
        new bootstrap.Toast(document.getElementById('systemErrorToast')).show();
        clearRouteOnMap();
        distValueText.innerText = "--";
        btnSubmitBooking.disabled = true;
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
    const btnSubmitBooking = document.getElementById('btnSubmitBooking');
    const distValueText = document.getElementById('distValue').innerText;

    if (!inputTime || !inputTime.value) {
        if(btnSubmitBooking) btnSubmitBooking.disabled = true;
        return;
    }

    const selectedTime = new Date(inputTime.value).getTime();
    const currentTime = new Date().getTime();
    const diffMinutes = (selectedTime - currentTime) / (1000 * 60);

    if (diffMinutes < 120) {
        inputTime.classList.add('is-invalid');
        errorMsg.classList.add('d-block');
        btnSubmitBooking.disabled = true;
    } else {
        inputTime.classList.remove('is-invalid');
        errorMsg.classList.remove('d-block');
        
        // Mở nút nếu đã có khoảng cách hợp lệ
        if (distValueText !== "--" && !distValueText.includes('spinner')) {
            btnSubmitBooking.disabled = false;
        }
    }
};

// Xử lý nút Chốt lộ trình
window.simulateBookingSubmit = function() {
    const btn = document.getElementById('btnSubmitBooking');
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



// ==========================================
// 3. BÁO GIÁ TỰ ĐỘNG (Check-price API)
// ==========================================
async function calculateRealPrice() {
    if (currentDistanceKm < 20) return;

    const timeInput = document.getElementById('inputDepartureTime');
    // Backend yêu cầu format: YYYY-MM-DDTHH:mm:ss. Thêm ':00' nếu input chưa có giây
    let departureTime = timeInput && timeInput.value ? timeInput.value + ':00' : getFutureTime(2);

    // Payload chuẩn theo CustomerBookingController.java
    const payload = {
        vehicleId: currentVehicleId,
        bookingType: "DISTANCE",
        tripDirection: "ONE_WAY",
        distanceKm: currentDistanceKm,
        durationHours: 0,
        durationDays: 0,
        departureTime: departureTime
    };

    try {
        const res = await fetch(`${CUSTOMER_API_BASE}/bookings/check-price`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.success) {
            currentEstimatedTotal = data.estimatedTotal;
            currentVoucherId = null; // Xóa mã voucher cũ nếu khách đổi lộ trình
            document.getElementById('voucherInput').value = ''; // Clear ô nhập

            const fVND = (v) => Math.round(v).toLocaleString('vi-VN') + ' đ';
            
            // Đổ dữ liệu bóc tách được vào Glass Panel
            let baseFareHtml = fVND(data.baseFare);
            if (data.weekendSurcharge > 0) {
                baseFareHtml += ` <span class="text-warning small" style="font-size: 0.75rem">(+${fVND(data.weekendSurcharge)} T7/CN)</span>`;
            }

            document.getElementById('baseFareDisplay').innerHTML = baseFareHtml;
            document.getElementById('discountDisplay').innerText = '0 đ';
            document.getElementById('totalFareDisplay').innerText = fVND(data.estimatedTotal);
            document.getElementById('depositDisplay').innerText = fVND(data.deposit30Percent);

            // Mở khóa nút Đặt xe nếu giờ giấc đã hợp lệ
            if (!timeInput.classList.contains('is-invalid')) {
                document.getElementById('btnSubmitBooking').disabled = false;
            }
        } else {
            console.error("Lỗi báo giá: ", data.error);
        }
    } catch (error) { 
        console.error("Lỗi gọi API báo giá:", error); 
    }
}

// Bắt sự kiện đổi giờ -> Tự tính lại giá (vì có thể dính phụ phí cuối tuần)
document.getElementById('inputDepartureTime').addEventListener('change', () => {
    validateDepartureTime();
    if (currentDistanceKm >= 20 && !document.getElementById('inputDepartureTime').classList.contains('is-invalid')) {
        calculateRealPrice();
    }
});

// ==========================================
// 4. ÁP MÃ VOUCHER (/vouchers/apply)
// ==========================================
window.applyVoucher = async function() {
    const code = document.getElementById('voucherInput').value.trim();

    if (!code) {
        return Swal.fire({ icon: 'warning', title: 'Thiếu thông tin', text: 'Vui lòng nhập mã ưu đãi!' });
    }
    if (!customerId) {
        return Swal.fire({ icon: 'info', title: 'Chưa đăng nhập', text: 'Bạn cần đăng nhập để dùng tính năng này.' });
    }
    if (currentEstimatedTotal === 0) {
        return Swal.fire({ icon: 'warning', title: 'Chưa có lộ trình', text: 'Vui lòng chọn điểm đón/trả trước!' });
    }

    const btn = document.getElementById('btnApplyVoucher');
    const origText = btn.innerText;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;

    const payload = {
        code: code,
        customerId: customerId,
        estimatedTotal: currentEstimatedTotal,
        vehicleTypeId: currentVehicleId 
    };

    try {
        const res = await fetch(`${CUSTOMER_API_BASE}/vouchers/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        const fVND = (v) => Math.round(v).toLocaleString('vi-VN') + ' đ';

        if (data.success) {
            // Cập nhật giá mới
            document.getElementById('discountDisplay').innerText = `-${fVND(data.discountAmount)}`;
            document.getElementById('totalFareDisplay').innerText = fVND(data.finalTotal);
            document.getElementById('depositDisplay').innerText = fVND(data.finalTotal * 0.3); // Cập nhật lại cọc
            currentVoucherId = data.voucherId; 
            
            Swal.fire({
                icon: 'success',
                title: 'Áp dụng thành công!',
                text: `Bạn đã được giảm ${fVND(data.discountAmount)}`,
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            // Hiển thị lỗi từ Backend (Hết hạn, sai xe,...)
            Swal.fire({ icon: 'error', title: 'Mã không hợp lệ', text: data.error });
            document.getElementById('voucherInput').value = '';
        }
    } catch (e) { 
        new bootstrap.Toast(document.getElementById('systemErrorToast')).show(); 
    } finally { 
        btn.innerHTML = origText; 
        btn.disabled = false; 
    }
};

// ==========================================
// 5. CHỐT ĐƠN (Submit Booking) & ĐIỀU HƯỚNG
// ==========================================
window.submitBooking = async function() {
    if (!customerId) {
        return Swal.fire({
            icon: 'info', title: 'Yêu cầu đăng nhập',
            text: 'Vui lòng đăng nhập để tiến hành chốt chuyến đi.',
            confirmButtonText: 'Đăng nhập ngay'
        }).then((result) => {
            if (result.isConfirmed) window.location.href = 'login.html';
        });
    }

    if (!tripCoordinates.pickupLat || !tripCoordinates.dropoffLat) {
        return Swal.fire({ icon: 'warning', title: 'Thiếu tọa độ', text: 'Vui lòng chọn đầy đủ lộ trình trên bản đồ!' });
    }

    const timeInput = document.getElementById('inputDepartureTime');
    let departureTime = timeInput.value + ':00'; // Chuẩn ISO DateTime

    const pickupAddress = document.getElementById('inputPickup').value;
    const dropoffAddress = document.getElementById('inputDropoff').value;

    const payload = {
        customerId: customerId,
        vehicleId: currentVehicleId,
        voucherId: currentVoucherId,
        bookingType: "DISTANCE",
        tripDirection: "ONE_WAY",
        pickupAddress: pickupAddress,
        pickupLat: tripCoordinates.pickupLat,
        pickupLng: tripCoordinates.pickupLng,
        dropoffAddress: dropoffAddress,
        dropoffLat: tripCoordinates.dropoffLat,
        dropoffLng: tripCoordinates.dropoffLng,
        departureTime: departureTime
    };

    // Khóa UI
    const btn = document.getElementById('btnSubmitBooking');
    btn.disabled = true; 
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-2"></i> Đang xử lý...';

    try {
        const response = await fetch(`${CORE_API_BASE}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (data.success) {
            // LƯU DỮ LIỆU ĐỂ CHUYỂN QUA TRẠM 3 (THANH TOÁN CỌC)
            sessionStorage.setItem('currentBookingId', data.bookingId);
            // Ép kiểu số tiền cọc (bỏ chữ 'đ', bỏ dấu '.') để dễ tính toán ở trang sau
            const rawDeposit = document.getElementById('depositDisplay').innerText.replace(/[. đ]/g, '');
            sessionStorage.setItem('currentDepositAmount', rawDeposit);
            
            // Thông báo mượt mà trước khi chuyển trang
            Swal.fire({
                icon: 'success',
                title: 'Tạo chuyến thành công!',
                text: 'Chuyển hướng đến trang thanh toán cọc...',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.href = 'checkout.html';
            });

        } else {
            // XỬ LÝ LỖI NGHIỆP VỤ TỪ BACKEND BẰNG SWEETALERT2
            let errorTitle = 'Không thể đặt xe';
            let actionBtn = 'Đóng';

            // BR-27: Trùng lịch
            if (data.error && data.error.includes("đã có lịch chạy")) {
                errorTitle = 'Trùng lịch di chuyển';
                actionBtn = 'Chọn giờ khác';
            } 
            // BR-22: Xe hỏng/bảo dưỡng
            else if (data.error && data.error.includes("không sẵn sàng")) {
                errorTitle = 'Xe tạm ngưng hoạt động';
                actionBtn = 'Tìm xe khác';
            }

            Swal.fire({
                icon: 'error',
                title: errorTitle,
                text: data.error || 'Đã có lỗi xảy ra. Vui lòng thử lại!',
                confirmButtonText: actionBtn,
                confirmButtonColor: '#e53e3e'
            }).then((result) => {
                if (result.isConfirmed && actionBtn === 'Tìm xe khác') {
                    window.location.href = '../../pages/findCar.html';
                }
            });

            btn.disabled = false; 
            btn.innerHTML = 'Xác nhận đặt chuyến <i class="fa-solid fa-arrow-right ms-2"></i>';
        }
    } catch (error) {
        new bootstrap.Toast(document.getElementById('systemErrorToast')).show();
        btn.disabled = false; 
        btn.innerHTML = 'Xác nhận đặt chuyến <i class="fa-solid fa-arrow-right ms-2"></i>';
    }
};

// Hàm hỗ trợ tạo giờ tương lai (format YYYY-MM-DDTHH:mm:ss)
function getFutureTime(hoursToAdd) {
    let d = new Date();
    d.setHours(d.getHours() + hoursToAdd);
    // Tính toán bù múi giờ (Local time)
    const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
    return localISO.slice(0, 19); 
}
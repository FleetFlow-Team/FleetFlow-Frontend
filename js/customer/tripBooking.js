// GIAO DIỆN
document.addEventListener("DOMContentLoaded", function () {
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
            document.getElementById('btnLogout').addEventListener('click', function (e) {
                e.preventDefault();
                if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi FleetFlow?')) {
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

window.triggerMapCalculation = async function () {
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
            pickupLat: pickupData.lat, pickupLng: pickupData.lng, pickupAddress: pickupAddress,
            dropoffLat: dropoffData.lat, dropoffLng: dropoffData.lng, dropoffAddress: dropoffAddress
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
window.swapLocations = function () {
    const pickupInput = document.getElementById('inputPickup');
    const dropoffInput = document.getElementById('inputDropoff');

    let temp = pickupInput.value;
    pickupInput.value = dropoffInput.value;
    dropoffInput.value = temp;

    triggerMapCalculation();
};

// Hiển thị dropdown gợi ý địa điểm (Mockup)
window.showMockAutocomplete = function (dropdownId) {
    // Ẩn tất cả dropdown trước
    document.querySelectorAll('.autocomplete-dropdown').forEach(el => el.style.display = 'none');

    const dropdown = document.getElementById(dropdownId);
    if (dropdown) dropdown.style.display = 'block';
};

// Chọn địa điểm từ dropdown
window.selectLocation = function (inputId, text, dropdownId) {
    document.getElementById(inputId).value = text;
    document.getElementById(dropdownId).style.display = 'none';
    triggerMapCalculation();
};

// Ẩn dropdown khi click ra ngoài
document.addEventListener('click', function (event) {
    const isClickInsidePickup = document.getElementById('inputPickup').contains(event.target);
    const isClickInsideDropoff = document.getElementById('inputDropoff').contains(event.target);

    const pickupDropdown = document.getElementById('pickupDropdown');
    const dropoffDropdown = document.getElementById('dropoffDropdown');

    if (!isClickInsidePickup && pickupDropdown) pickupDropdown.style.display = 'none';
    if (!isClickInsideDropoff && dropoffDropdown) dropoffDropdown.style.display = 'none';
});

// Validate thời gian khởi hành (Phải cách hiện tại ít nhất 120 phút)
window.validateDepartureTime = function () {
    const inputTime = document.getElementById('inputDepartureTime');
    const errorMsg = document.getElementById('timeErrorMsg');
    const btnSubmitBooking = document.getElementById('btnSubmitBooking');
    const distValueText = document.getElementById('distValue').innerText;

    if (!inputTime || !inputTime.value) {
        if (btnSubmitBooking) btnSubmitBooking.disabled = true;
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
window.simulateBookingSubmit = function () {
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

        if (sheet.classList.contains('expanded')) {
            if (deltaY > 0) sheet.style.transform = `translate(-50%, ${deltaY}px)`; // Đang vuốt xuống
        } else {
            if (deltaY < 0) sheet.style.transform = `translate(-50%, calc(100% - 190px + ${deltaY}px))`; // Đang vuốt lên
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
    header.addEventListener('touchstart', handleDragStart, { passive: true });
    window.addEventListener('touchmove', handleDragMove, { passive: true });
    window.addEventListener('touchend', handleDragEnd);

    // Sự kiện PC (Mouse - dành cho test giả lập mobile)
    header.addEventListener('mousedown', handleDragStart);
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
}

// ==========================================
// 3. BÁO GIÁ TỰ ĐỘNG (Check-price API)
// ==========================================
window.calculateRealPrice = async function () {
    // Không gọi API nếu chưa có xe hoặc khoảng cách chưa hợp lệ
    if (!currentVehicleId || currentDistanceKm < 20) return;

    const timeInput = document.getElementById('inputDepartureTime');
    let departureTimeStr = null;

    // Nối thêm ':00' (giây) để đồng bộ định dạng Timestamp
    if (timeInput && timeInput.value) {
        departureTimeStr = timeInput.value + ':00';
    } else {
        departureTimeStr = getFutureTime(2);
    }

    const tripDirection = document.querySelector('input[name="tripDirection"]:checked').value;

    const payload = {
        vehicleId: currentVehicleId,
        bookingType: "DISTANCE",
        tripDirection: tripDirection, // Gửi loại hình xuống API
        distanceKm: currentDistanceKm,
        durationHours: 0,
        durationDays: 0,
        departureTime: departureTimeStr
    };

    // Nếu là KHỨ HỒI: Tự động cộng thêm quãng đường chiều về (Bằng đúng chiều đi)
    if (tripDirection === 'ROUND_TRIP') {
        payload.returnDistanceKm = currentDistanceKm;
    }

    const baseFareEl = document.getElementById('baseFareDisplay');
    const totalFareEl = document.getElementById('totalFareDisplay');
    const depositEl = document.getElementById('depositDisplay');
    const fVND = (v) => Math.round(v).toLocaleString('vi-VN') + ' đ';

    try {
        // UI Loading
        if (baseFareEl) baseFareEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-secondary"></i>`;
        if (totalFareEl) totalFareEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i>`;
        if (depositEl) depositEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i>`;

        // Gọi API check-price
        const response = await fetch(`${CUSTOMER_API_BASE}/bookings/check-price`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // TÌM LỖI CHÍNH XÁC: Kiểm tra xem server có trả về JSON không
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const rawText = await response.text(); // Đọc dạng text nếu bị Tomcat trả về trang HTML 500
            throw new Error(`Server không trả về JSON. HTTP Status: ${response.status}. Lỗi trả về: ${rawText.substring(0, 100)}...`);
        }

        const data = await response.json();

        // Xử lý khi HTTP Status code là 4xx, 5xx nhưng vẫn trả về JSON
        if (!response.ok) {
            throw new Error(data.error || `HTTP Lỗi: ${response.status}`);
        }

        if (data.success) {
            currentEstimatedTotal = data.estimatedTotal;

            // Reset voucher
            currentVoucherId = null;
            const discountEl = document.getElementById('discountDisplay');
            const voucherInput = document.getElementById('voucherInput');
            if (discountEl) discountEl.innerText = '0 đ';
            if (voucherInput) voucherInput.value = '';

            // Render dữ liệu
            if (baseFareEl) baseFareEl.innerText = fVND(data.baseFare);
            if (totalFareEl) totalFareEl.innerText = fVND(data.estimatedTotal);
            if (depositEl) depositEl.innerText = fVND(data.deposit30Percent);

            // Phụ phí cuối tuần
            const surchargeEl = document.getElementById('weekendSurchargeDisplay');
            if (surchargeEl) {
                if (data.weekendSurcharge > 0) {
                    surchargeEl.innerText = `+ ${fVND(data.weekendSurcharge)}`;
                    surchargeEl.parentElement.style.display = 'flex';
                } else {
                    surchargeEl.parentElement.style.display = 'none';
                }
            }
        } else {
            throw new Error(data.error || "Logic tính giá thất bại");
        }
    } catch (error) {
        // IN LỖI RA CONSOLE ĐỂ DEBUG
        console.error("🚨 Lỗi Cực Kỳ Rõ Ràng Tại API Check-Price:", error.message || error);

        if (baseFareEl) baseFareEl.innerText = '----';
        if (totalFareEl) totalFareEl.innerText = '---';
        if (depositEl) depositEl.innerText = '--';
    }
};

// Bắt sự kiện đổi giờ -> Tự tính lại giá (bắt phụ phí cuối tuần)
document.getElementById('inputDepartureTime').addEventListener('change', () => {
    validateDepartureTime();
    // Nếu khoảng cách hợp lệ và thời gian không bị lỗi (cách hiện tại >= 120p)
    if (currentDistanceKm >= 20 && !document.getElementById('inputDepartureTime').classList.contains('is-invalid')) {
        calculateRealPrice();
    }
});
// ==========================================
// 4. ÁP MÃ VOUCHER (/vouchers/apply)
// ==========================================

window.applyVoucher = async function () {
    const code = document.getElementById('voucherInput').value.trim();

    // Lấy customerId từ localStorage (Giả định bạn đã lưu lúc đăng nhập)
    const customerId = parseInt(localStorage.getItem('customerId'));

    // 1. Kiểm tra các điều kiện đầu vào
    if (!code) {
        return Swal.fire({ icon: 'warning', title: 'Thiếu thông tin', text: 'Vui lòng nhập mã ưu đãi!' });
    }
    if (!customerId || isNaN(customerId)) {
        return Swal.fire({ icon: 'info', title: 'Chưa đăng nhập', text: 'Bạn cần đăng nhập để dùng tính năng này.' });
    }
    if (currentEstimatedTotal === 0) {
        return Swal.fire({ icon: 'warning', title: 'Chưa có lộ trình', text: 'Vui lòng chọn điểm đón/trả để hệ thống tính giá trước!' });
    }

    // 2. Chuyển UI nút bấm sang trạng thái loading
    const btn = document.getElementById('btnApplyVoucher');
    const origText = btn.innerText;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;

    // Lưu ý: Đảm bảo vehicleTypeId được truyền đúng. Nếu currentVehicleId ở file của bạn là ID loại xe thì giữ nguyên.
    // Nếu nó là ID xe cụ thể, bạn cần lấy vehicleTypeId từ localStorage mà bạn đã lưu ở màn chọn xe.
    const vehicleTypeId = parseInt(localStorage.getItem('selectedVehicleTypeId')) || currentVehicleId;

    // 3. Chuẩn bị payload khớp với API spec
    const payload = {
        code: code,
        customerId: customerId,
        estimatedTotal: currentEstimatedTotal,
        vehicleTypeId: vehicleTypeId
    };

    const fVND = (v) => Math.round(v).toLocaleString('vi-VN') + ' đ';

    try {
        // 4. Gọi API
        const res = await fetch(`${CUSTOMER_API_BASE}/vouchers/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        // 5. Xử lý kết quả trả về
        if (data.success) {
            // Cập nhật giá mới lên UI theo response từ API
            document.getElementById('discountDisplay').innerText = `-${fVND(data.discountAmount)}`;
            document.getElementById('totalFareDisplay').innerText = fVND(data.finalTotal);

            // Tính toán và cập nhật lại số tiền cọc (30% của tổng tiền sau giảm giá)
            const newDeposit = data.finalTotal * 0.3;
            document.getElementById('depositDisplay').innerText = fVND(newDeposit);

            // Lưu ID voucher vào biến toàn cục để gửi kèm lúc tạo Booking
            currentVoucherId = data.voucherId;

            Swal.fire({
                icon: 'success',
                title: 'Áp dụng thành công!',
                text: `Bạn đã được giảm ${fVND(data.discountAmount)}`,
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            // Hiển thị lỗi từ Backend (Hết hạn, sai xe, không tồn tại...)
            Swal.fire({ icon: 'error', title: 'Mã không hợp lệ', text: data.error || 'Voucher không khả dụng.' });
            document.getElementById('voucherInput').value = '';

            // Reset lại UI về giá gốc nếu mã bị lỗi/khách nhập sai mã khác
            currentVoucherId = null;
            document.getElementById('discountDisplay').innerText = '0 đ';
            document.getElementById('totalFareDisplay').innerText = fVND(currentEstimatedTotal);
            document.getElementById('depositDisplay').innerText = fVND(currentEstimatedTotal * 0.3);
        }
    } catch (e) {
        console.error("Lỗi áp dụng voucher:", e);
        new bootstrap.Toast(document.getElementById('systemErrorToast')).show();
    } finally {
        // Trả lại UI cho nút bấm
        btn.innerHTML = origText;
        btn.disabled = false;
    }
};
// ==========================================
// 5. CHỐT ĐƠN VÀ ĐIỀU HƯỚNG SANG CHECKOUT (LUỒNG DISTANCE)
// ==========================================
window.submitBooking = async function () {
    const tripDirection = document.querySelector('input[name="tripDirection"]:checked').value;
    const timeInput = document.getElementById('inputDepartureTime').value;
    const returnTimeInput = document.getElementById('inputReturnTime').value;

    if (!tripCoordinates.pickupLat || !tripCoordinates.dropoffLat) {
        return Swal.fire({ icon: 'warning', title: 'Thiếu tọa độ', text: 'Vui lòng chọn đầy đủ lộ trình!' });
    }

    if (tripDirection === 'ROUND_TRIP' && !returnTimeInput) {
        return Swal.fire({ icon: 'warning', title: 'Thiếu giờ về', text: 'Bạn đã chọn Khứ hồi. Vui lòng nhập giờ quay về!' });
    }

    // GHI TOÀN BỘ DỮ LIỆU VÀO BỘ NHỚ TRƯỚC KHI SANG TRANG CHECKOUT
    localStorage.setItem('bookingType', 'DISTANCE');
    localStorage.setItem('tripDirection', tripDirection);
    localStorage.setItem('pickupAddress', document.getElementById('inputPickup').value);
    localStorage.setItem('dropoffAddress', document.getElementById('inputDropoff').value);

    // Lưu tọa độ Điểm đi
    localStorage.setItem('pickupLat', tripCoordinates.pickupLat);
    localStorage.setItem('pickupLng', tripCoordinates.pickupLng);
    localStorage.setItem('dropoffLat', tripCoordinates.dropoffLat);
    localStorage.setItem('dropoffLng', tripCoordinates.dropoffLng);

    // Lưu tọa độ chiều về nếu là Khứ hồi
    if (tripDirection === 'ROUND_TRIP') {
        localStorage.setItem('returnPickupAddress', document.getElementById('inputDropoff').value);
        localStorage.setItem('returnPickupLat', tripCoordinates.dropoffLat);
        localStorage.setItem('returnPickupLng', tripCoordinates.dropoffLng);

        localStorage.setItem('returnDropoffAddress', document.getElementById('inputPickup').value);
        localStorage.setItem('returnDropoffLat', tripCoordinates.pickupLat);
        localStorage.setItem('returnDropoffLng', tripCoordinates.pickupLng);

        localStorage.setItem('mapReturnTime', returnTimeInput + ':00');
    }

    localStorage.setItem('mapDepartureTime', timeInput + ':00');
    localStorage.setItem('mapEstimatedTotal', currentEstimatedTotal);
    if (currentVoucherId) localStorage.setItem('appliedVoucherId', currentVoucherId);

    // Lưu tiền cọc dạng hiển thị (VD: 300.000 đ)
    const formattedDeposit = document.getElementById('depositDisplay').innerText;
    localStorage.setItem('currentDepositAmount', formattedDeposit);

    Swal.fire({
        icon: 'success',
        title: 'Chốt lộ trình thành công!',
        text: 'Chuyển hướng đến trang điền thông tin và thanh toán...',
        timer: 1500,
        showConfirmButton: false
    }).then(() => {
        window.location.href = 'checkout.html';
    });
};

// Hàm hỗ trợ tạo giờ tương lai (format YYYY-MM-DDTHH:mm:ss)
function getFutureTime(hoursToAdd) {
    let d = new Date();
    d.setHours(d.getHours() + hoursToAdd);
    // Tính toán bù múi giờ (Local time)
    const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
    return localISO.slice(0, 19);
}

window.toggleRoundTripUI = function () {
    const direction = document.querySelector('input[name="tripDirection"]:checked').value;
    const returnBox = document.getElementById('returnTimeBox');
    if (direction === 'ROUND_TRIP') {
        returnBox.classList.remove('d-none');
    } else {
        returnBox.classList.add('d-none');
    }
    // Tính lại giá khi khách đổi loại hình
    if (currentDistanceKm >= 20) calculateRealPrice();
};
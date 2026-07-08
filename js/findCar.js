// ==========================================================================
// 6. KHỞI TẠO DOM & LOGIC BOTTOM SHEET (MOBILE) - ĐÃ VÁ LỖI LIỆT CLICK
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Khởi tạo Toast
    const distanceToastEl = document.getElementById('distanceErrorToast');
    const systemErrorToastEl = document.getElementById('systemErrorToast');
    if (distanceToastEl && typeof bootstrap !== 'undefined') new bootstrap.Toast(distanceToastEl);
    if (systemErrorToastEl && typeof bootstrap !== 'undefined') new bootstrap.Toast(systemErrorToastEl);

    // 2. Thiết lập thời gian tối thiểu cho Date input
    const inputTime = document.getElementById('inputDepartureTime');
    if (inputTime) {
        const now = new Date();
        const localISOTime = (new Date(now.getTime() - now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        inputTime.min = localISOTime;
    }

    // 3. Logic vuốt Bottom Sheet cho Mobile
    initBottomSheetUX();

    // 4. Khởi động phân hệ khám phá xe & Đăng ký sự kiện
    initVehicleFeature();
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
        if (e.target.tagName.toLowerCase() === 'button') return;

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

        if (sheet.classList.contains('expanded')) {
            // Đang mở -> Ép kéo xuống
            if (deltaY > 0) sheet.style.setProperty('transform', `translate(-50%, ${deltaY}px)`, 'important');
        } else {
            // Đang đóng -> Ép kéo lên
            if (deltaY < 0) sheet.style.setProperty('transform', `translate(-50%, calc(100% - 85px + ${deltaY}px))`, 'important');
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
    header.addEventListener('touchstart', handleDragStart, { passive: true });
    window.addEventListener('touchmove', handleDragMove, { passive: true });
    window.addEventListener('touchend', handleDragEnd);

    // Sự kiện PC (Mouse - dành cho test giả lập mobile)
    header.addEventListener('mousedown', handleDragStart);
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
}

// ==========================================================================
// 8. LOGIC POPUP CHỌN DỊCH VỤ KHI VỪA VÀO TRANG
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    // Tự động bật Modal Chọn dịch vụ khi trang vừa tải xong
    // Sử dụng setTimeout 300ms để đảm bảo UI mượt mà, không bị giật khung hình
    setTimeout(() => {
        const welcomeModalEl = document.getElementById('welcomeServiceModal');
        if (welcomeModalEl && typeof bootstrap !== 'undefined') {
            const modalInstance = bootstrap.Modal.getOrCreateInstance(welcomeModalEl);
            modalInstance.show();
        }
    }, 300);
});

// Hàm xử lý khi khách hàng bấm nút "Xác nhận dịch vụ"
window.confirmServiceSelection = function () {
    // 1. Lấy giá trị từ Radio Button mà khách hàng vừa chọn trong Box
    const selectedService = document.querySelector('input[name="initServiceType"]:checked').value;

    // 2. Cập nhật thẻ Select (Dropdown) nằm trên thanh công cụ Sort-bar ở phía ngoài
    const mainSelect = document.getElementById('mainServiceSelect');
    if (mainSelect) {
        mainSelect.value = selectedService;
    }

    // 3. Lưu vào LocalStorage để trang Đặt Chuyến (tripBooking.html) biết khách hàng đang chọn hình thức gì
    localStorage.setItem('bookingType', selectedService);

    // 4. Kích hoạt render lại giá dịch vụ tương ứng
    if (typeof applyFiltersAndSort === 'function') {
        applyFiltersAndSort();
    }

    // 5. Đóng Box (Modal)
    const welcomeModalEl = document.getElementById('welcomeServiceModal');
    if (welcomeModalEl && typeof bootstrap !== 'undefined') {
        const modalInstance = bootstrap.Modal.getInstance(welcomeModalEl);
        if (modalInstance) modalInstance.hide();
    }
};

// ==========================================================================
// 9. PHÂN HỆ KHÁM PHÁ XE, BỘ LỌC (FILTER) & SẮP XẾP (SORT) - HOÀN THIỆN 100%
// ==========================================================================
const VEHICLE_API_URL = 'http://localhost:8080/FleetFlow/api/v1/vehicles';
let globalVehicles = [];      // Mảng gốc chứa toàn bộ dữ liệu xe từ Server
let filteredVehicles = [];    // Mảng sau khi đã qua bộ lọc và sắp xếp
let currentPage = 1;          // Trang hiện tại mặc định
const itemsPerPage = 18;      // Số lượng xe hiển thị trên một trang

// Cấu hình map cứng hình ảnh theo VehicleID từ Database
const vehicleImageMap = {
    1: 'ToyotaVios4.jpg', 2: 'HondaCity4.jpg', 3: 'HyundaiAccent4.jpg', 4: 'MazdaMazda34.jpg', 5: 'KiaSoluto4.jpg',
    6: 'ToyotaVios4.jpg', 7: 'HondaCity4.jpg', 8: 'HyundaiAccent4.jpg', 9: 'MazdaMazda34.jpg', 10: 'KiaSoluto4.jpg',
    11: 'ToyotaVios4.jpg', 12: 'HondaCity4.jpg', 13: 'HyundaiAccent4.jpg', 14: 'MazdaMazda34.jpg', 15: 'ToyotaInnova7.jpg',
    16: 'MitsubishiXpander7.jpg', 17: 'HondaCR-V7.jpg', 18: 'HyundaiCustin7.jpg', 19: 'KiaCarens7.jpg', 20: 'ToyotaInnova7.jpg',
    21: 'MitsubishiXpander7.jpg', 22: 'HondaCR-V7.jpg', 23: 'HyundaiCustin7.jpg', 24: 'KiaCarens7.jpg', 25: 'ToyotaInnova7.jpg',
    26: 'MitsubishiXpander7.jpg', 27: 'HondaCR-V7.jpg', 28: 'HyundaiCustin7.jpg', 29: 'KiaCarnival9.jpg', 30: 'HyundaiSolatiLimo9.jpg',
    31: 'FordTourneo9.jpg', 32: 'KiaCarnival9.jpg', 33: 'HyundaiSolatiLimo9.jpg', 34: 'FordTourneo9.jpg', 35: 'KiaCarnival9.jpg',
    36: 'HyundaiSolatiLimo9.jpg', 37: 'FordTransit16.jpg', 38: 'HyundaiSolati16.jpg', 39: 'MercedesSprinter16.jpg', 40: 'FordTransit16.jpg',
    41: 'HyundaiSolati16.jpg', 42: 'MercedesSprinter16.jpg', 43: 'ThacoTB7929.jpg', 44: 'HyundaiCounty29.jpg', 45: 'SamcoFelix29.jpg',
    46: 'ThacoTB7929.jpg', 47: 'ThacoUniverse45.jpg', 48: 'HyundaiUniverse45.jpg', 49: 'SamcoGrowin45.jpg', 50: 'ThacoUniverse45.jpg'
};
/**
 * Khởi tạo tính năng xe, đăng ký các sự kiện tương tác bộ lọc
 */
function initVehicleFeature() {
    // Tải danh sách xe ban đầu
    fetchVehicles();

    // 1. Lắng nghe sự kiện thay đổi select số chỗ ngồi
    const seatSelect = document.getElementById('filterSeat');
    if (seatSelect) seatSelect.addEventListener('change', applyFiltersAndSort);

    // 2. Lắng nghe sự kiện thay đổi hãng xe
    const brandSelect = document.getElementById('filterBrand');
    if (brandSelect) brandSelect.addEventListener('change', applyFiltersAndSort);

    // 3. Lắng nghe sự kiện thay đổi hộp số (AT/MT/Tất cả)
    const transRadios = document.querySelectorAll('input[name="transmission"]');
    transRadios.forEach(radio => radio.addEventListener('change', applyFiltersAndSort));

    // 4. Lắng nghe sự kiện thay đổi loại nhiên liệu
    const fuelCheckboxes = document.querySelectorAll('.filter-fuel');
    fuelCheckboxes.forEach(cb => cb.addEventListener('change', applyFiltersAndSort));

    // 5. Lắng nghe sự kiện thay đổi mức giá select
    const priceSelect = document.getElementById('filterPrice');
    if (priceSelect) priceSelect.addEventListener('change', applyFiltersAndSort);

    // 6. Lắng nghe sự kiện thay đổi sắp xếp (Sort)
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.addEventListener('change', applyFiltersAndSort);

    // 7. Lắng nghe sự kiện thay đổi loại hình dịch vụ chính
    const mainServiceSelect = document.getElementById('mainServiceSelect');
    if (mainServiceSelect) {
        const savedBookingType = localStorage.getItem('bookingType');
        if (savedBookingType) {
            mainServiceSelect.value = savedBookingType;
        }
        mainServiceSelect.addEventListener('change', () => {
            localStorage.setItem('bookingType', mainServiceSelect.value);
            applyFiltersAndSort();
        });
    }

    // 8. Đăng ký nút xóa lọc (Reset filters)
    const btnClearFilters = document.getElementById('btnClearFilters');
    if (btnClearFilters) {
        btnClearFilters.addEventListener('click', resetAllFilters);
    }
}

/**
 * Tính toán giá tiền ổn định cho từng xe theo logic mock
 * Nếu API trả về trường giá sẽ ưu tiên sử dụng
 */
function getMockPrice(v) {
    if (v.price) return v.price;
    if (v.pricePerDay) return v.pricePerDay;
    if (v.dailyPrice) return v.dailyPrice;
    if (v.basePrice) return v.basePrice;

    let base = 500000;
    if (v.seatCount >= 6 && v.seatCount <= 8) {
        base = 900000;
    } else if (v.seatCount > 8) {
        base = 1800000;
    }

    // Tùy biến nhẹ theo hãng xe
    const brandLower = (v.brand || '').toLowerCase();
    if (brandLower.includes('vinfast')) base += 100000;
    if (brandLower.includes('mazda')) base += 50000;

    // Nhiên liệu điện đắt hơn
    const descLower = (v.description || '').toLowerCase();
    if (descLower.includes('điện')) base += 100000;

    // Tránh trùng giá tuyệt đối cho các xe cùng nhóm bằng offset cố định dựa trên Id
    const idOffset = ((v.vehicleId || 0) % 5) * 50000;
    return base + idOffset;
}

/**
 * Gọi API tải danh sách xe từ Server
 */
async function fetchVehicles() {
    try {
        const response = await fetch(VEHICLE_API_URL);
        const result = await response.json();

        if (result.data) {
            globalVehicles = result.data;
            // Sắp xếp xe tăng dần theo ID để hiển thị nhất quán ban đầu
            globalVehicles.sort((a, b) => (a.vehicleId || 0) - (b.vehicleId || 0));

            // Lưu trữ mảng gốc phục vụ booking màn hình trong
            localStorage.setItem('allVehicles', JSON.stringify(globalVehicles));

            // Áp dụng bộ lọc lần đầu
            applyFiltersAndSort();
        }
    } catch (error) {
        console.error("Hệ thống không thể tải danh sách phương tiện từ máy chủ:", error);
    }
}

/**
 * Áp dụng tất cả các bộ lọc hiện tại và sort dữ liệu
 */
window.applyFiltersAndSort = function () {
    // 1. Lấy trạng thái của select số chỗ ngồi
    const filterSeat = document.getElementById('filterSeat');
    const seatVal = filterSeat ? filterSeat.value : 'ALL';

    // 2. Lấy hãng xe được chọn
    const filterBrand = document.getElementById('filterBrand');
    const brandVal = filterBrand ? filterBrand.value.toLowerCase() : '';

    // 3. Lấy hộp số được chọn
    const checkedTrans = document.querySelector('input[name="transmission"]:checked');
    const transVal = checkedTrans ? checkedTrans.value : 'ALL';

    // 4. Lấy nhiên liệu
    const checkedFuels = Array.from(document.querySelectorAll('.filter-fuel:checked')).map(el => el.value);

    // 5. Lấy khoảng giá
    const filterPrice = document.getElementById('filterPrice');
    const priceVal = filterPrice ? filterPrice.value : '';

    // Tiến hành lọc mảng gốc
    filteredVehicles = globalVehicles.filter(v => {
        // A. Lọc theo số chỗ ngồi
        if (seatVal !== 'ALL') {
            const val = parseInt(seatVal);
            if (val === 4 && v.seatCount > 5) return false;
            if (val === 7 && (v.seatCount < 6 || v.seatCount > 8)) return false;
            if (val === 9 && v.seatCount !== 9) return false;
            if (val === 16 && (v.seatCount < 10 || v.seatCount > 16)) return false;
            if (val === 29 && (v.seatCount < 17 || v.seatCount > 29)) return false;
            if (val === 45 && v.seatCount < 30) return false;
        }

        // B. Lọc theo hãng xe
        if (brandVal) {
            if ((v.brand || '').toLowerCase() !== brandVal) return false;
        }

        // C. Lọc theo hộp số
        if (transVal !== 'ALL') {
            const descLower = (v.description || '').toLowerCase();
            const isManual = descLower.includes('số sàn') || descLower.includes('mt');
            if (transVal === 'AT' && isManual) return false;
            if (transVal === 'MT' && !isManual) return false;
        }

        // D. Lọc theo nhiên liệu (Dựa trên FuelType thực tế)
        const fuelTypeStr = (v.fuelType || '').toLowerCase();
        const descLowerStr = (v.description || '').toLowerCase();
        
        // Phân tách các loại nhiên liệu
        const isElectric = fuelTypeStr.includes('điện') || fuelTypeStr.includes('electric') || descLowerStr.includes('điện');
        const isHybrid = fuelTypeStr.includes('hybrid') || descLowerStr.includes('hybrid');
        const isGas = !isElectric && !isHybrid; // Còn lại là Xăng hoặc Dầu

        if (checkedFuels.length > 0) {
            let fuelMatch = false;
            // 'gas' đại diện cho Xăng/Dầu
            if (checkedFuels.includes('gas') && isGas) fuelMatch = true;
            // 'hybrid' đại diện cho Hybrid
            if (checkedFuels.includes('hybrid') && isHybrid) fuelMatch = true;
            // 'electric' đại diện cho Điện
            if (checkedFuels.includes('electric') && isElectric) fuelMatch = true;
            
            if (!fuelMatch) return false;
        } else {
            // Không chọn nhiên liệu nào -> không hiển thị
            return false;
        }

        // E. Lọc theo giá dịch vụ
        if (priceVal) {
            const price = getMockPrice(v);
            if (priceVal === 'range1' && price >= 500000) return false;
            if (priceVal === 'range2' && (price < 500000 || price > 1000000)) return false;
            if (priceVal === 'range3' && (price < 1000001 || price > 2000000)) return false;
            if (priceVal === 'range4' && price <= 2000000) return false;
        }

        return true;
    });

    // 6. Thực hiện Sắp xếp (Sort)
    const sortSelect = document.getElementById('sortSelect');
    const sortVal = sortSelect ? sortSelect.value : 'default';
    if (sortVal === 'priceAsc') {
        filteredVehicles.sort((a, b) => getMockPrice(a) - getMockPrice(b));
    } else if (sortVal === 'priceDesc') {
        filteredVehicles.sort((a, b) => getMockPrice(b) - getMockPrice(a));
    } else if (sortVal === 'odoAsc') {
        filteredVehicles.sort((a, b) => (a.accumulatedKm || 0) - (b.accumulatedKm || 0));
    } else {
        // Mặc định: ID tăng dần
        filteredVehicles.sort((a, b) => (a.vehicleId || 0) - (b.vehicleId || 0));
    }

    // Reset về trang 1 sau khi lọc/sắp xếp
    currentPage = 1;
    renderVehiclesByPage(currentPage);
};

/**
 * Đưa các bộ lọc về mặc định ban đầu
 */
function resetAllFilters() {
    // Số chỗ ngồi mặc định: Tất cả
    const seatSelect = document.getElementById('filterSeat');
    if (seatSelect) seatSelect.value = 'ALL';

    // Hãng xe mặc định
    const brandSelect = document.getElementById('filterBrand');
    if (brandSelect) brandSelect.value = '';

    // Hộp số mặc định: Tất cả
    const transRadioAll = document.querySelector('input[name="transmission"][value="ALL"]');
    if (transRadioAll) transRadioAll.checked = true;

    // Nhiên liệu mặc định: cả hai đều check
    const fuelCheckboxes = document.querySelectorAll('.filter-fuel');
    fuelCheckboxes.forEach(cb => cb.checked = true);

    // Mức giá mặc định
    const priceSelect = document.getElementById('filterPrice');
    if (priceSelect) priceSelect.value = '';

    // Sắp xếp mặc định
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.value = 'default';

    applyFiltersAndSort();
}
/**
 * Render danh sách xe dựa theo phân trang hiện tại
 */
function renderVehiclesByPage(page) {
    const container = document.getElementById('vehicleListContainer');
    if (!container) return;

    // Tính toán vị trí cắt mảng dữ liệu đã lọc
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentVehicles = filteredVehicles.slice(startIndex, endIndex);

    let html = '';

    // Cập nhật tổng số xe hiển thị lên giao diện
    const countText = document.getElementById('totalVehicleCount');
    if (countText) countText.innerText = filteredVehicles.length;

    if (filteredVehicles.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5 text-secondary">
                <i class="fa-solid fa-car-tunnel fs-1 mb-3 highlight-text"></i>
                <h5 class="fw-bold">Không tìm thấy phương tiện nào phù hợp với bộ lọc</h5>
                <p class="text-muted small">Hãy nhấn "Xóa lọc" để thử lại nhé!</p>
            </div>`;
        renderPaginationInfo(0, page);
        return;
    }

    // Xác định dịch vụ hiện tại để render nhãn và trị giá tương ứng
    const bookingType = localStorage.getItem('bookingType') || 'DISTANCE';
    let serviceLabel = 'ngày';
    if (bookingType === 'HOURLY') serviceLabel = 'giờ';
    else if (bookingType === 'DISTANCE') serviceLabel = 'chuyến';

    currentVehicles.forEach(v => {
        // Tách nhiên liệu và hộp số từ mô tả
        // Dùng dữ liệu thật từ API, giữ lại logic fallback hộp số
        const descLower = (v.description || '').toLowerCase();
        let fuelType = v.fuelType || 'Xăng';
        let transType = (descLower.includes("số sàn") || descLower.includes("mt")) ? "Số sàn" : "Tự động";

        // Xử lý hình ảnh: Ưu tiên imageUrl từ DB, nếu không có thì lấy theo VehicleID từ bộ từ điển
        let carImage = 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?q=80&w=600';
        if (v.imageUrl && (v.imageUrl.startsWith('http://') || v.imageUrl.startsWith('https://'))) {
            carImage = v.imageUrl;
        } else {
            let fileName = vehicleImageMap[v.vehicleId];
            if (fileName) {
                carImage = fileName.startsWith('http') ? fileName : `../assets/img/car-show/ImageUrl/${fileName}`;
            }
        }
        // Giá xe

        const rawPrice = getMockPrice(v);
        let displayPrice = rawPrice;
        if (bookingType === 'HOURLY') {
            displayPrice = Math.round(rawPrice / 10);
        }

        let badgeClass = v.seatCount > 5 ? "badge-red" : "badge-yellow";

        html += `
        <div class="col-6 col-md-4 col-xl-4">
            <div class="glass-card h-100 tilt-effect">
                <div class="glass-content d-flex flex-column h-100">
                    <div class="vehicle-img-box position-relative" style="cursor: pointer;" onclick="viewCarDetail('${v.vehicleId}')" title="Nhấn để xem chi tiết thông số">
                        <div class="vehicle-badge-discount ${badgeClass}">Chi tiết <i class="fa-solid fa-up-right-and-down-left-from-center ms-1"></i></div>
                        <img src="${carImage}" alt="${v.brand} ${v.model}" class="v-img" loading="lazy" />
                    </div>
                    
                    <div class="vehicle-detail-content">
                        <h5 class="v-title fw-bold text-dark">${v.brand} ${v.model}</h5>
                        
                        <div class="v-specs-container">
                            <span class="v-spec-pill" title="Biển kiểm soát">
                                <i class="fa-solid fa-hashtag"></i>${v.licensePlate}
                            </span>
                            <span class="v-spec-pill" title="Số chỗ ngồi">
                                <i class="fa-solid fa-chair"></i>${v.seatCount} Chỗ
                            </span>
                            <span class="v-spec-pill" title="Nhiên liệu">
                                <i class="fa-solid fa-gas-pump"></i>${fuelType}
                            </span>
                            <span class="v-spec-pill" title="Hộp số">
                                <i class="fa-solid fa-gear"></i>${transType}
                            </span>
                        </div>

                        <div class="price-container my-3 text-center">
                            <span class="price-current">${displayPrice.toLocaleString('vi-VN')}<span class="currency">đ</span></span>
                            <span class="text-secondary small">/${serviceLabel}</span>
                        </div>

                        <div class="d-flex align-items-center justify-content-center pt-3 mt-auto border-top-glass-light">
                            <button type="button" class="btn-liquid-book px-5" onclick="event.stopPropagation(); selectCarAndGo('${v.vehicleId}')">
                                <span class="text-dark text-decoration-none fw-bold">Chọn xe</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
    renderPaginationInfo(filteredVehicles.length, page);
    initTiltEffect();
}

/**
 * Render thanh phân trang tự động
 */
function renderPaginationInfo(totalItems, currentPage) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer) return;

    let html = '';
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    // Nút lùi (Prev)
    if (currentPage === 1) {
        html += `<li class="page-item disabled"><a class="page-link" href="javascript:void(0)"><i class="fa-solid fa-chevron-left"></i></a></li>`;
    } else {
        html += `<li class="page-item"><a class="page-link" href="javascript:void(0)" onclick="changePage(${currentPage - 1})"><i class="fa-solid fa-chevron-left"></i></a></li>`;
    }

    // Vẽ từng số trang
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            html += `<li class="page-item active"><a class="page-link" href="javascript:void(0)">${i}</a></li>`;
        } else {
            html += `<li class="page-item"><a class="page-link" href="javascript:void(0)" onclick="changePage(${i})">${i}</a></li>`;
        }
    }

    // Nút tiến (Next)
    if (currentPage === totalPages) {
        html += `<li class="page-item disabled"><a class="page-link" href="javascript:void(0)"><i class="fa-solid fa-chevron-right"></i></a></li>`;
    } else {
        html += `<li class="page-item"><a class="page-link" href="javascript:void(0)" onclick="changePage(${currentPage + 1})"><i class="fa-solid fa-chevron-right"></i></a></li>`;
    }

    paginationContainer.innerHTML = html;
}

/**
 * Cuộn giao diện lên đầu danh sách xe sau khi render
 */
function scrollToVehicleList() {
    const containerEl = document.getElementById('vehicleListContainer');
    if (!containerEl) return;

    const listTop = containerEl.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: listTop, behavior: 'smooth' });
}

/**
 * Chuyển trang và cuộn giao diện lên đầu danh sách
 */
window.changePage = function (pageNumber) {
    currentPage = pageNumber;
    renderVehiclesByPage(currentPage);
    requestAnimationFrame(() => scrollToVehicleList());
};

/**
 * Lưu ID xe vào LocalStorage và phân luồng chuyển trang
 */
window.selectCarAndGo = async function (vehicleId) {
    // Lấy token để gọi API kiểm tra trạng thái account
    const token = localStorage.getItem('accessToken');
    if (token) {
        try {
            const response = await fetch('http://localhost:8080/FleetFlow/api/v1/customers/profile', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (response.ok && result.success && result.data) {
                // Nếu tài khoản bị khóa, chặn và hiển thị Modal
                if (result.data.status === 'LOCKED') {
                    if (typeof bootstrap !== 'undefined') {
                        const lockModal = new bootstrap.Modal(document.getElementById('lockAccountModal'));
                        lockModal.show();
                    } else {
                        showModalAlert("Tài khoản của bạn đang bị tạm khóa. Không thể đặt xe mới.", "Tài khoản bị khóa", "error");
                    }
                    return; // Dừng lại, không cho chọn xe và không chuyển trang
                }
            }
        } catch (err) {
            console.warn("Không thể kiểm tra trạng thái khóa, bỏ qua check nội bộ:", err);
        }
    }

    // Nếu bình thường thì tiếp tục lưu thông tin xe và chuyển trang
    localStorage.setItem('selectedVehicleId', vehicleId);

    // Lấy loại dịch vụ khách đang chọn
    const bookingType = localStorage.getItem('bookingType') || 'DISTANCE';

    if (bookingType === 'HOURLY' || bookingType === 'DAILY') {
        // Thuê Giờ/Ngày -> Chuyển thẳng tới trang Thanh Toán
        window.location.href = '../pages/customer/checkout.html';
    } else {
        // Thuê theo chuyến -> Qua trang Map để vẽ lộ trình
        window.location.href = '../pages/customer/tripBooking.html';
    }
};

/**
 * Xem chi tiết xe và hiển thị Modal
 */
window.viewCarDetail = async function (id) {
    const modalEl = document.getElementById('carDetailModal');
    const modalBody = document.getElementById('carDetailBody');

    if (!modalEl || !modalBody) return;

    // 1. Khởi tạo và hiện Modal
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
    modalInstance.show();

    // 2. Trạng thái Loading
    modalBody.innerHTML = `
        <div class="text-center py-5">
            <i class="fa-solid fa-circle-notch fa-spin fs-1 text-white"></i>
            <p class="mt-3 text-white-50 fs-5 fw-medium">Đang truy xuất hồ sơ xe...</p>
        </div>`;

    try {
        const response = await fetch(`${VEHICLE_API_URL}/${id}`);
        const result = await response.json();

        if (result.success && result.data) {
            const v = result.data;

            // Xử lý hình ảnh Modal: Ưu tiên imageUrl từ DB, nếu không có thì lấy theo ID từ bộ từ điển
            let modalImage = 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?q=80&w=600';
            if (v.imageUrl && (v.imageUrl.startsWith('http://') || v.imageUrl.startsWith('https://'))) {
                modalImage = v.imageUrl;
            } else {
                let fileName = vehicleImageMap[id];
                if (fileName) {
                    modalImage = fileName.startsWith('http') ? fileName : `../assets/img/car-show/ImageUrl/${fileName}`;
                }
            }
            // Xử lý giá tiền dịch vụ cho modal
            const rawPrice = getMockPrice(v);
            const bookingType = localStorage.getItem('bookingType') || 'DISTANCE';
            let serviceLabel = 'ngày';
            let displayPrice = rawPrice;
            if (bookingType === 'HOURLY') {
                serviceLabel = 'giờ';
                displayPrice = Math.round(rawPrice / 10);
            } else if (bookingType === 'DISTANCE') {
                serviceLabel = 'chuyến';
            }

            // ==========================================
            // BỔ SUNG: TẠO DỮ LIỆU CHO BIẾN tagsHtml
            // ==========================================
            let tagsHtml = '';
            // Style glassmorphism mờ nhẹ cho các thẻ tag
            const tagStyle = 'background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 50px; font-size: 0.8rem; padding: 6px 14px; margin-right: 8px; margin-bottom: 8px; display: inline-block; font-weight: 500;';

            // 1. Tag Chỗ ngồi
            if (v.seatCount) tagsHtml += `<span style="${tagStyle}"><i class="fa-solid fa-chair me-1 text-success"></i>${v.seatCount} Chỗ</span>`;

            // 2. Tag Nhiên liệu
            let fuel = v.fuelType || 'Xăng';
            tagsHtml += `<span style="${tagStyle}"><i class="fa-solid fa-gas-pump me-1 text-success"></i>${fuel}</span>`;

            // 3. Tag Hộp số
            let trans = ((v.description || '').toLowerCase().includes('số sàn') || (v.description || '').toLowerCase().includes('mt')) ? 'Số sàn' : 'Tự động';
            tagsHtml += `<span style="${tagStyle}"><i class="fa-solid fa-gear me-1 text-success"></i>${trans}</span>`;

            // 4. Tag Hãng xe
            if (v.brand) tagsHtml += `<span style="${tagStyle}"><i class="fa-solid fa-shield-halved me-1 text-success"></i>Hãng ${v.brand}</span>`;
            // ==========================================

            modalBody.innerHTML = `
                <div class="row g-4 align-items-center">
                    <div class="col-md-5 text-center">
                        <img src="${modalImage}" class="img-fluid w-100" style="border-radius: 28px; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 20px 40px rgba(0,0,0,0.5);" alt="${v.brand}">
                    </div>
                    
                    <div class="col-md-7 ps-md-4 text-start">
                        <h3 class="glass-login-title mb-1">${v.brand} ${v.model}</h3>
                        <div class="mb-4 d-inline-block px-4 py-1" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 50px; font-weight: 600; font-size: 0.85rem;">
                            ${v.typeName || 'Hạng xe tiêu chuẩn'}
                        </div>
                        
                        <div class="row g-3 mb-4">
                            <div class="col-6">
                                <div class="glass-info-box">
                                    <div class="text-white-50 small mb-1 fw-medium"><i class="fa-solid fa-hashtag me-1"></i> Biển kiểm soát</div>
                                    <div class="fw-bold fs-5 text-white">${v.licensePlate}</div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="glass-info-box">
                                    <div class="text-white-50 small mb-1 fw-medium"><i class="fa-solid fa-chair me-1"></i> Chỗ ngồi</div>
                                    <div class="fw-bold fs-5 text-white">${v.seatCount} Ghế</div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="glass-info-box">
                                    <div class="text-white-50 small mb-1 fw-medium"><i class="fa-solid fa-gauge-high me-1"></i> Tích lũy (ODO)</div>
                                    <div class="fw-bold fs-6" style="color: #4ade80;">${(v.accumulatedKm || 0).toLocaleString('vi-VN')} km</div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="glass-info-box">
                                    <div class="text-white-50 small mb-1 fw-medium"><i class="fa-solid fa-shield-halved me-1"></i> Trạng thái</div>
                                    <div class="fw-bold fs-6 ${v.status === 'AVAILABLE' ? 'text-white' : 'text-danger'}">${v.status === 'AVAILABLE' ? 'Sẵn sàng phục vụ' : 'Đang bận'}</div>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="glass-info-box text-center py-2">
                                    <div class="text-white-50 small mb-1 fw-medium"><i class="fa-solid fa-tags me-1"></i> Giá dịch vụ tạm tính</div>
                                    <div class="fw-bold fs-4" style="color: #4ade80;">${displayPrice.toLocaleString('vi-VN')} đ <span style="font-size:0.9rem;font-weight:normal;" class="text-white-50">/${serviceLabel}</span></div>
                                </div>
                            </div>
                        </div>

                        <div class="mb-4 mt-2">
                            <div class="text-white-50 small mb-2 fw-medium"><i class="fa-solid fa-tags me-1"></i> Nhãn phân tích AI</div>
                            <div class="d-flex flex-wrap">${tagsHtml}</div>
                        </div>
                        
                        <div class="mb-4">
                            <div class="text-white-50 small mb-1 fw-medium"><i class="fa-solid fa-circle-info me-1"></i> Thông tin bổ sung</div>
                            <p class="text-white opacity-75 m-0" style="font-size: 0.9rem; line-height: 1.5;">
                                ${v.description || 'Phương tiện thuộc hệ thống quản lý của FleetFlow.'}
                            </p>
                        </div>

                        <div class="d-flex gap-3 mt-4 pt-3 border-top" style="border-color: rgba(255,255,255,0.1) !important;">
                            <button type="button" class="glass-btn-outline w-50" data-bs-dismiss="modal">Trở lại</button>
                            <button type="button" class="glass-btn-primary w-50" id="btnBookFromDetailInner">
                                Chọn xe <i class="fa-solid fa-arrow-right ms-2"></i>
                            </button>
                        </div>
                    </div>
                </div>`;

            // Gán sự kiện cho nút "Chọn xe" trong modal
            const btnBookInner = document.getElementById('btnBookFromDetailInner');
            if (btnBookInner) {
                btnBookInner.onclick = (e) => {
                    e.stopPropagation();
                    if (v.status !== 'Available') {
                        showModalAlert("Phương tiện này hiện không sẵn sàng. Vui lòng chọn xe khác!", "Phương tiện bận", "warning");
                        return;
                    }
                    selectCarAndGo(v.vehicleId);
                };
            }
        } else {
            modalBody.innerHTML = `
                <div class="text-center py-5">
                    <i class="fa-solid fa-triangle-exclamation fs-1 mb-3" style="color: #ef4444;"></i>
                    <h5 class="text-white fw-bold mb-2">Không tải được dữ liệu</h5>
                    <p class="text-white-50">${result.message}</p>
                    <button class="glass-btn-outline px-4 mt-3 mx-auto" data-bs-dismiss="modal">Đóng</button>
                </div>`;
        }
    } catch (error) {
        console.error("Lỗi xem chi tiết xe:", error);
        modalBody.innerHTML = `
            <div class="text-center py-5">
                <i class="fa-solid fa-server fs-1 mb-3" style="color: #ef4444;"></i>
                <h5 class="text-white fw-bold mb-2">Lỗi kết nối</h5>
                <p class="text-white-50">Mất kết nối đến máy chủ FleetFlow!</p>
                <button class="glass-btn-outline px-4 mt-3 mx-auto" data-bs-dismiss="modal">Đóng</button>
            </div>`;
    }
};

/**
 * Hiệu ứng nghiêng 3D cao cấp cho các thẻ xe
 */
function initTiltEffect() {
    const cards = document.querySelectorAll('.tilt-effect');
    cards.forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -8;
            const rotateY = ((x - centerX) / centerX) * 8;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
            card.style.transition = `transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.2)`;
        });

        card.addEventListener('mouseenter', () => {
            card.style.transition = `transform 0.1s ease`;
        });
    });
}

// ==========================================================================
// 7. AI CHATBOT LOGIC
// ==========================================================================
function sendSuggestion(text) {
    const input = document.getElementById('chat-input');
    if (input) {
        input.value = text;
        sendMessage();
    }
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const msgList = document.getElementById('chat-messages');
    
    if (!input || !msgList) return;
    
    const message = input.value.trim();
    if (!message) return;
    
    // Xoá nội dung input
    input.value = '';
    
    // Render tin nhắn của User
    msgList.innerHTML += `
        <div class="d-flex gap-3 mb-4 w-100 flex-row-reverse">
            <div class="chat-glass-bubble user-bubble" style="background: rgba(0, 177, 79, 0.85); backdrop-filter: blur(10px); color: white; padding: 12px 16px; border-radius: 20px 20px 0 20px;">
                <p class="mb-0 text-white">${message}</p>
            </div>
        </div>
    `;
    
    msgList.scrollTop = msgList.scrollHeight;
    
    // Render tin nhắn chờ của Bot
    const loadingId = 'ai-loading-' + Date.now();
    msgList.innerHTML += `
        <div class="d-flex gap-3 mb-4 w-100" id="${loadingId}">
            <div class="avatar-glass flex-shrink-0">
                <img src="../assets/img/LogoAI - FleetFlow.png" alt="AI Avatar">
            </div>
            <div class="chat-glass-bubble ai-bubble w-100">
                <p class="mb-0 text-dark"><i class="fa-solid fa-circle-notch fa-spin me-2 text-primary"></i>Đang suy nghĩ...</p>
            </div>
        </div>
    `;
    msgList.scrollTop = msgList.scrollHeight;
    
    try {
        const response = await fetch('http://localhost:8080/FleetFlow/api/v1/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });
        
        const result = await response.json();
        
        // Remove loading
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        
        if (response.ok && result.success) {
            let botText = "Tôi đã tìm thấy phương tiện phù hợp với nhu cầu của bạn. Danh sách bên dưới đã được cập nhật!";
            if (!result.data || result.data.length === 0) {
                botText = "Xin lỗi, tôi không tìm thấy phương tiện nào hoàn toàn phù hợp với yêu cầu này. Bạn thử điều chỉnh lại nhé!";
            } else if (result.source === 'FALLBACK') {
                botText = "Hệ thống AI tạm thời gián đoạn. Dưới đây là gợi ý từ hệ thống cơ bản:";
            }
            
            // Render text
            msgList.innerHTML += `
                <div class="d-flex gap-3 mb-4 w-100">
                    <div class="avatar-glass flex-shrink-0">
                        <img src="../assets/img/LogoAI - FleetFlow.png" alt="AI Avatar">
                    </div>
                    <div class="chat-glass-bubble ai-bubble w-100">
                        <p class="mb-0 text-dark">${botText}</p>
                    </div>
                </div>
            `;
            
            // Render list xe mới
            if (result.data && result.data.length > 0) {
                // Đóng bottom sheet/ẩn chat nếu trên Mobile
                if (window.innerWidth < 1200) {
                    const sheet = document.getElementById('filterSheet');
                    if (sheet) sheet.classList.remove('expanded');
                    document.body.classList.remove('filter-open');
                }
                
                // Override mảng data và render bằng trạng thái nội bộ thực sự
                filteredVehicles = Array.isArray(result.data) ? result.data : [];
                currentPage = 1;
                renderVehiclesByPage(1);
                if (typeof renderPaginationInfo === 'function') {
                    renderPaginationInfo(filteredVehicles.length, 1);
                }
                
                // Cuộn xuống danh sách xe sau khi render xong
                requestAnimationFrame(() => scrollToVehicleList());
            }
        } else {
            msgList.innerHTML += `
                <div class="d-flex gap-3 mb-4 w-100">
                    <div class="avatar-glass flex-shrink-0">
                        <img src="../assets/img/LogoAI - FleetFlow.png" alt="AI Avatar">
                    </div>
                    <div class="chat-glass-bubble ai-bubble w-100">
                        <p class="mb-0 text-danger">Đã có lỗi từ máy chủ: ${result.error || 'Lỗi không xác định'}</p>
                    </div>
                </div>
            `;
        }
    } catch (e) {
        console.error("Lỗi gọi API AI Chat:", e);
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        msgList.innerHTML += `
            <div class="d-flex gap-3 mb-4 w-100">
                <div class="avatar-glass flex-shrink-0">
                    <img src="../assets/img/LogoAI - FleetFlow.png" alt="AI Avatar">
                </div>
                <div class="chat-glass-bubble ai-bubble w-100">
                    <p class="mb-0 text-danger">Lỗi kết nối mạng đến AI Trợ lý.</p>
                </div>
            </div>
        `;
    }
    
    msgList.scrollTop = msgList.scrollHeight;
}

// Bắt sự kiện phím Enter cho Chat Input
document.addEventListener("DOMContentLoaded", () => {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});
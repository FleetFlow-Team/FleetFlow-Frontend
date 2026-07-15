/**
 * Quản lý Điểm đến cố định (Landmark) cho Master Admin
 * Cung cấp chức năng liệt kê, thêm mới, sửa, ẩn (soft delete) và khôi phục Landmark.
 */

const LANDMARK_API_URL = '/admin/landmarks';
let currentLandmarkId = null;
let landmarkModalInstance = null;
let currentLandmarks = [];

document.addEventListener("DOMContentLoaded", () => {
    // Nếu tab landmark đang mở mặc định hoặc khởi tạo
    const tabLandmarks = document.getElementById('tab-landmarks');
    if (tabLandmarks && tabLandmarks.classList.contains('active')) {
        fetchLandmarks();
    }
});

/**
 * Lấy danh sách Landmark từ API và render bảng
 */
async function fetchLandmarks() {
    const tbody = document.getElementById('landmarkListBody');
    if (!tbody) return;

    try {
        const result = await API.get(LANDMARK_API_URL);
        if (result && result.success && result.data) {
            currentLandmarks = result.data;
            filterAndRenderLandmarks();
        } else {
            currentLandmarks = [];
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-white-50 py-4"><i class="fa-solid fa-inbox fs-3 mb-2 d-block"></i>Chưa có điểm đến nào.</td></tr>`;
        }
    } catch (err) {
        console.error("Lỗi khi tải danh sách Landmark:", err);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4"><i class="fa-solid fa-triangle-exclamation me-2"></i>Lỗi kết nối máy chủ!</td></tr>`;
    }
}

/**
 * Lọc theo danh mục và hiển thị ra bảng
 */
function filterAndRenderLandmarks() {
    const filterCat = document.getElementById('landmarkCategoryFilter') ? document.getElementById('landmarkCategoryFilter').value : '';
    const filterSearch = document.getElementById('landmarkSearchInput') ? document.getElementById('landmarkSearchInput').value.toLowerCase().trim() : '';

    let list = currentLandmarks.filter(l => {
        const matchCat = !filterCat || l.category === filterCat;
        const matchSearch = !filterSearch || 
            (l.name && l.name.toLowerCase().includes(filterSearch)) ||
            (l.address && l.address.toLowerCase().includes(filterSearch));
        return matchCat && matchSearch;
    });

    renderLandmarkTable(list);
}

/**
 * Render bảng Landmark
 */
function renderLandmarkTable(list) {
    const tbody = document.getElementById('landmarkListBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-white-50 py-4"><i class="fa-solid fa-inbox fs-3 mb-2 d-block"></i>Không tìm thấy điểm đến nào phù hợp.</td></tr>`;
        return;
    }

    list.forEach(l => {
        let catBadge = '';
        if (l.category === 'AIRPORT') {
            catBadge = '<span class="badge bg-info bg-opacity-25 text-info border border-info px-3 py-1 rounded-pill"><i class="fa-solid fa-plane-departure me-1"></i>Sân bay</span>';
        } else if (l.category === 'BUS_STATION') {
            catBadge = '<span class="badge bg-warning bg-opacity-25 text-warning border border-warning px-3 py-1 rounded-pill"><i class="fa-solid fa-bus me-1"></i>Bến xe</span>';
        } else {
            catBadge = '<span class="badge bg-secondary bg-opacity-25 text-light border border-secondary px-3 py-1 rounded-pill"><i class="fa-solid fa-location-dot me-1"></i>Khác</span>';
        }

        let statusBadge = !l.isDeleted
            ? '<span class="badge bg-success bg-opacity-25 text-success border border-success px-3 py-1 rounded-pill"><i class="fa-solid fa-check-circle me-1"></i>Đang hoạt động</span>'
            : '<span class="badge bg-secondary bg-opacity-25 text-secondary border border-secondary px-3 py-1 rounded-pill"><i class="fa-solid fa-eye-slash me-1"></i>Đã ẩn</span>';

        let actionButtons = `
            <button class="btn btn-sm btn-outline-info rounded-pill px-3 me-2" onclick="openLandmarkModal(${l.id})" title="Chỉnh sửa">
                <i class="fa-solid fa-pen"></i>
            </button>
        `;

        if (!l.isDeleted) {
            actionButtons += `
                <button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="deleteLandmark(${l.id})" title="Ẩn điểm đến">
                    <i class="fa-solid fa-eye-slash"></i>
                </button>
            `;
        } else {
            actionButtons += `
                <button class="btn btn-sm btn-outline-success rounded-pill px-3" onclick="restoreLandmark(${l.id})" title="Khôi phục điểm đến">
                    <i class="fa-solid fa-rotate-left"></i>
                </button>
            `;
        }

        let row = `
            <tr>
                <td class="fw-bold text-white-50">#${l.id}</td>
                <td class="fw-bold text-white fs-6">${l.name || '--'}</td>
                <td>${catBadge}</td>
                <td>
                    <div class="text-white small mb-1"><i class="fa-solid fa-map-pin text-danger me-1"></i>${l.address || '--'}</div>
                    <div class="text-white-50 font-monospace small" style="font-size: 0.8rem;"><i class="fa-solid fa-compass text-info me-1"></i>${l.lat !== null ? l.lat : '--'}, ${l.lng !== null ? l.lng : '--'}</div>
                </td>
                <td>${statusBadge}</td>
                <td class="text-center">${actionButtons}</td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

/**
 * Mở Modal Thêm/Sửa Landmark
 */
function openLandmarkModal(id = null) {
    currentLandmarkId = id;

    if (!landmarkModalInstance) {
        landmarkModalInstance = new bootstrap.Modal(document.getElementById('landmarkModal'));
    }

    const form = document.getElementById('landmarkForm');
    if (form) form.reset();

    const titleEl = document.getElementById('landmarkModalTitle');

    if (id) {
        if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-pen text-warning me-2"></i>Cập nhật Điểm Đến';
        const l = currentLandmarks.find(item => item.id === id);
        if (l) {
            document.getElementById('lName').value = l.name || '';
            document.getElementById('lCategory').value = l.category || 'OTHER';
            document.getElementById('lAddress').value = l.address || '';
            document.getElementById('lLat').value = l.lat !== null && l.lat !== undefined ? l.lat : '';
            document.getElementById('lLng').value = l.lng !== null && l.lng !== undefined ? l.lng : '';
        }
    } else {
        if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-map-location-dot text-success me-2"></i>Tạo Điểm Đến Mới';
    }

    landmarkModalInstance.show();
}

/**
 * Lưu Landmark (Thêm mới hoặc Cập nhật)
 */
async function saveLandmark() {
    const form = document.getElementById('landmarkForm');
    if (!form || !form.checkValidity()) {
        if (form) form.reportValidity();
        return;
    }

    const payload = {
        name: document.getElementById('lName').value.trim(),
        category: document.getElementById('lCategory').value,
        address: document.getElementById('lAddress').value.trim(),
        lat: parseFloat(document.getElementById('lLat').value),
        lng: parseFloat(document.getElementById('lLng').value)
    };

    if (isNaN(payload.lat) || isNaN(payload.lng)) {
        showGlassAlert("Vui lòng nhập tọa độ Vĩ độ và Kinh độ hợp lệ!", "error");
        return;
    }

    try {
        if (currentLandmarkId) {
            await API.put(`${LANDMARK_API_URL}/${currentLandmarkId}`, payload);
            showGlassAlert("Cập nhật Điểm Đến thành công!", "success");
        } else {
            await API.post(LANDMARK_API_URL, payload);
            showGlassAlert("Thêm Điểm Đến mới thành công!", "success");
        }

        if (landmarkModalInstance) landmarkModalInstance.hide();
        fetchLandmarks();
    } catch (err) {
        console.error("Lỗi khi lưu Điểm Đến:", err);
        showGlassAlert("Có lỗi xảy ra khi lưu Điểm Đến: " + (err.message || 'Lỗi hệ thống'), "error");
    }
}

/**
 * Ẩn (Soft Delete) Landmark
 */
function deleteLandmark(id) {
    showGlassConfirm(
        "Bạn có chắc chắn muốn ẩn địa điểm này? Khách hàng sẽ không nhìn thấy trên ứng dụng khi đặt xe nữa.",
        async () => {
            try {
                await API.delete(`${LANDMARK_API_URL}/${id}`);
                showGlassAlert("Đã ẩn Điểm Đến thành công!", "success");
                fetchLandmarks();
            } catch (err) {
                console.error("Lỗi ẩn địa điểm:", err);
                showGlassAlert("Lỗi! Không thể thực thi yêu cầu ẩn Điểm Đến.", "error");
            }
        },
        { title: "Ẩn Điểm Đến", confirmText: "Ẩn ngay", type: "danger" }
    );
}

/**
 * Khôi phục Landmark đã ẩn
 */
function restoreLandmark(id) {
    showGlassConfirm(
        "Khôi phục địa điểm này về trạng thái hoạt động để khách hàng có thể chọn lại khi đặt xe?",
        async () => {
            try {
                await API.put(`${LANDMARK_API_URL}/${id}/restore`, {});
                showGlassAlert("Khôi phục Điểm Đến thành công!", "success");
                fetchLandmarks();
            } catch (err) {
                console.error("Lỗi khôi phục địa điểm:", err);
                showGlassAlert("Lỗi! Không thể khôi phục Điểm Đến.", "error");
            }
        },
        { title: "Khôi Phục Điểm Đến", confirmText: "Khôi phục", type: "success" }
    );
}

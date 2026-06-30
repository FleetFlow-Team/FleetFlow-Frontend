document.addEventListener('DOMContentLoaded', () => {
    const addVehicleForm = document.getElementById('addVehicleForm');

    if (addVehicleForm) {
        addVehicleForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // Lấy giá trị từ các trường
            const licensePlate = document.getElementById('vLicensePlate').value.trim();
            const brand = document.getElementById('vBrand').value.trim();
            const model = document.getElementById('vModel').value.trim();
            const seatCount = parseInt(document.getElementById('vSeatCount').value, 10);
            const chassisNumber = document.getElementById('vChassis').value.trim();
            const engineNumber = document.getElementById('vEngine').value.trim();
            const accumulatedKm = parseInt(document.getElementById('vOdo').value, 10) || 0;
            const description = document.getElementById('vDesc').value.trim();

            if (!licensePlate || !brand || !seatCount || !chassisNumber || !engineNumber) {
                showSystemToast("Vui lòng điền các trường bắt buộc (*).", "error");
                return;
            }

            const payload = {
                licensePlate,
                brand,
                model,
                seatCount,
                chassisNumber,
                engineNumber,
                accumulatedKm,
                description,
                status: 'AVAILABLE'
            };

            const btnSubmit = addVehicleForm.querySelector('button[type="submit"]');
            const originalBtnText = btnSubmit.innerHTML;
            btnSubmit.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin me-2"></i> Đang đăng ký...`;
            btnSubmit.disabled = true;

            try {
                // Gọi API backend (cần đảm bảo đã có API hoặc dùng mock)
                // Thay API_BASE_URL hoặc đường dẫn tương ứng với Backend của bạn
                const response = await fetch('http://localhost:8080/FleetFlow/api/v1/admin/vehicles', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('accessToken')}`
                    },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    showSystemToast("Đăng ký phương tiện mới thành công!", "success");
                    addVehicleForm.reset();
                    // Bạn có thể reload lại bảng fleet ở tab Quản lý Bảo dưỡng ở đây nếu cần
                } else {
                    showSystemToast(result.message || result.error || "Có lỗi xảy ra khi tạo xe", "error");
                }
            } catch (err) {
                console.error("Vehicle creation error:", err);
                showSystemToast("Mất kết nối tới máy chủ khi tạo xe", "error");
            } finally {
                btnSubmit.innerHTML = originalBtnText;
                btnSubmit.disabled = false;
            }
        });
    }
});

// ==========================================
// TÍNH NĂNG QUẢN LÝ TAGS PHƯƠNG TIỆN
// ==========================================

let vtCurrentVehicleId = null; // Lưu ID của xe đang được mở Modal cấu hình Tag
let vtCurrentTags = []; // Mảng chứa các tags hiện hành của xe

/**
 * Lấy danh sách toàn bộ xe từ API Admin và hiển thị lên bảng quản lý Tags.
 * Bao gồm cả nút "Cấu hình" mở Modal quản lý.
 */
async function loadVehicleTagsList() {
    const tbody = document.getElementById('vehicleTagsListBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-white-50 py-4"><i class="fa-solid fa-circle-notch fa-spin text-warning me-2"></i>Đang tải dữ liệu...</td></tr>`;

    try {
        const response = await fetch('http://localhost:8080/FleetFlow/api/v1/admin/vehicles', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('accessToken')}`
            }
        });
        const result = await response.json();

        if (response.ok && result.success) {
            tbody.innerHTML = '';
            const vehicles = result.data || [];

            if (vehicles.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center text-white-50">Không có phương tiện nào</td></tr>`;
                return;
            }

            vehicles.forEach(v => {
                // Đếm số lượng tag (API cũ trả về string gộp các tag phân cách bởi phẩy, ta có thể tạm đếm dựa trên số dấu phẩy)
                let tagCount = 0;
                if (v.tags) {
                    tagCount = v.tags.split(',').length;
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>#${v.vehicleId}</td>
                    <td class="fw-bold text-white">${v.licensePlate}</td>
                    <td>${v.brand} ${v.model}</td>
                    <td><span class="badge bg-warning text-dark rounded-pill px-3">${tagCount} Tags</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-warning rounded-pill px-3 shadow-sm hover-scale" onclick="vtOpenTagsModal(${v.vehicleId}, '${v.licensePlate}')">
                            <i class="fa-solid fa-tags me-1"></i> Cấu hình
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Lỗi tải dữ liệu</td></tr>`;
        }
    } catch (err) {
        console.error("Lỗi tải danh sách xe:", err);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Không thể kết nối máy chủ</td></tr>`;
    }
}

/**
 * Mở Modal cấu hình Tags và gọi API lấy danh sách Tags chi tiết của một xe.
 * @param {number} vehicleId - ID của phương tiện
 * @param {string} licensePlate - Biển số xe để hiển thị tiêu đề
 */
async function vtOpenTagsModal(vehicleId, licensePlate) {
    vtCurrentVehicleId = vehicleId;
    vtCurrentTags = []; // Reset mảng

    document.getElementById('vtModalLicensePlate').textContent = licensePlate;
    const container = document.getElementById('vtModalTagsContainer');
    container.innerHTML = `<span class="text-white-50"><i class="fa-solid fa-circle-notch fa-spin me-2"></i>Đang tải...</span>`;

    // Mở Modal (áp dụng hiệu ứng fade mặc định của bootstrap.Modal)
    const modal = new bootstrap.Modal(document.getElementById('vehicleTagsModal'));
    modal.show();

    try {
        const response = await fetch(`http://localhost:8080/FleetFlow/api/v1/admin/vehicles/${vehicleId}/tags`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('accessToken')}`
            }
        });
        const result = await response.json();

        if (response.ok && result.success) {
            vtCurrentTags = result.data || [];
            renderVtTags();
        } else {
            container.innerHTML = `<span class="text-danger">Lỗi: ${result.error || 'Không tải được Tags'}</span>`;
        }
    } catch (err) {
        console.error("Lỗi lấy tags chi tiết:", err);
        container.innerHTML = `<span class="text-danger">Lỗi kết nối API</span>`;
    }
}

/**
 * Render mảng vtCurrentTags thành các Badges lên Modal.
 * Mỗi Badge có nút (X) để xóa Tag đó khỏi mảng.
 */
function renderVtTags() {
    const container = document.getElementById('vtModalTagsContainer');
    container.innerHTML = '';

    if (vtCurrentTags.length === 0) {
        container.innerHTML = `<span class="text-white-50 small fst-italic">Chưa có tag nào</span>`;
        return;
    }

    vtCurrentTags.forEach((tagItem, index) => {
        // TagItem có thể là object { tagName, description }
        const name = tagItem.tagName || '';
        const desc = tagItem.description ? ` - ${tagItem.description}` : '';

        const badge = document.createElement('div');
        // Animation trượt mượt nhẹ (nếu có base css sẵn) và giao diện glass
        badge.className = 'badge bg-white bg-opacity-10 border border-secondary text-white p-2 d-flex align-items-center gap-2 shadow-sm animate__animated animate__fadeIn';
        badge.innerHTML = `
            <span style="color: #00b14f;"><i class="fa-solid fa-tag me-1"></i> ${name} <small class="text-white-50 fw-normal">${desc}</small></span>
            <button class="btn-close btn-close-white" style="font-size: 0.6rem;" onclick="vtRemoveTag(${index})" title="Xóa"></button>
        `;
        container.appendChild(badge);
    });
}

/**
 * Lấy dữ liệu từ input form và thêm một Tag mới vào mảng vtCurrentTags.
 * Sau đó render lại danh sách.
 */
function vtAddTag() {
    const nameInput = document.getElementById('vtNewTagName');
    const descInput = document.getElementById('vtNewTagDesc');

    const tagName = nameInput.value.trim();
    const description = descInput.value.trim();

    if (!tagName) {
        if (typeof showSystemToast === 'function') {
            showSystemToast("Vui lòng nhập Tên Tag!", "error");
        } else {
            alert("Vui lòng nhập Tên Tag!");
        }
        return;
    }

    // Push object vào mảng
    vtCurrentTags.push({ tagName: tagName, description: description });

    // Reset inputs
    nameInput.value = '';
    descInput.value = '';

    // Render lại giao diện tags
    renderVtTags();
}

/**
 * Xóa một Tag khỏi mảng dựa vào index.
 * @param {number} index - Vị trí của Tag trong mảng vtCurrentTags
 */
function vtRemoveTag(index) {
    vtCurrentTags.splice(index, 1);
    renderVtTags();
}

/**
 * Gọi API PUT để lưu mảng vtCurrentTags hiện hành của chiếc xe lên Backend.
 * Khi thành công, đóng Modal và làm mới danh sách xe.
 */
async function vtSaveTags() {
    if (!vtCurrentVehicleId) return;

    try {
        const payload = {
            tags: vtCurrentTags
        };

        const response = await fetch(`http://localhost:8080/FleetFlow/api/v1/admin/vehicles/${vtCurrentVehicleId}/tags`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            if (typeof showSystemToast === 'function') {
                showSystemToast("Đã lưu cấu hình Tags thành công!", "success");
            }

            // Đóng modal với hiệu ứng Bootstrap mặc định
            const modalEl = document.getElementById('vehicleTagsModal');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) {
                modalInstance.hide();
            }

            // Làm mới list xe
            loadVehicleTagsList();
        } else {
            if (typeof showSystemToast === 'function') {
                showSystemToast(result.error || "Có lỗi khi lưu Tags", "error");
            } else {
                alert(result.error || "Có lỗi khi lưu Tags");
            }
        }
    } catch (err) {
        console.error("Lỗi gọi API lưu tags:", err);
        if (typeof showSystemToast === 'function') {
            showSystemToast("Mất kết nối API", "error");
        }
    }
}

// Bắt sự kiện chuyển tab để gọi loadVehicleTagsList lần đầu
document.addEventListener('DOMContentLoaded', () => {
    const vtTabLink = document.querySelector('a[href="#tab-vehicle-tags"]');
    if (vtTabLink) {
        vtTabLink.addEventListener('click', () => {
            loadVehicleTagsList();
        });
    }
});

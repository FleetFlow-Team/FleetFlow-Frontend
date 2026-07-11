/**
 * FleetFlow - RBAC & Account Management Controller (rbacManager.js)
 * Chuyên trách quản lý danh sách, Khóa (Lock) và Mở khóa (Unlock) tài khoản Điều phối viên & Tài xế
 * Độc lập hoàn toàn với admin.js
 */

let currentRbacTab = 'dispatcher';

function getAdminToken() {
    return localStorage.getItem('accessToken') ||
           localStorage.getItem('adminToken') ||
           localStorage.getItem('jwt_token') ||
           sessionStorage.getItem('jwt_token') ||
           localStorage.getItem('token');
}

/**
 * Khởi tạo khi DOM sẵn sàng hoặc khi chuyển sang Tab RBAC
 */
document.addEventListener('DOMContentLoaded', () => {
    const rbacLink = document.querySelector('a[href="#tab-users"]');
    if (rbacLink) {
        rbacLink.addEventListener('click', () => {
            setTimeout(() => {
                switchRbacSubTab(currentRbacTab);
            }, 100);
        });
    }
});

/**
 * Chuyển đổi giữa Sub-Tab Điều phối viên và Tài xế
 * @param {string} type - 'dispatcher' | 'driver'
 */
window.switchRbacSubTab = function (type) {
    currentRbacTab = type;

    const btnDispatcher = document.getElementById('subtab-dispatcher-btn');
    const btnDriver = document.getElementById('subtab-driver-btn');

    if (btnDispatcher && btnDriver) {
        if (type === 'dispatcher') {
            btnDispatcher.className = 'btn btn-sm btn-primary fw-bold px-4 py-2 shadow-sm rounded-pill';
            btnDriver.className = 'btn btn-sm btn-outline-light fw-bold px-4 py-2 rounded-pill';
        } else {
            btnDriver.className = 'btn btn-sm btn-primary fw-bold px-4 py-2 shadow-sm rounded-pill';
            btnDispatcher.className = 'btn btn-sm btn-outline-light fw-bold px-4 py-2 rounded-pill';
        }
    }

    if (type === 'dispatcher') {
        loadRbacDispatchers();
    } else {
        loadRbacDrivers();
    }
};

/**
 * Tải danh sách toàn bộ Điều phối viên từ API Backend
 */
window.loadRbacDispatchers = async function () {
    const tbody = document.getElementById('rbacUserTableBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center text-white-50 py-4">
                <i class="fa-solid fa-circle-notch fa-spin text-info me-2"></i>Đang đồng bộ danh sách Điều phối viên...
            </td>
        </tr>
    `;

    try {
        const token = getAdminToken();
        const response = await fetch('http://localhost:8080/FleetFlow/api/v1/admin/dispatchers', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const json = await response.json();
        if (!json.success || !json.data) {
            throw new Error(json.error || 'Không tải được danh sách Điều phối viên');
        }

        renderRbacUsers(json.data, 'dispatcher');
    } catch (err) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger py-4">
                    <i class="fa-solid fa-triangle-exclamation me-2"></i>Lỗi tải dữ liệu: ${err.message}
                </td>
            </tr>
        `;
    }
};

/**
 * Tải danh sách toàn bộ Tài xế từ API Backend
 */
window.loadRbacDrivers = async function () {
    const tbody = document.getElementById('rbacUserTableBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center text-white-50 py-4">
                <i class="fa-solid fa-circle-notch fa-spin text-info me-2"></i>Đang đồng bộ danh sách Tài xế...
            </td>
        </tr>
    `;

    try {
        const token = getAdminToken();
        const response = await fetch('http://localhost:8080/FleetFlow/api/v1/admin/drivers/all', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const json = await response.json();
        if (!json.success || !json.data) {
            throw new Error(json.error || 'Không tải được danh sách Tài xế');
        }

        renderRbacUsers(json.data, 'driver');
    } catch (err) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger py-4">
                    <i class="fa-solid fa-triangle-exclamation me-2"></i>Lỗi tải dữ liệu: ${err.message}
                </td>
            </tr>
        `;
    }
};

/**
 * Hiển thị dữ liệu người dùng lên bảng Liquid Glass
 * @param {Array} list - Danh sách tài khoản
 * @param {string} type - 'dispatcher' | 'driver'
 */
function renderRbacUsers(list, type) {
    const tbody = document.getElementById('rbacUserTableBody');
    if (!tbody) return;

    if (!Array.isArray(list) || list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-white-50 py-4">
                    <i class="fa-solid fa-inbox me-2"></i>Không có tài khoản nào được hiển thị.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = list.map(item => {
        const accountId = item.accountId || item.id || item.AccountID;
        const name = item.fullName || item.name || 'Chưa cập nhật';
        const contact = item.email || item.phoneNumber || item.phone || 'N/A';
        const roleName = type === 'dispatcher' ? 'Điều phối viên' : 'Tài xế';
        
        // Kiểm tra trạng thái bị khóa
        const statusStr = (item.status || item.accountStatus || item.ApprovalStatus || '').toUpperCase();
        const isLocked = statusStr === 'LOCKED';

        const badgeHtml = isLocked
            ? `<span class="badge bg-danger bg-opacity-25 text-danger border border-danger px-3 py-2 rounded-pill"><i class="fa-solid fa-lock me-1"></i> LOCKED</span>`
            : `<span class="badge bg-success bg-opacity-25 text-success border border-success px-3 py-2 rounded-pill"><i class="fa-solid fa-circle-check me-1"></i> ACTIVE</span>`;

        const actionBtnHtml = isLocked
            ? `<button type="button" class="btn btn-sm btn-success fw-bold px-3 rounded-pill shadow-sm" onclick="handleLockUnlockAccount('${type}', ${accountId}, 'unlock', '${encodeURIComponent(name)}')">
                   <i class="fa-solid fa-lock-open me-1"></i> Mở khóa
               </button>`
            : `<button type="button" class="btn btn-sm btn-danger fw-bold px-3 rounded-pill shadow-sm" onclick="handleLockUnlockAccount('${type}', ${accountId}, 'lock', '${encodeURIComponent(name)}')">
                   <i class="fa-solid fa-lock me-1"></i> Khóa tài khoản
               </button>`;

        return `
            <tr>
                <td class="fw-bold text-white-50">#${accountId}</td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff" class="rounded-circle border border-1 border-white" width="35" height="35" alt="avatar">
                        <div>
                            <div class="fw-bold text-white">${name}</div>
                            <div class="small text-white-50" style="font-size: 0.75rem;">ID: #${accountId}</div>
                        </div>
                    </div>
                </td>
                <td class="text-white-50">${contact}</td>
                <td><span class="badge bg-info bg-opacity-10 text-info border border-info px-2 py-1">${roleName}</span></td>
                <td>${badgeHtml}</td>
                <td class="text-center">${actionBtnHtml}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Xử lý sự kiện Khóa / Mở khóa tài khoản
 * @param {string} type - 'dispatcher' | 'driver'
 * @param {number} accountId - ID tài khoản
 * @param {string} action - 'lock' | 'unlock'
 * @param {string} encodedName - Tên người dùng đã mã hóa URI
 */
window.handleLockUnlockAccount = function (type, accountId, action, encodedName) {
    const name = decodeURIComponent(encodedName);
    const actionText = action === 'lock' ? 'KHÓA' : 'MỞ KHÓA';
    const endpointType = type === 'dispatcher' ? 'dispatchers' : 'drivers';
    const url = `http://localhost:8080/FleetFlow/api/v1/admin/${endpointType}/${accountId}/${action}`;

    const confirmMsg = action === 'lock'
        ? `Bạn có chắc chắn muốn KHÓA tài khoản của "${name}" (#${accountId})?\nNgười này sẽ lập tức mất quyền truy cập và nhận chuyến.`
        : `Bạn có muốn MỞ KHÓA cho tài khoản "${name}" (#${accountId})?`;

    window.showGlassConfirm(confirmMsg, async () => {
        try {
            const token = getAdminToken();
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            const json = await response.json();
            if (!json.success) {
                throw new Error(json.error || `Thao tác ${actionText.toLowerCase()} thất bại`);
            }

            window.showGlassAlert(json.message || `Đã ${actionText.toLowerCase()} tài khoản "${name}" thành công!`, 'success');

            if (currentRbacTab === 'dispatcher') {
                loadRbacDispatchers();
            } else {
                loadRbacDrivers();
            }
        } catch (err) {
            window.showGlassAlert(err.message, 'error', 'Thao tác không thành công');
        }
    }, {
        title: `Xác nhận ${actionText} Tài Khoản`,
        confirmText: action === 'lock' ? 'Khóa Ngay' : 'Mở Khóa',
        type: action === 'lock' ? 'danger' : 'success'
    });
};

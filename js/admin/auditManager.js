/**
 * auditManager.js - Quản lý chức năng Xem Nhật ký Kiểm toán (Audit Log)
 */

let currentAuditLogs = [];
let currentAuditPage = 1;

document.addEventListener("DOMContentLoaded", () => {
    // Để tối ưu, chúng ta có thể load sẵn trang 1 khi trang admin vừa được tải.
    // Nếu muốn lazy load (chỉ load khi bấm tab), bạn có thể gắn vào sự kiện onClick tab trong admin.js
    loadAuditLogs(1);
});

async function loadAuditLogs(page = 1) {
    const listBody = document.getElementById('auditLogListBody');
    const totalInfo = document.getElementById('auditLogTotalInfo');
    const pagination = document.getElementById('auditLogPagination');

    if (!listBody) return;

    listBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center text-white-50 py-4">
                <i class="fa-solid fa-circle-notch fa-spin text-primary me-2"></i> Đang tải dữ liệu nhật ký...
            </td>
        </tr>
    `;

    try {
        const adminToken = localStorage.getItem('accessToken');
        if (!adminToken) {
            listBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Bạn chưa đăng nhập.</td></tr>`;
            return;
        }

        const pageSize = 10;
        const url = `http://localhost:8080/FleetFlow/api/v1/admin/audit-log?page=${page}&pageSize=${pageSize}`;
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });

        const json = await res.json();

        if (res.ok && json.success) {
            currentAuditLogs = json.data || [];
            currentAuditPage = json.page || 1;

            renderAuditLogs(currentAuditLogs);

            if (totalInfo) totalInfo.innerText = `Tổng cộng: ${json.total || 0} bản ghi`;
            renderAuditPagination(currentAuditPage, Math.ceil((json.total || 0) / pageSize));
        } else {
            listBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${json.error || 'Lỗi tải dữ liệu'}</td></tr>`;
        }
    } catch (e) {
        console.error("Lỗi fetch audit log:", e);
        listBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Lỗi kết nối máy chủ!</td></tr>`;
    }
}

function renderAuditLogs(logs) {
    const listBody = document.getElementById('auditLogListBody');
    if (logs.length === 0) {
        listBody.innerHTML = `<tr><td colspan="6" class="text-center text-white-50 py-4">Không có bản ghi nhật ký nào phù hợp.</td></tr>`;
        return;
    }

    let html = '';
    logs.forEach((log, index) => {
        // Xử lý format thời gian
        let datePart = "--";
        let timePart = "--";
        if (log.createdAt) {
            const parts = log.createdAt.split(' ');
            if (parts.length >= 2) {
                const dateArr = parts[0].split('-');
                if (dateArr.length === 3) datePart = `${dateArr[2]}/${dateArr[1]}/${dateArr[0]}`;
                else datePart = parts[0];
                timePart = parts[1].substring(0, 8);
            } else {
                datePart = log.createdAt;
            }
        }

        const badgeClass = getActionBadgeClass(log.action);
        const viAction = getVietnameseAction(log.action);

        // Cắt gọn entityName và ID nếu quá dài
        const eName = log.entityName || 'Hệ thống';
        const eId = log.entityId ? `#${log.entityId}` : '';

        html += `
            <tr>
                <td>
                    <div class="fw-bold text-white">${datePart}</div>
                    <div class="text-white-50 small">${timePart}</div>
                </td>
                <td>
                    <div class="fw-bold text-primary">ACC-${log.accountId}</div>
                    <div class="text-white-50 small" title="${log.email}">${log.fullName || 'Không rõ'}</div>
                </td>
                <td><span class="${badgeClass}">${viAction}</span></td>
                <td class="text-white">
                    <span class="fw-bold">${eName}</span> <span class="text-white-50 ms-1">${eId}</span>
                </td>
                <td>
                    <div class="text-white-50 small font-monospace">${log.ipAddress || '127.0.0.1'}</div>
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-glass-action" onclick="openAuditDiff(${index})">
                        <i class="fa-solid fa-code-compare me-1"></i> Xem Chi tiết
                    </button>
                </td>
            </tr>
        `;
    });
    listBody.innerHTML = html;
}

function getActionBadgeClass(action) {
    const base = "fw-bold";
    if (!action) return `${base} text-white-50`;
    const act = action.toUpperCase();
    if (act.includes('DRIVER_ACCEPT') || act.includes('START_TRIP') || act.includes('COMPLETE_TRIP')) {
        return `${base} text-success`;
    }
    if (act.includes('AUTO_DISPATCH_FAILED') || act.includes('DRIVER_REJECT')) {
        return `${base} text-danger`;
    }
    if (act.includes('APPROVE_BOOKING') || act.includes('REJECT_BOOKING') || act.includes('BLOCK')) {
        return `${base} text-warning`;
    }
    if (act.includes('AUTO_DISPATCH') || act.includes('DISPATCH_DRIVER') || act.includes('CONFIRM')) {
        return `${base} text-info`;
    }
    return `${base} text-light`;
}

function getVietnameseAction(action) {
    if (!action) return 'KHÔNG RÕ';
    const act = action.toUpperCase();
    if (act.includes('CREATE') || act.includes('ADD') || act.includes('REGISTER')) {
        return 'TẠO MỚI';
    }
    if (act.includes('DELETE') || act.includes('REMOVE')) {
        return 'XÓA';
    }
    if (act.includes('FREEZE') || act.includes('LOCK')) {
        return 'KHÓA';
    }
    if (act.includes('UPDATE') || act.includes('EDIT')) {
        return 'CẬP NHẬT';
    }
    return act;
}

function renderAuditPagination(currentPage, totalPages) {
    const pagination = document.getElementById('auditLogPagination');
    if (!pagination) return;

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';

    // Nút Trước
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link glass-input text-white border-0 bg-transparent" href="javascript:void(0)" onclick="${currentPage === 1 ? '' : `loadAuditLogs(${currentPage - 1})`}">
                    <i class="fa-solid fa-chevron-left"></i>
                </a>
            </li>`;

    // Tính toán số trang hiển thị (tối đa 5 trang gần nhất)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link glass-input ${i === currentPage ? 'bg-primary text-white border-primary fw-bold' : 'text-white border-0 bg-transparent'}" 
                       href="javascript:void(0)" onclick="loadAuditLogs(${i})">${i}</a>
                </li>`;
    }

    // Nút Sau
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link glass-input text-white border-0 bg-transparent" href="javascript:void(0)" onclick="${currentPage === totalPages ? '' : `loadAuditLogs(${currentPage + 1})`}">
                    <i class="fa-solid fa-chevron-right"></i>
                </a>
            </li>`;

    pagination.innerHTML = html;
}

function openAuditDiff(index) {
    if (index < 0 || index >= currentAuditLogs.length) return;
    const log = currentAuditLogs[index];

    // 1. Điền thông tin vào 4 thẻ Ngữ cảnh (Context Cards)
    const elUser = document.getElementById('auditDetailUser');
    const elUserSub = document.getElementById('auditDetailUserSub');
    const elAction = document.getElementById('auditDetailAction');
    const elEntity = document.getElementById('auditDetailEntity');
    const elEntityId = document.getElementById('auditDetailEntityId');
    const elTime = document.getElementById('auditDetailTime');
    const elIp = document.getElementById('auditDetailIp');

    if (elUser) elUser.innerText = log.fullName || 'Quản trị viên / Hệ thống';
    if (elUserSub) elUserSub.innerText = `ID: ACC-${log.accountId || '--'} | ${log.email || 'Không rõ email'}`;
    
    if (elAction) {
        const badgeClass = getActionBadgeClass(log.action);
        const viAction = getVietnameseAction(log.action);
        elAction.innerHTML = `<span class="${badgeClass} fs-6">${viAction}</span> <div class="text-white-50 small mt-1 font-monospace" style="font-size: 0.75rem;">(${log.action || '--'})</div>`;
    }

    if (elEntity) elEntity.innerText = log.entityName || 'Hệ thống chung';
    if (elEntityId) elEntityId.innerText = `ID Bản ghi: ${log.entityId ? '#' + log.entityId : 'N/A'}`;

    if (elTime) elTime.innerText = log.createdAt || '--';
    if (elIp) elIp.innerText = `IP: ${log.ipAddress || '127.0.0.1'}`;

    // 2. Chuyển về chế độ xem Trực quan mặc định
    switchAuditViewMode('visual');

    // 3. Render chế độ Bảng so sánh trực quan (Visual Diff)
    renderVisualDiff(log.oldValue, log.newValue);

    // 4. Render chế độ Mã nguồn (Raw JSON View)
    const oldCode = document.getElementById('auditOldValueCode');
    const newCode = document.getElementById('auditNewValueCode');
    if (oldCode) oldCode.innerHTML = formatJsonOrText(log.oldValue);
    if (newCode) newCode.innerHTML = formatJsonOrText(log.newValue);

    // 5. Hiển thị Modal
    const modalEl = document.getElementById('auditDiffModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

function switchAuditViewMode(mode) {
    const btnVisual = document.getElementById('btnViewVisual');
    const btnRaw = document.getElementById('btnViewRaw');
    const containerVisual = document.getElementById('auditVisualDiffContainer');
    const containerRaw = document.getElementById('auditRawJsonContainer');

    if (!btnVisual || !btnRaw || !containerVisual || !containerRaw) return;

    if (mode === 'visual') {
        btnVisual.className = 'btn btn-sm bg-primary text-white px-3 rounded-pill fw-bold active shadow-sm';
        btnRaw.className = 'btn btn-sm text-white-50 px-3 rounded-pill fw-bold bg-transparent';
        containerVisual.classList.remove('d-none');
        containerRaw.classList.add('d-none');
    } else {
        btnVisual.className = 'btn btn-sm text-white-50 px-3 rounded-pill fw-bold bg-transparent';
        btnRaw.className = 'btn btn-sm bg-primary text-white px-3 rounded-pill fw-bold active shadow-sm';
        containerVisual.classList.add('d-none');
        containerRaw.classList.remove('d-none');
    }
}

function renderVisualDiff(oldStr, newStr) {
    const container = document.getElementById('auditVisualDiffContent');
    if (!container) return;

    let oldObj = null;
    let newObj = null;
    let isBothJson = false;

    try {
        if (oldStr && oldStr.trim() !== 'null' && oldStr.trim() !== '') {
            oldObj = JSON.parse(oldStr);
        }
        if (newStr && newStr.trim() !== 'null' && newStr.trim() !== '') {
            newObj = JSON.parse(newStr);
        }
        if (typeof oldObj === 'object' || typeof newObj === 'object') {
            isBothJson = true;
        }
    } catch (e) {
        isBothJson = false;
    }

    // Nếu không thể parse thành Object JSON (chỉ là chuỗi thường hoặc null thuần)
    if (!isBothJson || (oldObj === null && newObj === null)) {
        const displayOld = (!oldStr || oldStr.trim() === 'null') ? '(Không có dữ liệu / null)' : escapeHtml(oldStr);
        const displayNew = (!newStr || newStr.trim() === 'null') ? '(Không có dữ liệu / null)' : escapeHtml(newStr);
        
        container.innerHTML = `
            <div class="diff-row-card diff-changed">
                <div class="fw-bold text-white mb-2"><i class="fa-solid fa-align-left me-2 text-primary"></i>Thay Đổi Dữ Liệu Văn Bản</div>
                <div class="row g-3">
                    <div class="col-md-6">
                        <div class="text-white-50 small mb-1">Giá trị cũ:</div>
                        <div class="diff-old-box font-monospace">${displayOld}</div>
                    </div>
                    <div class="col-md-6">
                        <div class="text-white-50 small mb-1">Giá trị mới:</div>
                        <div class="diff-new-box font-monospace">${displayNew}</div>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    // Nếu parse thành công JSON Object, so sánh từng Key
    const o = oldObj || {};
    const n = newObj || {};
    const allKeys = Array.from(new Set([...Object.keys(o), ...Object.keys(n)])).sort();

    if (allKeys.length === 0) {
        container.innerHTML = `<div class="text-center text-white-50 py-4"><i class="fa-solid fa-circle-info me-2"></i>Không có thuộc tính nào để so sánh.</div>`;
        return;
    }

    let html = '';
    let changedCount = 0;

    allKeys.forEach(key => {
        const oldVal = o[key];
        const newVal = n[key];
        const isOldExists = Object.prototype.hasOwnProperty.call(o, key);
        const isNewExists = Object.prototype.hasOwnProperty.call(n, key);

        const strOld = formatValueDisplay(oldVal);
        const strNew = formatValueDisplay(newVal);

        // Trường hợp 1: Thêm mới trường dữ liệu
        if (!isOldExists && isNewExists) {
            changedCount++;
            html += `
                <div class="diff-row-card diff-added">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="fw-bold text-success font-monospace fs-6"><i class="fa-solid fa-plus-circle me-2"></i>${key}</span>
                        <span class="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50">Thêm Mới</span>
                    </div>
                    <div class="diff-new-box font-monospace">${strNew}</div>
                </div>
            `;
        }
        // Trường hợp 2: Xóa trường dữ liệu
        else if (isOldExists && !isNewExists) {
            changedCount++;
            html += `
                <div class="diff-row-card diff-deleted">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="fw-bold text-danger font-monospace fs-6"><i class="fa-solid fa-minus-circle me-2"></i>${key}</span>
                        <span class="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50">Đã Xóa</span>
                    </div>
                    <div class="diff-old-box font-monospace">${strOld}</div>
                </div>
            `;
        }
        // Trường hợp 3: Thay đổi giá trị
        else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changedCount++;
            html += `
                <div class="diff-row-card diff-changed">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="fw-bold text-warning font-monospace fs-6"><i class="fa-solid fa-pen-to-square me-2"></i>${key}</span>
                        <span class="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50">Đã Thay Đổi</span>
                    </div>
                    <div class="row g-2 align-items-center">
                        <div class="col-md-5">
                            <div class="diff-old-box font-monospace">${strOld}</div>
                        </div>
                        <div class="col-md-2 text-center text-white-50">
                            <i class="fa-solid fa-arrow-right d-none d-md-inline"></i>
                            <i class="fa-solid fa-arrow-down d-inline d-md-none"></i>
                        </div>
                        <div class="col-md-5">
                            <div class="diff-new-box font-monospace">${strNew}</div>
                        </div>
                    </div>
                </div>
            `;
        }
        // Trường hợp 4: Không thay đổi
        else {
            html += `
                <div class="diff-row-card opacity-50">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="fw-bold text-white-50 font-monospace">${key}</span>
                        <span class="badge bg-secondary bg-opacity-25 text-white-50 border border-secondary border-opacity-50">Giữ Nguyên</span>
                    </div>
                    <div class="diff-same-box font-monospace mt-2">${strOld}</div>
                </div>
            `;
        }
    });

    if (changedCount === 0) {
        html = `<div class="alert alert-info bg-info bg-opacity-10 border border-info text-info rounded-4 py-3"><i class="fa-solid fa-check-circle me-2"></i>Tất cả các trường dữ liệu đều giống nhau hoàn toàn giữa Giá trị cũ và Giá trị mới.</div>` + html;
    }

    container.innerHTML = html;
}

function formatValueDisplay(val) {
    if (val === null || val === undefined) return '<i class="opacity-50">null / trống</i>';
    if (typeof val === 'object') return escapeHtml(JSON.stringify(val));
    if (typeof val === 'boolean') return val ? 'true (đúng)' : 'false (sai)';
    return escapeHtml(String(val));
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatJsonOrText(str) {
    if (!str || str.trim() === 'null' || str.trim() === '') {
        return '<i class="text-white-50 opacity-50">(Không có dữ liệu / null)</i>';
    }
    try {
        const obj = JSON.parse(str);
        return JSON.stringify(obj, null, 2).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    } catch (e) {
        return escapeHtml(str);
    }
}

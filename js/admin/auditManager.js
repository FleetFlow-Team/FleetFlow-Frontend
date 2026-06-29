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
    const base = "badge p-2 px-3 fw-bold shadow-sm border";
    if (!action) return `${base} bg-secondary bg-opacity-25 text-secondary border-secondary`;
    const act = action.toUpperCase();
    if (act.includes('CREATE') || act.includes('ADD') || act.includes('REGISTER')) {
        return `${base} bg-success bg-opacity-25 text-success border-success`;
    }
    if (act.includes('DELETE') || act.includes('REMOVE') || act.includes('FREEZE') || act.includes('LOCK')) {
        return `${base} bg-danger bg-opacity-25 text-danger border-danger`;
    }
    if (act.includes('UPDATE') || act.includes('EDIT')) {
        return `${base} bg-warning bg-opacity-25 text-warning border-warning`;
    }
    return `${base} bg-info bg-opacity-25 text-info border-info`;
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

    const oldCode = document.getElementById('auditOldValueCode');
    const newCode = document.getElementById('auditNewValueCode');

    oldCode.innerHTML = formatJsonOrText(log.oldValue);
    newCode.innerHTML = formatJsonOrText(log.newValue);

    const modal = new bootstrap.Modal(document.getElementById('auditDiffModal'));
    modal.show();
}

function formatJsonOrText(str) {
    if (!str || str.trim() === 'null' || str.trim() === '') {
        return '<i class="text-white-50 opacity-50">(Không có dữ liệu / null)</i>';
    }
    try {
        const obj = JSON.parse(str);
        // Trả về JSON string được format đẹp
        return JSON.stringify(obj, null, 2).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    } catch (e) {
        // Không phải JSON, escape HTML và in text
        return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
}

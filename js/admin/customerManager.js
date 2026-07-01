/**
 * Quản lý Khách hàng và Thanh toán cho Master Admin
 */

const CUSTOMER_API_URL = 'http://localhost:8080/FleetFlow/api/v1/admin/customers';

// Biến mock data (Trong tương lai khi Backend có API GET /customers, ta sẽ xóa biến này và dùng data từ API)
let mockCustomers = [
    {
        CustomerID: 1,
        FullName: "Nguyễn Văn A",
        Phone: "0901234567",
        CurrentDebt: 0,
        Status: "ACTIVE"
    },
    {
        CustomerID: 2,
        FullName: "Trần Thị B",
        Phone: "0987654321",
        CurrentDebt: -1500000,
        Status: "LOCKED" // Giả định KH này đang bị khóa do nợ quá giới hạn (-1tr)
    },
    {
        CustomerID: 3,
        FullName: "Lê Hoàng C",
        Phone: "0912345678",
        CurrentDebt: -500000,
        Status: "ACTIVE" // Nợ chưa tới 1tr nên vẫn Active
    }
];

// Khởi chạy khi tải trang
document.addEventListener("DOMContentLoaded", () => {
    // Khởi tạo render lần đầu nếu người dùng click vào tab customers
    // Tạm thời ta luôn fetch data lần đầu để có sẵn
    fetchAndRenderCustomers();
});

/**
 * Tải danh sách Khách hàng từ Backend và render ra bảng
 */
async function fetchAndRenderCustomers() {
    const tbody = document.getElementById('customerListBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5"><i class="fa-solid fa-circle-notch fa-spin fs-3 text-info mb-2"></i><div class="text-white-50">Đang đồng bộ dữ liệu...</div></td></tr>`;

    try {
        // Gọi API thật
        const token = localStorage.getItem('accessToken');
        const response = await fetch(CUSTOMER_API_URL, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (response.ok) {
            // BE trả về trực tiếp mảng JSON
            const customers = Array.isArray(result) ? result : [];
            renderCustomers(customers);
        } else {
            console.error("Lỗi từ server:", result);
            throw new Error(result.error || "Không thể tải danh sách khách hàng");
        }

    } catch (error) {
        console.error("Lỗi khi tải danh sách khách hàng:", error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger fw-bold"><i class="fa-solid fa-triangle-exclamation fs-3 mb-2 d-block"></i>Lỗi kết nối máy chủ.</td></tr>`;
    }
}

/**
 * Render dữ liệu khách hàng ra HTML
 */
function renderCustomers(customers) {
    const tbody = document.getElementById('customerListBody');
    tbody.innerHTML = '';

    if (!customers || customers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-white-50 py-5"><i class="fa-solid fa-users fs-1 mb-3 d-block text-secondary"></i><div class="fs-5">Chưa có khách hàng nào.</div></td></tr>`;
        return;
    }

    const fmt = new Intl.NumberFormat('vi-VN');

    customers.forEach(c => {
        // Lấy dữ liệu từ BE (key đã thay đổi theo api mới: customerId, email, status, debt)
        let debtVal = c.debt || 0;
        let isDebtExceeded = debtVal <= -1000000;
        let debtHtml = debtVal < 0
            ? `<span class="fw-bold ${isDebtExceeded ? 'text-danger' : 'text-warning'}">${fmt.format(Math.abs(debtVal))} ₫</span>`
            : `<span class="fw-bold text-success">0 ₫</span>`;

        // Hiển thị trạng thái
        let statusBadge = c.status === 'ACTIVE'
            ? '<span class="badge bg-success bg-opacity-25 text-success border border-success"><i class="fa-solid fa-check-circle me-1"></i> Đang hoạt động</span>'
            : '<span class="badge bg-danger bg-opacity-25 text-danger border border-danger"><i class="fa-solid fa-lock me-1"></i> Ngừng hoạt động</span>';

        // Tên hiển thị từ Backend (fullName)
        let displayName = c.fullName || '--';

        // Nút hành động (dùng fullName để hiển thị trong câu hỏi xác nhận)
        let actionBtn = '';
        if (c.status === 'ACTIVE') {
            actionBtn = `<button class="btn btn-sm btn-outline-danger rounded-pill px-3 py-1 fw-bold shadow-sm" onclick="lockCustomerAccount(${c.customerId}, '${displayName}')" title="Khóa tài khoản">
                            <i class="fa-solid fa-lock me-1"></i> Khóa
                         </button>`;
        } else {
            actionBtn = `<button class="btn btn-sm btn-outline-success rounded-pill px-3 py-1 fw-bold shadow-sm" onclick="unlockCustomerAccount(${c.customerId}, '${displayName}')" title="Mở khóa tài khoản">
                            <i class="fa-solid fa-unlock me-1"></i> Mở khóa
                         </button>`;
        }

        let row = `
            <tr>
                <td class="text-info fw-bold">#${c.customerId}</td>
                <td class="text-white fw-bold">${displayName}</td>
                <td class="text-white-50">
                    <div><i class="fa-solid fa-envelope me-1"></i>${c.email || '--'}</div>
                    <div class="small mt-1"><i class="fa-solid fa-phone me-1"></i>${c.phoneNumber || '--'}</div>
                </td>
                <td>${debtHtml}</td>
                <td>${statusBadge}</td>
                <td>${actionBtn}</td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

/**
 * Khóa tài khoản khách hàng
 */
async function lockCustomerAccount(id, name) {
    if (!confirm(`Bạn có chắc chắn muốn khóa tài khoản của khách hàng "${name}" không?\nHành động này sẽ ngăn khách hàng tạo đặt xe mới.`)) {
        return;
    }

    const token = localStorage.getItem('accessToken');
    try {
        const response = await fetch(`${CUSTOMER_API_URL}/${id}/lock`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (response.ok && result.success) {
            showSystemToast(`Đã khóa thành công tài khoản "${name}"`, "success");
            fetchAndRenderCustomers(); // Reload lại bảng từ API
        } else {
            showSystemToast(result.error || result.message || "Lỗi khi khóa tài khoản", "error");
        }
    } catch (err) {
        showSystemToast("Mất kết nối API máy chủ.", "error");
    }
}

/**
 * Mở khóa tài khoản khách hàng
 */
async function unlockCustomerAccount(id, name) {
    if (!confirm(`Xác nhận mở khóa tài khoản của "${name}"?\nKhách hàng sẽ có thể đặt xe trở lại.`)) {
        return;
    }

    const token = localStorage.getItem('accessToken');
    try {
        const response = await fetch(`${CUSTOMER_API_URL}/${id}/unlock`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (response.ok && result.success) {
            showSystemToast(`Đã mở khóa thành công tài khoản "${name}"`, "success");
            fetchAndRenderCustomers(); // Reload lại bảng từ API
        } else {
            // Lỗi xảy ra (VD: Khách còn nợ quá giới hạn) => Show lỗi trả về từ Backend
            showSystemToast(result.error || result.message || "Không thể mở khóa tài khoản", "error");
        }
    } catch (err) {
        showSystemToast("Mất kết nối API máy chủ.", "error");
    }
}

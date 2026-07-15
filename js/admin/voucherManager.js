/**
 * Quản lý Voucher cho Master Admin
 * Cung cấp chức năng liệt kê, thêm mới, sửa, vô hiệu hoá Voucher
 */

const VOUCHER_API_URL = '/admin/vouchers';
let currentVoucherId = null;
let voucherModalInstance = null;

// Tải danh sách khi tab Pricing được mở hoặc load trang
document.addEventListener("DOMContentLoaded", () => {
    fetchVouchers();
});

/**
 * Lấy danh sách Voucher từ API và render bảng
 */
async function fetchVouchers() {
    const status = document.getElementById('voucherStatusFilter').value;
    const url = status ? `${VOUCHER_API_URL}?status=${status}` : VOUCHER_API_URL;

    try {
        const result = await API.get(url);
        const tbody = document.getElementById('voucherListBody');
        tbody.innerHTML = '';

        if (result && result.success && result.data && result.data.length > 0) {
            result.data.forEach(v => {
                let statusBadge = v.Status === 'ACTIVE'
                    ? '<span class="badge bg-success bg-opacity-25 text-success border border-success">ACTIVE</span>'
                    : '<span class="badge bg-secondary bg-opacity-25 text-secondary border border-secondary">INACTIVE</span>';

                let discountText = v.DiscountType === 'PERCENT'
                    ? `${v.DiscountValue}%`
                    : `${v.DiscountValue ? v.DiscountValue.toLocaleString() : 0} đ`;

                let row = `
                    <tr>
                        <td class="fw-bold text-white">${v.Code || '--'}</td>
                        <td class="text-info fw-bold">${discountText}</td>
                        <td>${v.MaxDiscountAmount ? v.MaxDiscountAmount.toLocaleString() + ' đ' : '∞'}</td>
                        <td class="small text-white-50">${v.ValidTo ? v.ValidTo.replace('T', ' ') : 'Vô thời hạn'}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-light rounded-pill px-2 me-1" onclick="viewVoucherDetail(${v.VoucherID})" title="Xem chi tiết">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-info rounded-pill px-2 me-1" onclick="openVoucherModal(${v.VoucherID})" title="Sửa">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger rounded-pill px-2" onclick="deleteVoucher(${v.VoucherID})" title="Xóa">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', row);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-white-50 py-4"><i class="fa-solid fa-inbox fs-3 mb-2 d-block"></i>Chưa có voucher nào.</td></tr>`;
        }
    } catch (error) {
        console.error("Lỗi khi tải voucher:", error);
        document.getElementById('voucherListBody').innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4"><i class="fa-solid fa-triangle-exclamation fs-3 mb-2 d-block"></i>Lỗi kết nối API lấy danh sách.</td></tr>`;
    }
}

/**
 * Mở modal Tạo/Sửa Voucher
 */
async function openVoucherModal(id = null) {
    currentVoucherId = id;

    // Khởi tạo Bootstrap Modal nếu chưa có
    if (!voucherModalInstance) {
        voucherModalInstance = new bootstrap.Modal(document.getElementById('voucherModal'));
    }

    const form = document.getElementById('voucherForm');
    form.reset();

    if (id) {
        document.getElementById('voucherModalTitle').innerHTML = '<i class="fa-solid fa-pen text-warning me-2"></i>Cập nhật Voucher';
        try {
            // Lấy chi tiết
            const res = await API.get(`${VOUCHER_API_URL}/${id}`);
            if (res && res.success && res.data) {
                const data = res.data;
                // Bind data vào form
                document.getElementById('vCode').value = data.Code || '';
                document.getElementById('vDiscountType').value = data.DiscountType || 'PERCENT';
                document.getElementById('vDiscountValue').value = data.DiscountValue || '';
                document.getElementById('vMaxDiscount').value = data.MaxDiscountAmount || '';
                document.getElementById('vMinBooking').value = data.MinBookingValue || '';
                document.getElementById('vMaxUsage').value = data.MaxUsagePerUser || '';
                document.getElementById('vVehicleTypeId').value = data.ApplicableVehicleTypeID || 1;
                // Backend trả về YYYY-MM-DDTHH:mm:ss, input type="datetime-local" cần YYYY-MM-DDTHH:mm
                document.getElementById('vValidFrom').value = data.ValidFrom ? data.ValidFrom.substring(0, 16) : '';
                document.getElementById('vValidTo').value = data.ValidTo ? data.ValidTo.substring(0, 16) : '';
            }
        } catch (err) {
            console.error("Lỗi lấy chi tiết voucher", err);
            showGlassAlert("Không thể kết nối tải chi tiết Voucher!", "error");
            return;
        }
    } else {
        document.getElementById('voucherModalTitle').innerHTML = '<i class="fa-solid fa-ticket text-warning me-2"></i>Tạo Voucher mới';
    }

    voucherModalInstance.show();
}

/**
 * Mở modal Xem Chi tiết Voucher
 */
async function viewVoucherDetail(id) {
    let detailModal = bootstrap.Modal.getInstance(document.getElementById('voucherDetailModal'));
    if (!detailModal) {
        detailModal = new bootstrap.Modal(document.getElementById('voucherDetailModal'));
    }

    try {
        const res = await API.get(`${VOUCHER_API_URL}/${id}`);
        if (res && res.success && res.data) {
            const data = res.data;
            
            document.getElementById('detailVCode').innerText = data.Code || '--';
            
            const statusHtml = data.Status === 'ACTIVE' 
                ? '<span class="badge bg-success bg-opacity-25 text-success border border-success"><i class="fa-solid fa-check-circle me-1"></i> Đang hoạt động</span>'
                : '<span class="badge bg-secondary bg-opacity-25 text-secondary border border-secondary"><i class="fa-solid fa-lock me-1"></i> Đã vô hiệu hóa</span>';
            document.getElementById('detailVStatus').innerHTML = statusHtml;

            document.getElementById('detailVDiscountType').innerText = data.DiscountType === 'PERCENT' ? 'Phần trăm (%)' : 'Số tiền cố định';
            
            const discountVal = data.DiscountType === 'PERCENT' 
                ? `${data.DiscountValue}%` 
                : `${data.DiscountValue ? data.DiscountValue.toLocaleString() : 0} đ`;
            document.getElementById('detailVDiscountValue').innerText = discountVal;

            document.getElementById('detailVMaxDiscount').innerText = data.MaxDiscountAmount ? `${data.MaxDiscountAmount.toLocaleString()} đ` : 'Không giới hạn';
            document.getElementById('detailVMinBooking').innerText = data.MinBookingValue ? `${data.MinBookingValue.toLocaleString()} đ` : 'Không giới hạn';
            document.getElementById('detailVMaxUsage').innerText = data.MaxUsagePerUser ? `${data.MaxUsagePerUser} lượt / khách` : 'Không giới hạn';

            const vehicleTypes = {
                1: 'Sedan 4 chỗ', 2: 'SUV/MPV 7 chỗ', 3: 'Limousine 9 chỗ',
                4: 'Xe khách 16 chỗ', 5: 'Xe khách 29 chỗ', 6: 'Xe khách 45 chỗ'
            };
            document.getElementById('detailVVehicleType').innerText = data.ApplicableVehicleTypeID ? vehicleTypes[data.ApplicableVehicleTypeID] || 'Tất cả loại xe' : 'Tất cả loại xe';

            document.getElementById('detailVValidFrom').innerText = data.ValidFrom ? data.ValidFrom.replace('T', ' ') : '--';
            document.getElementById('detailVValidTo').innerText = data.ValidTo ? data.ValidTo.replace('T', ' ') : 'Vô thời hạn';

            detailModal.show();
        } else {
            showGlassAlert("Không tìm thấy dữ liệu voucher!", "error");
        }
    } catch (err) {
        console.error("Lỗi lấy chi tiết voucher", err);
        showGlassAlert("Lỗi! Không thể kết nối lấy chi tiết Voucher.", "error");
    }
}

/**
 * Lưu Voucher (Thêm mới hoặc Cập nhật)
 */
async function saveVoucher() {
    // Validate form
    const form = document.getElementById('voucherForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const payload = {
        code: document.getElementById('vCode').value,
        discountType: document.getElementById('vDiscountType').value,
        discountValue: parseFloat(document.getElementById('vDiscountValue').value) || 0,
        maxDiscountAmount: parseFloat(document.getElementById('vMaxDiscount').value) || null,
        minBookingValue: parseFloat(document.getElementById('vMinBooking').value) || null,
        maxUsagePerUser: parseInt(document.getElementById('vMaxUsage').value) || null,
        applicableVehicleTypeId: parseInt(document.getElementById('vVehicleTypeId').value) || null,
        validFrom: document.getElementById('vValidFrom').value ? document.getElementById('vValidFrom').value + ':00' : null,
        validTo: document.getElementById('vValidTo').value ? document.getElementById('vValidTo').value + ':00' : null
    };

    try {
        if (currentVoucherId) {
            // Cập nhật
            await API.put(`${VOUCHER_API_URL}/${currentVoucherId}`, payload);
        } else {
            // Thêm mới
            await API.post(VOUCHER_API_URL, payload);
        }

        voucherModalInstance.hide();
        fetchVouchers(); // Refresh lại danh sách
    } catch (err) {
        console.error("Lỗi khi lưu voucher", err);
        showGlassAlert("Có lỗi xảy ra khi lưu Voucher: " + (err.message || 'Máy chủ từ chối yêu cầu.'), "error");
    }
}

/**
 * Xóa / Vô hiệu hóa Voucher
 */
function deleteVoucher(id) {
    showGlassConfirm(
        "Hành động này sẽ xóa/vô hiệu hóa Voucher. Bạn có chắc chắn không?",
        async () => {
            try {
                await API.delete(`${VOUCHER_API_URL}/${id}`);
                fetchVouchers(); // Refresh lại danh sách
            } catch (err) {
                console.error("Lỗi xóa voucher", err);
                showGlassAlert("Lỗi! Không thể thực thi yêu cầu xóa Voucher.", "error");
            }
        },
        { title: "Xóa Voucher", confirmText: "Xóa ngay", type: "danger" }
    );
}

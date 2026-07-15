// =========================================
// LỚP API CLIENT (THÊM VÀO CUỐI BASE.JS)
// =========================================
const API_BASE_URL = 'http://localhost:8080/FleetFlow/api/v1';

const API = (function () {
    const getAuthHeaders = () => {
        const token = localStorage.getItem('accessToken');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    };

    const showSessionExpiredModal = (rootPrefix) => {
        let modalHtml = `
        <div class="modal fade" id="sessionExpiredModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content text-center p-4 border-0 shadow-lg" style="border-radius: 16px;">
                    <div class="modal-body">
                        <i class="fa-solid fa-clock-rotate-left text-warning mb-3" style="font-size: 3rem;"></i>
                        <h4 class="fw-bold mb-2">Phiên đăng nhập hết hạn</h4>
                        <p class="text-muted mb-4">Vui lòng đăng nhập lại để tiếp tục sử dụng hệ thống.</p>
                        <div class="d-flex justify-content-center align-items-center mb-2">
                            <div class="spinner-border text-primary me-2" role="status" style="width: 1.5rem; height: 1.5rem;"></div>
                            <span class="fw-bold text-primary">Tự động đăng xuất sau <span id="sessionCountdown">5</span>s...</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        if (!document.getElementById('sessionExpiredModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        const modalElement = document.getElementById('sessionExpiredModal');
        // fallback if bootstrap is not defined (unlikely, but safe)
        if (typeof bootstrap !== 'undefined') {
            const modalInstance = new bootstrap.Modal(modalElement);
            modalInstance.show();
        } else {
            modalElement.style.display = 'block';
            modalElement.classList.add('show');
        }

        let timeLeft = 5;
        const countdownSpan = document.getElementById('sessionCountdown');
        const interval = setInterval(() => {
            timeLeft--;
            if (countdownSpan) countdownSpan.innerText = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(interval);
                localStorage.clear();
                window.location.href = rootPrefix + 'index.html';
            }
        }, 1000);
    };

    const handleResponse = async (response) => {
        const path = window.location.pathname;
        let rootPrefix = '';
        if (path.includes('/pages/admin/') || path.includes('/pages/driver/') || path.includes('/pages/customer/') || path.includes('/pages/dispatcher/')) {
            rootPrefix = '../../';
        } else if (path.includes('/pages/')) {
            rootPrefix = '../';
        }

        if (response.status === 401) {
            if (!window.isSessionExpired) {
                window.isSessionExpired = true;
                showSessionExpiredModal(rootPrefix);
            }
            throw new Error("Unauthorized");
        }
        if (response.status === 403) {
            window.location.href = rootPrefix + 'error/403.html';
            throw new Error("Forbidden");
        }

        let data = null;
        try { data = await response.json(); } catch (e) { /* server trả về chuỗi text hoặc rỗng */ }

        if (!response.ok) {
            const errorMsg = (data && data.message) ? data.message : `HTTP Error ${response.status}`;
            console.error('API Error:', errorMsg);
            throw new Error(errorMsg);
        }
        return data; // Định dạng trả về của bạn là entity JSON trực tiếp, không bọc trong data.success
    };

    const fetchWithTimeout = async (resource, options = {}) => {
        const { timeout = 8000 } = options;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(resource, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    };

    // ==========================================
    // GLOBAL FETCH INTERCEPTOR FOR RAW FETCH
    // Bắt lỗi 401 cho các lệnh fetch() gọi trực tiếp
    // ==========================================
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);
        if (response.status === 401) {
            const path = window.location.pathname;
            let rootPrefix = '';
            if (path.includes('/pages/admin/') || path.includes('/pages/driver/') || path.includes('/pages/customer/') || path.includes('/pages/dispatcher/')) {
                rootPrefix = '../../';
            } else if (path.includes('/pages/')) {
                rootPrefix = '../';
            }
            if (!window.isSessionExpired) {
                window.isSessionExpired = true;
                showSessionExpiredModal(rootPrefix);
            }
        }
        return response;
    };

    return {
        get: async (endpoint, params = {}) => {
            const url = new URL(`${API_BASE_URL}${endpoint}`);
            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
            const res = await fetchWithTimeout(url, { method: 'GET', headers: getAuthHeaders() });
            return handleResponse(res);
        },
        post: async (endpoint, body = {}) => {
            const res = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(body)
            });
            return handleResponse(res);
        },
        put: async (endpoint, body = {}) => {
            const res = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(body)
            });
            return handleResponse(res);
        },
        delete: async (endpoint) => {
            const res = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            return handleResponse(res);
        }
    };
})();

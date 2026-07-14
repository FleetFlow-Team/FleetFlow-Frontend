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

    const handleResponse = async (response) => {
        const path = window.location.pathname;
        let rootPrefix = '';
        if (path.includes('/pages/admin/') || path.includes('/pages/driver/') || path.includes('/pages/customer/') || path.includes('/pages/dispatcher/')) {
            rootPrefix = '../../';
        } else if (path.includes('/pages/')) {
            rootPrefix = '../';
        }

        if (response.status === 401) {
            if (typeof window.showSessionExpiredModal === 'function') {
                window.showSessionExpiredModal();
            } else {
                alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                localStorage.clear();
                window.location.href = rootPrefix + 'index.html';
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

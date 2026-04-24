const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe: () => request('/auth/me'),

  // Products
  getProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/products?${qs}`);
  },
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // Vendors
  getVendors: () => request('/vendors'),
  getVendor: (id) => request(`/vendors/${id}`),
  createVendor: (data) => request('/vendors', { method: 'POST', body: JSON.stringify(data) }),
  updateVendor: (id, data) => request(`/vendors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVendor: (id) => request(`/vendors/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: () => request('/categories'),
  getCategory: (id) => request(`/categories/${id}`),
  createCategory: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Duplicates
  getDuplicates: (status) => request(`/duplicates${status ? `?status=${status}` : ''}`),
  getDuplicate: (id) => request(`/duplicates/${id}`),
  detectDuplicates: (id1, id2) => request('/duplicates/detect', { method: 'POST', body: JSON.stringify({ product_id_1: id1, product_id_2: id2 }) }),
  autoDetect: () => request('/duplicates/auto-detect', { method: 'POST' }),
  mergeDuplicates: (groupId, primaryId) => request(`/duplicates/${groupId}/merge`, { method: 'POST', body: JSON.stringify({ primary_product_id: primaryId }) }),
  dismissDuplicate: (groupId) => request(`/duplicates/${groupId}/dismiss`, { method: 'POST' }),
  getAiMergeSuggestion: (groupId) => request(`/duplicates/${groupId}/ai-merge-suggestion`, { method: 'POST' }),

  // AI
  generateDescription: (productId) => request('/ai/generate-description', { method: 'POST', body: JSON.stringify({ product_id: productId }) }),
  suggestCategory: (name, desc) => request('/ai/suggest-category', { method: 'POST', body: JSON.stringify({ product_name: name, description: desc }) }),
  optimizePrice: (productId) => request('/ai/optimize-price', { method: 'POST', body: JSON.stringify({ product_id: productId }) }),
  analyzeQuality: (productId) => request('/ai/analyze-quality', { method: 'POST', body: JSON.stringify({ product_id: productId }) }),
  getAiJobs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/ai/jobs?${qs}`);
  },

  // Imports
  getImports: () => request('/imports'),
  getImport: (id) => request(`/imports/${id}`),
  createImport: (data) => request('/imports', { method: 'POST', body: JSON.stringify(data) }),
  updateImport: (id, data) => request(`/imports/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteImport: (id) => request(`/imports/${id}`, { method: 'DELETE' }),

  // Analytics
  getDashboard: () => request('/analytics/dashboard'),
  getPriceHistory: (productId) => request(`/analytics/price-history/${productId}`),
  getQualityReports: () => request('/analytics/quality-reports'),
  getAuditLog: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/analytics/audit-log?${qs}`);
  },
  getMergeHistory: () => request('/analytics/merge-history'),
};

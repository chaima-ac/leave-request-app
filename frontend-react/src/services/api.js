import axios from 'axios';

const rawApiBase = (import.meta.env.VITE_API_URL || '').trim();
const API_BASE = rawApiBase.replace(/\/+$/, '');
const isValidApiBase = /^https?:\/\//i.test(API_BASE);

const api = axios.create({ baseURL: isValidApiBase ? API_BASE : undefined });

api.interceptors.request.use((config) => {
  if (!isValidApiBase) {
    return Promise.reject(
      new Error('API is misconfigured. Set VITE_API_URL to your API Gateway URL (https://.../dev).')
    );
  }
  const token = localStorage.getItem('ld_token');
  if (token) config.headers.Authorization = token;
  return config;
});

// ── Auth ───────────────────────────────────────────────────────────────────
export const register   = (data) => api.post('/register',    data);
export const login      = (data) => api.post('/login',       data);
export const adminLogin = (data) => api.post('/admin-login', data);

// ── Employee ───────────────────────────────────────────────────────────────
export const getMyRequests = ()     => api.get('/my-requests');
export const getMyBalance  = ()     => api.get('/my-balance');
export const submitRequest = (data) => api.post('/submit',         data);
export const cancelRequest = (data) => api.put('/cancel-request',  data);

// ── Manager — level 1 review ───────────────────────────────────────────────
export const managerReview = (data) => api.put('/manager-review', data);

// ── HR — level 2 final review ──────────────────────────────────────────────
export const hrReview = (data) => api.put('/hr-review', data);

// ── Shared ─────────────────────────────────────────────────────────────────
export const getAllRequests = () => api.get('/requests');
export const getUsers      = () => api.get('/admin/users');
export const getStats      = () => api.get('/admin/stats');

// ── Leave policy ───────────────────────────────────────────────────────────
export const getLeavePolicy    = ()     => api.get('/leave-policy');
export const updateLeavePolicy = (data) => api.put('/leave-policy', data);

// ── Admin only ─────────────────────────────────────────────────────────────
export const createUser    = (data) => api.post('/admin/create-user',      data);
export const updateUser    = (data) => api.put('/admin/update-user',       data);
export const deleteUser    = (data) => api.delete('/admin/delete-user',    { data });
export const deleteRequest = (data) => api.delete('/admin/delete-request', { data });

// ── Admin + HR ─────────────────────────────────────────────────────────────
export const updateBalance = (data) => api.put('/admin/update-balance', data);

export default api;
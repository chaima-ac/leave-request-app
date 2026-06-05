import axios from 'axios';
import { cognitoRefreshSession } from './cognito';

const rawApiBase = (import.meta.env.VITE_API_URL || '').trim();
const API_BASE = rawApiBase.replace(/\/+$/, '');
const isValidApiBase = /^https?:\/\//i.test(API_BASE);

const api = axios.create({
  baseURL: isValidApiBase ? API_BASE : undefined,
  timeout: 30000,
});

// ── Request interceptor — attach Cognito idToken ──────────────────────────
// We use ld_token (the raw Cognito idToken stored at login) directly.
// The Cognito SDK's getCurrentUser/getSession path was causing timeouts and
// intermittent failures in the AWS Academy environment — ld_token is
// always the authoritative, most-recently-issued JWT.
api.interceptors.request.use((config) => {
  if (!isValidApiBase) {
    return Promise.reject(
      new Error('API_URL not configured. Set VITE_API_URL.')
    );
  }
  const token = localStorage.getItem('ld_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor — handle 401 (token expired) ────────────────────
// On 401: try a silent Cognito refresh once.
// If refresh also fails, clear auth and redirect to login.

let _loggingOut = false;

const forceLogout = () => {
  if (_loggingOut) return;
  if (!localStorage.getItem('ld_token')) return; // already cleared
  _loggingOut = true;
  ['ld_token','ld_role','ld_name','ld_email','ld_employee_id','ld_department']
    .forEach(k => localStorage.removeItem(k));
  window.location.replace('/login');
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;

    if (status === 401 && !error.config?._retried) {
      error.config._retried = true;
      try {
        const newToken = await cognitoRefreshSession();
        if (newToken) {
          localStorage.setItem('ld_token', newToken);
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return api.request(error.config);
        }
      } catch (_) {
        // Refresh failed — session is unrecoverable
      }
      forceLogout();
      return new Promise(() => {}); // prevent error propagation during redirect
    }

    return Promise.reject(error);
  }
);

// ── Auth ───────────────────────────────────────────────────────────────────
export const register = (data) => api.post('/register', data);
export const login    = (data) => api.post('/login',    data);

// ── Employee ───────────────────────────────────────────────────────────────
export const getMyRequests = ()     => api.get('/my-requests');
export const getMyBalance  = ()     => api.get('/my-balance');
export const submitRequest = (data) => api.post('/submit',        data);
export const cancelRequest = (data) => api.put('/cancel-request', data);

// ── Manager ────────────────────────────────────────────────────────────────
export const managerReview = (data) => api.put('/manager-review', data);

// ── HR ─────────────────────────────────────────────────────────────────────
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

// ── Notifications ──────────────────────────────────────────────────────────
export const getNotifications     = ()     => api.get('/notifications');
export const markNotificationRead = (data) => api.put('/notifications/read', data);

export default api;

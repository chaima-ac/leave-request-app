import axios from 'axios';
import { cognitoGetCurrentToken, cognitoRefreshSession } from './cognito';

const rawApiBase = (import.meta.env.VITE_API_URL || '').trim();
const API_BASE = rawApiBase.replace(/\/+$/, '');
const isValidApiBase = /^https?:\/\//i.test(API_BASE);

const api = axios.create({
  baseURL: isValidApiBase ? API_BASE : undefined,
  timeout: 30000, // 30 s — Lambda cold start in AWS Academy can take up to 10-15 s
});

// ── Request interceptor — attach Cognito idToken ───────────────────────────
api.interceptors.request.use(async (config) => {
  if (!isValidApiBase) {
    return Promise.reject(
      new Error('API is misconfigured. Set VITE_API_URL to your API Gateway URL (https://.../dev).')
    );
  }

  // 1. Try the Cognito SDK (handles auto-refresh internally, 3 s timeout)
  let token = await cognitoGetCurrentToken();

  // 2. Fallback: use the JWT stored in localStorage by AuthContext at login
  //    (ld_token IS the Cognito idToken — same value, just stored separately)
  if (!token) {
    token = localStorage.getItem('ld_token') || null;
  }

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor — handle 401 (token expired) ────────────────────
// Guard with _retried flag to prevent infinite retry loops.
// If we get 401 after one refresh attempt, the session is unrecoverable
// (expired refresh token or pool mismatch) — clear auth and go to login.

// Module-level guard: prevents a second in-flight 401 (e.g. from the
// NotificationsDropdown polling in parallel) from firing forceLogout
// a second time AFTER the user has already successfully logged back in.
let _loggingOut = false;

const forceLogout = () => {
  if (_loggingOut) return;           // already in progress, ignore duplicate 401s
  if (!localStorage.getItem('ld_token')) return;  // already logged out (no token), skip
  _loggingOut = true;
  ['ld_token','ld_role','ld_name','ld_email','ld_employee_id','ld_department'].forEach(k =>
    localStorage.removeItem(k)
  );
  // Hard redirect — clears React state and forces a fresh login
  window.location.replace('/login');
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      if (!error.config?._retried) {
        // First 401 — try a silent Cognito token refresh once
        error.config._retried = true;
        try {
          const newToken = await cognitoRefreshSession();
          if (newToken) {
            error.config.headers.Authorization = `Bearer ${newToken}`;
            localStorage.setItem('ld_token', newToken);
            return api.request(error.config);
          }
        } catch (_) {
          // Refresh failed — fall through to forceLogout below
        }
      }
      // Still 401 after refresh attempt — session is dead, send to login
      forceLogout();
      return new Promise(() => {}); // hang to prevent error propagating during redirect
    }
    return Promise.reject(error);
  }
);

// ── Auth ───────────────────────────────────────────────────────────────────
export const register   = (data) => api.post('/register', data);
export const login      = (data) => api.post('/login',    data); // DynamoDB credential check (profile data)

// ── Employee ───────────────────────────────────────────────────────────────
export const getMyRequests = ()     => api.get('/my-requests');
export const getMyBalance  = ()     => api.get('/my-balance');
export const submitRequest = (data) => api.post('/submit',        data);
export const cancelRequest = (data) => api.put('/cancel-request', data);

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

// ── Notifications ──────────────────────────────────────────────────────────
export const getNotifications     = ()     => api.get('/notifications');
export const markNotificationRead = (data) => api.put('/notifications/read', data);

export default api;

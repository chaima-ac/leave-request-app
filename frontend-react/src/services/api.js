import axios from 'axios';

const API_BASE = 'https://1btpbwnf8c.execute-api.us-east-1.amazonaws.com/dev';

const api = axios.create({ baseURL: API_BASE });

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ld_token');
  if (token) config.headers.Authorization = token;
  return config;
});

// Auth
export const register = (data) => api.post('/register', data);
export const login = (data) => api.post('/login', data);
export const adminLogin = (data) => api.post('/admin-login', data);

// Requests
export const getMyRequests = () => api.get('/my-requests');
export const getAllRequests = () => api.get('/requests');
export const submitRequest = (data) => api.post('/submit', data);
export const updateStatus = (data) => api.put('/request-status', data);

// Admin user management
export const getUsers = () => api.get('/admin/users');
export const createUser = (data) => api.post('/admin/create-user', data);
export const updateUser = (data) => api.put('/admin/update-user', data);
export const deleteUser = (data) => api.delete('/admin/delete-user', { data });

export default api;
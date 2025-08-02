import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      if (status === 401) {
        // Unauthorized - clear token and redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      
      // Return structured error
      return Promise.reject({
        status,
        message: data?.error?.message || data?.message || 'An error occurred',
        details: data?.error?.details || null
      });
    } else if (error.request) {
      // Network error
      return Promise.reject({
        status: 0,
        message: 'Network error. Please check your connection.',
        details: null
      });
    } else {
      // Other error
      return Promise.reject({
        status: 0,
        message: error.message || 'An unexpected error occurred',
        details: null
      });
    }
  }
);

export default api;
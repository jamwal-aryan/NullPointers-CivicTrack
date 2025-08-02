import api from './api';

export const authService = {
  // Login user
  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    return response;
  },

  // Register user
  async register(userData) {
    const response = await api.post('/auth/register', userData);
    return response;
  },

  // Verify token
  async verifyToken(token) {
    const response = await api.get('/auth/verify', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.user;
  },

  // Get current user profile
  async getProfile() {
    const response = await api.get('/auth/profile');
    return response;
  },

  // Update user profile
  async updateProfile(userData) {
    const response = await api.patch('/auth/profile', userData);
    return response;
  },

  // Create anonymous session
  async createAnonymousSession() {
    const response = await api.post('/auth/anonymous');
    return response;
  }
};
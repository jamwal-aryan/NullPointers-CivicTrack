import api from './api';

export const issueService = {
  // Create new issue
  async createIssue(issueData) {
    const formData = new FormData();
    
    // Add text fields
    formData.append('title', issueData.title);
    formData.append('description', issueData.description);
    formData.append('category', issueData.category);
    formData.append('isAnonymous', issueData.isAnonymous);
    
    // Add location data as separate fields (backend expects latitude/longitude)
    formData.append('latitude', issueData.location.lat);
    formData.append('longitude', issueData.location.lng);
    if (issueData.location.address) {
      formData.append('address', issueData.location.address);
    }
    
    // Add photos
    if (issueData.photos && issueData.photos.length > 0) {
      issueData.photos.forEach((photo, index) => {
        formData.append('photos', photo);
      });
    }
    
    const response = await api.post('/issues', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response;
  },

  // Get issues by location
  async getIssues(params = {}) {
    const response = await api.get('/issues', { params });
    return response;
  },

  // Get issue by ID
  async getIssueById(id) {
    const response = await api.get(`/issues/${id}`);
    return response;
  },

  // Flag an issue
  async flagIssue(id, reason) {
    const response = await api.post(`/issues/${id}/flag`, { reason });
    return response;
  }
};
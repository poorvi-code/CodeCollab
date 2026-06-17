import axios from 'axios';

// Set base URL for REST API depending on environment
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : '';

axios.defaults.baseURL = API_URL;

export const roomsApi = {
  getAll: async () => {
    const response = await axios.get('/api/rooms');
    return response.data;
  },
  getById: async (id) => {
    const response = await axios.get(`/api/rooms/${id}`);
    return response.data;
  },
  create: async (roomData) => {
    const response = await axios.post('/api/rooms', roomData);
    return response.data;
  },
  join: async (id) => {
    const response = await axios.post(`/api/rooms/${id}/join`);
    return response.data;
  },
  leave: async (id) => {
    const response = await axios.post(`/api/rooms/${id}/leave`);
    return response.data;
  },
  delete: async (id) => {
    const response = await axios.delete(`/api/rooms/${id}`);
    return response.data;
  }
};

export const compilerApi = {
  execute: async (payload) => {
    const response = await axios.post('/api/compiler/execute', payload);
    return response.data;
  },
  getHistory: async (roomId) => {
    const response = await axios.get(`/api/compiler/rooms/${roomId}/submissions`);
    return response.data;
  },
  deleteSubmission: async (id) => {
    const response = await axios.delete(`/api/compiler/submissions/${id}`);
    return response.data;
  },
  getLanguages: async () => {
    const response = await axios.get('/api/compiler/languages');
    return response.data;
  }
};

export const userApi = {
  getDashboard: async () => {
    const response = await axios.get('/api/users/dashboard');
    return response.data;
  },
  getHistory: async () => {
    const response = await axios.get('/api/users/history');
    return response.data;
  },
  getNotifications: async () => {
    const response = await axios.get('/api/users/notifications');
    return response.data;
  },
  markNotificationRead: async (id) => {
    const response = await axios.put(`/api/users/notifications/${id}/read`);
    return response.data;
  }
};

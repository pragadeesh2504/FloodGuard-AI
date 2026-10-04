import axios from 'axios';

// Set base URL for API requests
axios.defaults.baseURL = ''; // Handled by Vite proxies in development

// Add authorization token from local storage if present
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export const api = {
  // Authentication
  login: (username, password) => axios.post('/api/auth/login', { username, password }),
  register: (username, email, password, role) => axios.post('/api/auth/register', { username, email, password, role }),
  getProfile: () => axios.get('/api/auth/me'),

  // Locations
  getLocations: () => axios.get('/api/locations'),
  addLocation: (locationData) => axios.post('/api/locations', locationData),

  // Predictions & Weather
  getLatestPredictions: () => axios.get('/api/predictions/latest'),
  getPredictionHistory: (locationId) => axios.get(`/api/predictions/${locationId}/history`),
  getWeatherHistory: (locationId) => axios.get(`/api/predictions/${locationId}/weather-history`),
  getActiveAlerts: () => axios.get('/api/predictions/alerts'),
  predictRisk: (data) => axios.post('/api/predictions/predict', data),

  // Incidents
  getIncidents: (params) => axios.get('/api/incidents', { params }),
  createIncident: (incidentData) => axios.post('/api/incidents', incidentData),
  updateIncidentStatus: (incidentId, lifecycle_status, notes) =>
    axios.put(`/api/incidents/${incidentId}/status`, { lifecycle_status, notes }),
  broadcastIncidentAlert: (incidentId, customMessage) =>
    axios.post(`/api/incidents/${incidentId}/broadcast${customMessage ? `?custom_message=${encodeURIComponent(customMessage)}` : ''}`),

  // Citizen Reports
  getCitizenReports: (params) => axios.get('/api/reports', { params }),
  submitReport: (reportData) => axios.post('/api/reports', reportData),
  verifyReport: (reportId) => axios.put(`/api/reports/${reportId}/verify`),
  updateReportStatus: (reportId, verification_status, notes) =>
    axios.put(`/api/reports/${reportId}/status`, { verification_status, notes }),
  escalateReport: (reportId) => axios.post(`/api/reports/${reportId}/escalate`),

  // Shelters & Evacuation
  getShelters: () => axios.get('/api/shelters'),
  getEvacuationPlan: () => axios.get('/api/shelters/evacuation-plan'),
  createShelter: (shelterData) => axios.post('/api/shelters', shelterData),
  updateShelterOccupancy: (shelterId, occupancy, status) =>
    axios.put(`/api/shelters/${shelterId}/occupancy?occupancy=${occupancy}&status=${status}`),

  // Admin Portal & Audit Logs
  getUsers: () => axios.get('/api/admin/users'),
  deleteUser: (userId) => axios.delete(`/api/admin/users/${userId}`),
  broadcastAlert: (title, message, locationId) =>
    axios.post(`/api/admin/broadcast-alert?title=${encodeURIComponent(title)}&message=${encodeURIComponent(message)}&location_id=${locationId}`),
  getAuditLogs: (params) => axios.get('/api/admin/audit-logs', { params }),

  // Analytics
  getAnalytics: () => axios.get('/api/analytics'),

  // Operating Mode
  getOperatingMode: () => axios.get('/api/predictions/mode'),
  setOperatingMode: (mode) => axios.post('/api/predictions/mode', { mode }),

  // Historical Flood Replay
  getReplayEvents: () => axios.get('/api/replay/events'),
  getReplayDetail: (eventId) => axios.get(`/api/replay/${eventId}`)
};

// API configuration and service functions
const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('access_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth methods
  async login(username, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    if (response.access_token) {
      this.setToken(response.access_token);
    }
    
    return response;
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  async updateProfile(userData) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  logout() {
    this.setToken(null);
    localStorage.removeItem('user');
  }

  // Domain methods
  async getDomains() {
    return this.request('/domains');
  }

  async createDomain(domainData) {
    return this.request('/domains', {
      method: 'POST',
      body: JSON.stringify(domainData),
    });
  }

  async updateDomain(domainId, domainData) {
    return this.request(`/domains/${domainId}`, {
      method: 'PUT',
      body: JSON.stringify(domainData),
    });
  }

  async deleteDomain(domainId) {
    return this.request(`/domains/${domainId}`, {
      method: 'DELETE',
    });
  }

  // DNS methods
  async getDNSRecords(domainId) {
    return this.request(`/domains/${domainId}/dns`);
  }

  async createDNSRecord(domainId, recordData) {
    return this.request(`/domains/${domainId}/dns`, {
      method: 'POST',
      body: JSON.stringify(recordData),
    });
  }

  async updateDNSRecord(recordId, recordData) {
    return this.request(`/dns/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(recordData),
    });
  }

  async deleteDNSRecord(recordId) {
    return this.request(`/dns/${recordId}`, {
      method: 'DELETE',
    });
  }

  // File Manager methods
  async getFiles(path = '') {
    const params = path ? `?path=${encodeURIComponent(path)}` : '';
    return this.request(`/files${params}`);
  }

  async uploadFile(file, path = '') {
    const formData = new FormData();
    formData.append('file', file);
    if (path) {
      formData.append('path', path);
    }

    const url = `${API_BASE_URL}/files/upload`;
    const config = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      return data;
    } catch (error) {
      console.error('Upload Error:', error);
      throw error;
    }
  }

  async downloadFile(path) {
    const url = `${API_BASE_URL}/files/download?path=${encodeURIComponent(path)}`;
    const config = {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Download failed');
      }

      return response.blob();
    } catch (error) {
      console.error('Download Error:', error);
      throw error;
    }
  }

  async createFolder(name, path = '') {
    return this.request('/files/create-folder', {
      method: 'POST',
      body: JSON.stringify({ name, path }),
    });
  }

  async deleteFile(path) {
    return this.request(`/files/delete?path=${encodeURIComponent(path)}`, {
      method: 'DELETE',
    });
  }

  async renameFile(oldPath, newName) {
    return this.request('/files/rename', {
      method: 'PUT',
      body: JSON.stringify({ old_path: oldPath, new_name: newName }),
    });
  }

  // SSL Certificate methods
  async getSSLCertificates(domain = null) {
    const params = domain ? `?domain=${domain}` : '';
    return this.request(`/ssl/certificates${params}`);
  }

  async createSSLCertificate(data) {
    return this.request('/ssl/certificates', 'POST', data);
  }

  async updateSSLCertificate(certId, data) {
    return this.request(`/ssl/certificates/${certId}`, 'PUT', data);
  }

  async deleteSSLCertificate(certId) {
    return this.request(`/ssl/certificates/${certId}`, 'DELETE');
  }

  async checkSSL(domain, port = 443) {
    return this.request(`/ssl/check?domain=${domain}&port=${port}`);
  }

  async downloadSSLCertificate(certId, type = 'certificate') {
    return this.request(`/ssl/certificates/${certId}/download?type=${type}`);
  }

  async getExpiringCertificates(days = 30) {
    return this.request(`/ssl/certificates/expiring?days=${days}`);
  }

  async getSSLStats() {
    return this.request('/ssl/stats');
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

export const apiService = new ApiService();
export default apiService;


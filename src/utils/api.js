// API utility functions for authentication and data fetching
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Set auth token in localStorage
const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

// Remove auth token
export const removeAuthToken = () => {
  localStorage.removeItem('authToken');
};

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

// Authentication API calls
export const authAPI = {
  // Login user
  login: async (credentials) => {
    const response = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    
    if (response.success && response.token) {
      setAuthToken(response.token);
    }
    
    return response;
  },

  // Register user
  register: async (userData) => {
    const response = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    if (response.success && response.token) {
      setAuthToken(response.token);
    }
    
    return response;
  },

  // Get current user
  getCurrentUser: async () => {
    return await apiRequest('/api/auth/me');
  },

  // Update user profile
  updateProfile: async (profileData) => {
    return await apiRequest('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },

  // Logout user
  logout: async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      removeAuthToken();
    }
  }
};

// Protected API calls (require authentication)
export const protectedAPI = {
  // Get dashboard data
  getDashboard: async () => {
    return await apiRequest('/api/dashboard');
  },

  // Get user preferences
  getPreferences: async () => {
    return await apiRequest('/api/preferences');
  },

  // Update user preferences
  updatePreferences: async (preferences) => {
    return await apiRequest('/api/preferences', {
      method: 'PUT',
      body: JSON.stringify({ preferences })
    });
  }
};

// Utility functions
export const apiUtils = {
  // Check if user is authenticated
  isAuthenticated: () => {
    return !!getAuthToken();
  },

  // Get stored token
  getToken: getAuthToken,

  // Set token
  setToken: setAuthToken,

  // Remove token
  removeToken: removeAuthToken,

  // Health check
  healthCheck: async () => {
    try {
      return await apiRequest('/health');
    } catch (error) {
      console.error('Health check failed:', error);
      return { success: false, message: 'API unavailable' };
    }
  }
};

export default apiRequest;

/* ================================================================
   NOVA — API Configurations & Universal HTTP Client (api-config.js)
   Shared across all frontend customer pages and admin panel pages
   to connect seamlessly to the Node.js REST API.
   ================================================================ */

(function () {
  'use strict';

  window.NOVA_API_URL = 'http://localhost:5000/api';

  /**
   * Universal HTTP fetch helper. Automatically appends authorization headers,
   * handles JSON stringifying, and catches API error messages.
   * @param {string} endpoint - The relative API path (e.g. '/auth/login', '/products')
   * @param {Object} [options] - Standard fetch options
   * @returns {Promise<Object>} The decoded JSON response
   */
  window.novaFetch = async function (endpoint, options = {}) {
    const url = `${window.NOVA_API_URL}${endpoint}`;
    
    // Prepare headers
    options.headers = options.headers || {};
    if (!(options.body instanceof FormData)) {
      options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
    }

    // Auto-attach Bearer Token from localStorage if available
    const adminToken = localStorage.getItem('nova_admin_token');
    const userToken = localStorage.getItem('nova_user_token');
    const token = adminToken || userToken;
    
    // Intercept mock-demo-token requests to auth endpoints
    if (token === 'mock-demo-token-12345') {
      if (endpoint.startsWith('/auth/me')) {
        const userRaw = localStorage.getItem('nova_user');
        const user = userRaw ? JSON.parse(userRaw) : {
          id: 'demo-user-id',
          name: 'Demo User',
          email: 'user@nova.in',
          role: 'customer'
        };
        if (options.method === 'PUT') {
          const body = JSON.parse(options.body || '{}');
          if (body.name) user.name = body.name;
          if (body.phone) user.phone = body.phone;
          localStorage.setItem('nova_user', JSON.stringify(user));
        }
        return { success: true, user };
      }
      if (endpoint.startsWith('/auth/logout')) {
        localStorage.removeItem('nova_user_token');
        localStorage.removeItem('nova_user');
        return { success: true, message: 'Logged out' };
      }
    }

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    // Include credentials for CORS session cookies fallback
    options.credentials = 'include';

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP Error ${response.status}`);
      }
      return data;
    } catch (err) {
      console.error(`novaFetch failed for ${endpoint}:`, err);
      throw err;
    }
  };

  /**
   * Safe user getter to fetch decrypted profile cache.
   */
  window.novaGetUser = function () {
    try {
      const raw = localStorage.getItem('nova_user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  };
  
  /**
   * Safe admin getter to fetch active profile details.
   */
  window.novaGetAdmin = function () {
    try {
      const raw = localStorage.getItem('nova_admin_session');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  };
})();

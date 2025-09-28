/**
 * Stake RGS Wallet API Integration
 * 
 * A self-contained module that provides wallet functionality for casino games
 * connecting to the Stake RGS Wallet API.
 */
(function() {
  'use strict';

  // Default configuration
  const DEFAULT_CONFIG = {
    baseUrl: '',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'same-origin',
    debug: false
  };

  /**
   * RGSWallet - Main wallet interface
   */
  const RGSWallet = {
    // Internal state
    _state: {
      initialized: false,
      config: { ...DEFAULT_CONFIG },
      sessionID: null,
      balanceAmount: 0,
      currency: 'USD',
      pendingRequests: {}
    },

    /**
     * Initialize the wallet with configuration
     * @param {Object} config - Configuration options
     * @param {string} [config.baseUrl] - Base URL for API requests
     * @param {string} [config.sessionID] - Session ID
     * @param {Object} [config.headers] - Custom headers
     * @param {string} [config.credentials] - Fetch credentials mode
     * @param {boolean} [config.debug] - Enable debug logging
     * @returns {Object} Result object {ok, data}
     */
    init: async function(config = {}) {
      // Merge with defaults
      this._state.config = {
        ...DEFAULT_CONFIG,
        ...config,
        headers: {
          ...DEFAULT_CONFIG.headers,
          ...(config.headers || {})
        }
      };

      this._log('Initializing RGSWallet with config:', this._state.config);
      
      // Get session ID from various sources
      this._state.sessionID = this._resolveSessionID(config.sessionID);
      
      if (!this._state.sessionID) {
        return {
          ok: false,
          error: {
            code: 'ERR_IS',
            message: 'No session ID available'
          }
        };
      }

      this._state.initialized = true;
      
      // Try to authenticate with the resolved session
      return await this.authenticate();
    },

    /**
     * Authenticate the session and get initial balance
     * @returns {Object} Result object {ok, data, error}
     */
    authenticate: async function() {
      if (!this._ensureInitialized()) {
        return {
          ok: false,
          error: {
            code: 'ERR_NOT_INITIALIZED',
            message: 'Wallet not initialized'
          }
        };
      }

      const result = await this._apiRequest('/authenticate', {
        sessionID: this._state.sessionID
      });

      if (result.ok && result.data) {
        // Update internal state with balance info
        this._updateBalanceState(result.data.balance);
        
        // Store session ID in localStorage for persistence
        this._persistSessionID();
      }

      return result;
    },

    /**
     * Get current balance
     * @returns {Object} Result object {ok, data, error}
     */
    balance: async function() {
      if (!this._ensureInitialized()) {
        return {
          ok: false,
          error: {
            code: 'ERR_NOT_INITIALIZED',
            message: 'Wallet not initialized'
          }
        };
      }

      const result = await this._apiRequest('/balance', {
        sessionID: this._state.sessionID
      });

      if (result.ok && result.data) {
        // Update internal state with balance info
        this._updateBalanceState(result.data.balance);
      }

      return result;
    },

    /**
     * Place a bet
     * @param {number} amount - Bet amount (in major units, e.g. dollars)
     * @param {Object} [options] - Additional options
     * @param {string} [options.mode] - Game mode (defaults to 'BASE')
     * @returns {Object} Result object {ok, data, error}
     */
    bet: async function(amount, options = {}) {
      if (!this._ensureInitialized()) {
        return {
          ok: false,
          error: {
            code: 'ERR_NOT_INITIALIZED',
            message: 'Wallet not initialized'
          }
        };
      }

      // Convert amount to minor units (cents)
      const minorAmount = this.majorToMinor(amount);
      
      // Check if player has enough balance
      if (minorAmount > this._state.balanceAmount) {
        return {
          ok: false,
          error: {
            code: 'ERR_IPB',
            message: 'Insufficient player balance'
          }
        };
      }

      const result = await this._apiRequest('/play', {
        amount: minorAmount,
        sessionID: this._state.sessionID,
        // Use caller-provided mode first, then globally configured mode, finally fallback to "BASE"
        mode: options.mode || this._state.config.mode || 'BASE'
      });

      if (result.ok && result.data) {
        // Update internal state with new balance
        this._updateBalanceState(result.data.balance);
      }

      return result;
    },

    /**
     * Process a win
     * @param {number} amount - Win amount (in major units, e.g. dollars)
     * @param {Object} [options] - Additional options
     * @returns {Object} Result object {ok, data, error}
     */
    win: async function(amount, options = {}) {
      if (!this._ensureInitialized()) {
        return {
          ok: false,
          error: {
            code: 'ERR_NOT_INITIALIZED',
            message: 'Wallet not initialized'
          }
        };
      }

      // End the round to process the win
      const result = await this._apiRequest('/end-round', {
        sessionID: this._state.sessionID
      });

      if (result.ok && result.data) {
        // Update internal state with new balance
        this._updateBalanceState(result.data.balance);
      }

      return result;
    },

    /**
     * Get current balance in major units (dollars)
     * @returns {number} Balance in major units
     */
    getBalance: function() {
      return this.minorToMajor(this._state.balanceAmount);
    },

    /**
     * Get current balance in minor units (cents)
     * @returns {number} Balance in minor units
     */
    getBalanceMinor: function() {
      return this._state.balanceAmount;
    },

    /**
     * Get current currency
     * @returns {string} Currency code
     */
    getCurrency: function() {
      return this._state.currency;
    },

    /**
     * Convert minor units (cents) to major units (dollars)
     * @param {number} minorAmount - Amount in minor units
     * @returns {number} Amount in major units
     */
    minorToMajor: function(minorAmount) {
      return minorAmount / 100;
    },

    /**
     * Convert major units (dollars) to minor units (cents)
     * @param {number} majorAmount - Amount in major units
     * @returns {number} Amount in minor units
     */
    majorToMinor: function(majorAmount) {
      return Math.round(majorAmount * 100);
    },

    /**
     * Format amount with currency symbol
     * @param {number} amount - Amount in major units
     * @param {Object} [options] - Formatting options
     * @returns {string} Formatted amount
     */
    formatAmount: function(amount, options = {}) {
      const currency = options.currency || this._state.currency;
      const symbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£'
      };
      
      const symbol = symbols[currency] || currency;
      return `${symbol}${amount.toFixed(2)}`;
    },

    /**
     * Make an API request
     * @private
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     * @returns {Object} Result object {ok, data, error}
     */
    _apiRequest: async function(endpoint, data) {
      try {
        const { baseUrl, headers, credentials } = this._state.config;
        const url = `${baseUrl}${endpoint}`;
        
        this._log(`API Request to ${url}`, data);
        
        // Create a unique ID for this request to prevent duplicates
        const requestId = `${endpoint}-${Date.now()}`;
        
        // Check if there's already a pending request with the same ID
        if (this._state.pendingRequests[requestId]) {
          this._log(`Request ${requestId} already in progress, waiting...`);
          return await this._state.pendingRequests[requestId];
        }
        
        // Create a promise for this request
        const requestPromise = (async () => {
          try {
            const response = await fetch(url, {
              method: 'POST',
              headers,
              credentials,
              body: JSON.stringify(data)
            });
            
            // Parse response
            let responseData;
            try {
              responseData = await response.json();
            } catch (e) {
              responseData = null;
            }
            
            if (!response.ok) {
              // Handle HTTP error
              const errorCode = responseData?.error || 'ERR_GEN';
              const errorMessage = responseData?.message || 'Unknown error';
              
              this._log(`API Error (${response.status}):`, errorCode, errorMessage);
              
              return {
                ok: false,
                status: response.status,
                error: {
                  code: errorCode,
                  message: errorMessage
                }
              };
            }
            
            this._log('API Response:', responseData);
            
            return {
              ok: true,
              data: responseData
            };
          } catch (error) {
            // Handle network error
            this._log('Network Error:', error);
            
            return {
              ok: false,
              error: {
                code: 'ERR_NETWORK',
                message: 'Network error'
              }
            };
          } finally {
            // Remove this request from pending requests
            delete this._state.pendingRequests[requestId];
          }
        })();
        
        // Store the promise
        this._state.pendingRequests[requestId] = requestPromise;
        
        // Return the promise
        return await requestPromise;
      } catch (error) {
        // Handle unexpected errors
        this._log('Unexpected Error:', error);
        
        return {
          ok: false,
          error: {
            code: 'ERR_UNKNOWN',
            message: 'Unknown error'
          }
        };
      }
    },

    /**
     * Update internal balance state
     * @private
     * @param {Object} balanceData - Balance data from API
     */
    _updateBalanceState: function(balanceData) {
      if (balanceData && typeof balanceData.amount !== 'undefined') {
        this._state.balanceAmount = balanceData.amount;
        
        if (balanceData.currency) {
          this._state.currency = balanceData.currency;
        }
        
        this._log('Balance updated:', this._state.balanceAmount, this._state.currency);
      }
    },

    /**
     * Resolve session ID from various sources
     * @private
     * @param {string} [configSessionID] - Session ID from config
     * @returns {string|null} Resolved session ID or null
     */
    _resolveSessionID: function(configSessionID) {
      // 1. Try from config
      if (configSessionID) {
        this._log('Using session ID from config:', configSessionID);
        return configSessionID;
      }
      
      // 2. Try from URL query parameter
      const urlParams = new URLSearchParams(window.location.search);
      const urlSessionID = urlParams.get('sessionID');
      
      if (urlSessionID) {
        this._log('Using session ID from URL:', urlSessionID);
        return urlSessionID;
      }
      
      // 3. Try from localStorage
      try {
        const storedSessionID = localStorage.getItem('rgs.sessionID');
        
        if (storedSessionID) {
          this._log('Using session ID from localStorage:', storedSessionID);
          return storedSessionID;
        }
      } catch (e) {
        this._log('Error accessing localStorage:', e);
      }
      
      this._log('No session ID found');
      return null;
    },

    /**
     * Persist session ID to localStorage
     * @private
     */
    _persistSessionID: function() {
      if (!this._state.sessionID) return;
      
      try {
        localStorage.setItem('rgs.sessionID', this._state.sessionID);
        this._log('Session ID saved to localStorage');
      } catch (e) {
        this._log('Error saving to localStorage:', e);
      }
    },

    /**
     * Ensure wallet is initialized
     * @private
     * @returns {boolean} Whether wallet is initialized
     */
    _ensureInitialized: function() {
      if (!this._state.initialized) {
        this._log('Wallet not initialized');
        return false;
      }
      return true;
    },

    /**
     * Log debug messages
     * @private
     */
    _log: function(...args) {
      if (this._state.config.debug) {
        console.log('[RGSWallet]', ...args);
      }
    }
  };

  // Export to window
  window.RGSWallet = RGSWallet;
})();

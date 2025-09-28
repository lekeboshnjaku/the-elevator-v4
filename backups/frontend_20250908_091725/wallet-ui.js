/**
 * Stake RGS Wallet UI Integration
 * 
 * Connects the game UI to the RGSWallet module, handling:
 * - Balance display and updates
 * - Bet validation and processing
 * - Win crediting
 * - Error handling and notifications
 */
(function() {
  'use strict';

  // Configuration with defaults
  const DEFAULT_CONFIG = {
    baseUrl: '/wallet',
    debug: false,
    mode: 'BASE',
    balancePollInterval: 30000, // 30 seconds
    toastDuration: 5000,        // 5 seconds
    sessionID: null
  };

  // State management
  const state = {
    initialized: false,
    config: { ...DEFAULT_CONFIG },
    balanceBadge: null,
    betButton: null,
    betAmountInput: null,
    controlsPanel: null,
    toastContainer: null,
    balanceUpdateInterval: null,
    observer: null
  };

  /**
   * Initialize the wallet UI
   */
  async function init() {
    if (state.initialized) return;

    // Get configuration from window.RGS_CONFIG or defaults
    const userConfig = window.RGS_CONFIG || {};
    state.config = {
      ...DEFAULT_CONFIG,
      ...userConfig
    };

    // Check if RGSWallet is available
    if (!window.RGSWallet) {
      showToast('Wallet module not loaded', 'error');
      return;
    }

    log('Initializing Wallet UI with config:', state.config);

    // Create toast container
    createToastContainer();

    // Initialize the wallet
    try {
      const result = await window.RGSWallet.init({
        baseUrl: state.config.baseUrl,
        sessionID: state.config.sessionID,
        debug: state.config.debug,
        mode: state.config.mode
      });

      if (!result.ok) {
        showToast(`Wallet error: ${result.error.message}`, 'error');
        log('Wallet initialization failed:', result.error);
        return;
      }

      log('Wallet initialized successfully');
      state.initialized = true;

      // Set up UI elements
      setupUI();

      // Start balance polling
      startBalancePolling();

      // Expose win function globally
      window.RGSWalletWin = handleWin;

    } catch (error) {
      log('Error during initialization:', error);
      showToast('Failed to initialize wallet', 'error');
    }
  }

  /**
   * Set up UI elements and interactions
   */
  function setupUI() {
    // Create or update balance badge
    createOrUpdateBalanceBadge();

    // Find game controls
    findGameControls();

    // Set up mutation observer to handle React re-renders
    setupMutationObserver();
    
    // Update bet button state after controls are found
    updateBetButtonState();
  }

  /**
   * Create or update the balance badge
   */
  function createOrUpdateBalanceBadge() {
    // Try to find existing balance display
    const existingBadge = document.getElementById('rgs-balance-badge');
    
    if (existingBadge) {
      state.balanceBadge = existingBadge;
      updateBalanceDisplay();
      return;
    }

    // Find any element that might be displaying balance (contains $ and digits)
    const possibleBalanceElements = findElementsWithCurrencyAndDigits();
    
    if (possibleBalanceElements.length > 0) {
      // Use the first one found (likely in top-left)
      state.balanceBadge = possibleBalanceElements[0];
      updateBalanceDisplay();
      return;
    }

    // Create new balance badge if none found
    const badge = document.createElement('div');
    badge.id = 'rgs-balance-badge';
    badge.style.position = 'fixed';
    badge.style.top = '10px';
    badge.style.left = '10px';
    badge.style.padding = '8px 12px';
    badge.style.borderRadius = '4px';
    badge.style.background = 'rgba(0, 20, 40, 0.8)';
    badge.style.color = '#00F6FF';
    badge.style.fontWeight = 'bold';
    badge.style.fontSize = '18px';
    badge.style.zIndex = '9999';
    badge.style.boxShadow = '0 0 10px rgba(0, 246, 255, 0.5)';
    badge.style.textShadow = '0 0 5px rgba(0, 246, 255, 0.7)';
    badge.style.fontFamily = 'Inter, sans-serif';
    
    document.body.appendChild(badge);
    state.balanceBadge = badge;
    
    updateBalanceDisplay();
  }

  /**
   * Update the balance display with current wallet balance
   */
  function updateBalanceDisplay() {
    if (!state.balanceBadge || !window.RGSWallet) return;
    
    const balance = window.RGSWallet.getBalance();
    const formattedBalance = window.RGSWallet.formatAmount(balance);
    
    state.balanceBadge.textContent = formattedBalance;
    
    // Add neon effect class if it's our custom badge
    if (state.balanceBadge.id === 'rgs-balance-badge') {
      // Already styled via inline styles
    } else {
      // For existing badges, just update the text
      // Optionally enhance with subtle neon if needed
      state.balanceBadge.style.color = '#00F6FF';
      state.balanceBadge.style.textShadow = '0 0 5px rgba(0, 246, 255, 0.7)';
    }
    
    // Update bet button state after balance changes
    updateBetButtonState();
  }

  /**
   * Find game controls (bet button, amount input, controls panel)
   */
  function findGameControls() {
    // Find controls panel
    state.controlsPanel = findElementContainingTexts(['BET AMOUNT', 'WIN CHANCE']) || 
                          document.querySelector('.controls-panel');
    
    if (state.controlsPanel) {
      log('Found controls panel:', state.controlsPanel);
      
      // Find bet amount input within controls panel
      state.betAmountInput = findInputNearText('BET AMOUNT', state.controlsPanel) ||
                             findInputWithPlaceholder('0.00', state.controlsPanel);
      
      // Find place bet button
      state.betButton = findButtonWithText('PLACE BET', state.controlsPanel) ||
                        findElementWithExactText('PLACE BET', state.controlsPanel);
      
      if (state.betButton) {
        log('Found bet button:', state.betButton);
        attachBetHandler();
      } else {
        log('Bet button not found');
      }
      
      if (state.betAmountInput) {
        log('Found bet amount input:', state.betAmountInput);
        
        // Add input event listener to update bet button state when amount changes
        if (!state.betAmountInput._rgsInputHandlerAttached) {
          state.betAmountInput.addEventListener('input', updateBetButtonState);
          state.betAmountInput._rgsInputHandlerAttached = true;
        }
      } else {
        log('Bet amount input not found');
      }
      
      // Update bet button state after finding controls
      updateBetButtonState();
    } else {
      log('Controls panel not found');
    }
  }

  /**
   * Update bet button state based on current bet amount and balance
   */
  function updateBetButtonState() {
    if (!state.betButton) return;
    
    const betAmount = getBetAmount();
    let shouldDisable = false;
    
    // Disable if bet amount is invalid or zero
    if (betAmount === null || betAmount <= 0) {
      shouldDisable = true;
    } else if (window.RGSWallet) {
      // Disable if bet amount exceeds balance
      const currentBalance = window.RGSWallet.getBalance();
      if (isNaN(currentBalance) || betAmount > currentBalance) {
        shouldDisable = true;
      }
    } else {
      // Disable if wallet is not available
      shouldDisable = true;
    }
    
    // Apply visual state
    if (shouldDisable) {
      state.betButton.disabled = true;
      state.betButton.style.opacity = '0.7';
      state.betButton.style.cursor = 'not-allowed';
    } else {
      state.betButton.disabled = false;
      state.betButton.style.opacity = '';
      state.betButton.style.cursor = '';
    }
  }

  /**
   * Attach click handler to bet button
   */
  function attachBetHandler() {
    if (!state.betButton || state.betButton._rgsHandlerAttached) return;
    
    // Mark as handler attached to prevent multiple handlers
    state.betButton._rgsHandlerAttached = true;
    
    state.betButton.addEventListener('click', handleBetClick, true);
    log('Bet handler attached');
  }

  /**
   * Handle bet button click
   * @param {Event} event - Click event
   */
  async function handleBetClick(event) {
    if (!state.initialized || !window.RGSWallet) {
      showToast('Wallet not initialized', 'error');
      return;
    }
    
    // Get bet amount
    const betAmount = getBetAmount();
    if (betAmount === null) {
      showToast('Invalid bet amount', 'error');
      event.stopPropagation();
      event.preventDefault();
      return;
    }
    
    // Check if bet amount is zero
    if (betAmount === 0) {
      showToast('Bet amount cannot be zero', 'error');
      event.stopPropagation();
      event.preventDefault();
      return;
    }
    
    // Check if player has enough balance
    const currentBalance = window.RGSWallet.getBalance();
    if (betAmount > currentBalance) {
      showToast('Insufficient balance', 'error');
      updateBetButtonState();
      event.stopPropagation();
      event.preventDefault();
      return;
    }
    
    // Prevent default action temporarily
    event.stopPropagation();
    event.preventDefault();
    
    // Disable button during processing
    const originalButtonState = {
      disabled: state.betButton.disabled,
      text: state.betButton.textContent,
      style: {
        opacity: state.betButton.style.opacity,
        cursor: state.betButton.style.cursor
      }
    };
    
    state.betButton.disabled = true;
    state.betButton.style.opacity = '0.7';
    state.betButton.style.cursor = 'wait';
    state.betButton.textContent = 'Processing...';
    
    try {
      // Call wallet API to place bet
      const result = await window.RGSWallet.bet(betAmount, { mode: state.config.mode });
      
      if (!result.ok) {
        showToast(`Bet failed: ${result.error.message}`, 'error');
        log('Bet failed:', result.error);
        
        // Restore button state
        restoreButtonState();
        return;
      }
      
      // Update balance display
      updateBalanceDisplay();
      
      // Restore button state
      restoreButtonState();
      
      // Re-trigger click to continue game flow
      setTimeout(() => {
        // Create and dispatch a new click event
        const newEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        state.betButton.dispatchEvent(newEvent);
      }, 10);
      
    } catch (error) {
      log('Error during bet:', error);
      showToast('Error processing bet', 'error');
      
      // Restore button state
      restoreButtonState();
    }
    
    function restoreButtonState() {
      state.betButton.disabled = originalButtonState.disabled;
      state.betButton.textContent = originalButtonState.text;
      state.betButton.style.opacity = originalButtonState.style.opacity;
      state.betButton.style.cursor = originalButtonState.style.cursor;
      updateBetButtonState();
    }
  }

  /**
   * Handle win
   * @param {number} amount - Win amount
   */
  async function handleWin(amount) {
    if (!state.initialized || !window.RGSWallet) {
      log('Cannot process win, wallet not initialized');
      return;
    }
    
    try {
      log('Processing win:', amount);
      const result = await window.RGSWallet.win(amount);
      
      if (!result.ok) {
        log('Win processing failed:', result.error);
        return;
      }
      
      // Update balance display
      updateBalanceDisplay();
      
      // Show success toast for significant wins
      if (amount > 0) {
        showToast(`Win: ${window.RGSWallet.formatAmount(amount)}`, 'success');
      }
      
    } catch (error) {
      log('Error processing win:', error);
    }
  }

  /**
   * Get bet amount from input
   * @returns {number|null} Bet amount or null if invalid
   */
  function getBetAmount() {
    if (!state.betAmountInput) return null;
    
    let value;
    
    // Handle different input types
    if (state.betAmountInput.tagName === 'INPUT') {
      value = state.betAmountInput.value;
    } else {
      // For non-input elements, try to get text content
      value = state.betAmountInput.textContent;
    }
    
    // Clean and parse value
    value = value.replace(/[^\d.]/g, '');
    const amount = parseFloat(value);
    
    return isNaN(amount) ? null : amount;
  }

  /**
   * Start polling for balance updates
   */
  function startBalancePolling() {
    if (state.balanceUpdateInterval) {
      clearInterval(state.balanceUpdateInterval);
    }
    
    // Update balance immediately
    updateBalance();
    
    // Set up interval for periodic updates
    state.balanceUpdateInterval = setInterval(updateBalance, state.config.balancePollInterval);
    
    log('Balance polling started');
  }

  /**
   * Update balance from wallet
   */
  async function updateBalance() {
    if (!state.initialized || !window.RGSWallet) return;
    
    try {
      const result = await window.RGSWallet.balance();
      
      if (!result.ok) {
        log('Balance update failed:', result.error);
        showToast('Failed to fetch balance', 'error');
        updateBetButtonState();
        return;
      }
      
      updateBalanceDisplay();
      
    } catch (error) {
      log('Error updating balance:', error);
      showToast('Failed to fetch balance', 'error');
      updateBetButtonState();
    }
  }

  /**
   * Set up mutation observer to handle React re-renders
   */
  function setupMutationObserver() {
    if (state.observer) {
      state.observer.disconnect();
    }
    
    state.observer = new MutationObserver(function(mutations) {
      // Check if our controls are still in the DOM
      if (state.betButton && !document.contains(state.betButton)) {
        state.betButton = null;
      }
      
      if (state.betAmountInput && !document.contains(state.betAmountInput)) {
        state.betAmountInput = null;
      }
      
      if (state.controlsPanel && !document.contains(state.controlsPanel)) {
        state.controlsPanel = null;
      }
      
      // If any of our elements are missing, try to find them again
      if (!state.betButton || !state.betAmountInput || !state.controlsPanel) {
        findGameControls();
      }
      
      // Update bet button state after DOM changes
      updateBetButtonState();
    });
    
    state.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    log('Mutation observer set up');
  }

  /**
   * Create toast container
   */
  function createToastContainer() {
    if (document.getElementById('rgs-toast-container')) {
      state.toastContainer = document.getElementById('rgs-toast-container');
      return;
    }
    
    const container = document.createElement('div');
    container.id = 'rgs-toast-container';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '10000';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'flex-end';
    container.style.gap = '10px';
    
    document.body.appendChild(container);
    state.toastContainer = container;
  }

  /**
   * Show toast message
   * @param {string} message - Message to show
   * @param {string} type - Message type ('error', 'success', 'info')
   */
  function showToast(message, type = 'info') {
    if (!state.toastContainer) {
      createToastContainer();
    }
    
    const toast = document.createElement('div');
    toast.className = `rgs-toast rgs-toast-${type}`;
    toast.style.padding = '10px 15px';
    toast.style.borderRadius = '4px';
    toast.style.marginBottom = '10px';
    toast.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
    toast.style.maxWidth = '300px';
    toast.style.wordBreak = 'break-word';
    toast.style.fontFamily = 'Inter, sans-serif';
    toast.style.fontSize = '14px';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    
    // Style based on type
    if (type === 'error') {
      toast.style.backgroundColor = 'rgba(220, 38, 38, 0.9)';
      toast.style.color = 'white';
      toast.style.borderLeft = '4px solid #ef4444';
    } else if (type === 'success') {
      toast.style.backgroundColor = 'rgba(22, 163, 74, 0.9)';
      toast.style.color = 'white';
      toast.style.borderLeft = '4px solid #22c55e';
    } else {
      toast.style.backgroundColor = 'rgba(59, 130, 246, 0.9)';
      toast.style.color = 'white';
      toast.style.borderLeft = '4px solid #3b82f6';
    }
    
    toast.textContent = message;
    state.toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    }, 10);
    
    // Remove after duration
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, state.config.toastDuration);
  }

  // Utility functions

  /**
   * Find element containing all specified texts
   * @param {string[]} texts - Texts to search for
   * @param {Element} [root=document.body] - Root element to search in
   * @returns {Element|null} Found element or null
   */
  function findElementContainingTexts(texts, root = document.body) {
    if (!root || !texts || !texts.length) return null;
    
    // Try to find element containing all texts
    const elements = Array.from(root.querySelectorAll('*'));
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const content = element.textContent || '';
      
      let containsAll = true;
      for (let j = 0; j < texts.length; j++) {
        if (content.indexOf(texts[j]) === -1) {
          containsAll = false;
          break;
        }
      }
      
      if (containsAll) {
        return element;
      }
    }
    
    return null;
  }

  /**
   * Find element with exact text
   * @param {string} text - Text to search for
   * @param {Element} [root=document.body] - Root element to search in
   * @returns {Element|null} Found element or null
   */
  function findElementWithExactText(text, root = document.body) {
    if (!root || !text) return null;
    
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.nodeValue.trim() === text) {
        return node.parentNode;
      }
    }
    
    return null;
  }

  /**
   * Find button with text
   * @param {string} text - Text to search for
   * @param {Element} [root=document.body] - Root element to search in
   * @returns {Element|null} Found button or null
   */
  function findButtonWithText(text, root = document.body) {
    if (!root || !text) return null;
    
    const buttons = root.querySelectorAll('button');
    
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      if ((button.textContent || '').indexOf(text) !== -1) {
        return button;
      }
    }
    
    return null;
  }

  /**
   * Find input near text
   * @param {string} text - Text to search for
   * @param {Element} [root=document.body] - Root element to search in
   * @returns {Element|null} Found input or null
   */
  function findInputNearText(text, root = document.body) {
    if (!root || !text) return null;
    
    // Find element with text
    const textElement = findElementWithExactText(text, root);
    
    if (!textElement) {
      // Try finding any element containing the text
      const elements = Array.from(root.querySelectorAll('*'));
      
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if ((element.textContent || '').indexOf(text) !== -1) {
          // Check siblings and children for input
          const input = findNearestInput(element);
          if (input) return input;
        }
      }
      
      return null;
    }
    
    // Check for input in siblings and children
    return findNearestInput(textElement);
  }

  /**
   * Find nearest input to element
   * @param {Element} element - Element to search from
   * @returns {Element|null} Found input or null
   */
  function findNearestInput(element) {
    if (!element) return null;
    
    // Check children
    const childInput = element.querySelector('input');
    if (childInput) return childInput;
    
    // Check siblings
    let sibling = element.nextElementSibling;
    while (sibling) {
      if (sibling.tagName === 'INPUT') {
        return sibling;
      }
      
      const siblingInput = sibling.querySelector('input');
      if (siblingInput) return siblingInput;
      
      sibling = sibling.nextElementSibling;
    }
    
    // Check parent siblings
    if (element.parentNode) {
      sibling = element.parentNode.nextElementSibling;
      while (sibling) {
        if (sibling.tagName === 'INPUT') {
          return sibling;
        }
        
        const siblingInput = sibling.querySelector('input');
        if (siblingInput) return siblingInput;
        
        sibling = sibling.nextElementSibling;
      }
    }
    
    return null;
  }

  /**
   * Find input with placeholder
   * @param {string} placeholder - Placeholder text
   * @param {Element} [root=document.body] - Root element to search in
   * @returns {Element|null} Found input or null
   */
  function findInputWithPlaceholder(placeholder, root = document.body) {
    if (!root || !placeholder) return null;
    
    const inputs = root.querySelectorAll('input');
    
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      if (input.placeholder && input.placeholder.indexOf(placeholder) !== -1) {
        return input;
      }
    }
    
    return null;
  }

  /**
   * Find elements containing currency symbol and digits
   * @returns {Element[]} Found elements
   */
  function findElementsWithCurrencyAndDigits() {
    const currencySymbols = ['$', '€', '£', '¥'];
    const result = [];
    
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      const text = node.nodeValue || '';
      
      // Check if text contains currency symbol and digits
      let hasCurrency = false;
      for (let i = 0; i < currencySymbols.length; i++) {
        if (text.indexOf(currencySymbols[i]) !== -1) {
          hasCurrency = true;
          break;
        }
      }
      
      if (hasCurrency && /\d/.test(text)) {
        result.push(node.parentNode);
      }
    }
    
    return result;
  }

  /**
   * Log debug messages
   * @private
   */
  function log(...args) {
    if (state.config.debug) {
      console.log('[RGSWalletUI]', ...args);
    }
  }

  // Initialize when DOM is ready
  function domReady(fn) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(fn, 1);
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  // Start initialization
  domReady(init);

})();

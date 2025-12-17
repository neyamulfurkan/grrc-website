/**
 * utils.js
 * Utility functions for GSTU Robotics & Research Club Website
 * Includes toast notifications, modals, validation, formatting, and helpers
 */

// ============================================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================================

/**
 * Shows a toast notification
 * @param {string} message - The message to display
 * @param {string} type - Type of toast: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toastContainer');
  
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Get icon based on type
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  
  const icon = icons[type] || icons.info;
  
  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-message">${message}</div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Auto remove after duration
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
      
      // Remove container if empty
      if (toastContainer.children.length === 0) {
        toastContainer.remove();
      }
    }, 300);
  }, duration);
}

// ============================================================================
// MODAL/DIALOG SYSTEM
// ============================================================================

/**
 * Shows a modal with custom content
 * @param {string} content - HTML content to display in modal
 * @param {object} options - Modal options (title, size, closable)
 */
function showModal(content, options = {}) {
  const {
    title = '',
    size = 'medium', // small, medium, large, fullscreen
    closable = true,
    onClose = null
  } = options;
  
  // Remove existing modal if any
  closeModal();
  
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.id = 'modalOverlay';
  
  // Create modal content wrapper
  const modalContent = document.createElement('div');
  modalContent.className = `modal-content modal-${size}`;
  
  // Build modal HTML
  let modalHTML = '';
  
  if (title) {
    modalHTML += `
      <div class="modal-header">
        <h2 class="modal-title">${title}</h2>
        ${closable ? '<button class="modal-close" id="modalClose">×</button>' : ''}
      </div>
    `;
  } else if (closable) {
    modalHTML += '<button class="modal-close" id="modalClose">×</button>';
  }
  
  modalHTML += `<div class="modal-body" id="modalBody">${content}</div>`;
  
  modalContent.innerHTML = modalHTML;
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
  
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
  
  // Show modal with animation
  setTimeout(() => {
    modalOverlay.classList.add('show');
  }, 10);
  
  // Close button handler
  if (closable) {
    const closeBtn = document.getElementById('modalClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        closeModal(onClose);
      });
    }
    
    // Close on overlay click
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeModal(onClose);
      }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', handleModalEscape);
  }
  
  // Stop propagation on modal content clicks
  modalContent.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

/**
 * Closes the currently open modal
 * @param {function} callback - Optional callback to execute after closing
 */
function closeModal(callback = null) {
  const modalOverlay = document.getElementById('modalOverlay');
  
  if (modalOverlay) {
    modalOverlay.classList.remove('show');
    
    setTimeout(() => {
      modalOverlay.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleModalEscape);
      
      if (callback && typeof callback === 'function') {
        callback();
      }
    }, 300);
  }
}

/**
 * Handles Escape key for modal closing
 */
function handleModalEscape(e) {
  if (e.key === 'Escape') {
    closeModal();
  }
}

/**
 * Shows a confirmation dialog
 * @param {string} message - Confirmation message
 * @param {object} options - Dialog options
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
function confirmDialog(message, options = {}) {
  const {
    title = 'Confirm Action',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning' // success, warning, error, info
  } = options;
  
  return new Promise((resolve) => {
    const icons = {
      success: '✓',
      warning: '⚠',
      error: '✕',
      info: 'ℹ'
    };
    
    const icon = icons[type] || icons.warning;
    
    const content = `
      <div class="confirm-dialog">
        <div class="confirm-icon confirm-${type}">${icon}</div>
        <p class="confirm-message">${message}</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" id="confirmCancel">${cancelText}</button>
          <button class="btn btn-primary" id="confirmOk">${confirmText}</button>
        </div>
      </div>
    `;
    
    showModal(content, { title, closable: true });
    
    // Handle confirm
    const confirmBtn = document.getElementById('confirmOk');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        closeModal();
        resolve(true);
      });
    }
    
    // Handle cancel
    const cancelBtn = document.getElementById('confirmCancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        closeModal();
        resolve(false);
      });
    }
    
    // Handle modal close (X button or Escape)
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
      const originalClose = closeModal;
      window.closeModal = (callback) => {
        originalClose(callback);
        resolve(false);
        window.closeModal = originalClose;
      };
    }
  });
}

// ============================================================================
// DATE & TIME FORMATTING
// ============================================================================

/**
 * Formats a date string
 * @param {string|Date} date - Date to format
 * @param {string} format - Format type: 'long', 'short', 'medium', 'time', 'relative'
 * @returns {string} - Formatted date string
 */
function formatDate(date, format = 'medium') {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    
    switch (format) {
      case 'long':
        return dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      
      case 'short':
        return dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      
      case 'medium':
        return dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      
      case 'time':
        return dateObj.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
      
      case 'datetime':
        return dateObj.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      
      case 'relative':
        return getRelativeTime(dateObj);
      
      case 'iso':
        return dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
      
      default:
        return dateObj.toLocaleDateString('en-US');
    }
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
}

/**
 * Gets relative time string (e.g., "2 days ago", "in 3 hours")
 * @param {Date} date - Date to compare
 * @returns {string} - Relative time string
 */
function getRelativeTime(date) {
  const now = new Date();
  const diffMs = date - now;
  const diffSec = Math.abs(Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);
  
  const future = diffMs > 0;
  const prefix = future ? 'in ' : '';
  const suffix = future ? '' : ' ago';
  
  if (diffYear > 0) {
    return `${prefix}${diffYear} year${diffYear > 1 ? 's' : ''}${suffix}`;
  }
  if (diffMonth > 0) {
    return `${prefix}${diffMonth} month${diffMonth > 1 ? 's' : ''}${suffix}`;
  }
  if (diffWeek > 0) {
    return `${prefix}${diffWeek} week${diffWeek > 1 ? 's' : ''}${suffix}`;
  }
  if (diffDay > 0) {
    return `${prefix}${diffDay} day${diffDay > 1 ? 's' : ''}${suffix}`;
  }
  if (diffHour > 0) {
    return `${prefix}${diffHour} hour${diffHour > 1 ? 's' : ''}${suffix}`;
  }
  if (diffMin > 0) {
    return `${prefix}${diffMin} minute${diffMin > 1 ? 's' : ''}${suffix}`;
  }
  return 'just now';
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates email address
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
function validateEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates phone number (Bangladesh format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
function validatePhone(phone) {
  if (!phone) return false;
  // Accepts: +8801XXXXXXXXX, 8801XXXXXXXXX, 01XXXXXXXXX
  const phoneRegex = /^(\+880|880|0)?1[3-9]\d{8}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

/**
 * Validates URL
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid
 */
function validateURL(url) {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {object} - {valid: boolean, strength: string, message: string}
 */
function validatePassword(password) {
  if (!password) {
    return { valid: false, strength: 'none', message: 'Password is required' };
  }
  
  if (password.length < 6) {
    return { valid: false, strength: 'weak', message: 'Password must be at least 6 characters' };
  }
  
  let strength = 'weak';
  let message = 'Password is weak';
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const criteriaMet = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
  
  if (password.length >= 8 && criteriaMet >= 3) {
    strength = 'strong';
    message = 'Password is strong';
  } else if (password.length >= 6 && criteriaMet >= 2) {
    strength = 'medium';
    message = 'Password is medium strength';
  }
  
  return { valid: true, strength, message };
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

/**
 * Truncates text to specified length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to add (default: '...')
 * @returns {string} - Truncated text
 */
function truncateText(text, length = 120, suffix = '...') {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length).trim() + suffix;
}

/**
 * Capitalizes first letter of each word
 * @param {string} str - String to capitalize
 * @returns {string} - Capitalized string
 */
function capitalizeWords(str) {
  if (!str) return '';
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Converts string to slug (URL-friendly)
 * @param {string} str - String to convert
 * @returns {string} - Slug
 */
function slugify(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Escapes HTML to prevent XSS
 * @param {string} html - HTML string to escape
 * @returns {string} - Escaped HTML
 */
function escapeHTML(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

// ============================================================================
// ID GENERATION
// ============================================================================

/**
 * Generates a unique ID
 * @param {string} prefix - Optional prefix for ID
 * @returns {string} - Unique ID
 */
function generateId(prefix = '') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}${prefix ? '-' : ''}${timestamp}-${random}`;
}

/**
 * Generates a UUID v4
 * @returns {string} - UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// IMAGE UTILITIES
// ============================================================================

/**
 * Converts image file to base64 string
 * @param {File} file - Image file
 * @returns {Promise<string>} - Base64 string
 */
function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      resolve(e.target.result);
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Validates image file
 * @param {File} file - Image file
 * @param {object} options - Validation options (maxSize, allowedTypes)
 * @returns {object} - {valid: boolean, error: string}
 */
function validateImage(file, options = {}) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  } = options;
  
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Allowed: JPG, PNG, GIF, WebP' };
  }
  
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB` };
  }
  
  return { valid: true, error: null };
}

/**
 * Creates image preview element
 * @param {string} src - Image source (URL or base64)
 * @param {object} options - Preview options
 * @returns {HTMLElement} - Preview element
 */
function createImagePreview(src, options = {}) {
  const {
    className = 'image-preview',
    maxWidth = '200px',
    maxHeight = '200px',
    removable = true,
    onRemove = null
  } = options;
  
  const container = document.createElement('div');
  container.className = className;
  container.style.cssText = `position: relative; display: inline-block; max-width: ${maxWidth};`;
  
  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = `max-width: 100%; max-height: ${maxHeight}; border-radius: 8px;`;
  
  container.appendChild(img);
  
  if (removable) {
    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '×';
    removeBtn.className = 'image-preview-remove';
    removeBtn.style.cssText = `
      position: absolute;
      top: -8px;
      right: -8px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
    `;
    
    removeBtn.addEventListener('click', () => {
      container.remove();
      if (onRemove && typeof onRemove === 'function') {
        onRemove();
      }
    });
    
    container.appendChild(removeBtn);
  }
  
  return container;
}

// ============================================================================
// DEBOUNCE & THROTTLE
// ============================================================================

/**
 * Debounces a function
 * @param {function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {function} - Debounced function
 */
function debounce(func, delay = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, delay);
  };
}

/**
 * Throttles a function
 * @param {function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {function} - Throttled function
 */
function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// ============================================================================
// ARRAY & OBJECT UTILITIES
// ============================================================================

/**
 * Deep clones an object
 * @param {*} obj - Object to clone
 * @returns {*} - Cloned object
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.error('Deep clone error:', error);
    return obj;
  }
}

/**
 * Checks if object is empty
 * @param {object} obj - Object to check
 * @returns {boolean} - True if empty
 */
function isEmpty(obj) {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
  return Object.keys(obj).length === 0;
}

/**
 * Sorts array of objects by property
 * @param {array} arr - Array to sort
 * @param {string} key - Property key to sort by
 * @param {string} order - 'asc' or 'desc'
 * @returns {array} - Sorted array
 */
function sortByKey(arr, key, order = 'asc') {
  if (!Array.isArray(arr)) return arr;
  
  return arr.sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

// ============================================================================
// LOADING INDICATOR
// ============================================================================

/**
 * Shows loading indicator
 * @param {string} containerId - ID of container to show loading in
 * @param {string} message - Loading message
 */
function showLoading(containerId, message = 'Loading...') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>${message}</p>
    </div>
  `;
}

/**
 * Hides loading indicator
 * @param {string} containerId - ID of container
 */
function hideLoading(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const loadingState = container.querySelector('.loading-state');
  if (loadingState) {
    loadingState.remove();
  }
}

// ============================================================================
// COPY TO CLIPBOARD
// ============================================================================

/**
 * Copies text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - True if successful
 */
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!', 'success', 2000);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (success) {
        showToast('Copied to clipboard!', 'success', 2000);
        return true;
      }
      throw new Error('Copy failed');
    }
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    showToast('Failed to copy to clipboard', 'error');
    return false;
  }
}

// ============================================================================
// EXPORTS (Make functions globally available)
// ============================================================================

window.showToast = showToast;
window.showModal = showModal;
window.closeModal = closeModal;
window.confirmDialog = confirmDialog;
window.formatDate = formatDate;
window.getRelativeTime = getRelativeTime;
window.validateEmail = validateEmail;
window.validatePhone = validatePhone;
window.validateURL = validateURL;
window.validatePassword = validatePassword;
window.truncateText = truncateText;
window.capitalizeWords = capitalizeWords;
window.slugify = slugify;
window.escapeHTML = escapeHTML;
window.generateId = generateId;
window.generateUUID = generateUUID;
window.imageToBase64 = imageToBase64;
window.validateImage = validateImage;
window.createImagePreview = createImagePreview;
window.debounce = debounce;
window.throttle = throttle;
window.deepClone = deepClone;
window.isEmpty = isEmpty;
window.sortByKey = sortByKey;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.copyToClipboard = copyToClipboard;

console.log('✅ Utility functions loaded');

// ============================================================================
// SCROLL ANIMATION SYSTEM
// ============================================================================

/**
 * Initializes scroll animations for elements with .scroll-reveal class
 */
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      }
    });
  }, observerOptions);

  // Observe all elements with scroll-reveal class
  document.querySelectorAll('.scroll-reveal').forEach(el => {
    observer.observe(el);
  });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollAnimations);
} else {
  initScrollAnimations();
}

// Re-initialize when new content is added
window.reinitScrollAnimations = initScrollAnimations;

window.initScrollAnimations = initScrollAnimations;

// ============================================================================
// LOADING PROGRESS SYSTEM
// ============================================================================

/**
 * Shows a modern loading progress bar
 */
class LoadingProgress {
  constructor() {
    this.createProgressBar();
    this.items = [];
    this.completed = 0;
  }

  createProgressBar() {
    if (document.getElementById('loadingProgressBar')) return;
    
    const progressHTML = `
      <div id="loadingProgressBar" style="position: fixed; top: 0; left: 0; width: 100%; z-index: 10000; display: none;">
        <div style="height: 3px; background: linear-gradient(90deg, var(--primary-color), var(--secondary-color)); width: 0%; transition: width 0.3s ease; box-shadow: 0 0 10px var(--primary-color);"></div>
        <div style="background: var(--surface-color); padding: 0.75rem 1rem; text-align: center; font-size: 0.875rem; color: var(--text-primary); box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <span id="loadingProgressText">Loading...</span>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('afterbegin', progressHTML);
  }

  start(items) {
    this.items = items;
    this.completed = 0;
    const bar = document.getElementById('loadingProgressBar');
    if (bar) {
      bar.style.display = 'block';
      this.update();
    }
  }

  update() {
    const bar = document.getElementById('loadingProgressBar');
    const progressBar = bar?.querySelector('div');
    const text = document.getElementById('loadingProgressText');
    
    if (!bar || !progressBar || !text) return;

    const percentage = Math.round((this.completed / this.items.length) * 100);
    progressBar.style.width = `${percentage}%`;
    text.textContent = `Loading ${this.completed}/${this.items.length} items... ${percentage}%`;
  }

  increment() {
    this.completed++;
    this.update();
    
    if (this.completed >= this.items.length) {
      setTimeout(() => this.complete(), 300);
    }
  }

  complete() {
    const bar = document.getElementById('loadingProgressBar');
    if (bar) {
      setTimeout(() => {
        bar.style.display = 'none';
      }, 500);
    }
  }
}

window.LoadingProgress = LoadingProgress;

console.log('✅ Scroll animations and loading progress loaded');
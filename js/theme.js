/**
 * theme.js - Theme Management Module
 * GSTU Robotics & Research Club Website
 * 
 * Handles all theme-related operations including:
 * - Theme switching (light/dark mode)
 * - Theme persistence in localStorage
 * - System theme detection
 * - Smooth theme transitions
 * - Theme toggle button updates
 * - Theme event listeners
 * 
 * Dependencies: config.js (optional - has fallbacks)
 * Storage: Uses localStorage for theme persistence
 */

// ==================== CONSTANTS ====================
const THEME_CONFIG = {
  STORAGE_KEY: 'themePreference',
  THEMES: {
    LIGHT: 'light',
    DARK: 'dark'
  },
  ATTRIBUTE: 'data-theme',
  TOGGLE_BUTTON_ID: 'themeToggle',
  TRANSITION_DURATION: 300, // milliseconds
  ICONS: {
    LIGHT: '☀️',  // Sun icon for light mode
    DARK: '🌙'    // Moon icon for dark mode
  }
};

// ==================== THEME DETECTION ====================

/**
 * Detects the system's preferred color scheme
 * @returns {string} 'light' or 'dark'
 */
function detectSystemTheme() {
  try {
    // Check if browser supports prefers-color-scheme
    if (window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
      return prefersDark.matches ? THEME_CONFIG.THEMES.DARK : THEME_CONFIG.THEMES.LIGHT;
    }
  } catch (error) {
    console.error('Error detecting system theme:', error);
  }
  
  // Default to light theme if detection fails
  return THEME_CONFIG.THEMES.LIGHT;
}

/**
 * Gets the saved theme from localStorage
 * @returns {string|null} Saved theme or null
 */
function getSavedTheme() {
  try {
    const saved = localStorage.getItem(THEME_CONFIG.STORAGE_KEY);
    
    // Validate saved theme
    if (saved === THEME_CONFIG.THEMES.LIGHT || saved === THEME_CONFIG.THEMES.DARK) {
      return saved;
    }
    
    return null;
  } catch (error) {
    console.error('Error reading saved theme:', error);
    return null;
  }
}

/**
 * Gets the current active theme
 * Priority: Saved theme > System theme > Light (default)
 * @returns {string} 'light' or 'dark'
 */
function getCurrentTheme() {
  // Check saved preference first
  const saved = getSavedTheme();
  if (saved) return saved;
  
  // Check system preference
  const system = detectSystemTheme();
  return system;
}

// ==================== THEME APPLICATION ====================

/**
 * Applies a theme to the document
 * @param {string} theme - 'light' or 'dark'
 * @param {boolean} withTransition - Whether to use smooth transition
 */
function applyTheme(theme, withTransition = true) {
  // Validate theme
  if (theme !== THEME_CONFIG.THEMES.LIGHT && theme !== THEME_CONFIG.THEMES.DARK) {
    console.error(`Invalid theme: ${theme}. Using light theme.`);
    theme = THEME_CONFIG.THEMES.LIGHT;
  }
  
  try {
    const root = document.documentElement;
    
    // Add transition class if requested
    if (withTransition) {
      root.style.transition = 'background-color 0.3s ease, color 0.3s ease';
      
      // Remove transition after animation completes
      setTimeout(() => {
        root.style.transition = '';
      }, THEME_CONFIG.TRANSITION_DURATION);
    }
    
    // Apply theme attribute
    root.setAttribute(THEME_CONFIG.ATTRIBUTE, theme);
    
    // Update meta theme-color for mobile browsers
    updateMetaThemeColor(theme);
    
    // Update toggle button
    updateToggleButton(theme);
    
    // Dispatch custom event for other scripts
    dispatchThemeChangeEvent(theme);
    
    console.log(`✅ Theme applied: ${theme}`);
    
  } catch (error) {
    console.error('Error applying theme:', error);
  }
}

/**
 * Updates the meta theme-color tag for mobile browsers
 * @param {string} theme - Current theme
 */
function updateMetaThemeColor(theme) {
  try {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    // Create meta tag if it doesn't exist
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    
    // Set color based on theme
    const colors = {
      light: '#ffffff',
      dark: '#0f172a'
    };
    
    metaThemeColor.content = colors[theme] || colors.light;
    
  } catch (error) {
    console.error('Error updating meta theme color:', error);
  }
}

/**
 * Updates the theme toggle button appearance
 * @param {string} theme - Current theme
 */
function updateToggleButton(theme) {
  try {
    const toggleButton = document.getElementById(THEME_CONFIG.TOGGLE_BUTTON_ID);
    if (!toggleButton) return;
    
    // Update icon
    const iconElement = toggleButton.querySelector('.theme-icon');
    if (iconElement) {
      // Show opposite icon (if dark, show sun; if light, show moon)
      iconElement.textContent = theme === THEME_CONFIG.THEMES.DARK 
        ? THEME_CONFIG.ICONS.LIGHT 
        : THEME_CONFIG.ICONS.DARK;
    }
    
    // Update aria-label for accessibility
    toggleButton.setAttribute(
      'aria-label', 
      `Switch to ${theme === THEME_CONFIG.THEMES.DARK ? 'light' : 'dark'} mode`
    );
    
    // Add visual feedback class
    toggleButton.classList.add('theme-toggling');
    setTimeout(() => {
      toggleButton.classList.remove('theme-toggling');
    }, THEME_CONFIG.TRANSITION_DURATION);
    
  } catch (error) {
    console.error('Error updating toggle button:', error);
  }
}

/**
 * Dispatches a custom theme change event
 * @param {string} theme - New theme
 */
function dispatchThemeChangeEvent(theme) {
  try {
    const event = new CustomEvent('themeChanged', {
      detail: { theme, timestamp: new Date().toISOString() }
    });
    window.dispatchEvent(event);
  } catch (error) {
    console.error('Error dispatching theme event:', error);
  }
}

// ==================== THEME PERSISTENCE ====================

/**
 * Saves the theme preference to localStorage
 * @param {string} theme - Theme to save
 * @returns {boolean} Success status
 */
function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_CONFIG.STORAGE_KEY, theme);
    return true;
  } catch (error) {
    console.error('Error saving theme:', error);
    return false;
  }
}

/**
 * Clears the saved theme preference
 * Theme will revert to system preference on next load
 * @returns {boolean} Success status
 */
function clearSavedTheme() {
  try {
    localStorage.removeItem(THEME_CONFIG.STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing saved theme:', error);
    return false;
  }
}

// ==================== MAIN THEME FUNCTIONS ====================

/**
 * Sets a specific theme
 * @param {string} theme - 'light' or 'dark'
 * @param {boolean} persist - Whether to save to localStorage
 * @returns {boolean} Success status
 */
function setTheme(theme, persist = true) {
  // Validate theme
  if (theme !== THEME_CONFIG.THEMES.LIGHT && theme !== THEME_CONFIG.THEMES.DARK) {
    console.error(`Invalid theme: ${theme}`);
    return false;
  }
  
  // Apply theme
  applyTheme(theme, true);
  
  // Save to localStorage if requested
  if (persist) {
    saveTheme(theme);
  }
  
  return true;
}

/**
 * Toggles between light and dark themes
 * @returns {string} New theme that was applied
 */
function toggleTheme() {
  const currentTheme = getCurrentTheme();
  const newTheme = currentTheme === THEME_CONFIG.THEMES.LIGHT 
    ? THEME_CONFIG.THEMES.DARK 
    : THEME_CONFIG.THEMES.LIGHT;
  
  setTheme(newTheme, true);
  
  return newTheme;
}

/**
 * Gets the current theme without applying it
 * @returns {string} Current theme ('light' or 'dark')
 */
function getTheme() {
  return getCurrentTheme();
}

/**
 * Resets theme to system preference
 * Clears saved preference from localStorage
 */
function resetToSystemTheme() {
  clearSavedTheme();
  const systemTheme = detectSystemTheme();
  applyTheme(systemTheme, true);
  console.log(`✅ Theme reset to system preference: ${systemTheme}`);
}

// ==================== EVENT LISTENERS ====================

/**
 * Sets up the theme toggle button event listener
 */
function setupToggleButton() {
  const toggleButton = document.getElementById(THEME_CONFIG.TOGGLE_BUTTON_ID);
  
  if (!toggleButton) {
    console.warn('⚠️ Theme toggle button not found');
    return;
  }
  
  // Remove any existing listeners (prevent duplicates)
  const newButton = toggleButton.cloneNode(true);
  toggleButton.parentNode?.replaceChild(newButton, toggleButton);
  
  // Add click listener
  newButton.addEventListener('click', (e) => {
    e.preventDefault();
    toggleTheme();
  });
  
  // Add keyboard support
  newButton.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleTheme();
    }
  });
  
  console.log('✅ Theme toggle button initialized');
}

/**
 * Sets up system theme change listener
 * Automatically updates theme when system preference changes
 */
function setupSystemThemeListener() {
  try {
    if (!window.matchMedia) return;
    
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Listen for system theme changes
    const handleSystemThemeChange = (e) => {
      // Only auto-update if user hasn't set a preference
      const savedTheme = getSavedTheme();
      if (savedTheme) return; // User has a saved preference, don't override
      
      const newTheme = e.matches ? THEME_CONFIG.THEMES.DARK : THEME_CONFIG.THEMES.LIGHT;
      applyTheme(newTheme, true);
      console.log(`✅ System theme changed to: ${newTheme}`);
    };
    
    // Modern browsers
    if (darkModeQuery.addEventListener) {
      darkModeQuery.addEventListener('change', handleSystemThemeChange);
    } 
    // Legacy browsers
    else if (darkModeQuery.addListener) {
      darkModeQuery.addListener(handleSystemThemeChange);
    }
    
    console.log('✅ System theme listener initialized');
    
  } catch (error) {
    console.error('Error setting up system theme listener:', error);
  }
}

/**
 * Sets up keyboard shortcut for theme toggle
 * Ctrl/Cmd + Shift + D toggles theme
 */
function setupKeyboardShortcut() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Shift + D
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      toggleTheme();
      
      // Show brief notification
      showThemeNotification();
    }
  });
  
  console.log('✅ Theme keyboard shortcut initialized (Ctrl+Shift+D)');
}

/**
 * Shows a brief notification when theme is changed via keyboard
 */
function showThemeNotification() {
  try {
    const currentTheme = getCurrentTheme();
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'theme-notification';
    notification.textContent = `${currentTheme === THEME_CONFIG.THEMES.DARK ? '🌙 Dark' : '☀️ Light'} mode enabled`;
    notification.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      padding: 1rem 1.5rem;
      background: var(--surface-color);
      color: var(--text-primary);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      z-index: 10000;
      animation: slideInRight 0.3s ease;
      font-size: 0.875rem;
      font-weight: 500;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 2 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 2000);
    
  } catch (error) {
    console.error('Error showing theme notification:', error);
  }
}

// ==================== INITIALIZATION ====================

/**
 * Initializes the theme system
 * - Loads saved theme or detects system preference
 * - Applies theme without transition (instant)
 * - Sets up toggle button
 * - Sets up system theme listener
 * - Sets up keyboard shortcut
 */
function initTheme() {
  try {
    // Get current theme (saved or system)
    const currentTheme = getCurrentTheme();
    
    // Apply theme without transition (instant on page load)
    applyTheme(currentTheme, false);
    
    // Set up toggle button (wait for DOM)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setupToggleButton();
        setupSystemThemeListener();
        setupKeyboardShortcut();
      });
    } else {
      setupToggleButton();
      setupSystemThemeListener();
      setupKeyboardShortcut();
    }
    
    console.log(`✅ Theme.js initialized - Current theme: ${currentTheme}`);
    
  } catch (error) {
    console.error('Error initializing theme:', error);
    // Fallback to light theme
    applyTheme(THEME_CONFIG.THEMES.LIGHT, false);
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Checks if dark mode is currently active
 * @returns {boolean} True if dark mode is active
 */
function isDarkMode() {
  return getCurrentTheme() === THEME_CONFIG.THEMES.DARK;
}

/**
 * Checks if light mode is currently active
 * @returns {boolean} True if light mode is active
 */
function isLightMode() {
  return getCurrentTheme() === THEME_CONFIG.THEMES.LIGHT;
}

/**
 * Gets theme statistics
 * @returns {object} Theme info and statistics
 */
function getThemeInfo() {
  return {
    current: getCurrentTheme(),
    saved: getSavedTheme(),
    system: detectSystemTheme(),
    isDark: isDarkMode(),
    isLight: isLightMode(),
    hasSavedPreference: getSavedTheme() !== null,
    matchesSystem: getCurrentTheme() === detectSystemTheme()
  };
}

/**
 * Adds custom CSS for theme transition animations
 */
function addThemeStyles() {
  try {
    // Check if styles already added
    if (document.getElementById('theme-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'theme-styles';
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      
      .theme-toggling {
        transform: scale(0.95);
        transition: transform 0.1s ease;
      }
      
      /* Smooth theme transition for all themed elements */
      * {
        transition: background-color 0.3s ease, 
                    color 0.3s ease, 
                    border-color 0.3s ease, 
                    box-shadow 0.3s ease;
      }
      
      /* Prevent transition on page load */
      .no-transition * {
        transition: none !important;
      }
    `;
    
    document.head.appendChild(style);
    
  } catch (error) {
    console.error('Error adding theme styles:', error);
  }
}

// ==================== AUTO-INITIALIZE ====================
// Initialize theme immediately (before DOM loads to prevent flash)
if (typeof window !== 'undefined') {
  // Add styles first
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addThemeStyles);
  } else {
    addThemeStyles();
  }
  
  // Initialize theme
  initTheme();
}

// ==================== EXPORT FOR USE IN OTHER FILES ====================
// These functions are now available globally
console.log('✅ Theme.js loaded successfully');
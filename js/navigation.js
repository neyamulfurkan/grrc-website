/**
 * navigation.js
 * Handles navigation, mobile menu, scroll behavior, and dynamic content loading
 * GSTU Robotics & Research Club Website
 */

// ============================================================================
// MOBILE MENU FUNCTIONALITY
// ============================================================================

/**
 * Initializes mobile navigation menu
 */
function initMobileMenu() {
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileNavOverlay = document.getElementById('mobileNavOverlay');
  const navMenu = document.getElementById('navMenu');
  
  if (!mobileMenuToggle || !mobileNavOverlay || !navMenu) {
    console.warn('Mobile menu elements not found');
    return;
  }

  // Toggle mobile menu
  mobileMenuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMobileMenu();
  });

  // Close menu when clicking overlay
  mobileNavOverlay.addEventListener('click', () => {
    closeMobileMenu();
  });

  // Close menu when clicking nav links
  const navLinks = navMenu.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMobileMenu();
    });
  });

  // Close menu on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMenu.classList.contains('active')) {
      closeMobileMenu();
    }
  });

  // Prevent menu close when clicking inside nav menu
  navMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

/**
 * Toggles mobile menu open/closed
 */
function toggleMobileMenu() {
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileNavOverlay = document.getElementById('mobileNavOverlay');
  const navMenu = document.getElementById('navMenu');
  
  if (!navMenu) return;

  const isActive = navMenu.classList.contains('active');
  
  if (isActive) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
}

/**
 * Opens mobile menu
 */
function openMobileMenu() {
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileNavOverlay = document.getElementById('mobileNavOverlay');
  const navMenu = document.getElementById('navMenu');
  
  if (!navMenu) return;

  navMenu.classList.add('active');
  mobileNavOverlay?.classList.add('active');
  mobileMenuToggle?.classList.add('active');
  document.body.style.overflow = 'hidden'; // Prevent background scroll
}

/**
 * Closes mobile menu
 */
function closeMobileMenu() {
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileNavOverlay = document.getElementById('mobileNavOverlay');
  const navMenu = document.getElementById('navMenu');
  
  if (!navMenu) return;

  navMenu.classList.remove('active');
  mobileNavOverlay?.classList.remove('active');
  mobileMenuToggle?.classList.remove('active');
  document.body.style.overflow = ''; // Restore scroll
}

// ============================================================================
// ACTIVE PAGE HIGHLIGHTING
// ============================================================================

/**
 * Highlights the current page in navigation
 */
function highlightActivePage() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    
    // Remove any existing active class
    link.classList.remove('active');
    
    // Add active class to current page
    if (href === currentPage || 
        (currentPage === '' && href === 'index.html') ||
        (currentPage === '/' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

// ============================================================================
// SMOOTH SCROLL FOR ANCHOR LINKS
// ============================================================================

/**
 * Initializes smooth scrolling for anchor links
 */
function initSmoothScroll() {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  
  anchorLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      
      // Skip if it's just "#"
      if (targetId === '#' || targetId === '#!') {
        e.preventDefault();
        return;
      }
      
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        e.preventDefault();
        
        // Close mobile menu if open
        closeMobileMenu();
        
        // Calculate offset (to account for fixed header)
        const header = document.querySelector('.header');
        const headerHeight = header ? header.offsetHeight : 80;
        const targetPosition = targetElement.offsetTop - headerHeight - 20;
        
        // Smooth scroll to target
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
        
        // Update URL hash without jumping
        if (history.pushState) {
          history.pushState(null, null, targetId);
        }
      }
    });
  });
}

// ============================================================================
// HEADER SCROLL BEHAVIOR (Hide/Show on Scroll)
// ============================================================================

let lastScrollTop = 0;
let scrollDirection = 'up';
let ticking = false;

/**
 * Initializes header scroll behavior
 * Header hides when scrolling down, shows when scrolling up
 */
function initHeaderScroll() {
  const header = document.querySelector('.header');
  
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        handleHeaderScroll(header);
        ticking = false;
      });
      ticking = true;
    }
  });
}

/**
 * Handles header visibility based on scroll direction
 */
function handleHeaderScroll(header) {
  const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
  
  // Don't hide header at the very top
  if (currentScroll <= 100) {
    header.classList.remove('header-hidden');
    header.classList.add('header-visible');
    lastScrollTop = currentScroll;
    return;
  }
  
  // Determine scroll direction
  if (currentScroll > lastScrollTop) {
    // Scrolling down
    if (scrollDirection !== 'down') {
      scrollDirection = 'down';
      header.classList.add('header-hidden');
      header.classList.remove('header-visible');
      closeMobileMenu(); // Close menu when scrolling down
    }
  } else {
    // Scrolling up
    if (scrollDirection !== 'up') {
      scrollDirection = 'up';
      header.classList.remove('header-hidden');
      header.classList.add('header-visible');
    }
  }
  
  lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
}

// ============================================================================
// LOAD CLUB LOGO & NAME IN HEADER/FOOTER
// ============================================================================

/**
 * Loads club logo and name from localStorage into header and footer
 */
function loadClubBranding() {
  try {
    const config = JSON.parse(localStorage.getItem('clubConfig')) || {};
    
    // Load logo in header
    const clubLogo = document.getElementById('clubLogo');
    if (clubLogo && config.logo) {
      clubLogo.src = config.logo;
      clubLogo.onerror = () => {
        clubLogo.src = 'assets/default-logo.svg'; // Fallback
      };
    }
    
    // Load club name in header
    const clubName = document.getElementById('clubName');
    if (clubName && config.name) {
      clubName.textContent = config.name;
    }
    
    // Load description in footer
    const footerDescription = document.getElementById('footerDescription');
    if (footerDescription && config.description) {
      footerDescription.textContent = truncateText(config.description, 150);
    }
    
    // Load social links in footer
    loadFooterSocialLinks(config.socialLinks || []);
    
    // Update copyright year
    const currentYear = document.getElementById('currentYear');
    if (currentYear) {
      currentYear.textContent = new Date().getFullYear();
    }
    
  } catch (error) {
    console.error('Error loading club branding:', error);
  }
}

/**
 * Loads social links into footer
 */
function loadFooterSocialLinks(socialLinks) {
  const container = document.getElementById('footerSocialLinks');
  if (!container) return;
  
  if (!socialLinks || socialLinks.length === 0) {
    container.innerHTML = '<p class="text-secondary">No social links available</p>';
    return;
  }
  
  const socialIcons = {
    facebook: '📘',
    twitter: '🐦',
    instagram: '📷',
    linkedin: '💼',
    youtube: '📺',
    github: '💻',
    email: '📧',
    whatsapp: '💬',
    telegram: '✈️',
    discord: '💬'
  };
  
  const html = socialLinks.map(link => {
    const icon = socialIcons[link.platform?.toLowerCase()] || '🔗';
    const url = link.url || '#';
    const platform = link.platform || 'Link';
    
    return `
      <a href="${url}" target="_blank" rel="noopener noreferrer" 
         class="social-link" title="${platform}">
        <span class="social-icon">${icon}</span>
      </a>
    `;
  }).join('');
  
  container.innerHTML = html;
}

// ============================================================================
// BREADCRUMB NAVIGATION (Optional Enhancement)
// ============================================================================

/**
 * Generates breadcrumb navigation based on current page
 */
function generateBreadcrumb() {
  const breadcrumbContainer = document.getElementById('breadcrumb');
  if (!breadcrumbContainer) return;
  
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const pageNames = {
    'index.html': 'Home',
    'members.html': 'Members',
    'events.html': 'Events',
    'projects.html': 'Projects',
    'gallery.html': 'Gallery',
    'admin.html': 'Admin Login',
    'admin-panel.html': 'Admin Panel'
  };
  
  const pageName = pageNames[currentPage] || 'Page';
  
  let breadcrumbHTML = `
    <nav class="breadcrumb">
      <a href="index.html">Home</a>
  `;
  
  if (currentPage !== 'index.html' && currentPage !== '') {
    breadcrumbHTML += `
      <span class="breadcrumb-separator">/</span>
      <span class="breadcrumb-current">${pageName}</span>
    `;
  }
  
  breadcrumbHTML += '</nav>';
  
  breadcrumbContainer.innerHTML = breadcrumbHTML;
}

// ============================================================================
// BACK TO TOP BUTTON
// ============================================================================

/**
 * Initializes "Back to Top" button functionality
 */
function initBackToTop() {
  const backToTopBtn = document.getElementById('backToTop');
  if (!backToTopBtn) return;
  
  // Show/hide button based on scroll position
  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
      backToTopBtn.classList.add('visible');
    } else {
      backToTopBtn.classList.remove('visible');
    }
  });
  
  // Scroll to top on click
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

// ============================================================================
// NAVIGATION DROPDOWN (For future sub-menus)
// ============================================================================

/**
 * Initializes dropdown menus in navigation (if needed)
 */
function initDropdowns() {
  const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
  
  dropdownToggles.forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      const dropdown = toggle.nextElementSibling;
      
      if (dropdown && dropdown.classList.contains('dropdown-menu')) {
        dropdown.classList.toggle('active');
      }
    });
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown-menu.active').forEach(menu => {
        menu.classList.remove('active');
      });
    }
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Truncates text to specified length
 */
function truncateText(text, maxLength = 120) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Checks if device is mobile
 */
function isMobileDevice() {
  return window.innerWidth < 768;
}

/**
 * Debounce function for performance optimization
 */
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ============================================================================
// WINDOW RESIZE HANDLER
// ============================================================================

/**
 * Handles window resize events
 */
function handleResize() {
  // Close mobile menu on desktop
  if (window.innerWidth >= 768) {
    closeMobileMenu();
  }
  
  // Update header behavior
  const header = document.querySelector('.header');
  if (header && window.pageYOffset <= 100) {
    header.classList.remove('header-hidden');
    header.classList.add('header-visible');
  }
}

// Debounced resize handler
const debouncedResize = debounce(handleResize, 250);
window.addEventListener('resize', debouncedResize);

// ============================================================================
// MAIN INITIALIZATION FUNCTION
// ============================================================================

/**
 * Initializes all navigation features
 * Call this function from each page's DOMContentLoaded event
 */
function initNavigation() {
  // Core navigation features
  initMobileMenu();
  highlightActivePage();
  initSmoothScroll();
  initHeaderScroll();
  
  // Load club branding
  loadClubBranding();
  
  // Optional features (if elements exist)
  generateBreadcrumb();
  initBackToTop();
  initDropdowns();
  
  console.log('✅ Navigation initialized');
}




function initNavigation() {
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileNavOverlay = document.getElementById('mobileNavOverlay');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  if (mobileMenuToggle && mobileNavOverlay) {
    // Toggle mobile menu
    mobileMenuToggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const isActive = mobileNavOverlay.classList.contains('active');
      
      if (isActive) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });

    // Close on overlay click
    mobileNavOverlay.addEventListener('click', function(e) {
      if (e.target === mobileNavOverlay) {
        closeMobileMenu();
      }
    });

    // Close on link click
    mobileNavLinks.forEach(link => {
      link.addEventListener('click', function() {
        closeMobileMenu();
      });
    });

    // Close on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && mobileNavOverlay.classList.contains('active')) {
        closeMobileMenu();
      }
    });
  }

  function openMobileMenu() {
    mobileNavOverlay.classList.add('active');
    mobileMenuToggle.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    mobileNavOverlay.classList.remove('active');
    mobileMenuToggle.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavigation);
} else {
  initNavigation();
}
// ============================================================================
// AUTO-INITIALIZATION (if this file is loaded directly)
// ============================================================================

// Auto-init if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavigation);
} else {
  initNavigation();
}
// Ensure page is immediately interactive
document.addEventListener('DOMContentLoaded', function() {
  // Remove loading class from body
  document.body.classList.remove('loading');
  document.body.classList.add('loaded');
  
  // Force enable pointer events
  document.body.style.pointerEvents = 'auto';
  
  // Ensure all interactive elements are enabled
  const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, .btn, .mobile-menu-toggle, .theme-toggle');
  interactiveElements.forEach(el => {
    el.style.pointerEvents = 'auto';
  });
});

// Backup: Enable after a short delay if DOMContentLoaded didn't fire
setTimeout(() => {
  document.body.classList.remove('loading');
  document.body.classList.add('loaded');
  document.body.style.pointerEvents = 'auto';
}, 100);
// ============================================================================
// EXPORTS (for use in other modules)
// ============================================================================

// Make functions available globally
window.initNavigation = initNavigation;
window.loadClubBranding = loadClubBranding;
window.closeMobileMenu = closeMobileMenu;
window.openMobileMenu = openMobileMenu;
window.toggleMobileMenu = toggleMobileMenu;
window.highlightActivePage = highlightActivePage;
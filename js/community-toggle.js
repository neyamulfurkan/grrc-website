/**
 * community-toggle.js
 * Floating Community Button (appears on all pages)
 * Auto-loads on every page like chatbot
 */

(function() {
  'use strict';
  
  // Create floating button HTML
  const buttonHTML = `
    <button id="communityToggle" class="community-toggle" aria-label="Open Community Chat">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <span class="community-badge" id="communityBadge" style="display: none;">0</span>
      <span class="community-label">Community</span>
    </button>
  `;
  
  // Create styles
  const styles = `
    <style>
      .community-toggle {
        position: fixed;
        bottom: 24px;
        right: 180px;
        width: 140px;
        height: 56px;
        background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
        border: none;
        border-radius: 28px;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 999;
        transition: all 0.3s ease;
        font-weight: 600;
        font-size: 14px;
      }
      
      .community-toggle:hover {
        transform: translateY(-3px);
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
      }
      
      .community-toggle svg {
        width: 20px;
        height: 20px;
      }
      
      .community-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ef4444;
        color: white;
        border-radius: 10px;
        padding: 2px 6px;
        font-size: 11px;
        font-weight: bold;
        min-width: 20px;
        text-align: center;
      }
      
      .community-label {
        font-size: 14px;
      }
      
      @media (max-width: 768px) {
        .community-toggle {
          width: 56px;
          height: 56px;
          bottom: 24px;
          right: 90px;
        }
        
        .community-label {
          display: none;
        }
      }
    </style>
  `;
  
  // Wait for DOM to load
  function init() {
    // Inject styles
    document.head.insertAdjacentHTML('beforeend', styles);
    
    // Inject button
    document.body.insertAdjacentHTML('beforeend', buttonHTML);
    
    // Add click handler
    const toggleBtn = document.getElementById('communityToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        window.location.href = 'community.html';
      });
    }
    
    console.log('✅ Community toggle button initialized');
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
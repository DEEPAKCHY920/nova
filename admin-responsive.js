/* ================================================================
   NOVA — ADMIN RESPONSIVE JS  (admin-responsive.js)
   Initializes sidebar drawer toggles, overlay creation,
   and mobile touch gestures for the admin panel.
   ================================================================ */
(function () {
  'use strict';

  function initResponsiveFeatures() {
    // 1. Ensure overlay exists in the DOM
    let overlay = document.querySelector('.sb-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sb-overlay';
      document.body.appendChild(overlay);
    }

    const sidebar = document.querySelector('.sb');
    
    // 2. Add responsive menu triggers dynamically in header if missing
    document.querySelectorAll('.hdr').forEach((header) => {
      let trigger = header.querySelector('.hdr-trigger');
      if (!trigger) {
        // Create hamburger trigger
        trigger = document.createElement('button');
        trigger.className = 'hdr-trigger';
        trigger.setAttribute('aria-label', 'Toggle Navigation Menu');
        trigger.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        `;
        
        // Insert trigger at the start of header
        header.insertBefore(trigger, header.firstChild);
      }

      // Add click handler
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (sidebar) {
          sidebar.classList.toggle('open');
          overlay.classList.toggle('open');
        }
      });
    });

    // 3. Close sidebar when clicking outside or clicking overlay
    overlay.addEventListener('click', () => {
      if (sidebar) {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
      }
    });

    // 4. Close on navigation inside mobile drawer
    if (sidebar) {
      sidebar.querySelectorAll('.ni').forEach((link) => {
        link.addEventListener('click', () => {
          sidebar.classList.remove('open');
          overlay.classList.remove('open');
        });
      });
    }

    // 5. Prevent body scroll when menu is active on mobile
    const observer = new MutationObserver(() => {
      if (sidebar && sidebar.classList.contains('open')) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
    if (sidebar) {
      observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initResponsiveFeatures);
  } else {
    initResponsiveFeatures();
  }
})();

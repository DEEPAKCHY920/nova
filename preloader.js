// IIFE to immediately hide body and lock scroll before body parses.
// Skipped on repeat visits this session — preloader runs only ONCE per session.
(function() {
  // If preloader was already shown this session, skip body-hiding entirely.
  if (sessionStorage.getItem('nova_preloader_seen')) {
    // Just ensure body is immediately visible — no animation needed.
    const ensureVisible = function() {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.visibility = 'visible';
      document.body.classList.add('is-loaded');
    };
    if (document.body) {
      ensureVisible();
    } else {
      document.addEventListener('DOMContentLoaded', ensureVisible);
    }
    return;
  }

  if (!document.getElementById('preloader-temp-style')) {
    const tempStyle = document.createElement('style');
    tempStyle.id = 'preloader-temp-style';
    tempStyle.textContent = 'body { visibility: hidden !important; overflow: hidden !important; } html { overflow: hidden !important; }';
    if (document.head) {
      document.head.appendChild(tempStyle);
    } else {
      const observer = new MutationObserver(() => {
        if (document.head) {
          document.head.appendChild(tempStyle);
          observer.disconnect();
        }
      });
      observer.observe(document.documentElement, { childList: true });
    }

    // Safety fallback: if preloader fails to initialize or complete in 8 seconds, reveal body anyway.
    setTimeout(() => {
      const temp = document.getElementById('preloader-temp-style');
      if (temp) {
        temp.remove();
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        sessionStorage.setItem('nova_preloader_seen', '1');
        console.warn('[Preloader] Safety timeout reached. Revealing body.');
      }
    }, 8000);
  }
})();

class AssetPreloader {
  constructor(options = {}) {
    this.options = {
      autoStart: true,
      debug: false,
      timeout: 15000, // Safe fallback timeout (15 seconds)
      onProgress: null,
      onComplete: null,
      customAssets: [], // Extra URLs to load (e.g. sequence frames)
      ...options
    };

    this.assets = [];
    this.loadedCount = 0;
    this.totalCount = 0;
    this.currentProgress = 0;
    this.targetProgress = 0;
    this.hasCompleted = false;
    this.timer = null;
    this.progressAnimation = null;
    this.scrollLockHandler = null;

    if (this.options.autoStart) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.init());
      } else {
        this.init();
      }
    }
  }

  init() {
    // 1. Remove the temporary body-hiding stylesheet to let loader render
    const tempStyle = document.getElementById('preloader-temp-style');
    if (tempStyle) tempStyle.remove();

    // 2. Lock scrolling immediately to prevent user interaction during loading
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    if (!this.scrollLockHandler) {
      this.scrollLockHandler = (e) => e.preventDefault();
      window.addEventListener('wheel', this.scrollLockHandler, { passive: false });
      window.addEventListener('touchmove', this.scrollLockHandler, { passive: false });
    }

    this.loaderEl = document.getElementById('loader');
    
    // Inject loader HTML and CSS dynamically if not present in the markup
    if (!this.loaderEl) {
      this.injectLoader();
    }

    this.loaderFill = document.getElementById('loaderFill');
    this.loaderPct = document.getElementById('loaderPct');

    this.gatherAssets();
    this.startLoading();
  }

  injectLoader() {
    // 1. Inject loader CSS styles
    const styles = `
      .loader {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--void, #08080a);
      }
      .loader__bg {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(60% 50% at 30% 20%, var(--key-soft, rgba(106, 176, 255, 0.16)), transparent 60%),
          radial-gradient(50% 45% at 75% 80%, var(--rim-soft, rgba(255, 177, 94, 0.14)), transparent 60%);
        filter: blur(40px);
      }
      .loader__content {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 28px;
      }
      .loader__mark {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--platinum, #f3f1ea);
      }
      .loader__mark svg {
        width: 28px;
        height: 28px;
      }
      .loader__mark span {
        font-family: var(--f-display, sans-serif);
        font-weight: 600;
        font-size: 20px;
        letter-spacing: 0.12em;
      }
      .loader__meter {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .loader__bar {
        width: 220px;
        height: 2px;
        background: var(--line, rgba(243, 241, 234, 0.1));
        border-radius: 2px;
        overflow: hidden;
      }
      .loader__bar-fill {
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, var(--key, #6ab0ff), var(--rim, #ffb15e));
      }
      .loader__pct {
        font-family: var(--f-mono, monospace);
        font-size: 13px;
        color: var(--platinum-dim, rgba(243, 241, 234, 0.62));
        min-width: 34px;
      }
      .loader__label {
        font-family: var(--f-mono, monospace);
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--platinum-faint, rgba(243, 241, 234, 0.34));
        margin: 0;
      }
      .is-loaded .loader {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition: opacity 0.9s cubic-bezier(.16, 1, .3, 1), visibility 0.9s;
      }
    `;
    const styleEl = document.createElement('style');
    styleEl.id = 'preloader-injected-styles';
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    // 2. Inject loader HTML structure
    const loader = document.createElement('div');
    loader.id = 'loader';
    loader.className = 'loader';
    loader.innerHTML = `
      <div class="loader__bg"></div>
      <div class="loader__content">
        <div class="loader__mark">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 30 L18 14 L26 24 L34 12 L42 30" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>NOVA</span>
        </div>
        <div class="loader__meter">
          <div class="loader__bar">
            <div class="loader__bar-fill" id="loaderFill"></div>
          </div>
          <div class="loader__pct"><span id="loaderPct">0</span>%</div>
        </div>
        <p class="loader__label">Preparing the studio</p>
      </div>
    `;
    document.body.prepend(loader);
    this.loaderEl = loader;
  }

  gatherAssets() {
    const urls = new Set();

    // 1. Gather all <img> tags
    document.querySelectorAll('img').forEach(img => {
      const src = img.src || img.getAttribute('src');
      if (src && !src.startsWith('data:') && !src.includes('placeholder')) {
        urls.add(src);
      }
      const srcset = img.getAttribute('srcset');
      if (srcset) {
        srcset.split(',').forEach(part => {
          const url = part.trim().split(/\s+/)[0];
          if (url && !url.startsWith('data:')) {
            urls.add(url);
          }
        });
      }
    });

    // 2. Gather background images from elements currently in the DOM using computed styles.
    // This works under file:// protocol where stylesheet rule scanning is blocked by browser security.
    document.querySelectorAll('*').forEach(el => {
      const bg = el.style.backgroundImage;
      if (bg && bg !== 'none' && bg.startsWith('url(')) {
        const url = bg.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
        if (url && !url.startsWith('data:')) {
          urls.add(url);
        }
      }
      
      // Also check computed background-image (from stylesheets)
      try {
        const computedBg = window.getComputedStyle(el).backgroundImage;
        if (computedBg && computedBg !== 'none' && computedBg.startsWith('url(')) {
          const url = computedBg.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
          if (url && !url.startsWith('data:') && !url.startsWith('linear-gradient') && !url.startsWith('radial-gradient')) {
            urls.add(url);
          }
        }
      } catch (e) {
        // ignore errors on pseudoelements or detached elements
      }
    });

    // 3. Stylesheet scanning fallback (works on http/https servers)
    try {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (rules) {
            Array.from(rules).forEach(rule => {
              if (rule.style && rule.style.backgroundImage) {
                const bg = rule.style.backgroundImage;
                if (bg && bg.startsWith('url(')) {
                  const url = bg.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
                  if (url && !url.startsWith('data:') && !url.startsWith('linear-gradient') && !url.startsWith('radial-gradient')) {
                    const resolved = this.resolveUrl(url, sheet.href || window.location.href);
                    urls.add(resolved);
                  }
                }
              }
            });
          }
        } catch (e) {
          // Cross-origin restrictions might prevent stylesheet rule access.
        }
      });
    } catch (e) {
      if (this.options.debug) console.warn('Could not read stylesheets:', e);
    }

    // 4. Add custom registered assets (e.g. sequence frames)
    if (this.options.customAssets && this.options.customAssets.length > 0) {
      this.options.customAssets.forEach(url => {
        if (url) {
          // Ensure custom asset URLs are absolute
          const absoluteUrl = this.resolveUrl(url, window.location.href);
          urls.add(absoluteUrl);
        }
      });
    }

    this.assets = Array.from(urls);
    this.totalCount = this.assets.length;
    this.loadedCount = 0;

    if (this.options.debug) {
      console.log(`[Preloader] Found ${this.totalCount} assets to preload:`, this.assets);
    }
  }

  resolveUrl(url, baseUrl) {
    try {
      return new URL(url, baseUrl).href;
    } catch (e) {
      return url;
    }
  }

  startLoading() {
    if (this.totalCount === 0) {
      this.complete();
      return;
    }

    // Safety fallback timer to prevent infinite loading state
    this.timer = setTimeout(() => {
      if (this.options.debug) console.warn('[Preloader] Timeout reached. Forcing completion.');
      this.complete();
    }, this.options.timeout);

    // Track fonts loading if supported
    let fontsPromise = Promise.resolve();
    if (document.fonts) {
      fontsPromise = document.fonts.ready;
    }

    // Track all asset loads
    const assetPromises = this.assets.map(url => this.preloadAsset(url));

    // Wait for fonts and all assets
    Promise.all([fontsPromise, ...assetPromises]).then(() => {
      this.complete();
    }).catch(err => {
      if (this.options.debug) console.error('[Preloader] Error during load, booting anyway:', err);
      this.complete();
    });

    // Start smooth progression ticker
    this.tickProgress();
  }

  preloadAsset(url) {
    return new Promise((resolve) => {
      const ext = url.split('.').pop().split('?')[0].toLowerCase();
      const isVideo = ['mp4', 'webm', 'ogg'].includes(ext);

      if (isVideo) {
        const video = document.createElement('video');
        video.src = url;
        video.preload = 'auto';
        video.oncanplaythrough = video.onerror = () => {
          this.assetLoaded(url, video);
          resolve();
        };
      } else {
        const img = new Image();
        img.onload = img.onerror = () => {
          this.assetLoaded(url, img);
          resolve();
        };
        img.src = url;
      }
    });
  }

  assetLoaded(url, assetObj) {
    this.loadedCount++;
    this.targetProgress = (this.loadedCount / this.totalCount) * 100;
    
    // Call user-provided progress hook
    if (this.options.onProgress) {
      this.options.onProgress(this.targetProgress, url, assetObj);
    }
  }

  tickProgress() {
    const update = () => {
      const diff = this.targetProgress - this.currentProgress;
      if (diff > 0.05) {
        // Smoothly interpolate towards target
        this.currentProgress += diff * 0.08;
        this.setLoaderUI(this.currentProgress);
        this.progressAnimation = requestAnimationFrame(update);
      } else {
        this.currentProgress = this.targetProgress;
        this.setLoaderUI(this.currentProgress);
        if (this.currentProgress < 100) {
          this.progressAnimation = requestAnimationFrame(update);
        }
      }
    };
    this.progressAnimation = requestAnimationFrame(update);
  }

  setLoaderUI(pct) {
    const roundedPct = Math.round(pct);
    if (this.loaderFill) {
      this.loaderFill.style.width = roundedPct + '%';
    }
    if (this.loaderPct) {
      this.loaderPct.textContent = roundedPct;
    }
  }

  complete() {
    if (this.hasCompleted) return;
    this.hasCompleted = true;
    clearTimeout(this.timer);

    if (this.progressAnimation) {
      cancelAnimationFrame(this.progressAnimation);
    }

    this.targetProgress = 100;
    this.setLoaderUI(100);

    setTimeout(() => {
      // Re-enable scrolling
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      window.removeEventListener('wheel', this.scrollLockHandler);
      window.removeEventListener('touchmove', this.scrollLockHandler);

      // Trigger reveal animation in CSS (fades loader out)
      document.body.classList.add('is-loaded');

      // Mark as seen so subsequent pages skip the animation
      sessionStorage.setItem('nova_preloader_seen', '1');

      if (this.options.onComplete) {
        this.options.onComplete();
      }

      // Dispatch global custom event for other scripts
      window.dispatchEvent(new CustomEvent('assetsLoaded'));

      if (this.options.debug) console.log('[Preloader] Load complete, site running.');
    }, 500); // Small delay to let user see 100% complete bar
  }
}

// Auto-run unless manual boot is requested OR already seen this session
if (!window.disablePreloaderAutoRun && !sessionStorage.getItem('nova_preloader_seen')) {
  window.preloaderInstance = new AssetPreloader({ debug: true });
} else if (sessionStorage.getItem('nova_preloader_seen')) {
  // Already seen — ensure body is fully revealed immediately on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.visibility = 'visible';
    document.body.classList.add('is-loaded');
    // Clean up the temp style if it somehow persisted
    const temp = document.getElementById('preloader-temp-style');
    if (temp) temp.remove();
  });
}

/* ---------------------------------------------------------
   GLOBAL SEARCH BAR OVERLAY
--------------------------------------------------------- */
window.PRODUCTS = [
  { id: 'nova-surge-x1', name: 'Nova Surge X1', category: 'Running', gender: 'men', size: [8, 9, 10, 11], price: 8999, img: 'assets/images/product_surge.png', stars: 5, reviews: 128, new: false, bestseller: true, discount: 0, color: 'orange', features: ['air', 'lightweight', 'breathable'] },
  { id: 'nova-phantom', name: 'Nova Phantom', category: 'Running', gender: 'men', size: [7, 8, 9, 10], price: 7999, img: 'assets/images/product_phantom.png', stars: 5, reviews: 96, new: false, bestseller: true, discount: 0, color: 'white', features: ['lightweight', 'breathable'] },
  { id: 'nova-air-pro', name: 'Nova Air Pro', category: 'Training', gender: 'unisex', size: [6, 7, 8, 9, 10], price: 8499, img: 'assets/images/product_air_pro.png', stars: 5, reviews: 76, new: true, bestseller: false, discount: 0, color: 'white', features: ['air', 'breathable', 'grip'] },
  { id: 'nova-edge', name: 'Nova Edge', category: 'Basketball', gender: 'men', size: [9, 10, 11, 12, 13], price: 6999, img: 'assets/images/product_edge.png', stars: 5, reviews: 88, new: false, bestseller: false, discount: 0, color: 'red', features: ['grip'] },
  { id: 'nova-boost', name: 'Nova Boost', category: 'Running', gender: 'men', size: [8, 9, 10], price: 7499, oldPrice: 8299, img: 'assets/images/product_boost.png', stars: 5, reviews: 142, new: false, bestseller: false, discount: 10, color: 'blue', features: ['air', 'lightweight'] },
  { id: 'nova-drift', name: 'Nova Drift', category: 'Lifestyle', gender: 'unisex', size: [6, 7, 8, 9, 10, 11], price: 5499, img: 'assets/images/product_drift.png', stars: 5, reviews: 58, new: true, bestseller: false, discount: 0, color: 'green', features: ['lightweight', 'breathable'] },
  { id: 'nova-lite', name: 'Nova Lite', category: 'Training', gender: 'women', size: [6, 7, 8, 9], price: 4999, img: 'assets/images/product_lite.png', stars: 5, reviews: 64, new: false, bestseller: false, discount: 0, color: 'purple', features: ['lightweight'] },
  { id: 'nova-trail', name: 'Nova Trail', category: 'Hiking', gender: 'men', size: [7, 8, 9, 10, 11, 12], price: 6799, oldPrice: 7999, img: 'assets/images/product_trail.png', stars: 5, reviews: 41, new: false, bestseller: false, discount: 15, color: 'white', features: ['grip', 'waterproof'] },
  { id: 'nova-motion', name: 'Nova Motion', category: 'Running', gender: 'women', size: [6, 7, 8], price: 6299, img: 'assets/images/product_motion.png', stars: 5, reviews: 33, new: false, bestseller: false, discount: 0, color: 'red', features: ['air', 'breathable'] },
  { id: 'nova-flow', name: 'Nova Flow', category: 'Lifestyle', gender: 'women', size: [6, 7, 8, 9], price: 5999, img: 'assets/images/product_flow.png', stars: 5, reviews: 27, new: true, bestseller: false, discount: 0, color: 'yellow', features: ['lightweight', 'breathable'] },
  { id: 'nova-carbon', name: 'Nova Carbon', category: 'Running', gender: 'women', size: [8, 9, 10, 11, 12], price: 10999, img: 'assets/images/product_carbon.png', stars: 5, reviews: 19, new: false, bestseller: false, discount: 0, color: 'purple', features: ['air', 'lightweight', 'breathable'] },
  { id: 'nova-flex', name: 'Nova Flex', category: 'Training', gender: 'unisex', size: [6, 7, 8, 9, 10], price: 4799, img: 'assets/images/product_flex.png', stars: 5, reviews: 22, new: false, bestseller: false, discount: 0, color: 'purple', features: ['lightweight', 'grip'] }
];

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', (e) => {
    const searchBtn = e.target.closest('[aria-label="Search"]');
    if (searchBtn) {
      e.preventDefault();
      openSearchOverlay();
      return;
    }

    const accountBtn = e.target.closest('[aria-label="Account"]') || e.target.closest('a[href="login.html"]');
    if (accountBtn) {
      e.preventDefault();
      const user = localStorage.getItem('nova_user');
      if (user) {
        window.location.href = 'dashboard.html';
      } else {
        window.location.href = 'login.html';
      }
      return;
    }

    // Global cart button handler — works on ALL pages
    const cartBtn = e.target.closest('[aria-label="Cart"], .nav__cart-btn, #cartToggleBtn');
    if (cartBtn) {
      e.preventDefault();
      const existingDrawer = document.getElementById('cartDrawer');
      if (existingDrawer) {
        existingDrawer.classList.add('is-open');
        return;
      }
      openGlobalCart();
    }
  });

  // Keep navbar cart count badge synced on every page
  function syncCartCount() {
    try {
      const cart = JSON.parse(localStorage.getItem('nova_cart')) || [];
      const count = cart.reduce((a, i) => a + i.qty, 0);
      document.querySelectorAll('#cartCount, .nav__cart-count').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
      });
    } catch (_) {}
  }
  syncCartCount();
  window.addEventListener('cartUpdated', syncCartCount);
  window.addEventListener('storage', (e) => { if (e.key === 'nova_cart') syncCartCount(); });
});

/* ---------------------------------------------------------
   GLOBAL AUTH GUARD — requireLogin()
   Call this before any action that requires authentication.
   Returns true if user is logged in, false + shows modal if not.
--------------------------------------------------------- */
window.requireLogin = function(message) {
  if (localStorage.getItem('nova_user')) return true;
  showLoginWall(message || 'Please sign in to continue.');
  return false;
};

function showLoginWall(message) {
  if (document.getElementById('novaLoginWall')) {
    // Update message and re-show if already injected
    const msg = document.getElementById('loginWallMsg');
    if (msg) msg.textContent = message;
    document.getElementById('novaLoginWall').classList.add('lw-open');
    return;
  }

  // Inject styles
  const style = document.createElement('style');
  style.id = 'nova-login-wall-styles';
  style.textContent = `
    #novaLoginWall {
      position: fixed; inset: 0; z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      opacity: 0; visibility: hidden;
      transition: opacity .3s, visibility .3s;
    }
    #novaLoginWall.lw-open { opacity: 1; visibility: visible; }
    #lwOverlay {
      position: absolute; inset: 0;
      background: rgba(5,5,6,0.82); backdrop-filter: blur(10px);
      cursor: pointer;
    }
    #lwCard {
      position: relative; z-index: 1;
      background: #0d0d11;
      border: 1px solid rgba(243,241,234,0.1);
      border-radius: 20px;
      padding: 48px 40px 40px;
      max-width: 420px; width: 100%;
      text-align: center;
      box-shadow: 0 40px 80px rgba(0,0,0,0.6),
                  0 0 0 1px rgba(189,252,36,0.06);
      animation: lwSlideIn .35s cubic-bezier(.16,1,.3,1) both;
    }
    @keyframes lwSlideIn {
      from { transform: translateY(24px) scale(0.96); opacity: 0; }
      to   { transform: translateY(0) scale(1); opacity: 1; }
    }
    #lwIcon {
      width: 64px; height: 64px;
      background: rgba(189,252,36,0.08);
      border: 1px solid rgba(189,252,36,0.15);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px;
    }
    #lwIcon svg { width: 28px; height: 28px; color: #bdfc24; }
    #lwTitle {
      font-family: 'Clash Display', sans-serif;
      font-size: 22px; font-weight: 700;
      color: #f3f1ea; margin: 0 0 10px;
      letter-spacing: -0.01em;
    }
    #loginWallMsg {
      font-size: 13.5px; line-height: 1.6;
      color: rgba(243,241,234,0.5);
      margin: 0 0 32px;
    }
    .lw-btn-group {
      display: flex; flex-direction: column; gap: 12px;
    }
    .lw-btn-login {
      display: block; width: 100%;
      padding: 14px 0;
      background: #bdfc24; color: #050506;
      font-size: 14px; font-weight: 700;
      border: none; border-radius: 10px;
      cursor: pointer; text-decoration: none;
      font-family: 'Clash Display', sans-serif;
      letter-spacing: 0.03em;
      transition: transform .2s, box-shadow .2s;
    }
    .lw-btn-login:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(189,252,36,0.3);
    }
    .lw-btn-signup {
      display: block; width: 100%;
      padding: 13px 0;
      background: transparent;
      color: rgba(243,241,234,0.7);
      font-size: 14px; font-weight: 500;
      border: 1px solid rgba(243,241,234,0.12);
      border-radius: 10px;
      cursor: pointer; text-decoration: none;
      transition: border-color .2s, color .2s;
    }
    .lw-btn-signup:hover {
      border-color: rgba(243,241,234,0.3);
      color: #f3f1ea;
    }
    #lwClose {
      position: absolute; top: 16px; right: 16px;
      background: none; border: none; cursor: pointer;
      color: rgba(243,241,234,0.3); padding: 4px;
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 8px; transition: color .2s, background .2s;
    }
    #lwClose:hover { color: #f3f1ea; background: rgba(243,241,234,.06); }
    #lwClose svg { width: 16px; height: 16px; }
    .lw-divider {
      display: flex; align-items: center; gap: 12px;
      margin: 4px 0;
      font-size: 11px; color: rgba(243,241,234,0.2);
    }
    .lw-divider::before, .lw-divider::after {
      content: ''; flex: 1;
      height: 1px; background: rgba(243,241,234,0.07);
    }
  `;
  document.head.appendChild(style);

  // Inject HTML
  const wall = document.createElement('div');
  wall.id = 'novaLoginWall';
  wall.setAttribute('role', 'dialog');
  wall.setAttribute('aria-modal', 'true');
  wall.setAttribute('aria-label', 'Sign in required');
  wall.innerHTML = `
    <div id="lwOverlay"></div>
    <div id="lwCard">
      <button id="lwClose" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div id="lwIcon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <h2 id="lwTitle">Members Only</h2>
      <p id="loginWallMsg">${message}</p>
      <div class="lw-btn-group">
        <a href="login.html" class="lw-btn-login">Sign In to Your Account</a>
        <span class="lw-divider">or</span>
        <a href="login.html#signup" class="lw-btn-signup">Create a Free Account</a>
      </div>
    </div>
  `;
  document.body.appendChild(wall);

  // Show
  requestAnimationFrame(() => wall.classList.add('lw-open'));

  // Close handlers
  function closeWall() {
    wall.classList.remove('lw-open');
  }
  document.getElementById('lwClose').addEventListener('click', closeWall);
  document.getElementById('lwOverlay').addEventListener('click', closeWall);
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') { closeWall(); document.removeEventListener('keydown', onKey); }
  });
}

/* ---------------------------------------------------------
   GLOBAL MINI CART (works on all pages without collection.js)
--------------------------------------------------------- */
function injectGlobalCart() {
  if (document.getElementById('globalCartDrawer')) return;

  const style = document.createElement('style');
  style.textContent = `
    #globalCartDrawer {
      position: fixed; inset: 0; z-index: 1200;
      opacity: 0; visibility: hidden;
      transition: opacity .35s, visibility .35s;
    }
    #globalCartDrawer.is-open { opacity: 1; visibility: visible; }
    #globalCartOverlay {
      position: absolute; inset: 0;
      background: rgba(0,0,0,.65); backdrop-filter: blur(6px);
    }
    #globalCartPanel {
      position: absolute; top: 0; right: 0; bottom: 0;
      width: 420px; max-width: 100%;
      background: #0d0d10;
      border-left: 1px solid rgba(243,241,234,.08);
      display: flex; flex-direction: column;
      box-shadow: -20px 0 60px rgba(0,0,0,.6);
    }
    #globalCartHeader {
      display: flex; justify-content: space-between; align-items: center;
      padding: 24px 28px;
      border-bottom: 1px solid rgba(243,241,234,.08);
    }
    #globalCartHeader h3 {
      font-family: 'Clash Display', sans-serif;
      font-size: 16px; font-weight: 600;
      color: #f3f1ea; margin: 0;
    }
    #globalCartCloseBtn {
      background: none; border: none; cursor: pointer;
      color: rgba(243,241,234,.5); padding: 4px;
      transition: color .2s;
      width: 32px; height: 32px; display: flex;
      align-items: center; justify-content: center;
      border-radius: 6px;
    }
    #globalCartCloseBtn:hover { color: #f3f1ea; background: rgba(243,241,234,.06); }
    #globalCartCloseBtn svg { width: 18px; height: 18px; }
    #globalCartBody {
      flex: 1; overflow-y: auto; padding: 24px 28px;
    }
    #globalCartBody::-webkit-scrollbar { width: 4px; }
    #globalCartBody::-webkit-scrollbar-track { background: transparent; }
    #globalCartBody::-webkit-scrollbar-thumb { background: rgba(243,241,234,.1); border-radius: 2px; }
    .gci-empty {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 100%;
      color: rgba(243,241,234,.3); gap: 12px; text-align: center;
    }
    .gci-empty svg { width: 48px; height: 48px; opacity: .3; }
    .gci-empty p { font-size: 14px; margin: 0; }
    .gci-item {
      display: flex; gap: 16px; align-items: flex-start;
      padding: 16px 0;
      border-bottom: 1px solid rgba(243,241,234,.06);
    }
    .gci-item:last-child { border-bottom: none; }
    .gci-img {
      width: 64px; height: 64px; object-fit: cover;
      border-radius: 8px; border: 1px solid rgba(243,241,234,.08);
      background: rgba(255,255,255,.02); flex-shrink: 0;
    }
    .gci-details { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .gci-name { font-size: 13px; font-weight: 500; color: #f3f1ea; }
    .gci-meta { font-size: 11px; color: rgba(243,241,234,.4); }
    .gci-price { font-size: 13px; font-weight: 600; color: #f3f1ea; margin-top: auto; }
    .gci-remove {
      background: none; border: none; cursor: pointer;
      color: rgba(243,241,234,.3); padding: 2px;
      transition: color .2s; flex-shrink: 0;
    }
    .gci-remove:hover { color: #ff6b6b; }
    .gci-remove svg { width: 14px; height: 14px; }
    #globalCartFooter {
      padding: 20px 28px 32px;
      border-top: 1px solid rgba(243,241,234,.08);
    }
    .gcf-subtotal {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 8px; font-size: 14px;
      color: rgba(243,241,234,.6);
    }
    .gcf-subtotal span:last-child { font-weight: 600; color: #f3f1ea; }
    .gcf-note { font-size: 11px; color: rgba(243,241,234,.3); margin-bottom: 16px; }
    .gcf-checkout-btn {
      display: block; width: 100%;
      padding: 14px 0; text-align: center;
      background: #bdfc24; color: #050506;
      font-size: 14px; font-weight: 700;
      border: none; border-radius: 8px; cursor: pointer;
      text-decoration: none; letter-spacing: .03em;
      transition: transform .2s, box-shadow .2s;
    }
    .gcf-checkout-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(189,252,36,.3);
    }
  `;
  document.head.appendChild(style);

  const drawer = document.createElement('div');
  drawer.id = 'globalCartDrawer';
  drawer.innerHTML = `
    <div id="globalCartOverlay"></div>
    <div id="globalCartPanel">
      <div id="globalCartHeader">
        <h3>Your Bag (<span id="gcHeaderCount">0</span>)</h3>
        <button id="globalCartCloseBtn" aria-label="Close cart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div id="globalCartBody"></div>
      <div id="globalCartFooter" style="display:none;">
        <div class="gcf-subtotal">
          <span>Subtotal</span>
          <span id="gcSubtotal">₹0</span>
        </div>
        <p class="gcf-note">Shipping &amp; taxes calculated at checkout.</p>
        <a href="checkout.html" class="gcf-checkout-btn">Proceed to Checkout</a>
      </div>
    </div>
  `;
  document.body.appendChild(drawer);

  // Close handlers
  document.getElementById('globalCartCloseBtn').addEventListener('click', closeGlobalCart);
  document.getElementById('globalCartOverlay').addEventListener('click', closeGlobalCart);

  // Remove item handler
  drawer.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.gci-remove');
    if (removeBtn) {
      const { id, size } = removeBtn.dataset;
      try {
        let cart = JSON.parse(localStorage.getItem('nova_cart')) || [];
        cart = cart.filter(item => !(item.id === id && String(item.size) === String(size)));
        localStorage.setItem('nova_cart', JSON.stringify(cart));
        window.dispatchEvent(new CustomEvent('cartUpdated'));
      } catch(_) {}
      renderGlobalCart();
    }
  });

  window.addEventListener('cartUpdated', renderGlobalCart);
}

function renderGlobalCart() {
  const body = document.getElementById('globalCartBody');
  const footer = document.getElementById('globalCartFooter');
  const headerCount = document.getElementById('gcHeaderCount');
  const subtotalEl = document.getElementById('gcSubtotal');
  if (!body) return;

  let cart = [];
  try { cart = JSON.parse(localStorage.getItem('nova_cart')) || []; } catch(_) {}

  const count = cart.reduce((a, i) => a + i.qty, 0);
  const subtotal = cart.reduce((a, i) => a + (i.price * i.qty), 0);

  if (headerCount) headerCount.textContent = count;
  if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toLocaleString()}`;

  if (cart.length === 0) {
    if (footer) footer.style.display = 'none';
    body.innerHTML = `
      <div class="gci-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <p>Your bag is empty.</p>
        <a href="collection.html" style="color:#bdfc24;font-size:13px;text-decoration:none;margin-top:4px;">Shop Collection →</a>
      </div>`;
    return;
  }

  if (footer) footer.style.display = 'block';
  body.innerHTML = cart.map(item => `
    <div class="gci-item">
      <img class="gci-img" src="${item.img}" alt="${item.name}">
      <div class="gci-details">
        <span class="gci-name">${item.name}</span>
        <span class="gci-meta">Size ${item.size} · Qty ${item.qty}</span>
        <span class="gci-price">₹${(item.price * item.qty).toLocaleString()}</span>
      </div>
      <button class="gci-remove" data-id="${item.id}" data-size="${item.size}" aria-label="Remove">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `).join('');
}

function openGlobalCart() {
  injectGlobalCart();
  renderGlobalCart();
  const drawer = document.getElementById('globalCartDrawer');
  if (drawer) drawer.classList.add('is-open');
  document.documentElement.style.overflow = 'hidden';
}

function closeGlobalCart() {
  const drawer = document.getElementById('globalCartDrawer');
  if (drawer) drawer.classList.remove('is-open');
  document.documentElement.style.overflow = '';
}

window.openGlobalCart = openGlobalCart;
window.closeGlobalCart = closeGlobalCart;

function injectSearchOverlay() {
  if (document.getElementById('searchOverlay')) return;

  const style = document.createElement('style');
  style.id = 'search-overlay-styles';
  style.textContent = `
    .search-overlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: rgba(5, 5, 6, 0.95);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 80px 24px 40px;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.4s;
    }
    .search-overlay.is-active {
      opacity: 1;
      visibility: visible;
    }
    .search-overlay__close {
      position: absolute;
      top: 30px;
      right: 40px;
      background: none;
      border: none;
      color: rgba(243, 241, 234, 0.6);
      font-size: 32px;
      cursor: pointer;
      transition: color 0.3s;
    }
    .search-overlay__close:hover {
      color: #fff;
    }
    .search-overlay__container {
      width: 100%;
      max-width: 680px;
      margin-top: 40px;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    .search-overlay__form {
      width: 100%;
      position: relative;
    }
    .search-overlay__input {
      width: 100%;
      background: transparent;
      border: none;
      border-bottom: 2px solid rgba(243, 241, 234, 0.1);
      color: #fff;
      font-size: 28px;
      font-family: sans-serif;
      padding: 12px 48px 12px 0;
      font-weight: 500;
      letter-spacing: 0.03em;
      transition: border-color 0.3s;
    }
    .search-overlay__input:focus {
      outline: none;
      border-color: #bdfc24;
    }
    .search-overlay__input::placeholder {
      color: rgba(243, 241, 234, 0.2);
    }
    .search-overlay__submit {
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: rgba(243, 241, 234, 0.6);
      cursor: pointer;
      transition: color 0.3s;
    }
    .search-overlay__submit svg {
      width: 24px;
      height: 24px;
    }
    .search-overlay__submit:hover {
      color: #bdfc24;
    }
    .search-overlay__suggestions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .search-overlay__suggestions-title {
      font-family: monospace;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: rgba(243, 241, 234, 0.4);
      margin: 0;
    }
    .search-overlay__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .search-overlay__chip {
      background: rgba(243, 241, 234, 0.05);
      border: 1px solid rgba(243, 241, 234, 0.1);
      color: #f3f1ea;
      padding: 8px 16px;
      border-radius: 30px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.3s;
    }
    .search-overlay__chip:hover {
      background: #bdfc24;
      border-color: #bdfc24;
      color: #000;
      transform: translateY(-2px);
    }
    .search-overlay__results {
      max-height: 400px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-right: 8px;
    }
    .search-overlay__results::-webkit-scrollbar {
      width: 4px;
    }
    .search-overlay__results::-webkit-scrollbar-thumb {
      background: rgba(243, 241, 234, 0.1);
      border-radius: 4px;
    }
    .search-result-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px;
      border-radius: 8px;
      background: rgba(243, 241, 234, 0.02);
      border: 1px solid rgba(243, 241, 234, 0.05);
      text-decoration: none;
      color: inherit;
      transition: all 0.3s;
    }
    .search-result-item:hover {
      background: rgba(243, 241, 234, 0.06);
      border-color: rgba(243, 241, 234, 0.15);
      transform: translateX(4px);
    }
    .search-result-item__img {
      width: 50px;
      height: 50px;
      object-fit: cover;
      border-radius: 4px;
      background: rgba(255,255,255,0.03);
    }
    .search-result-item__info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex-grow: 1;
    }
    .search-result-item__name {
      font-size: 15px;
      font-weight: 600;
      color: #fff;
      margin: 0;
    }
    .search-result-item__category {
      font-size: 12px;
      color: rgba(243, 241, 234, 0.5);
    }
    .search-result-item__price {
      font-size: 14px;
      font-weight: 700;
      color: #bdfc24;
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'searchOverlay';
  overlay.className = 'search-overlay';
  overlay.innerHTML = `
    <button class="search-overlay__close" id="searchClose" aria-label="Close search">&times;</button>
    <div class="search-overlay__container">
      <form class="search-overlay__form" id="searchForm">
        <input type="text" class="search-overlay__input" id="searchInput" placeholder="SEARCH NOVA PRODUCTS..." autocomplete="off">
        <button type="submit" class="search-overlay__submit" aria-label="Search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
      </form>
      <div class="search-overlay__suggestions" id="searchSuggestionsBlock">
        <p class="search-overlay__suggestions-title">Popular Searches</p>
        <div class="search-overlay__chips">
          <span class="search-overlay__chip">Surge X1</span>
          <span class="search-overlay__chip">Phantom</span>
          <span class="search-overlay__chip">Air Pro</span>
          <span class="search-overlay__chip">Trail</span>
          <span class="search-overlay__chip">Carbon</span>
        </div>
      </div>
      <div class="search-overlay__results" id="searchResults" style="display: none;"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  const searchSuggestionsBlock = document.getElementById('searchSuggestionsBlock');
  const searchForm = document.getElementById('searchForm');
  const searchClose = document.getElementById('searchClose');

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    if (query.length > 0) {
      searchSuggestionsBlock.style.display = 'none';
      searchResults.style.display = 'flex';
      
      const matches = window.PRODUCTS.filter(prod => 
        prod.name.toLowerCase().includes(query) ||
        prod.category.toLowerCase().includes(query) ||
        prod.color.toLowerCase().includes(query) ||
        prod.features.some(f => f.toLowerCase().includes(query))
      );

      if (matches.length > 0) {
        searchResults.innerHTML = matches.map(prod => `
          <a href="collection.html?q=${encodeURIComponent(prod.name)}" class="search-result-item">
            <img src="${prod.img}" alt="${prod.name}" class="search-result-item__img">
            <div class="search-result-item__info">
              <h5 class="search-result-item__name">${prod.name}</h5>
              <span class="search-result-item__category">${prod.category} Shoes - ${prod.gender}</span>
            </div>
            <span class="search-result-item__price">₹${prod.price.toLocaleString()}</span>
          </a>
        `).join('');
      } else {
        searchResults.innerHTML = `
          <div style="text-align: center; color: rgba(243, 241, 234, 0.4); padding: 40px 0;">
            No shoes found for "${searchInput.value}"
          </div>
        `;
      }
    } else {
      searchSuggestionsBlock.style.display = 'flex';
      searchResults.style.display = 'none';
      searchResults.innerHTML = '';
    }
  });

  document.querySelectorAll('.search-overlay__chip').forEach(chip => {
    chip.addEventListener('click', () => {
      searchInput.value = chip.textContent;
      searchInput.dispatchEvent(new Event('input'));
      searchInput.focus();
    });
  });

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query.length > 0) {
      handleSearchQuerySubmit(query);
    }
  });

  searchResults.addEventListener('click', (e) => {
    const resultLink = e.target.closest('.search-result-item');
    if (resultLink) {
      const url = new URL(resultLink.href);
      const query = url.searchParams.get('q');
      if (query && window.location.pathname.endsWith('collection.html')) {
        e.preventDefault();
        handleSearchQuerySubmit(query);
      }
    }
  });

  function handleSearchQuerySubmit(query) {
    if (window.location.pathname.endsWith('collection.html')) {
      const newUrl = `${window.location.pathname}?q=${encodeURIComponent(query)}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
      if (window.updateCollectionSearch) {
        window.updateCollectionSearch(query);
      }
      overlay.classList.remove('is-active');
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    } else {
      window.location.href = `collection.html?q=${encodeURIComponent(query)}`;
    }
  }

  searchClose.addEventListener('click', () => {
    overlay.classList.remove('is-active');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('is-active');
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
  });
}

function openSearchOverlay() {
  injectSearchOverlay();
  const overlay = document.getElementById('searchOverlay');
  overlay.classList.add('is-active');
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  setTimeout(() => {
    document.getElementById('searchInput').focus();
  }, 100);
}

// IIFE to immediately hide body and lock scroll before body parses.
// This prevents FOUC (Flash of Unstyled Content) and ensures assets load first.
(function() {
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

      if (this.options.onComplete) {
        this.options.onComplete();
      }

      // Dispatch global custom event for other scripts
      window.dispatchEvent(new CustomEvent('assetsLoaded'));

      if (this.options.debug) console.log('[Preloader] Load complete, site running.');
    }, 500); // Small delay to let user see 100% complete bar
  }
}

// Auto-run unless manual boot is requested
if (!window.disablePreloaderAutoRun) {
  window.preloaderInstance = new AssetPreloader({ debug: true });
}

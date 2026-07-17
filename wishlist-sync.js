/**
 * NOVA — Wishlist Synchronizer & Dynamic Manager
 * shared across all pages to sync localStorage state with the UI.
 */
(() => {
  'use strict';

  // Helper: Read/Write localStorage Wishlist
  const wishlistState = {
    get() {
      try {
        return JSON.parse(localStorage.getItem('nova_wishlist')) || [];
      } catch (e) {
        return [];
      }
    },
    save(list) {
      localStorage.setItem('nova_wishlist', JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('wishlistUpdated'));
    },
    has(name) {
      return this.get().some(item => item.name === name);
    },
    toggle(item) {
      let list = this.get();
      const idx = list.findIndex(i => i.name === item.name);
      let added = false;
      if (idx > -1) {
        list.splice(idx, 1);
      } else {
        list.push(item);
        added = true;
      }
      this.save(list);
      return added;
    }
  };

  // Helper: Read/Write Cart count sync
  const cartState = {
    get() {
      try {
        return JSON.parse(localStorage.getItem('nova_cart')) || [];
      } catch (e) {
        return [];
      }
    },
    save(cart) {
      localStorage.setItem('nova_cart', JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent('cartUpdated'));
    },
    add(id, name, price, img, size) {
      const cart = this.get();
      const existing = cart.find(item => item.id === id && item.size === size);
      if (existing) {
        existing.qty++;
      } else {
        cart.push({ id, name, price: Number(price), img, size: size || 9, qty: 1 });
      }
      this.save(cart);
    }
  };

  // Helper: Toast Message Notification (Dynamic Creation)
  function showToast(message) {
    let toast = document.getElementById('toastMsg');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toastMsg';
      toast.className = 'toast-msg';
      toast.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span id="toastText"></span>
      `;
      document.body.appendChild(toast);
    }
    const textEl = toast.querySelector('#toastText');
    if (textEl) textEl.textContent = message;
    
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // Update Global Navbar Wishlist & Cart Count Badges
  function updateGlobalNavbarBadges() {
    const list = wishlistState.get();
    const cart = cartState.get();
    
    // Wishlist Badge
    const wishlistBadges = document.querySelectorAll('.nav__wish-count, #wishlistCountGlobal');
    wishlistBadges.forEach(badge => {
      badge.textContent = list.length;
      badge.style.display = list.length > 0 ? 'flex' : 'none';
    });

    // Cart Badge
    const cartBadges = document.querySelectorAll('.nav__cart-count, #cartCount');
    const totalCartQty = cart.reduce((acc, item) => acc + item.qty, 0);
    cartBadges.forEach(badge => {
      badge.textContent = totalCartQty;
      badge.style.display = totalCartQty > 0 ? 'flex' : 'none';
    });
  }

  // Scan & sync heart icon states on product cards
  function syncProductHeartStates() {
    const buttons = document.querySelectorAll('.wishlist-btn');
    buttons.forEach(btn => {
      const card = btn.closest('.product-card');
      if (!card) return;
      const titleEl = card.querySelector('.product-card__title');
      if (!titleEl) return;
      const name = titleEl.textContent.trim();
      
      const inWishlist = wishlistState.has(name);
      btn.classList.toggle('is-active', inWishlist);
    });
  }

  // Event Delegation for Wishlist Heart button clicks on product cards
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.wishlist-btn');
    if (!btn) return;
    
    e.preventDefault();
    e.stopPropagation();

    // Auth guard — must be logged in to use wishlist
    if (typeof window.requireLogin === 'function') {
      if (!window.requireLogin('Sign in to save items to your wishlist and access them anytime.')) return;
    }

    const card = btn.closest('.product-card');
    if (!card) return;

    const titleEl = card.querySelector('.product-card__title');
    const catEl = card.querySelector('.product-card__category');
    const imgEl = card.querySelector('.product-card__img');
    const priceEl = card.querySelector('.product-card__price');
    const badgeEl = card.querySelector('.product-card__badges .badge');

    if (!titleEl) return;

    const name = titleEl.textContent.trim();
    const id = card.dataset.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const category = catEl ? catEl.textContent.trim() : 'Performance Shoes';
    const img = imgEl ? imgEl.getAttribute('src') : 'assets/images/product_nova_x1.png';
    const priceRaw = priceEl ? priceEl.textContent.trim() : '₹2,500';
    
    // Map badge class
    let badge = '';
    let badgeClass = 'wishlist-item-badge--comfort';
    if (badgeEl) {
      badge = badgeEl.textContent.trim();
      const lower = badge.toLowerCase();
      if (lower.includes('best')) {
        badgeClass = 'wishlist-item-badge--best';
        badge = 'Best Seller';
      } else if (lower.includes('new')) {
        badgeClass = 'wishlist-item-badge--new';
        badge = 'New Arrival';
      } else if (lower.includes('sale') || lower.includes('%')) {
        badgeClass = 'wishlist-item-badge--trend';
        badge = 'Trending';
      }
    }

    const item = { id, name, category, img, price: priceRaw, badge, badgeClass, size: 9, color: 'Black' };
    const added = wishlistState.toggle(item);

    btn.classList.toggle('is-active', added);
    updateGlobalNavbarBadges();

    if (added) {
      showToast(`Added "${name}" to Wishlist!`);
    } else {
      showToast(`Removed "${name}" from Wishlist.`);
    }
  });

  // Listen to wishlist updates
  window.addEventListener('wishlistUpdated', () => {
    updateGlobalNavbarBadges();
    syncProductHeartStates();
  });
  window.addEventListener('cartUpdated', updateGlobalNavbarBadges);

  // Global add-to-cart handler (for pages that don't load collection.js, e.g. index.html)
  // collection.js has its own handler; this one covers all other pages.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-to-cart-btn');
    if (!btn) return;
    // Skip if collection.js is already handling this (it defines cartState as an IIFE-scoped var)
    if (window._collectionJsLoaded) return;
    e.preventDefault();
    // Auth guard
    if (typeof window.requireLogin === 'function') {
      if (!window.requireLogin('Sign in to add items to your cart and start shopping.')) return;
    }
    // Add to cart
    cartState.add(btn.dataset.id, btn.dataset.name, btn.dataset.price, btn.dataset.img, 9);
    // Animate button
    btn.style.transform = 'scale(0.85)';
    setTimeout(() => { btn.style.transform = ''; }, 150);
    // Show toast feedback
    showToast(`Added "${btn.dataset.name || 'item'}" to your cart!`);
  });

  // Initialize Navbar badges and heart icon states on page load
  updateGlobalNavbarBadges();
  syncProductHeartStates();

  // Watch for dynamic DOM insertions (like catalog grid pagination/filters)
  const observer = new MutationObserver(() => {
    syncProductHeartStates();
  });
  const catalog = document.getElementById('catalogGrid') || document.querySelector('.bestsellers-row');
  if (catalog) {
    observer.observe(catalog, { childList: true, subtree: true });
  }


  /* =========================================================
     WISHLIST PAGE DYNAMIC RENDERER & INTERACTIVE LOGIC
     ========================================================= */
  if (window.location.pathname.endsWith('wishlist.html')) {

    // Auth guard — must be logged in to view wishlist page
    if (!localStorage.getItem('nova_user')) {
      // Show a message in the page before requireLogin is available
      document.addEventListener('DOMContentLoaded', () => {
        // Use requireLogin once preloader.js has set it up
        const tryGuard = () => {
          if (typeof window.requireLogin === 'function') {
            window.requireLogin('Sign in to view your saved wishlist items.');
          } else {
            // Fallback if preloader.js hasn't loaded yet
            window.location.href = 'login.html';
          }
        };
        // Small delay to ensure preloader.js has run
        setTimeout(tryGuard, 100);
      });
    }
    
    const container = document.getElementById('wishlistItemsContainer');
    const subtitle = document.getElementById('wishlistSubtitle');
    const selectAllCb = document.getElementById('selectAllCheckbox');
    const moveAllToBagBtn = document.getElementById('moveAllToBagBtn');
    const layoutGrid = document.getElementById('wishlistContentGrid');

    function renderWishlistPage() {
      const items = wishlistState.get();

      // If wishlist is empty, render the empty state layout
      if (items.length === 0) {
        if (layoutGrid) {
          layoutGrid.innerHTML = `
            <div class="empty-wishlist-state" style="grid-column: 1 / -1; width: 100%;">
              <div class="empty-wishlist-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </div>
              <h2 class="empty-wishlist-title">Your Wishlist is Empty</h2>
              <p class="empty-wishlist-desc">Explore our premium collections and add your favorite performance shoes to your wishlist.</p>
              <a href="collection.html" class="btn btn--solid" data-magnetic><span>Start Shopping</span></a>
            </div>
          `;
          

        }
        if (subtitle) subtitle.textContent = '0 items saved for later';
        return;
      }

      if (subtitle) {
        subtitle.textContent = `${items.length} item${items.length !== 1 ? 's' : ''} saved for later`;
      }

      if (!container) return;
      container.innerHTML = '';

      items.forEach(item => {
        const badgeHtml = item.badge ? `<span class="wishlist-item-badge ${item.badgeClass}">${item.badge}</span>` : '';
        const card = document.createElement('div');
        card.className = 'wishlist-item-card';
        card.dataset.id = item.id;
        card.dataset.name = item.name;
        
        card.innerHTML = `
          <label class="wishlist-item-checkbox">
            <input type="checkbox" checked />
            <span class="wishlist-item-checkbox-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
          </label>
          <div class="wishlist-item-img-wrap">
            <img src="${item.img}" alt="${item.name}" class="wishlist-item-img" />
          </div>
          <div class="wishlist-item-info">
            <h4 class="wishlist-item-title">${item.name}</h4>
            <span class="wishlist-item-cat">${item.category}</span>
            <span class="wishlist-item-specs">Size: ${item.size || 9} • Color: ${item.color || 'Black'}</span>
            ${badgeHtml}
          </div>
          <div class="wishlist-item-price-col">
            <span class="wishlist-item-price">${item.price}</span>
            <span class="wishlist-item-stock">
              <span class="wishlist-item-stock-dot"></span>
              <span>In Stock</span>
            </span>
          </div>
          <div class="wishlist-item-actions">
            <button class="btn--bag" aria-label="Move to Bag">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              <span>Move to Bag</span>
            </button>
            <button class="wishlist-item-heart-btn" aria-label="Toggle wishlist item">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </button>
          </div>
          <button class="wishlist-item-remove-btn" aria-label="Remove item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        `;
        container.appendChild(card);
      });
    }

    // Toggle Select All checkbox action
    selectAllCb?.addEventListener('change', (e) => {
      if (!container) return;
      const checked = e.target.checked;
      const checkboxes = container.querySelectorAll('.wishlist-item-checkbox input');
      checkboxes.forEach(cb => cb.checked = checked);
    });

    // Event Delegation inside items container on Wishlist page
    container?.addEventListener('click', (e) => {
      const card = e.target.closest('.wishlist-item-card');
      if (!card) return;

      const name = card.dataset.name;
      const id = card.dataset.id;

      // 1. Remove Item Button (X)
      if (e.target.closest('.wishlist-item-remove-btn')) {
        const list = wishlistState.get().filter(i => i.name !== name);
        wishlistState.save(list);
        
        if (typeof gsap !== 'undefined') {
          gsap.to(card, {
            opacity: 0, x: 50, height: 0, paddingTop: 0, paddingBottom: 0, marginTop: 0, marginBottom: 0, borderWidth: 0, duration: 0.4,
            onComplete: () => {
              card.remove();
              renderWishlistPage();
              showToast(`Removed "${name}" from Wishlist.`);
            }
          });
        } else {
          card.remove();
          renderWishlistPage();
          showToast(`Removed "${name}" from Wishlist.`);
        }
      }

      // 2. Move to Bag Button
      if (e.target.closest('.btn--bag')) {
        const list = wishlistState.get().filter(i => i.name !== name);
        wishlistState.save(list);

        // Parse price to number
        const priceText = card.querySelector('.wishlist-item-price').textContent;
        const priceNum = Number(priceText.replace(/[^0-9]/g, '')) || 2500;
        const img = card.querySelector('.wishlist-item-img').getAttribute('src');
        
        // Add to cart in localStorage
        cartState.add(id, name, priceNum, img, 9);
        
        if (typeof gsap !== 'undefined') {
          gsap.to(card, {
            opacity: 0, y: -30, scale: 0.95, height: 0, paddingTop: 0, paddingBottom: 0, marginTop: 0, marginBottom: 0, borderWidth: 0, duration: 0.4,
            onComplete: () => {
              card.remove();
              renderWishlistPage();
              showToast(`Moved "${name}" to your Shopping Bag successfully!`);
            }
          });
        } else {
          card.remove();
          renderWishlistPage();
          showToast(`Moved "${name}" to your Shopping Bag successfully!`);
        }
      }

      // 3. Heart Button click
      if (e.target.closest('.wishlist-item-heart-btn')) {
        const list = wishlistState.get().filter(i => i.name !== name);
        wishlistState.save(list);
        
        if (typeof gsap !== 'undefined') {
          gsap.to(card, {
            opacity: 0, scale: 0.9, height: 0, paddingTop: 0, paddingBottom: 0, marginTop: 0, marginBottom: 0, borderWidth: 0, duration: 0.4,
            onComplete: () => {
              card.remove();
              renderWishlistPage();
              showToast(`Removed "${name}" from Wishlist.`);
            }
          });
        } else {
          card.remove();
          renderWishlistPage();
          showToast(`Removed "${name}" from Wishlist.`);
        }
      }
    });

    // Move All To Bag Action button
    moveAllToBagBtn?.addEventListener('click', () => {
      const items = wishlistState.get();
      if (items.length === 0) return;

      // Add all to cart
      items.forEach(item => {
        const priceNum = Number(item.price.replace(/[^0-9]/g, '')) || 2500;
        cartState.add(item.id, item.name, priceNum, item.img, 9);
      });

      // Clear wishlist
      wishlistState.save([]);

      const cards = container?.querySelectorAll('.wishlist-item-card');
      if (cards && cards.length > 0 && typeof gsap !== 'undefined') {
        gsap.to(cards, {
          opacity: 0, scale: 0.9, y: -20, stagger: 0.06, duration: 0.4,
          onComplete: () => {
            renderWishlistPage();
            showToast(`Moved all items to your Shopping Bag!`);
          }
        });
      } else {
        renderWishlistPage();
        showToast(`Moved all items to your Shopping Bag!`);
      }
    });

    // Initial render for wishlist page
    renderWishlistPage();
  }

  // ── Global Hamburger Menu Toggle for women.html and wishlist.html ──
  document.addEventListener('DOMContentLoaded', () => {
    const burger = document.getElementById('navBurger');
    const links = document.querySelector('.nav__links');
    if (burger && links) {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('women.html') || path.includes('wishlist.html')) {
        burger.addEventListener('click', () => {
          const expanded = burger.getAttribute('aria-expanded') === 'true';
          burger.setAttribute('aria-expanded', String(!expanded));
          links.style.display = expanded ? '' : 'flex';
        });
      }
    }
  });

})();

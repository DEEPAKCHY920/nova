/* ================================================================
   NOVA — PRODUCTS BRIDGE  (products-bridge.js)
   Reads nova_admin_products from localStorage and renders
   live product cards in any storefront page that includes this
   script.  Works for men.html, women.html, and index.html.
   ================================================================ */
(function () {
  'use strict';

  /* ── 1. Read catalogue from localStorage ───────────────────── */
  const CANONICAL = [
    { id: 'nova-surge-x1', name: 'Nova Surge X1', category: 'Running', gender: 'men', size: [8,9,10,11], price: 8999, oldPrice: null, img: 'assets/images/product_surge.png', stars: 5, reviews: 128, new: false, bestseller: true, discount: 0, color: 'orange', features: ['air','lightweight','breathable'], status: 'Active', stock: 22, featured: true, sku: 'NOVA-SX-001', desc: "Men's Running Shoes" },
    { id: 'nova-phantom', name: 'Nova Phantom', category: 'Running', gender: 'men', size: [7,8,9,10], price: 7999, oldPrice: null, img: 'assets/images/product_phantom.png', stars: 5, reviews: 96, new: false, bestseller: true, discount: 0, color: 'white', features: ['lightweight','breathable'], status: 'Active', stock: 18, featured: true, sku: 'NOVA-PH-002', desc: "Men's Running Shoes" },
    { id: 'nova-air-pro', name: 'Nova Air Pro', category: 'Training', gender: 'unisex', size: [6,7,8,9,10], price: 8499, oldPrice: null, img: 'assets/images/product_air_pro.png', stars: 5, reviews: 76, new: true, bestseller: false, discount: 0, color: 'white', features: ['air','breathable','grip'], status: 'Active', stock: 30, featured: false, sku: 'NOVA-AP-003', desc: 'Unisex Training Shoes' },
    { id: 'nova-edge', name: 'Nova Edge', category: 'Basketball', gender: 'men', size: [9,10,11,12,13], price: 6999, oldPrice: null, img: 'assets/images/product_edge.png', stars: 5, reviews: 88, new: false, bestseller: false, discount: 0, color: 'red', features: ['grip'], status: 'Active', stock: 14, featured: false, sku: 'NOVA-EG-004', desc: "Men's Basketball Shoes" },
    { id: 'nova-boost', name: 'Nova Boost', category: 'Running', gender: 'men', size: [8,9,10], price: 7499, oldPrice: 8299, img: 'assets/images/product_boost.png', stars: 5, reviews: 142, new: false, bestseller: false, discount: 10, color: 'blue', features: ['air','lightweight'], status: 'Active', stock: 25, featured: false, sku: 'NOVA-BO-005', desc: "Men's Running Shoes" },
    { id: 'nova-drift', name: 'Nova Drift', category: 'Lifestyle', gender: 'unisex', size: [6,7,8,9,10,11], price: 5499, oldPrice: null, img: 'assets/images/product_drift.png', stars: 5, reviews: 58, new: true, bestseller: false, discount: 0, color: 'green', features: ['lightweight','breathable'], status: 'Active', stock: 9, featured: false, sku: 'NOVA-DR-006', desc: 'Unisex Lifestyle Shoes' },
    { id: 'nova-lite', name: 'Nova Lite', category: 'Training', gender: 'women', size: [6,7,8,9], price: 4999, oldPrice: null, img: 'assets/images/product_lite.png', stars: 5, reviews: 64, new: false, bestseller: false, discount: 0, color: 'purple', features: ['lightweight'], status: 'Active', stock: 35, featured: false, sku: 'NOVA-LT-007', desc: "Women's Training Shoes" },
    { id: 'nova-trail', name: 'Nova Trail', category: 'Hiking', gender: 'men', size: [7,8,9,10,11,12], price: 6799, oldPrice: 7999, img: 'assets/images/product_trail.png', stars: 5, reviews: 41, new: false, bestseller: false, discount: 15, color: 'white', features: ['grip','waterproof'], status: 'Active', stock: 0, featured: false, sku: 'NOVA-TR-008', desc: "Men's Hiking Shoes" },
    { id: 'nova-motion', name: 'Nova Motion', category: 'Running', gender: 'women', size: [6,7,8], price: 6299, oldPrice: null, img: 'assets/images/product_motion.png', stars: 5, reviews: 33, new: false, bestseller: false, discount: 0, color: 'red', features: ['air','breathable'], status: 'Active', stock: 12, featured: false, sku: 'NOVA-MO-009', desc: "Women's Running Shoes" },
    { id: 'nova-flow', name: 'Nova Flow', category: 'Lifestyle', gender: 'women', size: [6,7,8,9], price: 5999, oldPrice: null, img: 'assets/images/product_flow.png', stars: 5, reviews: 27, new: true, bestseller: false, discount: 0, color: 'yellow', features: ['lightweight','breathable'], status: 'Active', stock: 20, featured: false, sku: 'NOVA-FL-010', desc: "Women's Lifestyle Shoes" },
    { id: 'nova-carbon', name: 'Nova Carbon', category: 'Running', gender: 'women', size: [8,9,10,11,12], price: 10999, oldPrice: null, img: 'assets/images/product_carbon.png', stars: 5, reviews: 19, new: false, bestseller: false, discount: 0, color: 'purple', features: ['air','lightweight','breathable'], status: 'Active', stock: 0, featured: true, sku: 'NOVA-CA-011', desc: "Women's Running Shoes" },
    { id: 'nova-flex', name: 'Nova Flex', category: 'Training', gender: 'unisex', size: [6,7,8,9,10], price: 4799, oldPrice: 5499, img: 'assets/images/product_flex.png', stars: 5, reviews: 22, new: false, bestseller: false, discount: 0, color: 'purple', features: ['lightweight','grip'], status: 'Active', stock: 11, featured: false, sku: 'NOVA-FX-012', desc: 'Unisex Training Shoes' }
  ];

  function getProducts() {
    try {
      const raw = localStorage.getItem('nova_admin_products');
      if (!raw) {
        localStorage.setItem('nova_admin_products', JSON.stringify(CANONICAL));
        return [...CANONICAL];
      }
      return JSON.parse(raw);
    } catch (e) {
      return [...CANONICAL];
    }
  }

  /* ── 2. Cart helpers ────────────────────────────────────────── */
  function addToCart(p, size) {
    try {
      const cart = JSON.parse(localStorage.getItem('nova_cart') || '[]');
      const existing = cart.find(i => i.id === p.id && i.size === size);
      if (existing) {
        existing.qty = (existing.qty || 1) + 1;
      } else {
        cart.push({ id: p.id, name: p.name, price: Number(p.price), img: p.img, size: size || 9, qty: 1 });
      }
      localStorage.setItem('nova_cart', JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      showBridgeToast(`${p.name} added to cart!`, 'ok');
    } catch (e) {}
  }

  function toggleWishlist(p, btn) {
    try {
      let wl = JSON.parse(localStorage.getItem('nova_wishlist') || '[]');
      const exists = wl.find(i => i.id === p.id);
      if (exists) {
        wl = wl.filter(i => i.id !== p.id);
        btn.classList.remove('is-active');
        btn.style.color = '';
      } else {
        wl.push(p);
        btn.classList.add('is-active');
        btn.style.color = '#bdfc24';
        btn.style.fill = '#bdfc24';
      }
      localStorage.setItem('nova_wishlist', JSON.stringify(wl));
      window.dispatchEvent(new CustomEvent('wishlistUpdated'));
    } catch (e) {}
  }

  function isInWishlist(id) {
    try {
      const wl = JSON.parse(localStorage.getItem('nova_wishlist') || '[]');
      return wl.some(i => i.id === id);
    } catch (e) { return false; }
  }

  /* ── 3. Toast notification ──────────────────────────────────── */
  function showBridgeToast(msg, type) {
    let toast = document.getElementById('bridgeToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'bridgeToast';
      toast.style.cssText = [
        'position:fixed','bottom:24px','left:50%',
        'transform:translateX(-50%) translateY(20px)',
        'background:#1e1e23','border:1px solid rgba(189,252,36,0.2)',
        'border-radius:10px','padding:12px 20px','font-size:13px',
        'font-weight:500','color:#f0f0f2','display:flex',
        'align-items:center','gap:10px','z-index:99999',
        'opacity:0','transition:all 0.3s','pointer-events:none',
        'font-family:"General Sans",sans-serif','white-space:nowrap'
      ].join(';');
      document.body.appendChild(toast);
    }
    const icons = {
      ok: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#bdfc24" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      err: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
    };
    toast.innerHTML = (icons[type] || icons.ok) + msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2800);
  }

  /* ── 4. Build product card HTML ─────────────────────────────── */
  function buildCard(p) {
    const disc = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : (p.discount || 0);
    const stars = '★'.repeat(Math.round(p.stars || 5));
    const inWl = isInWishlist(p.id);
    const badges = [
      p.new ? '<span class="badge badge--new">New</span>' : '',
      disc > 0 ? `<span class="badge badge--sale">-${disc}%</span>` : '',
      p.featured ? '<span class="badge badge--featured">Featured</span>' : ''
    ].filter(Boolean).join('');

    const div = document.createElement('a');
    div.className = 'product-card bridge-card';
    div.href = `collection.html`;
    div.dataset.productId = p.id;
    div.innerHTML = `
      ${badges ? `<div class="product-card__badges">${badges}</div>` : ''}
      <button class="wishlist-btn bridge-wl-btn" aria-label="Wishlist" data-id="${p.id}"
        style="${inWl ? 'color:#bdfc24' : ''}">
        <svg viewBox="0 0 24 24" fill="${inWl ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
      <div class="product-card__img-wrap">
        <img src="${p.img}" alt="${p.name}" class="product-card__img"
          onerror="this.style.display='none';this.parentElement.style.background='#1a1a1f'"/>
      </div>
      <div class="product-card__info">
        <h4 class="product-card__title">${p.name}</h4>
        <span class="product-card__category">${p.desc || p.category + ' Shoes'}</span>
        <div class="product-card__rating">
          <span class="stars">${stars}</span>
          <span class="count">(${p.reviews || 0})</span>
        </div>
        <div class="product-card__footer">
          <div>
            <span class="product-card__price">₹${Number(p.price).toLocaleString()}</span>
            ${p.oldPrice ? `<span class="product-card__price--old">₹${Number(p.oldPrice).toLocaleString()}</span>` : ''}
          </div>
          <button class="product-card__cart-btn bridge-cart-btn" aria-label="Add to cart" data-id="${p.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </button>
        </div>
      </div>`;

    /* Wishlist button */
    const wlBtn = div.querySelector('.bridge-wl-btn');
    wlBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleWishlist(p, wlBtn);
      const svg = wlBtn.querySelector('svg');
      svg.setAttribute('fill', isInWishlist(p.id) ? 'currentColor' : 'none');
    });

    /* Cart button */
    const cartBtn = div.querySelector('.bridge-cart-btn');
    cartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const sizes = Array.isArray(p.size) ? p.size : [9];
      addToCart(p, sizes[0]);
      cartBtn.style.background = '#bdfc24';
      cartBtn.style.color = '#050506';
      cartBtn.style.borderRadius = '8px';
      setTimeout(() => { cartBtn.style.background = ''; cartBtn.style.color = ''; }, 1200);
    });

    return div;
  }

  /* ── 5. Render into a container ─────────────────────────────── */
  function renderIntoContainer(container, products, limit) {
    if (!container) return;
    container.innerHTML = '';
    const list = products.slice(0, limit || 8);
    if (list.length === 0) {
      container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px 0;color:rgba(240,240,242,0.4);font-size:13px">
        No products available. <a href="collection.html" style="color:#bdfc24">Browse all →</a>
      </div>`;
      return;
    }
    list.forEach((p, i) => {
      const card = buildCard(p);
      card.style.animationDelay = `${i * 0.07}s`;
      container.appendChild(card);
    });
  }

  /* ── 6. Page detection and rendering ────────────────────────── */
  function boot() {
    const allProducts = getProducts();
    const activeProdcuts = allProducts.filter(p => p.status !== 'Inactive' && p.stock > 0);

    const page = document.body.getAttribute('data-page') ||
      (location.pathname.includes('men') ? 'men' :
       location.pathname.includes('women') ? 'women' :
       location.pathname.includes('index') ? 'home' : 'other');

    /* --- men.html: replace static bestsellers row --- */
    const menBestRow = document.querySelector('.bestsellers-row');
    if (menBestRow && (page === 'men' || location.pathname.includes('men'))) {
      const menProds = activeProdcuts.filter(p => p.gender === 'men' || p.gender === 'unisex');
      renderIntoContainer(menBestRow, menProds, 5);
    }

    /* --- men.html: new arrivals section (if exists) --- */
    const menNewRow = document.querySelector('.new-arrivals-row');
    if (menNewRow && (page === 'men' || location.pathname.includes('men'))) {
      const newMen = activeProdcuts.filter(p => (p.gender === 'men' || p.gender === 'unisex') && p.new);
      renderIntoContainer(menNewRow, newMen, 4);
    }

    /* --- women.html: replace static product rows --- */
    const womenBestRow = document.querySelector('.women-bestsellers-row, .bestsellers-row');
    if (womenBestRow && location.pathname.includes('women')) {
      const womenProds = activeProdcuts.filter(p => p.gender === 'women' || p.gender === 'unisex');
      renderIntoContainer(womenBestRow, womenProds, 6);
    }

    /* --- index.html: featured section (data-bridge="featured") --- */
    const featuredRow = document.querySelector('[data-bridge="featured"]');
    if (featuredRow) {
      const featured = activeProdcuts.filter(p => p.featured);
      renderIntoContainer(featuredRow, featured, 4);
    }

    /* --- Generic: any container with data-bridge="products" --- */
    document.querySelectorAll('[data-bridge="products"]').forEach(el => {
      const genderFilter = el.getAttribute('data-gender') || '';
      const limit = parseInt(el.getAttribute('data-limit')) || 8;
      let list = activeProdcuts;
      if (genderFilter) list = list.filter(p => p.gender === genderFilter || p.gender === 'unisex');
      renderIntoContainer(el, list, limit);
    });
  }

  /* ── 7. Listen for admin updates ────────────────────────────── */
  window.addEventListener('storage', (e) => {
    if (e.key === 'nova_admin_products') {
      boot(); // Re-render when admin changes products in another tab
    }
  });

  /* Boot after DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* Expose for manual refresh */
  window.novaBridge = { refresh: boot };
})();

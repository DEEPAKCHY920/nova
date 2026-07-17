(() => {
  'use strict';
  window._collectionJsLoaded = true; // Signal to wishlist-sync.js to skip its add-to-cart handler

  /* ---------------------------------------------------------
     PRODUCTS — Single Source of Truth: nova_admin_products
     Admin manages this key; collection reads from it.
  --------------------------------------------------------- */

  /** Full canonical catalogue — used ONLY for first-time seeding */
  const CANONICAL_PRODUCTS = [
    { id: 'nova-surge-x1', name: 'Nova Surge X1', category: 'Running', gender: 'men', size: [8, 9, 10, 11], price: 8999, oldPrice: null, img: 'assets/images/product_surge.png', stars: 5, reviews: 128, new: false, bestseller: true, discount: 0, color: 'orange', features: ['air', 'lightweight', 'breathable'], status: 'Active', stock: 22, featured: true, sku: 'NOVA-SX-001', desc: "Men's Running Shoes" },
    { id: 'nova-phantom', name: 'Nova Phantom', category: 'Running', gender: 'men', size: [7, 8, 9, 10], price: 7999, oldPrice: null, img: 'assets/images/product_phantom.png', stars: 5, reviews: 96, new: false, bestseller: true, discount: 0, color: 'white', features: ['lightweight', 'breathable'], status: 'Active', stock: 18, featured: true, sku: 'NOVA-PH-002', desc: "Men's Running Shoes" },
    { id: 'nova-air-pro', name: 'Nova Air Pro', category: 'Training', gender: 'unisex', size: [6, 7, 8, 9, 10], price: 8499, oldPrice: null, img: 'assets/images/product_air_pro.png', stars: 5, reviews: 76, new: true, bestseller: false, discount: 0, color: 'white', features: ['air', 'breathable', 'grip'], status: 'Active', stock: 30, featured: false, sku: 'NOVA-AP-003', desc: 'Unisex Training Shoes' },
    { id: 'nova-edge', name: 'Nova Edge', category: 'Basketball', gender: 'men', size: [9, 10, 11, 12, 13], price: 6999, oldPrice: null, img: 'assets/images/product_edge.png', stars: 5, reviews: 88, new: false, bestseller: false, discount: 0, color: 'red', features: ['grip'], status: 'Active', stock: 14, featured: false, sku: 'NOVA-EG-004', desc: "Men's Basketball Shoes" },
    { id: 'nova-boost', name: 'Nova Boost', category: 'Running', gender: 'men', size: [8, 9, 10], price: 7499, oldPrice: 8299, img: 'assets/images/product_boost.png', stars: 5, reviews: 142, new: false, bestseller: false, discount: 10, color: 'blue', features: ['air', 'lightweight'], status: 'Active', stock: 25, featured: false, sku: 'NOVA-BO-005', desc: "Men's Running Shoes" },
    { id: 'nova-drift', name: 'Nova Drift', category: 'Lifestyle', gender: 'unisex', size: [6, 7, 8, 9, 10, 11], price: 5499, oldPrice: null, img: 'assets/images/product_drift.png', stars: 5, reviews: 58, new: true, bestseller: false, discount: 0, color: 'green', features: ['lightweight', 'breathable'], status: 'Active', stock: 9, featured: false, sku: 'NOVA-DR-006', desc: 'Unisex Lifestyle Shoes' },
    { id: 'nova-lite', name: 'Nova Lite', category: 'Training', gender: 'women', size: [6, 7, 8, 9], price: 4999, oldPrice: null, img: 'assets/images/product_lite.png', stars: 5, reviews: 64, new: false, bestseller: false, discount: 0, color: 'purple', features: ['lightweight'], status: 'Active', stock: 35, featured: false, sku: 'NOVA-LT-007', desc: "Women's Training Shoes" },
    { id: 'nova-trail', name: 'Nova Trail', category: 'Hiking', gender: 'men', size: [7, 8, 9, 10, 11, 12], price: 6799, oldPrice: 7999, img: 'assets/images/product_trail.png', stars: 5, reviews: 41, new: false, bestseller: false, discount: 15, color: 'white', features: ['grip', 'waterproof'], status: 'Active', stock: 0, featured: false, sku: 'NOVA-TR-008', desc: "Men's Hiking Shoes" },
    { id: 'nova-motion', name: 'Nova Motion', category: 'Running', gender: 'women', size: [6, 7, 8], price: 6299, oldPrice: null, img: 'assets/images/product_motion.png', stars: 5, reviews: 33, new: false, bestseller: false, discount: 0, color: 'red', features: ['air', 'breathable'], status: 'Active', stock: 12, featured: false, sku: 'NOVA-MO-009', desc: "Women's Running Shoes" },
    { id: 'nova-flow', name: 'Nova Flow', category: 'Lifestyle', gender: 'women', size: [6, 7, 8, 9], price: 5999, oldPrice: null, img: 'assets/images/product_flow.png', stars: 5, reviews: 27, new: true, bestseller: false, discount: 0, color: 'yellow', features: ['lightweight', 'breathable'], status: 'Active', stock: 20, featured: false, sku: 'NOVA-FL-010', desc: "Women's Lifestyle Shoes" },
    { id: 'nova-carbon', name: 'Nova Carbon', category: 'Running', gender: 'women', size: [8, 9, 10, 11, 12], price: 10999, oldPrice: null, img: 'assets/images/product_carbon.png', stars: 5, reviews: 19, new: false, bestseller: false, discount: 0, color: 'purple', features: ['air', 'lightweight', 'breathable'], status: 'Active', stock: 0, featured: true, sku: 'NOVA-CA-011', desc: "Women's Running Shoes" },
    { id: 'nova-flex', name: 'Nova Flex', category: 'Training', gender: 'unisex', size: [6, 7, 8, 9, 10], price: 4799, oldPrice: 5499, img: 'assets/images/product_flex.png', stars: 5, reviews: 22, new: false, bestseller: false, discount: 0, color: 'purple', features: ['lightweight', 'grip'], status: 'Active', stock: 11, featured: false, sku: 'NOVA-FX-012', desc: 'Unisex Training Shoes' }
  ];

  /** Seed localStorage once if empty, then always read from it */
  function getProducts() {
    try {
      const raw = localStorage.getItem('nova_admin_products');
      if (!raw) {
        localStorage.setItem('nova_admin_products', JSON.stringify(CANONICAL_PRODUCTS));
        return [...CANONICAL_PRODUCTS];
      }
      return JSON.parse(raw);
    } catch (e) {
      return [...CANONICAL_PRODUCTS];
    }
  }

  /**
   * Map admin product → collection-compatible object.
   * Only show Active products with stock > 0 to users.
   */
  function toCollectionProduct(ap) {
    const disc = (ap.oldPrice && ap.price) ? Math.round((1 - ap.price / ap.oldPrice) * 100) : (ap.discount || 0);
    return {
      id: ap.id,
      name: ap.name,
      category: ap.category || 'Running',
      gender: ap.gender || 'unisex',
      size: Array.isArray(ap.size) ? ap.size : [7, 8, 9, 10],
      price: Number(ap.price) || 0,
      oldPrice: ap.oldPrice ? Number(ap.oldPrice) : undefined,
      img: ap.img || '',
      stars: ap.stars || 5,
      reviews: ap.reviews || 0,
      new: ap.new || false,
      bestseller: ap.featured || ap.bestseller || false,
      discount: disc,
      color: ap.color || 'white',
      features: ap.features || ['lightweight'],
    };
  }

  const PRODUCTS = getProducts()
    .filter(p => p.status !== 'Inactive' && p.stock > 0)
    .map(toCollectionProduct);



  /* ---------------------------------------------------------
     STATE MANAGEMENT
  --------------------------------------------------------- */
  const cartState = window.novaCartState;

  /* ---------------------------------------------------------
     UI INITIALIZATION
  --------------------------------------------------------- */
  let activeFilters = {
    category: [],
    gender: [],
    size: [],
    price: 12000,
    color: [],
    feature: [],
    tag: [],
    searchQuery: ''
  };
  let activeSort = 'featured';
  let activeView = 'grid';

  const catalogGrid = document.getElementById('catalogGrid');
  const filtersForm = document.getElementById('filtersForm');
  const priceRange = document.getElementById('priceRange');
  const priceVal = document.getElementById('priceVal');
  const displayedCount = document.getElementById('displayedCount');
  const totalCount = document.getElementById('totalCount');
  const sortBy = document.getElementById('sortBy');

  // Parse query params to set initial filters
  function parseQueryParams() {
    const params = new URLSearchParams(window.location.search);

    const query = params.get('q');
    if (query) {
      activeFilters.searchQuery = query;
    }

    const category = params.get('category');
    if (category) {
      activeFilters.category.push(category);
      const checkbox = filtersForm.querySelector(`input[name="category"][value="${category}"]`);
      if (checkbox) checkbox.checked = true;
    }

    let gender = params.get('gender');
    if (window.location.pathname.endsWith('men.html')) {
      gender = 'men';
    } else if (window.location.pathname.endsWith('women.html')) {
      gender = 'women';
    }
    if (gender) {
      activeFilters.gender.push(gender);
      const checkbox = filtersForm.querySelector(`input[name="gender"][value="${gender}"]`);
      if (checkbox) checkbox.checked = true;
    }

    const tag = params.get('tag');
    if (tag) {
      activeFilters.tag.push(tag);
    }
  }

  // Render Product Cards
  function renderProducts(products) {
    if (!catalogGrid) return;

    if (products.length === 0) {
      catalogGrid.innerHTML = `
        <div class="catalog-empty-state" style="grid-column: 1 / -1; padding: 80px 24px; text-align: center; color: var(--platinum-faint);">
          <p style="font-size: 16px;">No products match your active filters.</p>
          <button class="btn btn--ghost" id="resetFiltersLink" style="margin-top: 16px;"><span>Reset Filters</span></button>
        </div>
      `;
      document.getElementById('resetFiltersLink')?.addEventListener('click', resetFilters);
      displayedCount.textContent = '0';
      totalCount.textContent = '0';
      return;
    }

    catalogGrid.innerHTML = '';
    products.forEach((prod) => {
      // Badges
      let badgesHtml = '';
      if (prod.new) badgesHtml += `<span class="badge badge--new">New</span>`;
      if (prod.bestseller) badgesHtml += `<span class="badge badge--best">Bestseller</span>`;
      if (prod.discount > 0) badgesHtml += `<span class="badge badge--sale">-${prod.discount}%</span>`;

      // Rating stars
      const starsHtml = '★'.repeat(prod.stars) + '☆'.repeat(5 - prod.stars);

      // Price block
      let priceHtml = `<span class="product-card__price">₹${prod.price.toLocaleString()}</span>`;
      if (prod.oldPrice) {
        priceHtml += `<span class="product-card__price--old">₹${prod.oldPrice.toLocaleString()}</span>`;
      }

      const card = document.createElement('div');
      card.className = 'product-card';
      card.dataset.id = prod.id;
      card.innerHTML = `
        <div class="product-card__badges">${badgesHtml}</div>
        <button class="wishlist-btn" aria-label="Add to Wishlist">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </button>
        <div class="product-card__img-wrap quickview-trigger" style="cursor: pointer;">
          <img src="${prod.img}" alt="${prod.name}" class="product-card__img" />
        </div>
        <div class="product-card__info">
          <h4 class="product-card__title quickview-trigger" style="cursor: pointer;">${prod.name}</h4>
          <span class="product-card__category">${prod.category} Shoes</span>
          <div class="product-card__rating">
            <span class="stars">${starsHtml}</span>
            <span class="count">(${prod.reviews})</span>
          </div>
          <div class="product-card__footer">
            <div class="product-card__prices">${priceHtml}</div>
            <button class="product-card__cart-btn add-to-cart-btn" data-id="${prod.id}" data-name="${prod.name}" data-price="${prod.price}" data-img="${prod.img}" aria-label="Add to cart">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            </button>
          </div>
        </div>
      `;
      catalogGrid.appendChild(card);
    });

    displayedCount.textContent = `1–${products.length}`;
    totalCount.textContent = products.length;
  }

  // Filter and Sort Handler
  function filterAndSortProducts() {
    let filtered = PRODUCTS.filter((prod) => {
      // Category filter
      if (activeFilters.category.length > 0 && !activeFilters.category.includes(prod.category)) return false;

      // Gender filter
      if (activeFilters.gender.length > 0 && !activeFilters.gender.includes(prod.gender)) return false;

      // Size filter
      if (activeFilters.size.length > 0) {
        const matchesSize = prod.size.some((s) => activeFilters.size.includes(s.toString()));
        if (!matchesSize) return false;
      }

      // Max price filter
      if (prod.price > activeFilters.price) return false;

      // Color filter
      if (activeFilters.color.length > 0 && !activeFilters.color.includes(prod.color)) return false;

      // Features filter
      if (activeFilters.feature.length > 0) {
        const matchesAllFeatures = activeFilters.feature.every((f) => prod.features.includes(f));
        if (!matchesAllFeatures) return false;
      }

      // Tags filter (Home page tags)
      if (activeFilters.tag.length > 0) {
        if (activeFilters.tag.includes('new') && !prod.new) return false;
        if (activeFilters.tag.includes('bestseller') && !prod.bestseller) return false;
      }

      // Search query filter
      if (activeFilters.searchQuery) {
        const q = activeFilters.searchQuery.toLowerCase();
        const matchesQuery = 
          prod.name.toLowerCase().includes(q) ||
          prod.category.toLowerCase().includes(q) ||
          prod.color.toLowerCase().includes(q) ||
          prod.features.some(f => f.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      return true;
    });

    // Sorting
    if (activeSort === 'price-low') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (activeSort === 'price-high') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (activeSort === 'rating') {
      filtered.sort((a, b) => b.reviews - a.reviews);
    } // 'featured' keeps original array order

    renderProducts(filtered);
  }

  // Reset all filters
  function resetFilters() {
    filtersForm.reset();
    activeFilters = {
      category: [],
      gender: [],
      size: [],
      price: 12000,
      color: [],
      feature: [],
      tag: [],
      searchQuery: ''
    };
    priceRange.value = 12000;
    priceVal.textContent = '₹12,000+';

    // Clear size button checks
    document.querySelectorAll('.size-btn input').forEach((inp) => inp.checked = false);

    // Clear URL query param without reload
    const newUrl = window.location.pathname;
    window.history.pushState({ path: newUrl }, '', newUrl);

    filterAndSortProducts();
  }

  /* ---------------------------------------------------------
     SHOPPING CART DRAWER
  --------------------------------------------------------- */
  const cartDrawer = document.getElementById('cartDrawer');
  const cartToggleBtn = document.getElementById('cartToggleBtn');
  const cartCloseBtn = document.getElementById('cartCloseBtn');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartItemsList = document.getElementById('cartItemsList');
  const cartEmptyState = document.getElementById('cartEmptyState');
  const cartFooter = document.getElementById('cartFooter');
  const cartSubtotalAmount = document.getElementById('cartSubtotalAmount');

  async function openCart() {
    await renderCartDrawer();
    cartDrawer.classList.add('is-open');
  }

  function closeCart() {
    cartDrawer.classList.remove('is-open');
  }

  if (cartToggleBtn) cartToggleBtn.addEventListener('click', openCart);
  if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  async function renderCartDrawer() {
    const cart = await cartState.get();
    const count = cart.reduce((acc, item) => acc + item.qty, 0);
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

    // Sync counts
    const navbarCountEl = document.getElementById('cartCount');
    const headerCountEl = document.getElementById('cartCountHeader');
    if (navbarCountEl) navbarCountEl.textContent = count;
    if (headerCountEl) headerCountEl.textContent = count;

    if (cart.length === 0) {
      cartEmptyState.style.display = 'flex';
      cartItemsList.style.display = 'none';
      cartFooter.style.display = 'none';
    } else {
      cartEmptyState.style.display = 'none';
      cartItemsList.style.display = 'flex';
      cartFooter.style.display = 'block';
      cartSubtotalAmount.textContent = `₹${subtotal.toLocaleString()}`;

      cartItemsList.innerHTML = '';
      cart.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'cart-item';
        li.innerHTML = `
          <div class="cart-item__img-wrap">
            <img src="${item.img}" alt="${item.name}" class="cart-item__img" />
          </div>
          <div class="cart-item__details">
            <h4 class="cart-item__name">${item.name}</h4>
            <span class="cart-item__size" style="font-size: 12px; color: var(--platinum-faint);">UK ${item.size}</span>
            <div class="cart-item__qty">
              <button class="qty-btn dec-qty" data-id="${item.id}" data-size="${item.size}">-</button>
              <span class="qty-val">${item.qty}</span>
              <button class="qty-btn inc-qty" data-id="${item.id}" data-size="${item.size}">+</button>
            </div>
          </div>
          <div style="text-align: right; display:flex; flex-direction:column; justify-content:space-between; height: 100%;">
            <button class="cart-item__remove remove-item" data-id="${item.id}" data-size="${item.size}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
            <span class="cart-item__price" style="margin-top:20px;">₹${(item.price * item.qty).toLocaleString()}</span>
          </div>
        `;
        cartItemsList.appendChild(li);
      });
    }
  }

  // Handle drawer quantity edits
  if (cartItemsList) {
    cartItemsList.addEventListener('click', async (e) => {
      const target = e.target;
      const dec = target.closest('.dec-qty');
      const inc = target.closest('.inc-qty');
      const remove = target.closest('.remove-item');

      const cart = await cartState.get();

      if (dec) {
        const item = cart.find(i => i.id === dec.dataset.id && i.size === Number(dec.dataset.size));
        await cartState.updateQty(dec.dataset.id, Number(dec.dataset.size), item ? item.itemId : null, -1);
      } else if (inc) {
        const item = cart.find(i => i.id === inc.dataset.id && i.size === Number(inc.dataset.size));
        await cartState.updateQty(inc.dataset.id, Number(inc.dataset.size), item ? item.itemId : null, 1);
      } else if (remove) {
        const item = cart.find(i => i.id === remove.dataset.id && i.size === Number(remove.dataset.size));
        await cartState.remove(remove.dataset.id, Number(remove.dataset.size), item ? item.itemId : null);
      }
    });
  }

  // checkout button
  const checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async () => {
      const cart = await cartState.get();
      if (cart.length === 0) {
        alert('Your shopping cart is empty!');
        return;
      }
      window.location.href = 'checkout.html';
    });
  }

  /* ---------------------------------------------------------
     QUICK VIEW MODAL
  --------------------------------------------------------- */
  const quickviewModal = document.getElementById('quickviewModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalContent = document.getElementById('modalContent');

  function openQuickView(prodId) {
    const prod = PRODUCTS.find((p) => p.id === prodId);
    if (!prod || !quickviewModal || !modalContent) return;

    const starsHtml = '★'.repeat(prod.stars) + '☆'.repeat(5 - prod.stars);

    // Size selectors
    let sizesHtml = '';
    prod.size.forEach((sz, idx) => {
      sizesHtml += `
        <label class="size-btn">
          <input type="radio" name="modal-size" value="${sz}" ${idx === 1 ? 'checked' : ''} />
          <span>${sz}</span>
        </label>
      `;
    });

    modalContent.innerHTML = `
      <div class="quickview-grid">
        <div class="quickview-img-panel">
          <img src="${prod.img}" alt="${prod.name}" />
        </div>
        <div class="quickview-info-panel">
          <h2 class="quickview-title">${prod.name}</h2>
          <span class="quickview-cat">${prod.category} Shoes</span>
          <div class="quickview-rating">
            <span class="stars">${starsHtml}</span>
            <span class="count">(${prod.reviews} customer reviews)</span>
          </div>
          <div class="quickview-price">₹${prod.price.toLocaleString()}</div>
          <p class="quickview-desc">Engineered with high-tech cushioning, custom-molded carbon stability plates, and a sleek lightweight silhouette. Perfect for high-intensity activity and premium everyday luxury.</p>
          
          <div class="quickview-size-selector">
            <div class="selector-title">Select Size (UK)</div>
            <div class="quickview-sizes">${sizesHtml}</div>
          </div>

          <div class="quickview-actions">
            <button class="btn btn--solid quickview-add-btn modal-add-to-cart-btn" data-id="${prod.id}" data-name="${prod.name}" data-price="${prod.price}" data-img="${prod.img}">
              <span>Add to Bag</span>
            </button>
            <button class="quickview-wish-btn" aria-label="Add to Wishlist">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `;

    quickviewModal.classList.add('is-open');

    // Add to cart click inside modal
    const modalAddBtn = modalContent.querySelector('.modal-add-to-cart-btn');
    modalAddBtn.addEventListener('click', async (e) => {
      // Auth guard
      if (typeof window.requireLogin === 'function') {
        if (!window.requireLogin('Sign in to add items to your cart and start shopping.')) return;
      }
      const selectedSize = Number(modalContent.querySelector('input[name="modal-size"]:checked').value);
      await cartState.add(prod.id, prod.name, prod.price, prod.img, selectedSize);

      // visual animation feedback
      modalAddBtn.querySelector('span').textContent = 'Added to Bag!';
      setTimeout(() => {
        modalAddBtn.querySelector('span').textContent = 'Add to Bag';
        quickviewModal.classList.remove('is-open');
        openCart();
      }, 800);
    });
  }

  function closeQuickView() {
    quickviewModal.classList.remove('is-open');
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeQuickView);
  if (modalOverlay) modalOverlay.addEventListener('click', closeQuickView);

  // Trigger quick view clicks
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.quickview-trigger');
    if (trigger) {
      const card = trigger.closest('.product-card');
      if (card) {
        openQuickView(card.dataset.id);
      }
    }
  });

  /* ---------------------------------------------------------
     EVENT LISTENERS & BINDINGS
  --------------------------------------------------------- */

  // Accordion Expand/Collapse
  document.querySelectorAll('.filter-group__trigger').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const group = trigger.closest('.filter-group');
      group.classList.toggle('open');
    });
  });

  // Price Slider input
  if (priceRange) {
    priceRange.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      if (val >= 12000) {
        priceVal.textContent = '₹12,000+';
        activeFilters.price = 15000; // include all
      } else {
        priceVal.textContent = `₹${val.toLocaleString()}`;
        activeFilters.price = val;
      }
    });
  }

  // Sidebar changes
  if (filtersForm) {
    // Checkbox and range edits trigger apply automatically for real-time
    filtersForm.addEventListener('change', () => {
      updateFilterState();
      filterAndSortProducts();
    });
  }

  function updateFilterState() {
    // Categories
    activeFilters.category = Array.from(filtersForm.querySelectorAll('input[name="category"]:checked')).map((el) => el.value);

    // Genders
    activeFilters.gender = Array.from(filtersForm.querySelectorAll('input[name="gender"]:checked')).map((el) => el.value);

    // Sizes
    activeFilters.size = Array.from(filtersForm.querySelectorAll('input[name="size"]:checked')).map((el) => el.value);

    // Color swatches
    activeFilters.color = Array.from(filtersForm.querySelectorAll('input[name="color"]:checked')).map((el) => el.value);

    // Features
    activeFilters.feature = Array.from(filtersForm.querySelectorAll('input[name="feature"]:checked')).map((el) => el.value);
  }

  // Apply filters button
  const applyFiltersBtn = document.getElementById('applyFiltersBtn');
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', () => {
      updateFilterState();
      filterAndSortProducts();
      // On mobile, close sidebar drawer
      document.getElementById('filtersSidebar').classList.remove('is-open');
    });
  }

  // Clear filters
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', resetFilters);
  }

  // Sort dropdown
  if (sortBy) {
    sortBy.addEventListener('change', (e) => {
      activeSort = e.target.value;
      filterAndSortProducts();
    });
  }

  // Grid/List switchers
  const viewGrid = document.getElementById('viewGrid');
  const viewList = document.getElementById('viewList');
  if (viewGrid && viewList) {
    viewGrid.addEventListener('click', () => {
      viewGrid.classList.add('active');
      viewList.classList.remove('active');
      catalogGrid.classList.remove('list-view');
      activeView = 'grid';
    });
    viewList.addEventListener('click', () => {
      viewList.classList.add('active');
      viewGrid.classList.remove('active');
      catalogGrid.classList.add('list-view');
      activeView = 'list';
    });
  }

  // Mobile Filters drawer toggle
  const mobileFiltersToggle = document.getElementById('mobileFiltersToggle');
  const closeFiltersBtn = document.getElementById('closeFiltersBtn');
  if (mobileFiltersToggle) {
    mobileFiltersToggle.addEventListener('click', () => {
      document.getElementById('filtersSidebar').classList.add('is-open');
    });
  }
  if (closeFiltersBtn) {
    closeFiltersBtn.addEventListener('click', () => {
      document.getElementById('filtersSidebar').classList.remove('is-open');
    });
  }

  // Add to cart buttons globally (product cards)
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.add-to-cart-btn');
    if (btn) {
      e.preventDefault();
      // Auth guard — must be logged in to add to cart
      if (typeof window.requireLogin === 'function') {
        if (!window.requireLogin('Sign in to add items to your cart and start shopping.')) return;
      }
      // If it's the product card cart button, we add default size 9
      await cartState.add(btn.dataset.id, btn.dataset.name, btn.dataset.price, btn.dataset.img, 9);

      // Animate card count update
      btn.style.transform = 'scale(0.85)';
      setTimeout(() => {
        btn.style.transform = '';
        openCart();
      }, 150);
    }
  });

  // Listen for local changes
  window.addEventListener('cartUpdated', renderCartDrawer);

  // Mobile burger menu
  const burger = document.getElementById('navBurger');
  if (burger) {
    burger.addEventListener('click', () => {
      const expanded = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!expanded));
      document.querySelector('.nav__links').style.display = expanded ? '' : 'flex';
    });
  }


  // Global search interface hook
  window.updateCollectionSearch = (query) => {
    activeFilters.searchQuery = query;
    filterAndSortProducts();
  };

  /* ---------------------------------------------------------
     RUN BOOT
  --------------------------------------------------------- */
  parseQueryParams();
  filterAndSortProducts();
  renderCartDrawer();

})();

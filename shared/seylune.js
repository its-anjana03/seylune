/* ============================================================
   SEYLUNE — SHARED SITE JAVASCRIPT
   Loaded on every page (after shared/products.js).
   Handles everything that used to be copied into each page:
   1. Paths + catalogue helpers
   2. Safe localStorage helpers
   3. Cart (items are kept apart by id AND size)
   3b. Stock, recently viewed, looks
   4. Wishlist (saved pieces)
   5. Toast messages
   6. Search forms (the menu room lives in shared/site.js)
   7. Product card rendering + add-to-cart / wishlist buttons
   8. Catalogue filters + sort (category pages)
   9. Footer newsletter + skip link
============================================================ */

const Seylune = (() => {

  /* ============================================================
     1. PATHS + CATALOGUE HELPERS
     Every page lives one folder below the site root.
  ============================================================ */
  const ROOT = "../";

  const KEYS = {
    cart:     "seylune_cart",
    wishlist: "seylune_wishlist",
    user:     "seylune_user",
    accounts: "seylune_accounts",
    orders:   "seylune_orders",
    recent:   "seylune_recent"
  };

  // Delivery rules (also shown in the announcement bar)
  const FREE_DELIVERY_MIN = 10000;
  const DELIVERY = {
    standard: { label: "Standard Delivery (2–4 working days)", price: 450 },
    express:  { label: "Express Delivery (1–2 working days)",  price: 950 }
  };

  const products = typeof SEYLUNE_PRODUCTS !== "undefined" ? SEYLUNE_PRODUCTS : [];

  // Photos in the repo are stored as "home/images/…"; uploaded ones are full URLs
  function asset(path)      { return /^https?:/.test(path || "") ? path : ROOT + path; }
  function productUrl(id)   { return ROOT + "Product/product.html?id=" + encodeURIComponent(id); }
  function getProduct(id)   { return products.find(p => p.id === id) || null; }

  function categoryUrl(category) {
    const pages = {
      Dresses: "Dresses/dresses.html",
      Tops:    "Tops/tops.html",
      Bottoms: "Bottoms/bottoms.html",
      Outerwear: "Outerwear/outerwear.html",
      Accessories: "Accessories/accessories.html"
    };
    return ROOT + (pages[category] || "New arrivals/new-arriavals.html");
  }

  // Escape text before putting it inside innerHTML
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[ch]);
  }

  // "Rs. 8,950"
  /* ----- Prices: a piece may carry a sale price ----- */
  function priceOf(p)  { return p.salePrice || p.price; }
  function onSale(p)   { return !!p.salePrice && p.salePrice < p.price; }

  // "Rs. 8,950", or the full price struck through beside the sale price
  function priceHtml(p) {
    return onSale(p)
      ? `<s class="price-was">${formatPrice(p.price)}</s> <span class="price-now">${formatPrice(p.salePrice)}</span>`
      : formatPrice(p.price);
  }

  /* ----- The catalogue from the database -----
     shared/products.js is the built-in copy (and the demo-mode
     catalogue). When shared/backend.js loads the live catalogue,
     setCatalogue() replaces the pieces in place, so every page
     reading Seylune.products sees the same list. */
  function setCatalogue(list) {
    products.splice(0, products.length, ...list);
    document.dispatchEvent(new CustomEvent("seylune:catalogue"));
  }

  // Run fn once the live catalogue has arrived (or straight away in demo
  // mode). If the database is slow, the built-in copy is used after 2.5s.
  function whenCatalogue(fn) {
    const backend = typeof SeyluneBackend !== "undefined" && SeyluneBackend.enabled ? SeyluneBackend : null;
    if (!backend) { fn(); return; }
    let done = false;
    const run = () => { if (!done) { done = true; fn(); } };
    backend.catalogue.then(run, run);
    setTimeout(run, 2500);
  }

  function formatPrice(amount) {
    return "Rs. " + Number(amount).toLocaleString("en-IN");
  }


  /* ============================================================
     2. SAFE STORAGE
     localStorage can throw (private mode, blocked storage),
     so every read/write goes through these helpers.
  ============================================================ */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage unavailable — the page still works for this visit */
    }
  }

  function remove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }


  /* ============================================================
     3. CART
     Each line is unique by product id + size, so the same dress
     in S and M are two separate lines.
  ============================================================ */
  function lineKey(item) {
    return item.id + "|" + (item.size || "");
  }

  function getCart() {
    const cart = read(KEYS.cart, []);
    return Array.isArray(cart) ? cart : [];
  }

  function saveCart(cart) {
    write(KEYS.cart, cart);
    updateCartBadge();
  }

  function getCartCount() {
    return getCart().reduce((total, item) => total + item.quantity, 0);
  }

  function getSubtotal(cart) {
    return (cart || getCart()).reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  function getShipping(subtotal, method) {
    const option = DELIVERY[method] || DELIVERY.standard;
    if (subtotal === 0) return 0;
    if (method !== "express" && subtotal >= FREE_DELIVERY_MIN) return 0;
    return option.price;
  }

  function addToCart(product) {
    const cart = getCart();
    const quantity = product.quantity || 1;
    const size = product.size || "";
    const existing = cart.find(item => lineKey(item) === lineKey({ id: product.id, size }));

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        id:       product.id,
        name:     product.name,
        price:    product.price,
        image:    product.image,
        size:     size,
        quantity: quantity
      });
    }

    saveCart(cart);
  }

  function changeQuantity(key, delta) {
    const cart = getCart();
    const item = cart.find(i => lineKey(i) === key);
    if (!item) return;
    item.quantity = Math.max(1, item.quantity + delta);
    saveCart(cart);
  }

  function removeFromCart(key) {
    saveCart(getCart().filter(i => lineKey(i) !== key));
  }

  // Change the size of one cart line (merges with an existing line of that size)
  function changeSize(key, newSize) {
    const cart = getCart();
    const item = cart.find(i => lineKey(i) === key);
    if (!item) return;

    const target = cart.find(i => i !== item && lineKey(i) === lineKey({ id: item.id, size: newSize }));
    if (target) {
      target.quantity += item.quantity;
      cart.splice(cart.indexOf(item), 1);
    } else {
      item.size = newSize;
    }
    saveCart(cart);
  }

  /* ============================================================
     3b. STOCK, RECENTLY VIEWED, LOOKS
     Stock comes from the database once shared/backend.js has
     loaded it (setStock). Until then — or in demo mode — every
     size uses the same made-up starting count as
     supabase/make-seed.js, so nothing jumps when the real numbers
     arrive.
  ============================================================ */
  let stockMap = null;   // { "id|size": quantity } from the database

  function demoStock(id, size) {
    let h = 2166136261;
    for (const ch of id + "|" + size) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const n = Math.abs(h) % 20;
    if (n < 2) return 0;
    if (n < 5) return n - 1;
    return 4 + (n % 7);
  }

  // How many are left: a number, or null when unknown (never blocks a sale)
  function stockLeft(id, size) {
    if (!id || !size) return null;
    if (stockMap) {
      const left = stockMap[id + "|" + size];
      return left == null ? null : left;
    }
    return demoStock(id, size);
  }

  function setStock(rows) {
    stockMap = {};
    rows.forEach(r => { stockMap[r.product_id + "|" + r.size] = r.quantity; });
    document.dispatchEvent(new CustomEvent("seylune:stock"));
  }

  // "Only 2 left" / "Sold out" / ""
  function stockNote(id, size) {
    const left = stockLeft(id, size);
    if (left === 0) return "Sold out";
    if (left != null && left <= 3) return `Only ${left} left`;
    return "";
  }

  // Round size buttons that add straight to the cart; sold-out sizes are struck through
  function sizePills(p, extraLabel) {
    const name  = escapeHtml(p.name);
    const image = asset(p.image);
    return (p.sizes || []).map(s => {
      const out = stockLeft(p.id, s) === 0;
      return `<button type="button" class="size-pill add-to-cart${s.length > 2 ? " is-wide" : ""}${out ? " is-sold-out" : ""}"
        data-id="${p.id}" data-name="${name}" data-price="${priceOf(p)}" data-image="${image}" data-size="${s}"
        ${out ? `aria-disabled="true" aria-label="${name}, size ${s}, sold out"`
               : `aria-label="Add ${name}, size ${s}, to cart${extraLabel || ""}"`}>${s}</button>`;
    }).join("");
  }

  function getRecent() {
    const list = read(KEYS.recent, []);
    return Array.isArray(list) ? list.filter(id => getProduct(id)) : [];
  }

  function rememberViewed(id) {
    write(KEYS.recent, [id].concat(getRecent().filter(x => x !== id)).slice(0, 8));
  }

  // The styled outfit a piece belongs to (SEYLUNE_LOOKS in products.js)
  function lookFor(id) {
    const looks = typeof SEYLUNE_LOOKS !== "undefined" ? SEYLUNE_LOOKS : [];
    const look = looks.find(l => l.pieces.includes(id));
    if (!look) return null;
    return { name: look.name, pieces: look.pieces.filter(x => x !== id).map(getProduct).filter(Boolean) };
  }

  // Tell the page a piece went into the cart. site.js opens the bag
  // drawer and cancels the event; without it, a toast says so instead.
  function announceAdd(product) {
    return !document.dispatchEvent(new CustomEvent("seylune:added", { detail: product, cancelable: true }));
  }

  // Bring the cart in line with the catalogue (a price changed, a sale
  // started, a photo was replaced). Returns pieces that are gone.
  function refreshCart() {
    const cart = getCart();
    const gone = [];
    let changed = false;
    cart.forEach(item => {
      const p = getProduct(item.id);
      if (!p) { gone.push(item); return; }
      const price = priceOf(p), image = asset(p.image);
      if (item.price !== price || item.name !== p.name || item.image !== image) {
        Object.assign(item, { price, name: p.name, image });
        changed = true;
      }
    });
    if (changed) saveCart(cart);
    return gone;
  }

  function clearCart() {
    saveCart([]);
  }

  function updateCartBadge() {
    const count = getCartCount();
    document.querySelectorAll("#cartBadge, .cart-badge").forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? "flex" : "none";
    });
    document.querySelectorAll(".cart-icon").forEach(link => {
      link.setAttribute("aria-label", count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart");
    });
  }


  /* ============================================================
     4. WISHLIST (saved pieces)
  ============================================================ */
  function getWishlist() {
    const list = read(KEYS.wishlist, []);
    return Array.isArray(list) ? list : [];
  }

  function isSaved(id) {
    return getWishlist().includes(id);
  }

  function toggleWishlist(id) {
    const list = getWishlist();
    const index = list.indexOf(id);
    if (index === -1) list.push(id);
    else list.splice(index, 1);
    write(KEYS.wishlist, list);
    syncWishlistButtons();
    return index === -1;   // true = now saved
  }

  function syncWishlistButtons() {
    const list = getWishlist();
    document.querySelectorAll(".wishlist-btn").forEach(btn => {
      const saved = list.includes(btn.dataset.id);
      const name = btn.dataset.name || "this piece";
      btn.classList.toggle("saved", saved);
      btn.setAttribute("aria-pressed", saved);
      btn.setAttribute("aria-label", saved ? `Remove ${name} from saved pieces` : `Save ${name}`);
    });
  }


  /* ============================================================
     5. TOAST MESSAGES
     A small gold-bordered message at the bottom of the screen,
     announced to screen readers through aria-live.
  ============================================================ */
  let toastTimer = null;

  function toast(message, linkText, linkHref) {
    let box = document.getElementById("seyluneToast");
    if (!box) {
      box = document.createElement("div");
      box.id = "seyluneToast";
      box.className = "toast";
      box.setAttribute("role", "status");
      box.setAttribute("aria-live", "polite");
      document.body.appendChild(box);
    }

    box.innerHTML = escapeHtml(message) +
      (linkText ? ` <a href="${escapeHtml(linkHref)}">${escapeHtml(linkText)}</a>` : "");
    box.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove("show"), 3200);
  }


  /* ============================================================
     6. SEARCH FORMS
     (The menu room itself is run by shared/site.js.)
  ============================================================ */
  function initSearchForms() {
    document.querySelectorAll(".nav-search").forEach(form => {
      form.setAttribute("action", ROOT + "Search/search.html");
      form.addEventListener("submit", e => {
        const input = form.querySelector("input[name='q']");
        if (!input || !input.value.trim()) {
          e.preventDefault();
          if (input) input.focus();
        }
      });
    });
  }


  /* ============================================================
     7. PRODUCT CARDS
  ============================================================ */
  const HEART_SVG =
    `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
       <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"></path>
     </svg>`;

  /* A photograph, the name and the price. Pointing at the photo
     brings up the sizes: one tap adds that size to the cart. */
  function renderProductCard(p) {
    const url   = productUrl(p.id);
    const image = asset(p.image);
    const name  = escapeHtml(p.name);

    return `
      <article class="product-card" data-id="${p.id}" data-price="${priceOf(p)}">
        <div class="product-frame">
          <a href="${url}" class="product-image-link" tabindex="-1" aria-hidden="true">
            <div class="product-image">
              <img src="${image}" alt="" loading="lazy" />
            </div>
          </a>
          <div class="card-sizes" role="group" aria-label="Add ${name} to cart in size">
            ${sizePills(p)}
          </div>
          <button type="button" class="quick-btn" data-id="${p.id}" aria-label="Quick view: ${name}">Quick view</button>
        </div>
        <div class="product-info">
          <p class="product-card-category">${escapeHtml(p.category)}${onSale(p) ? ` · <span class="sale-word">Sale</span>` : ""}</p>
          <h3 class="product-name"><a href="${url}">${name}</a></h3>
          <p class="product-price">${priceHtml(p)}</p>
        </div>
      </article>`;
  }

  // Give every product card a heart button (cards already in HTML + rendered ones)
  function addWishlistButtons(scope) {
    (scope || document).querySelectorAll(".product-card").forEach(card => {
      if (card.querySelector(".wishlist-btn")) return;
      const source = card.querySelector(".add-to-cart");
      const id = card.dataset.id || (source && source.dataset.id);
      if (!id) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "wishlist-btn";
      btn.dataset.id = id;
      btn.dataset.name = (source && source.dataset.name) || (getProduct(id) || {}).name || "";
      btn.innerHTML = HEART_SVG;
      card.appendChild(btn);
    });
    syncWishlistButtons();
  }

  // One click handler for every "Add to Cart" and heart button on the page
  function initCardButtons() {
    document.addEventListener("click", e => {

      const addBtn = e.target.closest(".add-to-cart");
      if (addBtn && !addBtn.disabled) {
        if (stockLeft(addBtn.dataset.id, addBtn.dataset.size) === 0) {
          toast(`${addBtn.dataset.name} in size ${addBtn.dataset.size} is sold out.`);
          return;
        }
        const product = {
          id:    addBtn.dataset.id,
          name:  addBtn.dataset.name,
          price: parseInt(addBtn.dataset.price, 10),
          image: addBtn.dataset.image,
          size:  addBtn.dataset.size || ""   // size buttons carry their size
        };
        addToCart(product);

        // A size button keeps its label and lights up; a text button says "Added"
        const originalText = addBtn.textContent;
        if (product.size) addBtn.classList.add("added");
        else addBtn.textContent = "Added ✓";
        addBtn.disabled = true;
        setTimeout(() => {
          addBtn.textContent = originalText;
          addBtn.classList.remove("added");
          addBtn.disabled = false;
        }, 1200);

        if (announceAdd(product)) return;   // the bag drawer opened
        const needsSize = !product.size && (getProduct(product.id) || {}).sizes;
        toast(
          product.size ? `${product.name}, size ${product.size}, added to your cart.`
            : needsSize ? `${product.name} added — choose your size in the cart.` : `${product.name} added to your cart.`,
          "View cart",
          ROOT + "Cart/cart.html"
        );
        return;
      }

      const heart = e.target.closest(".wishlist-btn");
      if (heart) {
        e.preventDefault();
        const saved = toggleWishlist(heart.dataset.id);
        const name = heart.dataset.name || "Piece";
        toast(saved ? `${name} saved to your account.` : `${name} removed from saved pieces.`,
              saved ? "View saved" : "", ROOT + "Account/Account.html#saved");
      }
    });
  }


  /* ============================================================
     8. CATALOGUE FILTERS + SORT
     Used on New Arrivals and every collection page.
     The cards stay in the HTML; each card's size and colour come
     from the shared catalogue using its data-id.
     options.prices = [{ value, label, min, max }]
  ============================================================ */
  function initCatalog(options) {
    const grid = document.getElementById("productGrid");
    if (!grid) return;

    const panel      = document.getElementById("filterPanel");
    const toggle     = document.getElementById("filterToggle");
    const sortSelect = document.getElementById("sortSelect");
    const counter    = document.getElementById("resultCount");
    const emptyState = document.getElementById("emptyState");
    const prices     = (options && options.prices) || [];

    const cards = Array.from(grid.querySelectorAll(".product-card"));
    cards.forEach((card, index) => {
      const id = card.dataset.id || (card.querySelector(".add-to-cart") || {}).dataset.id;
      const product = getProduct(id) || {};
      card.dataset.id = id;
      card.dataset.order = card.dataset.order || index + 1;
      card.dataset.size = (product.sizes || []).join("|");   // "|" because "One Size" has a space
      card.dataset.color = product.color || "";
      card.dataset.price = product.price ? priceOf(product) : card.dataset.price;
      card.dataset.sale = onSale(product) ? "yes" : "no";
    });

    const state = { size: "all", color: "all", price: "all", sale: "all", sort: "newest" };

    /* ----- Build the filter panel from what is on this page ----- */
    if (panel) {
      const sizesOnPage  = SEYLUNE_SIZES.concat("One Size").filter(s => cards.some(c => c.dataset.size.split("|").includes(s)));
      const colorsOnPage = Object.keys(SEYLUNE_COLORS).filter(k => cards.some(c => c.dataset.color === k));

      const chip = (value, label, extra) =>
        `<button type="button" class="filter-chip" data-value="${value}" aria-pressed="false">${extra || ""}${label}</button>`;

      panel.innerHTML = `
        <div class="filter-panel-inner">
          ${sizesOnPage.length > 1 ? `
          <div class="filter-group">
            <p class="filter-label" id="filterSizeLabel">Size</p>
            <div class="filter-options" data-filter="size" role="group" aria-labelledby="filterSizeLabel">
              ${chip("all", "All")}${sizesOnPage.map(s => chip(s, s)).join("")}
            </div>
          </div>` : ""}
          <div class="filter-group">
            <p class="filter-label" id="filterColorLabel">Colour</p>
            <div class="filter-options" data-filter="color" role="group" aria-labelledby="filterColorLabel">
              ${chip("all", "All")}${colorsOnPage.map(k =>
                chip(k, SEYLUNE_COLORS[k].label, `<span class="swatch" style="background:${SEYLUNE_COLORS[k].swatch}"></span>`)
              ).join("")}
            </div>
          </div>
          <div class="filter-group">
            <p class="filter-label" id="filterPriceLabel">Price</p>
            <div class="filter-options" data-filter="price" role="group" aria-labelledby="filterPriceLabel">
              ${chip("all", "All")}${prices.map(p => chip(p.value, p.label)).join("")}
            </div>
          </div>
          ${cards.some(c => c.dataset.sale === "yes") ? `
          <div class="filter-group">
            <p class="filter-label" id="filterSaleLabel">Offers</p>
            <div class="filter-options" data-filter="sale" role="group" aria-labelledby="filterSaleLabel">
              ${chip("all", "All")}${chip("yes", "On sale")}
            </div>
          </div>` : ""}
          <div class="filter-actions">
            <button type="button" class="btn btn-small" id="resetFilters">Reset Filters</button>
          </div>
        </div>`;

      panel.querySelectorAll(".filter-options").forEach(group => {
        const name = group.dataset.filter;
        group.addEventListener("click", e => {
          const chipBtn = e.target.closest(".filter-chip");
          if (!chipBtn) return;
          state[name] = chipBtn.dataset.value;
          apply();
        });
      });
    }

    if (toggle && panel) {
      toggle.setAttribute("aria-controls", "filterPanel");
      toggle.addEventListener("click", () => {
        const open = panel.hidden;
        panel.hidden = !open;
        toggle.setAttribute("aria-expanded", open);
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener("change", () => {
        state.sort = sortSelect.value;
        apply();
      });
    }

    function reset() {
      state.size = state.color = state.price = state.sale = "all";
      state.sort = "newest";
      if (sortSelect) sortSelect.value = "newest";
      apply();
    }

    document.addEventListener("click", e => {
      if (e.target.closest("#resetFilters, #emptyReset")) reset();
    });

    function priceMatches(price) {
      if (state.price === "all") return true;
      const range = prices.find(p => p.value === state.price);
      if (!range) return true;
      return price >= (range.min || 0) && (range.max == null || price <= range.max);
    }

    function apply() {
      let visible = 0;

      cards.forEach(card => {
        const match =
          (state.size === "all"  || card.dataset.size.split("|").includes(state.size)) &&
          (state.sale === "all"  || card.dataset.sale === state.sale) &&
          (state.color === "all" || card.dataset.color === state.color) &&
          priceMatches(parseInt(card.dataset.price, 10));

        card.hidden = !match;
        if (match) visible++;
      });

      cards.slice().sort((a, b) => {
        const priceA = parseInt(a.dataset.price, 10), priceB = parseInt(b.dataset.price, 10);
        if (state.sort === "price-low")  return priceA - priceB;
        if (state.sort === "price-high") return priceB - priceA;
        return a.dataset.order - b.dataset.order;
      }).forEach(card => grid.appendChild(card));

      // Chip UI
      if (panel) {
        panel.querySelectorAll(".filter-options").forEach(group => {
          group.querySelectorAll(".filter-chip").forEach(c => {
            const active = c.dataset.value === state[group.dataset.filter];
            c.classList.toggle("active", active);
            c.setAttribute("aria-pressed", active);
          });
        });
      }

      // Number of active filters on the toggle button
      const activeCount = ["size", "color", "price", "sale"].filter(k => state[k] !== "all").length;
      const badge = document.getElementById("filterCount");
      if (badge) {
        badge.textContent = activeCount;
        badge.hidden = activeCount === 0;
      }

      if (counter) counter.textContent = visible;
      if (emptyState) emptyState.hidden = visible > 0;
      if (options && options.onApply) options.onApply(visible);
    }

    apply();
  }


  /* ============================================================
     9. FOOTER NEWSLETTER + SKIP LINK
  ============================================================ */
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function initFooterForms() {
    document.querySelectorAll(".footer-form").forEach(form => {
      form.removeAttribute("onsubmit");
      let message = form.parentElement.querySelector(".footer-form-message");
      if (!message) {
        message = document.createElement("p");
        message.className = "footer-form-message";
        message.setAttribute("aria-live", "polite");
        form.after(message);
      }

      const input = form.querySelector("input");
      const button = form.querySelector("button");
      if (button && !button.getAttribute("aria-label")) button.setAttribute("aria-label", "Subscribe");

      form.addEventListener("submit", e => {
        e.preventDefault();
        if (!EMAIL_PATTERN.test(input.value.trim())) {
          message.textContent = "Please enter a valid email address.";
          message.classList.add("error");
          return;
        }
        message.textContent = "Thank you — you're on the list.";
        message.classList.remove("error");
        form.reset();
      });
    });
  }

  function initSkipLink() {
    const main = document.querySelector("main");
    if (!main || document.querySelector(".skip-link")) return;
    if (!main.id) main.id = "main";
    main.setAttribute("tabindex", "-1");

    const link = document.createElement("a");
    link.className = "skip-link";
    link.href = "#" + main.id;
    link.textContent = "Skip to content";
    document.body.prepend(link);
  }


  /* ============================================================
     INIT — runs on every page
  ============================================================ */
  function init() {
    initSkipLink();
    initSearchForms();
    initCardButtons();
    addWishlistButtons();
    initFooterForms();
    updateCartBadge();

    // Keep the badge in sync if the cart changes in another tab
    window.addEventListener("storage", e => {
      if (e.key === KEYS.cart) updateCartBadge();
      if (e.key === KEYS.wishlist) syncWishlistButtons();
    });
  }

  init();

  /* ---------- Public API used by the page scripts ---------- */
  return {
    ROOT, KEYS, DELIVERY, FREE_DELIVERY_MIN, EMAIL_PATTERN,
    products, getProduct, asset, productUrl, categoryUrl,
    escapeHtml, formatPrice, read, write, remove,
    lineKey, getCart, saveCart, getCartCount, getSubtotal, getShipping, refreshCart,
    priceOf, onSale, priceHtml, setCatalogue, whenCatalogue,
    addToCart, changeQuantity, changeSize, removeFromCart, clearCart, updateCartBadge,
    getWishlist, isSaved, toggleWishlist, syncWishlistButtons,
    toast, renderProductCard, addWishlistButtons, initCatalog, HEART_SVG,
    stockLeft, setStock, stockNote, sizePills, getRecent, rememberViewed, lookFor, announceAdd
  };
})();

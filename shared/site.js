/* ============================================================
   SEYLUNE — SITE MOTION + SHARED ROOMS
   Loaded on every page after shared/seylune.js, GSAP and
   shared/liquid.js.
   1. The menu: a full-screen room with liquid photographs
   2. Pages: the photograph comes up out of the dark, the words
      follow; following a link fades the page out first
   3. The index: a list of names beside a photograph that melts
      to the piece you point at (collections + search)
   4. Layers: shared open/close for the bag, quick view and zoom
   5. The bag drawer: adding to the cart slides it in
   6. Quick view: a piece in an overlay, from any card
   7. Zoom: the photographs full screen, click to look closer
   With reduced motion (or without GSAP/WebGL) everything still
   works, just without the movement.
============================================================ */

const SeyluneSite = (() => {
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canAnimate = !reduced && typeof gsap !== "undefined";
  const liquid = typeof SeyluneLiquid !== "undefined" ? SeyluneLiquid : null;
  const $ = id => document.getElementById(id);

  if (!canAnimate) root.classList.remove("anim");


  /* ============================================================
     1. THE MENU
     "Menu" (or "Search") opens a full-screen room; each name you
     point at melts the photograph beside it. Esc or "Close"
     returns to the page.
  ============================================================ */
  const overlay = $("menuOverlay");
  const menuToggle = $("menuToggle");
  const searchOpen = $("searchOpen");
  const isMenuOpen = () => document.body.classList.contains("menu-open");

  if (overlay && menuToggle) {
    const menuLinks = Array.from(overlay.querySelectorAll("#menuLinks a"));
    const here = Math.max(0, menuLinks.findIndex(a => a.getAttribute("aria-current") === "page"));
    let menuLiquid = null;
    let menuCloseTimer = null;

    const showMenuItem = i => {
      menuLinks.forEach((l, k) => l.classList.toggle("is-active", k === i));
      if (menuLiquid) menuLiquid.show(i, 1100);
    };

    const openMenu = focusSearch => {
      clearTimeout(menuCloseTimer);
      overlay.hidden = false;
      void overlay.offsetWidth;           // let the closed state paint first
      overlay.classList.add("is-open");
      document.body.classList.add("menu-open");
      menuToggle.setAttribute("aria-expanded", "true");
      if (searchOpen) searchOpen.setAttribute("aria-expanded", "true");
      menuToggle.querySelector(".menu-toggle-word").textContent = "Close";

      // The photographs load the first time the room opens
      if (!menuLiquid && liquid) {
        menuLiquid = liquid.create($("menuLiquid"), {
          // one per menu name; About's photograph is framed a little lower
          focus: [[0.5, 0.08], [0.5, 0.08], [0.5, 0.08], [0.5, 0.08], [0.5, 0.08], [0.5, 0.08], [0.5, 0.25], [0.5, 0.08]]
        });
      }
      if (menuLiquid && menuLiquid.setActive) menuLiquid.setActive(true);
      showMenuItem(here);

      if (canAnimate) {
        gsap.fromTo(overlay.querySelectorAll(".menu-links li, .menu-foot"),
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, stagger: 0.05, ease: "expo.out", delay: 0.25, overwrite: true });
      }
      setTimeout(() => (focusSearch ? $("searchInput") : menuLinks[0]).focus({ preventScroll: true }), 120);
    };

    const closeMenu = () => {
      if (!isMenuOpen()) return;
      overlay.classList.remove("is-open");
      document.body.classList.remove("menu-open");
      menuToggle.setAttribute("aria-expanded", "false");
      if (searchOpen) searchOpen.setAttribute("aria-expanded", "false");
      menuToggle.querySelector(".menu-toggle-word").textContent = "Menu";
      if (menuLiquid && menuLiquid.setActive) menuLiquid.setActive(false);
      menuCloseTimer = setTimeout(() => { overlay.hidden = true; }, reduced ? 0 : 900);
      menuToggle.focus({ preventScroll: true });
    };

    menuToggle.addEventListener("click", () => (isMenuOpen() ? closeMenu() : openMenu(false)));
    if (searchOpen) {
      searchOpen.addEventListener("click", () => (isMenuOpen() ? $("searchInput").focus() : openMenu(true)));
    }

    menuLinks.forEach((link, i) => {
      link.addEventListener("pointerenter", () => showMenuItem(i));
      link.addEventListener("focus", () => showMenuItem(i));
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && isMenuOpen()) closeMenu();
    });

    // Keep keyboard focus inside the room while it is open
    overlay.addEventListener("keydown", e => {
      if (e.key !== "Tab") return;
      const items = [menuToggle].concat(Array.from(overlay.querySelectorAll("a[href], input, button")));
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === overlay.querySelector("a[href]")) {
        e.preventDefault();
        menuToggle.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }


  /* ============================================================
     2. PAGES — arriving and leaving
  ============================================================ */
  function reveal(scope, delay) {
    const items = (scope || document).querySelectorAll(".reveal");
    if (!items.length) return;
    if (!canAnimate) {
      items.forEach(el => { el.style.opacity = 1; });
      return;
    }
    gsap.fromTo(items, { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, stagger: 0.06, ease: "expo.out", delay: delay || 0, overwrite: true, clearProps: "transform" });
  }

  if (document.body.classList.contains("page") && canAnimate) {
    gsap.from(".room-media", { opacity: 0, scale: 1.05, duration: 1.8, ease: "expo.out", clearProps: "opacity,transform" });
    reveal(document, 0.15);
  }

  // Following a link: the page fades into the night first
  document.addEventListener("click", e => {
    const link = e.target.closest("a[href]");
    if (!link || !canAnimate || e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (link.target || link.hasAttribute("download")) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
    if (url.pathname === location.pathname && url.search === location.search) return;   // same page / #anchor
    e.preventDefault();
    document.body.classList.add("is-leaving");
    setTimeout(() => { location.href = url.href; }, 320);
  });

  // Coming back with the browser's Back button shows the page again
  window.addEventListener("pageshow", e => {
    if (e.persisted) document.body.classList.remove("is-leaving");
  });


  /* ============================================================
     3. THE INDEX
     syncIndexRows() first makes the list match the live catalogue:
     the rows written in the page are kept when nothing changed, and
     rebuilt (with their photographs) when an admin added a piece,
     changed a price or started a sale.

     opts.list  — the list of .index-row items (each data-id)
     opts.box   — the liquid box holding one <img> per row, in the
                  rows' original order
     opts.plate — where the active piece's name, price and sizes go
  ============================================================ */
  function rowSignature(p) {
    return [p.id, p.name, Seylune.priceHtml(p), p.image].join("|");
  }

  function syncIndexRows(list, box, pieces) {
    const rows = list.querySelectorAll(".index-row");
    const want = pieces.map(rowSignature);
    const same = rows.length === want.length &&
      Array.from(list.querySelectorAll(".index-row")).every((row, i) =>
        row.dataset.id === pieces[i].id &&
        row.querySelector(".index-name").textContent === pieces[i].name &&
        row.querySelector(".index-price").innerHTML === Seylune.priceHtml(pieces[i]));
    if (same) return false;

    const esc = Seylune.escapeHtml;
    list.innerHTML = pieces.map((p, i) => `
      <li class="index-row product-card reveal" data-id="${p.id}" data-sig="${esc(want[i])}">
        <a class="index-link" href="${Seylune.productUrl(p.id)}">
          <img class="index-thumb" src="${Seylune.asset(p.image)}" alt="" loading="lazy" width="896" height="1200" />
          <span class="index-name">${esc(p.name)}</span>
          <span class="index-price">${Seylune.priceHtml(p)}</span>
        </a>
      </li>`).join("");
    if (box) {
      box.innerHTML = pieces.map((p, i) =>
        `<img src="${Seylune.asset(p.image)}" alt=""${i ? ' loading="lazy"' : ""} />`).join("");
    }
    const count = document.getElementById("resultCount");
    if (count) count.textContent = pieces.length;
    Seylune.addWishlistButtons(list);
    reveal(list, 0.1);
    return true;
  }

  function initIndex(opts) {
    const list = opts.list;
    const box = opts.box;
    const plate = opts.plate;
    const all = Array.from(list.querySelectorAll(".index-row"));
    const imgs = box ? Array.from(box.querySelectorAll("img")) : [];
    const wide = window.matchMedia("(min-width: 861px)");
    let lq = null;
    let active = null;

    // The photograph only runs on WebGL where it can be seen
    function ensureLiquid() {
      if (lq || !liquid || !box || !wide.matches) return;
      lq = liquid.create(box, { focus: all.map(() => [0.5, 0.06]) });
      if (active) lq.show(all.indexOf(active), 10);
    }

    function fillPlate(p) {
      if (!plate) return;
      const esc = Seylune.escapeHtml;
      const url = Seylune.productUrl(p.id);
      const colour = SEYLUNE_COLORS[p.color] || { label: p.color, swatch: "transparent" };
      plate.innerHTML = `
        <div class="plate-copy">
          <p class="plate-category">${esc(p.category)} · <span class="swatch" style="background:${colour.swatch}"></span>${esc(colour.label)}${p.isNew ? " · New" : ""}</p>
          <p class="plate-name"><a href="${url}">${esc(p.name)}</a></p>
          <p class="plate-price">${Seylune.priceHtml(p)}</p>
        </div>
        <div class="plate-actions">
          <button type="button" class="wishlist-btn" data-id="${p.id}" data-name="${esc(p.name)}">${Seylune.HEART_SVG}</button>
          <a href="${url}" class="text-link">View piece</a>
        </div>
        <div class="plate-sizes" role="group" aria-label="Add ${esc(p.name)} to cart in size">
          <span class="plate-label" aria-hidden="true">Add to cart</span>
          ${Seylune.sizePills(p)}
        </div>`;
      Seylune.syncWishlistButtons();
    }

    function activate(row, instant) {
      if (!row || row === active) return;
      active = row;
      const i = all.indexOf(row);
      all.forEach(r => r.classList.toggle("is-active", r === row));
      if (lq) lq.show(i, instant ? 10 : 1200);
      else imgs.forEach((img, k) => img.classList.toggle("is-current", k === i));

      const p = Seylune.getProduct(row.dataset.id);
      if (!p || !plate) return;
      if (canAnimate && !instant) {
        gsap.timeline()
          .to(plate.children, { opacity: 0, y: -8, duration: 0.25, stagger: 0.02, ease: "power2.in", overwrite: true })
          .add(() => {
            fillPlate(p);
            gsap.fromTo(plate.children, { opacity: 0, y: 14 },
              { opacity: 1, y: 0, duration: 0.8, stagger: 0.05, ease: "expo.out", clearProps: "transform" });
          });
      } else {
        fillPlate(p);
      }
    }

    // On phones the photograph is hidden, so each piece gets a quick view instead
    all.forEach(row => {
      if (!row.querySelector(".quick-btn")) {
        const p = Seylune.getProduct(row.dataset.id);
        row.insertAdjacentHTML("beforeend",
          `<button type="button" class="quick-btn" data-id="${row.dataset.id}" aria-label="Quick view: ${Seylune.escapeHtml(p ? p.name : "")}">Quick view</button>`);
      }
    });

    // Real stock arrived from the database: redraw the sizes on the plate
    document.addEventListener("seylune:stock", () => {
      const p = active && Seylune.getProduct(active.dataset.id);
      if (p) fillPlate(p);
    });

    all.forEach(row => {
      row.addEventListener("pointerenter", () => { if (wide.matches) activate(row); });
      row.addEventListener("focusin", () => activate(row));
    });

    // After filtering or sorting, the photograph follows the first piece still shown
    function refresh() {
      const visible = all.filter(r => !r.hidden);
      if (plate) plate.hidden = visible.length === 0;
      if (!visible.length) return;
      if (!active || active.hidden) {
        active = null;
        activate(visible[0]);
      }
    }

    ensureLiquid();
    wide.addEventListener("change", ensureLiquid);
    const first = all.find(r => !r.hidden);
    if (first) activate(first, true);
    if (plate && !first) plate.hidden = true;

    return { refresh, activate };
  }

  /* ============================================================
     4. LAYERS — the bag, quick view and zoom share one way of
        opening: built on first use, page scroll paused, focus
        kept inside, Esc or the scrim closes, focus returns.
  ============================================================ */
  const esc = s => Seylune.escapeHtml(s);
  const openLayers = [];

  function makeLayer(id, className, html) {
    const layer = document.createElement("div");
    layer.id = id;
    layer.className = "layer " + className;
    layer.hidden = true;
    layer.innerHTML = html;
    document.body.appendChild(layer);
    layer.addEventListener("click", e => {
      if (e.target.closest("[data-close]")) closeLayer(layer);
    });
    layer.addEventListener("keydown", e => {
      if (e.key !== "Tab") return;
      const items = Array.from(layer.querySelectorAll("a[href], button:not([disabled]), input, select, [tabindex='0']"))
        .filter(el => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    return layer;
  }

  function openLayer(layer, focusEl) {
    if (!layer.hidden && layer.classList.contains("is-open")) return;
    layer._returnFocus = document.activeElement;
    clearTimeout(layer._timer);
    layer.hidden = false;
    void layer.offsetWidth;
    layer.classList.add("is-open");
    document.body.classList.add("layer-open");
    if (!openLayers.includes(layer)) openLayers.push(layer);
    setTimeout(() => (focusEl || layer.querySelector("[data-close]")).focus({ preventScroll: true }), 60);
  }

  function closeLayer(layer, keepFocus) {
    if (layer.hidden) return;
    layer.classList.remove("is-open");
    openLayers.splice(openLayers.indexOf(layer), 1);
    if (!openLayers.length) document.body.classList.remove("layer-open");
    layer._timer = setTimeout(() => { layer.hidden = true; }, reduced ? 0 : 600);
    if (!keepFocus && layer._returnFocus && layer._returnFocus.focus) layer._returnFocus.focus({ preventScroll: true });
  }

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && openLayers.length) closeLayer(openLayers[openLayers.length - 1]);
  });


  /* ============================================================
     5. THE BAG DRAWER
     Adding a piece slides the bag in from the right with every
     line, the subtotal and the way to checkout.
  ============================================================ */
  let bag = null;

  function buildBag() {
    bag = makeLayer("bagLayer", "bag-layer", `
      <div class="layer-scrim" data-close></div>
      <aside class="bag" role="dialog" aria-modal="true" aria-labelledby="bagTitle">
        <header class="bag-head">
          <h2 class="bag-title" id="bagTitle">Your Bag <span id="bagCount"></span></h2>
          <button type="button" class="nav-word bag-close" data-close>Close</button>
        </header>
        <p class="bag-added" id="bagAdded" role="status" aria-live="polite"></p>
        <div class="bag-lines" id="bagLines"></div>
        <footer class="bag-foot" id="bagFoot">
          <p class="bag-subtotal"><span>Subtotal</span><span id="bagSubtotal"></span></p>
          <div class="delivery-track" aria-hidden="true"><span id="bagBar"></span></div>
          <p class="summary-note" id="bagNote"></p>
          <a class="btn btn-primary btn-block" href="${Seylune.ROOT}Checkout/checkout.html">Checkout</a>
          <a class="text-link bag-view" href="${Seylune.ROOT}Cart/cart.html">View cart</a>
        </footer>
      </aside>`);

    bag.querySelector("#bagLines").addEventListener("click", e => {
      const btn = e.target.closest("[data-key]");
      if (!btn) return;
      const key = btn.dataset.key;
      if (btn.classList.contains("qty-increase")) Seylune.changeQuantity(key, 1);
      else if (btn.classList.contains("qty-decrease")) Seylune.changeQuantity(key, -1);
      else if (btn.classList.contains("bag-remove")) Seylune.removeFromCart(key);
      renderBag();
      const again = bag.querySelector(`[data-key="${CSS.escape(key)}"].${btn.classList[btn.classList.length - 1]}`);
      (again || bag.querySelector(".bag-close")).focus({ preventScroll: true });
    });
  }

  function renderBag() {
    Seylune.refreshCart();   // prices and photos as they are now
    const cart = Seylune.getCart();
    const count = Seylune.getCartCount();
    const subtotal = Seylune.getSubtotal(cart);
    bag.querySelector("#bagCount").textContent = count ? `(${count})` : "";
    bag.querySelector("#bagFoot").hidden = cart.length === 0;

    bag.querySelector("#bagLines").innerHTML = cart.length ? cart.map(item => {
      const key = Seylune.lineKey(item);
      const url = Seylune.productUrl(item.id);
      return `
        <article class="bag-line">
          <a href="${url}" class="bag-line-image" tabindex="-1" aria-hidden="true"><img src="${esc(item.image)}" alt="" /></a>
          <div class="bag-line-info">
            <h3 class="bag-line-name"><a href="${url}">${esc(item.name)}</a></h3>
            <p class="bag-line-meta">${item.size ? "Size " + esc(item.size) : "Size to choose in the cart"}</p>
            <div class="bag-line-row">
              <div class="qty-control" role="group" aria-label="Quantity of ${esc(item.name)}">
                <button type="button" class="qty-btn qty-decrease" data-key="${key}" aria-label="Decrease quantity of ${esc(item.name)}" ${item.quantity <= 1 ? "disabled" : ""}>−</button>
                <span class="qty-value">${item.quantity}</span>
                <button type="button" class="qty-btn qty-increase" data-key="${key}" aria-label="Increase quantity of ${esc(item.name)}"
                  ${Seylune.stockLeft(item.id, item.size) != null && item.quantity >= Seylune.stockLeft(item.id, item.size) ? "disabled" : ""}>+</button>
              </div>
              <button type="button" class="remove-btn bag-remove" data-key="${key}" aria-label="Remove ${esc(item.name)}">Remove</button>
            </div>
          </div>
          <p class="bag-line-total">${Seylune.formatPrice(item.price * item.quantity)}</p>
        </article>`;
    }).join("") : `
      <div class="bag-empty">
        <p class="bag-empty-title">Your bag is empty</p>
        <a href="${Seylune.ROOT}New-Arrivals/new-arrivals.html" class="text-link">Shop New Arrivals</a>
      </div>`;

    const remaining = Seylune.FREE_DELIVERY_MIN - subtotal;
    bag.querySelector("#bagSubtotal").textContent = Seylune.formatPrice(subtotal);
    bag.querySelector("#bagBar").style.width = Math.min(100, (subtotal / Seylune.FREE_DELIVERY_MIN) * 100) + "%";
    bag.querySelector("#bagNote").textContent = remaining > 0
      ? `Add ${Seylune.formatPrice(remaining)} more for free islandwide delivery.`
      : "You've unlocked free islandwide delivery.";
  }

  function openBag(added) {
    if (!bag) buildBag();
    renderBag();
    bag.querySelector("#bagAdded").textContent = added
      ? `${added.name}${added.size ? ", size " + added.size : ""}, added to your bag.` : "";
    openLayer(bag);
  }

  function closeBag() {
    if (bag) closeLayer(bag);
  }

  // A piece went into the cart: show the bag instead of a toast
  document.addEventListener("seylune:added", e => {
    e.preventDefault();
    if (qv && !qv.hidden) closeLayer(qv, true);
    openBag(e.detail);
  });

  // The Cart word opens the bag (the full cart page is one link away).
  // Listens in the capture phase so it runs before the page-leave fade.
  document.addEventListener("click", e => {
    const link = e.target.closest(".navbar .cart-icon");
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || link.getAttribute("aria-current") === "page") return;
    e.preventDefault();
    openBag();
  }, true);

  // The cart changed in another tab
  window.addEventListener("storage", e => {
    if (bag && !bag.hidden && e.key === Seylune.KEYS.cart) renderBag();
  });


  /* ============================================================
     6. QUICK VIEW
     Any card's "Quick view" opens the piece in an overlay: its
     photographs, price, honest stock and one-tap sizes.
  ============================================================ */
  let qv = null;

  function quickView(id) {
    const p = Seylune.getProduct(id);
    if (!p) return;
    if (!qv) {
      qv = makeLayer("quickLayer", "quick-layer", `
        <div class="layer-scrim" data-close></div>
        <div class="quick" role="dialog" aria-modal="true" aria-labelledby="quickName">
          <button type="button" class="nav-word quick-close" data-close>Close</button>
          <div class="quick-media"><div class="quick-frames" id="quickFrames"></div><div class="quick-thumbs" id="quickThumbs"></div></div>
          <div class="quick-body" id="quickBody"></div>
        </div>`);
      qv.addEventListener("click", e => {
        const thumb = e.target.closest(".quick-thumb");
        if (!thumb) return;
        const i = Number(thumb.dataset.index);
        qv.querySelectorAll(".quick-frames img").forEach((img, k) => img.classList.toggle("is-current", k === i));
        qv.querySelectorAll(".quick-thumb").forEach((t, k) => t.setAttribute("aria-pressed", k === i));
      });
    }

    const images = [p.image].concat(p.gallery || []).map(Seylune.asset);
    const colour = SEYLUNE_COLORS[p.color] || { label: p.color, swatch: "transparent" };
    const url = Seylune.productUrl(p.id);
    const lows = p.sizes.map(s => [s, Seylune.stockNote(p.id, s)]).filter(([, n]) => n);

    qv.querySelector("#quickFrames").innerHTML = images.map((src, i) =>
      `<img src="${src}" alt="${esc(p.name)}${i ? " — view " + (i + 1) : ""}"${i ? "" : ' class="is-current"'} />`).join("");
    qv.querySelector("#quickThumbs").innerHTML = images.length > 1 ? images.map((src, i) =>
      `<button type="button" class="quick-thumb" data-index="${i}" aria-label="View image ${i + 1} of ${images.length}" aria-pressed="${i === 0}"><img src="${src}" alt="" /></button>`).join("") : "";
    qv.querySelector("#quickBody").innerHTML = `
      <p class="kicker">${esc(p.category)}${p.isNew ? " · New" : ""}</p>
      <h2 class="quick-name" id="quickName">${esc(p.name)}</h2>
      <p class="quick-price">${Seylune.priceHtml(p)}</p>
      <p class="quick-short">${esc(p.short)}</p>
      <p class="quick-colour"><span class="option-label">Colour</span><span class="swatch" style="background:${colour.swatch}"></span>${esc(colour.label)}</p>
      <p class="option-label quick-label">Add to bag</p>
      <div class="quick-sizes" role="group" aria-label="Add ${esc(p.name)} to bag in size">${Seylune.sizePills(p)}</div>
      <p class="quick-stock">${lows.map(([s, n]) => `${s}: ${n}`).join(" · ")}</p>
      <div class="quick-actions">
        <button type="button" class="wishlist-btn quick-heart" data-id="${p.id}" data-name="${esc(p.name)}">${Seylune.HEART_SVG}</button>
        <a href="${url}" class="text-link">View full details</a>
      </div>`;
    Seylune.syncWishlistButtons();
    openLayer(qv);
  }

  document.addEventListener("click", e => {
    const btn = e.target.closest(".quick-btn");
    if (btn) quickView(btn.dataset.id);
  });

  // Real stock arrived: redraw every card's sizes
  document.addEventListener("seylune:stock", () => {
    document.querySelectorAll(".card-sizes").forEach(el => {
      const p = Seylune.getProduct(el.closest(".product-card").dataset.id);
      if (p) el.innerHTML = Seylune.sizePills(p);
    });
  });


  /* ============================================================
     7. ZOOM
     The photographs full screen. Click (or tap) to look closer;
     move the pointer, or drag on a phone, to travel across the
     fabric. Arrows and the keys ← → move between views.
  ============================================================ */
  let zoomLayer = null;
  let zoomImages = [];
  let zoomIndex = 0;

  function buildZoom() {
    zoomLayer = makeLayer("zoomLayer", "zoom-layer", `
      <div class="zoom" role="dialog" aria-modal="true" aria-label="Photographs, full screen">
        <div class="zoom-stage" id="zoomStage"><img id="zoomImg" alt="" /></div>
        <button type="button" class="nav-word zoom-close" data-close>Close</button>
        <button type="button" class="round-btn zoom-prev" id="zoomPrev" aria-label="Previous photograph">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12H4M10 6l-6 6 6 6"/></svg>
        </button>
        <button type="button" class="round-btn zoom-next" id="zoomNext" aria-label="Next photograph">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6"/></svg>
        </button>
        <p class="zoom-count" id="zoomCount" aria-live="polite"></p>
        <p class="zoom-hint">Click to look closer</p>
      </div>`);

    const stage = zoomLayer.querySelector("#zoomStage");
    const img = zoomLayer.querySelector("#zoomImg");

    // Click toggles the close look, keeping the point you clicked under the pointer
    stage.addEventListener("click", e => {
      const r = img.getBoundingClientRect();
      const fx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const fy = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      const zoomed = stage.classList.toggle("is-zoomed");
      if (zoomed) {
        stage.scrollLeft = fx * stage.scrollWidth - stage.clientWidth / 2;
        stage.scrollTop = fy * stage.scrollHeight - stage.clientHeight / 2;
      }
    });

    // With a mouse, moving the pointer travels across the zoomed photograph
    stage.addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse" || !stage.classList.contains("is-zoomed")) return;
      const r = stage.getBoundingClientRect();
      stage.scrollLeft = ((e.clientX - r.left) / r.width) * (stage.scrollWidth - stage.clientWidth);
      stage.scrollTop = ((e.clientY - r.top) / r.height) * (stage.scrollHeight - stage.clientHeight);
    });

    zoomLayer.querySelector("#zoomPrev").addEventListener("click", () => showZoom(zoomIndex - 1));
    zoomLayer.querySelector("#zoomNext").addEventListener("click", () => showZoom(zoomIndex + 1));
    zoomLayer.addEventListener("keydown", e => {
      if (e.key === "ArrowLeft") showZoom(zoomIndex - 1);
      if (e.key === "ArrowRight") showZoom(zoomIndex + 1);
    });
  }

  function showZoom(i) {
    zoomIndex = (i + zoomImages.length) % zoomImages.length;
    const stage = zoomLayer.querySelector("#zoomStage");
    const img = zoomLayer.querySelector("#zoomImg");
    stage.classList.remove("is-zoomed");
    img.src = zoomImages[zoomIndex].src;
    img.alt = zoomImages[zoomIndex].alt;
    const many = zoomImages.length > 1;
    zoomLayer.querySelector("#zoomPrev").hidden = !many;
    zoomLayer.querySelector("#zoomNext").hidden = !many;
    zoomLayer.querySelector("#zoomCount").textContent = many ? `${zoomIndex + 1} / ${zoomImages.length}` : "";
  }

  // images: [{ src, alt }]
  function zoom(images, start) {
    if (!images || !images.length) return;
    if (!zoomLayer) buildZoom();
    zoomImages = images;
    showZoom(start || 0);
    openLayer(zoomLayer);
  }


  return { reduced, canAnimate, liquid, isMenuOpen, reveal, syncIndexRows, initIndex, openBag, closeBag, quickView, zoom };
})();

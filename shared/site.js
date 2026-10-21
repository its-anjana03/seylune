/* ============================================================
   SEYLUNE — SITE MOTION + SHARED ROOMS
   Loaded on every page after shared/seylune.js, GSAP and
   shared/liquid.js.
   1. The menu: a full-screen room with liquid photographs
   2. Pages: the photograph comes up out of the dark, the words
      follow; following a link fades the page out first
   3. The index: a list of names beside a photograph that melts
      to the piece you point at (collections + search)
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
          focus: [[0.5, 0.08], [0.5, 0.08], [0.5, 0.08], [0.5, 0.08], [0.5, 0.25], [0.5, 0.08]]
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
     opts.list  — the list of .index-row items (each data-id)
     opts.box   — the liquid box holding one <img> per row, in the
                  rows' original order
     opts.plate — where the active piece's name, price and sizes go
  ============================================================ */
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
      const data = `data-id="${p.id}" data-name="${esc(p.name)}" data-price="${p.price}" data-image="${Seylune.asset(p.image)}"`;
      plate.innerHTML = `
        <div class="plate-copy">
          <p class="plate-category">${esc(p.category)} · <span class="swatch" style="background:${colour.swatch}"></span>${esc(colour.label)}${p.isNew ? " · New" : ""}</p>
          <p class="plate-name"><a href="${url}">${esc(p.name)}</a></p>
          <p class="plate-price">${Seylune.formatPrice(p.price)}</p>
        </div>
        <div class="plate-actions">
          <button type="button" class="wishlist-btn" data-id="${p.id}" data-name="${esc(p.name)}">${Seylune.HEART_SVG}</button>
          <a href="${url}" class="text-link">View piece</a>
        </div>
        <div class="plate-sizes" role="group" aria-label="Add ${esc(p.name)} to cart in size">
          <span class="plate-label" aria-hidden="true">Add to cart</span>
          ${p.sizes.map(s => `<button type="button" class="size-pill add-to-cart" ${data} data-size="${s}" aria-label="Add ${esc(p.name)}, size ${s}, to cart">${s}</button>`).join("")}
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

  return { reduced, canAnimate, liquid, isMenuOpen, reveal, initIndex };
})();

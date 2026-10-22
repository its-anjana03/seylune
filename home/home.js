/* ============================================================
   SEYLUNE — HOME PAGE JAVASCRIPT
   Shared behaviour (cart, wishlist, search) comes from
   shared/seylune.js, the menu room from shared/site.js, and the
   photographs on WebGL from shared/liquid.js.
   1. Scenes: scroll, swipe or keys move between full-screen scenes
   2. The house: the campaign photograph on a liquid plane
   3. New Arrivals: one piece at a time
   4. Collections: the room changes with the name you point at
   5. The story photograph
   6. Signature edits: the panel you point at opens
   7. Newsletter form
   With reduced motion (or without GSAP) the scenes stay a plain
   page and every control still works.
============================================================ */

(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canAnimate = !reduced && typeof gsap !== "undefined";
  const liquid = typeof SeyluneLiquid !== "undefined" ? SeyluneLiquid : null;
  const pad = n => String(n + 1).padStart(2, "0");
  const $ = id => document.getElementById(id);


  /* ============================================================
     3. NEW ARRIVALS (set up first: the scenes need its liquid box)
  ============================================================ */
  const arrivals = Seylune.products.filter(p => p.isNew);
  const arrivalsBox = $("arrivalsLiquid");
  const arrivalsLiquid = liquid && arrivalsBox
    ? liquid.create(arrivalsBox, { focus: arrivals.map(() => [0.5, 0.0]) })
    : null;
  let pieceIndex = 0;

  $("pieceTotal").textContent = pad(arrivals.length - 1);

  // Thumbnails to jump straight to a piece
  $("pieceThumbs").innerHTML = arrivals.map((p, i) => `
    <li><button type="button" class="piece-thumb" data-index="${i}" aria-label="${Seylune.escapeHtml(p.name)}"
         ${i === 0 ? 'aria-current="true"' : ""}><img src="${Seylune.asset(p.image)}" alt="" loading="lazy" /></button></li>`).join("");

  function fillPiece(p) {
    const url = Seylune.productUrl(p.id);
    $("pieceCategory").textContent = p.category;
    $("pieceLink").textContent = p.name;
    $("pieceLink").href = url;
    $("pieceShort").textContent = p.short.split(". ")[0].replace(/\.?$/, ".");
    $("piecePrice").textContent = Seylune.formatPrice(p.price);
    $("pieceSizes").innerHTML = Seylune.sizePills(p);
  }

  function showPiece(i) {
    i = (i + arrivals.length) % arrivals.length;
    if (i === pieceIndex) return;
    const direction = i > pieceIndex ? 1 : -1;
    pieceIndex = i;
    const p = arrivals[i];

    $("pieceIndex").textContent = pad(i);
    document.querySelectorAll(".piece-thumb").forEach((t, k) => {
      if (k === i) t.setAttribute("aria-current", "true");
      else t.removeAttribute("aria-current");
    });
    if (arrivalsLiquid) arrivalsLiquid.show(i, 1500);

    const lines = document.querySelectorAll("#piece .reveal");
    if (canAnimate) {
      gsap.timeline()
        .to(lines, { y: -16 * direction, opacity: 0, filter: "blur(6px)", duration: 0.35, stagger: 0.03, ease: "power2.in" })
        .add(() => fillPiece(p))
        .fromTo(lines, { y: 22 * direction, opacity: 0, filter: "blur(6px)" },
          { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.9, stagger: 0.05, ease: "expo.out" });
    } else {
      fillPiece(p);
    }
  }

  fillPiece(arrivals[0]);
  // Real stock arrived from the database: redraw the sizes
  document.addEventListener("seylune:stock", () => fillPiece(arrivals[pieceIndex]));
  $("piecePrev").addEventListener("click", () => showPiece(pieceIndex - 1));
  $("pieceNext").addEventListener("click", () => showPiece(pieceIndex + 1));
  $("pieceThumbs").addEventListener("click", e => {
    const t = e.target.closest(".piece-thumb");
    if (t) showPiece(Number(t.dataset.index));
  });

  // Swipe the photograph sideways to change piece
  let swipeX = null;
  const stage = document.querySelector(".arrivals-stage");
  stage.addEventListener("touchstart", e => { swipeX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", e => {
    if (swipeX === null) return;
    const dx = e.changedTouches[0].clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) > 45) showPiece(pieceIndex + (dx < 0 ? 1 : -1));
  });


  /* ============================================================
     4. COLLECTIONS
  ============================================================ */
  const collectionsBox = $("collectionsLiquid");
  const collectionsLiquid = liquid && collectionsBox
    ? liquid.create(collectionsBox, { focus: [[0.86, 0.4], [0.86, 0.4], [0.8, 0.4]] })
    : null;
  const collectionLinks = Array.from(document.querySelectorAll(".collection-link"));
  let collectionIndex = 0;
  let collectionTimer = null;

  function showCollection(i) {
    collectionIndex = i;
    collectionLinks.forEach((l, k) => l.classList.toggle("is-active", k === i));
    if (collectionsLiquid) collectionsLiquid.show(i, 1300);
  }

  collectionLinks.forEach((link, i) => {
    link.addEventListener("pointerenter", () => showCollection(i));
    link.addEventListener("focus", () => showCollection(i));
  });

  // Phones have no pointer to hover with: the rooms take turns instead
  function cycleCollections(on) {
    clearInterval(collectionTimer);
    if (on && window.matchMedia("(hover: none)").matches) {
      collectionTimer = setInterval(() => showCollection((collectionIndex + 1) % collectionLinks.length), 4200);
    }
  }


  /* ============================================================
     5. THE STORY PHOTOGRAPH (ripple only)
  ============================================================ */
  const storyBox = $("storyLiquid");
  const storyLiquid = liquid && storyBox ? liquid.create(storyBox, { focus: [[0.5, 0.3]] }) : null;


  /* ============================================================
     6. SIGNATURE EDITS
  ============================================================ */
  const panels = Array.from(document.querySelectorAll(".edit-panel"));
  panels.forEach(panel => {
    const open = () => panels.forEach(p => p.classList.toggle("is-open", p === panel));
    panel.addEventListener("pointerenter", open);
    panel.addEventListener("focus", open);
  });


  /* ============================================================
     2. THE HOUSE — the campaign photograph, zoomed a touch so
        the frame's lower corner stays out of view
  ============================================================ */
  const heroBox = $("heroLiquid");
  const heroLiquid = liquid && heroBox
    ? liquid.create(heroBox, { focus: [[0.62, 0.0]], zoom: 1.1 })
    : null;


  /* ============================================================
     7. NEWSLETTER FORM
  ============================================================ */
  const form = $("newsletterForm");
  const message = $("newsletterMessage");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const email = $("newsletterEmail").value.trim();
    if (!Seylune.EMAIL_PATTERN.test(email)) {
      message.textContent = "Please enter a valid email address.";
      message.style.color = "#E59A9A";
      return;
    }
    message.textContent = "Thank you — you're on the list.";
    message.style.color = "var(--gold)";
    form.reset();
  });


  /* ============================================================
     1. SCENES
  ============================================================ */
  const scenes = Array.from(document.querySelectorAll(".scene"));
  const liquids = { hero: heroLiquid, arrivals: arrivalsLiquid, collections: collectionsLiquid, story: storyLiquid };
  let current = 0;
  let busy = false;
  let lockUntil = 0;

  // Each scene starts or stops what lives in it
  function sceneEntered(scene) {
    Object.entries(liquids).forEach(([id, l]) => { if (l && l.setActive) l.setActive(id === scene.id); });
    cycleCollections(scene.id === "collections");
  }

  if (!canAnimate) return;

  root.classList.add("scenes-on");

  function setInert(scene, on) {
    if (on) scene.setAttribute("inert", "");
    else scene.removeAttribute("inert");
    scene.setAttribute("aria-hidden", on ? "true" : "false");
  }

  function reveal(scene, delay) {
    const items = scene.querySelectorAll(".reveal");
    if (!items.length) return;
    gsap.fromTo(items, { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, stagger: 0.05, ease: "expo.out", delay, overwrite: true });
  }

  function go(next) {
    next = Math.max(0, Math.min(scenes.length - 1, next));
    if (next === current || busy) return;
    busy = true;
    lockUntil = performance.now() + 800;

    const from = scenes[current];
    const to = scenes[next];
    const down = next > current;
    current = next;

    from.classList.add("is-leaving");
    from.classList.remove("is-active");
    to.classList.add("is-active");
    to.scrollTop = 0;
    setInert(from, true);
    setInert(to, false);

    // Zoom-dissolve: the old scene steps back into the dark, the new one settles in
    gsap.timeline({
      onComplete: () => {
        from.classList.remove("is-leaving");
        gsap.set(from, { clearProps: "opacity,transform" });
        busy = false;
      }
    })
      .to(from, { opacity: 0, scale: down ? 0.96 : 1.04, duration: 0.55, ease: "power2.in" }, 0)
      .fromTo(to, { opacity: 0, scale: down ? 1.05 : 0.96 },
        { opacity: 1, scale: 1, duration: 0.85, ease: "expo.out", clearProps: "transform" }, 0.2);

    reveal(to, 0.3);
    sceneEntered(to);
    history.replaceState(null, "", next === 0 ? location.pathname : "#" + to.id);
  }

  // Starting scene: a #scene in the address, otherwise the house
  const start = Math.max(0, scenes.findIndex(s => "#" + s.id === location.hash));
  current = start;
  scenes.forEach((s, i) => {
    s.classList.toggle("is-active", i === start);
    setInert(s, i !== start);
  });
  sceneEntered(scenes[start]);

  // Opening: the photograph comes up out of the dark, the name settles in
  if (start === 0) {
    gsap.timeline({ defaults: { ease: "expo.out" } })
      .from(".hero-media", { opacity: 0, scale: 1.06, duration: 2 }, 0)
      .from(".hero-word", { opacity: 0, letterSpacing: "0.16em", duration: 1.8 }, 0.2)
      .from(".navbar > *", { opacity: 0, y: -10, duration: 1.1, stagger: 0.1, clearProps: "opacity,transform" }, 0.8);
  }
  reveal(scenes[start], start === 0 ? 0.6 : 0.2);


  /* ---------- Input: wheel, touch, keys ---------- */
  // The menu, the bag drawer, quick view and zoom all pause the scenes
  const menuOpen = () => SeyluneSite.isMenuOpen() || document.body.classList.contains("layer-open");

  // A scene with its own overflow scrolls first, then hands over at its edge
  function canScrollInside(scene, down) {
    if (scene.scrollHeight <= scene.clientHeight + 2) return false;
    if (!/(auto|scroll)/.test(getComputedStyle(scene).overflowY)) return false;
    return down ? scene.scrollTop + scene.clientHeight < scene.scrollHeight - 2 : scene.scrollTop > 0;
  }

  // One flick of the wheel or trackpad moves one scene. A gesture is a run of
  // wheel events with no pause longer than 180ms; its trailing inertia never
  // carries on into a second scene.
  let lastWheel = 0;
  let gestureUsed = false;

  window.addEventListener("wheel", e => {
    if (menuOpen() || document.querySelector(".modal:not([hidden])")) return;
    const down = e.deltaY > 0;
    if (canScrollInside(scenes[current], down)) return;
    e.preventDefault();

    const now = performance.now();
    if (now - lastWheel > 180) gestureUsed = false;
    lastWheel = now;
    if (gestureUsed || now < lockUntil || Math.abs(e.deltaY) < 4) return;

    gestureUsed = true;
    go(current + (down ? 1 : -1));
  }, { passive: false });

  let touchY = null;
  window.addEventListener("touchstart", e => { touchY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener("touchend", e => {
    if (touchY === null || menuOpen()) return;
    const dy = touchY - e.changedTouches[0].clientY;
    touchY = null;
    if (Math.abs(dy) < 60) return;
    if (canScrollInside(scenes[current], dy > 0)) return;
    if (performance.now() < lockUntil) return;
    go(current + (dy > 0 ? 1 : -1));
  });

  document.addEventListener("keydown", e => {
    if (e.target.closest("input, textarea, select") || menuOpen()) return;
    const scene = scenes[current];
    // A tall scene (phones) is read first, then the next scene follows
    const step = down => scene.scrollBy({ top: (down ? 1 : -1) * scene.clientHeight * 0.8, behavior: "smooth" });
    if (["ArrowDown", "PageDown"].includes(e.key) || (e.key === " " && !e.target.closest("button, a"))) {
      e.preventDefault();
      if (canScrollInside(scene, true)) step(true);
      else go(current + 1);
    } else if (["ArrowUp", "PageUp"].includes(e.key)) {
      e.preventDefault();
      if (canScrollInside(scene, false)) step(false);
      else go(current - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      go(0);
    } else if (e.key === "End") {
      e.preventDefault();
      go(scenes.length - 1);
    } else if (scene.id === "arrivals" && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      showPiece(pieceIndex + (e.key === "ArrowRight" ? 1 : -1));
    }
  });

  // Links to a scene (#arrivals …) move to it
  document.addEventListener("click", e => {
    const link = e.target.closest("a[href^='#']");
    if (!link) return;
    const i = scenes.findIndex(s => "#" + s.id === link.getAttribute("href"));
    if (i < 0) return;
    e.preventDefault();
    go(i);
  });

  // Back/forward or a typed #scene moves to that scene
  window.addEventListener("hashchange", () => {
    const i = scenes.findIndex(s => "#" + s.id === location.hash);
    go(i < 0 ? 0 : i);
  });

  // The skip link lands on the current scene's content
  document.addEventListener("focusin", e => {
    if (e.target.tagName === "MAIN") scenes[current].querySelector("a, button")?.focus();
  });
})();

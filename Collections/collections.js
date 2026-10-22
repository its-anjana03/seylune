/* ============================================================
   SEYLUNE — COLLECTIONS PAGE JAVASCRIPT
   Every collection on one page (the home page's "Explore
   Collection" button leads here). Pointing at a name melts the
   photograph to that collection and shows a few of its pieces on
   the plate. The piece counts come from the live catalogue.
============================================================ */

const COLLECTIONS = {
  "New Arrivals": { text: "The newest pieces in the house, from long wool coats to pearl drops.", pick: p => p.isNew },
  "Dresses":      { text: "Fluid cuts and statement elegance for every occasion.",                  pick: p => p.category === "Dresses" },
  "Tops":         { text: "Refined layers designed to elevate your everyday wardrobe.",             pick: p => p.category === "Tops" },
  "Bottoms":      { text: "Tailored essentials with modern structure and ease.",                    pick: p => p.category === "Bottoms" },
  "Outerwear":    { text: "Coats, blazers and jackets cut to frame everything beneath.",            pick: p => p.category === "Outerwear" },
  "Accessories":  { text: "Evening bags, pearls, silk and leather to finish the look.",             pick: p => p.category === "Accessories" }
};

Seylune.whenCatalogue(() => {
  const list  = document.getElementById("collectionList");
  const box   = document.getElementById("collectionLiquid");
  const plate = document.getElementById("collectionPlate");
  const rows  = Array.from(list.querySelectorAll(".index-row"));
  const imgs  = Array.from(box.querySelectorAll("img"));
  const esc   = Seylune.escapeHtml;
  const wide  = window.matchMedia("(min-width: 861px)");
  const { liquid, canAnimate } = SeyluneSite;
  let lq = null;
  let active = null;

  const piecesOf = row => Seylune.products.filter(COLLECTIONS[row.dataset.collection].pick);

  // How many pieces each collection holds right now
  rows.forEach(row => {
    const n = piecesOf(row).length;
    row.querySelector(".collection-count").textContent = `${n} piece${n === 1 ? "" : "s"}`;
  });

  // The plate: the collection's name, a line about it and four of its pieces
  function fillPlate(row) {
    const name = row.dataset.collection;
    const href = row.querySelector(".index-link").getAttribute("href");
    const pieces = piecesOf(row);
    plate.innerHTML = `
      <div class="plate-copy">
        <p class="plate-category">Collection ${String(rows.indexOf(row) + 1).padStart(2, "0")} · ${pieces.length} pieces</p>
        <p class="plate-name"><a href="${esc(href)}">${esc(name)}</a></p>
        <p class="plate-text">${esc(COLLECTIONS[name].text)}</p>
      </div>
      <div class="plate-actions">
        <a href="${esc(href)}" class="text-link">Shop ${esc(name)}</a>
      </div>
      <ul class="plate-pieces" aria-label="Pieces from ${esc(name)}">
        ${pieces.slice(0, 4).map(p => `
          <li><a href="${Seylune.productUrl(p.id)}" aria-label="${esc(p.name)}">
            <img src="${Seylune.asset(p.image)}" alt="" loading="lazy" />
          </a></li>`).join("")}
      </ul>`;
  }

  function activate(row, instant) {
    if (!row || row === active) return;
    active = row;
    const i = rows.indexOf(row);
    rows.forEach(r => r.classList.toggle("is-active", r === row));
    if (lq) lq.show(i, instant ? 10 : 1200);
    else imgs.forEach((img, k) => img.classList.toggle("is-current", k === i));

    if (canAnimate && !instant) {
      gsap.timeline()
        .to(plate.children, { opacity: 0, y: -8, duration: 0.25, stagger: 0.02, ease: "power2.in", overwrite: true })
        .add(() => {
          fillPlate(row);
          gsap.fromTo(plate.children, { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.8, stagger: 0.05, ease: "expo.out", clearProps: "transform" });
        });
    } else {
      fillPlate(row);
    }
  }

  // The photograph only runs on WebGL on a wide screen, where it can be seen
  function ensureLiquid() {
    if (lq || !liquid || !wide.matches) return;
    lq = liquid.create(box, { focus: rows.map(() => [0.5, 0.06]) });
    if (active) lq.show(rows.indexOf(active), 10);
  }

  rows.forEach(row => {
    row.addEventListener("pointerenter", () => { if (wide.matches) activate(row); });
    row.addEventListener("focusin", () => activate(row));
  });

  ensureLiquid();
  wide.addEventListener("change", ensureLiquid);
  activate(rows[0], true);
});

/* ============================================================
   SEYLUNE — SEARCH RESULTS PAGE JAVASCRIPT
   Every navbar search form sends ?q=... to this page.
   Shared behaviour (menu, cart, wishlist) comes from
   shared/seylune.js; the results list + photograph from
   shared/site.js (the same index as the collections).
   This script handles:
   1. Read the search words from the URL
   2. Score every product in shared/products.js
   3. Render the results once, in order of relevance
   4. Category chips + sort show and order them
============================================================ */


/* ============================================================
   1. READ THE QUERY
============================================================ */
const query = (new URLSearchParams(window.location.search).get("q") || "").trim();

const searchInput = document.getElementById("searchPageInput");
searchInput.value = query;
document.querySelectorAll("input[name='q']").forEach(input => { input.value = query; });

if (query) {
  document.getElementById("searchTitle").textContent = `Results for “${query}”`;
  document.title = `“${query}” — Search — Seylune`;
}

// Block empty searches on the big form too
document.getElementById("searchPageForm").addEventListener("submit", e => {
  if (!searchInput.value.trim()) {
    e.preventDefault();
    searchInput.focus();
  }
});


/* ============================================================
   2. SCORE PRODUCTS
   Each search word is matched against the name, category,
   colour and fabric/description. Words like "dresses" also
   match "dress" (simple plural handling).
============================================================ */
function normalise(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
}

function stem(word) {
  return word.length > 3 && word.endsWith("es") && !word.endsWith("ses") ? word.slice(0, -2)
       : word.length > 3 && word.endsWith("s") ? word.slice(0, -1)
       : word;
}

// A few shopper words that mean the same thing
const SYNONYMS = {
  pant: "trouser", trouser: "pant", blouse: "top", shirt: "top",
  gown: "dress", green: "emerald", purple: "plum", grey: "charcoal", gray: "charcoal"
};

function scoreProduct(p, words) {
  const color = (SEYLUNE_COLORS[p.color] || {}).label || "";
  const fields = [
    { text: normalise(p.name),                              weight: 4 },
    { text: normalise(p.category),                          weight: 3 },
    { text: normalise(color),                               weight: 3 },
    { text: normalise(p.fabric + " " + p.short + " " + p.description), weight: 1 }
  ];

  let total = 0;
  for (const word of words) {
    const variants = [word, stem(word)];
    if (SYNONYMS[stem(word)]) variants.push(SYNONYMS[stem(word)]);

    let best = 0;
    for (const field of fields) {
      if (variants.some(v => field.text.includes(v))) best = Math.max(best, field.weight);
    }
    if (best === 0) return 0;      // every word must match somewhere
    total += best;
  }
  return total;
}

const words = normalise(query).split(/\s+/).filter(Boolean);

const matches = words.length
  ? Seylune.products
      .map((p, index) => ({ p, index, score: scoreProduct(p, words) }))
      .filter(r => r.score > 0)
  : Seylune.products.map((p, index) => ({ p, index, score: 1 }));   // empty query = browse all


/* ============================================================
   3. RENDER THE RESULTS (once, in order of relevance)
   Each result is a row in the list and a photograph in the
   liquid box beside it, in the same order.
============================================================ */
matches.sort((a, b) => b.score - a.score || a.index - b.index);

const grid = document.getElementById("productGrid");
const esc = Seylune.escapeHtml;

grid.innerHTML = matches.map((r, order) => `
  <li class="index-row product-card reveal" data-id="${r.p.id}" data-order="${order}">
    <a class="index-link" href="${Seylune.productUrl(r.p.id)}">
      <img class="index-thumb" src="${Seylune.asset(r.p.image)}" alt="" loading="lazy" width="896" height="1200" />
      <span class="index-name">${esc(r.p.name)}</span>
      <span class="index-price">${Seylune.formatPrice(r.p.price)}</span>
    </a>
  </li>`).join("");

document.getElementById("indexLiquid").innerHTML = matches.map((r, i) =>
  `<img src="${Seylune.asset(r.p.image)}" alt=""${i ? " loading=\"lazy\"" : ""} />`).join("");

Seylune.addWishlistButtons(grid);

const index = SeyluneSite.initIndex({
  list:  grid,
  box:   document.getElementById("indexLiquid"),
  plate: document.getElementById("indexPlate")
});

const rows = Array.from(grid.querySelectorAll(".index-row"));
SeyluneSite.reveal(grid, 0.3);


/* ============================================================
   4. CATEGORY CHIPS + SORT
============================================================ */
const state = { category: "all", sort: "relevance" };

document.getElementById("categoryChips").addEventListener("click", e => {
  const chip = e.target.closest(".filter-chip");
  if (!chip) return;
  state.category = chip.dataset.value;
  document.querySelectorAll("#categoryChips .filter-chip").forEach(c => {
    const active = c === chip;
    c.classList.toggle("active", active);
    c.setAttribute("aria-pressed", active);
  });
  render();
});

document.getElementById("sortSelect").addEventListener("change", e => {
  state.sort = e.target.value;
  render();
});

function render() {
  const price = row => Seylune.getProduct(row.dataset.id).price;
  let shown = 0;

  rows.forEach(row => {
    const match = state.category === "all" || Seylune.getProduct(row.dataset.id).category === state.category;
    row.hidden = !match;
    if (match) shown++;
  });

  rows.slice().sort((a, b) => {
    if (state.sort === "price-low")  return price(a) - price(b);
    if (state.sort === "price-high") return price(b) - price(a);
    return a.dataset.order - b.dataset.order;
  }).forEach(row => grid.appendChild(row));

  document.getElementById("resultCount").textContent = shown;
  document.getElementById("resultLabel").textContent = shown === 1 ? "result" : "results";
  document.getElementById("emptyState").hidden = shown > 0;
  document.getElementById("emptyQuery").textContent = query ? ` for “${query}”` : "";
  index.refresh();
}

render();

/* ============================================================
   SEYLUNE — SEARCH RESULTS PAGE JAVASCRIPT
   Every navbar search form sends ?q=... to this page.
   Shared behaviour (mobile menu, cart, wishlist) comes from
   shared/seylune.js.
   This script handles:
   1. Read the search words from the URL
   2. Score every product in shared/products.js
   3. Category chips + sort
   4. Render result cards / empty state
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
   3. CATEGORY CHIPS + SORT
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


/* ============================================================
   4. RENDER
============================================================ */
function render() {
  const grid = document.getElementById("productGrid");

  let results = matches.filter(r => state.category === "all" || r.p.category === state.category);

  results.sort((a, b) => {
    if (state.sort === "price-low")  return a.p.price - b.p.price;
    if (state.sort === "price-high") return b.p.price - a.p.price;
    return b.score - a.score || a.index - b.index;
  });

  grid.innerHTML = results.map(r => Seylune.renderProductCard(r.p)).join("");
  Seylune.addWishlistButtons(grid);

  document.getElementById("resultCount").textContent = results.length;
  document.getElementById("resultLabel").textContent = results.length === 1 ? "Result" : "Results";
  document.getElementById("emptyState").hidden = results.length > 0;
  document.getElementById("emptyQuery").textContent = query ? ` for “${query}”` : "";
}

render();

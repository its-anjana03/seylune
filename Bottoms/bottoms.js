/* ============================================================
   SEYLUNE — BOTTOMS PAGE JAVASCRIPT
   The product cards (with images, names, prices) are written
   directly inside bottoms.html.
   Shared behaviour (mobile menu, cart badge, add-to-cart,
   wishlist hearts, search) comes from shared/seylune.js.
   This script only sets up the catalogue tools:
   1. Filter panel (Size, Colour, Price)
   2. Sort (Newest, Low–High, High–Low)
   3. Result count + empty state
   Each card's size and colour are read from shared/products.js.
============================================================ */


/* ============================================================
   1. PRICE RANGES FOR THIS PAGE
============================================================ */
const priceRanges = [
  { value: "under-6200",  label: "Under Rs. 6,200",         min: 0,     max: 6199 },
  { value: "6200-6700",   label: "Rs. 6,200 – 6,700",       min: 6200,  max: 6700 },
  { value: "above-6700",  label: "Above Rs. 6,700",         min: 6701,  max: null }
];


/* ============================================================
   2. START THE INDEX, FILTERS + SORT
   The photograph follows the first piece still shown after
   filtering or sorting.
============================================================ */
// The rows written in the page are kept unless the live catalogue
// (shared/backend.js) differs: a new piece, a new price, a sale.
Seylune.whenCatalogue(() => {
  const list = document.getElementById("productGrid");
  const box  = document.getElementById("indexLiquid");
  SeyluneSite.syncIndexRows(list, box, Seylune.products.filter(p => p.category === "Bottoms"));

  const index = SeyluneSite.initIndex({ list, box, plate: document.getElementById("indexPlate") });
  Seylune.initCatalog({ prices: priceRanges, onApply: () => index.refresh() });
});

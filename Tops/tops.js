/* ============================================================
   SEYLUNE — TOPS PAGE JAVASCRIPT
   The product cards (with images, names, prices) are written
   directly inside tops.html.
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
  { value: "under-5000",  label: "Under Rs. 5,000",         min: 0,     max: 4999 },
  { value: "5000-5800",   label: "Rs. 5,000 – 5,800",       min: 5000,  max: 5800 },
  { value: "above-5800",  label: "Above Rs. 5,800",         min: 5801,  max: null }
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
  SeyluneSite.syncIndexRows(list, box, Seylune.products.filter(p => p.category === "Tops"));

  const index = SeyluneSite.initIndex({ list, box, plate: document.getElementById("indexPlate") });
  Seylune.initCatalog({ prices: priceRanges, onApply: () => index.refresh() });
});

/* ============================================================
   SEYLUNE — NEW ARRIVALS PAGE JAVASCRIPT
   The product cards (with images, names, prices) are written
   directly inside new-arriavals.html.
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
  { value: "under-6000",  label: "Under Rs. 6,000",         min: 0,     max: 5999 },
  { value: "6000-9000",   label: "Rs. 6,000 – 9,000",       min: 6000,  max: 9000 },
  { value: "above-9000",  label: "Above Rs. 9,000",         min: 9001,  max: null }
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
  SeyluneSite.syncIndexRows(list, box, Seylune.products.filter(p => p.isNew));

  const index = SeyluneSite.initIndex({ list, box, plate: document.getElementById("indexPlate") });
  Seylune.initCatalog({ prices: priceRanges, onApply: () => index.refresh() });
});

/* ============================================================
   SEYLUNE — PRODUCT DETAILS PAGE JAVASCRIPT
   One page for every product: reads ?id=... from the URL and
   fills the template from shared/products.js.
   Shared behaviour (menu, cart, bag drawer, wishlist, search,
   zoom) comes from shared/seylune.js and shared/site.js.
   This script handles:
   1. Load the product (or show "not found")
   2. The photograph — its other views melt in; click to zoom
   3. Size selector — with honest stock ("Only 2 left", sold out)
   4. Quantity selector
   5. Add to cart (opens the bag) + save to wishlist
   6. Size guide modal
   7. Complete the look, more from the collection, recently viewed
============================================================ */


/* ============================================================
   1. LOAD THE PRODUCT
============================================================ */
const params  = new URLSearchParams(window.location.search);
let product = null;   // set once the live catalogue has arrived (see START)

const $ = id => document.getElementById(id);
const esc = Seylune.escapeHtml;

// Called at the bottom of this file, once every helper below is defined
function loadProduct() {
  if (!product) {
    $("productMissing").hidden = false;
    $("productSection").hidden = true;
    $("productMedia").hidden = true;
    $("main").classList.add("is-missing");
    document.title = "Product Not Found — Seylune";
    return;
  }
  fillProduct(product);
}

function fillProduct(p) {
  const color = SEYLUNE_COLORS[p.color] || { label: p.color, swatch: "transparent" };

  document.title = `${p.name} — Seylune`;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", `${p.name} — ${p.short}`);

  $("breadcrumbCategory").textContent = p.category;
  $("breadcrumbCategory").href = Seylune.categoryUrl(p.category);
  $("breadcrumbCurrent").textContent = p.name;

  $("productCategory").textContent = p.category;
  $("productNewTag").hidden = !p.isNew;
  $("productTitle").textContent = p.name;
  $("productPrice").innerHTML = Seylune.priceHtml(p);
  $("productShortDesc").textContent = p.short;
  $("productColor").textContent = color.label;
  $("productSwatch").style.background = color.swatch;
  // A one-size accessory has no size chart to show
  $("sizeGuideBtn").hidden = p.sizes.every(s => !SEYLUNE_SIZES.includes(s));

  $("productDescription").textContent = p.description;
  $("productFabric").textContent = p.fabric;
  $("productCare").textContent = p.care;
  $("productNote").textContent = p.note;

  buildGallery(p);
  buildSizes(p);
  updateSaveButton();
  buildLook(p);
  buildRelated(p);
  buildRecent(p);
  Seylune.rememberViewed(p.id);
}


/* ============================================================
   2. THE PHOTOGRAPH
   Every view of the piece sits in one liquid box; a thumbnail
   melts the photograph into that view. Clicking the photograph
   (or the magnifier) opens every view full screen.
============================================================ */
const thumbnailStrip = $("thumbnailStrip");
let views = [];
let viewIndex = 0;

function buildGallery(p) {
  views = [p.image].concat(p.gallery || []).map((src, i) => ({
    src: Seylune.asset(src),
    alt: p.name + (i ? " — view " + (i + 1) : "")
  }));
  const box = $("productLiquid");

  box.innerHTML = views.map((v, i) =>
    `<img src="${v.src}" alt="${esc(v.alt)}"${i ? ' loading="lazy"' : ""} />`).join("");

  const liquid = SeyluneSite.liquid
    ? SeyluneSite.liquid.create(box, { focus: views.map(() => [0.5, 0.08]) })
    : null;
  if (!liquid) box.querySelector("img").classList.add("is-current");

  const openZoom = () => SeyluneSite.zoom(views, viewIndex);
  box.addEventListener("click", openZoom);
  $("productZoom").addEventListener("click", openZoom);

  // Thumbnails only when there is more than one view
  if (views.length < 2) return;
  thumbnailStrip.hidden = false;
  thumbnailStrip.innerHTML = views.map((v, i) => `
    <button type="button" class="product-thumb" aria-label="View image ${i + 1} of ${views.length}" aria-pressed="${i === 0}">
      <img src="${v.src}" alt="" />
    </button>`).join("");

  thumbnailStrip.querySelectorAll(".product-thumb").forEach((thumb, i) => {
    thumb.addEventListener("click", () => {
      viewIndex = i;
      thumbnailStrip.querySelectorAll(".product-thumb").forEach(t => t.setAttribute("aria-pressed", t === thumb));
      if (liquid) liquid.show(i, 1300);
      else box.querySelectorAll("img").forEach((img, k) => img.classList.toggle("is-current", k === i));
    });
  });
}


/* ============================================================
   3. SIZE SELECTOR
   Clothing shows all five sizes (sizes the piece is not made in
   are disabled); a one-size piece shows just that size. Sizes
   that have sold out are struck through. Picking a size that is
   running low says so.
============================================================ */
let selectedSize = "";
const sizeOptions = $("sizeOptions");
const sizeError   = $("sizeError");
const sizeStock   = $("sizeStock");

function sizeList(p) {
  return p.sizes.every(s => SEYLUNE_SIZES.includes(s)) ? SEYLUNE_SIZES : p.sizes;
}

function buildSizes(p) {
  sizeOptions.innerHTML = sizeList(p).map(size => {
    const made = p.sizes.includes(size);
    const out  = made && Seylune.stockLeft(p.id, size) === 0;
    const label = !made ? `${size}, not made in this size` : out ? `${size}, sold out` : size;
    return `<button type="button" class="size-btn${size.length > 2 ? " is-wide" : ""}${out ? " sold-out" : ""}${size === selectedSize ? " active" : ""}"
              data-size="${size}" aria-pressed="${size === selectedSize}" aria-label="${label}"
              ${!made || out ? "disabled" : ""}>${size}</button>`;
  }).join("");

  // A selected size that has just sold out is cleared
  if (selectedSize && Seylune.stockLeft(p.id, selectedSize) === 0) selectedSize = "";

  // One size: choose it straight away
  if (p.sizes.length === 1 && !selectedSize && Seylune.stockLeft(p.id, p.sizes[0]) !== 0) {
    selectSize(p.sizes[0]);
  }
  showStock();
}

function selectSize(size) {
  selectedSize = size;
  sizeOptions.querySelectorAll(".size-btn").forEach(b => {
    const on = b.dataset.size === size;
    b.classList.toggle("active", on);
    b.setAttribute("aria-pressed", on);
  });
  sizeError.textContent = "";
  // Never more in the bag than there are left
  const left = Seylune.stockLeft(product.id, size);
  if (left != null && quantity > left) setQuantity(left);
  showStock();
}

function showStock() {
  const allOut = product.sizes.every(s => Seylune.stockLeft(product.id, s) === 0);
  sizeStock.textContent = allOut ? "This piece has sold out in every size."
    : selectedSize ? (Seylune.stockNote(product.id, selectedSize) ? `${Seylune.stockNote(product.id, selectedSize)} in ${selectedSize}.` : "")
    : "";
  $("addToCartBtn").disabled = allOut;
  $("addToCartBtn").textContent = allOut ? "Sold Out" : "Add to Cart";
}

sizeOptions.addEventListener("click", e => {
  const btn = e.target.closest(".size-btn:not([disabled])");
  if (btn) selectSize(btn.dataset.size);
});

// Real stock arrived from the database: redraw the sizes
document.addEventListener("seylune:stock", () => { if (product) buildSizes(product); });


/* ============================================================
   4. QUANTITY SELECTOR (1–10, and never more than are left)
============================================================ */
let quantity = 1;
const MAX_QTY = 10;

function maxQuantity() {
  const left = selectedSize ? Seylune.stockLeft(product.id, selectedSize) : null;
  return left == null ? MAX_QTY : Math.max(1, Math.min(MAX_QTY, left));
}

function setQuantity(n) {
  quantity = Math.max(1, Math.min(maxQuantity(), n));
  $("qtyValue").textContent = quantity;
  $("qtyDecrease").disabled = quantity <= 1;
  $("qtyIncrease").disabled = quantity >= maxQuantity();
}

$("qtyDecrease").addEventListener("click", () => setQuantity(quantity - 1));
$("qtyIncrease").addEventListener("click", () => setQuantity(quantity + 1));
setQuantity(1);


/* ============================================================
   5. ADD TO CART + SAVE
============================================================ */
const productFeedback = $("productFeedback");

$("addToCartBtn").addEventListener("click", () => {
  if (!product) return;

  // Require a size selection first
  if (!selectedSize) {
    sizeError.textContent = "Please select a size before adding to cart.";
    const firstSize = sizeOptions.querySelector(".size-btn:not([disabled])");
    if (firstSize) firstSize.focus();
    return;
  }

  const added = {
    id:       product.id,
    name:     product.name,
    price:    Seylune.priceOf(product),
    image:    Seylune.asset(product.image),
    size:     selectedSize,
    quantity: quantity
  };
  Seylune.addToCart(added);

  // The bag drawer slides in (shared/site.js); the line below is for screen readers too
  productFeedback.textContent = `${product.name} (Size ${selectedSize}) × ${quantity} added to your cart.`;
  Seylune.announceAdd(added);
});

function updateSaveButton() {
  const saved = Seylune.isSaved(product.id);
  $("saveBtn").classList.toggle("saved", saved);
  $("saveBtn").setAttribute("aria-pressed", saved);
  $("saveBtnText").textContent = saved ? "Saved" : "Save";
}

$("saveBtn").addEventListener("click", () => {
  if (!product) return;
  const saved = Seylune.toggleWishlist(product.id);
  updateSaveButton();
  Seylune.toast(saved ? `${product.name} saved to your account.` : `${product.name} removed from saved pieces.`,
                saved ? "View saved" : "", "../Account/Account.html#saved");
});


/* ============================================================
   6. SIZE GUIDE MODAL
============================================================ */
const sizeGuide    = $("sizeGuide");
const sizeGuideBtn = $("sizeGuideBtn");

function openSizeGuide() {
  sizeGuide.hidden = false;
  document.body.style.overflow = "hidden";
  $("sizeGuideClose").focus();
}

function closeSizeGuide() {
  sizeGuide.hidden = true;
  document.body.style.overflow = "";
  sizeGuideBtn.focus();
}

sizeGuideBtn.addEventListener("click", openSizeGuide);
$("sizeGuideClose").addEventListener("click", closeSizeGuide);

// Click outside the dialog closes it
sizeGuide.addEventListener("click", e => {
  if (e.target === sizeGuide) closeSizeGuide();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !sizeGuide.hidden) closeSizeGuide();
});


/* ============================================================
   7. MORE PIECES
   Complete the look (pieces styled with this one), more from the
   same collection, and what this visitor looked at before.
============================================================ */
function fillGrid(gridId, pieces) {
  $(gridId).innerHTML = pieces.map(item => Seylune.renderProductCard(item)).join("");
  Seylune.addWishlistButtons($(gridId));
}

function buildLook(p) {
  const look = Seylune.lookFor(p.id);
  if (!look || !look.pieces.length) return;
  $("lookSection").hidden = false;
  $("lookName").textContent = `The look: ${look.name}`;
  fillGrid("lookGrid", look.pieces);
}

function buildRelated(p) {
  const inLook = (Seylune.lookFor(p.id) || { pieces: [] }).pieces.map(x => x.id);
  const related = Seylune.products
    .filter(item => item.category === p.category && item.id !== p.id && !inLook.includes(item.id))
    .slice(0, 4);

  $("relatedTitle").textContent = "More " + p.category;
  $("relatedLink").href = Seylune.categoryUrl(p.category);
  fillGrid("relatedGrid", related);
}

function buildRecent(p) {
  const recent = Seylune.getRecent().filter(id => id !== p.id).slice(0, 4).map(Seylune.getProduct);
  if (!recent.length) return;
  $("recentSection").hidden = false;
  fillGrid("recentGrid", recent);
}


/* ============================================================
   START
============================================================ */
Seylune.whenCatalogue(() => {
  product = Seylune.getProduct(params.get("id") || "noira-satin-dress");
  loadProduct();
});

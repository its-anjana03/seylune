/* ============================================================
   SEYLUNE — PRODUCT DETAILS PAGE JAVASCRIPT
   One page for every product: reads ?id=... from the URL and
   fills the template from shared/products.js.
   Shared behaviour (menu, cart, wishlist, search) comes from
   shared/seylune.js and shared/site.js.
   This script handles:
   1. Load the product (or show "not found")
   2. The photograph — its other views melt in (shared/liquid.js)
   3. Size selector
   4. Quantity selector
   5. Add to cart + save to wishlist
   6. Size guide modal
   7. Related products
============================================================ */


/* ============================================================
   1. LOAD THE PRODUCT
============================================================ */
const params  = new URLSearchParams(window.location.search);
const product = Seylune.getProduct(params.get("id") || "noira-satin-dress");

const $ = id => document.getElementById(id);

// Called at the bottom of this file, once every helper below is defined
function loadProduct() {
  if (!product) {
    $("productMissing").hidden = false;
    $("productSection").hidden = true;
    $("productMedia").hidden = true;
    $("main").classList.add("is-missing");
    document.title = "Product Not Found — Seylune";
  } else {
    fillProduct(product);
  }
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
  $("productPrice").textContent = Seylune.formatPrice(p.price);
  $("productShortDesc").textContent = p.short;
  $("productColor").textContent = color.label;
  $("productSwatch").style.background = color.swatch;

  $("productDescription").textContent = p.description;
  $("productFabric").textContent = p.fabric;
  $("productCare").textContent = p.care;
  $("productNote").textContent = p.note;

  buildGallery(p);
  buildSizes(p);
  updateSaveButton();
  buildRelated(p);
}


/* ============================================================
   2. THE PHOTOGRAPH
   Every view of the piece sits in one liquid box; a thumbnail
   melts the photograph into that view.
============================================================ */
const thumbnailStrip = $("thumbnailStrip");

function buildGallery(p) {
  const images = [p.image].concat(p.gallery || []).map(Seylune.asset);
  const box = $("productLiquid");

  box.innerHTML = images.map((src, i) =>
    `<img src="${src}" alt="${Seylune.escapeHtml(p.name)}${i ? " — view " + (i + 1) : ""}"${i ? " loading=\"lazy\"" : ""} />`).join("");

  const liquid = SeyluneSite.liquid
    ? SeyluneSite.liquid.create(box, { focus: images.map(() => [0.5, 0.08]) })
    : null;
  if (!liquid) box.querySelector("img").classList.add("is-current");

  // Thumbnails only when there is more than one view
  if (images.length < 2) return;
  thumbnailStrip.hidden = false;
  thumbnailStrip.innerHTML = images.map((src, i) => `
    <button type="button" class="product-thumb" aria-label="View image ${i + 1} of ${images.length}" aria-pressed="${i === 0}">
      <img src="${src}" alt="" />
    </button>`).join("");

  thumbnailStrip.querySelectorAll(".product-thumb").forEach((thumb, i) => {
    thumb.addEventListener("click", () => {
      thumbnailStrip.querySelectorAll(".product-thumb").forEach(t => t.setAttribute("aria-pressed", t === thumb));
      if (liquid) liquid.show(i, 1300);
      else box.querySelectorAll("img").forEach((img, k) => img.classList.toggle("is-current", k === i));
    });
  });
}


/* ============================================================
   3. SIZE SELECTOR
   All five sizes are shown; sizes this piece is not made in
   are disabled.
============================================================ */
let selectedSize = "";
const sizeOptions = $("sizeOptions");
const sizeError   = $("sizeError");

function buildSizes(p) {
  sizeOptions.innerHTML = SEYLUNE_SIZES.map(size => {
    const available = p.sizes.includes(size);
    return `<button type="button" class="size-btn" data-size="${size}" aria-pressed="false"
              ${available ? "" : `disabled aria-label="${size} — unavailable"`}>${size}</button>`;
  }).join("");

  sizeOptions.querySelectorAll(".size-btn:not([disabled])").forEach(btn => {
    btn.addEventListener("click", () => {
      sizeOptions.querySelectorAll(".size-btn").forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      selectedSize = btn.dataset.size;
      sizeError.classList.remove("show");
      sizeError.textContent = "";
    });
  });
}


/* ============================================================
   4. QUANTITY SELECTOR (1–10)
============================================================ */
let quantity = 1;
const MAX_QTY = 10;

$("qtyDecrease").addEventListener("click", () => {
  if (quantity > 1) quantity -= 1;
  $("qtyValue").textContent = quantity;
});

$("qtyIncrease").addEventListener("click", () => {
  if (quantity < MAX_QTY) quantity += 1;
  $("qtyValue").textContent = quantity;
});


/* ============================================================
   5. ADD TO CART + SAVE
============================================================ */
const productFeedback = $("productFeedback");
let feedbackTimer = null;

$("addToCartBtn").addEventListener("click", () => {
  if (!product) return;

  // Require a size selection first
  if (!selectedSize) {
    sizeError.textContent = "Please select a size before adding to cart.";
    sizeError.classList.add("show");
    const firstSize = sizeOptions.querySelector(".size-btn:not([disabled])");
    if (firstSize) firstSize.focus();
    return;
  }

  Seylune.addToCart({
    id:       product.id,
    name:     product.name,
    price:    product.price,
    image:    Seylune.asset(product.image),
    size:     selectedSize,
    quantity: quantity
  });

  productFeedback.textContent = `${product.name} (Size ${selectedSize}) × ${quantity} added to your cart.`;
  productFeedback.classList.add("show");

  clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => {
    productFeedback.classList.remove("show");
    productFeedback.textContent = "";
  }, 3500);
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
   7. RELATED PRODUCTS — same category, current piece excluded
============================================================ */
function buildRelated(p) {
  const related = Seylune.products
    .filter(item => item.category === p.category && item.id !== p.id)
    .slice(0, 4);

  $("relatedTitle").textContent = "More " + p.category;
  $("relatedLink").href = Seylune.categoryUrl(p.category);
  $("relatedGrid").innerHTML = related.map(item => Seylune.renderProductCard(item)).join("");
  Seylune.addWishlistButtons($("relatedGrid"));
}


/* ============================================================
   START
============================================================ */
loadProduct();

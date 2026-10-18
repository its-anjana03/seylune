/* ============================================================
   SEYLUNE — PRODUCT DETAILS PAGE JAVASCRIPT
   One page for every product: reads ?id=... from the URL and
   fills the template from shared/products.js.
   Shared behaviour (mobile menu, cart, wishlist, search)
   comes from shared/seylune.js.
   This script handles:
   1. Load the product (or show "not found")
   2. Image gallery — thumbnail switching
   3. Size selector
   4. Quantity selector
   5. Add to cart + save to wishlist
   6. Tabs — Description / Fabric & Care / Delivery
   7. Size guide modal
   8. Related products
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
    $("productTabs").hidden = true;
    $("relatedSection").hidden = true;
    $("breadcrumbCategory").textContent = "New Arrivals";
    $("breadcrumbCategory").href = "../New arrivals/new-arriavals.html";
    $("breadcrumbCurrent").textContent = "Not Found";
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
   2. IMAGE GALLERY — thumbnail switching
============================================================ */
const mainImageImg   = $("mainImageImg");
const mainImageBox   = $("mainImage");
const thumbnailStrip = $("thumbnailStrip");

function buildGallery(p) {
  const images = [p.image].concat(p.gallery || []).map(Seylune.asset);

  mainImageImg.src = images[0];
  mainImageImg.alt = `${p.name} — main view`;

  // Only show thumbnails when there is more than one image
  if (images.length < 2) {
    thumbnailStrip.hidden = true;
    return;
  }

  thumbnailStrip.innerHTML = images.map((src, i) => `
    <button type="button" class="thumbnail${i === 0 ? " active" : ""}" data-image="${src}"
            aria-label="View image ${i + 1} of ${images.length}" aria-pressed="${i === 0}">
      <img src="${src}" alt="" />
    </button>`).join("");

  thumbnailStrip.querySelectorAll(".thumbnail").forEach((thumb, i) => {
    thumb.addEventListener("click", () => {
      thumbnailStrip.querySelectorAll(".thumbnail").forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-pressed", "false");
      });
      thumb.classList.add("active");
      thumb.setAttribute("aria-pressed", "true");

      // Smooth fade when swapping main image
      mainImageBox.classList.add("fading");
      setTimeout(() => {
        mainImageImg.src = thumb.dataset.image;
        mainImageImg.alt = `${p.name} — view ${i + 1}`;
        mainImageBox.classList.remove("fading");
      }, 200);
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
   6. TABS — Description / Fabric & Care / Delivery
   Click or use the arrow keys to move between tabs.
============================================================ */
const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));
const tabPanels  = document.querySelectorAll(".tab-panel");

function activateTab(btn) {
  tabButtons.forEach(b => {
    b.classList.remove("active");
    b.setAttribute("aria-selected", "false");
    b.setAttribute("tabindex", "-1");
  });
  tabPanels.forEach(p => p.classList.remove("active"));

  btn.classList.add("active");
  btn.setAttribute("aria-selected", "true");
  btn.removeAttribute("tabindex");
  const panel = $("tab-" + btn.dataset.tab);
  if (panel) panel.classList.add("active");
}

tabButtons.forEach((btn, i) => {
  btn.addEventListener("click", () => activateTab(btn));
  btn.addEventListener("keydown", e => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const next = tabButtons[(i + (e.key === "ArrowRight" ? 1 : -1) + tabButtons.length) % tabButtons.length];
    activateTab(next);
    next.focus();
  });
});


/* ============================================================
   7. SIZE GUIDE MODAL
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
   8. RELATED PRODUCTS — same category, current piece excluded
============================================================ */
function buildRelated(p) {
  const related = Seylune.products
    .filter(item => item.category === p.category && item.id !== p.id)
    .slice(0, 4);

  $("relatedGrid").innerHTML = related.map(item => Seylune.renderProductCard(item, "related")).join("");
  Seylune.addWishlistButtons($("relatedGrid"));
}


/* ============================================================
   START
============================================================ */
loadProduct();

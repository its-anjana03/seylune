/* ============================================================
   SEYLUNE — CART PAGE JAVASCRIPT
   Shared behaviour (menu, cart storage, badge, search) comes
   from shared/seylune.js and shared/site.js.
   This script handles:
   1. Rendering cart rows from localStorage
   2. Quantity +/- controls and remove (per id + size line)
   3. Size picker for pieces added without a size
   4. Order summary: items, subtotal, delivery, total
   5. Free-delivery progress message
   6. Proceed to Checkout
   7. Empty cart state toggle
============================================================ */

const { formatPrice, escapeHtml } = Seylune;
const summaryMessage = document.getElementById("summaryMessage");
let messageTimer = null;

function showMessage(text, isError) {
  if (!summaryMessage) return;
  summaryMessage.textContent = text;
  summaryMessage.classList.toggle("error", !!isError);
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => { summaryMessage.textContent = ""; }, 3000);
}


/* ============================================================
   1. RENDER CART
   Shows the cart layout with item rows + summary, or the
   empty cart state (already in HTML).
============================================================ */
function renderCart() {
  const cart       = Seylune.getCart();
  const cartLayout = document.getElementById("cartLayout");
  const emptyCart  = document.getElementById("emptyCart");
  const cartItems  = document.getElementById("cartItems");

  cartLayout.hidden = cart.length === 0;
  emptyCart.hidden = cart.length > 0;
  if (cart.length === 0) {
    updateSummary([]);
    return;
  }

  cartItems.innerHTML = cart.map(item => {
    const key     = Seylune.lineKey(item);
    const product = Seylune.getProduct(item.id);
    const url     = Seylune.productUrl(item.id);
    const name    = escapeHtml(item.name);

    // Size: a picker, so the size can be chosen or changed here
    let sizeCell = "";
    if (product && product.sizes) {
      const options = product.sizes.map(s =>
        `<option value="${s}" ${s === item.size ? "selected" : ""}>${s}</option>`).join("");
      sizeCell = `
        <label class="cart-size">
          <span>Size</span>
          <select class="select cart-size-select${item.size ? "" : " needs-size"}" data-key="${key}"
                  aria-label="Size for ${name}">
            ${item.size ? "" : `<option value="" selected disabled>Choose</option>`}
            ${options}
          </select>
        </label>`;
    } else if (item.size) {
      sizeCell = `<p class="cart-size"><span>Size</span> ${escapeHtml(item.size)}</p>`;
    }

    return `
      <article class="cart-line" data-key="${key}">
        <a href="${url}" class="cart-line-image" tabindex="-1" aria-hidden="true">
          <img src="${escapeHtml(item.image)}" alt="" />
        </a>

        <div class="cart-line-info">
          <h2 class="cart-line-name"><a href="${url}">${name}</a></h2>
          <p class="cart-line-each">${formatPrice(item.price)} each</p>

          <div class="cart-line-controls">
            ${sizeCell}
            <div class="qty-control" role="group" aria-label="Quantity of ${name}">
              <button class="qty-btn qty-decrease" data-key="${key}" aria-label="Decrease quantity of ${name}"
                      ${item.quantity <= 1 ? "disabled" : ""}>−</button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-btn qty-increase" data-key="${key}" aria-label="Increase quantity of ${name}">+</button>
            </div>
            <button class="remove-btn" data-key="${key}" aria-label="Remove ${name}${item.size ? ", size " + item.size : ""}">Remove</button>
          </div>
        </div>

        <p class="cart-line-total">${formatPrice(item.price * item.quantity)}</p>
      </article>`;
  }).join("");

  updateSummary(cart);
}


/* ============================================================
   2 + 3. ROW CONTROLS — one listener for the whole list
============================================================ */
const cartItemsEl = document.getElementById("cartItems");

cartItemsEl.addEventListener("click", e => {
  const inc = e.target.closest(".qty-increase");
  const dec = e.target.closest(".qty-decrease");
  const rem = e.target.closest(".remove-btn");

  if (inc) Seylune.changeQuantity(inc.dataset.key, 1);
  else if (dec) Seylune.changeQuantity(dec.dataset.key, -1);
  else if (rem) {
    const item = Seylune.getCart().find(i => Seylune.lineKey(i) === rem.dataset.key);
    Seylune.removeFromCart(rem.dataset.key);
    if (item) Seylune.toast(`${item.name} removed from your cart.`);
  } else return;

  renderCart();
});

cartItemsEl.addEventListener("change", e => {
  const select = e.target.closest(".cart-size-select");
  if (!select) return;
  Seylune.changeSize(select.dataset.key, select.value);
  renderCart();
});


/* ============================================================
   4 + 5. ORDER SUMMARY + FREE DELIVERY PROGRESS
============================================================ */
function updateSummary(cart) {
  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal   = Seylune.getSubtotal(cart);
  const shipping   = Seylune.getShipping(subtotal, "standard");

  document.getElementById("summaryItemCount").textContent = totalItems;
  document.getElementById("summarySubtotal").textContent  = formatPrice(subtotal);
  document.getElementById("summaryShipping").textContent  = shipping === 0 ? "Free" : formatPrice(shipping);
  document.getElementById("summaryTotal").textContent     = formatPrice(subtotal + shipping);

  const note = document.getElementById("deliveryProgress");
  const bar  = document.getElementById("deliveryBar");
  const remaining = Seylune.FREE_DELIVERY_MIN - subtotal;

  if (note) {
    note.textContent = remaining > 0
      ? `Add ${formatPrice(remaining)} more for free islandwide delivery.`
      : "You've unlocked free islandwide delivery.";
  }
  if (bar) {
    bar.style.width = Math.min(100, (subtotal / Seylune.FREE_DELIVERY_MIN) * 100) + "%";
  }
}


/* ============================================================
   6. PROCEED TO CHECKOUT
============================================================ */
document.getElementById("checkoutBtn").addEventListener("click", () => {
  const cart = Seylune.getCart();

  if (cart.length === 0) {
    showMessage("Your cart is empty.", true);
    return;
  }

  // Every sized piece needs a size before checkout
  const missing = document.querySelector(".cart-size-select.needs-size");
  if (missing) {
    showMessage("Please choose a size for every piece before checkout.", true);
    missing.focus();
    return;
  }

  window.location.href = "../Checkout/checkout.html";
});


/* ============================================================
   7. INIT
============================================================ */
renderCart();

// Re-render if the cart changes in another tab
window.addEventListener("storage", e => {
  if (e.key === Seylune.KEYS.cart) renderCart();
});

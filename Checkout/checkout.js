/* ============================================================
   SEYLUNE — CHECKOUT PAGE JAVASCRIPT
   Frontend-only checkout for the demo store.
   Shared behaviour (cart storage, badge, mobile menu, search)
   comes from shared/seylune.js.
   This script handles:
   1. Choosing which state to show (form / empty / done)
   2. Order summary + delivery cost (updates with the method)
   3. Prefilling details for signed-in customers
   4. Form validation (Sri Lankan mobile + postal code)
   5. Placing the order: save to localStorage, clear the cart,
      show the confirmation
============================================================ */

const { formatPrice, escapeHtml } = Seylune;
const $ = id => document.getElementById(id);

const form   = $("checkoutForm");
const layout = $("checkoutLayout");


/* ============================================================
   1. WHICH STATE TO SHOW
============================================================ */
const cart = Seylune.getCart();
const missingSize = cart.some(item => {
  const p = Seylune.getProduct(item.id);
  return p && p.sizes && !item.size;
});

if (cart.length === 0) {
  $("checkoutEmpty").hidden = false;
} else if (missingSize) {
  // Sizes are chosen on the cart page
  window.location.replace("../Cart/cart.html");
} else {
  layout.hidden = false;
  renderSummary();
  prefill();
}


/* ============================================================
   2. ORDER SUMMARY
============================================================ */
function selectedDelivery() {
  return (form.querySelector("input[name='delivery']:checked") || {}).value || "standard";
}

function totals() {
  const subtotal = Seylune.getSubtotal(cart);
  const shipping = Seylune.getShipping(subtotal, selectedDelivery());
  return { subtotal, shipping, total: subtotal + shipping };
}

function renderSummary() {
  $("summaryItems").innerHTML = cart.map(item => `
    <li class="summary-item">
      <span class="summary-item-image">
        <img src="${escapeHtml(item.image)}" alt="" />
        <span class="summary-item-qty">${item.quantity}</span>
      </span>
      <span class="summary-item-info">
        <span class="summary-item-name">${escapeHtml(item.name)}</span>
        ${item.size ? `<span class="summary-item-meta">Size ${escapeHtml(item.size)}</span>` : ""}
      </span>
      <span class="summary-item-price">${formatPrice(item.price * item.quantity)}</span>
    </li>`).join("");

  const t = totals();
  $("coSubtotal").textContent = formatPrice(t.subtotal);
  $("coShipping").textContent = t.shipping === 0 ? "Free" : formatPrice(t.shipping);
  $("coTotal").textContent    = formatPrice(t.total);

  const freeStandard = t.subtotal >= Seylune.FREE_DELIVERY_MIN;
  $("standardPrice").textContent = freeStandard ? "Free" : formatPrice(Seylune.DELIVERY.standard.price);
  $("coDeliveryNote").textContent = freeStandard
    ? "Your order qualifies for free standard delivery."
    : `Add ${formatPrice(Seylune.FREE_DELIVERY_MIN - t.subtotal)} more for free standard delivery.`;
}

form.querySelectorAll("input[name='delivery']").forEach(radio => {
  radio.addEventListener("change", renderSummary);
});


/* ============================================================
   3. PREFILL FOR SIGNED-IN CUSTOMERS
============================================================ */
function prefill() {
  const user = Seylune.read(Seylune.KEYS.user, null);
  if (!user) return;
  if (user.name)  $("coName").value  = user.name;
  if (user.email) $("coEmail").value = user.email;
}


/* ============================================================
   4. VALIDATION
============================================================ */
const PHONE_PATTERN  = /^(?:\+94|0)7\d{8}$/;   // 07XXXXXXXX or +947XXXXXXXX
const POSTAL_PATTERN = /^\d{5}$/;

function setError(id, message) {
  const field = $(id);
  const wrap  = field.closest(".field");
  if (wrap) wrap.classList.toggle("error", !!message);
  field.setAttribute("aria-invalid", message ? "true" : "false");
  const error = $(id + "Error");
  if (error) error.textContent = message || "";
  if (message) field.setAttribute("aria-describedby", id + "Error");
}

function validate() {
  const value = id => $(id).value.trim();
  const checks = [
    ["coName",    value("coName").length >= 2,                               "Please enter your full name."],
    ["coEmail",   Seylune.EMAIL_PATTERN.test(value("coEmail")),              "Please enter a valid email address."],
    ["coPhone",   PHONE_PATTERN.test(value("coPhone").replace(/[\s-]/g, "")), "Enter a Sri Lankan mobile number, e.g. 077 123 4567."],
    ["coAddress", value("coAddress").length >= 5,                            "Please enter your street address."],
    ["coCity",    value("coCity").length >= 2,                               "Please enter your city."],
    ["coPostal",  POSTAL_PATTERN.test(value("coPostal")),                    "Postal codes have 5 digits, e.g. 00700."]
  ];

  let firstInvalid = null;
  checks.forEach(([id, ok, message]) => {
    setError(id, ok ? "" : message);
    if (!ok && !firstInvalid) firstInvalid = $(id);
  });

  const termsOk = $("coTerms").checked;
  $("coTermsError").textContent = termsOk ? "" : "Please accept the delivery and returns policy.";
  if (!termsOk && !firstInvalid) firstInvalid = $("coTerms");

  return firstInvalid;
}

// Clear a field's error as soon as the customer edits it
["coName", "coEmail", "coPhone", "coAddress", "coCity", "coPostal"].forEach(id => {
  $(id).addEventListener("input", () => setError(id, ""));
});
$("coTerms").addEventListener("change", () => { $("coTermsError").textContent = ""; });


/* ============================================================
   5. PLACE ORDER
============================================================ */
form.addEventListener("submit", e => {
  e.preventDefault();

  const firstInvalid = validate();
  if (firstInvalid) {
    $("checkoutMessage").textContent = "Please check the highlighted details.";
    firstInvalid.focus();
    return;
  }
  $("checkoutMessage").textContent = "";

  const t = totals();
  const delivery = selectedDelivery();
  const payment = form.querySelector("input[name='payment']:checked").value;

  const order = {
    id:       "SEY-" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 90 + 10),
    date:     new Date().toISOString(),
    items:    cart,
    subtotal: t.subtotal,
    shipping: t.shipping,
    total:    t.total,
    delivery: delivery,
    payment:  payment,
    customer: {
      name:    $("coName").value.trim(),
      email:   $("coEmail").value.trim(),
      phone:   $("coPhone").value.trim(),
      address: $("coAddress").value.trim(),
      city:    $("coCity").value.trim(),
      postal:  $("coPostal").value.trim(),
      notes:   $("coNotes").value.trim()
    }
  };

  const orders = Seylune.read(Seylune.KEYS.orders, []);
  orders.unshift(order);
  Seylune.write(Seylune.KEYS.orders, orders);
  Seylune.clearCart();

  showConfirmation(order);
});

function showConfirmation(order) {
  layout.hidden = true;
  $("checkoutDone").hidden = false;
  $("checkoutTitle").textContent = "Order Confirmed";

  $("stepDetails").classList.replace("current", "done");
  $("stepDetails").removeAttribute("aria-current");
  $("stepConfirm").classList.add("current");
  $("stepConfirm").setAttribute("aria-current", "step");

  $("doneText").textContent =
    `Thank you, ${order.customer.name.split(" ")[0]}. A confirmation would be sent to ${order.customer.email} in a live store.`;
  $("doneOrderId").textContent  = order.id;
  $("doneTotal").textContent    = formatPrice(order.total);
  $("doneDelivery").textContent = order.delivery === "express" ? "Express (1–2 days)" : "Standard (2–4 days)";
  $("donePayment").textContent  = order.payment === "bank" ? "Bank Transfer" : "Cash on Delivery";

  window.scrollTo({ top: 0, behavior: "smooth" });
  $("checkoutDone").focus({ preventScroll: true });
}

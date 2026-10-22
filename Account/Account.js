/* ============================================================
   SEYLUNE — ACCOUNT PAGE JAVASCRIPT
   Shared behaviour (menu, cart badge, wishlist, search) comes
   from shared/seylune.js and shared/site.js.

   Two modes, one page:
   - LIVE (Supabase connected, shared/backend.js): real accounts.
     The password goes straight to Supabase over HTTPS and is
     never stored by this site. Orders come from the database,
     and Row Level Security returns only this customer's own.
   - DEMO (no backend): the old frontend-only behaviour, kept in
     localStorage, with no passwords stored.

   1. Show/Hide password toggles
   2. Field helpers
   3. Accounts: live or demo, behind the same few functions
   4. Sign in
   5. Create account (+ password strength)
   6. Forgot password + choosing a new one
   7. Sign in / Create account tabs + the photograph
   8. Signed in: profile, your details + password, orders, saved pieces
============================================================ */

const $ = id => document.getElementById(id);
const esc = Seylune.escapeHtml;
const emailPattern = Seylune.EMAIL_PATTERN;
const MIN_PASSWORD = 8;
const live = typeof SeyluneBackend !== "undefined" && SeyluneBackend.enabled;

// Came here from checkout? Go back there once signed in.
const next = new URLSearchParams(location.search).get("next");


/* ============================================================
   1. SHOW / HIDE PASSWORD TOGGLES
============================================================ */
document.querySelectorAll(".password-toggle").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = $(btn.dataset.target);
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.classList.toggle("is-visible", show);
    btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
  });
});


/* ============================================================
   2. FIELD HELPERS
============================================================ */
function showFieldError(id, message) {
  const field = $(id);
  if (!field) return;
  const group = field.closest(".form-group");
  if (group) group.classList.add("error");
  field.setAttribute("aria-invalid", "true");
  field.setAttribute("aria-describedby", id + "Error");
  if ($(id + "Error")) $(id + "Error").textContent = message;
}

function clearFieldError(id) {
  const field = $(id);
  if (!field) return;
  const group = field.closest(".form-group");
  if (group) group.classList.remove("error");
  field.removeAttribute("aria-invalid");
  if ($(id + "Error")) $(id + "Error").textContent = "";
}

function showFeedback(id, message, type) {
  const el = $(id);
  if (!el) return;
  el.className = "form-feedback " + (type || "");
  el.textContent = message;
}

// While a request is on its way, the button says so and can't be pressed twice
function busy(form, on, label) {
  const btn = form.querySelector("button[type=submit]");
  if (!btn) return;
  if (on) { btn.dataset.label = btn.textContent; btn.textContent = label; }
  else if (btn.dataset.label) btn.textContent = btn.dataset.label;
  btn.disabled = on;
}

["loginEmail", "loginPassword", "signupName", "signupEmail", "signupPassword", "signupConfirm", "recoverPassword"]
  .forEach(id => { if ($(id)) $(id).addEventListener("input", () => clearFieldError(id)); });


/* ============================================================
   3. ACCOUNTS — live (Supabase) or demo (localStorage)
   Every function returns a promise so the page code is the same.
   A user here is { name, email, since }.
============================================================ */
const Accounts = live ? {
  async current() {
    const u = await SeyluneBackend.getUser();
    return u ? { name: SeyluneBackend.displayName(u), email: u.email, since: u.created_at } : null;
  },
  async signIn(email, password) {
    await SeyluneBackend.signIn(email, password);
  },
  async signUp(name, email, password) {
    const result = await SeyluneBackend.signUp(name, email, password);
    // With "Confirm email" switched on, Supabase waits for the email link
    return result.session ? "signed-in" : "confirm";
  },
  signOut: () => SeyluneBackend.signOut(),
  sendReset: email => SeyluneBackend.sendPasswordReset(email),
  async orders() {
    const rows = await SeyluneBackend.myOrders();
    return rows.map(o => ({
      number: o.number, date: o.created_at, status: o.status, delivery: o.delivery,
      payment: o.payment, shipping: o.shipping, total: o.total, city: o.ship_city,
      items: o.order_items.map(i => ({
        id: i.product_id, name: i.name, size: i.size, quantity: i.quantity, price: i.unit_price,
        image: Seylune.asset((Seylune.getProduct(i.product_id) || {}).image || "home/images/Logo.png")
      }))
    }));
  }
} : {
  async current() {
    const u = Seylune.read(Seylune.KEYS.user, null);
    return u && u.email ? { name: u.name, email: u.email, since: u.memberSince } : null;
  },
  async signIn(email) {
    const known = Seylune.read(Seylune.KEYS.accounts, {})[email.toLowerCase()];
    Seylune.write(Seylune.KEYS.user, { name: known ? known.name : email.split("@")[0], email, memberSince: known ? known.createdAt : Date.now() });
  },
  async signUp(name, email) {
    const accounts = Seylune.read(Seylune.KEYS.accounts, {});
    accounts[email.toLowerCase()] = { name, createdAt: Date.now() };
    Seylune.write(Seylune.KEYS.accounts, accounts);
    Seylune.write(Seylune.KEYS.user, { name, email, memberSince: Date.now() });
    return "signed-in";
  },
  async signOut() { Seylune.remove(Seylune.KEYS.user); },
  async sendReset() { /* demo: nothing is sent */ },
  async orders(user) {
    return Seylune.read(Seylune.KEYS.orders, [])
      .filter(o => !o.customer || o.customer.email.toLowerCase() === user.email.toLowerCase())
      .map(o => ({
        number: o.id, date: o.date, status: "processing", delivery: o.delivery, payment: o.payment,
        shipping: o.shipping, total: o.total, city: o.customer.city,
        items: o.items.map(i => ({ id: i.id, name: i.name, size: i.size, quantity: i.quantity, price: i.price, image: i.image }))
      }));
  }
};

function afterSignIn(message) {
  if (next === "checkout") {
    location.href = "../Checkout/checkout.html";
    return;
  }
  renderAccount();
  window.scrollTo({ top: 0, behavior: "smooth" });
  Seylune.toast(message);
}


/* ============================================================
   4. SIGN IN
============================================================ */
const loginForm = $("loginForm");

loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;
  ["loginEmail", "loginPassword"].forEach(clearFieldError);
  showFeedback("loginFeedback", "");

  let ok = true;
  if (!emailPattern.test(email)) { showFieldError("loginEmail", "Please enter a valid email address."); ok = false; }
  if (!password) { showFieldError("loginPassword", "Please enter your password."); ok = false; }
  if (!ok) return;

  busy(loginForm, true, "Signing in…");
  try {
    await Accounts.signIn(email, password);
    loginForm.reset();
    const user = await Accounts.current();
    afterSignIn(`Welcome back, ${(user ? user.name : "").split(" ")[0]}.`);
  } catch (err) {
    showFeedback("loginFeedback", err.message, "error");
  } finally {
    busy(loginForm, false);
  }
});


/* ============================================================
   5. CREATE ACCOUNT
============================================================ */
const signupForm = $("signupForm");

signupForm.addEventListener("submit", async e => {
  e.preventDefault();
  const name = $("signupName").value.trim();
  const email = $("signupEmail").value.trim();
  const password = $("signupPassword").value;
  const confirm = $("signupConfirm").value;
  ["signupName", "signupEmail", "signupPassword", "signupConfirm"].forEach(clearFieldError);
  showFeedback("signupFeedback", "");

  let ok = true;
  if (name.length < 2) { showFieldError("signupName", "Please enter your full name."); ok = false; }
  if (!emailPattern.test(email)) { showFieldError("signupEmail", "Please enter a valid email address."); ok = false; }
  if (password.length < MIN_PASSWORD) { showFieldError("signupPassword", `Password must be at least ${MIN_PASSWORD} characters.`); ok = false; }
  if (confirm !== password) { showFieldError("signupConfirm", "Passwords do not match."); ok = false; }
  if (!$("agreeTerms").checked) { showFeedback("signupFeedback", "Please agree to the Terms and Privacy Policy.", "error"); ok = false; }
  if (!ok) return;

  busy(signupForm, true, "Creating account…");
  try {
    const result = await Accounts.signUp(name, email, password);
    signupForm.reset();
    resetStrength();
    if (result === "confirm") {
      showFeedback("signupFeedback", `Almost there: open the link we sent to ${email} to confirm your account.`, "success");
    } else {
      afterSignIn(`Welcome to Seylune, ${name.split(" ")[0]}. Your account has been created.`);
    }
  } catch (err) {
    showFeedback("signupFeedback", err.message, "error");
  } finally {
    busy(signupForm, false);
  }
});

// Password strength: +1 for 10+ characters, +1 for letters and numbers, +1 for a symbol
const strengthMeter = $("passwordStrength");

function resetStrength() {
  strengthMeter.className = "password-strength";
  strengthMeter.querySelector(".strength-label").textContent = "Password strength";
}

$("signupPassword").addEventListener("input", () => {
  const pw = $("signupPassword").value;
  if (!pw) return resetStrength();
  let score = 0;
  if (pw.length >= 10) score++;
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const level = pw.length < MIN_PASSWORD || score <= 1 ? "weak" : score === 2 ? "medium" : "strong";
  strengthMeter.className = "password-strength " + level;
  strengthMeter.querySelector(".strength-label").textContent =
    pw.length < MIN_PASSWORD ? "Too short" : level.charAt(0).toUpperCase() + level.slice(1);
});


/* ============================================================
   6. FORGOT PASSWORD + CHOOSING A NEW ONE
   Supabase emails a one-time link back to this page. Opening it
   signs the customer in for one purpose: setting a new password.
============================================================ */
$("forgotLink").addEventListener("click", async () => {
  const email = $("loginEmail").value.trim();
  if (!emailPattern.test(email)) {
    showFieldError("loginEmail", "Enter your email first, then choose Forgot password.");
    $("loginEmail").focus();
    return;
  }
  try {
    await Accounts.sendReset(email);
    // The same message whether or not the account exists, so this form
    // can't be used to find out who has an account
    showFeedback("loginFeedback", live
      ? `If ${email} has an account, a reset link is on its way.`
      : `A reset link would be sent to ${email} in a live store.`, "success");
  } catch (err) {
    showFeedback("loginFeedback", err.message, "error");
  }
});

const recoverForm = $("recoverForm");

function showRecovery() {
  $("authSection").hidden = false;
  $("accountDashboard").hidden = true;
  document.querySelector(".auth-tabs").hidden = true;
  $("loginCard").hidden = true;
  $("signupCard").hidden = true;
  $("recoverCard").hidden = false;
  $("accountTitle").textContent = "Choose a new password";
  $("accountSubtitle").textContent = "You opened a password reset link. Set a new password to finish.";
  $("recoverPassword").focus();
}

recoverForm.addEventListener("submit", async e => {
  e.preventDefault();
  const password = $("recoverPassword").value;
  clearFieldError("recoverPassword");
  if (password.length < MIN_PASSWORD) {
    showFieldError("recoverPassword", `Password must be at least ${MIN_PASSWORD} characters.`);
    return;
  }
  busy(recoverForm, true, "Saving…");
  try {
    await SeyluneBackend.updatePassword(password);
    recoverForm.reset();
    document.querySelector(".auth-tabs").hidden = false;
    $("recoverCard").hidden = true;
    afterSignIn("Your new password is saved.");
  } catch (err) {
    showFeedback("recoverFeedback", err.message, "error");
  } finally {
    busy(recoverForm, false);
  }
});

if (live) {
  SeyluneBackend.onAuthChange(event => {
    if (event === "PASSWORD_RECOVERY") showRecovery();
  });
}


/* ============================================================
   7. SIGN IN / CREATE ACCOUNT TABS
   Arrow keys move between the two tabs. The photograph beside
   the forms ripples under the cursor (shared/liquid.js).
============================================================ */
const authTabs = [$("tabLogin"), $("tabSignup")];

function showAuthTab(tab, focus) {
  authTabs.forEach(t => {
    const on = t === tab;
    t.setAttribute("aria-selected", on);
    t.tabIndex = on ? 0 : -1;
    $(t.getAttribute("aria-controls")).hidden = !on;
  });
  if (focus) tab.focus();
}

authTabs.forEach((tab, i) => {
  tab.addEventListener("click", () => showAuthTab(tab));
  tab.addEventListener("keydown", e => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    showAuthTab(authTabs[(i + 1) % 2], true);
  });
});

if (location.hash === "#signup") showAuthTab(authTabs[1]);
if (next === "checkout") {
  $("accountSubtitle").textContent = "Sign in or create an account to finish your order.";
}

if (SeyluneSite.liquid) {
  // Zoomed toward the top so the words printed at the foot of the photograph stay out of view
  SeyluneSite.liquid.create($("accountLiquid"), { focus: [[0.5, 0.12]], zoom: 1.3 });
}


/* ============================================================
   8. SIGNED IN — profile, orders, saved pieces
============================================================ */
$("signOutBtn").addEventListener("click", async () => {
  await Accounts.signOut();
  renderAccount();
  Seylune.toast("You have been signed out.");
});

async function renderAccount() {
  const user = await Accounts.current();
  $("authSection").hidden = !!user;
  $("accountDashboard").hidden = !user;

  if (user) {
    const name = user.name || user.email.split("@")[0];
    $("dashboardTitle").textContent = `Welcome, ${name.split(" ")[0]}`;
    $("dashboardName").textContent = name;
    $("dashboardAvatar").textContent = name.charAt(0).toUpperCase();
    const since = user.since
      ? " · Member since " + new Date(user.since).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
      : "";
    $("dashboardEmail").textContent = user.email + since;
    renderOrders(user);
    if (live) {
      renderDetails();
      SeyluneBackend.isAdmin().then(yes => { $("adminLink").hidden = !yes; });
    }
  }
  renderSaved();
}


/* ----- Your details (live only) -----
   The same rules as checkout. The database checks them again, so a
   bad phone number is refused even if someone skips this form. */
const PHONE_PATTERN  = /^(?:\+94|0)7\d{8}$/;
const POSTAL_PATTERN = /^\d{5}$/;
const profileFields = ["profileName", "profilePhone", "profileAddress", "profileCity", "profilePostal"];
profileFields.forEach(id => $(id).addEventListener("input", () => clearFieldError(id)));

async function renderDetails() {
  $("details").hidden = false;
  try {
    const p = await SeyluneBackend.getProfile();
    $("profileName").value    = p.full_name || $("dashboardName").textContent;
    $("profilePhone").value   = p.phone || "";
    $("profileAddress").value = p.address || "";
    $("profileCity").value    = p.city || "";
    $("profilePostal").value  = p.postal || "";
    if (p.full_name) setDisplayName(p.full_name);
  } catch (err) {
    showFeedback("profileFeedback", err.message, "error");
  }
}

function setDisplayName(name) {
  $("dashboardTitle").textContent = `Welcome, ${name.split(" ")[0]}`;
  $("dashboardName").textContent = name;
  $("dashboardAvatar").textContent = name.charAt(0).toUpperCase();
}

$("profileForm").addEventListener("submit", async e => {
  e.preventDefault();
  profileFields.forEach(clearFieldError);
  showFeedback("profileFeedback", "");

  const v = id => $(id).value.trim();
  const phone = v("profilePhone").replace(/[\s-]/g, "");
  const checks = [
    ["profileName",    v("profileName").length >= 2 && v("profileName").length <= 80, "Please enter your full name."],
    ["profilePhone",   !phone || PHONE_PATTERN.test(phone),                           "Enter a Sri Lankan mobile number, e.g. 077 123 4567."],
    ["profileAddress", !v("profileAddress") || v("profileAddress").length >= 5,       "Please enter your street address."],
    ["profileCity",    !v("profileCity") || v("profileCity").length >= 2,             "Please enter your city."],
    ["profilePostal",  !v("profilePostal") || POSTAL_PATTERN.test(v("profilePostal")), "Postal codes have 5 digits, e.g. 00700."]
  ];
  let first = null;
  checks.forEach(([id, ok, msg]) => { if (!ok) { showFieldError(id, msg); first = first || id; } });
  if (first) { $(first).focus(); return; }

  const form = $("profileForm");
  busy(form, true, "Saving…");
  try {
    await SeyluneBackend.saveProfile({
      full_name: v("profileName"),
      phone:   phone || null,
      address: v("profileAddress") || null,
      city:    v("profileCity") || null,
      postal:  v("profilePostal") || null
    });
    setDisplayName(v("profileName"));
    showFeedback("profileFeedback", "Your details are saved.", "success");
  } catch (err) {
    showFeedback("profileFeedback", err.message, "error");
  } finally {
    busy(form, false);
  }
});

["newPassword", "newPasswordConfirm"].forEach(id => $(id).addEventListener("input", () => clearFieldError(id)));

$("passwordForm").addEventListener("submit", async e => {
  e.preventDefault();
  ["newPassword", "newPasswordConfirm"].forEach(clearFieldError);
  showFeedback("passwordFeedback", "");
  const pw = $("newPassword").value;
  if (pw.length < MIN_PASSWORD) { showFieldError("newPassword", `Password must be at least ${MIN_PASSWORD} characters.`); return; }
  if ($("newPasswordConfirm").value !== pw) { showFieldError("newPasswordConfirm", "Passwords do not match."); return; }

  const form = $("passwordForm");
  busy(form, true, "Updating…");
  try {
    await SeyluneBackend.updatePassword(pw);
    form.reset();
    showFeedback("passwordFeedback", "Your password is updated.", "success");
  } catch (err) {
    showFeedback("passwordFeedback", err.message, "error");
  } finally {
    busy(form, false);
  }
});

const STATUS = { processing: "Processing", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };

async function renderOrders(user) {
  const list = $("orderList");
  list.innerHTML = `<p class="section-note">Loading your orders…</p>`;
  let orders = [];
  try {
    orders = await Accounts.orders(user);
  } catch (err) {
    list.innerHTML = `<p class="form-feedback error">${esc(err.message)}</p>`;
    return;
  }

  $("statOrders").textContent = orders.length;
  $("ordersEmpty").hidden = orders.length > 0;

  list.innerHTML = orders.map(order => {
    const count = order.items.reduce((sum, i) => sum + i.quantity, 0);
    const date = new Date(order.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return `
      <details class="order-card">
        <summary>
          <span class="order-id">${esc(order.number)}</span>
          <span class="order-date">${date}</span>
          <span class="order-count">${count} item${count === 1 ? "" : "s"}</span>
          <span class="order-status">${STATUS[order.status] || "Processing"}</span>
          <span class="order-total">${Seylune.formatPrice(order.total)}</span>
        </summary>
        <ul class="order-items">
          ${order.items.map(i => `
            <li>
              <img src="${esc(i.image)}" alt="" />
              <a href="${Seylune.productUrl(i.id)}">${esc(i.name)}</a>
              <span>${i.size ? "Size " + esc(i.size) + " · " : ""}× ${i.quantity}</span>
              <span>${Seylune.formatPrice(i.price * i.quantity)}</span>
            </li>`).join("")}
        </ul>
        <p class="order-meta">
          ${order.delivery === "express" ? "Express" : "Standard"} delivery
          (${order.shipping === 0 ? "free" : Seylune.formatPrice(order.shipping)})
          to ${esc(order.city)} · ${order.payment === "bank" ? "Bank transfer" : "Cash on delivery"}
        </p>
      </details>`;
  }).join("");

  // A link to #orders (from the order confirmation) opens the newest one
  if (location.hash === "#orders" && list.firstElementChild) list.firstElementChild.open = true;
}

/* ----- Saved pieces (wishlist, kept in this browser) ----- */
function renderSaved() {
  const saved = Seylune.getWishlist().map(Seylune.getProduct).filter(Boolean);
  const grid = $("savedGrid");
  grid.innerHTML = saved.map(p => Seylune.renderProductCard(p)).join("");
  Seylune.addWishlistButtons(grid);
  $("savedEmpty").hidden = saved.length > 0;
  $("statSaved").textContent = saved.length;
}

// Un-saving a piece here removes its card straight away
$("savedGrid").addEventListener("click", e => {
  if (e.target.closest(".wishlist-btn")) setTimeout(renderSaved, 0);
});


/* ============================================================
   INIT
============================================================ */
renderAccount();

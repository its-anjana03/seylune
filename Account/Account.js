/* ============================================================
   SEYLUNE — ACCOUNT PAGE JAVASCRIPT
   Shared behaviour (menu, cart badge, wishlist, search) comes
   from shared/seylune.js and shared/site.js.
   Handles:
   1. Show/Hide password toggles
   2. Validation helpers
   3. Login form validation
   4. Signup form validation
   5. Password strength meter
   6. Live error clearing
   7. Sign in / Create account tabs + the photograph
   8. Forgot password (demo message)
   9. Signed-in dashboard: profile, order history, saved pieces
   NOTE: This is a frontend demo — passwords are NOT stored.
   localStorage keeps a "session" (name + email), the orders
   placed at checkout and the saved pieces between visits.
============================================================ */


/* ============================================================
   1. SHOW / HIDE PASSWORD TOGGLES
   Each .password-toggle button has a data-target attribute
   pointing to the input it should toggle.
============================================================ */
document.querySelectorAll(".password-toggle").forEach(btn => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.target;
    const input = document.getElementById(targetId);
    if (!input) return;

    if (input.type === "password") {
      input.type = "text";
      btn.classList.add("is-visible");
      btn.setAttribute("aria-label", "Hide password");
    } else {
      input.type = "password";
      btn.classList.remove("is-visible");
      btn.setAttribute("aria-label", "Show password");
    }
  });
});


/* ============================================================
   2. SHARED VALIDATION HELPERS
============================================================ */
const emailPattern = Seylune.EMAIL_PATTERN;

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  const group = field.closest(".form-group");
  const errorEl = document.getElementById(fieldId + "Error");

  if (group)   group.classList.add("error");
  if (errorEl) errorEl.textContent = message;
}

function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  const group = field.closest(".form-group");
  const errorEl = document.getElementById(fieldId + "Error");

  if (group)   group.classList.remove("error");
  if (errorEl) errorEl.textContent = "";
}

function showFeedback(feedbackId, message, type) {
  const el = document.getElementById(feedbackId);
  if (!el) return;
  el.className = "form-feedback show " + type;   // type = "success" | "error"
  el.textContent = message;

  // Auto-hide after 4 seconds
  setTimeout(() => {
    el.className = "form-feedback";
    el.textContent = "";
  }, 4000);
}


/* ============================================================
   3. LOGIN FORM
============================================================ */
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email    = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    // Reset errors
    clearFieldError("loginEmail");
    clearFieldError("loginPassword");

    let isValid = true;

    if (!emailPattern.test(email)) {
      showFieldError("loginEmail", "Please enter a valid email address.");
      isValid = false;
    }

    if (password.length < 6) {
      showFieldError("loginPassword", "Password must be at least 6 characters.");
      isValid = false;
    }

    if (!isValid) return;

    // Demo: use the name saved at sign-up if this email has an account
    const accounts = Seylune.read(Seylune.KEYS.accounts, {});
    const known = accounts[email.toLowerCase()];
    const name = known ? known.name : email.split("@")[0];

    loginForm.reset();
    signIn({ name: name, email: email, memberSince: known ? known.createdAt : Date.now() });
    Seylune.toast(`Welcome back, ${name.split(" ")[0]}.`);
  });
}


/* ============================================================
   4. SIGNUP FORM
============================================================ */
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name     = document.getElementById("signupName").value.trim();
    const email    = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirm  = document.getElementById("signupConfirm").value;
    const agreed   = document.getElementById("agreeTerms").checked;

    // Reset errors
    clearFieldError("signupName");
    clearFieldError("signupEmail");
    clearFieldError("signupPassword");
    clearFieldError("signupConfirm");

    let isValid = true;

    if (name.length < 2) {
      showFieldError("signupName", "Please enter your full name.");
      isValid = false;
    }

    if (!emailPattern.test(email)) {
      showFieldError("signupEmail", "Please enter a valid email address.");
      isValid = false;
    }

    if (password.length < 6) {
      showFieldError("signupPassword", "Password must be at least 6 characters.");
      isValid = false;
    }

    if (confirm !== password) {
      showFieldError("signupConfirm", "Passwords do not match.");
      isValid = false;
    }

    if (!agreed) {
      showFeedback("signupFeedback", "Please agree to the Terms and Privacy Policy.", "error");
      isValid = false;
    }

    if (!isValid) return;

    // Demo: remember the name for this email (no password is stored)
    const createdAt = Date.now();
    const accounts = Seylune.read(Seylune.KEYS.accounts, {});
    accounts[email.toLowerCase()] = { name: name, createdAt: createdAt };
    Seylune.write(Seylune.KEYS.accounts, accounts);

    signupForm.reset();
    signIn({ name: name, email: email, memberSince: createdAt });
    Seylune.toast(`Welcome to Seylune, ${name.split(" ")[0]}. Your account has been created.`);

    // Reset password strength meter
    const meter = document.getElementById("passwordStrength");
    if (meter) {
      meter.className = "password-strength";
      meter.querySelector(".strength-label").textContent = "Password strength";
    }
  });
}


/* ============================================================
   5. PASSWORD STRENGTH METER (signup)
============================================================ */
const signupPassword = document.getElementById("signupPassword");
const strengthMeter  = document.getElementById("passwordStrength");

if (signupPassword && strengthMeter) {
  const label = strengthMeter.querySelector(".strength-label");

  signupPassword.addEventListener("input", () => {
    const value = signupPassword.value;
    const score = scorePassword(value);

    strengthMeter.classList.remove("weak", "medium", "strong");

    if (value.length === 0) {
      label.textContent = "Password strength";
      return;
    }

    if (score <= 1) {
      strengthMeter.classList.add("weak");
      label.textContent = "Weak";
    } else if (score === 2) {
      strengthMeter.classList.add("medium");
      label.textContent = "Medium";
    } else {
      strengthMeter.classList.add("strong");
      label.textContent = "Strong";
    }
  });
}

// Simple scoring: +1 for length >= 8, +1 for mix of letters & numbers, +1 for symbols
function scorePassword(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}


/* ============================================================
   6. LIVE CLEAR ERRORS WHILE TYPING
============================================================ */
[
  "loginEmail", "loginPassword",
  "signupName", "signupEmail", "signupPassword", "signupConfirm"
].forEach(id => {
  const field = document.getElementById(id);
  if (!field) return;

  field.addEventListener("input", () => clearFieldError(id));
});


/* ============================================================
   7. SIGN IN / CREATE ACCOUNT TABS
   Arrow keys move between the two tabs. The photograph beside
   the forms ripples under the cursor (shared/liquid.js).
============================================================ */
const authTabs = [document.getElementById("tabLogin"), document.getElementById("tabSignup")];

function showAuthTab(tab, focus) {
  authTabs.forEach(t => {
    const on = t === tab;
    t.setAttribute("aria-selected", on);
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
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

// A link to #signup opens the Create account tab
if (location.hash === "#signup") showAuthTab(authTabs[1]);

if (SeyluneSite.liquid) {
  // Zoomed toward the top so the words printed at the foot of the photograph stay out of view
  SeyluneSite.liquid.create(document.getElementById("accountLiquid"), { focus: [[0.5, 0.12]], zoom: 1.3 });
}


/* ============================================================
   8. FORGOT PASSWORD (demo)
============================================================ */
const forgotLink = document.getElementById("forgotLink");
if (forgotLink) {
  forgotLink.addEventListener("click", () => {
    const email = document.getElementById("loginEmail").value.trim();
    if (!emailPattern.test(email)) {
      showFieldError("loginEmail", "Enter your email first, then choose Forgot password.");
      document.getElementById("loginEmail").focus();
      return;
    }
    showFeedback("loginFeedback", `A reset link would be sent to ${email} in a live store.`, "success");
  });
}


/* ============================================================
   9. SIGNED-IN DASHBOARD
   Shows the profile, orders placed at checkout and saved
   pieces. Guests see the login/signup cards instead.
============================================================ */
const authSection = document.getElementById("authSection");
const dashboard   = document.getElementById("accountDashboard");

function getUser() {
  return Seylune.read(Seylune.KEYS.user, null);
}

function signIn(user) {
  Seylune.write(Seylune.KEYS.user, { ...user, loggedInAt: Date.now() });
  renderAccount();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function signOut() {
  Seylune.remove(Seylune.KEYS.user);
  renderAccount();
  Seylune.toast("You have been signed out.");
}

document.getElementById("signOutBtn").addEventListener("click", signOut);

function renderAccount() {
  const user = getUser();
  const signedIn = !!(user && user.email);

  authSection.hidden = signedIn;
  dashboard.hidden = !signedIn;

  if (signedIn) {
    const name = user.name || user.email.split("@")[0];
    document.getElementById("dashboardTitle").textContent  = `Welcome, ${name.split(" ")[0]}`;
    document.getElementById("dashboardName").textContent   = name;
    document.getElementById("dashboardAvatar").textContent = name.charAt(0).toUpperCase();
    const since = user.memberSince
      ? " · Member since " + new Date(user.memberSince).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
      : "";
    document.getElementById("dashboardEmail").textContent = user.email + since;
    renderOrders(user);
  }

  renderSaved();
}

/* ----- Order history (newest first) ----- */
function renderOrders(user) {
  const all = Seylune.read(Seylune.KEYS.orders, []);
  const orders = all.filter(o => !o.customer || !o.customer.email ||
                                 o.customer.email.toLowerCase() === user.email.toLowerCase());

  document.getElementById("statOrders").textContent = orders.length;
  document.getElementById("ordersEmpty").hidden = orders.length > 0;

  const esc = Seylune.escapeHtml;
  document.getElementById("orderList").innerHTML = orders.map(order => {
    const count = order.items.reduce((sum, i) => sum + i.quantity, 0);
    const date = new Date(order.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return `
      <details class="order-card">
        <summary>
          <span class="order-id">${esc(order.id)}</span>
          <span class="order-date">${date}</span>
          <span class="order-count">${count} item${count === 1 ? "" : "s"}</span>
          <span class="order-status">Processing</span>
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
          to ${esc(order.customer.city)} · ${order.payment === "bank" ? "Bank transfer" : "Cash on delivery"}
        </p>
      </details>`;
  }).join("");
}

/* ----- Saved pieces (wishlist) ----- */
function renderSaved() {
  const saved = Seylune.getWishlist().map(Seylune.getProduct).filter(Boolean);
  const grid = document.getElementById("savedGrid");

  grid.innerHTML = saved.map(p => Seylune.renderProductCard(p)).join("");
  Seylune.addWishlistButtons(grid);

  document.getElementById("savedEmpty").hidden = saved.length > 0;
  document.getElementById("statSaved").textContent = saved.length;
}

// Un-saving a piece here removes its card straight away
document.getElementById("savedGrid").addEventListener("click", e => {
  if (e.target.closest(".wishlist-btn")) setTimeout(renderSaved, 0);
});


/* ============================================================
   INIT
============================================================ */
renderAccount();

/* ============================================================
   SEYLUNE — ABOUT / CONTACT PAGE JAVASCRIPT
   Shared behaviour (menu, cart badge, search) comes
   from shared/seylune.js and shared/site.js.
   Handles:
   1. Contact form validation (frontend only)
   2. Error + success helpers
   3. Live input feedback
   4. Brand video — paused for reduced-motion visitors
============================================================ */


/* ============================================================
   1. CONTACT FORM VALIDATION
   Frontend-only validation:
   - Name required (min 2 chars)
   - Valid email format
   - Message required (min 10 chars)
============================================================ */
const contactForm = document.getElementById("contactForm");

if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // Read inputs
    const nameField    = document.getElementById("name");
    const emailField   = document.getElementById("email");
    const messageField = document.getElementById("message");

    const name    = nameField.value.trim();
    const email   = emailField.value.trim();
    const message = messageField.value.trim();

    // Reset previous errors
    clearErrors();

    let isValid = true;

    // --- Name validation ---
    if (name.length < 2) {
      showError("name", "Please enter your full name.");
      isValid = false;
    }

    // --- Email validation ---
    if (!Seylune.EMAIL_PATTERN.test(email)) {
      showError("email", "Please enter a valid email address.");
      isValid = false;
    }

    // --- Message validation ---
    if (message.length < 10) {
      showError("message", "Message must be at least 10 characters long.");
      isValid = false;
    }

    // Stop if invalid
    if (!isValid) return;

    // Success — show confirmation and reset form
    showSuccess(`Thank you, ${name}. Your message has been received. We'll be in touch shortly.`);
    contactForm.reset();
  });
}


/* ============================================================
   2. ERROR + SUCCESS HELPERS
============================================================ */
function showError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const group = field.closest(".form-group");
  const errorEl = document.getElementById(fieldId + "Error");

  if (group)   group.classList.add("error");
  if (errorEl) errorEl.textContent = message;
}

function clearErrors() {
  document.querySelectorAll(".form-group").forEach(group => {
    group.classList.remove("error");
  });

  document.querySelectorAll(".form-error").forEach(err => {
    err.textContent = "";
  });

  const success = document.getElementById("formSuccess");
  if (success) {
    success.classList.remove("show");
    success.textContent = "";
  }
}

function showSuccess(message) {
  const success = document.getElementById("formSuccess");
  if (!success) return;

  success.textContent = message;
  success.classList.add("show");

  // Auto-hide after 5 seconds
  setTimeout(() => {
    success.classList.remove("show");
    success.textContent = "";
  }, 5000);
}


/* ============================================================
   3. LIVE INPUT FEEDBACK
   When the user starts typing, clear that field's error so
   they aren't yelled at while they're still fixing it.
============================================================ */
["name", "email", "message"].forEach(id => {
  const field = document.getElementById(id);
  if (!field) return;

  field.addEventListener("input", () => {
    const group = field.closest(".form-group");
    const errorEl = document.getElementById(id + "Error");

    if (group)   group.classList.remove("error");
    if (errorEl) errorEl.textContent = "";
  });
});


/* ============================================================
   4. BRAND VIDEO
   Respect the "reduce motion" setting: stop autoplay and
   show the poster image with controls instead.
============================================================ */
const brandVideo = document.querySelector(".about-media video");
if (brandVideo && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  brandVideo.removeAttribute("autoplay");
  brandVideo.pause();
  brandVideo.controls = true;
}

/* ============================================================
   SEYLUNE — HOME PAGE JAVASCRIPT
   Shared behaviour (mobile menu, cart badge, add-to-cart,
   wishlist hearts, search) comes from shared/seylune.js.
   This file only handles:
   1. Newsletter form validation
============================================================ */


/* ============================================================
   1. NEWSLETTER FORM VALIDATION
   Simple email format check, shows success message.
============================================================ */
const newsletterForm = document.getElementById("newsletterForm");
const newsletterMessage = document.getElementById("newsletterMessage");

if (newsletterForm) {
  newsletterForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("newsletterEmail").value.trim();

    if (!Seylune.EMAIL_PATTERN.test(email)) {
      newsletterMessage.textContent = "Please enter a valid email address.";
      newsletterMessage.style.color = "#E08B8B";
      return;
    }

    newsletterMessage.textContent = "Thank you — you're on the list.";
    newsletterMessage.style.color = "var(--gold)";
    newsletterForm.reset();
  });
}

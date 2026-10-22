/* ============================================================
   SEYLUNE ADMIN — THE DOOR, THE TABS, THE START
   Loaded last on the admin page (after admin-kit.js and the
   section files).

   Who may use this page is decided by the DATABASE, not here:
   only accounts listed in the admins table can read every order,
   change orders, products and stock, or read customers and
   messages. For anyone else the same requests return nothing or
   are refused, whatever this script does. Showing or hiding the
   panel is just tidiness.

   1. The door: signed in? on the team? (+ the admin bar)
   2. Tabs: Dashboard / Orders / Products / Stock / Customers / Messages
   3. The counts on the tabs
   4. Start
============================================================ */

(() => {
  const { $, LOW, data, load } = AdminKit;
  const live = typeof SeyluneBackend !== "undefined" && SeyluneBackend.enabled;


  /* ============================================================
     1. THE DOOR
  ============================================================ */
  function closedDoor(title, text, button) {
    $("gateTitle").textContent = title;
    $("gateText").textContent = text;
    $("gateActions").hidden = false;
    if (button) $("gateActions").querySelector("a").textContent = button;
  }

  async function open() {
    if (!live) {
      return closedDoor("The admin page needs the backend", "Connect Supabase (shared/supabase-config.js) to manage the shop.");
    }
    const user = await SeyluneBackend.getUser();
    if (!user) {
      return closedDoor("Please sign in", "Sign in with a Seylune team account to manage the shop.", "Sign In");
    }
    $("adminWho").textContent = user.email;
    $("adminSignOut").hidden = false;
    if (!(await SeyluneBackend.isAdmin())) {
      return closedDoor("This page is for the Seylune team", "You are signed in as a customer. Your orders and details are on your Account page.", "Go to My Account");
    }

    $("adminGate").hidden = true;
    $("adminPanel").hidden = false;
    await load();
  }

  // Signing out of the admin interface returns to the sign-in page
  $("adminSignOut").addEventListener("click", async () => {
    await SeyluneBackend.signOut();
    location.href = "../Account/Account.html";
  });


  /* ============================================================
     2. TABS — arrow keys move between them; the open tab is kept
        in the address (#orders) so a refresh stays on it
  ============================================================ */
  const tabs = Array.from(document.querySelectorAll(".admin-tab"));

  function showTab(tab, focus) {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute("aria-controls")).hidden = !on;
    });
    history.replaceState(null, "", "#" + tab.id.replace("tab-", ""));
    if (focus) tab.focus();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => showTab(tab));
    tab.addEventListener("keydown", e => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      showTab(tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length], true);
    });
  });

  const startTab = tabs.find(t => "#" + t.id.replace("tab-", "") === location.hash);
  if (startTab) showTab(startTab);


  /* ============================================================
     3. THE COUNTS ON THE TABS — what needs attention
  ============================================================ */
  AdminKit.onRender(() => {
    const toShip = data.orders.filter(o => o.status === "processing").length;
    const low = data.stock.filter(s => s.quantity <= LOW).length;
    const unread = data.messages.filter(m => !m.handled).length;
    $("countOrders").textContent = toShip ? toShip : "";
    $("countLow").textContent = low ? low : "";
    $("countMessages").textContent = unread ? unread : "";
  });


  /* ============================================================
     4. START
  ============================================================ */
  open();
})();

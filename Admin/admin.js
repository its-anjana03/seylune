/* ============================================================
   SEYLUNE — ADMIN PAGE JAVASCRIPT (the Seylune team only)

   Who may use this page is decided by the DATABASE, not here:
   only accounts listed in the admins table can read every order,
   change an order's status or change stock. For anyone else the
   same requests return nothing or are refused, whatever this
   script does. Showing or hiding the panel is just tidiness.

   Everything a customer typed (names, addresses, notes) is put
   on the page through escapeHtml(), so a stranger can't slip
   code into the admin page through a checkout field.

   1. The door: signed in? on the team?
   2. Tabs: Orders / Stock
   3. Orders: list, filter, search, move along, cancel
   4. Stock: every size, edit and save
   5. Figures at the top
============================================================ */

const $ = id => document.getElementById(id);
const esc = Seylune.escapeHtml;
const live = typeof SeyluneBackend !== "undefined" && SeyluneBackend.enabled;

let orders = [];
let stock = [];        // [{ product_id, size, quantity }]
const LOW = 3;         // "running low" at 3 or fewer

function message(text, isError) {
  const el = $("adminMessage");
  el.textContent = text;
  el.classList.toggle("error", !!isError);
  clearTimeout(message.timer);
  message.timer = setTimeout(() => { el.textContent = ""; }, 4000);
}


/* ============================================================
   1. THE DOOR
============================================================ */
function closedDoor(title, text) {
  $("gateTitle").textContent = title;
  $("gateText").textContent = text;
  $("gateActions").hidden = false;
}

async function open() {
  if (!live) {
    return closedDoor("The admin page needs the backend", "Connect Supabase (shared/supabase-config.js) to manage orders and stock.");
  }
  const user = await SeyluneBackend.getUser();
  if (!user) {
    return closedDoor("Please sign in", "Sign in with a Seylune team account to manage orders and stock.");
  }
  if (!(await SeyluneBackend.isAdmin())) {
    return closedDoor("This page is for the Seylune team", "Your account isn't on the team list. If it should be, add it in Supabase (see supabase/02-admin-and-profiles.sql).");
  }

  $("adminGate").hidden = true;
  $("adminPanel").hidden = false;
  await Promise.all([loadOrders(), loadStock()]);
}


/* ============================================================
   2. TABS
============================================================ */
const tabs = [$("tabOrders"), $("tabStock")];

function showTab(tab, focus) {
  tabs.forEach(t => {
    const on = t === tab;
    t.setAttribute("aria-selected", on);
    t.tabIndex = on ? 0 : -1;
    $(t.getAttribute("aria-controls")).hidden = !on;
  });
  if (focus) tab.focus();
}

tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => showTab(tab));
  tab.addEventListener("keydown", e => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    showTab(tabs[(i + 1) % 2], true);
  });
});


/* ============================================================
   3. ORDERS
============================================================ */
const STATUS = { processing: "Processing", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };
const NEXT = {                    // what each status can move to
  processing: [["shipped", "Mark as shipped"], ["cancelled", "Cancel order"]],
  shipped:    [["delivered", "Mark as delivered"], ["cancelled", "Cancel order"]],
  delivered:  [],
  cancelled:  []
};
let statusFilter = "all";

async function loadOrders() {
  try {
    orders = await SeyluneBackend.adminOrders();
  } catch (err) {
    message(err.message, true);
  }
  renderOrders();
  renderFigures();
}

function dateText(iso) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function renderOrders() {
  const q = $("orderSearch").value.trim().toLowerCase();
  const shown = orders.filter(o =>
    (statusFilter === "all" || o.status === statusFilter) &&
    (!q || [o.number, o.ship_name, o.email].some(v => (v || "").toLowerCase().includes(q))));

  $("ordersEmpty").hidden = shown.length > 0;
  $("adminOrders").innerHTML = shown.map(o => {
    const count = o.order_items.reduce((n, i) => n + i.quantity, 0);
    return `
      <details class="admin-order" data-number="${esc(o.number)}">
        <summary>
          <span class="ao-number">${esc(o.number)}</span>
          <span class="ao-date">${dateText(o.created_at)}</span>
          <span class="ao-who">${esc(o.ship_name)}<small>${esc(o.email || "")}</small></span>
          <span class="ao-count">${count} piece${count === 1 ? "" : "s"}</span>
          <span class="ao-total">${Seylune.formatPrice(o.total)}</span>
          <span class="status-badge is-${o.status}">${STATUS[o.status]}</span>
        </summary>

        <div class="ao-body">
          <ul class="ao-items">
            ${o.order_items.map(i => {
              const p = Seylune.getProduct(i.product_id);
              return `
                <li>
                  ${p ? `<img src="${Seylune.asset(p.image)}" alt="" />` : `<span class="ao-noimg"></span>`}
                  <a href="${Seylune.productUrl(i.product_id)}">${esc(i.name)}</a>
                  <span>Size ${esc(i.size)} × ${i.quantity}</span>
                  <span>${Seylune.formatPrice(i.unit_price * i.quantity)}</span>
                </li>`;
            }).join("")}
          </ul>

          <dl class="ao-facts">
            <div><dt>Deliver to</dt><dd>${esc(o.ship_name)}<br>${esc(o.ship_address)}<br>${esc(o.ship_city)} ${esc(o.ship_postal)}</dd></div>
            <div><dt>Phone</dt><dd><a href="tel:${esc(o.ship_phone)}">${esc(o.ship_phone)}</a></dd></div>
            <div><dt>Delivery</dt><dd>${o.delivery === "express" ? "Express" : "Standard"} · ${o.shipping === 0 ? "free" : Seylune.formatPrice(o.shipping)}</dd></div>
            <div><dt>Payment</dt><dd>${o.payment === "bank" ? "Bank transfer" : "Cash on delivery"}</dd></div>
            ${o.notes ? `<div class="ao-notes"><dt>Notes</dt><dd>${esc(o.notes)}</dd></div>` : ""}
            ${o.status_updated_at ? `<div><dt>Status changed</dt><dd>${dateText(o.status_updated_at)}</dd></div>` : ""}
          </dl>

          <div class="ao-actions">
            ${NEXT[o.status].length
              ? NEXT[o.status].map(([to, label]) =>
                  `<button type="button" class="btn btn-small ${to === "cancelled" ? "btn-ghost ao-cancel" : "btn-primary"}" data-to="${to}">${label}</button>`).join("")
              : `<p class="ao-final">This order is ${STATUS[o.status].toLowerCase()} and can't be changed.</p>`}
          </div>
        </div>
      </details>`;
  }).join("");
}

$("adminOrders").addEventListener("click", async e => {
  const btn = e.target.closest("[data-to]");
  if (!btn) return;
  const number = btn.closest(".admin-order").dataset.number;
  const to = btn.dataset.to;
  if (to === "cancelled" && !confirm(`Cancel order ${number}? Its pieces go back into stock. This can't be undone.`)) return;

  btn.disabled = true;
  try {
    await SeyluneBackend.setOrderStatus(number, to);
    message(`Order ${number} is now ${STATUS[to].toLowerCase()}.`);
    await Promise.all([loadOrders(), to === "cancelled" ? loadStock() : null]);
    // Keep the order open after the list redraws
    const again = $("adminOrders").querySelector(`[data-number="${CSS.escape(number)}"]`);
    if (again) again.open = true;
  } catch (err) {
    message(err.message, true);
    btn.disabled = false;
  }
});

$("statusChips").addEventListener("click", e => {
  const chip = e.target.closest(".filter-chip");
  if (!chip) return;
  statusFilter = chip.dataset.status;
  $("statusChips").querySelectorAll(".filter-chip").forEach(c => {
    c.classList.toggle("active", c === chip);
    c.setAttribute("aria-pressed", c === chip);
  });
  renderOrders();
});

$("orderSearch").addEventListener("input", renderOrders);


/* ============================================================
   4. STOCK
   Each piece shows its sizes as small number boxes. Change any,
   then Save: only the sizes that changed are sent.
============================================================ */
let stockFilter = "all";

async function loadStock() {
  try {
    stock = await SeyluneBackend.allStock();
  } catch (err) {
    message(err.message, true);
  }
  renderStock();
  renderFigures();
}

function qty(id, size) {
  const row = stock.find(s => s.product_id === id && s.size === size);
  return row ? row.quantity : null;
}

function renderStock() {
  const q = $("stockSearch").value.trim().toLowerCase();
  const pieces = Seylune.products.filter(p => {
    if (q && !(p.name + " " + p.category).toLowerCase().includes(q)) return false;
    if (stockFilter === "low") return p.sizes.some(s => { const n = qty(p.id, s); return n != null && n <= LOW; });
    return true;
  });

  $("stockList").innerHTML = pieces.map(p => `
    <form class="stock-row" data-id="${p.id}" novalidate>
      <img src="${Seylune.asset(p.image)}" alt="" />
      <div class="stock-piece">
        <p class="stock-name">${esc(p.name)}</p>
        <p class="stock-meta">${esc(p.category)} · ${Seylune.formatPrice(p.price)}</p>
      </div>
      <div class="stock-sizes">
        ${p.sizes.map(s => {
          const n = qty(p.id, s);
          const id = `stock-${p.id}-${s}`.replace(/\s+/g, "-");
          return `
            <label class="stock-size${n === 0 ? " is-out" : n != null && n <= LOW ? " is-low" : ""}" for="${id}">
              <span>${esc(s)}</span>
              <input type="number" id="${id}" data-size="${esc(s)}" min="0" max="999" step="1"
                     value="${n == null ? "" : n}" data-was="${n == null ? "" : n}" ${n == null ? "disabled" : ""} />
            </label>`;
        }).join("")}
      </div>
      <button type="submit" class="btn btn-small btn-ghost" disabled>Save</button>
    </form>`).join("") || `<p class="admin-empty">No pieces match.</p>`;
}

// A Save button wakes up only when something in its row changed
$("stockList").addEventListener("input", e => {
  const row = e.target.closest(".stock-row");
  if (!row) return;
  const changed = Array.from(row.querySelectorAll("input")).some(i => i.value !== i.dataset.was);
  row.querySelector("button").disabled = !changed;
});

$("stockList").addEventListener("submit", async e => {
  e.preventDefault();
  const row = e.target;
  const id = row.dataset.id;
  const changed = Array.from(row.querySelectorAll("input")).filter(i => i.value !== i.dataset.was);

  for (const input of changed) {
    const n = Number(input.value);
    if (!Number.isInteger(n) || n < 0 || n > 999) {
      message("Stock must be a whole number from 0 to 999.", true);
      input.focus();
      return;
    }
  }

  const button = row.querySelector("button");
  button.disabled = true;
  button.textContent = "Saving…";
  try {
    for (const input of changed) {
      await SeyluneBackend.setStockCount(id, input.dataset.size, Number(input.value));
    }
    message(`Stock saved for ${Seylune.getProduct(id).name}.`);
    await loadStock();
    SeyluneBackend.loadStock();   // the rest of the site sees the new numbers
  } catch (err) {
    message(err.message, true);
    button.disabled = false;
    button.textContent = "Save";
  }
});

$("stockChips").addEventListener("click", e => {
  const chip = e.target.closest(".filter-chip");
  if (!chip) return;
  stockFilter = chip.dataset.filter;
  $("stockChips").querySelectorAll(".filter-chip").forEach(c => {
    c.classList.toggle("active", c === chip);
    c.setAttribute("aria-pressed", c === chip);
  });
  renderStock();
});

$("stockSearch").addEventListener("input", renderStock);


/* ============================================================
   5. FIGURES
============================================================ */
function renderFigures() {
  const kept = orders.filter(o => o.status !== "cancelled");
  $("statTotal").textContent = orders.length;
  $("statOpen").textContent = orders.filter(o => o.status === "processing").length;
  $("statRevenue").textContent = Seylune.formatPrice(kept.reduce((sum, o) => sum + o.total, 0));
  $("statLow").textContent = stock.filter(s => s.quantity <= LOW).length;
}


/* ============================================================
   START
============================================================ */
open();

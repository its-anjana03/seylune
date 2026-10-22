/* ============================================================
   SEYLUNE ADMIN — ORDERS + STOCK
   Orders: filter by status, search, move an order along
   (processing → shipped → delivered) or cancel it (its pieces go
   back into stock), export the list as a spreadsheet (CSV) and
   print a packing slip for one order.
   Stock: every size of every piece; change a number and Save.
============================================================ */

(() => {
  const { $, esc, LOW, STATUS, data, load, message, dateText, chips, piece, stockOf, downloadCsv, today } = AdminKit;

  /* ============================================================
     ORDERS
  ============================================================ */
  const NEXT = {                    // what each status can move to
    processing: [["shipped", "Mark as shipped"], ["cancelled", "Cancel order"]],
    shipped:    [["delivered", "Mark as delivered"], ["cancelled", "Cancel order"]],
    delivered:  [],
    cancelled:  []
  };
  let statusFilter = "all";

  chips("statusChips", "status", value => { statusFilter = value; renderOrders(); });
  $("orderSearch").addEventListener("input", renderOrders);

  function shownOrders() {
    const q = $("orderSearch").value.trim().toLowerCase();
    return data.orders.filter(o =>
      (statusFilter === "all" || o.status === statusFilter) &&
      (!q || [o.number, o.ship_name, o.email].some(v => (v || "").toLowerCase().includes(q))));
  }

  function renderOrders() {
    const shown = shownOrders();
    $("ordersEmpty").hidden = shown.length > 0;
    $("adminOrders").innerHTML = shown.map(o => {
      const count = o.order_items.reduce((n, i) => n + i.quantity, 0);
      return `
        <details class="admin-order" data-number="${esc(o.number)}">
          <summary>
            <span class="ao-number">${esc(o.number)}</span>
            <span class="ao-date">${dateText(o.created_at, true)}</span>
            <span class="ao-who">${esc(o.ship_name)}<small>${esc(o.email || "")}</small></span>
            <span class="ao-count">${count} piece${count === 1 ? "" : "s"}</span>
            <span class="ao-total">${Seylune.formatPrice(o.total)}</span>
            <span class="status-badge is-${o.status}">${STATUS[o.status]}</span>
          </summary>

          <div class="ao-body">
            <ul class="ao-items">
              ${o.order_items.map(i => {
                const p = piece(i.product_id);
                return `
                  <li>
                    ${p ? `<img src="${Seylune.asset(p.image)}" alt="" />` : `<span class="ao-noimg"></span>`}
                    <a href="${Seylune.productUrl(i.product_id)}" target="_blank" rel="noopener">${esc(i.name)}</a>
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
              ${o.status_updated_at ? `<div><dt>Status changed</dt><dd>${dateText(o.status_updated_at, true)}</dd></div>` : ""}
            </dl>

            <div class="ao-actions">
              ${NEXT[o.status].map(([to, label]) =>
                `<button type="button" class="btn btn-small ${to === "cancelled" ? "btn-ghost ao-cancel" : "btn-primary"}" data-to="${to}">${label}</button>`).join("")}
              ${!NEXT[o.status].length ? `<p class="ao-final">This order is ${STATUS[o.status].toLowerCase()} and can't be changed.</p>` : ""}
              <button type="button" class="text-link ao-slip" data-slip>Print packing slip</button>
            </div>
          </div>
        </details>`;
    }).join("");
  }

  $("adminOrders").addEventListener("click", async e => {
    const slip = e.target.closest("[data-slip]");
    if (slip) { printSlip(slip.closest(".admin-order").dataset.number); return; }

    const btn = e.target.closest("[data-to]");
    if (!btn) return;
    const number = btn.closest(".admin-order").dataset.number;
    const to = btn.dataset.to;
    if (to === "cancelled" && !confirm(`Cancel order ${number}? Its pieces go back into stock. This can't be undone.`)) return;

    btn.disabled = true;
    try {
      await SeyluneBackend.setOrderStatus(number, to);
      message(`Order ${number} is now ${STATUS[to].toLowerCase()}.`);
      await load("orders", "stock");
      const again = $("adminOrders").querySelector(`[data-number="${CSS.escape(number)}"]`);
      if (again) again.open = true;
    } catch (err) {
      message(err.message, true);
      btn.disabled = false;
    }
  });

  /* ----- Export the orders shown as a spreadsheet ----- */
  $("exportOrders").addEventListener("click", () => {
    const rows = [];
    shownOrders().forEach(o => o.order_items.forEach(i => rows.push([
      o.number, dateText(o.created_at, true), STATUS[o.status], o.ship_name, o.email, o.ship_phone,
      o.ship_address, o.ship_city, o.ship_postal, o.delivery, o.payment === "bank" ? "Bank transfer" : "Cash on delivery",
      i.name, i.size, i.quantity, i.unit_price, i.unit_price * i.quantity, o.shipping, o.total, o.notes || ""
    ])));
    if (!rows.length) { message("There are no orders to export.", true); return; }
    downloadCsv(`seylune-orders-${today()}.csv`, [
      "Order", "Placed", "Status", "Name", "Email", "Phone", "Address", "City", "Postal code",
      "Delivery", "Payment", "Piece", "Size", "Quantity", "Unit price", "Line total", "Delivery charge", "Order total", "Notes"
    ], rows);
    message(`${rows.length} line${rows.length === 1 ? "" : "s"} exported.`);
  });

  /* ----- Packing slip: drawn into #printSlip, then the browser prints ----- */
  function printSlip(number) {
    const o = data.orders.find(x => x.number === number);
    if (!o) return;
    $("printSlip").innerHTML = `
      <div class="slip">
        <header class="slip-head">
          <div><p class="slip-brand">SEYLUNE</p><p>Colombo, Sri Lanka · hello@seylune.lk · +94 77 123 4567</p></div>
          <div class="slip-meta"><p class="slip-title">Packing slip</p><p>${esc(o.number)}</p><p>${dateText(o.created_at)}</p></div>
        </header>
        <section class="slip-to">
          <p class="slip-label">Deliver to</p>
          <p><strong>${esc(o.ship_name)}</strong><br>${esc(o.ship_address)}<br>${esc(o.ship_city)} ${esc(o.ship_postal)}<br>${esc(o.ship_phone)}</p>
          <p class="slip-label">Delivery</p>
          <p>${o.delivery === "express" ? "Express (1–2 days)" : "Standard (2–4 days)"} · ${o.payment === "bank" ? "Bank transfer" : "Cash on delivery"}</p>
        </section>
        <table class="slip-table">
          <thead><tr><th>Piece</th><th>Size</th><th>Qty</th><th>Price</th></tr></thead>
          <tbody>${o.order_items.map(i =>
            `<tr><td>${esc(i.name)}</td><td>${esc(i.size)}</td><td>${i.quantity}</td><td>${Seylune.formatPrice(i.unit_price * i.quantity)}</td></tr>`).join("")}</tbody>
          <tfoot>
            <tr><td colspan="3">Delivery</td><td>${o.shipping === 0 ? "Free" : Seylune.formatPrice(o.shipping)}</td></tr>
            <tr><td colspan="3"><strong>Total${o.payment === "cod" ? " to collect" : ""}</strong></td><td><strong>${Seylune.formatPrice(o.total)}</strong></td></tr>
          </tfoot>
        </table>
        ${o.notes ? `<p class="slip-label">Customer notes</p><p>${esc(o.notes)}</p>` : ""}
        <p class="slip-foot">Thank you for choosing Seylune. Easy 7-day returns on unworn pieces with tags attached.</p>
      </div>`;
    window.print();
  }


  /* ============================================================
     STOCK
     Each piece shows its sizes as small number boxes. Change any,
     then Save: only the sizes that changed are sent.
  ============================================================ */
  let stockFilter = "all";

  chips("stockChips", "filter", value => { stockFilter = value; renderStock(); });
  $("stockSearch").addEventListener("input", renderStock);

  function stockPieces() {
    // The admin's product list when there is one (archived pieces too), else the shop's
    return data.products.length ? data.products.map(SeyluneBackend.toPiece) : Seylune.products;
  }

  function renderStock() {
    const q = $("stockSearch").value.trim().toLowerCase();
    const pieces = stockPieces().filter(p => {
      if (q && !(p.name + " " + p.category).toLowerCase().includes(q)) return false;
      if (stockFilter === "low") return p.sizes.some(s => { const n = stockOf(p.id, s); return n != null && n <= LOW; });
      return true;
    });

    $("stockList").innerHTML = pieces.map(p => `
      <form class="stock-row" data-id="${esc(p.id)}" novalidate>
        <img src="${Seylune.asset(p.image)}" alt="" />
        <div class="stock-piece">
          <p class="stock-name">${esc(p.name)}${p.active === false ? ` <span class="tag-archived">Archived</span>` : ""}</p>
          <p class="stock-meta">${esc(p.category)} · ${Seylune.priceHtml(p)}</p>
        </div>
        <div class="stock-sizes">
          ${p.sizes.map(s => {
            const n = stockOf(p.id, s);
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
      if (input.value === "" || !Number.isInteger(n) || n < 0 || n > 999) {
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
      message(`Stock saved for ${(piece(id) || { name: id }).name}.`);
      await load("stock");
      SeyluneBackend.loadStock();   // the rest of the site sees the new numbers
    } catch (err) {
      message(err.message, true);
      button.disabled = false;
      button.textContent = "Save";
    }
  });

  AdminKit.onRender(renderOrders);
  AdminKit.onRender(renderStock);
})();

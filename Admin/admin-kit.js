/* ============================================================
   SEYLUNE ADMIN — THE SHARED KIT
   Loaded first on the admin page. Holds what every section uses:
   the data the team works with, small helpers, and the safe CSV
   export. Each section (admin-dashboard.js, admin-orders.js,
   admin-products.js, admin-people.js) adds a "renderer" here, and
   admin.js opens the door and loads the data.

   Security reminder: everything in this folder only DRAWS what
   the database returns. The database decides who gets data and
   who may change it (Row Level Security, see supabase/*.sql).
   Text typed by customers is always passed through esc() before
   it goes into the page.
============================================================ */

const AdminKit = (() => {
  const $ = id => document.getElementById(id);
  const esc = Seylune.escapeHtml;
  const LOW = 3;   // "running low" at 3 or fewer

  const STATUS = { processing: "Processing", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };

  // Everything the admin page works with, loaded by load()
  const data = { orders: [], stock: [], products: [], customers: [], team: [], messages: [], newsletter: [] };

  const loaders = {
    orders:     () => SeyluneBackend.adminOrders(),
    stock:      () => SeyluneBackend.allStock(),
    products:   () => SeyluneBackend.adminProducts(),
    customers:  () => SeyluneBackend.adminCustomers(),
    team:       () => SeyluneBackend.adminTeam(),
    messages:   () => SeyluneBackend.adminMessages(),
    newsletter: () => SeyluneBackend.adminNewsletter()
  };

  const renderers = [];
  function onRender(fn) { renderers.push(fn); }
  function render() { renderers.forEach(fn => fn()); }

  // Load one or more kinds of data, then redraw every section.
  // A section whose table doesn't exist yet (setup step not run) stays empty.
  async function load(...kinds) {
    const missing = [];
    await Promise.all((kinds.length ? kinds : Object.keys(loaders)).map(async kind => {
      try {
        data[kind] = await loaders[kind]();
      } catch (err) {
        missing.push(kind);
      }
    }));
    render();
    if (missing.length) {
      message(`Couldn't load: ${missing.join(", ")}. Has supabase/03-catalogue-and-shop-tools.sql been run?`, true);
    }
  }

  /* ----- Small helpers ----- */
  function message(text, isError) {
    const el = $("adminMessage");
    el.textContent = text;
    el.classList.toggle("error", !!isError);
    clearTimeout(message.timer);
    message.timer = setTimeout(() => { el.textContent = ""; }, isError ? 7000 : 4000);
  }

  function dateText(iso, withTime) {
    const opts = { day: "numeric", month: "short", year: "numeric" };
    if (withTime) Object.assign(opts, { hour: "2-digit", minute: "2-digit" });
    return new Date(iso).toLocaleString("en-GB", opts);
  }

  // Wire a row of filter chips: one is active at a time
  function chips(groupId, attr, onChange) {
    $(groupId).addEventListener("click", e => {
      const chip = e.target.closest(".filter-chip");
      if (!chip) return;
      $(groupId).querySelectorAll(".filter-chip").forEach(c => {
        c.classList.toggle("active", c === chip);
        c.setAttribute("aria-pressed", c === chip);
      });
      onChange(chip.dataset[attr]);
    });
  }

  // The piece as the admin page knows it (archived pieces too)
  function piece(id) {
    const row = data.products.find(p => p.id === id);
    return row ? SeyluneBackend.toPiece(row) : Seylune.getProduct(id);
  }

  function stockOf(id, size) {
    const row = data.stock.find(s => s.product_id === id && s.size === size);
    return row ? row.quantity : null;
  }

  /* ----- CSV export, made safe for spreadsheets -----
     A spreadsheet treats a cell starting with = + - @ as a formula.
     A customer could type one into a checkout field ("=HYPERLINK(…)")
     and it would run when the file is opened. So any such cell gets a
     leading apostrophe, which makes it plain text. Every cell is also
     quoted, so commas and line breaks stay inside their cell. */
  function csvCell(value) {
    let text = value == null ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function downloadCsv(filename, header, rows) {
    const text = [header, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
    // The byte-order mark helps Excel read "Rs." and Sinhala/Tamil names correctly
    const blob = new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  return { $, esc, LOW, STATUS, data, load, onRender, render, message, dateText, chips, piece, stockOf, downloadCsv, today };
})();

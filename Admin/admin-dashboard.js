/* ============================================================
   SEYLUNE ADMIN — DASHBOARD
   Figures for the chosen period (7 / 30 / 90 days):
   revenue, orders, average order, orders waiting to ship,
   revenue by day (one bar per day, hover or focus for the
   numbers, or open the table), best sellers, orders by status
   and the sizes running out. Cancelled orders never count.
============================================================ */

(() => {
  const { $, esc, LOW, STATUS, data, chips, piece } = AdminKit;
  let days = 30;

  chips("dashRange", "days", value => { days = Number(value); render(); });

  // Midnight today (local time), minus n days
  function dayStart(offset) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - offset);
    return d;
  }

  const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const dayLabel = d => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  function render() {
    const from = dayStart(days - 1);
    const kept = data.orders.filter(o => o.status !== "cancelled" && new Date(o.created_at) >= from);
    const revenue = kept.reduce((sum, o) => sum + o.total, 0);

    $("dashRevenue").textContent = Seylune.formatPrice(revenue);
    $("dashOrders").textContent = kept.length;
    $("dashAverage").textContent = Seylune.formatPrice(kept.length ? Math.round(revenue / kept.length) : 0);
    $("dashToShip").textContent = data.orders.filter(o => o.status === "processing").length;

    renderChart(kept, from);
    renderBest(kept);
    renderStatus();
    renderSizes();
  }

  /* ----- Revenue by day: a single series, so no legend ----- */
  function renderChart(kept, from) {
    const buckets = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      buckets.push({ date: d, key: dayKey(d), revenue: 0, orders: 0 });
    }
    const byKey = Object.fromEntries(buckets.map(b => [b.key, b]));
    kept.forEach(o => {
      const b = byKey[dayKey(new Date(o.created_at))];
      if (b) { b.revenue += o.total; b.orders += 1; }
    });

    const max = Math.max(...buckets.map(b => b.revenue));
    const chart = $("dashChart");

    if (!max) {
      chart.innerHTML = `<p class="admin-empty">No sales in the last ${days} days yet.</p>`;
      $("dashTable").innerHTML = "";
      return;
    }

    const mid = buckets[Math.floor(buckets.length / 2)];
    chart.innerHTML = `
      <div class="chart-plot">
        <span class="chart-max">${Seylune.formatPrice(max)}</span>
        <div class="chart-bars" style="--count:${buckets.length}">
          ${buckets.map(b => `
            <button type="button" class="chart-bar${b.revenue ? "" : " is-empty"}"
                    style="--h:${(b.revenue / max) * 100}%"
                    data-label="${dayLabel(b.date)}" data-revenue="${b.revenue}" data-orders="${b.orders}"
                    aria-label="${dayLabel(b.date)}: ${Seylune.formatPrice(b.revenue)}, ${b.orders} order${b.orders === 1 ? "" : "s"}">
            </button>`).join("")}
        </div>
        <div class="chart-tip" id="chartTip" hidden></div>
      </div>
      <div class="chart-axis">
        <span>${dayLabel(buckets[0].date)}</span>
        <span>${dayLabel(mid.date)}</span>
        <span>${dayLabel(buckets[buckets.length - 1].date)}</span>
      </div>`;

    $("dashTable").innerHTML = `
      <thead><tr><th scope="col">Day</th><th scope="col">Orders</th><th scope="col">Revenue</th></tr></thead>
      <tbody>${buckets.slice().reverse().map(b =>
        `<tr><td>${dayLabel(b.date)}</td><td>${b.orders}</td><td>${Seylune.formatPrice(b.revenue)}</td></tr>`).join("")}</tbody>`;
  }

  // Hover or focus a bar: its numbers appear above it
  function showTip(bar) {
    const tip = $("chartTip");
    if (!tip || !bar) return;
    const n = Number(bar.dataset.orders);
    tip.innerHTML = `<strong>${esc(bar.dataset.label)}</strong>${Seylune.formatPrice(Number(bar.dataset.revenue))}<span>${n} order${n === 1 ? "" : "s"}</span>`;
    tip.hidden = false;
    const plot = bar.closest(".chart-plot").getBoundingClientRect();
    const r = bar.getBoundingClientRect();
    const x = Math.min(Math.max(r.left + r.width / 2 - plot.left, 60), plot.width - 60);
    tip.style.left = x + "px";
  }

  $("dashChart").addEventListener("pointerover", e => showTip(e.target.closest(".chart-bar")));
  $("dashChart").addEventListener("focusin", e => showTip(e.target.closest(".chart-bar")));
  $("dashChart").addEventListener("pointerleave", () => { if ($("chartTip")) $("chartTip").hidden = true; });
  $("dashChart").addEventListener("focusout", () => { if ($("chartTip")) $("chartTip").hidden = true; });

  /* ----- Best sellers in the period ----- */
  function renderBest(kept) {
    const tally = {};
    kept.forEach(o => o.order_items.forEach(i => {
      const t = tally[i.product_id] || (tally[i.product_id] = { id: i.product_id, name: i.name, qty: 0, revenue: 0 });
      t.qty += i.quantity;
      t.revenue += i.unit_price * i.quantity;
    }));
    const top = Object.values(tally).sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, 5);
    const most = top.length ? top[0].qty : 1;

    $("dashBest").innerHTML = top.length ? top.map(t => {
      const p = piece(t.id);
      return `
        <li>
          ${p ? `<img src="${Seylune.asset(p.image)}" alt="" />` : `<span class="ao-noimg"></span>`}
          <span class="best-name">${esc(t.name)}</span>
          <span class="best-bar" aria-hidden="true"><span style="width:${(t.qty / most) * 100}%"></span></span>
          <span class="best-qty">${t.qty} sold · ${Seylune.formatPrice(t.revenue)}</span>
        </li>`;
    }).join("") : `<li class="admin-empty">Nothing sold in this period yet.</li>`;
  }

  /* ----- Orders by status (all time) ----- */
  function renderStatus() {
    $("dashStatus").innerHTML = Object.keys(STATUS).map(s => {
      const n = data.orders.filter(o => o.status === s).length;
      return `<li><span class="status-badge is-${s}">${STATUS[s]}</span><span class="dash-count">${n}</span></li>`;
    }).join("");
  }

  /* ----- Sizes running out (now) ----- */
  function renderSizes() {
    const low = data.stock.filter(s => s.quantity <= LOW)
      .map(s => ({ ...s, p: piece(s.product_id) }))
      .filter(s => s.p && s.p.active !== false)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 8);

    $("dashSizes").innerHTML = low.length ? low.map(s => `
      <li>
        <span class="best-name">${esc(s.p.name)} <small>· ${esc(s.size)}</small></span>
        <span class="dash-left${s.quantity === 0 ? " is-out" : ""}">${s.quantity === 0 ? "Sold out" : s.quantity + " left"}</span>
      </li>`).join("") : `<li class="admin-empty">Every size has more than ${LOW} left.</li>`;
  }

  AdminKit.onRender(render);
})();

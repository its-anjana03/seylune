/* ============================================================
   SEYLUNE ADMIN — CUSTOMERS + MESSAGES
   Customers: every member (from their profile) except the Seylune
   team's own accounts, with how many
   orders they placed, what they spent and when they last ordered.
   Open one to see their orders.
   Messages: what visitors sent through the contact form, and the
   newsletter list. Mark a message done, reply by email, delete;
   export the newsletter list.
============================================================ */

(() => {
  const { $, esc, STATUS, data, load, message, dateText, chips, downloadCsv, today } = AdminKit;

  /* ============================================================
     CUSTOMERS
  ============================================================ */
  $("customerSearch").addEventListener("input", renderCustomers);

  // Team accounts (in the admins list) are not customers
  function customers() {
    const team = new Set(data.team.map(t => t.user_id));
    return data.customers.filter(c => !team.has(c.id)).map(c => {
      const orders = data.orders.filter(o => o.user_id === c.id);
      const kept = orders.filter(o => o.status !== "cancelled");
      return {
        ...c, orders,
        spent: kept.reduce((sum, o) => sum + o.total, 0),
        last: orders.length ? orders[0].created_at : null   // orders arrive newest first
      };
    }).sort((a, b) => b.spent - a.spent || new Date(b.created_at) - new Date(a.created_at));
  }

  function renderCustomers() {
    const q = $("customerSearch").value.trim().toLowerCase();
    const all = customers();
    const list = all.filter(c => !q || [c.full_name, c.email, c.phone].some(v => (v || "").toLowerCase().includes(q)));
    const teamCount = data.customers.length - all.length;
    $("customerCount").textContent = `${all.length} customer${all.length === 1 ? "" : "s"} · ${all.filter(c => c.orders.length).length} have ordered` +
      (teamCount ? ` · ${teamCount} team account${teamCount === 1 ? "" : "s"} not shown` : "");

    $("customerList").innerHTML = list.length ? list.map(c => `
      <details class="customer">
        <summary>
          <span class="cu-avatar" aria-hidden="true">${esc((c.full_name || c.email || "?").charAt(0).toUpperCase())}</span>
          <span class="cu-who">${esc(c.full_name || "No name yet")}<small>${esc(c.email || "")}</small></span>
          <span class="cu-phone">${esc(c.phone || "—")}</span>
          <span class="cu-orders">${c.orders.length} order${c.orders.length === 1 ? "" : "s"}</span>
          <span class="cu-spent">${Seylune.formatPrice(c.spent)}</span>
          <span class="cu-last">${c.last ? "Last " + dateText(c.last) : "Joined " + dateText(c.created_at)}</span>
        </summary>
        <div class="cu-body">
          <p class="admin-note">Member since ${dateText(c.created_at)}${c.city ? " · " + esc(c.city) : ""}${c.email ? ` · <a href="mailto:${esc(c.email)}">Email them</a>` : ""}</p>
          ${c.orders.length ? `
            <ul class="cu-orderlist">
              ${c.orders.map(o => `
                <li>
                  <span class="ao-number">${esc(o.number)}</span>
                  <span>${dateText(o.created_at)}</span>
                  <span>${o.order_items.reduce((n, i) => n + i.quantity, 0)} pieces</span>
                  <span>${Seylune.formatPrice(o.total)}</span>
                  <span class="status-badge is-${o.status}">${STATUS[o.status]}</span>
                </li>`).join("")}
            </ul>` : `<p class="admin-empty">No orders yet.</p>`}
        </div>
      </details>`).join("") : `<p class="admin-empty">No customers match.</p>`;
  }


  /* ============================================================
     MESSAGES + NEWSLETTER
     A message is shown as plain text (escaped, line breaks kept),
     so nothing a visitor typed can run on this page.
  ============================================================ */
  let view = "new";

  chips("messageChips", "filter", value => { view = value; renderMessages(); });

  function renderMessages() {
    $("exportNewsletter").hidden = view !== "newsletter";

    if (view === "newsletter") {
      $("messageList").innerHTML = data.newsletter.length ? `
        <p class="admin-note">${data.newsletter.length} email${data.newsletter.length === 1 ? "" : "s"} on the list.</p>
        <ul class="news-list">
          ${data.newsletter.map(n => `
            <li>
              <span>${esc(n.email)}</span>
              <span>${dateText(n.created_at)}</span>
              <button type="button" class="remove-btn" data-unsubscribe="${esc(n.email)}">Remove</button>
            </li>`).join("")}
        </ul>` : `<p class="admin-empty">Nobody has joined the newsletter yet.</p>`;
      return;
    }

    const list = data.messages.filter(m => view === "all" || (view === "new" ? !m.handled : m.handled));
    $("messageList").innerHTML = list.length ? list.map(m => `
      <article class="message-card${m.handled ? " is-done" : ""}" data-id="${m.id}">
        <header>
          <span class="mc-who">${esc(m.name)}<a href="mailto:${esc(m.email)}?subject=${encodeURIComponent("Re: your message to Seylune")}">${esc(m.email)}</a></span>
          <span class="mc-date">${dateText(m.created_at, true)}</span>
        </header>
        <p class="mc-text">${esc(m.message)}</p>
        <div class="mc-actions">
          <a class="btn btn-small btn-primary" href="mailto:${esc(m.email)}?subject=${encodeURIComponent("Re: your message to Seylune")}">Reply by email</a>
          <button type="button" class="btn btn-small btn-ghost" data-handled="${m.handled ? "false" : "true"}">${m.handled ? "Mark as new" : "Mark done"}</button>
          <button type="button" class="remove-btn" data-delete>Delete</button>
        </div>
      </article>`).join("") : `<p class="admin-empty">${view === "new" ? "No new messages." : "No messages here."}</p>`;
  }

  $("messageList").addEventListener("click", async e => {
    const card = e.target.closest(".message-card");
    const handled = e.target.closest("[data-handled]");
    const del = e.target.closest("[data-delete]");
    const unsub = e.target.closest("[data-unsubscribe]");
    try {
      if (handled && card) {
        await SeyluneBackend.setMessageHandled(Number(card.dataset.id), handled.dataset.handled === "true");
        await load("messages");
      } else if (del && card && confirm("Delete this message? This can't be undone.")) {
        await SeyluneBackend.deleteMessage(Number(card.dataset.id));
        message("Message deleted.");
        await load("messages");
      } else if (unsub && confirm(`Remove ${unsub.dataset.unsubscribe} from the newsletter list?`)) {
        await SeyluneBackend.deleteNewsletter(unsub.dataset.unsubscribe);
        message("Removed from the newsletter list.");
        await load("newsletter");
      }
    } catch (err) {
      message(err.message, true);
    }
  });

  $("exportNewsletter").addEventListener("click", () => {
    if (!data.newsletter.length) return;
    downloadCsv(`seylune-newsletter-${today()}.csv`, ["Email", "Joined"],
      data.newsletter.map(n => [n.email, dateText(n.created_at)]));
  });

  AdminKit.onRender(renderCustomers);
  AdminKit.onRender(renderMessages);
})();

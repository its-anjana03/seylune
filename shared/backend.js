/* ============================================================
   SEYLUNE — THE BACKEND (Supabase)
   Loaded on every page after the supabase-js library and
   shared/supabase-config.js. When the config has no URL (or the
   library failed to load) the store runs in demo mode and the
   pages fall back to localStorage, exactly as before.

   What talks to Supabase, and how it stays safe:
   - Stock: read from product_stock (anyone may read it).
   - Accounts: Supabase Auth. Passwords go straight to Supabase
     over HTTPS; they are hashed there and never touch our code
     or localStorage. The browser keeps only a short-lived
     session token, which supabase-js refreshes by itself.
   - Orders: created ONLY through place_order(), which prices
     every line from the database. Reading orders returns only
     the signed-in customer's own (Row Level Security).
   1. Connect
   2. Stock
   3. Accounts
   4. Orders
============================================================ */

const SeyluneBackend = (() => {

  /* ============================================================
     1. CONNECT
  ============================================================ */
  const config = typeof SEYLUNE_SUPABASE !== "undefined" ? SEYLUNE_SUPABASE : {};
  const enabled = !!(config.url && config.publishableKey && typeof supabase !== "undefined");

  const client = enabled
    ? supabase.createClient(config.url, config.publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  // Turn Supabase's error into a sentence a customer can read
  function friendly(error, fallback) {
    if (!error) return fallback || "Something went wrong. Please try again.";
    const msg = error.message || "";
    if (/Invalid login credentials/i.test(msg)) return "That email and password don't match an account.";
    if (/already registered|already been registered/i.test(msg)) return "An account with this email already exists. Try signing in.";
    if (/Password should be/i.test(msg)) return "Please choose a longer password (at least 8 characters).";
    if (/rate limit|too many/i.test(msg)) return "Too many attempts. Please wait a few minutes and try again.";
    if (/not authorized|Email address not authorized/i.test(msg)) return "Emails can only be sent to the store's team in this demo.";
    if (/Failed to fetch|NetworkError/i.test(msg)) return "The store can't be reached right now. Please check your connection.";
    // Messages written in place_order() are already customer-friendly
    if (error.code && /^(P0001|P0002|22023|28000|53400)$/.test(error.code)) return msg;
    return fallback || msg || "Something went wrong. Please try again.";
  }


  /* ============================================================
     2. STOCK — loaded once per page, then shown everywhere
  ============================================================ */
  async function loadStock() {
    if (!enabled) return;
    const { data, error } = await client.from("product_stock").select("product_id, size, quantity");
    if (!error && data) Seylune.setStock(data);
  }


  /* ============================================================
     3. ACCOUNTS
  ============================================================ */
  async function getUser() {
    if (!enabled) return null;
    const { data } = await client.auth.getSession();
    return data.session ? data.session.user : null;
  }

  function onAuthChange(callback) {
    if (!enabled) return;
    client.auth.onAuthStateChange((event, session) => callback(event, session ? session.user : null));
  }

  async function signUp(name, email, password) {
    const { data, error } = await client.auth.signUp({
      email, password,
      // Shown on the account page. The customer can change it, so it is
      // only ever used for display, never to decide what they may do.
      options: { data: { full_name: name } }
    });
    if (error) throw new Error(friendly(error));
    return data;
  }

  async function signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(friendly(error));
    return data.user;
  }

  async function signOut() {
    await client.auth.signOut();
  }

  async function sendPasswordReset(email) {
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: new URL(Seylune.ROOT + "Account/Account.html", location.href).href
    });
    if (error) throw new Error(friendly(error));
  }

  async function updatePassword(password) {
    const { error } = await client.auth.updateUser({ password });
    if (error) throw new Error(friendly(error));
  }

  function displayName(user) {
    return (user && user.user_metadata && user.user_metadata.full_name) || (user ? user.email.split("@")[0] : "");
  }


  /* ============================================================
     4. ORDERS
  ============================================================ */

  // Sends only ids, sizes and quantities — never prices
  async function placeOrder(cart, delivery, payment, ship) {
    const items = cart.map(i => ({ id: i.id, size: i.size, quantity: i.quantity }));
    const { data, error } = await client.rpc("place_order", {
      p_items: items, p_delivery: delivery, p_payment: payment, p_ship: ship
    });
    if (error) throw new Error(friendly(error, "Your order could not be placed. Please try again."));
    loadStock();   // the pieces just bought are gone from stock
    return data;   // { number, subtotal, shipping, total }
  }

  // The signed-in customer's own orders, newest first (RLS hides the rest)
  async function myOrders() {
    const { data, error } = await client
      .from("orders")
      .select("number, status, delivery, payment, subtotal, shipping, total, ship_city, created_at, order_items (product_id, name, size, unit_price, quantity)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(friendly(error, "Your orders could not be loaded."));
    return data;
  }

  const ready = enabled ? loadStock() : Promise.resolve();

  return {
    enabled, client, ready, friendly,
    loadStock, getUser, onAuthChange, signUp, signIn, signOut,
    sendPasswordReset, updatePassword, displayName,
    placeOrder, myOrders
  };
})();

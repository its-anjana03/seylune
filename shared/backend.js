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
   5. Profile (the member's own details)
   6. Admin (the Seylune team only)
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
     2b. THE CATALOGUE — every piece, from the products table
     Shoppers only receive pieces that are in the shop (active);
     Row Level Security hides archived ones. If the database has no
     details yet (before step 3), the built-in copy in
     shared/products.js stays in use.
  ============================================================ */
  const CATALOGUE_COLUMNS =
    "id, name, category, price, sale_price, color, sizes, is_new, image, gallery, short, description, fabric, care, note, sort_order, active, created_at";

  function toPiece(row) {
    return {
      id: row.id, name: row.name, category: row.category,
      price: row.price, salePrice: row.sale_price || null,
      color: row.color, sizes: row.sizes || [], isNew: !!row.is_new,
      image: row.image, gallery: row.gallery || [],
      short: row.short || "", description: row.description || "",
      fabric: row.fabric || "", care: row.care || "", note: row.note || "",
      sortOrder: row.sort_order, active: row.active
    };
  }

  async function loadCatalogue() {
    if (!enabled) return false;
    const { data, error } = await client.from("products").select(CATALOGUE_COLUMNS)
      .eq("active", true).order("sort_order").order("created_at");
    // A piece without a photo is left out of the shop until it has one
    const pieces = (data || []).filter(r => r.image);
    if (error || !pieces.length) return false;
    Seylune.setCatalogue(pieces.map(toPiece));
    return true;
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

  /* ============================================================
     5. PROFILE — the member's own name, phone and address
     (Row Level Security: only their own row can be read or saved)
  ============================================================ */
  async function getProfile() {
    const user = await getUser();
    if (!user) return null;
    const { data, error } = await client.from("profiles")
      .select("full_name, phone, address, city, postal").eq("id", user.id).maybeSingle();
    if (error) throw new Error(friendly(error, "Your details could not be loaded."));
    return data || {};
  }

  async function saveProfile(fields) {
    const user = await getUser();
    if (!user) throw new Error("Please sign in again.");
    const { error } = await client.from("profiles")
      .upsert({ id: user.id, ...fields, updated_at: new Date().toISOString() });
    if (error) {
      if (error.code === "23514") throw new Error("Please check the highlighted details.");
      throw new Error(friendly(error, "Your details could not be saved."));
    }
    // Keep the name shown at sign-in in step with the profile
    if (fields.full_name) await client.auth.updateUser({ data: { full_name: fields.full_name } });
  }


  /* ============================================================
     6. ADMIN — the Seylune team only
     The page checks the admins table to decide what to show, but the real
     protection is in the database: for anyone else these calls
     return nothing or are refused.
  ============================================================ */
  // The admins table lets each person see only their own row, so this
  // returns a row only for someone who is on the team
  async function isAdmin() {
    if (!enabled) return false;
    const { data, error } = await client.from("admins").select("user_id").maybeSingle();
    return !error && !!data;
  }

  async function adminOrders() {
    const { data, error } = await client
      .from("orders")
      .select("number, user_id, status, email, delivery, payment, subtotal, shipping, total, ship_name, ship_phone, ship_address, ship_city, ship_postal, notes, created_at, status_updated_at, order_items (product_id, name, size, unit_price, quantity)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(friendly(error, "Orders could not be loaded."));
    return data;
  }

  async function setOrderStatus(number, status) {
    const { error } = await client.rpc("admin_set_order_status", { p_number: number, p_status: status });
    if (error) throw new Error(friendly(error, error.message || "The order could not be updated."));
    loadStock();   // cancelling puts pieces back
  }

  async function allStock() {
    const { data, error } = await client.from("product_stock").select("product_id, size, quantity");
    if (error) throw new Error(friendly(error, "Stock could not be loaded."));
    return data;
  }

  async function setStockCount(productId, size, quantity) {
    const { data, error } = await client.from("product_stock")
      .update({ quantity }).eq("product_id", productId).eq("size", size).select("quantity");
    if (error) throw new Error(friendly(error, "Stock could not be saved."));
    // RLS hides rows you may not change: no row back means "not allowed"
    if (!data || !data.length) throw new Error("Only the Seylune team can change stock.");
  }

  /* ----- Products (admin): every piece, archived ones too ----- */
  async function adminProducts() {
    const { data, error } = await client.from("products").select(CATALOGUE_COLUMNS)
      .order("sort_order").order("created_at");
    if (error) throw new Error(friendly(error, "Pieces could not be loaded."));
    return data;
  }

  // Saves one piece. The database checks every value again (price range,
  // sale below price, known category…) and refuses anyone not on the team.
  async function saveProduct(row, isNew) {
    const payload = { ...row, updated_at: new Date().toISOString() };
    const query = isNew
      ? client.from("products").insert(payload).select("id")
      : client.from("products").update(payload).eq("id", row.id).select("id");
    const { data, error } = await query;
    if (error) {
      if (error.code === "23505") throw new Error("A piece with this web address already exists. Change the name or address.");
      if (error.code === "23514") throw new Error("The database refused a value: check the price, sale price, address and text lengths.");
      throw new Error(friendly(error, "The piece could not be saved."));
    }
    if (!data || !data.length) throw new Error("Only the Seylune team can change pieces.");
    // Every size needs a stock row (new sizes start at 0)
    if (row.sizes && row.sizes.length) {
      const rows = row.sizes.map(size => ({ product_id: row.id, size, quantity: 0 }));
      const { error: stockError } = await client.from("product_stock")
        .upsert(rows, { onConflict: "product_id,size", ignoreDuplicates: true });
      if (stockError) throw new Error(friendly(stockError, "The piece was saved, but its sizes could not be added to stock."));
    }
    loadStock();
    loadCatalogue();
  }

  // Uploads a photo to the product-images bucket and returns its public address.
  // The bucket only accepts JPG / PNG / WebP up to 5 MB, and only from admins.
  async function uploadProductImage(blob, productId) {
    const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await client.storage.from("product-images")
      .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
    if (error) throw new Error(friendly(error, "The photo could not be uploaded."));
    return client.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  }

  /* ----- Customers (admin): members' profiles ----- */
  async function adminCustomers() {
    const { data, error } = await client.from("profiles")
      .select("id, full_name, email, phone, city, created_at").order("created_at", { ascending: false });
    if (error) throw new Error(friendly(error, "Customers could not be loaded."));
    return data;
  }

  // The team list (admins see every row once supabase/04-team-list.sql has
  // run; before that, only their own), so team accounts can be left out of
  // the Customers list
  async function adminTeam() {
    const { data, error } = await client.from("admins").select("user_id");
    if (error) throw new Error(friendly(error, "The team list could not be loaded."));
    return data;
  }

  /* ----- Messages + newsletter ----- */
  // Anyone may send — through guarded functions with a per-visitor limit
  async function sendMessage(name, email, message) {
    const { error } = await client.rpc("send_message", { p_name: name, p_email: email, p_message: message });
    if (error) throw new Error(friendly(error, "Your message could not be sent. Please try again."));
  }

  async function joinNewsletter(email) {
    const { error } = await client.rpc("join_newsletter", { p_email: email });
    if (error) throw new Error(friendly(error, "You could not be added to the list. Please try again."));
  }

  // Only the team may read them
  async function adminMessages() {
    const { data, error } = await client.from("messages")
      .select("id, name, email, message, handled, created_at").order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error(friendly(error, "Messages could not be loaded."));
    return data;
  }

  async function setMessageHandled(id, handled) {
    const { data, error } = await client.from("messages").update({ handled }).eq("id", id).select("id");
    if (error || !data || !data.length) throw new Error(friendly(error, "The message could not be updated."));
  }

  async function deleteMessage(id) {
    const { error } = await client.from("messages").delete().eq("id", id);
    if (error) throw new Error(friendly(error, "The message could not be deleted."));
  }

  async function adminNewsletter() {
    const { data, error } = await client.from("newsletter")
      .select("email, created_at").order("created_at", { ascending: false });
    if (error) throw new Error(friendly(error, "The newsletter list could not be loaded."));
    return data;
  }

  async function deleteNewsletter(email) {
    const { error } = await client.from("newsletter").delete().eq("email", email);
    if (error) throw new Error(friendly(error, "The email could not be removed."));
  }

  const ready = enabled ? loadStock() : Promise.resolve();
  const catalogue = enabled ? loadCatalogue().catch(() => false) : Promise.resolve(false);

  return {
    enabled, client, ready, catalogue, friendly, CATALOGUE_COLUMNS, toPiece,
    loadStock, loadCatalogue, getUser, onAuthChange, signUp, signIn, signOut,
    sendPasswordReset, updatePassword, displayName,
    placeOrder, myOrders, getProfile, saveProfile,
    isAdmin, adminOrders, setOrderStatus, allStock, setStockCount,
    adminProducts, saveProduct, uploadProductImage, adminCustomers, adminTeam,
    sendMessage, joinNewsletter, adminMessages, setMessageHandled, deleteMessage,
    adminNewsletter, deleteNewsletter
  };
})();

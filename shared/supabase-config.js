/* ============================================================
   SEYLUNE — SUPABASE CONNECTION
   These two values are PUBLIC by design: anyone can read them in
   the page source. On their own they can only do what the Row
   Level Security rules in supabase/schema.sql allow a visitor or
   a signed-in customer to do.

   Never put the secret key (sb_secret_…) or the database
   password in this file, or anywhere in the site.

   Leave url empty to run the store in demo mode (localStorage).
============================================================ */
const SEYLUNE_SUPABASE = {
  url: "https://tskipnpknxnuhpcgwwxk.supabase.co",
  publishableKey: "sb_publishable_bePJP8XNUlzLaqT783kc3A_l6PhJ59T"
};

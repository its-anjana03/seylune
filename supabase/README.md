# Seylune + Supabase — setup guide

This guide connects Seylune to a real backend: real accounts, real orders saved in a database,
and real stock. The site itself stays a static site on GitHub Pages; the browser talks to
Supabase directly.

## How it fits together (read this first)

```
 Visitor's browser                                   Supabase (your project)
 ┌──────────────────────────┐   HTTPS + public key   ┌──────────────────────────────┐
 │ Seylune pages            │ ─────────────────────▶ │ Auth      (accounts, sessions)│
 │ + supabase-js library    │                        │ Database  (Postgres + RLS)    │
 │ + publishable key        │ ◀───────────────────── │ place_order() function        │
 └──────────────────────────┘                        └──────────────────────────────┘
```

- **Supabase Auth** stores accounts and passwords (hashed: even you can't read them). When
  someone signs in, their browser receives a short-lived **session token** that proves who
  they are on every request.
- **The database** holds the price list, stock and orders.
- **Row Level Security (RLS)** rules inside the database decide what each request may see or
  change. They are the real security of the whole system.

### The two keys — the most important thing in this guide

| Key | Looks like | Where it may go |
|---|---|---|
| **Publishable key** | `sb_publishable_…` | In the website code. It is public by design: anyone can see it in the page source, and that is fine. On its own it can only do what the RLS rules allow a visitor to do. |
| **Secret key** | `sb_secret_…` | **Nowhere near the website.** It skips every RLS rule (full admin power). Never paste it into code, git, a chat or a screenshot. Seylune never needs it. |

Your **database password** (chosen when you create the project) is in the same "never share"
group. Keep it in a password manager; the site doesn't need it either.

### What the rules allow (from `schema.sql`)

| Who | Can | Cannot |
|---|---|---|
| Any visitor | read prices and stock | write anything |
| Signed-in customer | read **their own** orders; place an order through `place_order()` | read anyone else's orders, change a price, change stock, change an order's status |
| `place_order()` | create the order, price it from the database, take pieces out of stock | — it re-checks every field and refuses anything odd |

The browser never sends a price. Even if someone edits the page to say "Rs. 1", the database
looks up the real price itself.

---

## Step 1 — Create the project (you, about 5 minutes)

1. Go to [supabase.com](https://supabase.com) → **Start your project** and sign up (signing in
   with GitHub is easiest).
2. **New project**:
   - Name: `seylune`
   - Database password: click **Generate a password**, then save it in your password manager.
   - Region: **South Asia (Mumbai)** or **Southeast Asia (Singapore)**, the closest to Sri Lanka.
   - Plan: **Free**.
3. Wait a minute or two while it starts.

> Free projects pause after about a week with no activity. If the live site says it can't reach
> the store, open the Supabase dashboard and click **Restore project**.

## Step 2 — Sign-in settings (you)

In the dashboard, open **Authentication**:

1. **Sign In / Providers → Email**: make sure Email is **enabled**.
2. **Confirm email: turn it OFF** for now. Why: Supabase's built-in email service only sends to
   people on your project team (about 2 emails an hour), so portfolio visitors would never get a
   confirmation email and could not finish signing up. With it off, accounts work straight away.
   *Trade-off:* someone could sign up with an email they don't own. For a concept store that is
   acceptable; for a real shop you would add an email provider (for example Resend with your
   forgestudio.web.lk domain) and turn confirmation back on. We can do that later.
3. **Password requirements**: set the minimum length to **8**.
4. **URL Configuration**:
   - Site URL: `https://its-anjana03.github.io/seylune/`
   - Redirect URLs: add `http://localhost:5517/**` and `https://its-anjana03.github.io/seylune/**`

## Step 3 — Create the tables (you, with me)

1. Open **SQL Editor → New query**.
2. Paste the whole of [`schema.sql`](schema.sql) and click **Run**. It should say *Success. No rows returned*.
3. New query again: paste [`seed.sql`](seed.sql) and **Run**. This loads the price list and stock.
4. Check **Table Editor**: you should see `products` (40 rows), `product_stock`, `orders` and
   `order_items`, each with a green **RLS enabled** label.

Read the comments in `schema.sql` as you go: every block says what it does and why.

## Step 4 — Connect the site (you send me two values)

Open **Settings → API Keys** (or the **Connect** button at the top of the dashboard) and send me:

- the **Project URL** (`https://xxxx.supabase.co`)
- the **Publishable key** (`sb_publishable_…`)

Both are public, so it is safe to paste them in our chat. I'll put them in
`shared/supabase-config.js`.

**Do not send** the secret key or the database password.

## Step 5 — Try to break it (together)

Once connected, we test the security from the browser console, the same way an attacker would:

- read someone else's orders → should return nothing
- insert an order directly into `orders` → should be refused
- call `place_order()` with a fake price or a sold-out size → price ignored / order refused
- change a product's price → should be refused
- call `place_order()` while signed out → should be refused

Then you'll have seen with your own eyes that the rules hold.

## Step 6 — The admin team and member profiles

1. SQL Editor → **+ → Create a new snippet** → paste all of
   [`02-admin-and-profiles.sql`](02-admin-and-profiles.sql) → **Run**.
2. Make yourself an admin: in a new snippet, run (with the email you signed up with):

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'your-email@example.com';
   ```
3. Sign in on the site → **Account** shows an **Admin** link → `Admin/admin.html`.

How the admin page is protected: the page itself is public (anyone can open the URL), but the
**database** decides what it returns. Only accounts in `admins` can read every order, change an
order's status (through `admin_set_order_status()`) or change stock. For everyone else the same
requests come back empty or refused. Nobody can add themselves to `admins` from the browser.

Members can edit their own profile (name, phone, address) in **Account → Your Details**; the
database checks the same formats as checkout, and only their own row can be read or changed.

## Step 7 — The catalogue in the database + shop tools

1. New snippet → paste all of [`03-catalogue-and-shop-tools.sql`](03-catalogue-and-shop-tools.sql) → **Run**.
2. New snippet → paste all of [`03-catalogue-content.sql`](03-catalogue-content.sql) → **Run**
   (copies the pieces' descriptions, sizes and photos into the database).

From then on the database is the source of the catalogue: the shop reads pieces, prices and
sale prices from it, and **Admin → Products** adds and edits them. Photos uploaded there go to
the `product-images` Storage bucket (only admins can upload; only JPG / PNG / WebP under 5 MB).
`shared/products.js` stays as the built-in copy the site falls back to if the database can't
be reached.

What else this step adds:

| Part | Who can do what |
|---|---|
| Sale prices | Admins set them; the database refuses a sale price that isn't below the price; checkout charges it |
| Customers | Admins read members' profiles; a member's email in their profile is written only by the database |
| Messages + newsletter | Anyone can *send* (through `send_message()` / `join_newsletter()`, a few per visitor every 10 minutes); only admins can read them |

The Security Advisor will list `send_message` and `join_newsletter` as functions anyone can
call. That is their job (they are the contact form and the newsletter box); each one checks
its input and slows down repeat senders.

## Step 8 — Admins can see the whole team list

Run [`04-team-list.sql`](04-team-list.sql). It lets admins read every row of `admins`, so the
admin page can leave team accounts out of **Customers**. Customers still can't see the list,
and nobody can change it from the browser.

## Step 9 — The Outerwear and Accessories collections

Run [`05-outerwear-and-accessories.sql`](05-outerwear-and-accessories.sql). It adds the 16 new pieces
(with their photos, sizes, descriptions and starting stock) and two more views of the Noira Satin
Dress. Pieces and stock that are already in the database are left as they are, so running it
twice does no harm. It is generated from `shared/products.js` by `make-new-collections.js`.

The photos themselves live in the website (`home/images/products/…`), so the live site shows
them once the code is pushed to GitHub.

## Later: adding products

Once step 7 has run, add pieces on the admin page (**Admin → Products → Add a piece**).
`seed.sql` and `make-seed.js` are only needed for a fresh project; re-running them never
overwrites pieces already in the database.

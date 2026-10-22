# Seylune — Luxury Fashion Frontend

A fictional Sri Lankan-inspired luxury fashion store built with plain **HTML, CSS and JavaScript** for the SLIIT Year 2 Semester 2 *Internet Application Development* (IAD) module, then extended into a fuller portfolio piece.

> Seylune is a concept brand made for a university assignment — not a real business. No payments are taken and no orders are shipped.

**Sey** — a hint of Ceylon · **Lune** — the moon · a calm, moonlit, curated collection.

## Pages

| Page | Path |
| --- | --- |
| Home | `home/home.html` |
| All collections (from the home "Explore Collection" button) | `Collections/collections.html` |
| New Arrivals | `New-Arrivals/new-arrivals.html` |
| Dresses · Tops · Bottoms · Outerwear · Accessories | `Dresses/`, `Tops/`, `Bottoms/`, `Outerwear/`, `Accessories/` |
| Product details (all 40 products) | `Product/product.html?id=…` |
| Search results | `Search/search.html?q=…` |
| Cart | `Cart/cart.html` |
| Checkout + order confirmation | `Checkout/checkout.html` |
| Account (sign in, orders, saved pieces) | `Account/Account.html` |
| About + contact | `About/About.html` |

## Features

- Moonlit theme — night, plum and antique gold with Tenor Sans + Manrope
- Home as six full-screen scenes; every other page is a split "room" where a photograph holds still while the details move
- Liquid WebGL photographs (shared/liquid.js) that melt between pieces and ripple under the cursor
- Full-screen menu with search, and size buttons that add a piece to the cart in one tap
- Shared product catalogue (`shared/products.js`) driving product pages, search, filters and related items
- Filter by size, colour and price, plus sorting, on every category page
- Search with relevance scoring, category chips and sorting
- Cart that keeps sizes separate, size picker, free-delivery progress and delivery cost
- Frontend checkout with validation (Sri Lankan mobile and postal code), order confirmation and order history
- Wishlist hearts on every product, saved to the account page
- Size guide dialog, image gallery and accessible tabs on product pages
- Skip link, keyboard focus styles, live regions and reduced-motion support
- Supabase backend: real accounts (Supabase Auth), orders priced and stock-checked by a database function, live per-size stock, all protected by Row Level Security — see `supabase/README.md`
- Bag drawer, quick view, full-screen zoom, "complete the look" and recently viewed
- Demo mode: with no Supabase config the store falls back to `localStorage`
- Fast loading: compressed photos and video, and each moving photograph loads only the picture it is about to show
- Link previews (Open Graph) and canonical addresses on every page, product structured data for Google, `sitemap.xml` (built by `tools/make-sitemap.js`) and a `404.html` that forwards old addresses

## Run locally

Open `index.html` in a browser, or serve the folder with any static server, for example:

```bash
npx serve .
```

## Structure

```
shared/      products.js (catalogue) · seylune.js (cart, search, filters, stock) · backend.js + supabase-config.js (Supabase) · site.css · site.js (menu, rooms, page motion) · liquid.js (WebGL photographs) · vendor/gsap.min.js
supabase/    schema.sql (tables, security rules, place_order) · seed.sql · setup guide
home/        home page (scenes.css, home.js) + all images and video
Product/     single product template
Search/      search results
Checkout/    checkout
...          one folder per remaining page (HTML + CSS + JS)
```

## Credits

Design, structure and build by **Thinura Anjana** ([FORGE Studio](https://forgestudio.web.lk)).
Code iteration assisted by Claude; model imagery generated with Gemini and Nano Banana.

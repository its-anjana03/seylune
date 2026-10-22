# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Two audiences, in this order:

1. **Portfolio visitors** — prospective clients, recruiters and other designers arriving from the Seylune case study on forgestudio.web.lk (Case 03). They judge frontend craft, art direction and attention to detail, usually within the first viewport, on desktop and phone.
2. **The imagined shopper** — a modern Sri Lankan woman browsing evening and occasion wear. The store must behave like a real one for her: browse, filter, inspect a piece, pick a size, add to bag, check out.

The site began as SLIIT Year 2 Semester 2 IAD coursework. That assessment is finished; academic marking criteria no longer constrain the work.

## Product Purpose
Seylune is a fictional luxury fashion store, a concept brand, built as a fully working static frontend. It exists to show, as a public portfolio piece, that its author can art-direct and build a complete, believable commerce experience end to end. Success means a visitor who opens the live demo believes in the brand within seconds and finds every flow actually works.

## Positioning
A Sri Lankan-rooted luxury label: **Sey** (a hint of Ceylon) + **Lune** (the moon) — "a calm, moonlit, curated collection." Luxury for the modern muse. Unlike a template store, every product, flow and edge case is authored and working without a backend.

## Operating Context
- Hosted on GitHub Pages (its-anjana03/seylune, branch main; live at its-anjana03.github.io/seylune/). Linked from the FORGE Studio portfolio case study.
- Static site: plain HTML, CSS and JavaScript, no build step. Every page sits one folder deep; `index.html` at the root redirects to `home/home.html`.
- All state (cart, wishlist, account, orders) lives in `localStorage`.

## Capabilities and Constraints
- Pages: Home, New Arrivals, Dresses, Tops, Bottoms, Outerwear, Accessories, Product details (`Product/product.html?id=…`, 40 products), Search, Cart, Checkout + order confirmation, Account (sign in, orders, saved pieces), About + contact.
- Shared catalogue in `shared/products.js`; shared behaviour in `shared/seylune.js` (cart, search, filters, wishlist, toast) and `shared/site.js` (menu, rooms, page motion).
- Filters by size, colour and price plus sorting; search with relevance scoring; cart keeps sizes separate with free-delivery progress; checkout validates Sri Lankan mobile numbers and postal codes; size guide dialog; product gallery and details.
- Currency: Sri Lankan rupees (Rs.). Free islandwide delivery over Rs. 10,000; easy 7-day returns.
- No real payments, accounts or shipping. The site must say it is a concept brand where that matters (footer, checkout).
- Folder names with typos (`New arrivals/new-arriavals.html`, `Prodcut Details-…`) are live URLs; renaming them is a separate decision.

## Brand Commitments
- Name and wordmark: SEYLUNE. Tagline: "Luxury for the modern muse." Hero line: "Luxury in Every Line."
- Keep the original palette: night, plum, deep, cream, mist and antique gold (user, 2026-10-21, reversing an earlier "free to change").
- It must read as a luxury fashion house, never as the author's FORGE Studio portfolio: no stacked scroll landing page, scroll-pinned set pieces, smooth-scroll libraries, circle reveals, page-wipe transitions, serif-italic headlines or outline footer wordmarks (user, 2026-10-21).
- References the user named: Saint Laurent / Celine, The Row / Toteme, Jacquemus / Loewe, Zimmermann / Khaite. Motion: a luxury, animated feel that can stop a scroll (full-screen scenes, liquid WebGL photographs), but never noisy (user, 2026-10-21).
- Product names, prices and descriptions stay as written; other copy may be reworked within the redesign (user gave full creative control, 2026-10-21).
- Existing photography stays (see Evidence). No new imagery is planned.
- Author credit: design and build by Thinura Anjana (FORGE Studio).

## Evidence on Hand
- Model and product photography (AI-generated with Gemini / Nano Banana) in `home/images/` and `home/images/products/<category>/`, plus a three-image gallery for the Noira Satin Dress in `Prodcut Details-Noira Satin Dress/`.
- Brand video: `home/Videos/About-brand.mp4`. Logo: `home/images/Logo.png`. Story image: `home/images/story-home.jpg`.
- 40 products (five collections of 8) with names, prices, colours, sizes, fabric and care notes.
- There are no real customers, reviews, press, stockists or sales figures. Never invent testimonials, ratings, review counts or press quotes.

## Product Principles
1. **It must work, not just look right.** Every flow (filter, size, bag, checkout, account) stays functional through any redesign.
2. **The clothes lead.** Photography and product are the hero; interface recedes around them.
3. **Calm over clamour.** Moonlit, unhurried, curated — no sale-banner urgency, no fake scarcity.
4. **Honest concept.** A believable brand that never pretends to be a real business taking real money.

## Accessibility & Inclusion
Keep what exists and do not regress: skip link, visible keyboard focus, live regions for cart/toasts, accessible tabs, details and dialog, reduced-motion support, and every page usable with JavaScript animations disabled.

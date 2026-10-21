---
name: Seylune
description: Luxury for the modern muse — a moonlit fashion house built as rooms that hold still while the clothes move.
colors:
  night: "#151116"
  plum: "#221A24"
  deep: "#0F0D10"
  cream: "#F4EEE8"
  mist: "#B9A8AE"
  antique-gold: "#C6A36B"
  gold-glow: "#D7B980"
  rose-error: "#E59A9A"
  hairline: "rgba(244, 238, 232, 0.14)"
  hairline-strong: "rgba(244, 238, 232, 0.3)"
  hairline-gold: "rgba(198, 163, 107, 0.45)"
typography:
  display:
    fontFamily: "Tenor Sans, Futura, sans-serif"
    fontSize: "clamp(2.4rem, min(5.4vw, 9vh), 5.6rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.02em"
  headline:
    fontFamily: "Tenor Sans, Futura, sans-serif"
    fontSize: "clamp(1.25rem, min(2vw, 4.4vh), 2.2rem)"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "0.02em"
  title:
    fontFamily: "Tenor Sans, Futura, sans-serif"
    fontSize: "clamp(1.5rem, 2.4vw, 2.1rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "0.04em"
  body:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.26em"
  kicker:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 500
    letterSpacing: "0.32em"
rounded:
  none: "0px"
  pill: "999px"
  circle: "50%"
spacing:
  pad: "clamp(1.25rem, 3.4vw, 3.5rem)"
  gap-y: "clamp(1rem, 4.5vh, 3rem)"
  nav-desktop: "76px"
  nav-phone: "60px"
components:
  button-primary:
    backgroundColor: "{colors.antique-gold}"
    textColor: "{colors.deep}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 2rem"
    height: "50px"
  button-primary-hover:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.deep}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.cream}"
    rounded: "{rounded.none}"
    padding: "0 2rem"
    height: "50px"
  button-ghost-hover:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.deep}"
  size-pill:
    backgroundColor: "transparent"
    textColor: "{colors.cream}"
    rounded: "{rounded.circle}"
    size: "46px"
  size-pill-added:
    backgroundColor: "{colors.antique-gold}"
    textColor: "{colors.deep}"
  filter-chip-active:
    backgroundColor: "{colors.antique-gold}"
    textColor: "{colors.deep}"
    rounded: "{rounded.none}"
    height: "34px"
  cart-badge:
    backgroundColor: "{colors.antique-gold}"
    textColor: "{colors.deep}"
    rounded: "{rounded.pill}"
    size: "18px"
  summary-panel:
    backgroundColor: "{colors.plum}"
    textColor: "{colors.cream}"
    padding: "{spacing.pad}"
---

# Design System: Seylune

## Overview

**Creative North Star: "The Moonlit House"**

Seylune is a house you walk through after dark. Home is its entrance hall: six full-screen scenes that dissolve into one another, one flick of the wheel per scene, never a stacked scrolling page. Every other page is a room. One half of the room holds still (a photograph, the brand film, or the order summary) while the other half moves with the visitor. The clothes are always the light source; the interface is the dusk around them.

Motion is a material, not decoration. Photographs live on a single WebGL plane that melts from one piece to the next through a soft noise displacement and ripples like silk under the cursor. Words rise into place, scenes zoom-dissolve, and pages fade into the night before the next one arrives. All of it stops for reduced-motion visitors, and every flow still works without it.

The house deliberately does not look like the author's FORGE Studio portfolio. There is no stacked scroll landing page, no pinned horizontal rails, no circle reveals or page wipes, no smooth-scroll library, no serif-italic headlines and no outline footer wordmark.

**Key Characteristics:**
- Original moonlit palette: night, plum and deep grounds, cream type, antique gold as the only accent.
- Tenor Sans set uppercase and tracked for every name and title; Manrope for reading and controls.
- A barless corner header and a full-screen menu room instead of a navigation bar.
- Split "rooms": a sticky still half beside a moving half.
- Liquid WebGL photographs with an `<img>` fallback.
- Sharp corners everywhere; circles only for sizes and round controls.

## Colors

A night-time palette: three near-black grounds, one warm cream for type, one muted mauve for reading, and antique gold used sparingly as the house's single voice.

### Primary
- **Antique Gold** (antique-gold): the house's one accent. Primary buttons, kickers, prices, the active filter chip, the cart badge, focus rings, the free-delivery bar and the dot that marks the current page in the menu.
- **Gold Glow** (gold-glow): a lighter gold for the middle step of the password-strength meter only.

### Neutral
- **Night** (night): the ground of every room's moving half and of the scenes.
- **Plum** (plum): the summary panel in cart and checkout, image placeholders, the toast and dialogs. It is the "furniture" colour.
- **Deep** (deep): page background, the menu room, footer and still rooms (empty cart, order confirmed, not found).
- **Cream** (cream): all primary text and the ghost button's hover fill.
- **Mist** (mist): secondary text, labels and inactive tabs.
- **Hairlines** (hairline, hairline-strong, hairline-gold): one-pixel dividers, field underlines and outline controls. Gold hairlines sit under text links and the search field.
- **Rose Error** (rose-error): field errors and destructive hover (Remove) only.

### Named Rules
**The One Voice Rule.** Antique gold is the only accent. It marks what is chosen, what costs money, or what to do next, and nothing else.

**The Dusk Rule.** Text over photographs is protected by a gradient from deep (0.85–0.92 alpha) to transparent, never by a box or a blur.

## Typography

**Display Font:** Tenor Sans (with Futura, sans-serif)
**Body Font:** Manrope (with system-ui, sans-serif)

**Character:** Tenor Sans gives the house its engraved, couture voice: wide, calm capitals that feel like a label sewn into a garment. Manrope keeps reading and controls modern and quiet.

### Hierarchy
- **Display** (400, `clamp(2.4rem, min(5.4vw, 9vh), 5.6rem)`, line-height 1): page titles in each room, scene titles on Home, the search field as you type. Always uppercase. Sizes read the screen height too, so nothing slides under the header on short laptops.
- **Headline** (400, `clamp(1.25rem, min(2vw, 4.4vh), 2.2rem)`, 1.08): piece names in the collection and search index, dim (cream at 36%) until pointed at.
- **Title** (400, `clamp(1.5rem, 2.4vw, 2.1rem)`): section heads ("My Orders", "More Dresses"), plate names and cart line names.
- **Body** (400, 16px, 1.6): descriptions and ledes in mist, usually capped at 30–32rem.
- **Label** (600, 0.62–0.7rem, tracking 0.22–0.26em, uppercase): buttons, header words, form labels, filters and the trail.
- **Kicker** (500, 0.7rem, tracking 0.32em, uppercase, gold): the small line that names a page or section above its title.

### Named Rules
**The Engraved Rule.** Tenor Sans is always uppercase and slightly tracked, and never bold or italic. Hierarchy comes from size and brightness, not weight.

**The Two Voices Rule.** Only two families. Prices use Tenor Sans tracked at 0.06em; numbers are never set in a third face.

## Layout

The page is a room: a two-column grid (`.room`) with one sticky half that is exactly one screen tall (100svh) and one half that flows. Collections and search put the names on the left and the photograph on the right. Product, account and about put the photograph or film on the left. Cart and checkout use a wider list or form (1.35fr) beside a sticky plum summary (0.65fr, at least 22rem).

Home is not a page but six layered scenes. GSAP zoom-dissolves between them: the outgoing scene scales to 0.96, the incoming one settles from 1.05 with expo-out. One wheel gesture (a run of events with gaps of 180ms or less) moves one scene. Touch swipe, keys and #hash links also move scenes.

Spacing is fluid and reads the screen height: side gutter `pad`, vertical breathing room `gap-y`, and every page keeps a header clear zone (76px on desktop, 60px on phones) so text never sits under the corner words.

At 960px and below the ledger rooms stack, and the menu room drops its photograph. At 860px and below every room stacks: the still half becomes a 68–78svh block above the content, or disappears on collections and search. The index turns into a two-column lookbook of 3:4 photographs, and the header hides the Search word (search lives in the menu). Short desktop screens (760px and 620px tall or less) drop optional lines first.

### Named Rules
**The Still Half Rule.** Every inner page has exactly one thing that holds still. Never two sticky halves, and never a sticky element inside the moving half.

## Elevation & Depth

The house is flat. Depth comes from tonal layering (deep under night under plum), from photographs, and from the dusk gradients that sit over them. Shadows appear only on things that float above the room.

### Shadow Vocabulary
- **Toast float** (`box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5)`): the cart and saved-piece message, the only shadow in the system.

### Named Rules
**The Lamplight Rule.** Light comes from the photograph or from a soft radial glow of plum (`rgba(34, 26, 36, 0.9–0.95)`) in a still room. It never comes from a drop shadow under a card.

## Shapes

Square-cut, like a tailored hem: buttons, fields, chips, panels, dialogs and photographs all have 0px corners. Circles are reserved for three things: size buttons (46px; 42px on the plate, 36px on cards), round arrow controls (50px) and the heart. The cart and filter counts are the only pills. Field outlines are a single bottom hairline, never a box. Unavailable sizes are struck through with a diagonal hairline.

## Components

### Buttons
- **Shape:** square-cut (0px), 50px tall (40px small), uppercase label tracked 0.26em.
- **Primary:** antique gold with deep text. On hover it turns cream.
- **Ghost / Outline:** transparent with a 1px cream border at 40%. On hover it fills cream with deep text.
- **Text link:** uppercase label over a gold hairline, which turns fully gold on hover.
- **Size pill:** a 46px circle with a 30% cream hairline. On hover the outline and text turn gold; when added or selected it fills gold. A size pill *is* the add-to-cart action: one tap adds that size.

### Chips
- **Style:** square, 34px, 1px hairline, small Manrope text.
- **State:** the active chip fills gold with deep text; hover turns the outline and text gold.

### Cards / Containers
- **Product card:** a 3:4 photograph on plum that scales to 1.04 on hover, then category label, Tenor name and gold price. Size pills rise over the photo on hover and sit beneath it on touch screens. The heart is a 40px circle top-right.
- **Summary panel:** plum with a faint gold radial at the top. Rows are separated by hairlines, the total is in large Tenor, and a one-pixel delivery track fills with a gold bar.
- **Still room:** a centred, full-height deep room with the crescent mark, kicker, display title, lede and up to two buttons. Used for empty, confirmed and not-found states.

### Inputs / Fields
- **Style:** transparent, a bottom hairline (cream at 30%) and an uppercase tracked label above in mist.
- **Focus:** the underline turns gold; keyboard focus elsewhere is a 1px gold outline offset 4px.
- **Error:** the underline and message turn rose.
- **Choices:** radio rows are square bordered rows; the checked row gets a gold border and a 6% gold wash.

### Navigation
- **Corner header:** no bar. The crescent mark and SEYLUNE (Tenor, tracked 0.44em) sit top-left; "Search · Cart · Menu" sit top-right in small tracked labels, each drawing a gold underline on hover. A deep dusk gradient behind them keeps them legible.
- **Menu room:** a full-screen deep room revealed by a top-down clip. Large dim Tenor names on the left brighten and shift right when pointed at, each with a gold note. A liquid photograph on the right melts per name. Search and contact sit at the foot. Esc or Close returns you to the page.

### The Index (signature)
Collections and search list the pieces as numbered rows (01, 02, …): name in dim Tenor, price at the right. Pointing at or focusing a row melts the photograph in the still half into that piece. A plate over the photo carries the category, colour swatch, name, gold price, heart, "View piece" and one-tap size pills. Filtering or sorting reorders the rows and the photograph follows the first piece still shown.

### Liquid Photograph (signature)
One WebGL plane per box (`shared/liquid.js`). `show(i)` melts the current image into image *i* through fbm simplex displacement, with a breath of colour separation. The cursor leaves a soft ripple. The plane draws only while something moves, falls back to plain `<img>` elements without WebGL or with reduced motion, and frames each image with a cover crop anchored on a focus point (usually the face, at y ≈ 0.06–0.12).

## Do's and Don'ts

### Do:
- **Do** give every new inner page one still half (a photograph, film or summary) and one moving half.
- **Do** set every name and title in uppercase Tenor Sans and let brightness (36% → 100% cream) carry the active state.
- **Do** use antique gold only for the chosen, the priced and the next step.
- **Do** put photographs on a liquid box with a focus point on the face, and keep the `<img>` fallback.
- **Do** size type and spacing from the screen height as well as its width (`min(vw, vh)` clamps) so nothing hides under the header.
- **Do** keep every flow working with JavaScript motion off and with reduced motion on.

### Don't:
- **Don't** build a stacked, scrolling landing page or anything that reads as the FORGE portfolio: pinned rails, circle reveals, page wipes, Lenis, serif-italic headlines or an outline footer wordmark.
- **Don't** add a navigation bar, a glass capsule or an announcement bar across the photographs.
- **Don't** round corners on buttons, fields, cards or panels.
- **Don't** introduce a second accent colour or a third typeface.
- **Don't** use drop shadows under cards; depth comes from tone and photographs.
- **Don't** blur text panels over images; protect text with the deep dusk gradient.

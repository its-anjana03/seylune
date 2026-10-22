# Seylune — photo prompts for the new pieces

Generate these in Gemini / Nano Banana, the same way the current catalogue was made.
Every photo must look like it came from the same shoot as the existing 24 pieces.

## How to get matching photos

1. **Upload a reference first.** Start each chat by uploading two current photos as style references:
   `home/images/products/Dresses/noira-satin-dress.jpg` (full length) and
   `home/images/products/Tops/elara-drape-top.jpg` (knee-up). Say: *"Match the studio,
   lighting, model and framing of these reference photos exactly."*
2. **Paste the house style block** (below) before every product prompt.
3. **Portrait 3:4.** Ask for 3:4 portrait, at least 896 × 1200 px (1792 × 2400 is better: the zoom view uses it).
4. **No text, no logos, no watermark** in the image.
5. **Save as JPG** with the exact file name given, into the folder given. Keep each file under ~700 KB
   (if Gemini gives a huge PNG, tell me and I will convert it).

### House style block (paste before every prompt)

> Fashion e-commerce studio photograph, 3:4 portrait. Seamless dusty-mauve studio backdrop
> (muted rose-taupe, #8A7480 to #6E5C66) with a soft floor line, soft even key light from the
> front-left, gentle shadow, no harsh contrast. The same Sri Lankan woman model in her late 20s:
> warm brown skin, dark hair in a sleek low bun with a centre parting, small gold earrings,
> calm neutral expression, natural minimal make-up. Elegant, quiet luxury, editorial but
> commercial. Sharp focus on the garment fabric. No text, no logo, no watermark.

## View types

- **Main** (`<id>.jpg`): front view. Full length head-to-toe for dresses, coats and trousers;
  head to mid-thigh for tops and jackets. Model centred, a little space above the head.
- **View 2** (`<id>-2.jpg`): back or three-quarter back view, same framing.
- **View 3** (`<id>-3.jpg`): close-up detail of fabric, neckline, buttons or clasp (still the same
  backdrop and light), filling most of the frame.

Main is required. Views 2 and 3 are for the new full-screen zoom gallery; add them when you can.

---

> **Done (22 Oct 2026):** all 16 Outerwear and Accessories pieces are in the store, with three
> views each. The photos were converted to JPG (`<id>.jpg`, `<id>-2.jpg` back/side, `<id>-3.jpg`
> close-up); the original PNGs are kept outside the repo in `../Seylune photo originals/`.

## Home page backgrounds for the two new collections

The home page's "Shop by Category" scene shows a wide photograph (1744 × 608 px) behind each
name. For Outerwear and Accessories (`home/images/scenes/outerwear.jpg`, `accessories.jpg`) the
model was cut out of her product photo (Isra velvet jacket, Crescent clutch) and placed in the same
wood-panelled room as Tops, so all five match. To replace them with generated shots instead,
upload `home/images/Bottoms.jpg` as the reference, ask for the same room with the model on the
right third, and save over those two files.

## New collection: Outerwear (8 pieces)

Folder: `home/images/products/Outerwear/` · sizes XS–XL

| # | File (`<id>`) | Piece | Prompt (after the house style block) |
|---|---|---|---|
| 1 | `lunaire-long-wool-coat` | Lunaire Long Wool Coat — taupe — Rs. 15,900 | Full-length shot. She wears a long, softly tailored taupe wool coat that falls below the knee, notched lapels, worn open over a black fine-knit top and slim black trousers, hands relaxed. |
| 2 | `noor-tailored-blazer` | Noor Tailored Blazer — black — Rs. 11,500 | Head to mid-thigh. A sharply tailored single-breasted black blazer with peak lapels and one gold button, worn closed over an ivory silk camisole. |
| 3 | `selene-satin-trench` | Selene Satin Trench — ivory — Rs. 13,800 | Full-length. A fluid ivory satin trench coat, belted loosely at the waist, wide collar, soft sheen, over a black slip dress. |
| 4 | `cyra-cropped-jacket` | Cyra Cropped Jacket — plum — Rs. 9,900 | Head to mid-thigh. A cropped, boxy plum wool-blend jacket with a round collarless neckline and covered buttons, over high-waisted black trousers. |
| 5 | `mahi-belted-wrap-coat` | Mahi Belted Wrap Coat — brown — Rs. 14,600 | Full-length. A deep brown wrap coat with a self-tie belt, shawl collar and soft drape, worn over a cream knit. |
| 6 | `isra-velvet-evening-jacket` | Isra Velvet Evening Jacket — emerald — Rs. 12,400 | Head to mid-thigh. An emerald silk-velvet evening jacket with a slim shawl lapel and gentle sheen, worn over a black silk top. |
| 7 | `vela-linen-overshirt` | Vela Linen Overshirt — navy — Rs. 8,900 | Head to mid-thigh. A relaxed navy linen overshirt jacket with patch pockets, sleeves softly pushed up, over an ivory tank and black trousers. |
| 8 | `orla-cape-blazer` | Orla Cape Blazer — burgundy — Rs. 13,200 | Full-length. A burgundy cape blazer that drapes over the shoulders with a structured front and a single button, over slim black trousers. |

## New collection: Accessories (8 pieces)

Folder: `home/images/products/Accessories/` · one size

For accessories, the main photo shows the model wearing or holding the piece (head to waist,
the piece clearly visible); view 2 is the piece alone on the same mauve backdrop, softly lit;
view 3 is a close-up of its texture or clasp.

| # | File (`<id>`) | Piece | Prompt (after the house style block) |
|---|---|---|---|
| 1 | `crescent-satin-clutch` | Crescent Satin Clutch — gold — Rs. 6,800 | Head to waist. She holds a small crescent-moon-shaped clutch in champagne-gold satin with a slim gold frame, wearing a black column dress. |
| 2 | `lune-pearl-drop-earrings` | Lune Pearl Drop Earrings — ivory — Rs. 4,200 | Shoulders-up close portrait, head slightly turned. She wears long pearl drop earrings on fine gold chains; black high neckline. |
| 3 | `sey-silk-scarf` | Sey Silk Scarf — print — Rs. 3,900 | Head to waist. A silk square scarf in a deep blue, gold and burgundy abstract print, tied loosely at her neck over an ivory blouse. |
| 4 | `noira-leather-tote` | Noira Leather Tote — black — Rs. 12,800 | Head to mid-thigh. She carries a structured black leather tote with slim handles and minimal gold hardware on her forearm, wearing a taupe coat. |
| 5 | `aurelle-beaded-evening-bag` | Aurelle Beaded Evening Bag — burgundy — Rs. 7,600 | Head to waist. She holds a small burgundy evening bag covered in fine glass beads with a short chain, wearing a black satin dress. |
| 6 | `celeste-gold-cuff` | Celeste Gold Cuff — gold — Rs. 5,400 | Waist-up, one hand resting at her collarbone to show a wide, softly hammered gold cuff bracelet; black long-sleeve top pushed to the forearm. |
| 7 | `mira-leather-belt` | Mira Leather Belt — brown — Rs. 3,600 | Hips-to-chest crop. A slim brown leather belt with an oval gold buckle, worn at the waist over a cream shirt tucked into charcoal trousers. |
| 8 | `elara-silk-hair-bow` | Elara Silk Hair Bow — plum — Rs. 2,900 | Back three-quarter view of her head and shoulders: a plum silk bow tied at the base of her low bun, long ribbon tails. |

---

## Optional: more views of the existing 24 pieces

For the zoom gallery. Same folder and name as each existing photo, with `-2` (back view) and
`-3` (detail) added, e.g. `home/images/products/Dresses/aurelle-evening-dress-2.jpg`.
Prompt: *"Same model, same outfit as the attached photo, same studio. [Back view, same framing.
| Close-up detail of the fabric and neckline.]"* and attach the existing photo.
Do the dresses first; they gain the most.

When you have a batch ready, tell me and I will add them to the store.

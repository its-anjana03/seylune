/* ============================================================
   SEYLUNE — PRODUCT CATALOGUE
   One shared list of every product in the store.
   Used by: product details page, search results, filters,
   related products, wishlist and account pages.

   Image paths are written relative to the site root
   (e.g. "home/images/...") and prefixed with "../" by
   Seylune.asset() because every page sits one folder deep.
============================================================ */

const SEYLUNE_PRODUCTS = [

  /* ---------------- DRESSES ---------------- */
  {
    id: "noira-satin-dress",
    name: "Noira Satin Dress",
    category: "Dresses",
    price: 8950,
    color: "black",
    sizes: ["XS", "S", "M", "L"],
    isNew: true,
    image: "home/images/products/Dresses/noira-satin-dress.jpg",
    gallery: [
      "Prodcut Details-Noira Satin Dress/Noira-Satin-Dress-2.jpg",
      "Prodcut Details-Noira Satin Dress/Noira-Satin-Dress-1.jpg",
      "Prodcut Details-Noira Satin Dress/Noira-Satin-Dress-3.jpg"
    ],
    short: "A sleek satin silhouette designed to bring softness, structure, and quiet luxury into every occasion. The Noira Satin Dress features a graceful drape, modern neckline, and a polished finish perfect for evening elegance.",
    description: "Crafted for sophisticated evenings and elevated day styling, the Noira Satin Dress blends fluid movement with a refined feminine shape. Its clean finish and timeless form make it a versatile wardrobe statement.",
    fabric: "Premium satin blend",
    care: "Hand wash or gentle machine wash",
    note: "Steam lightly for best finish"
  },
  {
    id: "lune-midi-dress",
    name: "Lune Midi Dress",
    category: "Dresses",
    price: 9200,
    color: "ivory",
    sizes: ["S", "M", "L", "XL"],
    isNew: true,
    image: "home/images/products/lune-midi-dress.jpg",
    short: "Named for the moon that guides the Seylune story, this ivory midi moves softly with every step and falls to a graceful length.",
    description: "The Lune Midi Dress is cut for light, luminous days and candlelit evenings alike. A gently fitted bodice opens into a fluid skirt, finished with clean seams and a quiet, polished hem.",
    fabric: "Soft crepe with satin lining",
    care: "Gentle machine wash, cold",
    note: "Store on a padded hanger"
  },
  {
    id: "aurelle-evening-dress",
    name: "Aurelle Evening Dress",
    category: "Dresses",
    price: 10500,
    color: "burgundy",
    sizes: ["XS", "S", "M", "L"],
    isNew: true,
    image: "home/images/products/Dresses/aurelle-evening-dress.jpg",
    short: "A deep burgundy evening gown with a sculpted waist and a sweeping skirt, made for statement entrances.",
    description: "Aurelle is the centrepiece of the Evening Edit. Rich colour, a defined waist and a long, liquid skirt create a silhouette that feels confident and composed from every angle.",
    fabric: "Heavy satin with soft lining",
    care: "Dry clean recommended",
    note: "Steam from the inside to protect the sheen"
  },
  {
    id: "seren-pleated-dress",
    name: "Seren Pleated Dress",
    category: "Dresses",
    price: 8600,
    color: "gold",
    sizes: ["S", "M", "L"],
    isNew: false,
    image: "home/images/products/Dresses/seren-pleated-dress.jpg",
    short: "Fine knife pleats in warm antique gold catch the light as you move — refined, feminine and effortless.",
    description: "The Seren Pleated Dress pairs a relaxed bodice with crisp, permanent pleats. It works for garden events, celebrations and evenings when you want shimmer without excess.",
    fabric: "Pleated metallic georgette",
    care: "Hand wash cold, do not wring",
    note: "Hang to dry to keep the pleats sharp"
  },
  {
    id: "viana-slip-dress",
    name: "Viana Slip Dress",
    category: "Dresses",
    price: 9450,
    color: "black",
    sizes: ["XS", "S", "M"],
    isNew: false,
    image: "home/images/products/Dresses/viana-slip-dress.jpg",
    short: "A minimal black slip with fine straps and a bias cut that skims the body beautifully.",
    description: "Viana is the quiet essential of the collection. Cut on the bias for natural drape, it layers easily under tailoring or stands alone with simple gold jewellery.",
    fabric: "Bias-cut satin",
    care: "Hand wash or dry clean",
    note: "Iron on low heat, inside out"
  },
  {
    id: "elowen-wrap-dress",
    name: "Elowen Wrap Dress",
    category: "Dresses",
    price: 8900,
    color: "emerald",
    sizes: ["S", "M", "L", "XL"],
    isNew: false,
    image: "home/images/products/Dresses/elowen-wrap-dress.jpg",
    short: "A flattering emerald wrap with an adjustable tie waist and soft flutter sleeves.",
    description: "The Elowen Wrap Dress adapts to you: tie it close for definition or loosely for ease. Deep emerald tones give it a jewel-like richness from day to night.",
    fabric: "Fluid crepe de chine",
    care: "Gentle machine wash, cold",
    note: "Reshape while damp"
  },
  {
    id: "nyra-embellished-dress",
    name: "Nyra Embellished Dress",
    category: "Dresses",
    price: 11200,
    color: "gold",
    sizes: ["S", "M", "L"],
    isNew: false,
    image: "home/images/products/Dresses/nyra-embellished-dress.jpg",
    short: "Hand-placed embellishment over a golden base — the most celebratory piece in the Seylune collection.",
    description: "Nyra is made for weddings, galas and moonlit celebrations. Delicate embellishment adds depth and movement, while the clean cut keeps the look modern.",
    fabric: "Embellished tulle over satin",
    care: "Specialist dry clean only",
    note: "Store flat or folded in tissue"
  },
  {
    id: "zarelle-maxi-dress",
    name: "Zarelle Maxi Dress",
    category: "Dresses",
    price: 10950,
    color: "ivory",
    sizes: ["XS", "S", "M", "L", "XL"],
    isNew: false,
    image: "home/images/products/Dresses/zarelle-maxi-dress.jpg",
    short: "A floor-length maxi with an airy, printed skirt that floats with every movement.",
    description: "The Zarelle Maxi Dress is cut generously for movement, with a fitted bodice and tiers of soft fabric. It is the signature silhouette of the Moonlit Muse edit.",
    fabric: "Lightweight printed chiffon",
    care: "Hand wash cold",
    note: "Steam gently to release creases"
  },

  /* ---------------- TOPS ---------------- */
  {
    id: "elara-drape-top",
    name: "Elara Drape Top",
    category: "Tops",
    price: 5250,
    color: "plum",
    sizes: ["XS", "S", "M", "L"],
    isNew: true,
    image: "home/images/products/Tops/elara-drape-top.jpg",
    short: "A softly draped plum top with a cowl neckline that pairs effortlessly with tailoring.",
    description: "Elara brings evening softness to everyday dressing. The cowl drape falls naturally at the neckline, and the relaxed body tucks neatly into trousers or skirts.",
    fabric: "Satin-backed crepe",
    care: "Gentle machine wash, cold",
    note: "Iron on low heat"
  },
  {
    id: "selah-wrap-top",
    name: "Selah Wrap Top",
    category: "Tops",
    price: 4950,
    color: "ivory",
    sizes: ["XS", "S", "M", "L", "XL"],
    isNew: true,
    image: "home/images/products/Tops/selah-wrap-top.jpg",
    short: "A clean ivory wrap top with a defined waist tie — light, polished and easy to style.",
    description: "The Selah Wrap Top layers beautifully and ties to suit your shape. Wear it with the Veya Tailored Pants for a soft-tailoring look.",
    fabric: "Cotton-silk blend",
    care: "Gentle machine wash, cold",
    note: "Wash with similar colours"
  },
  {
    id: "kaia-structured-blouse",
    name: "Kaia Structured Blouse",
    category: "Tops",
    price: 5650,
    color: "emerald",
    sizes: ["S", "M", "L"],
    isNew: true,
    image: "home/images/products/Tops/liora-satin-blouse.jpg",
    short: "A structured blouse in iridescent emerald satin with a gathered yoke and full sleeves.",
    description: "Kaia balances structure and shine. The gathered neckline and cuffed sleeves give shape, while the shifting satin tone keeps it luminous under evening light.",
    fabric: "Iridescent satin",
    care: "Hand wash or dry clean",
    note: "Steam rather than iron"
  },
  {
    id: "liora-satin-blouse",
    name: "Liora Satin Blouse",
    category: "Tops",
    price: 5900,
    color: "print",
    sizes: ["XS", "S", "M", "L"],
    isNew: false,
    image: "home/images/products/Tops/Kaia-Structured-Blouse.jpg",
    short: "A printed satin blouse with a keyhole neckline and balloon sleeves in deep botanical tones.",
    description: "Liora carries a painterly botanical print across fluid satin. The keyhole neckline and gathered cuffs give it a romantic, editorial finish.",
    fabric: "Printed satin",
    care: "Hand wash cold",
    note: "Dry in the shade to protect the print"
  },
  {
    id: "aven-knit-top",
    name: "Aven Knit Top",
    category: "Tops",
    price: 4500,
    color: "taupe",
    sizes: ["XS", "S", "M", "L", "XL"],
    isNew: false,
    image: "home/images/products/Tops/aven-knit-top.jpg",
    short: "A fine-gauge knit in soft taupe with a subtle texture — a calm everyday essential.",
    description: "The Aven Knit Top is light enough for island weather and refined enough for the office. A gentle V-neck and slim fit keep it versatile.",
    fabric: "Fine viscose knit",
    care: "Hand wash cold, dry flat",
    note: "Fold rather than hang"
  },
  {
    id: "nerah-tie-front-top",
    name: "Nerah Tie-Front Top",
    category: "Tops",
    price: 5150,
    color: "print",
    sizes: ["S", "M", "L"],
    isNew: false,
    image: "home/images/products/Tops/nerah-tie-front-top.jpg",
    short: "A floral tie-front blouse in warm plum and gold tones with relaxed long sleeves.",
    description: "Nerah ties at the front for an easy, shaped finish. Its warm floral print brings colour to dark tailoring and denim alike.",
    fabric: "Printed crepe",
    care: "Gentle machine wash, cold",
    note: "Iron on low heat"
  },
  {
    id: "veya-luxe-shirt",
    name: "Veya Luxe Shirt",
    category: "Tops",
    price: 5800,
    color: "ivory",
    sizes: ["XS", "S", "M", "L", "XL"],
    isNew: false,
    image: "home/images/products/Tops/veya-luxe-shirt.jpg",
    short: "A fluid ivory shirt with a soft collar and concealed placket — elevated simplicity.",
    description: "The Veya Luxe Shirt is the foundation of the Soft Tailoring edit. Wear it tucked into the Veya Tailored Pants for a complete look.",
    fabric: "Silk-touch satin",
    care: "Gentle machine wash, cold",
    note: "Iron inside out on low heat"
  },
  {
    id: "sorelle-evening-blouse",
    name: "Sorelle Evening Blouse",
    category: "Tops",
    price: 6250,
    color: "plum",
    sizes: ["S", "M", "L"],
    isNew: false,
    image: "home/images/products/Tops/sorelle-evening-blouse.jpg",
    short: "A rich plum velvet blouse with a high neckline and textured sleeves, made for evening.",
    description: "Sorelle brings depth to the Evening Edit. Velvet catches the light softly, and the high neck keeps the look elegant and modern.",
    fabric: "Stretch velvet",
    care: "Dry clean recommended",
    note: "Steam from the reverse side"
  },

  /* ---------------- BOTTOMS ---------------- */
  {
    id: "veya-tailored-pants",
    name: "Veya Tailored Pants",
    category: "Bottoms",
    price: 6400,
    color: "charcoal",
    sizes: ["XS", "S", "M", "L", "XL"],
    isNew: true,
    image: "home/images/products/Bottoms/veya-tailored-pants.jpg",
    short: "Sharp charcoal trousers with a high waist and a long, straight leg.",
    description: "The Veya Tailored Pants are cut to lengthen the leg and sit cleanly at the waist. Pair with any Seylune top for an instantly polished look.",
    fabric: "Stretch suiting",
    care: "Gentle machine wash or dry clean",
    note: "Press along the crease"
  },
  {
    id: "mira-wide-leg-trousers",
    name: "Mira Wide-Leg Trousers",
    category: "Bottoms",
    price: 6850,
    color: "taupe",
    sizes: ["S", "M", "L", "XL"],
    isNew: true,
    image: "home/images/products/Bottoms/mira-wide-leg-trousers.jpg",
    short: "Fluid wide-leg trousers in warm taupe that move beautifully with every step.",
    description: "Mira is relaxed but refined. A high waist and generous leg create an elegant line that suits both flats and heels.",
    fabric: "Fluid twill",
    care: "Gentle machine wash, cold",
    note: "Hang to dry"
  },
  {
    id: "nyla-straight-fit-pants",
    name: "Nyla Straight-Fit Pants",
    category: "Bottoms",
    price: 6300,
    color: "brown",
    sizes: ["XS", "S", "M", "L"],
    isNew: false,
    image: "home/images/products/Bottoms/nyla-straight-fit-pants.jpg",
    short: "Straight-fit trousers in a subtle brown check — classic tailoring with a modern edge.",
    description: "Nyla's fine check pattern adds texture without noise. The straight leg and pressed crease keep the line clean and professional.",
    fabric: "Woven check suiting",
    care: "Dry clean recommended",
    note: "Press with a cloth"
  },
  {
    id: "aure-slim-trousers",
    name: "Aure Slim Trousers",
    category: "Bottoms",
    price: 6700,
    color: "navy",
    sizes: ["XS", "S", "M", "L"],
    isNew: false,
    image: "home/images/products/Bottoms/aure-slim-trousers.jpg",
    short: "Slim navy trousers with a cropped ankle — sleek, sharp and easy to wear.",
    description: "The Aure Slim Trousers are tailored close through the leg and cropped at the ankle. They pair especially well with ivory shirts and heels.",
    fabric: "Stretch cotton sateen",
    care: "Gentle machine wash, cold",
    note: "Iron on medium heat"
  },
  {
    id: "liora-satin-skirt",
    name: "Liora Satin Skirt",
    category: "Bottoms",
    price: 5950,
    color: "bronze",
    sizes: ["XS", "S", "M", "L"],
    isNew: false,
    image: "home/images/products/Bottoms/liora-satin-skirt.jpg",
    short: "A bronze satin midi skirt cut on the bias for a soft, liquid sway.",
    description: "Liora glows under evening light. The bias cut skims the hips and flows to mid-calf, making it a natural partner for knits and fitted tops.",
    fabric: "Bias-cut satin",
    care: "Hand wash cold",
    note: "Steam rather than iron"
  },
  {
    id: "selene-midi-skirt",
    name: "Selene Midi Skirt",
    category: "Bottoms",
    price: 6100,
    color: "emerald",
    sizes: ["S", "M", "L", "XL"],
    isNew: false,
    image: "home/images/products/Bottoms/selene-midi-skirt..jpg",
    short: "A full emerald jacquard midi skirt with a rich, tonal texture.",
    description: "Selene takes its name from the moon goddess. The A-line shape and jacquard surface give it volume and presence, perfect for celebrations.",
    fabric: "Jacquard brocade",
    care: "Dry clean only",
    note: "Store hanging by the waistband"
  },
  {
    id: "noemi-pleated-trousers",
    name: "Noemi Pleated Trousers",
    category: "Bottoms",
    price: 6950,
    color: "brown",
    sizes: ["XS", "S", "M", "L", "XL"],
    isNew: false,
    image: "home/images/products/Bottoms/noemi-pleated-trousers..jpg",
    short: "Front-pleated trousers in deep cocoa brown with a relaxed, generous leg.",
    description: "The Noemi Pleated Trousers bring soft volume to tailoring. Front pleats add movement, and the deep brown tone works across every season.",
    fabric: "Wool-blend suiting",
    care: "Dry clean recommended",
    note: "Press pleats with a damp cloth"
  },
  {
    id: "vara-structured-skirt",
    name: "Vara Structured Skirt",
    category: "Bottoms",
    price: 5850,
    color: "taupe",
    sizes: ["XS", "S", "M", "L"],
    isNew: false,
    image: "home/images/products/Bottoms/vara-structured-skirt.jpg",
    short: "An asymmetric structured skirt in muted taupe with a sculpted, modern hem.",
    description: "Vara brings architecture to the collection. The angled hem and firm fabric create a confident silhouette that pairs well with fitted knits.",
    fabric: "Structured cotton blend",
    care: "Gentle machine wash, cold",
    note: "Iron on medium heat"
  }
];


/* ============================================================
   COLOUR LABELS + SWATCHES (used by filter chips)
============================================================ */
const SEYLUNE_COLORS = {
  black:    { label: "Black",    swatch: "#111014" },
  ivory:    { label: "Ivory",    swatch: "#EFE6D4" },
  burgundy: { label: "Burgundy", swatch: "#6B1F2E" },
  gold:     { label: "Gold",     swatch: "#C6A36B" },
  emerald:  { label: "Emerald",  swatch: "#1F5C4D" },
  plum:     { label: "Plum",     swatch: "#4B2C50" },
  taupe:    { label: "Taupe",    swatch: "#8A7A6E" },
  charcoal: { label: "Charcoal", swatch: "#3A3A3D" },
  navy:     { label: "Navy",     swatch: "#1E2740" },
  brown:    { label: "Brown",    swatch: "#5B4033" },
  bronze:   { label: "Bronze",   swatch: "#8C6A4A" },
  print:    { label: "Print",    swatch: "linear-gradient(135deg, #2B4A7A 0%, #C6A36B 50%, #6B1F2E 100%)" }
};

const SEYLUNE_SIZES = ["XS", "S", "M", "L", "XL"];


/* ============================================================
   LOOKS — pieces styled together ("Complete the look" on the
   product page). A piece can belong to one look. Dresses join
   looks once the Outerwear and Accessories pieces arrive.
============================================================ */
const SEYLUNE_LOOKS = [
  { name: "Plum Evening",     pieces: ["elara-drape-top", "veya-tailored-pants"] },
  { name: "Ivory Ease",       pieces: ["selah-wrap-top", "mira-wide-leg-trousers"] },
  { name: "Emerald Hour",     pieces: ["kaia-structured-blouse", "selene-midi-skirt"] },
  { name: "The Liora Set",    pieces: ["liora-satin-blouse", "liora-satin-skirt"] },
  { name: "Soft Taupe",       pieces: ["aven-knit-top", "vara-structured-skirt"] },
  { name: "Printed Navy",     pieces: ["nerah-tie-front-top", "aure-slim-trousers"] },
  { name: "Weekday Tailoring", pieces: ["veya-luxe-shirt", "nyla-straight-fit-pants"] },
  { name: "Candlelit",        pieces: ["sorelle-evening-blouse", "noemi-pleated-trousers"] }
];

/* ============================================================
   SEYLUNE ADMIN — PRODUCTS
   Every piece in the database, archived ones too. "Add a piece"
   or a piece's row opens the editor: name, web address,
   collection, colour, sizes, price, sale price, new arrival, in
   the shop, descriptions and photos.

   Photos are made smaller in the browser (longest side 1,800 px,
   JPEG) and uploaded to the product-images bucket in Supabase
   Storage. The bucket itself refuses anything that isn't a JPG /
   PNG / WebP under 5 MB, and anyone who isn't on the team.

   The checks here are for convenience; the database repeats every
   one of them (supabase/03-catalogue-and-shop-tools.sql).
============================================================ */

(() => {
  const { $, esc, data, load, message, chips, stockOf } = AdminKit;
  const SIZES = ["XS", "S", "M", "L", "XL", "One Size"];
  const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  const MAX_SIDE = 1800;

  let filter = "all";
  let editing = null;       // the piece being edited, or null for a new one
  let photos = { image: "", gallery: [] };
  let idTouched = false;    // stop following the name once the address was typed

  /* ============================================================
     THE LIST
  ============================================================ */
  chips("productChips", "filter", value => { filter = value; renderList(); });
  $("productSearch").addEventListener("input", renderList);

  function pieces() {
    return data.products.map(SeyluneBackend.toPiece);
  }

  function renderList() {
    const q = $("productSearch").value.trim().toLowerCase();
    const list = pieces().filter(p => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (filter === "archived") return p.active === false;
      if (filter === "sale") return Seylune.onSale(p) && p.active !== false;
      if (filter !== "all") return p.category === filter && p.active !== false;
      return p.active !== false;
    });

    $("productList").innerHTML = list.length ? list.map(p => {
      const total = p.sizes.reduce((n, s) => n + (stockOf(p.id, s) || 0), 0);
      const colour = SEYLUNE_COLORS[p.color] || { label: p.color || "—", swatch: "transparent" };
      return `
        <button type="button" class="pa-row" data-id="${esc(p.id)}">
          ${p.image ? `<img src="${Seylune.asset(p.image)}" alt="" />` : `<span class="ao-noimg"></span>`}
          <span class="pa-name">${esc(p.name)}
            ${p.active === false ? `<span class="tag-archived">Archived</span>` : ""}
            ${p.isNew ? `<span class="tag-new">New</span>` : ""}
            ${Seylune.onSale(p) ? `<span class="tag-sale">Sale</span>` : ""}
          </span>
          <span class="pa-meta">${esc(p.category)} · <span class="swatch" style="background:${colour.swatch}"></span> ${esc(colour.label)}</span>
          <span class="pa-sizes">${esc(p.sizes.join(" · "))}</span>
          <span class="pa-stock">${total} in stock</span>
          <span class="pa-price">${Seylune.priceHtml(p)}</span>
        </button>`;
    }).join("") : `<p class="admin-empty">${data.products.length ? "No pieces match." : "No pieces yet — or step 3 of the setup hasn't been run."}</p>`;
  }

  $("productList").addEventListener("click", e => {
    const row = e.target.closest(".pa-row");
    if (row) openEditor(pieces().find(p => p.id === row.dataset.id));
  });

  $("newProduct").addEventListener("click", () => openEditor(null));


  /* ============================================================
     THE EDITOR
  ============================================================ */
  // Fill the colour and size choices once
  $("pColor").innerHTML = Object.entries(SEYLUNE_COLORS)
    .map(([key, c]) => `<option value="${key}">${esc(c.label)}</option>`).join("");
  $("pSizes").innerHTML = SIZES.map(s =>
    `<label class="form-checkbox"><input type="checkbox" value="${s}" /> <span>${s}</span></label>`).join("");

  const fieldIds = ["pName", "pId", "pPrice", "pSale", "pSizes"];
  function clearErrors() {
    fieldIds.forEach(id => {
      $(id + "Error").textContent = "";
      const group = $(id).closest(".form-group");
      if (group) group.classList.remove("error");
    });
    $("editorFeedback").textContent = "";
    $("editorFeedback").className = "form-feedback";
  }

  function fieldError(id, text) {
    $(id + "Error").textContent = text;
    const group = $(id).closest(".form-group");
    if (group) group.classList.add("error");
  }

  function slugify(text) {
    return text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  }

  function openEditor(p) {
    editing = p || null;
    idTouched = !!p;
    clearErrors();
    $("productBrowse").hidden = true;
    $("productEditor").hidden = false;
    $("editorTitle").textContent = p ? `Edit: ${p.name}` : "Add a piece";

    $("pName").value = p ? p.name : "";
    $("pId").value = p ? p.id : "";
    $("pId").readOnly = !!p;   // the web address is fixed once saved (old links and orders use it)
    $("pCategory").value = p ? p.category : (["Dresses", "Tops", "Bottoms", "Outerwear", "Accessories"].includes(filter) ? filter : "Dresses");
    $("pColor").value = p && p.color ? p.color : "black";
    $("pSizes").querySelectorAll("input").forEach(box => {
      box.checked = p ? p.sizes.includes(box.value) : ["XS", "S", "M", "L"].includes(box.value);
    });
    $("pPrice").value = p ? p.price : "";
    $("pSale").value = p && p.salePrice ? p.salePrice : "";
    $("pActive").checked = p ? p.active !== false : true;
    $("pNew").checked = p ? p.isNew : true;
    $("pOrder").value = p ? (p.sortOrder || 0) : (Math.max(0, ...data.products.map(r => r.sort_order || 0)) + 10);
    $("pShort").value = p ? p.short : "";
    $("pDescription").value = p ? p.description : "";
    $("pFabric").value = p ? p.fabric : "";
    $("pCare").value = p ? p.care : "";
    $("pNote").value = p ? p.note : "";

    photos = { image: p ? p.image || "" : "", gallery: p ? (p.gallery || []).slice() : [] };
    renderPhotos();

    $("editorView").hidden = !p;
    if (p) $("editorView").href = Seylune.productUrl(p.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
    $("pName").focus({ preventScroll: true });
  }

  function closeEditor() {
    $("productEditor").hidden = true;
    $("productBrowse").hidden = false;
    editing = null;
  }

  $("editorBack").addEventListener("click", closeEditor);

  // The web address follows the name until it is typed by hand
  $("pName").addEventListener("input", () => {
    if (!editing && !idTouched) $("pId").value = slugify($("pName").value);
  });
  $("pId").addEventListener("input", () => { idTouched = true; });

  /* ----- Photos ----- */
  function renderPhotos() {
    $("pMainPhoto").innerHTML = photos.image
      ? `<img src="${esc(Seylune.asset(photos.image))}" alt="Main photo" />`
      : `<span class="editor-nophoto">No photo yet</span>`;
    $("pGallery").innerHTML = photos.gallery.map((src, i) => `
      <span class="editor-thumb">
        <img src="${esc(Seylune.asset(src))}" alt="View ${i + 2}" />
        <button type="button" class="editor-thumb-remove" data-remove="${i}" aria-label="Remove view ${i + 2}">×</button>
        <button type="button" class="editor-thumb-main" data-main="${i}" aria-label="Use view ${i + 2} as the main photo">Main</button>
      </span>`).join("");
  }

  $("pGallery").addEventListener("click", e => {
    const remove = e.target.closest("[data-remove]");
    const main = e.target.closest("[data-main]");
    if (remove) photos.gallery.splice(Number(remove.dataset.remove), 1);
    if (main) {
      const i = Number(main.dataset.main);
      const old = photos.image;
      photos.image = photos.gallery[i];
      if (old) photos.gallery[i] = old; else photos.gallery.splice(i, 1);
    }
    renderPhotos();
  });

  // Make a photo smaller in the browser before it is uploaded
  async function shrink(file) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new Error(`${file.name}: only JPG, PNG or WebP photos.`);
    }
    if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name} is larger than 20 MB.`);
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.86));
    if (!blob || blob.size > 5 * 1024 * 1024) throw new Error(`${file.name} is still too large after resizing.`);
    return blob;
  }

  async function upload(files, asMain) {
    const id = editing ? editing.id : $("pId").value.trim();
    if (!ID_PATTERN.test(id)) {
      fieldError("pId", "Enter the name (or web address) first: photos are filed under it.");
      $("pName").focus();
      return;
    }
    const feedback = $("photoFeedback");
    try {
      for (const file of files) {
        if (!asMain && photos.gallery.length >= 8) throw new Error("A piece can have up to 8 more views.");
        feedback.className = "form-feedback";
        feedback.textContent = `Uploading ${file.name}…`;
        const url = await SeyluneBackend.uploadProductImage(await shrink(file), id);
        if (asMain) photos.image = url; else photos.gallery.push(url);
        renderPhotos();
      }
      feedback.textContent = "Uploaded. Save the piece to keep the photos.";
    } catch (err) {
      feedback.className = "form-feedback error";
      feedback.textContent = err.message;
    }
  }

  $("pMainFile").addEventListener("change", e => { upload(Array.from(e.target.files).slice(0, 1), true); e.target.value = ""; });
  $("pGalleryFiles").addEventListener("change", e => { upload(Array.from(e.target.files), false); e.target.value = ""; });

  /* ----- Save ----- */
  $("productEditor").addEventListener("submit", async e => {
    e.preventDefault();
    clearErrors();

    const name = $("pName").value.trim();
    const id = editing ? editing.id : $("pId").value.trim();
    const sizes = Array.from($("pSizes").querySelectorAll("input:checked")).map(b => b.value);
    const price = Number($("pPrice").value);
    const saleText = $("pSale").value.trim();
    const sale = saleText ? Number(saleText) : null;
    const active = $("pActive").checked;

    let first = null;
    const fail = (fieldId, text) => { fieldError(fieldId, text); first = first || fieldId; };
    if (name.length < 2 || name.length > 80) fail("pName", "Give the piece a name (2–80 characters).");
    if (!ID_PATTERN.test(id)) fail("pId", "Lowercase letters, numbers and dashes only, e.g. noira-satin-dress.");
    else if (!editing && data.products.some(r => r.id === id)) fail("pId", "Another piece already uses this web address.");
    if (!sizes.length) fail("pSizes", "Choose at least one size.");
    if (!Number.isInteger(price) || price < 1 || price > 1000000) fail("pPrice", "A whole number of rupees, up to 1,000,000.");
    if (sale !== null && (!Number.isInteger(sale) || sale < 1 || sale >= price)) fail("pSale", "The sale price must be lower than the price.");
    if (first) { $(first === "pSizes" ? "pName" : first).focus(); return; }
    if (active && !photos.image) {
      $("editorFeedback").className = "form-feedback error";
      $("editorFeedback").textContent = "A piece in the shop needs a main photo. Upload one, or untick “In the shop”.";
      return;
    }

    const row = {
      id, name, category: $("pCategory").value, color: $("pColor").value, sizes,
      price, sale_price: sale, is_new: $("pNew").checked, active,
      sort_order: Number($("pOrder").value) || 0,
      short: $("pShort").value.trim() || null,
      description: $("pDescription").value.trim() || null,
      fabric: $("pFabric").value.trim() || null,
      care: $("pCare").value.trim() || null,
      note: $("pNote").value.trim() || null,
      image: photos.image || null,
      gallery: photos.gallery
    };

    const button = $("editorSave");
    button.disabled = true;
    button.textContent = "Saving…";
    try {
      await SeyluneBackend.saveProduct(row, !editing);
      message(`${name} is saved${active ? " and in the shop" : " (archived)"}.`);
      await load("products", "stock");
      closeEditor();
    } catch (err) {
      $("editorFeedback").className = "form-feedback error";
      $("editorFeedback").textContent = err.message;
    } finally {
      button.disabled = false;
      button.textContent = "Save Piece";
    }
  });

  AdminKit.onRender(renderList);
})();

/**
 * Editor de inventario — vista en grid de tarjetas con iconos.
 */
(function () {
  const store = window.MenuStore;
  const IC = window.InventarioIcons;
  if (!store || !IC) {
    document.body.innerHTML = '<p class="p-8 text-red-600">Faltan menu-store.js o inventario-icons.js</p>';
    return;
  }

  let menu = store.get();
  let saveTimer = null;

  const mainEl = document.getElementById('inv-main');
  const navEl = document.getElementById('inv-nav');
  const saveStatusEl = document.getElementById('save-status');
  const toastEl = document.getElementById('toast');

  const RESERVED_CAT_IDS = new Set([
    'milk-types', 'panini-formats', 'panini', 'montaditos', 'sandwiches', 'platos',
    'cafeteria', 'bebidas', 'por-encargo', 'porEncargo', 'categorias',
  ]);

  function buildSections() {
    const base = [
      { id: 'milk-types', label: 'Leches', render: renderMilkTypes },
      { id: 'panini-formats', label: 'Formatos', render: renderPaniniFormats },
      { id: 'panini', label: 'Panini', render: renderPanini },
      { id: 'montaditos', label: 'Montaditos', render: renderMontaditos },
      { id: 'sandwiches', label: 'Sandwich', render: () => renderSimpleList('sandwiches') },
      { id: 'platos', label: 'Platos', render: () => renderSimpleList('platos') },
    ];
    const customs = (menu.customCategories || []).map((cat, ci) => ({
      id: cat.id,
      label: cat.title,
      emoji: cat.emoji || '📦',
      render: () => renderCustomCategory(ci),
    }));
    return base.concat(customs, [
      { id: 'cafeteria', label: 'Cafetería', render: renderCafeteria },
      { id: 'bebidas', label: 'Bebidas', render: renderBebidas },
      { id: 'por-encargo', label: 'Por encargo', render: renderPorEncargo },
      { id: 'categorias', label: 'Categorías', render: renderCategoryManager },
    ]);
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function slugify(text) {
    return String(text || 'item').toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';
  }

  function uniqueId(prefix, name) {
    const base = prefix + '-' + slugify(name);
    const ids = collectAllIds();
    if (!ids.has(base)) return base;
    let n = 2;
    while (ids.has(base + '-' + n)) n++;
    return base + '-' + n;
  }

  function collectAllIds() {
    const ids = new Set();
    const walk = (items) => { for (const it of items || []) if (it.id) ids.add(it.id); };
    for (const g of menu.panini || []) walk(g.items);
    walk(menu.montaditos?.items);
    walk(menu.sandwiches?.items);
    walk(menu.platos?.items);
    for (const g of menu.cafeteria?.groups || []) walk(g.items);
    for (const g of menu.bebidas?.groups || []) walk(g.items);
    walk(menu.porEncargo?.items);
    for (const cat of menu.customCategories || []) {
      ids.add(cat.id);
      if (cat.type === 'grouped') {
        for (const g of cat.groups || []) walk(g.items);
      } else walk(cat.items);
    }
    for (const m of menu.milkTypes || []) ids.add(m.id);
    for (const f of menu.paniniFormats || []) ids.add(f.id);
    return ids;
  }

  function getCustomCategory(ci) {
    return menu.customCategories?.[ci] || null;
  }

  function productCountForCategory(cat) {
    if (cat.type === 'grouped') {
      return (cat.groups || []).reduce((n, g) => n + (g.items?.length || 0), 0);
    }
    return cat.items?.length || 0;
  }

  function formatEuro(n) {
    return '€' + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
  }

  function persist() {
    store.save(menu);
    if (saveStatusEl) {
      saveStatusEl.classList.remove('opacity-0');
      clearTimeout(saveStatusEl._t);
      saveStatusEl._t = setTimeout(() => saveStatusEl.classList.add('opacity-0'), 1800);
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 350);
  }

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.remove('opacity-0');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.add('opacity-0'), 2200);
  }

  const inp = 'w-full px-2.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-red focus:outline-none bg-white';
  const lbl = 'block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5';

  function sectionShell(id, title, subtitle, bodyHtml, headerExtra) {
    const meta = IC.SECTION_META[id] || { emoji: '📦', color: 'bg-gray-50 border-gray-100' };
    return `
      <section id="${id}" class="inv-section">
        <div class="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div class="flex items-center gap-3">
            <span class="text-3xl w-12 h-12 flex items-center justify-center rounded-2xl border ${meta.color}">${meta.emoji}</span>
            <div>
              <h2 class="display-font text-3xl sm:text-4xl text-brand-dark leading-none">${esc(title)}</h2>
              ${subtitle ? `<p class="text-sm text-gray-500 mt-0.5">${subtitle}</p>` : ''}
            </div>
          </div>
          ${headerExtra || ''}
        </div>
        ${bodyHtml}
      </section>`;
  }

  function productGrid(cardsHtml, addLabel, addAttrs) {
    return `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      ${cardsHtml}
      <button type="button" class="btn-add inv-add-card rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-brand-green transition p-6" ${addAttrs || ''}>
        <span class="w-12 h-12 rounded-full border-2 border-dashed border-current flex items-center justify-center text-2xl font-light">+</span>
        <span class="text-sm font-semibold">${esc(addLabel)}</span>
      </button>
    </div>`;
  }

  function cardRemoveBtn() {
    return `<button type="button" class="btn-remove absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 border border-gray-200 text-gray-400 hover:text-brand-red hover:border-red-200 flex items-center justify-center text-lg leading-none shadow-sm" title="Eliminar" aria-label="Eliminar">×</button>`;
  }

  function iconPickerHtml(name, value, options) {
    return `<div class="icon-picker flex flex-wrap gap-1.5 justify-center" data-picker="${name}">
      <input type="hidden" data-field="${name}" value="${esc(value)}" />
      ${options.map((o) => `
        <button type="button" class="icon-pick w-10 h-10 rounded-xl border flex items-center justify-center p-1.5 transition
          ${value === o.id ? 'selected border-brand-red bg-white shadow-sm' : 'border-gray-200 bg-gray-50 hover:bg-white'}"
          data-pick-icon="${o.id}" title="${esc(o.label)}">
          ${IC.render(o.id, 'w-7 h-7')}
        </button>`).join('')}
    </div>`;
  }

  function priceBadge(price, alt) {
    if (alt) return `<span class="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">${esc(alt)}</span>`;
    return `<span class="display-font text-xl text-brand-red">${formatEuro(price)}</span>`;
  }

  // ---- Renderers ----

  function renderMilkTypes() {
    const cards = (menu.milkTypes || []).map((m, i) => `
      <article class="inv-product-card inv-card milk-row relative bg-white rounded-2xl border border-gray-100 p-4 flex flex-col" data-card="milk" data-idx="${i}">
        ${cardRemoveBtn()}
        <div class="inv-card-icon mx-auto mb-3 bg-blue-50 border border-blue-100 flex items-center justify-center p-2 icon-preview">
          ${IC.render(m.icon || 'milk_other', 'w-9 h-9')}
        </div>
        <div class="space-y-2 flex-1">
          <label><span class="${lbl}">Nombre</span>
            <input data-field="label" value="${esc(m.label)}" class="${inp}" /></label>
          <label><span class="${lbl}">Id interno</span>
            <input data-field="id" value="${esc(m.id)}" class="${inp} font-mono text-xs" /></label>
          <label><span class="${lbl}">Extra €</span>
            <input data-field="surcharge" type="number" step="0.05" min="0" value="${m.surcharge ?? 0}" class="${inp}" /></label>
          <div><span class="${lbl}">Icono en carta</span>${iconPickerHtml('icon', m.icon || 'milk_other', IC.MILK_ICON_OPTIONS)}</div>
        </div>
      </article>`).join('');

    return sectionShell('milk-types', 'Tipos de leche', 'Los cafés eligen cuáles ofrecer al cliente',
      productGrid(cards, 'Nueva leche', 'data-add="milk"'));
  }

  function renderPaniniFormats() {
    const cards = (menu.paniniFormats || []).map((f, i) => `
      <article class="inv-product-card inv-card fmt-row relative bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center text-center" data-card="fmt" data-idx="${i}">
        ${cardRemoveBtn()}
        <div class="inv-card-icon mb-3 bg-amber-50 border border-amber-100 flex items-center justify-center p-2 icon-preview">
          ${IC.breadIcon(f.id)}
        </div>
        <label class="w-full text-left"><span class="${lbl}">Nombre</span>
          <input data-field="label" value="${esc(f.label)}" class="${inp}" /></label>
        <label class="w-full text-left mt-2"><span class="${lbl}">Precio</span>
          <input data-field="price" type="number" step="0.1" min="0" value="${f.price}" class="${inp} text-center display-font text-lg" /></label>
        <input data-field="id" value="${esc(f.id)}" type="hidden" />
      </article>`).join('');

    return sectionShell('panini-formats', 'Formatos de pan', 'Bocadillo, pulguita, barra…',
      productGrid(cards, 'Nuevo formato', 'data-add="fmt"'));
  }

  function renderPanini() {
    const groups = (menu.panini || []).map((g, gi) => {
      const cards = (g.items || []).map((it, ii) => `
        <article class="inv-product-card inv-card panini-item relative bg-white rounded-2xl border border-gray-100 p-4" data-card="panini" data-gi="${gi}" data-ii="${ii}">
          ${cardRemoveBtn()}
          <div class="inv-card-icon mx-auto mb-2 bg-orange-50 border border-orange-100 flex items-center justify-center text-2xl">🥪</div>
          <div class="display-font text-3xl text-brand-red text-center mb-1">${esc(it.code)}</div>
          <input data-field="code" value="${esc(it.code)}" class="${inp} text-center display-font text-lg mb-2" placeholder="Cód" />
          <input data-field="name" value="${esc(it.name)}" class="${inp}" placeholder="Nombre del panini" />
        </article>`).join('');

      return `
        <div class="panini-group mb-8" data-gi="${gi}">
          <div class="flex items-center gap-2 mb-3 px-1">
            <input data-field="group" value="${esc(g.group)}" class="flex-1 display-font text-2xl bg-transparent border-b-2 border-gray-200 focus:border-brand-red outline-none py-1" />
            <button type="button" class="btn-remove-group text-xs font-semibold text-brand-red px-3 py-1.5 rounded-full border border-red-100 hover:bg-red-50">Quitar grupo</button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            ${cards}
            <button type="button" class="btn-add-panini inv-add-card rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-brand-green p-6" data-gi="${gi}">
              <span class="text-2xl">+</span><span class="text-sm font-semibold">Panini</span>
            </button>
          </div>
        </div>`;
    }).join('');

    return sectionShell('panini', 'Panini', 'Por grupos de ingrediente base', `
      <div id="panini-groups">${groups}</div>
      <button type="button" id="btn-add-panini-group" class="mt-4 text-sm font-semibold text-brand-green px-4 py-2 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100">+ Nuevo grupo</button>`);
  }

  function productCardSimple(sectionKey, idx, it, withPrice, defaultIcon, catIdx) {
    const icon = defaultIcon || (sectionKey === 'bebidas' ? 'beer' : sectionKey === 'platos' ? 'plate' : 'sandwich');
    const catAttr = catIdx != null ? ` data-cat-idx="${catIdx}"` : '';
    return `
      <article class="inv-product-card inv-card simple-row relative bg-white rounded-2xl border border-gray-100 p-4 flex flex-col" data-card="product" data-section="${sectionKey}" data-idx="${idx}"${catAttr}>
        ${cardRemoveBtn()}
        <div class="inv-card-icon mx-auto mb-3 bg-brand-cream border border-gray-100 flex items-center justify-center p-2">
          ${IC.render(icon, 'w-9 h-9')}
        </div>
        <input data-field="name" value="${esc(it.name)}" class="${inp} font-medium mb-2" placeholder="Nombre" />
        ${withPrice ? `<div class="flex items-center gap-2 mb-2">
          <span class="${lbl} shrink-0">€</span>
          <input data-field="price" type="number" step="0.05" min="0" value="${it.price}" class="${inp} display-font text-xl text-brand-red" />
        </div>` : priceBadge(menu.montaditos?.price, 'precio único')}
        <input data-field="id" value="${esc(it.id)}" class="${inp} font-mono text-[10px] text-gray-400" placeholder="id" />
      </article>`;
  }

  function renderMontaditos() {
    const m = menu.montaditos;
    const cards = (m.items || []).map((it, i) => productCardSimple('montaditos', i, it, false, 'montadito')).join('');
    const header = `<div class="flex flex-wrap gap-3 mb-5 p-4 bg-white rounded-2xl border border-gray-100">
      <label class="flex-1 min-w-[140px]"><span class="${lbl}">Nota carta</span><input id="mont-note" value="${esc(m.note || '')}" class="${inp}" /></label>
      <label class="w-32"><span class="${lbl}">Precio €</span><input id="mont-price" type="number" step="0.05" value="${m.price}" class="${inp}" /></label>
    </div>`;
    return sectionShell('montaditos', m.title || 'Montaditos', null, header + productGrid(cards, 'Montadito', 'data-add="montadito"'));
  }

  function renderSimpleList(key) {
    const sec = menu[key];
    const icon = key === 'platos' ? 'plate' : 'sandwich';
    const cards = (sec.items || []).map((it, i) => productCardSimple(key, i, it, true, icon)).join('');
    return sectionShell(key, sec.title || key, null, productGrid(cards, 'Producto', `data-add="simple" data-section="${key}"`));
  }

  function renderCategoryManager() {
    if (!menu.customCategories) menu.customCategories = [];
    const cards = menu.customCategories.map((cat, ci) => {
      const count = productCountForCategory(cat);
      const typeLabel = cat.type === 'grouped' ? 'Con subgrupos' : 'Lista simple';
      return `
        <article class="inv-product-card cat-meta-card relative bg-white rounded-2xl border-2 border-brand-green/30 p-4 flex flex-col" data-cat-idx="${ci}">
          <button type="button" class="btn-remove-cat absolute top-2 right-2 w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-brand-red text-lg" title="Eliminar categoría">×</button>
          <a href="#${esc(cat.id)}" class="flex flex-col items-center text-center flex-1 group">
            <span class="text-4xl mb-2">${esc(cat.emoji || '📦')}</span>
            <input data-cat-field="title" value="${esc(cat.title)}" class="${inp} font-semibold text-center mb-1" onclick="event.preventDefault(); event.stopPropagation();" />
            <span class="text-[10px] font-bold uppercase text-brand-green">${esc(typeLabel)}</span>
            <span class="text-xs text-gray-500 mt-1">${count} producto${count !== 1 ? 's' : ''}</span>
          </a>
          <div class="mt-3 grid grid-cols-2 gap-2">
            <label><span class="${lbl}">Emoji</span>
              <input data-cat-field="emoji" value="${esc(cat.emoji || '📦')}" class="${inp} text-center text-xl" maxlength="4" /></label>
            <label><span class="${lbl}">Orden</span>
              <input data-cat-field="order" type="number" value="${cat.order ?? 50}" class="${inp}" title="Menor = más arriba en carta" /></label>
          </div>
          <label class="mt-2 block"><span class="${lbl}">Tipo</span>
            <select data-cat-field="type" class="${inp}">
              <option value="simple" ${cat.type !== 'grouped' ? 'selected' : ''}>Lista simple</option>
              <option value="grouped" ${cat.type === 'grouped' ? 'selected' : ''}>Con subgrupos</option>
            </select>
          </label>
          <p class="text-[10px] text-gray-400 mt-2 font-mono truncate">#${esc(cat.id)}</p>
        </article>`;
    }).join('');

    const createForm = `
      <div id="new-cat-panel" class="mt-6 p-5 bg-white rounded-2xl border-2 border-dashed border-brand-green/40">
        <h3 class="display-font text-2xl text-brand-dark mb-3">Nueva categoría</h3>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label class="sm:col-span-2"><span class="${lbl}">Nombre en la carta</span>
            <input id="new-cat-title" class="${inp}" placeholder="Ej. Postres, Menú del día…" /></label>
          <label><span class="${lbl}">Emoji</span>
            <input id="new-cat-emoji" class="${inp} text-center text-2xl" value="📦" maxlength="4" /></label>
          <label><span class="${lbl}">Tipo</span>
            <select id="new-cat-type" class="${inp}">
              <option value="simple">Lista simple (precio por producto)</option>
              <option value="grouped">Con subgrupos (como Bebidas)</option>
            </select>
          </label>
        </div>
        <button type="button" id="btn-create-category" class="mt-4 w-full sm:w-auto bg-brand-green hover:bg-green-700 text-white font-bold px-6 py-3 rounded-xl shadow-sm transition">
          Crear categoría
        </button>
      </div>`;

    return sectionShell('categorias', 'Categorías personalizadas',
      'Crea secciones nuevas que aparecerán en la carta del cliente. Después añade productos en la pestaña de cada categoría.',
      `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${cards}
        <button type="button" id="btn-scroll-new-cat" class="inv-add-card rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-brand-green p-6 min-h-[200px]">
          <span class="text-3xl">+</span><span class="text-sm font-semibold">Nueva categoría</span>
        </button>
      </div>${createForm}`);
  }

  function renderCustomCategory(ci) {
    const cat = getCustomCategory(ci);
    if (!cat) return '';

    if (cat.type === 'grouped') {
      if (!cat.groups) cat.groups = [{ title: 'General', items: [] }];
      return renderCustomGrouped(ci, cat);
    }

    if (!cat.items) cat.items = [];
    const cards = cat.items.map((it, i) => productCardSimple(`custom-${ci}`, i, it, true, 'plate', ci)).join('');
    const meta = cat.sharedPrice != null ? `
      <div class="flex flex-wrap gap-3 mb-5 p-4 bg-white rounded-2xl border border-gray-100">
        <label class="flex-1"><span class="${lbl}">Nota en carta</span><input data-cat-note="${ci}" value="${esc(cat.note || '')}" class="${inp}" /></label>
        <label class="w-32"><span class="${lbl}">Precio único €</span>
          <input data-cat-shared-price="${ci}" type="number" step="0.05" value="${cat.sharedPrice ?? ''}" class="${inp}" placeholder="opcional" /></label>
      </div>` : '';

    return sectionShell(cat.id, cat.title,
      `Categoría personalizada · orden ${cat.order ?? 50}`,
      meta + productGrid(cards, 'Producto', `data-add="custom-simple" data-cat-idx="${ci}"`),
      `<span class="text-3xl">${esc(cat.emoji || '📦')}</span>`);
  }

  function renderCustomGrouped(ci, cat) {
    const sectionKey = `custom-${ci}`;
    const blocks = (cat.groups || []).map((g, gi) => {
      const cards = (g.items || []).map((it, ii) => {
        const priceField = `<input data-field="price" type="number" step="0.05" value="${it.price ?? ''}" class="w-24 ${inp} display-font text-lg text-brand-red" placeholder="€" />`;
        return `
          <article class="inv-product-card inv-card group-item relative bg-white rounded-2xl border border-gray-100 p-4 flex flex-col"
                   data-card="group-product" data-section="${sectionKey}" data-cat-idx="${ci}" data-gi="${gi}" data-ii="${ii}">
            ${cardRemoveBtn()}
            <div class="flex items-start gap-3 mb-2">
              <div class="inv-card-icon shrink-0 bg-sky-50 border border-sky-100 flex items-center justify-center p-2">${IC.render('beer', 'w-9 h-9')}</div>
              <div class="flex-1 min-w-0">
                <input data-field="name" value="${esc(it.name)}" class="${inp} font-semibold" />
                ${priceField}
              </div>
            </div>
            <input data-field="id" value="${esc(it.id)}" class="${inp} font-mono text-[10px] text-gray-400" />
          </article>`;
      }).join('');

      return `
        <div class="beb-group mb-10" data-gi="${gi}" data-section="${sectionKey}" data-cat-idx="${ci}">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-lg">${esc(cat.emoji || '📦')}</span>
            <input data-field="gtitle" value="${esc(g.title)}" class="flex-1 display-font text-2xl bg-transparent border-b-2 border-gray-200 focus:border-brand-red outline-none" />
            <button type="button" class="btn-remove-beb-group text-xs font-semibold text-brand-red px-3 py-1 rounded-full border border-red-100">Quitar</button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            ${cards}
            <button type="button" class="btn-add-group-item inv-add-card rounded-2xl flex flex-col items-center justify-center gap-2 p-6" data-gi="${gi}" data-section="${sectionKey}" data-cat-idx="${ci}">
              <span class="text-2xl">+</span><span class="text-sm font-semibold">Producto</span>
            </button>
          </div>
        </div>`;
    }).join('');

    return sectionShell(cat.id, cat.title, 'Subgrupos como en Bebidas',
      `<div data-groups="${sectionKey}" data-cat-idx="${ci}">${blocks}</div>
       <button type="button" class="btn-add-beb-group text-sm font-semibold text-brand-green px-4 py-2 rounded-xl border border-green-200 bg-green-50" data-section="${sectionKey}" data-cat-idx="${ci}">+ Subgrupo</button>`,
      `<span class="text-3xl">${esc(cat.emoji || '📦')}</span>`);
  }

  function cafeTags(item) {
    const tags = [];
    if (item.sizes?.length) tags.push(`${item.sizes.length} tamaño${item.sizes.length > 1 ? 's' : ''}`);
    if (item.milks?.length >= 2) tags.push(`${item.milks.length} leches`);
    if (typeof item.decafSurcharge === 'number') tags.push('descafeinado');
    return tags.map((t) => `<span class="text-[10px] font-semibold bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">${esc(t)}</span>`).join('');
  }

  function cafeOptionsPanel(item, gi, ii) {
    const milks = menu.milkTypes || [];
    const itemMilks = new Set(item.milks || []);
    const hasDecaf = typeof item.decafSurcharge === 'number';
    const sizes = item.sizes || [];

    const milkToggles = milks.map((m) => {
      const on = itemMilks.has(m.id);
      const ov = item.milkSurcharges?.[m.id] ?? '';
      return `
        <div class="flex flex-col items-center gap-1 p-2 rounded-xl border ${on ? 'border-brand-red bg-red-50/50' : 'border-gray-100 bg-gray-50'}">
          <label class="flex flex-col items-center cursor-pointer">
            <input type="checkbox" class="cafe-milk-cb sr-only" data-milk-id="${esc(m.id)}" ${on ? 'checked' : ''} />
            ${IC.render(m.icon || 'milk_other', 'w-8 h-8')}
            <span class="text-[10px] font-medium mt-1 text-center leading-tight">${esc(m.label)}</span>
          </label>
          <input type="number" step="0.05" min="0" placeholder="+€" title="Extra override"
            class="cafe-milk-override w-full text-center text-xs ${inp} py-1 ${on ? '' : 'opacity-30'}"
            data-milk-id="${esc(m.id)}" value="${ov}" ${on ? '' : 'disabled'} />
        </div>`;
    }).join('');

    const sizeCards = sizes.map((s, si) => `
      <div class="cafe-size-row bg-white border border-gray-100 rounded-xl p-2 space-y-1" data-si="${si}">
        <div class="flex justify-center">${IC.render(s.icon || 'size_normal', 'w-8 h-8')}</div>
        <input data-sfield="label" value="${esc(s.label)}" class="${inp} py-1 text-xs text-center" placeholder="Tamaño" />
        <input data-sfield="price" type="number" step="0.05" value="${s.price}" class="${inp} py-1 text-center display-font text-brand-red" />
        <input data-sfield="id" value="${esc(s.id)}" type="hidden" />
        <select data-sfield="icon" class="${inp} py-1 text-xs">
          ${IC.SIZE_ICON_OPTIONS.map((o) => `<option value="${o.id}" ${s.icon === o.id ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
        </select>
        <button type="button" class="btn-remove-size w-full text-xs text-brand-red">Quitar</button>
      </div>`).join('');

    return `
      <div class="cafe-opts-panel mt-3 pt-3 border-t border-gray-100 cafe-expanded space-y-4">
        <div>
          <p class="${lbl} mb-2">Tamaños</p>
          <div class="cafe-sizes grid grid-cols-2 sm:grid-cols-3 gap-2">${sizeCards || '<p class="text-xs text-gray-400 col-span-full">Sin tamaños — usa precio base</p>'}</div>
          <button type="button" class="btn-add-size mt-2 text-xs font-semibold text-brand-green">+ Tamaño</button>
        </div>
        <div>
          <p class="${lbl} mb-2">Leches (≥2 activas = selector en carta)</p>
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">${milkToggles || '<p class="text-xs text-gray-400">Añade leches arriba</p>'}</div>
        </div>
        <label class="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 cursor-pointer">
          <input type="checkbox" class="cafe-decaf-toggle w-4 h-4 accent-brand-red" ${hasDecaf ? 'checked' : ''} />
          ${IC.render('caffeine_off', 'w-8 h-8')}
          <span class="text-sm font-medium flex-1">Descafeinado</span>
          <input type="number" step="0.05" min="0" class="cafe-decaf-extra w-20 ${inp} ${hasDecaf ? '' : 'opacity-40'}"
            value="${hasDecaf ? item.decafSurcharge : ''}" ${hasDecaf ? '' : 'disabled'} placeholder="+€" />
        </label>
      </div>`;
  }

  function renderGrouped(key) {
    const sec = menu[key];
    const isCafe = key === 'cafeteria';
    const blocks = (sec.groups || []).map((g, gi) => {
      const cards = (g.items || []).map((it, ii) => {
        const hasSizes = Array.isArray(it.sizes) && it.sizes.length > 0;
        const expanded = hasSizes || (it.milks?.length >= 2) || typeof it.decafSurcharge === 'number';
        return `
          <article class="inv-product-card inv-card group-item relative bg-white rounded-2xl border border-gray-100 p-4 flex flex-col sm:col-span-1 ${expanded ? 'sm:col-span-2 lg:col-span-2' : ''}"
                   data-card="group-product" data-section="${key}" data-gi="${gi}" data-ii="${ii}">
            ${cardRemoveBtn()}
            <div class="flex items-start gap-3 mb-3">
              <div class="inv-card-icon shrink-0 bg-stone-100 border border-stone-200 flex items-center justify-center p-2">
                ${IC.render(isCafe ? 'coffee' : 'beer', 'w-9 h-9')}
              </div>
              <div class="flex-1 min-w-0">
                <input data-field="name" value="${esc(it.name)}" class="${inp} font-semibold mb-1" />
                <div class="flex flex-wrap items-center gap-2">
                  ${hasSizes ? priceBadge(0, 'por tamaño') : `<input data-field="price" type="number" step="0.05" value="${it.price ?? ''}" class="w-24 ${inp} display-font text-lg text-brand-red" placeholder="€" />`}
                </div>
                <div class="flex flex-wrap gap-1 mt-2">${isCafe ? cafeTags(it) : ''}</div>
              </div>
            </div>
            <input data-field="id" value="${esc(it.id)}" class="${inp} font-mono text-[10px] text-gray-400 mb-2" />
            ${isCafe ? `
              <button type="button" class="btn-toggle-cafe-opts w-full text-xs font-semibold text-gray-600 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-100">
                ${expanded ? '▼ Ocultar opciones' : '▶ Tamaños, leche y descafeinado'}
              </button>
              <div class="cafe-opts-wrap ${expanded ? '' : 'hidden'}">${cafeOptionsPanel(it, gi, ii)}</div>
            ` : ''}
          </article>`;
      }).join('');

      return `
        <div class="beb-group mb-10" data-gi="${gi}" data-section="${key}">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-lg">${isCafe ? '☕' : '🍺'}</span>
            <input data-field="gtitle" value="${esc(g.title)}" class="flex-1 display-font text-2xl bg-transparent border-b-2 border-gray-200 focus:border-brand-red outline-none" />
            <button type="button" class="btn-remove-beb-group text-xs font-semibold text-brand-red px-3 py-1 rounded-full border border-red-100">Quitar</button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            ${cards}
            <button type="button" class="btn-add-group-item inv-add-card rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-brand-green p-6" data-gi="${gi}" data-section="${key}">
              <span class="text-2xl">+</span><span class="text-sm font-semibold">${isCafe ? 'Café' : 'Bebida'}</span>
            </button>
          </div>
        </div>`;
    }).join('');

    return sectionShell(key, sec.title || key, isCafe ? 'Toca ▶ en cada café para tamaños y leches' : null, `
      <div data-groups="${key}">${blocks}</div>
      <button type="button" class="btn-add-beb-group mt-2 text-sm font-semibold text-brand-green px-4 py-2 rounded-xl border border-green-200 bg-green-50" data-section="${key}">+ Subgrupo</button>`);
  }

  function renderCafeteria() { return renderGrouped('cafeteria'); }
  function renderBebidas() { return renderGrouped('bebidas'); }

  function renderPorEncargo() {
    const p = menu.porEncargo;
    const cards = (p.items || []).map((it, i) => `
      <article class="inv-product-card inv-card enc-row relative bg-white rounded-2xl border border-purple-100 p-4 flex flex-col" data-card="enc" data-idx="${i}">
        ${cardRemoveBtn()}
        <div class="text-5xl text-center mb-2 enc-emoji-preview">${esc(it.emoji) || '🍽️'}</div>
        <input data-field="emoji" value="${esc(it.emoji)}" class="${inp} text-center text-2xl mb-2 enc-emoji-input" maxlength="4" />
        <input data-field="name" value="${esc(it.name)}" class="${inp} font-semibold mb-2" />
        <textarea data-field="description" rows="2" class="${inp} text-xs flex-1">${esc(it.description)}</textarea>
        <input data-field="id" value="${esc(it.id)}" class="${inp} font-mono text-[10px] text-gray-400 mt-2" />
      </article>`).join('');

    const meta = `<div class="grid sm:grid-cols-2 gap-3 mb-5 p-4 bg-white rounded-2xl border border-purple-100">
      <label><span class="${lbl}">Subtítulo</span><input id="enc-subtitle" value="${esc(p.subtitle || '')}" class="${inp}" /></label>
      <label><span class="${lbl}">Teléfono</span><input id="enc-phone" value="${esc(p.phone || '')}" class="${inp}" /></label>
      <label class="sm:col-span-2"><span class="${lbl}">Nota</span><textarea id="enc-note" rows="2" class="${inp}">${esc(p.note || '')}</textarea></label>
    </div>`;

    return sectionShell('por-encargo', p.title || 'Por encargo', 'Solo informativos en carta', meta + productGrid(cards, 'Plato', 'data-add="enc"'));
  }

  function renderAll() {
    const sections = buildSections();
    navEl.innerHTML = sections.map((s, i) => {
      const meta = IC.SECTION_META[s.id] || {};
      const emoji = s.emoji || meta.emoji || '📦';
      return `<a href="#${s.id}" class="shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition inline-flex items-center gap-1.5
        ${i === 0 ? 'active' : 'bg-gray-100 hover:bg-brand-dark hover:text-white'}">
        <span>${emoji}</span>${esc(s.label)}</a>`;
    }).join('');

    mainEl.innerHTML = sections.map((s) => s.render()).join('');
    bindEvents();
    observeSections(sections);
  }

  function bindEvents() {
    mainEl.querySelectorAll('input, select, textarea').forEach((el) => {
      el.addEventListener('input', () => { syncFromDom(); scheduleSave(); onInputSideEffects(el); });
      el.addEventListener('change', () => { syncFromDom(); scheduleSave(); });
    });
    mainEl.addEventListener('click', onClick);
  }

  function onInputSideEffects(el) {
    if (el.classList.contains('enc-emoji-input')) {
      const preview = el.closest('.enc-row')?.querySelector('.enc-emoji-preview');
      if (preview) preview.textContent = el.value || '🍽️';
    }
    if (el.dataset.field === 'label' && el.closest('.milk-row')) {
      const preview = el.closest('.milk-row')?.querySelector('.icon-preview');
      const iconIn = el.closest('.milk-row')?.querySelector('[data-field="icon"]');
      if (preview && iconIn) preview.innerHTML = IC.render(iconIn.value, 'w-9 h-9');
    }
    if (el.dataset.field === 'code' && el.classList.contains('panini-code-input')) {
      const badge = el.closest('.panini-item')?.querySelector('.panini-code-badge');
      if (badge) badge.textContent = el.value || '00';
    }
  }

  function onClick(e) {
    const pick = e.target.closest('[data-pick-icon]');
    if (pick) {
      const picker = pick.closest('.icon-picker');
      const hidden = picker?.querySelector('[data-field="icon"]');
      if (hidden) {
        hidden.value = pick.dataset.pickIcon;
        picker.querySelectorAll('.icon-pick').forEach((b) => {
          b.classList.toggle('selected', b === pick);
          b.classList.toggle('border-brand-red', b === pick);
          b.classList.toggle('border-gray-200', b !== pick);
        });
        const preview = picker.closest('.milk-row')?.querySelector('.icon-preview');
        if (preview) preview.innerHTML = IC.render(pick.dataset.pickIcon, 'w-9 h-9');
        syncFromDom();
        scheduleSave();
      }
      return;
    }

    if (e.target.closest('.btn-toggle-cafe-opts')) {
      const wrap = e.target.closest('.group-item')?.querySelector('.cafe-opts-wrap');
      if (wrap) {
        wrap.classList.toggle('hidden');
        e.target.closest('.btn-toggle-cafe-opts').textContent =
          wrap.classList.contains('hidden') ? '▶ Tamaños, leche y descafeinado' : '▼ Ocultar opciones';
      }
      return;
    }

    const t = e.target.closest('button');
    if (!t) return;
    syncFromDom();

    if (t.classList.contains('btn-remove')) { handleRemove(t.closest('.inv-card')); return; }
    if (t.id === 'btn-add-panini-group') { menu.panini.push({ group: 'Nuevo grupo', items: [] }); persist(); renderAll(); return; }
    if (t.classList.contains('btn-remove-group')) {
      const gi = parseInt(t.closest('.panini-group')?.dataset.gi, 10);
      if (!isNaN(gi)) { menu.panini.splice(gi, 1); persist(); renderAll(); }
      return;
    }
    if (t.classList.contains('btn-remove-beb-group')) {
      const gEl = t.closest('.beb-group');
      const ci = gEl?.dataset.catIdx;
      const gi = parseInt(gEl?.dataset.gi, 10);
      if (ci != null && !isNaN(gi)) {
        menu.customCategories[parseInt(ci, 10)].groups.splice(gi, 1);
        persist(); renderAll();
        return;
      }
      const key = gEl?.dataset.section;
      if (key && !isNaN(gi) && menu[key]?.groups) {
        menu[key].groups.splice(gi, 1);
        persist(); renderAll();
      }
      return;
    }
    if (t.classList.contains('btn-remove-cat')) {
      const ci = parseInt(t.closest('.cat-meta-card')?.dataset.catIdx, 10);
      if (!isNaN(ci) && confirm('¿Eliminar esta categoría y todos sus productos?')) {
        menu.customCategories.splice(ci, 1);
        persist(); renderAll(); toast('Categoría eliminada');
      }
      return;
    }
    if (t.id === 'btn-create-category') { createCategory(); return; }
    if (t.id === 'btn-scroll-new-cat') {
      document.getElementById('new-cat-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('new-cat-title')?.focus();
      return;
    }
    if (t.classList.contains('btn-remove-size')) {
      t.closest('.cafe-size-row')?.remove();
      syncFromDom(); persist(); return;
    }
    if (t.dataset.add || t.classList.contains('btn-add') || t.classList.contains('btn-add-panini') ||
        t.classList.contains('btn-add-group-item') || t.classList.contains('btn-add-beb-group') || t.classList.contains('btn-add-size')) {
      handleAdd(t);
    }
  }

  mainEl.addEventListener('change', (e) => {
    if (e.target.classList.contains('cafe-milk-cb')) {
      const tile = e.target.closest('.flex.flex-col');
      const ov = tile?.querySelector('.cafe-milk-override');
      tile?.classList.toggle('border-brand-red', e.target.checked);
      tile?.classList.toggle('bg-red-50/50', e.target.checked);
      tile?.classList.toggle('border-gray-100', !e.target.checked);
      if (ov) { ov.disabled = !e.target.checked; ov.classList.toggle('opacity-30', !e.target.checked); }
      syncFromDom(); scheduleSave();
    }
    if (e.target.classList.contains('cafe-decaf-toggle')) {
      const ex = e.target.closest('label')?.querySelector('.cafe-decaf-extra');
      if (ex) { ex.disabled = !e.target.checked; ex.classList.toggle('opacity-40', !e.target.checked); }
      syncFromDom(); scheduleSave();
    }
    if (e.target.dataset?.catField === 'type') {
      const row = e.target.closest('.cat-meta-card');
      const ci = parseInt(row?.dataset.catIdx, 10);
      const cat = menu.customCategories?.[ci];
      if (!cat) return;
      const newType = e.target.value;
      if (newType === cat.type) return;
      if (!confirm('Cambiar el tipo borrará la estructura actual de productos de esta categoría. ¿Continuar?')) {
        e.target.value = cat.type;
        return;
      }
      cat.type = newType;
      if (newType === 'grouped') {
        cat.groups = [{ title: 'General', items: (cat.items || []).map((it) => ({ ...it })) }];
        delete cat.items;
        delete cat.sharedPrice;
        delete cat.note;
      } else {
        cat.items = (cat.groups || []).flatMap((g) => g.items || []);
        delete cat.groups;
      }
      persist();
      renderAll();
    }
  });

  function syncFromDom() {
    syncMilkTypes(); syncPaniniFormats(); syncPanini(); syncMontaditos();
    syncSimple('sandwiches'); syncSimple('platos');
    syncGrouped('cafeteria'); syncGrouped('bebidas'); syncPorEncargo();
    syncCategoryMeta();
    syncCustomCategories();
  }

  function syncCategoryMeta() {
    if (!menu.customCategories) return;
    mainEl.querySelectorAll('.cat-meta-card').forEach((row) => {
      const ci = parseInt(row.dataset.catIdx, 10);
      const cat = menu.customCategories[ci];
      if (!cat) return;
      const title = row.querySelector('[data-cat-field="title"]')?.value.trim();
      if (title) cat.title = title;
      cat.emoji = row.querySelector('[data-cat-field="emoji"]')?.value.trim() || '📦';
      cat.order = parseInt(row.querySelector('[data-cat-field="order"]')?.value, 10);
      if (Number.isNaN(cat.order)) cat.order = 50;
    });
  }

  function syncCustomCategories() {
    if (!menu.customCategories) return;
    menu.customCategories.forEach((cat, ci) => {
      if (cat.type === 'grouped') {
        const sectionKey = `custom-${ci}`;
        const groups = [];
        mainEl.querySelectorAll(`.beb-group[data-cat-idx="${ci}"]`).forEach((gEl) => {
          const items = Array.from(gEl.querySelectorAll('.group-item')).map((row) => ({
            id: row.querySelector('[data-field="id"]')?.value.trim(),
            name: row.querySelector('[data-field="name"]')?.value.trim(),
            price: parseFloat(row.querySelector('[data-field="price"]')?.value) || 0,
          }));
          groups.push({
            title: gEl.querySelector('[data-field="gtitle"]')?.value.trim() || 'Grupo',
            items,
          });
        });
        cat.groups = groups;
        return;
      }
      const noteEl = mainEl.querySelector(`[data-cat-note="${ci}"]`);
      const priceEl = mainEl.querySelector(`[data-cat-shared-price="${ci}"]`);
      if (noteEl) cat.note = noteEl.value;
      if (priceEl && priceEl.value !== '') cat.sharedPrice = parseFloat(priceEl.value) || 0;
      else delete cat.sharedPrice;
      cat.items = Array.from(mainEl.querySelectorAll(`.simple-row[data-cat-idx="${ci}"]`)).map((row) => ({
        id: row.querySelector('[data-field="id"]')?.value.trim(),
        name: row.querySelector('[data-field="name"]')?.value.trim(),
        price: parseFloat(row.querySelector('[data-field="price"]')?.value) || 0,
      }));
    });
  }

  function syncMilkTypes() {
    menu.milkTypes = Array.from(mainEl.querySelectorAll('.milk-row')).map((row) => ({
      id: row.querySelector('[data-field="id"]')?.value.trim() || 'leche',
      label: row.querySelector('[data-field="label"]')?.value.trim() || 'Leche',
      surcharge: parseFloat(row.querySelector('[data-field="surcharge"]')?.value) || 0,
      icon: row.querySelector('[data-field="icon"]')?.value || 'milk_other',
    }));
  }

  function syncPaniniFormats() {
    menu.paniniFormats = Array.from(mainEl.querySelectorAll('.fmt-row')).map((row) => ({
      id: row.querySelector('[data-field="id"]')?.value.trim() || 'fmt',
      label: row.querySelector('[data-field="label"]')?.value.trim(),
      price: parseFloat(row.querySelector('[data-field="price"]')?.value) || 0,
    }));
  }

  function syncPanini() {
    menu.panini = Array.from(mainEl.querySelectorAll('.panini-group')).map((gEl) => ({
      group: gEl.querySelector('[data-field="group"]')?.value.trim() || 'Grupo',
      items: Array.from(gEl.querySelectorAll('.panini-item')).map((row) => ({
        code: row.querySelector('[data-field="code"]')?.value.trim(),
        name: row.querySelector('[data-field="name"]')?.value.trim(),
      })),
    }));
  }

  function syncMontaditos() {
    const note = document.getElementById('mont-note');
    const price = document.getElementById('mont-price');
    if (note) menu.montaditos.note = note.value;
    if (price) menu.montaditos.price = parseFloat(price.value) || 0;
    menu.montaditos.items = Array.from(mainEl.querySelectorAll('.simple-row[data-section="montaditos"]')).map((row) => ({
      id: row.querySelector('[data-field="id"]')?.value.trim(),
      name: row.querySelector('[data-field="name"]')?.value.trim(),
    }));
  }

  function syncSimple(key) {
    menu[key].items = Array.from(mainEl.querySelectorAll(`.simple-row[data-section="${key}"]`)).map((row) => ({
      id: row.querySelector('[data-field="id"]')?.value.trim(),
      name: row.querySelector('[data-field="name"]')?.value.trim(),
      price: parseFloat(row.querySelector('[data-field="price"]')?.value) || 0,
    }));
  }

  function syncGrouped(key) {
    const sec = menu[key];
    sec.groups = Array.from(mainEl.querySelectorAll(`.beb-group[data-section="${key}"]`)).map((gEl) => {
      const items = Array.from(gEl.querySelectorAll('.group-item')).map((row) => {
        const it = {
          id: row.querySelector('[data-field="id"]')?.value.trim(),
          name: row.querySelector('[data-field="name"]')?.value.trim(),
        };
        const priceIn = row.querySelector('[data-field="price"]');
        if (priceIn) it.price = parseFloat(priceIn.value) || 0;
        if (key === 'cafeteria') {
          const sizes = Array.from(row.querySelectorAll('.cafe-size-row')).map((sr) => ({
            id: sr.querySelector('[data-sfield="id"]')?.value.trim() || 'tam',
            label: sr.querySelector('[data-sfield="label"]')?.value.trim() || 'Tamaño',
            price: parseFloat(sr.querySelector('[data-sfield="price"]')?.value) || 0,
            icon: sr.querySelector('[data-sfield="icon"]')?.value,
          })).filter((s) => s.label);
          if (sizes.length) it.sizes = sizes;
          const milks = [];
          const surcharges = {};
          row.querySelectorAll('.cafe-milk-cb:checked').forEach((cb) => {
            milks.push(cb.dataset.milkId);
            const ov = row.querySelector(`.cafe-milk-override[data-milk-id="${cb.dataset.milkId}"]`);
            if (ov?.value !== '') surcharges[cb.dataset.milkId] = parseFloat(ov.value) || 0;
          });
          if (milks.length) it.milks = milks;
          if (Object.keys(surcharges).length) it.milkSurcharges = surcharges;
          if (row.querySelector('.cafe-decaf-toggle')?.checked) {
            it.decafSurcharge = parseFloat(row.querySelector('.cafe-decaf-extra')?.value) || 0;
          }
          if (sizes.length) delete it.price;
        }
        return it;
      });
      return { title: gEl.querySelector('[data-field="gtitle"]')?.value.trim() || 'Grupo', items };
    });
  }

  function syncPorEncargo() {
    const p = menu.porEncargo;
    const sub = document.getElementById('enc-subtitle');
    const ph = document.getElementById('enc-phone');
    const note = document.getElementById('enc-note');
    if (sub) p.subtitle = sub.value;
    if (ph) { p.phone = ph.value; p.phoneTel = ph.value.replace(/\s/g, ''); }
    if (note) p.note = note.value;
    p.items = Array.from(mainEl.querySelectorAll('.enc-row')).map((row) => ({
      id: row.querySelector('[data-field="id"]')?.value.trim(),
      emoji: row.querySelector('[data-field="emoji"]')?.value.trim(),
      name: row.querySelector('[data-field="name"]')?.value.trim(),
      description: row.querySelector('[data-field="description"]')?.value.trim(),
    }));
  }

  function handleRemove(row) {
    if (!row) return;
    if (row.classList.contains('milk-row')) menu.milkTypes.splice(parseInt(row.dataset.idx, 10), 1);
    else if (row.classList.contains('fmt-row')) menu.paniniFormats.splice(parseInt(row.dataset.idx, 10), 1);
    else if (row.classList.contains('panini-item')) {
      menu.panini[parseInt(row.dataset.gi, 10)].items.splice(parseInt(row.dataset.ii, 10), 1);
    }     else if (row.dataset.section === 'montaditos') menu.montaditos.items.splice(parseInt(row.dataset.idx, 10), 1);
    else if (row.classList.contains('simple-row')) {
      if (row.dataset.catIdx != null) {
        menu.customCategories[parseInt(row.dataset.catIdx, 10)].items.splice(parseInt(row.dataset.idx, 10), 1);
      } else {
        menu[row.dataset.section].items.splice(parseInt(row.dataset.idx, 10), 1);
      }
    } else if (row.classList.contains('group-item')) {
      const ci = row.dataset.catIdx;
      if (ci != null && String(row.dataset.section || '').startsWith('custom-')) {
        menu.customCategories[parseInt(ci, 10)].groups[parseInt(row.dataset.gi, 10)].items.splice(parseInt(row.dataset.ii, 10), 1);
      } else {
        menu[row.dataset.section].groups[parseInt(row.dataset.gi, 10)].items.splice(parseInt(row.dataset.ii, 10), 1);
      }
    } else if (row.classList.contains('enc-row')) menu.porEncargo.items.splice(parseInt(row.dataset.idx, 10), 1);
    persist(); renderAll(); toast('Eliminado');
  }

  function handleAdd(t) {
    const add = t.dataset.add;
    const sec = t.closest('section')?.id;

    if (add === 'milk' || (sec === 'milk-types' && t.classList.contains('btn-add'))) {
      menu.milkTypes.push({ id: uniqueId('leche', 'nueva'), label: 'Nueva leche', icon: 'milk_other', surcharge: 0.15 });
    } else if (add === 'fmt' || sec === 'panini-formats') {
      const id = uniqueId('fmt', 'formato');
      menu.paniniFormats.push({ id, label: 'Nuevo formato', price: 3 });
    } else if (t.classList.contains('btn-add-panini')) {
      menu.panini[parseInt(t.dataset.gi, 10)].items.push({ code: '00', name: 'Nuevo panini' });
    } else if (add === 'montadito') {
      menu.montaditos.items.push({ id: uniqueId('mont', 'nuevo'), name: 'Nuevo montadito' });
    } else if (t.dataset.section && t.dataset.add === 'simple') {
      menu[t.dataset.section].items.push({ id: uniqueId('p', 'nuevo'), name: 'Nuevo producto', price: 3 });
    } else if (sec === 'sandwiches' || sec === 'platos') {
      menu[sec].items.push({ id: uniqueId(sec.slice(0, 4), 'nuevo'), name: 'Nuevo producto', price: 3 });
    } else if (add === 'custom-simple') {
      const ci = parseInt(t.dataset.catIdx, 10);
      if (!menu.customCategories[ci].items) menu.customCategories[ci].items = [];
      menu.customCategories[ci].items.push({ id: uniqueId('cat', 'nuevo'), name: 'Nuevo producto', price: 3 });
    } else if (t.classList.contains('btn-add-beb-group') && t.dataset.catIdx != null) {
      const ci = parseInt(t.dataset.catIdx, 10);
      if (!menu.customCategories[ci].groups) menu.customCategories[ci].groups = [];
      menu.customCategories[ci].groups.push({ title: 'Nuevo grupo', items: [] });
    } else if (t.classList.contains('btn-add-beb-group')) {
      menu[t.dataset.section].groups.push({ title: 'Nuevo grupo', items: [] });
    } else if (t.classList.contains('btn-add-group-item') && t.dataset.catIdx != null) {
      const ci = parseInt(t.dataset.catIdx, 10);
      const gi = parseInt(t.dataset.gi, 10);
      menu.customCategories[ci].groups[gi].items.push({ id: uniqueId('prod', 'nuevo'), name: 'Nuevo producto', price: 3 });
    } else if (t.classList.contains('btn-add-group-item')) {
      const key = t.dataset.section;
      const gi = parseInt(t.dataset.gi, 10);
      const item = { id: uniqueId('cafe', 'nuevo'), name: key === 'cafeteria' ? 'Nuevo café' : 'Nueva bebida', price: 1.5 };
      menu[key].groups[gi].items.push(item);
    } else if (t.classList.contains('btn-add-size')) {
      const row = t.closest('.group-item');
      const gi = parseInt(row.dataset.gi, 10);
      const ii = parseInt(row.dataset.ii, 10);
      const it = menu.cafeteria.groups[gi].items[ii];
      if (!it.sizes) it.sizes = [];
      it.sizes.push({ id: 'tam-' + (it.sizes.length + 1), label: 'Nuevo', price: it.price || 1.3, icon: 'size_normal' });
      delete it.price;
    } else if (add === 'enc') {
      menu.porEncargo.items.push({ id: uniqueId('enc', 'plato'), emoji: '🍽️', name: 'Nuevo plato', description: '' });
    }
    persist(); renderAll();
  }

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    if (!confirm('¿Restaurar la carta por defecto?')) return;
    store.reset(); menu = store.get(); renderAll(); toast('Carta restaurada');
  });

  document.getElementById('btn-export')?.addEventListener('click', () => {
    syncFromDom(); persist();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(menu, null, 2)], { type: 'application/json' }));
    a.download = 'menu-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
  });

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navEl.querySelectorAll('a').forEach((a) => {
        const on = a.getAttribute('href') === '#' + en.target.id;
        a.classList.toggle('active', on);
        a.classList.toggle('bg-gray-100', !on);
        a.classList.toggle('hover:bg-brand-dark', !on);
        a.classList.toggle('hover:text-white', !on);
      });
    });
  }, { rootMargin: '-25% 0px -55% 0px' });

  function observeSections(sections) {
    obs.disconnect();
    (sections || buildSections()).forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
  }

  function createCategory() {
    const titleEl = document.getElementById('new-cat-title');
    const title = titleEl?.value.trim();
    if (!title) { toast('Escribe un nombre para la categoría'); titleEl?.focus(); return; }
    const id = uniqueId('cat', title);
    if (RESERVED_CAT_IDS.has(id)) { toast('Ese identificador está reservado — cambia el nombre'); return; }
    if (!menu.customCategories) menu.customCategories = [];
    if (menu.customCategories.some((c) => c.id === id)) { toast('Ya existe una categoría con ese id'); return; }
    const type = document.getElementById('new-cat-type')?.value || 'simple';
    const emoji = document.getElementById('new-cat-emoji')?.value.trim() || '📦';
    const cat = { id, title, emoji, type, order: 50 };
    if (type === 'grouped') cat.groups = [{ title: 'General', items: [] }];
    else cat.items = [];
    menu.customCategories.push(cat);
    persist();
    renderAll();
    toast(`Categoría «${title}» creada`);
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  }

  renderAll();
})();

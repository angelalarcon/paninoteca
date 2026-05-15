/**
 * Editor de inventario / carta para .14 Cafetería.
 * Persiste cambios vía MenuStore (localStorage) y se reflejan en index.html.
 */
(function () {
  const store = window.MenuStore;
  if (!store) {
    document.body.innerHTML = '<p class="p-8 text-red-600">Falta menu-store.js</p>';
    return;
  }

  let menu = store.get();
  let saveTimer = null;

  const mainEl = document.getElementById('inv-main');
  const navEl = document.getElementById('inv-nav');
  const saveStatusEl = document.getElementById('save-status');
  const toastEl = document.getElementById('toast');

  const MILK_ICONS = [
    { id: 'milk_normal', label: 'Leche blanca' },
    { id: 'milk_avena', label: 'Avena' },
    { id: 'milk_soja', label: 'Soja' },
    { id: 'milk_almendra', label: 'Almendra' },
    { id: 'milk_coco', label: 'Coco' },
    { id: 'milk_arroz', label: 'Arroz' },
    { id: 'milk_other', label: 'Genérico' },
  ];
  const SIZE_ICONS = [
    { id: 'size_normal', label: 'Normal' },
    { id: 'size_obrero', label: 'Obrero' },
    { id: 'size_xxl', label: 'XXL' },
  ];

  const SECTIONS = [
    { id: 'milk-types', label: 'Tipos de leche', render: renderMilkTypes },
    { id: 'panini-formats', label: 'Formatos pan', render: renderPaniniFormats },
    { id: 'panini', label: 'Panini', render: renderPanini },
    { id: 'montaditos', label: 'Montaditos', render: renderMontaditos },
    { id: 'sandwiches', label: 'Sandwich', render: () => renderSimpleList('sandwiches') },
    { id: 'platos', label: 'Platos', render: () => renderSimpleList('platos') },
    { id: 'cafeteria', label: 'Cafetería', render: renderCafeteria },
    { id: 'bebidas', label: 'Bebidas', render: renderBebidas },
    { id: 'por-encargo', label: 'Por encargo', render: renderPorEncargo },
  ];

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function slugify(text) {
    return String(text || 'item')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'item';
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
    const walk = (items) => {
      for (const it of items || []) {
        if (it.id) ids.add(it.id);
      }
    };
    for (const g of menu.panini || []) walk(g.items);
    walk(menu.montaditos?.items);
    walk(menu.sandwiches?.items);
    walk(menu.platos?.items);
    for (const g of menu.cafeteria?.groups || []) walk(g.items);
    for (const g of menu.bebidas?.groups || []) walk(g.items);
    walk(menu.porEncargo?.items);
    for (const m of menu.milkTypes || []) ids.add(m.id);
    for (const f of menu.paniniFormats || []) ids.add(f.id);
    return ids;
  }

  function persist() {
    store.save(menu);
    if (saveStatusEl) {
      saveStatusEl.classList.remove('hidden');
      clearTimeout(saveStatusEl._t);
      saveStatusEl._t = setTimeout(() => saveStatusEl.classList.add('hidden'), 2000);
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 400);
  }

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.remove('opacity-0');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.add('opacity-0'), 2500);
  }

  function inputClass() {
    return 'w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-red focus:outline-none';
  }

  function card(title, bodyHtml, extraHeaderHtml) {
    return `
      <section class="inv-section bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b bg-gradient-to-r from-brand-cream to-white flex flex-wrap items-center justify-between gap-2">
          <h2 class="display-font text-3xl text-brand-dark">${esc(title)}</h2>
          ${extraHeaderHtml || ''}
        </div>
        <div class="p-5 space-y-4">${bodyHtml}</div>
      </section>`;
  }

  function btnAdd(label) {
    return `<button type="button" class="btn-add text-sm font-semibold text-brand-green hover:text-green-800 px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 transition">+ ${esc(label)}</button>`;
  }

  function btnRemove() {
    return `<button type="button" class="btn-remove shrink-0 text-xs font-semibold text-brand-red hover:bg-red-50 px-2 py-1 rounded-lg border border-red-100 transition" title="Eliminar">Eliminar</button>`;
  }

  // ---------- Renderers ----------

  function renderMilkTypes() {
    const rows = (menu.milkTypes || []).map((m, i) => `
      <div class="milk-row flex flex-wrap items-end gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100" data-idx="${i}">
        <label class="flex-1 min-w-[120px]">
          <span class="text-xs font-semibold text-gray-500">Id</span>
          <input data-field="id" value="${esc(m.id)}" class="${inputClass()}" />
        </label>
        <label class="flex-[2] min-w-[140px]">
          <span class="text-xs font-semibold text-gray-500">Nombre</span>
          <input data-field="label" value="${esc(m.label)}" class="${inputClass()}" />
        </label>
        <label class="w-28">
          <span class="text-xs font-semibold text-gray-500">Extra €</span>
          <input data-field="surcharge" type="number" step="0.05" min="0" value="${m.surcharge ?? 0}" class="${inputClass()}" />
        </label>
        <label class="w-36">
          <span class="text-xs font-semibold text-gray-500">Icono</span>
          <select data-field="icon" class="${inputClass()}">
            ${MILK_ICONS.map((ic) => `<option value="${ic.id}" ${m.icon === ic.id ? 'selected' : ''}>${esc(ic.label)}</option>`).join('')}
          </select>
        </label>
        ${btnRemove()}
      </div>
    `).join('');

    return card(
      'Tipos de leche',
      `<p class="text-sm text-gray-600">Registro global. Los cafés eligen cuáles ofrecen. El extra se aplica salvo override en el café.</p>
       <div id="milk-list" class="space-y-2">${rows}</div>
       <div class="pt-2">${btnAdd('Tipo de leche')}</div>`,
      '',
    );
  }

  function renderPaniniFormats() {
    const rows = (menu.paniniFormats || []).map((f, i) => `
      <div class="fmt-row flex flex-wrap items-end gap-3 p-3 bg-gray-50 rounded-xl" data-idx="${i}">
        <label class="flex-1 min-w-[100px]"><span class="text-xs text-gray-500">Id</span>
          <input data-field="id" value="${esc(f.id)}" class="${inputClass()}" /></label>
        <label class="flex-[2] min-w-[140px]"><span class="text-xs text-gray-500">Etiqueta</span>
          <input data-field="label" value="${esc(f.label)}" class="${inputClass()}" /></label>
        <label class="w-24"><span class="text-xs text-gray-500">Precio €</span>
          <input data-field="price" type="number" step="0.1" min="0" value="${f.price}" class="${inputClass()}" /></label>
        ${btnRemove()}
      </div>
    `).join('');

    return card('Formatos de pan (Panini)', `
      <div id="fmt-list" class="space-y-2">${rows}</div>
      <div>${btnAdd('Formato')}</div>`);
  }

  function renderPanini() {
    const groups = (menu.panini || []).map((g, gi) => {
      const items = (g.items || []).map((it, ii) => `
        <div class="panini-item flex flex-wrap gap-2 p-2 border-b border-gray-100 last:border-0" data-gi="${gi}" data-ii="${ii}">
          <input data-field="code" value="${esc(it.code)}" placeholder="Cód" class="w-16 ${inputClass()}" />
          <input data-field="name" value="${esc(it.name)}" placeholder="Nombre" class="flex-1 min-w-[160px] ${inputClass()}" />
          ${btnRemove()}
        </div>
      `).join('');
      return `
        <div class="panini-group border border-gray-100 rounded-xl overflow-hidden" data-gi="${gi}">
          <div class="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b">
            <input data-field="group" value="${esc(g.group)}" class="flex-1 font-semibold ${inputClass()}" placeholder="Nombre del grupo" />
            <button type="button" class="btn-remove-group text-xs text-brand-red font-semibold px-2 py-1">Quitar grupo</button>
          </div>
          <div class="panini-items divide-y">${items}</div>
          <div class="p-2"><button type="button" class="btn-add-panini text-xs font-semibold text-brand-green">+ Panini</button></div>
        </div>`;
    }).join('');

    return card('Panini', `
      <div id="panini-groups" class="space-y-4">${groups}</div>
      <button type="button" id="btn-add-panini-group" class="text-sm font-semibold text-brand-green">+ Grupo</button>`);
  }

  function renderMontaditos() {
    const m = menu.montaditos;
    const items = (m.items || []).map((it, i) => simpleRow('montaditos', i, it, false)).join('');
    return card(m.title || 'Montaditos', `
      <div class="flex flex-wrap gap-3 mb-3">
        <label class="flex-1"><span class="text-xs text-gray-500">Nota</span>
          <input id="mont-note" value="${esc(m.note || '')}" class="${inputClass()}" /></label>
        <label class="w-28"><span class="text-xs text-gray-500">Precio único €</span>
          <input id="mont-price" type="number" step="0.05" min="0" value="${m.price}" class="${inputClass()}" /></label>
      </div>
      <div id="mont-items" class="space-y-2">${items}</div>
      <div class="pt-2">${btnAdd('Montadito')}</div>`);
  }

  function renderSimpleList(key) {
    const sec = menu[key];
    const items = (sec.items || []).map((it, i) => simpleRow(key, i, it, true)).join('');
    return card(sec.title || key, `
      <div id="${key}-items" class="space-y-2">${items}</div>
      <div class="pt-2">${btnAdd('Producto')}</div>`);
  }

  function simpleRow(sectionKey, idx, it, withPrice) {
    return `
      <div class="simple-row flex flex-wrap items-end gap-2 p-3 bg-gray-50 rounded-xl" data-section="${sectionKey}" data-idx="${idx}">
        <input data-field="id" value="${esc(it.id)}" placeholder="id" class="w-32 ${inputClass()}" title="Identificador" />
        <input data-field="name" value="${esc(it.name)}" placeholder="Nombre" class="flex-1 min-w-[140px] ${inputClass()}" />
        ${withPrice ? `<input data-field="price" type="number" step="0.05" min="0" value="${it.price}" placeholder="€" class="w-24 ${inputClass()}" />` : ''}
        ${btnRemove()}
      </div>`;
  }

  function cafeOptionsPanel(item) {
    const milks = menu.milkTypes || [];
    const itemMilks = new Set(item.milks || []);
    const hasDecaf = typeof item.decafSurcharge === 'number';
    const sizes = item.sizes || [];

    const milkChecks = milks.map((m) => {
      const override = item.milkSurcharges && typeof item.milkSurcharges[m.id] === 'number'
        ? item.milkSurcharges[m.id] : '';
      return `
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" class="cafe-milk-cb accent-brand-red" data-milk-id="${esc(m.id)}" ${itemMilks.has(m.id) ? 'checked' : ''} />
          <span class="flex-1">${esc(m.label)}</span>
          <input type="number" step="0.05" min="0" placeholder="extra" title="Override extra € (vacío = global)"
                 class="cafe-milk-override w-20 ${inputClass()} ${itemMilks.has(m.id) ? '' : 'opacity-40'}"
                 data-milk-id="${esc(m.id)}" value="${override}" ${itemMilks.has(m.id) ? '' : 'disabled'} />
        </label>`;
    }).join('');

    const sizeRows = sizes.map((s, si) => `
      <div class="cafe-size-row flex flex-wrap gap-2 items-end" data-si="${si}">
        <input data-sfield="id" value="${esc(s.id)}" placeholder="id" class="w-24 ${inputClass()}" />
        <input data-sfield="label" value="${esc(s.label)}" placeholder="Tamaño" class="flex-1 ${inputClass()}" />
        <input data-sfield="price" type="number" step="0.05" min="0" value="${s.price}" class="w-24 ${inputClass()}" />
        <select data-sfield="icon" class="w-32 ${inputClass()}">
          ${SIZE_ICONS.map((ic) => `<option value="${ic.id}" ${s.icon === ic.id ? 'selected' : ''}>${esc(ic.label)}</option>`).join('')}
        </select>
        <button type="button" class="btn-remove-size text-xs text-brand-red">×</button>
      </div>
    `).join('');

    return `
      <details class="cafe-opts mt-2 border border-gray-100 rounded-lg p-2 bg-gray-50/80">
        <summary class="text-xs font-semibold text-gray-600 cursor-pointer select-none">Opciones (tamaños, leche, descafeinado)</summary>
        <div class="mt-3 space-y-3 text-sm">
          <div>
            <p class="text-xs font-semibold text-gray-500 mb-1">Tamaños (si hay alguno, el precio base del café se ignora)</p>
            <div class="cafe-sizes space-y-2">${sizeRows}</div>
            <button type="button" class="btn-add-size text-xs text-brand-green font-semibold mt-1">+ Tamaño</button>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-500 mb-1">Leches disponibles (marca ≥2 para mostrar selector)</p>
            <div class="space-y-1">${milkChecks || '<p class="text-gray-400 text-xs">Añade tipos de leche arriba.</p>'}</div>
          </div>
          <label class="flex items-center gap-2">
            <input type="checkbox" class="cafe-decaf-toggle accent-brand-red" ${hasDecaf ? 'checked' : ''} />
            <span>Permitir descafeinado</span>
            <input type="number" step="0.05" min="0" class="cafe-decaf-extra w-24 ${inputClass()} ${hasDecaf ? '' : 'opacity-40'}"
                   value="${hasDecaf ? item.decafSurcharge : ''}" ${hasDecaf ? '' : 'disabled'} placeholder="extra €" />
          </label>
        </div>
      </details>`;
  }

  function groupedSection(key, titleKey) {
    const sec = menu[key];
    const blocks = (sec.groups || []).map((g, gi) => {
      const items = (g.items || []).map((it, ii) => {
        const isCafe = key === 'cafeteria';
        const priceField = Array.isArray(it.sizes) && it.sizes.length
          ? `<span class="text-xs text-gray-400 w-24 self-center">por tamaño</span>`
          : `<input data-field="price" type="number" step="0.05" min="0" value="${it.price ?? ''}" class="w-24 ${inputClass()}" placeholder="€" />`;
        return `
          <div class="group-item p-3 border-b border-gray-50 last:border-0" data-gi="${gi}" data-ii="${ii}" data-section="${key}">
            <div class="flex flex-wrap items-end gap-2">
              <input data-field="id" value="${esc(it.id)}" class="w-28 ${inputClass()}" />
              <input data-field="name" value="${esc(it.name)}" class="flex-1 min-w-[120px] ${inputClass()}" />
              ${priceField}
              ${btnRemove()}
            </div>
            ${isCafe ? cafeOptionsPanel(it) : ''}
          </div>`;
      }).join('');
      return `
        <div class="beb-group border border-gray-100 rounded-xl overflow-hidden mb-4" data-gi="${gi}" data-section="${key}">
          <div class="flex gap-2 px-3 py-2 bg-gray-50 border-b">
            <input data-field="gtitle" value="${esc(g.title)}" class="flex-1 font-semibold ${inputClass()}" />
            <button type="button" class="btn-remove-beb-group text-xs text-brand-red font-semibold">Quitar subgrupo</button>
          </div>
          <div class="group-items">${items}</div>
          <div class="p-2"><button type="button" class="btn-add-group-item text-xs font-semibold text-brand-green">+ Producto</button></div>
        </div>`;
    }).join('');

    return card(sec[titleKey] || sec.title || key, `
      <div data-groups="${key}">${blocks}</div>
      <button type="button" class="btn-add-beb-group text-sm font-semibold text-brand-green" data-section="${key}">+ Subgrupo</button>`);
  }

  function renderCafeteria() {
    return groupedSection('cafeteria', 'title');
  }

  function renderBebidas() {
    return groupedSection('bebidas', 'title');
  }

  function renderPorEncargo() {
    const p = menu.porEncargo;
    const items = (p.items || []).map((it, i) => `
      <div class="enc-row p-3 bg-gray-50 rounded-xl space-y-2" data-idx="${i}">
        <div class="flex flex-wrap gap-2">
          <input data-field="emoji" value="${esc(it.emoji)}" class="w-14 ${inputClass()}" placeholder="🍕" />
          <input data-field="id" value="${esc(it.id)}" class="w-32 ${inputClass()}" />
          <input data-field="name" value="${esc(it.name)}" class="flex-1 ${inputClass()}" />
          ${btnRemove()}
        </div>
        <textarea data-field="description" rows="2" class="${inputClass()}">${esc(it.description)}</textarea>
      </div>
    `).join('');

    return card(p.title || 'Por encargo', `
      <div class="grid sm:grid-cols-2 gap-3 mb-3">
        <label><span class="text-xs text-gray-500">Subtítulo</span>
          <input id="enc-subtitle" value="${esc(p.subtitle || '')}" class="${inputClass()}" /></label>
        <label><span class="text-xs text-gray-500">Teléfono</span>
          <input id="enc-phone" value="${esc(p.phone || '')}" class="${inputClass()}" /></label>
      </div>
      <label class="block mb-3"><span class="text-xs text-gray-500">Nota</span>
        <textarea id="enc-note" rows="2" class="${inputClass()}">${esc(p.note || '')}</textarea></label>
      <div id="enc-items" class="space-y-2">${items}</div>
      <div class="pt-2">${btnAdd('Plato por encargo')}</div>`);
  }

  function renderAll() {
    navEl.innerHTML = SECTIONS.map((s, i) =>
      `<a href="#${s.id}" class="shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition ${i === 0 ? 'active' : 'bg-gray-100 hover:bg-brand-dark hover:text-white'}">${esc(s.label)}</a>`
    ).join('');

    mainEl.innerHTML = SECTIONS.map((s) => {
      const html = s.render();
      return html.replace('<section class="inv-section', `<section id="${s.id}" class="inv-section`);
    }).join('');

    bindEvents();
  }

  // ---------- Event binding (delegation) ----------

  function bindEvents() {
    mainEl.querySelectorAll('input, select, textarea').forEach((el) => {
      el.addEventListener('change', onFieldChange);
      el.addEventListener('input', onFieldChange);
    });

    mainEl.addEventListener('click', onClick);
  }

  function onFieldChange(e) {
    const el = e.target;
    syncFromDom();
    scheduleSave();
  }

  function syncFromDom() {
    syncMilkTypes();
    syncPaniniFormats();
    syncPanini();
    syncMontaditos();
    syncSimple('sandwiches');
    syncSimple('platos');
    syncGrouped('cafeteria');
    syncGrouped('bebidas');
    syncPorEncargo();
  }

  function syncMilkTypes() {
    menu.milkTypes = Array.from(mainEl.querySelectorAll('.milk-row')).map((row) => ({
      id: row.querySelector('[data-field="id"]').value.trim() || 'leche',
      label: row.querySelector('[data-field="label"]').value.trim() || 'Leche',
      surcharge: parseFloat(row.querySelector('[data-field="surcharge"]').value) || 0,
      icon: row.querySelector('[data-field="icon"]').value,
    }));
  }

  function syncPaniniFormats() {
    menu.paniniFormats = Array.from(mainEl.querySelectorAll('.fmt-row')).map((row) => ({
      id: row.querySelector('[data-field="id"]').value.trim(),
      label: row.querySelector('[data-field="label"]').value.trim(),
      price: parseFloat(row.querySelector('[data-field="price"]').value) || 0,
    }));
  }

  function syncPanini() {
    menu.panini = Array.from(mainEl.querySelectorAll('.panini-group')).map((gEl) => ({
      group: gEl.querySelector('[data-field="group"]').value.trim() || 'Grupo',
      items: Array.from(gEl.querySelectorAll('.panini-item')).map((row) => ({
        code: row.querySelector('[data-field="code"]').value.trim(),
        name: row.querySelector('[data-field="name"]').value.trim(),
      })),
    }));
  }

  function syncMontaditos() {
    const note = document.getElementById('mont-note');
    const price = document.getElementById('mont-price');
    if (note) menu.montaditos.note = note.value;
    if (price) menu.montaditos.price = parseFloat(price.value) || 0;
    menu.montaditos.items = Array.from(mainEl.querySelectorAll('[data-section="montaditos"]')).map((row) => ({
      id: row.querySelector('[data-field="id"]').value.trim(),
      name: row.querySelector('[data-field="name"]').value.trim(),
    }));
  }

  function syncSimple(key) {
    menu[key].items = Array.from(mainEl.querySelectorAll(`.simple-row[data-section="${key}"]`)).map((row) => ({
      id: row.querySelector('[data-field="id"]').value.trim(),
      name: row.querySelector('[data-field="name"]').value.trim(),
      price: parseFloat(row.querySelector('[data-field="price"]').value) || 0,
    }));
  }

  function syncGrouped(key) {
    const sec = menu[key];
    sec.groups = Array.from(mainEl.querySelectorAll(`.beb-group[data-section="${key}"]`)).map((gEl) => {
      const items = Array.from(gEl.querySelectorAll('.group-item')).map((row) => {
        const it = {
          id: row.querySelector('[data-field="id"]').value.trim(),
          name: row.querySelector('[data-field="name"]').value.trim(),
        };
        const priceIn = row.querySelector('[data-field="price"]');
        if (priceIn) it.price = parseFloat(priceIn.value) || 0;

        if (key === 'cafeteria') {
          const sizes = Array.from(row.querySelectorAll('.cafe-size-row')).map((sr) => ({
            id: sr.querySelector('[data-sfield="id"]').value.trim() || 'tam',
            label: sr.querySelector('[data-sfield="label"]').value.trim() || 'Tamaño',
            price: parseFloat(sr.querySelector('[data-sfield="price"]').value) || 0,
            icon: sr.querySelector('[data-sfield="icon"]').value,
          })).filter((s) => s.label);
          if (sizes.length) it.sizes = sizes;

          const milks = [];
          const surcharges = {};
          row.querySelectorAll('.cafe-milk-cb:checked').forEach((cb) => {
            const mid = cb.dataset.milkId;
            milks.push(mid);
            const ov = row.querySelector(`.cafe-milk-override[data-milk-id="${mid}"]`);
            if (ov && ov.value !== '') surcharges[mid] = parseFloat(ov.value) || 0;
          });
          if (milks.length) it.milks = milks;
          if (Object.keys(surcharges).length) it.milkSurcharges = surcharges;

          const decafOn = row.querySelector('.cafe-decaf-toggle')?.checked;
          if (decafOn) {
            const ex = row.querySelector('.cafe-decaf-extra');
            it.decafSurcharge = parseFloat(ex?.value) || 0;
          }
          if (sizes.length) delete it.price;
        }
        return it;
      });
      return {
        title: gEl.querySelector('[data-field="gtitle"]').value.trim() || 'Grupo',
        items,
      };
    });
  }

  function syncPorEncargo() {
    const p = menu.porEncargo;
    const sub = document.getElementById('enc-subtitle');
    const ph = document.getElementById('enc-phone');
    const note = document.getElementById('enc-note');
    if (sub) p.subtitle = sub.value;
    if (ph) {
      p.phone = ph.value;
      p.phoneTel = ph.value.replace(/\s/g, '');
    }
    if (note) p.note = note.value;
    p.items = Array.from(mainEl.querySelectorAll('.enc-row')).map((row) => ({
      id: row.querySelector('[data-field="id"]').value.trim(),
      emoji: row.querySelector('[data-field="emoji"]').value.trim(),
      name: row.querySelector('[data-field="name"]').value.trim(),
      description: row.querySelector('[data-field="description"]').value.trim(),
    }));
  }

  function onClick(e) {
    const t = e.target.closest('button');
    if (!t) return;

    syncFromDom();

    if (t.id === 'btn-add-panini-group') {
      menu.panini.push({ group: 'Nuevo grupo', items: [] });
      persist(); renderAll(); return;
    }

    if (t.classList.contains('btn-remove')) {
      const row = t.closest('[data-idx], .milk-row, .fmt-row, .simple-row, .enc-row, .panini-item, .group-item');
      handleRemove(row);
      return;
    }

    if (t.classList.contains('btn-add') || t.classList.contains('btn-add-panini') || t.classList.contains('btn-add-group-item') || t.classList.contains('btn-add-beb-group') || t.classList.contains('btn-add-size')) {
      handleAdd(t);
    }

    if (t.classList.contains('btn-remove-group')) {
      const gi = parseInt(t.closest('.panini-group')?.dataset.gi, 10);
      if (!isNaN(gi)) { menu.panini.splice(gi, 1); persist(); renderAll(); }
    }
    if (t.classList.contains('btn-remove-beb-group')) {
      const gEl = t.closest('.beb-group');
      const key = gEl?.dataset.section;
      const gi = parseInt(gEl?.dataset.gi, 10);
      if (key && !isNaN(gi)) { menu[key].groups.splice(gi, 1); persist(); renderAll(); }
    }
    if (t.classList.contains('btn-remove-size')) {
      const itemEl = t.closest('.group-item');
      t.closest('.cafe-size-row')?.remove();
      syncFromDom();
      persist();
      return;
    }

    if (t.classList.contains('cafe-milk-cb')) return;
  }

  function handleRemove(row) {
    if (!row) return;
    if (row.classList.contains('milk-row')) {
      const i = parseInt(row.dataset.idx, 10);
      menu.milkTypes.splice(i, 1);
    } else if (row.classList.contains('fmt-row')) {
      menu.paniniFormats.splice(parseInt(row.dataset.idx, 10), 1);
    } else if (row.classList.contains('panini-item')) {
      const gi = parseInt(row.dataset.gi, 10);
      const ii = parseInt(row.dataset.ii, 10);
      menu.panini[gi].items.splice(ii, 1);
    } else if (row.dataset.section === 'montaditos') {
      menu.montaditos.items.splice(parseInt(row.dataset.idx, 10), 1);
    } else if (row.classList.contains('simple-row')) {
      menu[row.dataset.section].items.splice(parseInt(row.dataset.idx, 10), 1);
    } else if (row.classList.contains('group-item')) {
      const key = row.dataset.section;
      menu[key].groups[parseInt(row.dataset.gi, 10)].items.splice(parseInt(row.dataset.ii, 10), 1);
    } else if (row.classList.contains('enc-row')) {
      menu.porEncargo.items.splice(parseInt(row.dataset.idx, 10), 1);
    }
    persist();
    renderAll();
    toast('Eliminado');
  }

  function handleAdd(t) {
    const sec = t.closest('section')?.id;

    if (sec === 'milk-types' || (t.classList.contains('btn-add') && t.textContent.includes('leche'))) {
      menu.milkTypes.push({ id: uniqueId('leche', 'nueva'), label: 'Nueva leche', icon: 'milk_other', surcharge: 0.15 });
    } else if (sec === 'panini-formats') {
      menu.paniniFormats.push({ id: uniqueId('fmt', 'formato'), label: 'Nuevo formato', price: 3 });
    } else if (t.classList.contains('btn-add-panini')) {
      const gi = parseInt(t.closest('.panini-group')?.dataset.gi, 10);
      menu.panini[gi].items.push({ code: '00', name: 'Nuevo panini' });
    } else if (sec === 'montaditos') {
      const name = 'Nuevo montadito';
      menu.montaditos.items.push({ id: uniqueId('mont', name), name });
    } else if (sec === 'sandwiches' || sec === 'platos') {
      const name = 'Nuevo producto';
      menu[sec].items.push({ id: uniqueId(sec.slice(0, 4), name), name, price: 3 });
    } else if (t.classList.contains('btn-add-beb-group')) {
      const key = t.dataset.section;
      menu[key].groups.push({ title: 'Nuevo grupo', items: [] });
    } else if (t.classList.contains('btn-add-group-item')) {
      const gEl = t.closest('.beb-group');
      const key = gEl.dataset.section;
      const gi = parseInt(gEl.dataset.gi, 10);
      const name = 'Nuevo producto';
      const item = { id: uniqueId('prod', name), name, price: 1.5 };
      menu[key].groups[gi].items.push(item);
    } else if (t.classList.contains('btn-add-size')) {
      const row = t.closest('.group-item');
      const gi = parseInt(row.dataset.gi, 10);
      const ii = parseInt(row.dataset.ii, 10);
      const it = menu.cafeteria.groups[gi].items[ii];
      if (!it.sizes) it.sizes = [];
      it.sizes.push({ id: 'tam-' + (it.sizes.length + 1), label: 'Nuevo', price: it.price || 1.3, icon: 'size_normal' });
      delete it.price;
    } else if (sec === 'por-encargo') {
      menu.porEncargo.items.push({ id: uniqueId('enc', 'plato'), emoji: '🍽️', name: 'Nuevo plato', description: '' });
    }

    persist();
    renderAll();
  }

  // Milk checkbox enable/disable overrides
  mainEl.addEventListener('change', (e) => {
    if (e.target.classList.contains('cafe-milk-cb')) {
      const row = e.target.closest('.group-item');
      const ov = row?.querySelector(`.cafe-milk-override[data-milk-id="${e.target.dataset.milkId}"]`);
      if (ov) {
        ov.disabled = !e.target.checked;
        ov.classList.toggle('opacity-40', !e.target.checked);
      }
      syncFromDom();
      scheduleSave();
    }
    if (e.target.classList.contains('cafe-decaf-toggle')) {
      const row = e.target.closest('.group-item');
      const ex = row?.querySelector('.cafe-decaf-extra');
      if (ex) {
        ex.disabled = !e.target.checked;
        ex.classList.toggle('opacity-40', !e.target.checked);
      }
      syncFromDom();
      scheduleSave();
    }
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    if (!confirm('¿Restaurar la carta a los valores por defecto? Se perderán los cambios guardados.')) return;
    store.reset();
    menu = store.get();
    renderAll();
    toast('Carta restaurada');
  });

  document.getElementById('btn-export')?.addEventListener('click', () => {
    syncFromDom();
    persist();
    const blob = new Blob([JSON.stringify(menu, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'menu-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // Nav highlight on scroll
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        navEl.querySelectorAll('a').forEach((a) => {
          a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id);
          a.classList.toggle('bg-gray-100', a.getAttribute('href') !== '#' + en.target.id);
        });
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  function observeSections() {
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
  }

  renderAll();
  observeSections();
})();

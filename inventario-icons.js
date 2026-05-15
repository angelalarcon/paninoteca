/**
 * Iconos SVG compartidos entre la carta (index.html) y el inventario.
 * Expone window.InventarioIcons con render(id, className).
 */
(function () {
  const SVG = {
    bocadillo: `<svg viewBox="0 0 36 20" xmlns="http://www.w3.org/2000/svg"><ellipse cx="18" cy="11" rx="15" ry="6" fill="#eabb7d" stroke="#a8753a" stroke-width="1.2"/><path d="M6 9 Q9 5 12 8" fill="none" stroke="#8b5e2b" stroke-width="1.2" stroke-linecap="round"/><path d="M15 9 Q18 5 21 8" fill="none" stroke="#8b5e2b" stroke-width="1.2" stroke-linecap="round"/><path d="M24 9 Q27 5 30 8" fill="none" stroke="#8b5e2b" stroke-width="1.2" stroke-linecap="round"/></svg>`,
    medio: `<svg viewBox="0 0 36 20" xmlns="http://www.w3.org/2000/svg"><path d="M13 5 Q26 5 26 11 Q26 17 13 17 Z" fill="#eabb7d" stroke="#a8753a" stroke-width="1.2"/><ellipse cx="13" cy="11" rx="1.8" ry="6" fill="#fff3dc" stroke="#a8753a" stroke-width="1"/></svg>`,
    pulguita: `<svg viewBox="0 0 36 20" xmlns="http://www.w3.org/2000/svg"><ellipse cx="18" cy="11" rx="7" ry="5" fill="#b8794a" stroke="#5e3a1d" stroke-width="1.2"/><circle cx="15.5" cy="9" r="0.7" fill="#3a2410"/><circle cx="18.5" cy="11" r="0.7" fill="#3a2410"/></svg>`,
    barra: `<svg viewBox="0 0 36 20" xmlns="http://www.w3.org/2000/svg"><ellipse cx="18" cy="11" rx="17" ry="4.5" fill="#eabb7d" stroke="#a8753a" stroke-width="1.2"/></svg>`,
    milk_normal: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 3 C12 3 6 10 6 14 A6 6 0 0 0 18 14 C18 10 12 3 12 3 Z" fill="#fff" stroke="#5e7eb6" stroke-width="1.2"/></svg>`,
    milk_avena: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 3 C12 3 6 10 6 14 A6 6 0 0 0 18 14 C18 10 12 3 12 3 Z" fill="#e8d09b" stroke="#a8753a" stroke-width="1.2"/></svg>`,
    milk_soja: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 3 C12 3 6 10 6 14 A6 6 0 0 0 18 14 C18 10 12 3 12 3 Z" fill="#f4ecd0" stroke="#7c8a3c" stroke-width="1.2"/><circle cx="12" cy="12" r="1" fill="#a4b85a"/></svg>`,
    milk_almendra: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 3 C12 3 6 10 6 14 A6 6 0 0 0 18 14 C18 10 12 3 12 3 Z" fill="#f4e3cf" stroke="#8b5e2b" stroke-width="1.2"/></svg>`,
    milk_coco: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 3 C12 3 6 10 6 14 A6 6 0 0 0 18 14 C18 10 12 3 12 3 Z" fill="#fff" stroke="#5e3a1d" stroke-width="1.2"/></svg>`,
    milk_arroz: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 3 C12 3 6 10 6 14 A6 6 0 0 0 18 14 C18 10 12 3 12 3 Z" fill="#fbf6e8" stroke="#c9a85a" stroke-width="1.2"/></svg>`,
    milk_other: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 3 C12 3 6 10 6 14 A6 6 0 0 0 18 14 C18 10 12 3 12 3 Z" fill="#f5f5f5" stroke="#888" stroke-width="1.2"/></svg>`,
    size_normal: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M9 11 L9.5 19 Q9.5 20 10.5 20 L13.5 20 Q14.5 20 14.5 19 L15 11 Z" fill="#fff8eb" stroke="#3a2410" stroke-width="1.2"/><ellipse cx="12" cy="11" rx="3" ry="0.6" fill="#6b3a14"/></svg>`,
    size_obrero: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7 8 L7.5 19 Q7.5 20 8.5 20 L15.5 20 Q16.5 20 16.5 19 L17 8 Z" fill="#fff8eb" stroke="#3a2410" stroke-width="1.2"/><ellipse cx="12" cy="8" rx="4.6" ry="0.7" fill="#6b3a14"/></svg>`,
    size_xxl: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5 5 L6 19 Q6 20 7 20 L17 20 Q18 20 18 19 L19 5 Z" fill="#fff8eb" stroke="#3a2410" stroke-width="1.2"/><ellipse cx="12" cy="5" rx="6.6" ry="0.8" fill="#6b3a14"/></svg>`,
    caffeine_on: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="12" rx="5" ry="8" transform="rotate(-25 12 12)" fill="#6b3a14"/></svg>`,
    caffeine_off: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="12" rx="5" ry="8" transform="rotate(-25 12 12)" fill="#cbb29a"/><line x1="4" y1="20" x2="20" y2="4" stroke="#d8232a" stroke-width="2.5"/></svg>`,
    coffee: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 8h10v8a4 4 0 01-4 4H8a2 2 0 01-2-2V8z" fill="#fff8eb" stroke="#3a2410" stroke-width="1.2"/><path d="M16 10h2a2 2 0 010 4h-2" fill="none" stroke="#3a2410" stroke-width="1.2"/><ellipse cx="11" cy="8" rx="4" ry="1" fill="#6b3a14"/></svg>`,
    sandwich: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="16" height="10" rx="2" fill="#eabb7d" stroke="#a8753a" stroke-width="1.2"/><path d="M4 12h16" stroke="#8b5e2b" stroke-width="1"/></svg>`,
    plate: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="14" rx="9" ry="4" fill="#f5f5f5" stroke="#ccc" stroke-width="1.2"/><ellipse cx="12" cy="12" rx="5" ry="3" fill="#eabb7d" stroke="#a8753a" stroke-width="1"/></svg>`,
    beer: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8 4h8v16H8z" fill="#f5d76e" stroke="#c9a227" stroke-width="1.2"/><path d="M16 6h2v4h-2" fill="#fff" stroke="#c9a227" stroke-width="1"/></svg>`,
    montadito: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="14" rx="8" ry="3" fill="#eabb7d" stroke="#a8753a" stroke-width="1.2"/></svg>`,
  };

  const BREAD_IDS = ['bocadillo', 'medio', 'pulguita', 'barra'];
  const MILK_ICON_OPTIONS = [
    { id: 'milk_normal', label: 'Normal' },
    { id: 'milk_avena', label: 'Avena' },
    { id: 'milk_soja', label: 'Soja' },
    { id: 'milk_almendra', label: 'Almendra' },
    { id: 'milk_coco', label: 'Coco' },
    { id: 'milk_arroz', label: 'Arroz' },
    { id: 'milk_other', label: 'Otro' },
  ];
  const SIZE_ICON_OPTIONS = [
    { id: 'size_normal', label: 'Normal' },
    { id: 'size_obrero', label: 'Obrero' },
    { id: 'size_xxl', label: 'XXL' },
  ];

  const SECTION_META = {
    categorias: { emoji: '➕', color: 'bg-emerald-50 border-emerald-200' },
    'milk-types': { emoji: '🥛', color: 'bg-blue-50 border-blue-100' },
    'panini-formats': { emoji: '🥖', color: 'bg-amber-50 border-amber-100' },
    panini: { emoji: '🥪', color: 'bg-orange-50 border-orange-100' },
    montaditos: { emoji: '🍞', color: 'bg-yellow-50 border-yellow-100' },
    sandwiches: { emoji: '🥪', color: 'bg-lime-50 border-lime-100' },
    platos: { emoji: '🍽️', color: 'bg-teal-50 border-teal-100' },
    cafeteria: { emoji: '☕', color: 'bg-stone-100 border-stone-200' },
    bebidas: { emoji: '🍺', color: 'bg-sky-50 border-sky-100' },
    'por-encargo': { emoji: '⭐', color: 'bg-purple-50 border-purple-100' },
  };

  function render(id, className) {
    const svg = SVG[id] || SVG.milk_other;
    const cls = className || 'w-10 h-10';
    return `<span class="inv-icon inline-flex items-center justify-center ${cls}" data-icon-id="${id}">${svg}</span>`;
  }

  function breadIcon(fmtId) {
    return render(BREAD_IDS.includes(fmtId) ? fmtId : 'bocadillo', 'w-12 h-7');
  }

  window.InventarioIcons = {
    SVG,
    BREAD_IDS,
    MILK_ICON_OPTIONS,
    SIZE_ICON_OPTIONS,
    SECTION_META,
    render,
    breadIcon,
  };
})();

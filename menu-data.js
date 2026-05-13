/**
 * Datos del menú extraídos de la carta física de .14 Cafeteria/Paninoteca.
 *
 * - Los PANINI tienen un código (01, 31, 60, etc.) y se pueden pedir en
 *   distintos formatos (Bocadillo, 1/2 Bocadillo, Pulguita Integral o
 *   Barra Entera) que determinan el precio.
 * - El resto de secciones (Montaditos, Sandwich/Toast, Platos) tienen
 *   un precio fijo por unidad.
 */

window.MENU_DATA = {
  paniniFormats: [
    { id: 'bocadillo', label: 'Bocadillo', price: 3.5 },
    { id: 'medio',     label: '1/2 Bocadillo', price: 2.5 },
    { id: 'pulguita',  label: 'Pulguita Integral', price: 2.5 },
    { id: 'barra',     label: 'Barra Entera (para compartir)', price: 9.9 },
  ],

  panini: [
    {
      group: 'Queso Blanco',
      items: [
        { code: '01', name: 'Blanco / Tomate' },
        { code: '02', name: 'Blanco / Aceite / Orégano' },
        { code: '03', name: 'Blanco / Verdura Salteada' },
        { code: '04', name: 'Blanco / Membrillo' },
        { code: '05', name: 'Blanco / Cebolla Roja' },
      ],
    },
    {
      group: 'Queso Manchego',
      items: [
        { code: '11', name: 'Manchego / Tomate' },
        { code: '12', name: 'Manchego / Pimiento / Cebolla' },
      ],
    },
    {
      group: 'Tortilla Española',
      items: [
        { code: '31', name: 'Española / Tomate / Mayo / Lechuga' },
        { code: '32', name: 'Española / Queso Amarillo / Tomate / Lechuga' },
        { code: '34', name: 'Española / Verdura Salteada / Queso Amarillo' },
      ],
    },
    {
      group: 'Cochino',
      items: [
        { code: '60', name: 'Cochino / Queso Amarillo / Tomate' },
        { code: '61', name: 'Cochino / Queso Amarillo / Mojo Rojo' },
        { code: '62', name: 'Cochino / Cebolla Roja / Tomate' },
        { code: '63', name: 'Cochino / Verdura Salteada / Queso Amarillo' },
      ],
    },
    {
      group: 'Pata Asada a Leña',
      items: [
        { code: '40', name: 'Pata / Tomate / Alioli' },
        { code: '41', name: 'Pata / Tomate / Mojo Rojo' },
        { code: '42', name: 'Pata / Queso Amarillo / Tomate' },
        { code: '43', name: 'Pata / Verdura Salteada / Queso Amarillo' },
      ],
    },
    {
      group: 'Pechuga de Pollo',
      items: [
        { code: '70', name: 'Pechuga / Queso Amarillo / Tomate' },
        { code: '71', name: 'Pechuga / Queso Amarillo / Mojo Rojo' },
        { code: '73', name: 'Pechuga / Verdura Salteada / Queso Amarillo' },
      ],
    },
    {
      group: 'Jamón Cocido',
      items: [
        { code: '80', name: 'Cocido / Queso Amarillo / Tomate / Lechuga' },
      ],
    },
    {
      group: 'Lomo Adobado',
      items: [
        { code: '90', name: 'Lomo / Queso Amarillo / Tomate / Lechuga' },
        { code: '91', name: 'Lomo / Verdura Salteada / Queso Amarillo' },
      ],
    },
    {
      group: 'Mortadella',
      items: [
        { code: '121', name: 'Mortadella / Queso Amarillo / Tumaca' },
      ],
    },
    {
      group: 'Pancetta',
      items: [
        { code: '131', name: 'Pancetta / Verdura Salteada / Queso Amarillo' },
      ],
    },
  ],

  montaditos: {
    title: 'Montaditos',
    note: '1 Solo Ingrediente',
    price: 1.6,
    items: [
      { id: 'mont-jamon',     name: 'Jamón Cocido' },
      { id: 'mont-mortadella',name: 'Mortadella' },
      { id: 'mont-pata',      name: 'Pata Asada a Leña' },
      { id: 'mont-manchego',  name: 'Manchego' },
      { id: 'mont-membrillo', name: 'Membrillo' },
    ],
  },

  sandwiches: {
    title: 'Sandwich / Toast',
    items: [
      { id: 'sand-mixto',     name: 'Mixto — Jamón Cocido / Queso Amarillo', price: 3.0 },
      { id: 'sand-151',       name: '151 — Mortadella / Amarillo / Tomate', price: 3.0 },
      { id: 'sand-153',       name: '153 — Patata Asada a Leña / Queso / Tumaca', price: 3.0 },
      { id: 'sand-blanco',    name: 'Queso Blanco / Tomate', price: 3.0 },
      { id: 'sand-155',       name: '155 — Lomo / Amarillo / Tomate', price: 3.0 },
      { id: 'sand-americano', name: 'Americano — Pancetta / Cebolla / Huevo / Tomate / Lechuga', price: 4.9 },
    ],
  },

  platos: {
    title: 'Platos',
    items: [
      { id: 'plato-pincho',           name: 'Pincho de Tortilla', price: 2.8 },
      { id: 'plato-ensaladilla',      name: 'Ensaladilla', price: 3.9 },
      { id: 'plato-omelette',         name: 'Omelette (francesa / jamón / queso amarillo)', price: 4.5 },
      { id: 'plato-huevo-pancetta',   name: 'Huevo Frito / Pancetta', price: 3.5 },
      { id: 'plato-caprese',          name: 'Caprese (queso blanco / tomate / orégano / aceite oliva)', price: 4.9 },
      { id: 'plato-pata-x1',          name: 'Pata Asada a Leña (x1)', price: 4.9 },
      { id: 'plato-pata-x2',          name: 'Pata Asada a Leña (x2)', price: 8.9 },
      { id: 'plato-pata-ensaladilla', name: 'Pata + Ensaladilla', price: 7.5 },
      { id: 'plato-pata-verdura',     name: 'Pata Asada a Leña / Verdura Salteada / Tomate', price: 7.5 },
      { id: 'plato-pata-tortilla',    name: 'Pata Asada a Leña / Tortilla Española / Verdura Salteada', price: 8.9 },
      { id: 'plato-pata-huevo',       name: 'Pata Asada a Leña / Huevo Frito / Pancetta', price: 8.9 },
      { id: 'plato-pata-gorgonzola',  name: 'Pata Asada a Leña / Gorgonzola / Tomate', price: 8.9 },
      { id: 'plato-pollo-verdura',    name: 'Pechuga de Pollo / Verdura Salteada / Tomate', price: 7.5 },
      { id: 'plato-pollo-champis',    name: 'Pechuga de Pollo / Champiñones / Papas', price: 8.9 },
      { id: 'plato-tortilla-gorgo',   name: 'Tortilla Española / Gorgonzola / Tomate', price: 8.9 },
      { id: 'plato-lomo-pancetta',    name: 'Lomo / Pancetta / Huevo / Tomate', price: 8.8 },
      { id: 'plato-tortilla-ensa',    name: 'Tortilla / Ensaladilla / Tomate', price: 7.5 },
    ],
  },
};

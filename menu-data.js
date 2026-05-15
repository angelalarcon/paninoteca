/**
 * Datos del menú extraídos de la carta física de .14 Cafeteria/Paninoteca
 * (versión PDF Menu.14, marzo 2025).
 *
 * - Los PANINI tienen un código (01, 31, 60, etc.) y se pueden pedir en
 *   distintos formatos (Bocadillo, 1/2 Bocadillo, Pulguita Integral o
 *   Barra Entera) que determinan el precio.
 * - Los CAFÉS pueden definir opciones adicionales en el propio item:
 *     • `sizes`            → variantes de tamaño con su precio.
 *     • `milks`            → array de ids de leches admitidas (ver
 *                            `milkTypes` global). Si está presente y tiene
 *                            ≥2 leches, se muestra el selector de leche.
 *     • `milkSurcharges`   → override por café del recargo de una leche
 *                            concreta (ej. `{ avena: 0.20 }` si este café
 *                            cobra 0,20 € por avena en vez del global).
 *     • `decafSurcharge`   → extra al pedirlo descafeinado.
 *   Si un café no declara una opción, ese toggle no se muestra.
 * - El resto de secciones (Montaditos, Sandwich/Toast, Platos, Bebidas)
 *   tienen un precio fijo por unidad.
 *
 * Estos datos son la SEMILLA inicial. La capa `menu-store.js` los carga la
 * primera vez y deja al usuario editarlos desde `/inventario`. Una vez
 * guardados, todas las páginas leen del store (localStorage) y este
 * archivo solo se usa para "Restaurar valores por defecto".
 */

window.MENU_DATA = {
  /** Registro global de tipos de leche disponibles. Cualquier café puede
   *  declarar `milks: ['normal', 'avena', ...]` para ofrecer al cliente
   *  esas variantes. El `surcharge` se aplica salvo que el café concreto
   *  lo sobrescriba en `milkSurcharges`. El `icon` referencia un id en
   *  `COFFEE_OPT_ICONS` (ver index.html). */
  milkTypes: [
    { id: 'normal',    label: 'Leche normal',     icon: 'milk_normal',    surcharge: 0    },
    { id: 'avena',     label: 'Leche de avena',   icon: 'milk_avena',     surcharge: 0.10 },
  ],

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
        { code: '11', name: 'Manchego / Tumaca' },
      ],
    },
    {
      group: 'Tortilla Francesa',
      items: [
        { code: '20', name: 'Francesa / Queso Manchego' },
        { code: '21', name: 'Francesa / Queso Amarillo / Tomate / Lechuga' },
        { code: '22', name: 'Francesa / Pancetta / Queso Amarillo / Cebolla Roja' },
        { code: '23', name: 'Francesa / Verdura Salteada / Queso Amarillo' },
        { code: '24', name: 'Francesa / Pepperoni / Queso Amarillo' },
        { code: '25', name: 'Francesa / Salchichas' },
        { code: '26', name: 'Francesa / Mojo Rojo / Queso Amarillo' },
        { code: '27', name: 'Francesa / Cebolla Roja / Tomate' },
      ],
    },
    {
      group: 'Tortilla Española',
      items: [
        { code: '31', name: 'Española / Tomate / Mayo / Lechuga' },
        { code: '32', name: 'Española / Queso Amarillo / Tomate / Lechuga' },
        { code: '33', name: 'Española / Pancetta / Queso Amarillo / Cebolla Roja' },
        { code: '34', name: 'Española / Verdura Salteada / Queso Amarillo' },
        { code: '35', name: 'Española / Pepperoni / Queso Amarillo' },
        { code: '36', name: 'Española / Salchichas' },
      ],
    },
    {
      group: 'Pata Asada a Leña',
      items: [
        { code: '40', name: 'Pata / Queso Blanco / Tomate' },
        { code: '41', name: 'Pata / Queso Manchego / Tomate' },
        { code: '42', name: 'Pata / Queso Amarillo / Tomate' },
        { code: '43', name: 'Pata / Verdura Salteada / Queso Amarillo' },
      ],
    },
    {
      group: 'Carne Mechada',
      items: [
        { code: '50', name: 'Mechada / Queso Amarillo' },
      ],
    },
    {
      group: 'Pollo Desmenuzado',
      items: [
        { code: '55', name: 'Pollo / Queso Amarillo / Tomate / Lechuga' },
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
      group: 'Pechuga de Pollo',
      items: [
        { code: '70', name: 'Pechuga / Queso Amarillo / Tomate' },
        { code: '71', name: 'Pechuga / Queso Amarillo / Mojo Rojo' },
        { code: '72', name: 'Pechuga / Cebolla Roja / Tomate' },
      ],
    },
    {
      group: 'Jamón Cocido',
      items: [
        { code: '80', name: 'Cocido / Queso Blanco / Tomate / Lechuga' },
        { code: '81', name: 'Cocido / Mayo / Lechuga / Tomate' },
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
      group: 'Salame Milano',
      items: [
        { code: '100', name: 'Salame Milano / Queso Amarillo / Lechuga' },
        { code: '101', name: 'Salame Milano / Mayo / Lechuga' },
      ],
    },
    {
      group: 'Pepperoni',
      items: [
        { code: '110', name: 'Pepperoni / Verdura Salteada / Queso Amarillo' },
        { code: '111', name: 'Pepperoni / Huevo Frito / Queso Amarillo' },
      ],
    },
    {
      group: 'Mortadella',
      items: [
        { code: '120', name: 'Mortadella / Queso Blanco / Tumaca' },
        { code: '121', name: 'Mortadella / Queso Amarillo / Tumaca' },
        { code: '122', name: 'Mortadella / Queso Manchego / Tumaca' },
      ],
    },
    {
      group: 'Pancetta',
      items: [
        { code: '130', name: 'Pancetta / Queso Manchego' },
        { code: '131', name: 'Pancetta / Verdura Salteada / Queso Amarillo' },
        { code: '132', name: 'Pancetta / Huevo Frito / Queso Amarillo' },
      ],
    },
    {
      group: 'Salchichas',
      items: [
        { code: '140', name: 'Salchicha / Verdura Salteada / Queso Amarillo' },
        { code: '141', name: 'Salchicha / Huevo Frito / Queso Amarillo' },
        { code: '142', name: 'Salchicha / Queso Amarillo / Mostaza de Dijon' },
      ],
    },
  ],

  montaditos: {
    title: 'Montaditos',
    note: '1 Solo Ingrediente',
    price: 1.6,
    items: [
      { id: 'mont-jamon',      name: 'Jamón Cocido' },
      { id: 'mont-mortadella', name: 'Mortadella' },
      { id: 'mont-pata',       name: 'Pata Asada a Leña' },
      { id: 'mont-salame',     name: 'Salame Milano' },
      { id: 'mont-tortilla',   name: 'Tortilla Española' },
      { id: 'mont-blanco',     name: 'Queso Blanco' },
      { id: 'mont-pollo',      name: 'Pollo Desmenuzado' },
      { id: 'mont-manchego',   name: 'Manchego' },
      { id: 'mont-membrillo',  name: 'Membrillo' },
      { id: 'mont-pancetta',   name: 'Pancetta' },
    ],
  },

  sandwiches: {
    title: 'Sandwich / Toast',
    items: [
      { id: 'sand-mixto',     name: 'Mixto — Jamón Cocido / Queso Amarillo', price: 2.8 },
      { id: 'sand-151',       name: '151 — Mortadella', price: 2.8 },
      { id: 'sand-152',       name: '152 — Pollo Desmenuzado / Amarillo / Tomate / Lechuga', price: 3.0 },
      { id: 'sand-153',       name: '153 — Pata Asada a Leña / Blanco / Tumaca', price: 3.0 },
      { id: 'sand-154',       name: '154 — Tortilla Francesa / Amarillo / Tumaca', price: 3.0 },
      { id: 'sand-155',       name: '155 — Lomo / Amarillo / Tomate', price: 3.0 },
      { id: 'sand-americano', name: 'Americano — Pancetta / Cebolla / Huevo / Tomate / Lechuga', price: 4.5 },
    ],
  },

  platos: {
    title: 'Platos',
    items: [
      { id: 'plato-160', name: '160 — Pincho de Tortilla Española', price: 2.6 },
      { id: 'plato-161', name: '161 — Tortilla Francesa', price: 2.6 },
      { id: 'plato-162', name: '162 — Omelette (Francesa / Jamón Cocido / Amarillo)', price: 4.5 },
      { id: 'plato-163', name: '163 — Huevo Frito / Pancetta', price: 4.5 },
      { id: 'plato-164', name: '164 — Caprese (Queso Blanco / Tomate / Orégano / Aceite Oliva)', price: 4.9 },
      { id: 'plato-165', name: '165 — Pata Asada a Leña', price: 6.9 },
      { id: 'plato-166', name: '166 — Pata Asada a Leña / Queso Blanco / Tomate', price: 6.9 },
      { id: 'plato-167', name: '167 — Pata Asada a Leña / Verdura Salteada / Tomate', price: 6.9 },
      { id: 'plato-168', name: '168 — Pechuga de Pollo / Verdura Salteada / Tomate', price: 6.9 },
      { id: 'plato-169', name: '169 — Cinta de Lomo / Verdura Salteada / Tomate', price: 6.9 },
      { id: 'plato-170', name: '170 — Tortilla Española / Verdura Salteada / Tomate', price: 6.9 },
      { id: 'plato-171', name: '171 — Tortilla Francesa / Verdura Salteada / Tomate', price: 6.9 },
      { id: 'plato-172', name: '172 — Pata Asada a Leña / Tortilla Española / Verdura Salteada', price: 8.9 },
      { id: 'plato-173', name: '173 — Pata Asada a Leña / Salchichas / Verdura Salteada / Pancetta', price: 8.9 },
    ],
  },

  /**
   * Sección especial: platos preparados a pedido. No tienen precio fijo en
   * carta y requieren reserva con antelación. Por eso se renderizan como
   * tarjetas informativas (sin botones de añadir al carrito) y con un CTA
   * para llamar a la cafetería. Fuente: https://punto14.es/2025/01/29/por-encargo/
   */
  porEncargo: {
    title: 'Por Encargo',
    subtitle: 'Sabores únicos, hechos a pedido',
    note: 'Reserva con antelación para disfrutar de estos platos preparados especialmente para ti.',
    phone: '+34 922 89 62 33',
    phoneTel: '+34922896233',
    items: [
      {
        id: 'enc-pizza',
        emoji: '🍕',
        name: 'Pizza',
        description: 'Masa crujiente, salsa de tomate casera y los mejores ingredientes. Cada bocado es un viaje a Italia.',
      },
      {
        id: 'enc-lasagna',
        emoji: '🍜',
        name: 'Lasaña',
        description: 'Capas de pasta, carne jugosa, bechamel cremosa y un toque de gratinado dorado. Un clásico que conquista corazones.',
      },
      {
        id: 'enc-spezzatino',
        emoji: '🍲',
        name: 'Spezzatino',
        description: 'Estofado de carne cocido a fuego lento, con una mezcla de especias y verduras. Una explosión de sabor reconfortante.',
      },
      {
        id: 'enc-tiramisu',
        emoji: '🍰',
        name: 'Tiramisú',
        description: 'Bizcochos empapados en café, crema suave de mascarpone y un toque de cacao. El final dulce perfecto.',
      },
    ],
  },

  cafeteria: {
    title: 'Cafetería',
    groups: [
      {
        title: 'Cafés',
        // Cada café declara sus opciones aplicables:
        //   - `decafSurcharge`: extra al pedirlo descafeinado (en €). Si está
        //     presente, se muestra el toggle de cafeína.
        //   - `avenaSurcharge`: extra al cambiar a leche de avena. Si está
        //     presente, se muestra el toggle de tipo de leche.
        //   - `sizes`: variantes de tamaño con su precio. Si está presente,
        //     el precio base se determina por el tamaño seleccionado.
        items: [
          { id: 'cafe-cafe',            name: 'Café',                       price: 1.0, decafSurcharge: 0.10 },
          { id: 'cafe-espresso',        name: 'Espresso',                   price: 1.0, decafSurcharge: 0.10 },
          { id: 'cafe-macchiato',       name: 'Café Macchiato',             price: 1.1, decafSurcharge: 0.10, milks: ['normal', 'avena'] },
          { id: 'cafe-cortado-natural', name: 'Cortado Natural',            price: 1.0, decafSurcharge: 0.20, milks: ['normal', 'avena'], milkSurcharges: { avena: 0.20 } },
          { id: 'cafe-cortado-leche',   name: 'Cortado Leche / Leche',      price: 1.1, decafSurcharge: 0.10, milks: ['normal', 'avena'] },
          { id: 'cafe-bonbon',          name: 'Bon Bon',                    price: 1.1, decafSurcharge: 0.10 },
          { id: 'cafe-cortado-largo',   name: 'Cortado Natural Largo',      price: 1.2, decafSurcharge: 0.10, milks: ['normal', 'avena'] },
          { id: 'cafe-bonbon-largo',    name: 'Bon Bon Largo',              price: 1.2, decafSurcharge: 0.10 },
          { id: 'cafe-americano',       name: 'Americano',                  price: 1.2, decafSurcharge: 0.20 },
          { id: 'cafe-americano-cond',  name: 'Americano con Condensada',   price: 1.3, decafSurcharge: 0.20 },
          { id: 'cafe-barraquito',      name: 'Barraquito',                 price: 1.3, decafSurcharge: 0.00, milks: ['normal', 'avena'] },
          {
            id: 'cafe-con-leche',
            name: 'Café con Leche',
            decafSurcharge: 0.10,
            milks: ['normal', 'avena'],
            // El precio base depende del tamaño elegido.
            sizes: [
              { id: 'normal', label: 'Normal',      price: 1.3, icon: 'size_normal' },
              { id: 'obrero', label: 'Vaso Obrero', price: 1.5, icon: 'size_obrero' },
              { id: 'xxl',    label: 'XXL',         price: 1.9, icon: 'size_xxl' },
            ],
          },
          { id: 'cafe-cappuccino',         name: 'Cappuccino',                      price: 1.3, decafSurcharge: 0.10, milks: ['normal', 'avena'] },
          { id: 'cafe-hot-ciok',           name: 'Café con Leche "Hot Ciok"',       price: 2.5 },
          { id: 'cafe-barraq-especial',    name: 'Barraquito Especial (liq. 43)',   price: 1.9 },
          { id: 'cafe-sambuca',            name: 'Café con Sambuca',                price: 1.2 },
          { id: 'cafe-chocolate-hot-ciok', name: 'Chocolate "Hot Ciok"',            price: 1.8 },
        ],
      },
      {
        title: 'Refrescos e Infusiones',
        items: [
          { id: 'otb-infusiones', name: 'Infusiones',              price: 1.5 },
          { id: 'otb-zumo',       name: 'Zumo de Naranja Natural', price: 1.8 },
          { id: 'otb-jugos',      name: 'Jugos',                   price: 1.6 },
          { id: 'otb-refrescos',  name: 'Refrescos',               price: 1.6 },
        ],
      },
    ],
  },

  bebidas: {
    title: 'Bebidas',
    groups: [
      {
        title: 'Cañas',
        items: [
          { id: 'beb-egal-cana',  name: 'Estrella de Galicia (caña)',  price: 1.5 },
          { id: 'beb-egal-jarra', name: 'Estrella de Galicia (jarra)', price: 3.0 },
          { id: 'beb-1906-copa',  name: '1906 (copa)',                 price: 2.5 },
        ],
      },
      {
        title: 'Cervezas en Botella',
        items: [
          { id: 'beb-dorada-sin',     name: 'Dorada Sin / Con limón',           price: 1.6 },
          { id: 'beb-heineken',       name: 'Heineken',                         price: 1.6 },
          { id: 'beb-egal-tostada',   name: 'Estrella de Galicia Tostada 0,0',  price: 1.9 },
          { id: 'beb-egal-singluten', name: 'Estrella de Galicia Sin Gluten',   price: 1.6 },
        ],
      },
      {
        title: 'Vinos (por copa)',
        items: [
          { id: 'beb-blanco-chardonnay', name: 'Vino Blanco Chardonnay', price: 2.8 },
          { id: 'beb-tinto-verano',      name: 'Tinto de Verano',        price: 3.9 },
        ],
      },
      {
        title: 'Copas',
        items: [
          { id: 'beb-gintonic',     name: 'Gin Tonic (Tanqueray)', price: 5.5 },
          { id: 'beb-cubalibre',    name: 'Cuba Libre (Havana 7)', price: 5.5 },
          { id: 'beb-amaro',        name: 'Amaro Montenegro',      price: 4.0 },
          { id: 'beb-johnnie',      name: 'Johnnie Walker',        price: 4.0 },
          { id: 'beb-chupito',      name: 'Chupito',               price: 1.9 },
          { id: 'beb-amara-spritz', name: 'Amara Brava Spritz',    price: 4.9 },
        ],
      },
    ],
  },
};

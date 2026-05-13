/**
 * Capa de almacenamiento compartida entre la carta del cliente (index.html)
 * y el panel de servicio (servicio.html).
 *
 * Persiste los pedidos en `localStorage` y notifica los cambios mediante:
 *   1. BroadcastChannel  → comunicación rápida entre pestañas modernas
 *   2. window 'storage'  → fallback para navegadores antiguos
 *
 * Estados válidos: 'recibido' → 'en_preparacion' → 'listo' → 'finalizado'
 *
 * Limitación: como todo vive en el navegador, la cocina y el cliente deben
 * estar en el mismo navegador (mismas pestañas) para sincronizarse. Es ideal
 * para una tablet/PC en cocina con varios dispositivos haciendo pedidos sobre
 * esa misma máquina, o para una demo/prototipo.
 */

(function () {
  const STORAGE_KEY = 'paninoteca:orders';
  const COUNTER_KEY = 'paninoteca:nextId';
  const STATES = ['recibido', 'en_preparacion', 'listo', 'finalizado'];

  let channel = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try { channel = new BroadcastChannel('paninoteca'); } catch (_) { channel = null; }
  }

  const subscribers = new Set();

  function read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function write(orders) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    notify();
  }

  function notify() {
    if (channel) {
      try { channel.postMessage({ type: 'orders:changed' }); } catch (_) {}
    }
    for (const cb of subscribers) {
      try { cb(); } catch (_) {}
    }
  }

  function nextId() {
    const current = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10) || 0;
    const id = current + 1;
    localStorage.setItem(COUNTER_KEY, String(id));
    return id;
  }

  function sanitizeItems(items) {
    if (!Array.isArray(items)) return [];
    return items
      .map((it) => ({
        id: String(it.id || ''),
        name: String(it.name || '').slice(0, 200),
        variant: it.variant ? String(it.variant).slice(0, 80) : null,
        quantity: Math.max(1, Math.min(99, parseInt(it.quantity, 10) || 1)),
        price: Math.max(0, Number(it.price) || 0),
      }))
      .filter((it) => it.name);
  }

  const OrdersStore = {
    STATES,

    list() {
      return read();
    },

    add({ items, table, notes }) {
      const cleanItems = sanitizeItems(items);
      if (cleanItems.length === 0) {
        throw new Error('El pedido debe contener al menos un item');
      }
      const total = cleanItems.reduce((s, it) => s + it.price * it.quantity, 0);
      const id = nextId();
      const now = Date.now();
      const order = {
        id,
        code: String(id).padStart(3, '0'),
        items: cleanItems,
        total: Math.round(total * 100) / 100,
        table: table ? String(table).slice(0, 30) : null,
        notes: notes ? String(notes).slice(0, 300) : null,
        status: 'recibido',
        createdAt: now,
        updatedAt: now,
      };
      const orders = read();
      orders.push(order);
      write(orders);
      return order;
    },

    updateStatus(id, status) {
      if (!STATES.includes(status)) {
        throw new Error('Estado no válido');
      }
      const orders = read();
      const idx = orders.findIndex((o) => o.id === id);
      if (idx === -1) throw new Error('Pedido no encontrado');
      orders[idx].status = status;
      orders[idx].updatedAt = Date.now();
      write(orders);
      return orders[idx];
    },

    remove(id) {
      const orders = read();
      const next = orders.filter((o) => o.id !== id);
      if (next.length === orders.length) return false;
      write(next);
      return true;
    },

    /** Borra TODOS los pedidos. Útil al final del día. */
    clearAll() {
      localStorage.removeItem(STORAGE_KEY);
      notify();
    },

    /** Suscribe `cb` a cualquier cambio (cualquier pestaña, mismo navegador). */
    subscribe(cb) {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
  };

  // Cambios desde otras pestañas: 'storage' es estándar y siempre disponible.
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === null) notify();
  });

  // Cambios desde otras pestañas vía BroadcastChannel (más rápido).
  if (channel) {
    channel.addEventListener('message', (e) => {
      if (e && e.data && e.data.type === 'orders:changed') {
        for (const cb of subscribers) {
          try { cb(); } catch (_) {}
        }
      }
    });
  }

  window.OrdersStore = OrdersStore;
})();

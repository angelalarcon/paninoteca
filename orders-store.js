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
  const STORAGE_KEY  = 'paninoteca:orders';
  const COUNTER_KEY  = 'paninoteca:nextId';
  /** Cuentas (tabs) abiertas: un grupo de clientes acumula pedidos hasta que
   *  llega el momento de pagar y se cierra la cuenta. Cada cuenta tiene su
   *  propio almacenamiento + contador independiente del de pedidos. */
  const ACCOUNTS_KEY        = 'paninoteca:accounts';
  const ACCOUNTS_COUNTER_KEY = 'paninoteca:nextAccountId';
  /** Contador correlativo de número de factura Verifactu, independiente del
   *  identificador interno del pedido. Cada serie debe ser estrictamente
   *  consecutiva: solo se incrementa cuando se emite con éxito. */
  const INVOICE_KEY  = 'paninoteca:nextInvoice';
  /** Flujo de cocina + cobro:
   *    recibido → en_preparacion → listo → entregado (servido) → pagado.
   *  El estado antiguo `finalizado` (versiones previas del proyecto) se
   *  migra a `entregado` la primera vez que se leen los datos. */
  const STATES = ['recibido', 'en_preparacion', 'listo', 'entregado', 'pagado'];

  /** Estados del registro Verifactu asociado al pedido (independientes de
   *  los estados de cocina). */
  const INVOICE_STATES = ['none', 'emitiendo', 'emitida', 'error'];

  /** Estados de una cuenta abierta. */
  const ACCOUNT_STATES = ['abierta', 'cerrada'];

  let channel = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try { channel = new BroadcastChannel('paninoteca'); } catch (_) { channel = null; }
  }

  const subscribers = new Set();

  function read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return [];
      // Migración: el estado antiguo `finalizado` se renombra a
      // `entregado`. Lo persistimos al detectarlo para no repetir el
      // trabajo en cada lectura.
      let migrated = false;
      for (const o of arr) {
        if (o && o.status === 'finalizado') {
          o.status = 'entregado';
          migrated = true;
        }
      }
      if (migrated) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch (_) {}
      }
      return arr;
    } catch (_) {
      return [];
    }
  }

  function write(orders) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    notify();
  }

  function readAccounts() {
    try {
      const raw = localStorage.getItem(ACCOUNTS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function writeAccounts(accounts) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
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

  function nextAccountId() {
    const current = parseInt(localStorage.getItem(ACCOUNTS_COUNTER_KEY) || '0', 10) || 0;
    const id = current + 1;
    localStorage.setItem(ACCOUNTS_COUNTER_KEY, String(id));
    return id;
  }

  /** Devuelve el próximo número de factura Verifactu (consecutivo, por serie).
   *  Lo usa quien va a emitir; si la emisión falla, hay que llamar a
   *  `releaseInvoiceNumber(n)` para no dejar huecos en la numeración. */
  function nextInvoiceNumber() {
    const current = parseInt(localStorage.getItem(INVOICE_KEY) || '0', 10) || 0;
    const n = current + 1;
    localStorage.setItem(INVOICE_KEY, String(n));
    return n;
  }

  function releaseInvoiceNumber(n) {
    const current = parseInt(localStorage.getItem(INVOICE_KEY) || '0', 10) || 0;
    if (current === n) localStorage.setItem(INVOICE_KEY, String(n - 1));
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

  function patchOrder(id, patch) {
    const orders = read();
    const idx = orders.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error('Pedido no encontrado');
    orders[idx] = { ...orders[idx], ...patch, updatedAt: Date.now() };
    write(orders);
    return orders[idx];
  }

  const OrdersStore = {
    STATES,
    INVOICE_STATES,

    list() {
      return read();
    },

    get(id) {
      return read().find((o) => o.id === id) || null;
    },

    add({ items, table, notes, accountId }) {
      const cleanItems = sanitizeItems(items);
      if (cleanItems.length === 0) {
        throw new Error('El pedido debe contener al menos un item');
      }
      const total = cleanItems.reduce((s, it) => s + it.price * it.quantity, 0);
      const id = nextId();
      const now = Date.now();

      // Si se asocia a una cuenta, debe estar abierta. Heredamos su nombre
      // como `table` cuando el cliente no especifica uno explícitamente.
      let attachedAccount = null;
      if (accountId != null) {
        const accounts = readAccounts();
        const idx = accounts.findIndex((a) => a.id === accountId);
        if (idx === -1) throw new Error('La cuenta indicada no existe');
        if (accounts[idx].status !== 'abierta') {
          throw new Error('La cuenta está cerrada — no se pueden añadir pedidos');
        }
        attachedAccount = accounts[idx];
      }

      const order = {
        id,
        code: String(id).padStart(3, '0'),
        items: cleanItems,
        total: Math.round(total * 100) / 100,
        table: table
          ? String(table).slice(0, 30)
          : (attachedAccount ? attachedAccount.name : null),
        notes: notes ? String(notes).slice(0, 300) : null,
        accountId: attachedAccount ? attachedAccount.id : null,
        status: 'recibido',
        createdAt: now,
        updatedAt: now,
        /** Estado del registro Verifactu de este pedido. Mientras valga
         *  'none' significa que aún no se ha emitido ticket fiscal. */
        invoiceStatus: 'none',
        invoice: null,        // { uuid, qr, huella, numero, serie, fecha, env }
        invoiceError: null,
      };
      const orders = read();
      orders.push(order);
      write(orders);

      if (attachedAccount) {
        const accounts = readAccounts();
        const idx = accounts.findIndex((a) => a.id === attachedAccount.id);
        if (idx !== -1) {
          const orderIds = Array.isArray(accounts[idx].orderIds) ? accounts[idx].orderIds : [];
          if (!orderIds.includes(id)) orderIds.push(id);
          accounts[idx] = { ...accounts[idx], orderIds, updatedAt: now };
          writeAccounts(accounts);
        }
      }
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

    /** Asocia (o desasocia) un pedido a una mesa/cuenta. La función
     *  mantiene la lista `orderIds` de la cuenta sincronizada en ambos
     *  lados: cuando el pedido cambia de cuenta, se quita de la
     *  anterior y se añade a la nueva. */
    assignToAccount(orderId, { table = null, accountId = null } = {}) {
      const orders = read();
      const idx = orders.findIndex((o) => o.id === orderId);
      if (idx === -1) throw new Error('Pedido no encontrado');

      let attachedAccount = null;
      if (accountId != null) {
        const accounts = readAccounts();
        const accIdx = accounts.findIndex((a) => a.id === accountId);
        if (accIdx === -1) throw new Error('La cuenta indicada no existe');
        if (accounts[accIdx].status !== 'abierta') {
          throw new Error('La cuenta está cerrada — no se puede vincular');
        }
        attachedAccount = accounts[accIdx];
      }

      const previousAccountId = orders[idx].accountId;
      orders[idx] = {
        ...orders[idx],
        accountId: attachedAccount ? attachedAccount.id : null,
        table: table != null
          ? String(table).slice(0, 30) || null
          : (attachedAccount ? attachedAccount.name : null),
        updatedAt: Date.now(),
      };
      write(orders);

      // Sincronizar `orderIds` en las cuentas implicadas.
      if (previousAccountId !== (attachedAccount ? attachedAccount.id : null)) {
        const accounts = readAccounts();
        let touched = false;
        if (previousAccountId != null) {
          const prevIdx = accounts.findIndex((a) => a.id === previousAccountId);
          if (prevIdx !== -1) {
            const list = (accounts[prevIdx].orderIds || []).filter((x) => x !== orderId);
            accounts[prevIdx] = { ...accounts[prevIdx], orderIds: list, updatedAt: Date.now() };
            touched = true;
          }
        }
        if (attachedAccount) {
          const newIdx = accounts.findIndex((a) => a.id === attachedAccount.id);
          if (newIdx !== -1) {
            const list = Array.isArray(accounts[newIdx].orderIds) ? accounts[newIdx].orderIds : [];
            if (!list.includes(orderId)) list.push(orderId);
            accounts[newIdx] = { ...accounts[newIdx], orderIds: list, updatedAt: Date.now() };
            touched = true;
          }
        }
        if (touched) writeAccounts(accounts);
      }

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
      localStorage.removeItem(ACCOUNTS_KEY);
      notify();
    },

    /** ---- Cuentas (tabs) ----
     *
     *  Una cuenta agrupa varios pedidos de un mismo grupo de clientes hasta
     *  que llega el momento de pagar. Mientras está `abierta`, los nuevos
     *  pedidos pueden adjuntarse a ella y el total se va acumulando. Al
     *  cerrarla, los pedidos hijos se finalizan y la cuenta queda lista
     *  para emitir un ticket consolidado.
     */

    accounts: {
      ACCOUNT_STATES,

      list() {
        return readAccounts();
      },

      listOpen() {
        return readAccounts().filter((a) => a.status === 'abierta');
      },

      get(id) {
        return readAccounts().find((a) => a.id === id) || null;
      },

      /** Devuelve los pedidos asociados a una cuenta, en orden cronológico. */
      orders(accountId) {
        return read()
          .filter((o) => o.accountId === accountId)
          .sort((a, b) => a.createdAt - b.createdAt);
      },

      /** Suma de los items de todos los pedidos hijos. */
      total(accountId) {
        const orders = this.orders(accountId);
        const t = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
        return Math.round(t * 100) / 100;
      },

      /** Crea una cuenta abierta. `name` identifica visualmente la cuenta
       *  (p. ej. "Mesa 4", "Ana") y debe ser único entre las abiertas para
       *  evitar confusiones al cliente. */
      open(name) {
        const clean = String(name || '').trim().slice(0, 40);
        if (!clean) throw new Error('La cuenta necesita un nombre');
        const accounts = readAccounts();
        const dup = accounts.find(
          (a) => a.status === 'abierta' &&
                 a.name.toLowerCase() === clean.toLowerCase()
        );
        if (dup) throw new Error(`Ya hay una cuenta abierta con ese nombre: ${dup.name}`);
        const id = nextAccountId();
        const now = Date.now();
        const account = {
          id,
          code: String(id).padStart(3, '0'),
          name: clean,
          status: 'abierta',
          createdAt: now,
          updatedAt: now,
          closedAt: null,
          orderIds: [],
          /** Estado Verifactu del ticket consolidado de la cuenta. Mientras
           *  vale 'none' aún no se ha cobrado / emitido nada. */
          invoiceStatus: 'none',
          invoice: null,
          invoiceError: null,
        };
        accounts.push(account);
        writeAccounts(accounts);
        return account;
      },

      /** Cierra la cuenta. La transición de los pedidos hijos al estado
       *  final (`pagado`) la hace el caller — esta función solo marca la
       *  cuenta como cerrada para que no admita más pedidos. */
      close(accountId) {
        const accounts = readAccounts();
        const idx = accounts.findIndex((a) => a.id === accountId);
        if (idx === -1) throw new Error('Cuenta no encontrada');
        if (accounts[idx].status === 'cerrada') return accounts[idx];

        const now = Date.now();
        accounts[idx] = {
          ...accounts[idx],
          status: 'cerrada',
          closedAt: now,
          updatedAt: now,
        };
        writeAccounts(accounts);
        return accounts[idx];
      },

      /** Reabre una cuenta cerrada por error. No reabre los pedidos
       *  finalizados (eso es responsabilidad del usuario si lo necesita). */
      reopen(accountId) {
        const accounts = readAccounts();
        const idx = accounts.findIndex((a) => a.id === accountId);
        if (idx === -1) throw new Error('Cuenta no encontrada');
        if (accounts[idx].invoiceStatus === 'emitida') {
          throw new Error('No se puede reabrir: el ticket ya está emitido');
        }
        accounts[idx] = {
          ...accounts[idx],
          status: 'abierta',
          closedAt: null,
          updatedAt: Date.now(),
        };
        writeAccounts(accounts);
        return accounts[idx];
      },

      /** Renombra una cuenta abierta. */
      rename(accountId, name) {
        const clean = String(name || '').trim().slice(0, 40);
        if (!clean) throw new Error('El nombre no puede estar vacío');
        const accounts = readAccounts();
        const idx = accounts.findIndex((a) => a.id === accountId);
        if (idx === -1) throw new Error('Cuenta no encontrada');
        accounts[idx] = { ...accounts[idx], name: clean, updatedAt: Date.now() };
        writeAccounts(accounts);
        return accounts[idx];
      },

      /** Elimina una cuenta y desvincula sus pedidos (sin borrarlos). */
      remove(accountId) {
        const accounts = readAccounts();
        const next = accounts.filter((a) => a.id !== accountId);
        if (next.length === accounts.length) return false;

        const orders = read();
        let touched = false;
        for (const o of orders) {
          if (o.accountId === accountId) {
            o.accountId = null;
            touched = true;
          }
        }
        if (touched) localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
        writeAccounts(next);
        return true;
      },

      /** Construye un "pedido virtual" que une todos los items de los
       *  pedidos de la cuenta. Útil para emitir un único ticket Verifactu
       *  por toda la cuenta al cobrarla. No se persiste: solo se devuelve. */
      consolidatedOrder(accountId) {
        const account = this.get(accountId);
        if (!account) throw new Error('Cuenta no encontrada');
        const orders = this.orders(accountId);
        if (orders.length === 0) {
          throw new Error('La cuenta no tiene pedidos que cobrar');
        }

        // Agrupamos items idénticos (mismo id + variant + price) sumando
        // cantidades para que el ticket sea legible aunque vengan de
        // pedidos distintos.
        const merged = new Map();
        for (const o of orders) {
          for (const it of (o.items || [])) {
            const key = [it.id, it.variant || '', String(it.price)].join('|');
            const acc = merged.get(key) || { ...it, quantity: 0 };
            acc.quantity += Number(it.quantity) || 0;
            merged.set(key, acc);
          }
        }
        const items = Array.from(merged.values());
        const total = items.reduce((s, it) => s + it.price * it.quantity, 0);
        const notes = orders.map(o => o.notes).filter(Boolean).join(' | ').slice(0, 500);

        return {
          // Reusamos `id` y `code` con prefijo "C" para distinguirlo de los
          // pedidos individuales en la descripción del ticket.
          id:         -account.id,
          code:       'C' + account.code,
          items,
          total:      Math.round(total * 100) / 100,
          table:      account.name,
          notes:      notes || null,
          accountId:  account.id,
          createdAt:  account.createdAt,
          updatedAt:  account.closedAt || Date.now(),
        };
      },

      markInvoiceEmitting(accountId, { numero, serie }) {
        const accounts = readAccounts();
        const idx = accounts.findIndex((a) => a.id === accountId);
        if (idx === -1) throw new Error('Cuenta no encontrada');
        accounts[idx] = {
          ...accounts[idx],
          invoiceStatus: 'emitiendo',
          invoiceError:  null,
          invoice: { uuid: null, qr: null, huella: null, numero, serie, fecha: null, env: null },
          updatedAt: Date.now(),
        };
        writeAccounts(accounts);
        return accounts[idx];
      },

      setInvoice(accountId, data) {
        const accounts = readAccounts();
        const idx = accounts.findIndex((a) => a.id === accountId);
        if (idx === -1) throw new Error('Cuenta no encontrada');
        accounts[idx] = {
          ...accounts[idx],
          invoiceStatus: 'emitida',
          invoiceError:  null,
          invoice: {
            uuid:   data.uuid   || null,
            qr:     data.qr     || null,
            huella: data.huella || null,
            numero: data.numero,
            serie:  data.serie,
            fecha:  data.fecha  || null,
            env:    data.env    || null,
          },
          updatedAt: Date.now(),
        };
        writeAccounts(accounts);
        return accounts[idx];
      },

      setInvoiceError(accountId, errorMessage) {
        const accounts = readAccounts();
        const idx = accounts.findIndex((a) => a.id === accountId);
        if (idx === -1) throw new Error('Cuenta no encontrada');
        accounts[idx] = {
          ...accounts[idx],
          invoiceStatus: 'error',
          invoiceError:  String(errorMessage || 'Error desconocido').slice(0, 500),
          updatedAt: Date.now(),
        };
        writeAccounts(accounts);
        return accounts[idx];
      },
    },

    /** ---- Verifactu / facturación ---- */

    nextInvoiceNumber,
    releaseInvoiceNumber,

    /** Marca un pedido como "emitiendo" e indica el nº de factura asignado. */
    markInvoiceEmitting(id, { numero, serie }) {
      return patchOrder(id, {
        invoiceStatus: 'emitiendo',
        invoiceError:  null,
        invoice: { uuid: null, qr: null, huella: null, numero, serie, fecha: null, env: null },
      });
    },

    /** Guarda los datos del registro Verifactu emitido con éxito. */
    setInvoice(id, data) {
      return patchOrder(id, {
        invoiceStatus: 'emitida',
        invoiceError:  null,
        invoice: {
          uuid:   data.uuid   || null,
          qr:     data.qr     || null,
          huella: data.huella || null,
          numero: data.numero,
          serie:  data.serie,
          fecha:  data.fecha  || null,
          env:    data.env    || null,
        },
      });
    },

    /** Registra error de emisión y deja el pedido reabriable para reintentar. */
    setInvoiceError(id, errorMessage) {
      return patchOrder(id, {
        invoiceStatus: 'error',
        invoiceError:  String(errorMessage || 'Error desconocido').slice(0, 500),
      });
    },

    /** Suscribe `cb` a cualquier cambio (cualquier pestaña, mismo navegador). */
    subscribe(cb) {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
  };

  // Cambios desde otras pestañas: 'storage' es estándar y siempre disponible.
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === ACCOUNTS_KEY || e.key === null) notify();
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

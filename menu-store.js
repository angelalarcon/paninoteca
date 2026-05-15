/**
 * Capa de almacenamiento del menú compartida entre la carta del cliente
 * (`index.html`) y el editor de inventario (`inventario.html`).
 *
 * Persiste el menú completo (categorías, items, formatos, tipos de leche,
 * etc.) en `localStorage`, de modo que cualquier alta/baja/modificación
 * desde `/inventario` se refleje al instante en la carta — sin tocar
 * archivos JS ni hacer redeploys.
 *
 * Sincroniza cambios entre pestañas mediante:
 *   1. BroadcastChannel('paninoteca-menu')  → instantáneo entre pestañas modernas
 *   2. window 'storage'                     → fallback para navegadores antiguos
 *
 * El archivo `menu-data.js` actúa como SEMILLA: si `localStorage` está
 * vacío (o el usuario pide "Restaurar valores por defecto"), se carga
 * desde ahí. Una vez guardado un cambio, gana la versión persistida.
 */

(function () {
  const STORAGE_KEY  = 'paninoteca:menu';
  const SCHEMA_KEY   = 'paninoteca:menu:schema';
  /** Sube este número si cambias el modelo de datos de forma incompatible
   *  para forzar una reseed automática. */
  const SCHEMA_VERSION = 2;

  const SEED = window.MENU_DATA;
  if (!SEED) {
    console.error('[MenuStore] menu-data.js no se ha cargado antes que menu-store.js');
  }

  let channel = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try { channel = new BroadcastChannel('paninoteca-menu'); } catch (_) { channel = null; }
  }

  const subscribers = new Set();

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Migración suave: añade campos nuevos a menús guardados con versiones
   * antiguas para que no se rompa la carta si el modelo crece.
   *
   *   - `milkTypes` aparece como registro global (antes los cafés sólo
   *     tenían `avenaSurcharge`).
   *   - Cada café con `avenaSurcharge` se convierte en `milks: ['normal',
   *     'avena']` + `milkSurcharges: { avena: <antiguo> }` cuando difiere
   *     del recargo global.
   */
  function migrate(menu) {
    if (!menu || typeof menu !== 'object') return clone(SEED);

    if (!Array.isArray(menu.milkTypes) || menu.milkTypes.length === 0) {
      menu.milkTypes = SEED.milkTypes
        ? clone(SEED.milkTypes)
        : [
            { id: 'normal', label: 'Leche normal',   icon: 'milk_normal', surcharge: 0    },
            { id: 'avena',  label: 'Leche de avena', icon: 'milk_avena',  surcharge: 0.10 },
          ];
    }

    if (menu.cafeteria && Array.isArray(menu.cafeteria.groups)) {
      const globalAvena = menu.milkTypes.find((m) => m.id === 'avena');
      for (const group of menu.cafeteria.groups) {
        for (const it of group.items || []) {
          if (typeof it.avenaSurcharge === 'number' && !Array.isArray(it.milks)) {
            it.milks = ['normal', 'avena'];
            if (globalAvena && it.avenaSurcharge !== globalAvena.surcharge) {
              it.milkSurcharges = { ...(it.milkSurcharges || {}), avena: it.avenaSurcharge };
            }
            delete it.avenaSurcharge;
          }
        }
      }
    }

    if (!Array.isArray(menu.customCategories)) {
      menu.customCategories = SEED.customCategories ? clone(SEED.customCategories) : [];
    }
    return menu;
  }

  function read() {
    try {
      const storedSchema = parseInt(localStorage.getItem(SCHEMA_KEY) || '0', 10) || 0;
      if (storedSchema && storedSchema > SCHEMA_VERSION) {
        // Datos guardados por una versión más nueva del código — no los
        // tocamos; simplemente caemos al seed por seguridad.
        return clone(SEED);
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(SEED);
      const parsed = JSON.parse(raw);
      return migrate(parsed) || clone(SEED);
    } catch (_) {
      return clone(SEED);
    }
  }

  function write(menu) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(menu));
      localStorage.setItem(SCHEMA_KEY, String(SCHEMA_VERSION));
    } catch (e) {
      console.error('[MenuStore] No se ha podido guardar el menú', e);
      throw e;
    }
    notify();
  }

  function notify() {
    if (channel) {
      try { channel.postMessage({ type: 'menu:changed' }); } catch (_) {}
    }
    for (const cb of subscribers) {
      try { cb(); } catch (_) {}
    }
  }

  const MenuStore = {
    /** Devuelve la versión actual (post-migración) del menú. Es siempre
     *  un objeto nuevo: el caller puede mutarlo sin riesgo y luego
     *  llamar a `save(...)` para persistir. */
    get() {
      return read();
    },

    /** Reemplaza el menú completo. Acepta cualquier objeto con la forma
     *  esperada por `index.html` (mismas claves que MENU_DATA). */
    save(menu) {
      if (!menu || typeof menu !== 'object') {
        throw new Error('save(): menú inválido');
      }
      write(menu);
    },

    /** Aplica una transformación atómica sobre el menú actual y la
     *  persiste. Útil para mutaciones puntuales sin tener que leer y
     *  escribir manualmente. */
    update(updater) {
      const current = read();
      const next = updater(current) || current;
      write(next);
      return next;
    },

    /** Devuelve la SEMILLA original (definida en menu-data.js) sin pasar
     *  por localStorage. Útil para mostrar valores por defecto. */
    seed() {
      return clone(SEED);
    },

    /** Borra cualquier override guardado y vuelve a la semilla. */
    reset() {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SCHEMA_KEY);
      notify();
    },

    /** Suscribe `cb` a cualquier cambio del menú (en esta pestaña o en
     *  otra del mismo navegador). Devuelve función para cancelar. */
    subscribe(cb) {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
  };

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === SCHEMA_KEY || e.key === null) notify();
  });

  if (channel) {
    channel.addEventListener('message', (e) => {
      if (e && e.data && e.data.type === 'menu:changed') {
        for (const cb of subscribers) {
          try { cb(); } catch (_) {}
        }
      }
    });
  }

  window.MenuStore = MenuStore;
})();

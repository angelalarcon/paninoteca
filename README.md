# .14 Cafetería / Paninoteca — Sistema de pedidos

Aplicación 100% estática (HTML + JS vainilla + Tailwind por CDN). Sin servidor,
sin build step, sin dependencias.

## Estructura

```
.
├── index.html        # Carta para el cliente
├── servicio.html     # Panel de cocina/servicio (cola de pedidos)
├── menu-data.js      # Datos del menú extraídos de la carta física
├── orders-store.js   # Capa de almacenamiento (localStorage + BroadcastChannel)
└── README.md
```

## Cómo arrancar

Como son archivos estáticos, sirve la carpeta con cualquier servidor HTTP. Lo
importante es que las dos páginas se carguen desde el **mismo origen** para
que compartan `localStorage`.

Opción más rápida (Python ya viene preinstalado en macOS/Linux):

```bash
python3 -m http.server 8000
```

Luego abre en el navegador:

- **Carta cliente:**  http://localhost:8000/
- **Panel servicio:** http://localhost:8000/servicio.html

Otras alternativas:

- `npx serve .`
- `npx http-server .`
- VS Code → extensión *Live Server*

> ⚠️ Si abres los archivos directamente con `file://`, **Firefox** no
> compartirá `localStorage` entre ellos (cada `file://` es origen separado).
> Chrome sí los comparte, pero usa siempre un servidor HTTP para evitar
> sorpresas.

## Cómo funciona

### Cliente (`index.html`)

- Carta interactiva organizada por categorías: **Panini** (con códigos 01, 31,
  60, 121… y selector de formato Bocadillo / ½ Bocadillo / Pulguita / Barra
  Entera), **Montaditos**, **Sandwich/Toast** y **Platos**.
- Carrito lateral (drawer en escritorio, bottom-sheet en móvil) con +/−,
  totales en vivo, campos opcionales de **mesa/nombre** y **notas para la cocina**.
- Al pulsar *Enviar pedido* se llama a `OrdersStore.add(...)`, que guarda el
  pedido en `localStorage` y emite un mensaje por `BroadcastChannel`. Aparece un
  modal con el número asignado (`001`, `002`…).

### Servicio (`servicio.html`)

- Tablero kanban con 4 columnas: **Recibidos → En preparación → Listos → Finalizados**.
- Cada tarjeta muestra `#código`, mesa, hora, **tiempo transcurrido** (cambia
  de color a los 5 y 10 minutos), items con cantidad, notas resaltadas y total.
- Botones para avanzar al siguiente estado (verde, prominente), retroceder
  (gris, por si te equivocas) o eliminar del historial.
- Cuando llega un pedido nuevo, la tarjeta entra con un pulso visual y suena
  un **beep** (silenciable con el toggle del header).
- Botón **Vaciar** para borrar todos los pedidos al final del día.

### Sincronización (`orders-store.js`)

Toda la lógica de almacenamiento está en `orders-store.js`. Las dos páginas
comparten datos a través de:

1. `localStorage` — fuente de verdad persistente.
2. `BroadcastChannel('paninoteca')` — notificaciones rápidas entre pestañas
   modernas.
3. Evento `storage` de `window` — fallback para navegadores antiguos.

API expuesta en `window.OrdersStore`:

| Método | Descripción |
|---|---|
| `list()` | Devuelve el array de pedidos |
| `add({ items, table, notes })` | Crea un pedido y devuelve el objeto creado |
| `updateStatus(id, status)` | Cambia el estado de un pedido |
| `remove(id)` | Elimina un pedido del historial |
| `clearAll()` | Borra todos los pedidos |
| `subscribe(cb)` | Llama `cb` cada vez que cambian los pedidos |

Estados válidos: `recibido` → `en_preparacion` → `listo` → `finalizado`.

## Limitaciones

- **Mismo navegador:** como todo vive en `localStorage`, los pedidos solo se
  sincronizan entre pestañas/dispositivos que comparten ese almacenamiento.
  Es perfecto para una tablet/PC en cocina con clientes pidiendo desde el mismo
  dispositivo, o para una demo. Para múltiples dispositivos remotos hace falta
  un backend (lo podemos añadir cuando quieras).
- Los datos se conservan al cerrar el navegador, pero el usuario puede
  borrarlos vaciando el storage.
- Tailwind se carga por CDN (`https://cdn.tailwindcss.com`) — ideal para
  prototipo; en producción conviene compilarlo.

## Personalizar el menú

Edita `menu-data.js`. Cualquier item nuevo o precio modificado se reflejará al
recargar la carta — sin pasos extra.

# .14 Cafetería / Paninoteca — Sistema de pedidos

Aplicación estática (HTML + JS vainilla + Tailwind por CDN) con una única
Netlify Function para la integración con **Veri\*Factu** (AEAT).

## Estructura

```
.
├── index.html                       # Carta para el cliente
├── servicio.html                    # Panel de cocina/servicio + emisión Verifactu
├── menu-data.js                     # Datos del menú extraídos de la carta física
├── orders-store.js                  # localStorage + BroadcastChannel
├── paninoteca-config.js             # Datos fiscales del emisor + serie + % IVA
├── netlify/
│   └── functions/
│       └── verifactu-create.js      # Netlify Function v2: proxy a Verifacti
├── netlify.toml                     # Config del sitio (publish, functions, dev)
├── package.json                     # "type":"module" para ESM en functions
├── .env.example                     # Variables de entorno requeridas
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

---

## Integración Veri\*Factu (AEAT)

A partir de 2026 todo software de facturación en España debe cumplir el
sistema **Veri\*Factu** (Real Decreto 1007/2023). Este proyecto se integra
con el proveedor SaaS [Verifacti](https://verifacti.com), que firma, encadena
y envía cada registro de facturación a la AEAT en nuestro nombre.

### Arquitectura

```
servicio.html  ──►  /api/verifactu-create  ──►  api.verifacti.com  ──►  AEAT
                  (Netlify Function v2;          (firma + cadena
                   guarda la API key)            de huellas SHA-256)
```

La API key **nunca** vive en el navegador: solo en variables de entorno del
backend serverless. La función serverless es un proxy mínimo que añade el
header `Authorization` y reenvía el JSON a Verifacti.

La función se autoexpone en `/api/verifactu-create` gracias a
`export const config = { path: '/api/verifactu-create' }` dentro de
`netlify/functions/verifactu-create.js` — no hace falta ningún redirect en
`netlify.toml`.

### Tipo de factura emitida

- **F2 — Factura simplificada** (ticket): el caso normal de cafetería.
- Validación local: si el total ≥ 3.000 €, la función rechaza la petición y
  pide emitirla como F1 (ahora mismo no implementada — se puede añadir si
  algún cliente la pide con NIF).
- IVA por defecto **10 %** (régimen de hostelería con consumición in-situ,
  incluyendo bebidas alcohólicas servidas en local). Configurable en
  `paninoteca-config.js` con override por `item.id` si lo necesitas.

### Flujo de uso

1. El cliente envía un pedido desde `index.html` (no se factura aún).
2. La cocina prepara el pedido en `servicio.html`.
3. Al cobrar, el cajero pulsa **🧾 Emitir ticket Verifactu** en la tarjeta
   del pedido. La app:
   - Asigna el siguiente número correlativo dentro de la serie configurada.
   - Llama al endpoint `/api/verifactu-create`.
   - Recibe `{uuid, qr (base64), huella}` de Verifacti.
   - Guarda esos datos en el pedido (`localStorage`) y abre el modal con el
     ticket imprimible: cabecera fiscal, líneas, desglose IVA, total, **QR**
     y el texto `VERI*FACTU - Factura verificable en la sede electrónica de
     la AEAT`.
4. El botón **Imprimir** lanza `window.print()` con un CSS preparado para
   impresoras térmicas de 80 mm (también funciona en A4).
5. Si Verifacti rechaza la emisión, el número se libera y el botón cambia
   a **Reintentar emisión**.

### Configuración paso a paso

#### 1) Crea cuenta gratuita en Verifacti

- Regístrate en [app.verifacti.com](https://app.verifacti.com).
- Tu cuenta incluye una **empresa de test** ya creada con su API key
  `vf_test_…` y entorno sandbox de la AEAT. Suficiente para probar todo el
  flujo sin coste.

#### 2) Rellena los datos fiscales

Edita `paninoteca-config.js`:

```js
window.PANINOTECA_CONFIG = {
  emisor: {
    nif:         'B12345678',          // CIF/NIF real de la cafetería
    razonSocial: 'Paninoteca .14 S.L.',
    direccion:   'C/ Ejemplo 14',
    cp:          '38001',
    poblacion:   'Santa Cruz de Tenerife',
  },
  serieFactura: 'T26',                 // Tickets 2026
  ivaDefault:   10,
  ivaByItemId:  {},
  apiEndpoint:  '/api/verifactu-create',
  qrLabel:      'VERI*FACTU',
  qrText:       'Factura verificable en la sede electrónica de la AEAT',
};
```

#### 3a) Desarrollo local con `netlify dev`

> ⚠️ Con la integración Verifactu **ya no sirve** abrir los HTML con
> `python3 -m http.server` ni con `file://`: la carpeta `netlify/functions/`
> son funciones serverless, no archivos estáticos. Si lo intentas, el botón
> *Emitir ticket* dará `Failed to fetch` porque el endpoint no existe en
> ese servidor.

Para probar todo en local con la función real:

```bash
npm i -g netlify-cli
cp .env.example .env
# edita .env y pon tu VERIFACTI_API_KEY (vf_test_… del sandbox)
netlify dev               # arranca en http://localhost:8888
```

`netlify dev` sirve los HTML estáticos **y** ejecuta la función
`/api/verifactu-create` en el mismo origen, justo como en producción. Lee
las variables de `.env` automáticamente.

Si ya has linkado el sitio con `netlify link`, también puedes bajar las
variables del dashboard sin tocar `.env`:

```bash
netlify env:list                   # ver qué hay configurado
netlify dev                        # ya inyecta las del dashboard
```

#### 3b) Despliegue en Netlify

Opción A — desde la web:

1. Sube el repo a GitHub/GitLab/Bitbucket.
2. En Netlify → *Add new site* → *Import from Git* y selecciona el repo.
3. Build command: vacío. Publish directory: `.`. Functions directory:
   `netlify/functions` (todo esto ya está en `netlify.toml`, así que con
   "Deploy" llega).

Opción B — desde la CLI:

```bash
npm i -g netlify-cli       # solo la primera vez
netlify login
netlify init               # crea el sitio y lo vincula a la carpeta
netlify deploy --build --prod
```

En **Netlify → Site settings → Environment variables** añade:

| Variable             | Valor                                          | Scopes              |
|----------------------|------------------------------------------------|---------------------|
| `VERIFACTI_API_KEY`  | `vf_test_…` (sandbox) o `vf_prod_…` (real)     | Functions, Builds   |
| `VERIFACTI_BASE_URL` | `https://api.verifacti.com` (opcional)         | Functions, Builds   |

O por CLI:

```bash
netlify env:set VERIFACTI_API_KEY vf_test_xxxxxxxxxxxx
netlify deploy --prod
```

#### 4) Prueba en sandbox

- Abre tu deploy en `https://<tu-sitio>.netlify.app/servicio.html`.
- Crea un pedido desde `https://<tu-sitio>.netlify.app/`.
- En el panel de servicio pulsa **🧾 Emitir ticket Verifactu**.
- Si todo va bien, el modal mostrará el QR. Escaneándolo te lleva al sandbox
  de la AEAT, que confirmará que el registro ha sido recibido (el envío
  asíncrono tarda 1-2 min — es el comportamiento normal de Verifactu).
- En el panel de Verifacti puedes ver la lista completa de registros
  emitidos.

#### 5) Pasa a producción

1. En Verifacti activa la suscripción y firma el modelo de representación
   (te genera el PDF ya cumplimentado).
2. Crea la misma empresa en entorno **producción** y obtén su API key
   `vf_prod_…`.
3. `netlify env:set VERIFACTI_API_KEY vf_prod_…` y redeploy.
4. Publica tu propia [declaración responsable](https://verifacti.com/preguntas-frecuentes?id=como-hago-mi-declaracion-responsable)
   (la propia Verifacti te facilita una plantilla).

### Limitaciones actuales y consideraciones

- **Numeración correlativa**: el contador de número de factura vive en
  `localStorage` del dispositivo de servicio. Si usas el panel desde varios
  dispositivos a la vez podrías generar saltos de numeración. Para el modelo
  típico (un único TPV/tablet en la barra) no es problema.
- **Solo F2 (simplificada)**: si un cliente pide factura con NIF, hay que
  añadir un mini-formulario y mandar `tipo_factura: "F1"` con `nif` y
  `nombre`. El handler está preparado para extenderlo.
- **Si la AEAT rechaza un registro a posteriori**: el ticket ya se entregó
  al cliente, así que hay que emitir una **rectificativa** (R1-R5). No
  implementado todavía; Verifacti soporta los endpoints, pero hace falta UI.
- **Nada de certificados digitales en local**: toda la firma y comunicación
  con la AEAT la hace Verifacti. Tú solo gestionas la API key.

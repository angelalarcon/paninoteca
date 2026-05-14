/**
 * Netlify Function (API v2) — Proxy a la API de Verifacti para emitir un
 * registro Veri*Factu (factura simplificada F2) en nombre de la cafetería.
 *
 * Flujo:
 *   navegador (servicio.html)
 *      → POST /api/verifactu-create  con el pedido + nº factura asignado
 *      → esta función firma con `Authorization: Bearer <VERIFACTI_API_KEY>`
 *      → llama a https://api.verifacti.com/verifactu/create
 *      → devuelve {uuid, qr (base64), huella, ...} al navegador
 *
 * Variables de entorno requeridas (Netlify → Site settings → Environment
 * variables, o en `.env` para `netlify dev`):
 *
 *   VERIFACTI_API_KEY      vf_test_xxx (sandbox) o vf_prod_xxx (producción)
 *   VERIFACTI_BASE_URL     opcional, por defecto https://api.verifacti.com
 *
 * Documentación Verifacti: https://verifacti.com/docs
 * Documentación Netlify Functions v2: https://docs.netlify.com/functions/get-started/
 */

const DEFAULT_BASE = 'https://api.verifacti.com';

const round2 = (n) => Math.round(n * 100) / 100;

function formatFechaExpedicion(ms) {
  const d = new Date(ms);
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/** Convierte el carrito (precios PVP, IVA incluido) en líneas Verifactu
 *  agrupadas por tipo impositivo. Devuelve también el total recalculado. */
function buildLineas(items, ivaDefault, ivaByItemId) {
  const groups = new Map();

  for (const it of items) {
    const rate     = ivaByItemId[it.id] != null
                       ? Number(ivaByItemId[it.id])
                       : Number(ivaDefault);
    const totalPVP = (Number(it.price) || 0) * (Number(it.quantity) || 0);
    const base     = totalPVP / (1 + rate / 100);
    const cuota    = totalPVP - base;

    const acc = groups.get(rate) || { base: 0, cuota: 0 };
    acc.base  += base;
    acc.cuota += cuota;
    groups.set(rate, acc);
  }

  const lineas = [];
  let totalRecalc = 0;
  for (const [rate, { base, cuota }] of groups) {
    const b = round2(base);
    const c = round2(cuota);
    lineas.push({
      base_imponible:    String(b),
      tipo_impositivo:   String(rate),
      cuota_repercutida: String(c),
    });
    totalRecalc = round2(totalRecalc + b + c);
  }

  return { lineas, total: totalRecalc };
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export default async (req /* , context */) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const apiKey  = process.env.VERIFACTI_API_KEY;
  const baseUrl = process.env.VERIFACTI_BASE_URL || DEFAULT_BASE;

  if (!apiKey) {
    return json({
      error: 'VERIFACTI_API_KEY no configurada en el servidor.',
      hint:  'Añádela en Netlify → Site settings → Environment variables, o en .env para `netlify dev`.',
    }, 500);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body JSON inválido.' }, 400);
  }
  body = body || {};

  const {
    order,
    invoiceNumber,
    serie,
    ivaDefault   = 10,
    ivaByItemId  = {},
  } = body;

  if (!order || !Array.isArray(order.items) || order.items.length === 0) {
    return json({ error: 'Pedido vacío o malformado.' }, 400);
  }
  if (invoiceNumber == null || serie == null) {
    return json({ error: 'Faltan invoiceNumber o serie.' }, 400);
  }

  const { lineas, total } = buildLineas(order.items, ivaDefault, ivaByItemId);

  // Verifacti rechaza F2 (simplificada) si total ≥ 3.000 €.
  if (total >= 3000) {
    return json({
      error: `Importe ${total} € supera el límite de 3.000 € para factura simplificada (F2). Hay que emitirla como F1 con NIF del cliente.`,
    }, 400);
  }

  const fecha = formatFechaExpedicion(order.updatedAt || order.createdAt || Date.now());
  const desc  = (
    `Pedido #${order.code}` + (order.table ? ` - ${order.table}` : '')
  ).slice(0, 500);

  const payload = {
    serie:            String(serie),
    numero:           String(invoiceNumber),
    fecha_expedicion: fecha,
    tipo_factura:     'F2',
    descripcion:      desc,
    lineas,
    importe_total:    String(total),
  };

  let upstream;
  try {
    upstream = await fetch(`${baseUrl}/verifactu/create`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return json({
      error:  'No se pudo contactar con la API de Verifacti.',
      detail: String(e),
    }, 502);
  }

  const text = await upstream.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!upstream.ok) {
    return json({
      error:    'Verifacti rechazó la solicitud.',
      status:   upstream.status,
      verifacti: data,
      payload,
    }, upstream.status);
  }

  return json({
    ok:        true,
    env:       apiKey.startsWith('vf_test_') ? 'test' : 'prod',
    payload,
    verifacti: data,
  }, 200);
};

/** Hace que esta función v2 esté disponible en /api/verifactu-create
 *  (en lugar de /.netlify/functions/verifactu-create), sin necesidad de
 *  redirects en netlify.toml. */
export const config = {
  path: '/api/verifactu-create',
};

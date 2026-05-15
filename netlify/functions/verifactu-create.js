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
 *   VERIFACTI_MOCK         true/1/yes — respuesta simulada sin llamar a Verifacti
 *                            (nunca en CONTEXT=production). Si no hay API key,
 *                            se activa solo en local y deploy previews de Netlify.
 *
 * Documentación Verifacti: https://verifacti.com/docs
 * Documentación Netlify Functions v2: https://docs.netlify.com/functions/get-started/
 */

import { createHash, randomUUID } from 'node:crypto';

const DEFAULT_BASE = 'https://api.verifacti.com';

const round2 = (n) => Math.round(n * 100) / 100;

const truthy = (v) => v === '1' || v === 'true' || v === 'yes';

/** Simulacro permitido solo fuera de producción en Netlify. */
function isMockEnabled(hasApiKey) {
  const ctx = process.env.CONTEXT || '';
  if (ctx === 'production') return false;

  if (truthy(process.env.VERIFACTI_MOCK)) return true;

  if (!hasApiKey) {
    return (
      process.env.NETLIFY_DEV === 'true' ||
      ctx === 'dev' ||
      ctx === 'deploy-preview' ||
      ctx === 'branch-deploy'
    );
  }
  return false;
}

/** QR visible en ticket; no válido ante la AEAT. */
function mockQrDataUrl(serie, numero) {
  const label = `${serie}-${numero}`.replace(/[<>&'"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <rect width="160" height="160" fill="#fff"/>
  <rect x="6" y="6" width="148" height="148" fill="none" stroke="#111" stroke-width="3"/>
  <text x="80" y="58" text-anchor="middle" font-family="monospace" font-size="13" fill="#b91c1c">SIMULACRO</text>
  <text x="80" y="78" text-anchor="middle" font-family="monospace" font-size="11" fill="#333">VERIFACTU</text>
  <text x="80" y="98" text-anchor="middle" font-family="monospace" font-size="10" fill="#555">${label}</text>
  <text x="80" y="118" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#888">No válido en AEAT</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function buildMockVerifacti(payload) {
  const huella = createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
  return {
    uuid:   randomUUID(),
    qr:     mockQrDataUrl(payload.serie, payload.numero),
    huella,
    _mock:  true,
  };
}

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
  const useMock = isMockEnabled(Boolean(apiKey));

  if (!apiKey && !useMock) {
    return json({
      error: 'VERIFACTI_API_KEY no configurada en el servidor.',
      hint:  'Añádela en Netlify → Site settings → Environment variables, en .env para `netlify dev`, o activa VERIFACTI_MOCK=true en entornos no productivos.',
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

  if (useMock) {
    return json({
      ok:        true,
      env:       'mock',
      mock:      true,
      payload,
      verifacti: buildMockVerifacti(payload),
    }, 200);
  }

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

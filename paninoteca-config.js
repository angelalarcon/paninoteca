/**
 * Configuración fiscal y de integración Verifactu de la cafetería.
 *
 * Edita este archivo UNA VEZ con los datos reales de la cafetería antes de
 * pasar a producción. En sandbox/pruebas puedes dejar los valores de ejemplo.
 *
 * No incluye la API key de Verifacti — esa NUNCA debe vivir en el frontend,
 * sólo en variables de entorno del backend (Vercel Functions).
 */

window.PANINOTECA_CONFIG = {
  /** Datos fiscales del emisor (cafetería). Aparecerán impresos en el ticket.
   *  El NIF real se asocia a la API key en el panel de Verifacti, no aquí. */
  emisor: {
    nif:           'B00000000',
    razonSocial:   '.14 Cafetería / Paninoteca',
    direccion:     'Dirección de la cafetería',
    cp:            '00000',
    poblacion:     'Ciudad',
    telefono:      '',
  },

  /** Serie de facturas. Verifacti exige numero correlativo dentro de cada serie.
   *  Convención sugerida: prefijo + año (ej. "T26" = tickets 2026). */
  serieFactura: 'T26',

  /** % IVA por defecto.
   *  Hostelería con consumición in-situ → 10 % (incluido alcohol servido en local).
   *  Si parte de la venta es para llevar y debe llevar 21 %, configura ivaByItemId. */
  ivaDefault: 10,

  /** Override de IVA por item.id concreto (clave del menu-data.js). */
  ivaByItemId: {
    // Ej.: si vendes botellas para llevar, podrías marcar:
    // 'beb-egal-tostada': 21,
  },

  /** Endpoint del proxy serverless que guarda la API key. No editar en local. */
  apiEndpoint: '/api/verifactu-create',

  /** Texto obligatorio que va junto al QR en la factura (Real Decreto 1007/2023). */
  qrText: 'Factura verificable en la sede electrónica de la AEAT',

  /** Etiqueta visible (cabecera del QR) — la AEAT permite "VERI*FACTU" o el texto largo. */
  qrLabel: 'VERI*FACTU',
};

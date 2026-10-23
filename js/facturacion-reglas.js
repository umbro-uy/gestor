// Reglas de clasificación de facturación (sección Análisis), CENTRALIZADAS y PURAS.
//
// Por qué este archivo: las reglas de "¿en qué categoría cae un pedido sin factura?" se venían tocando de a
// una y cada arreglo rompía otra (p.ej. mover la compuerta de "despachado" hacía que los Pago Después
// dejaran de diferenciarse). Al tenerlas juntas, en una función pura y con un test (test/facturacion.mjs),
// todas conviven y no se pisan: cambiar una obliga a que el test siga verde.
//
// RAMA "SIN FACTURA" — se aplica sólo cuando el pedido NO tiene factura y NO está cancelado/reversado
// (esas dos ramas se resuelven antes, en analisis.js). Cada pedido cae en UNA sola categoría, en este orden:
//
//   1) en proceso (pendienteOK) → PRIMER FILTRO: la factura se espera recién cuando el pedido está
//      PROCESADO, es decir cuando el WMS llegó al menos a "Items clasificados / Orden liberada" (o
//      cualquier estado posterior). NO hace falta que esté despachado. Mientras el WMS siga en "items
//      pedidos" o "items confirmados" (o recién ingresó / se está preparando), todavía NO se procesó →
//      no se factura, CUALQUIERA sea el método de pago. (Los PCN miden "procesado" por Fenicio, abajo.)
//      OJO: antes "Pago Después" se separaba aun SIN procesar, y por eso pedidos que están "Pendiente OK"
//      (en proceso) aparecían como falta de factura / Pago Después. Ya no: en proceso manda.
//   2) pcnManual → PCN (prenda personalizada). Se guía por FENICIO, no por el WMS (que queda congelado para
//                  los PCN): si Fenicio ya lo da por salido (en tránsito / listo para retirar / entregado) →
//                  su filtro "PCN". Si todavía se está haciendo → "en proceso".
//   3) pagoDespues → pedido YA procesado (orden liberada) con método "Pago Después": puede no requerir
//                  factura ahora (se factura al cobrar). Se separa para revisarlo caso a caso.
//   4) ccForzar  → Click & Collect YA procesado sin factura → forzar en el WMS.
//   5) revisar   → procesado (orden liberada o más) sin factura de verdad → falta emitirla.
(function (root) {
  // Estados del WMS en los que YA se espera factura: el pedido está PROCESADO (llegó a "Items clasificados /
  // Orden liberada") o más allá (pronto para despacho, despachado, en tránsito, recibido en tienda, listo
  // para retirar, entregado). Lo anterior — items pedidos, items confirmados, pedido recibido, preparando —
  // todavía NO se procesó. OJO: no hace falta el despacho; alcanza con la orden liberada.
  var RE_FACTURABLE = /clasificad|orden\s*liberad|liberad|pronto.*despach|despachad|tr[aá]nsito|camino|recibid[oa]?\s*(en\s*)?tienda|listo.*retir|entregad/i;

  // PCN (prendas personalizadas): el estado del WMS NO se actualiza para ellos (queda pegado en "Items
  // pedidos" aunque ya se hayan entregado), así que para los PCN nos guiamos por el estado de FENICIO. Se
  // los diferencia en su filtro "PCN" cuando Fenicio muestra que ya salió: en tránsito / listo para retirar /
  // entregado. Antes de eso quedan en "en proceso" (todavía se está haciendo la prenda).
  var RE_PCN_LISTO = /tr[aá]nsito|camino|retir|entregad/i;

  // c = { estadoWMS, estadoFen, esPcn, clickCollect, pagoDespues }  →  { grupo, razon }
  function clasificarSinFactura(c) {
    c = c || {};
    // PCN: "procesado/salido" se mide por FENICIO (el WMS queda congelado). En preparación → en proceso.
    if (c.esPcn) {
      if (!RE_PCN_LISTO.test(String(c.estadoFen || ""))) return { grupo: "pendienteOK", razon: "PCN (personalizada) en preparación — todavía no se factura" };
      return { grupo: "pcnManual", razon: "Prenda personalizada (PCN) — facturar/forzar manualmente" };
    }
    // EN PROCESO: si todavía NO se procesó (sin orden liberada), no se factura aún, CUALQUIERA sea el método
    // de pago. Así un Pago Después en proceso queda en "Pendiente OK" y no como falta de factura.
    if (!RE_FACTURABLE.test(String(c.estadoWMS || ""))) return { grupo: "pendienteOK", razon: "Todavía no procesado (sin orden liberada) — no se factura aún" };
    // Ya PROCESADO (orden liberada o más) y sin factura:
    if (c.pagoDespues) return { grupo: "pagoDespues", razon: "Pago Después YA procesado sin factura — revisar caso a caso (suele facturarse al cobrar)" };
    if (c.clickCollect) return { grupo: "ccForzar", razon: "Click & Collect sin factura — pedir al WMS que fuerce la facturación automática" };
    return { grupo: "revisar", razon: "Orden liberada sin factura — emitir ⚠️" };
  }

  var api = { clasificarSinFactura: clasificarSinFactura, RE_FACTURABLE: RE_FACTURABLE, RE_PCN_LISTO: RE_PCN_LISTO };
  if (typeof module !== "undefined" && module.exports) module.exports = api; // node (test)
  root.FacturacionReglas = api; // navegador (lo usa js/analisis.js)
})(typeof window !== "undefined" ? window : globalThis);

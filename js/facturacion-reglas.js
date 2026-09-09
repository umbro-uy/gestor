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
//   1) pagoDespues → "Pago Después" es un MÉTODO DE PAGO (atributo del pedido), no depende del despacho:
//      puede no requerir factura (se factura al cobrar). Se separa SIEMPRE en su propia categoría —aunque
//      el pedido todavía no se haya despachado— para poder revisarlo caso a caso y que NO se pierda dentro
//      de "en proceso" ni se marque como "falta factura".
//   2) en proceso (pendienteOK) → la factura se emite recién al DESPACHAR (ahí el pedido se procesó y salió).
//      Mientras el WMS siga en items pedidos/confirmados, clasificados / orden liberada o preparando, todavía
//      no se factura. Manda el estado del WMS (aunque Fenicio muestre otra cosa). Vale también para PCN y C&C.
//   3) pcnManual → PCN (prenda personalizada) YA despachado sin factura → hay que facturar/forzar a mano.
//   4) ccForzar  → Click & Collect YA despachado (entregado en tienda) sin factura → forzar en el WMS.
//   5) revisar   → despachado sin factura de verdad → falta emitirla.
(function (root) {
  // Estados del WMS en los que YA se espera factura (el pedido se despachó / va en camino / se entregó).
  // Lo anterior (items pedidos/confirmados, clasificados / orden liberada, preparando, pronto para despacho)
  // todavía no se despachó.
  var RE_DESPACHADO = /despachad|tr[aá]nsito|camino|recibid[oa]?\s*(en\s*)?tienda|entregad/i;

  // c = { estadoWMS, esPcn, clickCollect, pagoDespues }  →  { grupo, razon }
  function clasificarSinFactura(c) {
    c = c || {};
    if (c.pagoDespues) return { grupo: "pagoDespues", razon: "Método Pago Después sin factura — revisar caso a caso (suele facturarse al cobrar)" };
    if (!RE_DESPACHADO.test(String(c.estadoWMS || ""))) return { grupo: "pendienteOK", razon: "Todavía no despachado — no se factura aún" };
    if (c.esPcn) return { grupo: "pcnManual", razon: "Prenda personalizada (PCN) — facturar/forzar manualmente" };
    if (c.clickCollect) return { grupo: "ccForzar", razon: "Click & Collect sin factura — pedir al WMS que fuerce la facturación automática" };
    return { grupo: "revisar", razon: "Despachado sin factura — emitir ⚠️" };
  }

  var api = { clasificarSinFactura: clasificarSinFactura, RE_DESPACHADO: RE_DESPACHADO };
  if (typeof module !== "undefined" && module.exports) module.exports = api; // node (test)
  root.FacturacionReglas = api; // navegador (lo usa js/analisis.js)
})(typeof window !== "undefined" ? window : globalThis);

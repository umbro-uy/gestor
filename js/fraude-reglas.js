// Reglas de scoring de FRAUDE (sección Análisis → Fraude), CENTRALIZADAS y PURAS.
//
// Por qué este archivo: igual que facturacion-reglas.js, las reglas de "¿qué tan sospechoso es este pedido?"
// viven en una función pura con test (test/fraude.mjs), para que los pesos sean explícitos, auditables y no
// se pisen entre sí. NO hace DOM ni cripto: el navegador calcula el hash del PAN y arma los conteos, y le
// pasa a evaluar() sólo números/booleanos.
//
// Base (backtest prospectivo sobre datos reales de TimeOut, 16 meses):
//   · Lista negra (reusar un dato de un fraude YA confirmado): casi perfecta sobre reincidentes y ~0 falsas
//     alarmas → es ALARMA DURA (bloquea), y es la única capa que cruza tiendas.
//   · Mail usado por varios documentos: muy preciso (0% de falsas alarmas) → peso alto.
//   · Tarjeta usada por varios documentos: ruidoso (hasta 25-31% de clientes buenos) → peso bajo, NUNCA bloquea.
//   · Importe ≥ $6.000: la regla actual; marca casi todos los fraudes que hoy detectan, pero inunda la cola
//     de revisión → suma para priorizar, no para bloquear.
(function (root) {
  var UMBRAL_IMPORTE = 6000; // regla de importe que la empresa ya usa hoy

  // Normaliza un atributo para comparar/igualar (documento, mail, IP): minúsculas, sin espacios ni acentos.
  function normAttr(s) {
    return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "").trim();
  }

  // ctx = {
  //   enBlocklist : bool,  // reusa un atributo (hash de tarjeta / doc / mail / IP) de un fraude YA confirmado
  //   docsPorTarjeta: n,   // documentos distintos que usaron ESTA tarjeta (en lo cargado + histórico)
  //   docsPorMail : n,     // documentos distintos que usaron ESTE mail
  //   docsPorIp   : n,     // documentos distintos desde ESTA IP
  //   importe     : n      // importe del pedido
  // } → { score, nivel, motivos:[], bloqueado }
  function evaluar(ctx) {
    ctx = ctx || {};
    var motivos = [], score = 0;
    var dt = ctx.docsPorTarjeta || 0, dm = ctx.docsPorMail || 0, di = ctx.docsPorIp || 0, imp = ctx.importe || 0;
    if (ctx.enBlocklist) { score += 100; motivos.push("Reusa datos de un fraude YA confirmado (lista negra)"); }
    if (dm >= 2) { score += 40; motivos.push("Mismo mail con " + dm + " documentos distintos"); }
    if (dt >= 3) { score += 20; motivos.push("Misma tarjeta con " + dt + " documentos distintos"); }
    else if (dt >= 2) { score += 8; motivos.push("Misma tarjeta con 2 documentos distintos"); }
    if (di >= 3) { score += 15; motivos.push("Misma IP con " + di + " documentos distintos"); }
    if (imp >= UMBRAL_IMPORTE) { score += 20; motivos.push("Importe alto (≥ $" + UMBRAL_IMPORTE + ")"); }
    var nivel = ctx.enBlocklist ? "bloquear" : score >= 50 ? "alto" : score >= 25 ? "medio" : "bajo";
    return { score: score, nivel: nivel, motivos: motivos, bloqueado: !!ctx.enBlocklist };
  }

  var api = { evaluar: evaluar, normAttr: normAttr, UMBRAL_IMPORTE: UMBRAL_IMPORTE };
  if (typeof module !== "undefined" && module.exports) module.exports = api; // node (test)
  root.FraudeReglas = api; // navegador (lo usa js/analisis.js)
})(typeof window !== "undefined" ? window : globalThis);

// Test de las reglas de facturación (rama "sin factura"). Fija el comportamiento de
// FacturacionReglas.clasificarSinFactura para que las reglas CONVIVAN y no se rompan entre sí al tocar una.
// Si este test falla, alguna regla dejó de aplicarse (ej.: los Pago Después dejaron de diferenciarse, o
// cambió la vara de "cuándo se espera factura").
import assert from "node:assert";
import fac from "../js/facturacion-reglas.js";

const { clasificarSinFactura } = fac;
const g = c => clasificarSinFactura(c).grupo;

// Estados del WMS (los reales de Encuentra), separados por si el pedido ya está PROCESADO (orden liberada
// o más) o todavía no. La factura se espera desde "Items clasificados / Orden liberada" — NO hace falta
// que esté despachado.
const EN_PROCESO = ["Items Pedidos", "Items Confirmados"];
const PROCESADO = ["Items Clasificados  (Orden Liberada) ", "Pedido en  envio pronto para despacho", "Pedido Despachado", "Pedido recibido  en tienda", "Pedido entregado  a cliente", "Pedido en tránsito"];

let fallos = 0;
const check = (msg, real, esperado) => {
  if (real === esperado) { console.log("  ✓ " + msg); }
  else { fallos++; console.error("  ✗ " + msg + " → esperaba '" + esperado + "', dio '" + real + "'"); }
};

// 1) Pago Después SIEMPRE se diferencia, esté procesado o no (regla que motivó centralizar esto).
for (const e of EN_PROCESO) check("Pago Después no procesado (" + e.trim() + ")", g({ estadoWMS: e, pagoDespues: true }), "pagoDespues");
for (const e of PROCESADO) check("Pago Después procesado (" + e.trim() + ")", g({ estadoWMS: e, pagoDespues: true }), "pagoDespues");
check("Pago Después + PCN procesado", g({ estadoWMS: "Items Clasificados  (Orden Liberada) ", pagoDespues: true, esPcn: true }), "pagoDespues");
check("Pago Después + C&C procesado", g({ estadoWMS: "Pedido recibido  en tienda", pagoDespues: true, clickCollect: true }), "pagoDespues");

// 2) Sin procesar (items pedidos/confirmados) y sin Pago Después → en proceso, aunque sea PCN o C&C.
for (const e of EN_PROCESO) check("Normal no procesado (" + e.trim() + ")", g({ estadoWMS: e }), "pendienteOK");
check("PCN sin estado de Fenicio avanzado → en proceso", g({ estadoWMS: "Pedido Despachado", estadoFen: "Pedido recibido", esPcn: true }), "pendienteOK");
check("C&C no procesado → en proceso", g({ estadoWMS: "Items Confirmados", clickCollect: true }), "pendienteOK");

// 3) Orden liberada (procesado) SIN despachar → ya cuenta como pendiente de factura ("Revisar").
check("Orden liberada, sin despachar → revisar", g({ estadoWMS: "Items Clasificados  (Orden Liberada) " }), "revisar");
check("Pronto para despacho → revisar", g({ estadoWMS: "Pedido en  envio pronto para despacho" }), "revisar");
for (const e of PROCESADO) check("Procesado normal (" + e.trim() + ") → revisar", g({ estadoWMS: e }), "revisar");

// 4) PCN → se guía por FENICIO, no por el WMS (que queda congelado para los PCN).
//    El caso real: Fenicio "entregado" pero WMS pegado en "Items Pedidos" → igual va a PCN.
check("PCN Fenicio entregado, WMS congelado (Items Pedidos) → pcnManual", g({ estadoWMS: "Items Pedidos", estadoFen: "Pedido entregado", esPcn: true }), "pcnManual");
check("PCN Fenicio en tránsito → pcnManual", g({ estadoWMS: "Items Pedidos", estadoFen: "Pedido en tránsito", esPcn: true }), "pcnManual");
check("PCN Fenicio listo para retirar → pcnManual", g({ estadoWMS: "Items Confirmados", estadoFen: "Listo para retirar", esPcn: true }), "pcnManual");
check("PCN Fenicio en preparación (recibido) → en proceso", g({ estadoWMS: "Items Clasificados  (Orden Liberada) ", estadoFen: "Pedido recibido", esPcn: true }), "pendienteOK");
check("PCN Fenicio preparando → en proceso", g({ estadoWMS: "Pedido Despachado", estadoFen: "Preparando pedido", esPcn: true }), "pendienteOK");
// 5) C&C procesado sin factura → ccForzar.
check("C&C orden liberada → ccForzar", g({ estadoWMS: "Items Clasificados  (Orden Liberada) ", clickCollect: true }), "ccForzar");
check("C&C recibido en tienda → ccForzar", g({ estadoWMS: "Pedido recibido  en tienda", clickCollect: true }), "ccForzar");

// Precedencia PCN vs C&C (PCN primero, guiado por Fenicio) cuando ambos.
check("PCN + C&C, Fenicio entregado → pcnManual (PCN primero)", g({ estadoWMS: "Items Clasificados  (Orden Liberada) ", estadoFen: "Pedido entregado", esPcn: true, clickCollect: true }), "pcnManual");

if (fallos) { console.error("\n" + fallos + " caso(s) de facturación FALLARON."); process.exit(1); }
console.log("\nReglas de facturación OK.");

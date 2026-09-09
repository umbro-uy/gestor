// Test de las reglas de facturación (rama "sin factura"). Fija el comportamiento de
// FacturacionReglas.clasificarSinFactura para que las reglas CONVIVAN y no se rompan entre sí al tocar una.
// Si este test falla, alguna regla dejó de aplicarse (ej.: los Pago Después dejaron de diferenciarse).
import assert from "node:assert";
import fac from "../js/facturacion-reglas.js";

const { clasificarSinFactura } = fac;
const g = c => clasificarSinFactura(c).grupo;

// Estados del WMS de muestra (los reales de Encuentra)
const NO_DESP = ["Items Pedidos", "Items Confirmados", "Items Clasificados  (Orden Liberada) ", "Pedido en  envio pronto para despacho"];
const DESP = ["Pedido Despachado", "Pedido recibido  en tienda", "Pedido entregado  a cliente", "Pedido en tránsito"];

let fallos = 0;
const check = (msg, real, esperado) => {
  if (real === esperado) { console.log("  ✓ " + msg); }
  else { fallos++; console.error("  ✗ " + msg + " → esperaba '" + esperado + "', dio '" + real + "'"); }
};

// 1) Pago Después SIEMPRE se diferencia, esté despachado o no (la regresión que motivó este test).
for (const e of NO_DESP) check("Pago Después no despachado (" + e.trim() + ")", g({ estadoWMS: e, pagoDespues: true }), "pagoDespues");
for (const e of DESP) check("Pago Después despachado (" + e.trim() + ")", g({ estadoWMS: e, pagoDespues: true }), "pagoDespues");
// Pago Después manda sobre PCN y C&C.
check("Pago Después + PCN despachado", g({ estadoWMS: "Pedido Despachado", pagoDespues: true, esPcn: true }), "pagoDespues");
check("Pago Después + C&C despachado", g({ estadoWMS: "Pedido recibido  en tienda", pagoDespues: true, clickCollect: true }), "pagoDespues");

// 2) Sin despachar (y sin Pago Después) → en proceso, aunque sea PCN o C&C (no se factura todavía).
for (const e of NO_DESP) check("Normal no despachado (" + e.trim() + ")", g({ estadoWMS: e }), "pendienteOK");
check("PCN no despachado → en proceso", g({ estadoWMS: "Items Pedidos", esPcn: true }), "pendienteOK");
check("C&C no despachado → en proceso", g({ estadoWMS: "Items Clasificados  (Orden Liberada) ", clickCollect: true }), "pendienteOK");
// Aunque Fenicio diga entregado, manda el WMS: si el WMS no despachó, es "en proceso".
check("WMS orden liberada (Fenicio dirá otra cosa) → en proceso", g({ estadoWMS: "Items Clasificados  (Orden Liberada) " }), "pendienteOK");

// 3) PCN despachado sin factura → pcnManual.
check("PCN despachado → pcnManual", g({ estadoWMS: "Pedido Despachado", esPcn: true }), "pcnManual");
// 4) C&C despachado sin factura → ccForzar.
check("C&C despachado → ccForzar", g({ estadoWMS: "Pedido recibido  en tienda", clickCollect: true }), "ccForzar");
check("C&C entregado → ccForzar", g({ estadoWMS: "Pedido entregado  a cliente", clickCollect: true }), "ccForzar");
// 5) Normal despachado sin factura → revisar (falta factura de verdad).
for (const e of DESP) check("Normal despachado (" + e.trim() + ") → revisar", g({ estadoWMS: e }), "revisar");

// Precedencia PCN vs C&C (PCN primero) cuando ambos y despachado.
check("PCN + C&C despachado → pcnManual (PCN primero)", g({ estadoWMS: "Pedido Despachado", esPcn: true, clickCollect: true }), "pcnManual");

if (fallos) { console.error("\n" + fallos + " caso(s) de facturación FALLARON."); process.exit(1); }
console.log("\nReglas de facturación OK.");

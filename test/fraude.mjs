// Test de las reglas de scoring de fraude. Fija los pesos y la precedencia: la lista negra BLOQUEA, el mail
// multi-doc pesa fuerte (preciso), la tarjeta multi-doc pesa poco (ruidoso) y NUNCA bloquea por sí sola.
import assert from "node:assert";
import fr from "../js/fraude-reglas.js";

const { evaluar, normAttr } = fr;
let fallos = 0;
const check = (msg, real, esperado) => {
  if (real === esperado) console.log("  ✓ " + msg);
  else { fallos++; console.error("  ✗ " + msg + " → esperaba '" + esperado + "', dio '" + real + "'"); }
};

// 1) Lista negra = alarma dura (bloquea), gane lo que gane el resto.
check("Lista negra → nivel bloquear", evaluar({ enBlocklist: true }).nivel, "bloquear");
check("Lista negra → bloqueado true", evaluar({ enBlocklist: true }).bloqueado, true);
check("Lista negra sola supera 50 (alto+)", evaluar({ enBlocklist: true }).score >= 50, true);

// 2) Mail multi-doc es preciso → debe empujar a nivel medio/alto sin ser lista negra.
check("Mail con 2 docs → nivel medio", evaluar({ docsPorMail: 2 }).nivel, "medio");
check("Mail con 2 docs NO bloquea", evaluar({ docsPorMail: 2 }).bloqueado, false);

// 3) Tarjeta multi-doc es ruidosa → NO alcanza para bloquear ni para alto por sí sola.
check("Tarjeta con 2 docs → nivel bajo (ruido)", evaluar({ docsPorTarjeta: 2 }).nivel, "bajo");
check("Tarjeta con 3 docs → no bloquea", evaluar({ docsPorTarjeta: 3 }).bloqueado, false);
check("Tarjeta con 3 docs pesa más que con 2", evaluar({ docsPorTarjeta: 3 }).score > evaluar({ docsPorTarjeta: 2 }).score, true);

// 3b) Zona de riesgo suma pero no bloquea por sí sola.
check("Zona de riesgo sola → no bloquea", evaluar({ zonaRiesgo: true }).bloqueado, false);
check("Zona de riesgo suma 15", evaluar({ zonaRiesgo: true }).score, 15);
check("Zona de riesgo + mail 2 docs → alto", evaluar({ zonaRiesgo: true, docsPorMail: 2 }).nivel, "alto");

// 4) Importe solo no bloquea, pero suma para priorizar.
check("Importe alto solo → no bloquea", evaluar({ importe: 9000 }).bloqueado, false);
check("Importe bajo no suma", evaluar({ importe: 100 }).score, 0);
check("Importe alto suma 20", evaluar({ importe: 9000 }).score, 20);

// 5) Señales que se acumulan llegan a 'alto'.
check("Mail 2 docs + importe alto → alto", evaluar({ docsPorMail: 2, importe: 9000 }).nivel, "alto");

// 6) Sin señales → bajo, sin motivos.
check("Sin señales → bajo", evaluar({}).nivel, "bajo");
check("Sin señales → 0 motivos", evaluar({}).motivos.length, 0);

// 7) normAttr: iguala mismo documento escrito distinto.
check("normAttr documento con puntos/espacios", normAttr(" 1.234.567-8 "), "1.234.567-8".toLowerCase().replace(/\s+/g, ""));
check("normAttr mail mayúsculas", normAttr("Juan@Mail.COM"), "juan@mail.com");

if (fallos) { console.error("\n" + fallos + " caso(s) de fraude FALLARON."); process.exit(1); }
console.log("\nReglas de fraude OK.");

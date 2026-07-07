// Chequeo de sintaxis: corre `node --check` sobre cada módulo de js/.
// Atrapa paréntesis/llaves desbalanceados y errores de parseo antes de publicar.
import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const jsDir = join(root, "js");
const files = readdirSync(jsDir).filter((f) => f.endsWith(".js")).sort();

let fallos = 0;
for (const f of files) {
  try {
    execFileSync(process.execPath, ["--check", join(jsDir, f)], { stdio: "pipe" });
    console.log("  ✓ js/" + f);
  } catch (e) {
    fallos++;
    console.error("  ✗ js/" + f + "\n" + (e.stderr ? e.stderr.toString() : e.message));
  }
}
if (fallos) {
  console.error(`\n${fallos} archivo(s) con errores de sintaxis.`);
  process.exit(1);
}
console.log(`\n${files.length} archivos OK.`);

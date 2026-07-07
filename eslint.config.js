// Config de ESLint (flat) para el Gestor.
//
// La app son <script> clásicos que COMPARTEN el ámbito global (js/core.js define C, Bar, Chip,
// useState, etc. y los demás los usan). ESLint analiza archivo por archivo, así que "no-undef" y
// "no-unused-vars" darían cientos de falsos positivos (una función definida en un archivo y usada
// en otro se ve como "sin usar"/"no definida"). Por eso se apagan esos dos y se conserva el resto
// del set recomendado, que sí atrapa bugs reales: claves duplicadas, código inalcanzable,
// asignaciones en condiciones, typeof inválido, reasignar const, etc.
const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    files: ["js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      "no-empty": "off",
      "no-cond-assign": ["error", "except-parens"],
    },
  },
];

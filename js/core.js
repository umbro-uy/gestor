/* ===================================================================
   core — paleta, constantes, helpers, Supabase, iconos, primitivas UI, tema
   Parte del Gestor del Equipo. Se carga como <script> clásico desde
   index.html; comparte el ámbito global con los demás archivos js/.
   =================================================================== */

const {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo
} = React;

/* ── paleta ── */
const C = {
  ink: "var(--hd)",
  blue: "var(--ac)",
  soft: "var(--ac-s)",
  bg: "var(--bg)",
  red: "#D7263D",
  redS: "#FCE9EC",
  green: "#0E8A5F",
  greenS: "#E6F4EE",
  amber: "#B97A00",
  amberS: "#FCF3E0",
  gray: "#64748B",
  line: "#E5E9F0"
};
const ESTADOS = ["pendiente", "en_curso", "hecho"];
const E_LABEL = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  hecho: "Hecho"
};
const PRI = {
  alta: {
    l: "Alta",
    c: C.red,
    s: C.redS
  },
  media: {
    l: "Media",
    c: C.amber,
    s: C.amberS
  },
  baja: {
    l: "Baja",
    c: C.gray,
    s: "#EEF1F5"
  }
};
const TIENDAS = ["TimeOut", "Tienda Nacional", "Classico", "Umbro", "General"];
const hoy = () => new Date().toISOString().slice(0, 10);
const fmtF = iso => {
  if (!iso) return "Sin fecha";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
};
const vencida = t => t.estado !== "hecho" && t.fecha_limite && t.fecha_limite < hoy();
const uid = () => Math.random().toString(36).slice(2, 8);

/* ── Supabase ── */
const configOK = SUPABASE_URL && !SUPABASE_URL.includes("PEGA") && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes("PEGA");
const supa = configOK ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

/* ── Iconos SVG ── */
const I = ({
  d,
  size = 16,
  sw = 2
}) => /*#__PURE__*/React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: sw,
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, d);
const Ic = {
  dash: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "3",
      width: "7",
      height: "9"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "14",
      y: "3",
      width: "7",
      height: "5"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "14",
      y: "12",
      width: "7",
      height: "9"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "16",
      width: "7",
      height: "5"
    }))
  }),
  board: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "3",
      width: "18",
      height: "18",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M9 3v18M15 3v18"
    }))
  }),
  users: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "9",
      cy: "7",
      r: "4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
    }))
  }),
  target: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "6"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "2"
    }))
  }),
  chart: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("line", {
      x1: "18",
      y1: "20",
      x2: "18",
      y2: "10"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "12",
      y1: "20",
      x2: "12",
      y2: "4"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "6",
      y1: "20",
      x2: "6",
      y2: "14"
    }))
  }),
  ops: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
    }), /*#__PURE__*/React.createElement("polyline", {
      points: "14 2 14 8 20 8"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "16",
      y1: "13",
      x2: "8",
      y2: "13"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "16",
      y1: "17",
      x2: "8",
      y2: "17"
    }), /*#__PURE__*/React.createElement("polyline", {
      points: "10 9 9 9 8 9"
    }))
  }),
  plus: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M12 5v14M5 12h14"
    }))
  }),
  trash: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
    }))
  }),
  edit: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"
    }))
  }),
  check: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M20 6L9 17l-5-5"
    }))
  }),
  x: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M18 6L6 18M6 6l12 12"
    }))
  }),
  left: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M15 18l-6-6 6-6"
    }))
  }),
  right: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M9 18l6-6-6-6"
    }))
  }),
  chevD: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M6 9l6 6 6-6"
    }))
  }),
  chevR: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M9 18l6-6-6-6"
    })),
    size: 14
  }),
  alert: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 9v4M12 17h.01"
    }))
  }),
  clock: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 6v6l4 2"
    }))
  }),
  ok: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M9 12l2 2 4-4"
    }))
  }),
  trend: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M23 6l-9.5 9.5-5-5L1 18"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M17 6h6v6"
    }))
  }),
  palette: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "13.5",
      cy: "6.5",
      r: ".5",
      fill: "currentColor"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "17.5",
      cy: "10.5",
      r: ".5",
      fill: "currentColor"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "8.5",
      cy: "7.5",
      r: ".5",
      fill: "currentColor"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "6.5",
      cy: "12.5",
      r: ".5",
      fill: "currentColor"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"
    }))
  }),
  refresh: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M23 4v6h-6M1 20v-6h6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
    }))
  }),
  out: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
    }))
  }),
  upload: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("polyline", {
      points: "16 16 12 12 8 16"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "12",
      y1: "12",
      x2: "12",
      y2: "21"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"
    }))
  }),
  store: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
    }), /*#__PURE__*/React.createElement("polyline", {
      points: "9 22 9 12 15 12 15 22"
    })),
    size: 10
  }),
  lock: /*#__PURE__*/React.createElement(I, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "11",
      width: "18",
      height: "11",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M7 11V7a5 5 0 0 1 10 0v4"
    })),
    size: 11
  })
};

/* ── UI helpers ── */
const Chip = ({
  children,
  color,
  soft,
  sm
}) => /*#__PURE__*/React.createElement("span", {
  style: {
    background: soft,
    color
  },
  className: `inline-flex items-center gap-1 px-2 rounded-full font-semibold whitespace-nowrap ${sm ? "text-[10px] py-px" : "text-xs py-0.5"}`
}, children);
const Bar = ({
  pct,
  color,
  h = 8
}) => /*#__PURE__*/React.createElement("div", {
  className: "w-full rounded-full overflow-hidden",
  style: {
    background: "#EDF0F5",
    height: h
  }
}, /*#__PURE__*/React.createElement("div", {
  className: "h-full rounded-full transition-all",
  style: {
    width: `${Math.min(100, Math.max(0, pct || 0))}%`,
    background: color || C.blue
  }
}));
const Title = ({
  eyebrow,
  title,
  right
}) => /*#__PURE__*/React.createElement("div", {
  className: "flex items-end justify-between mb-4 gap-3 flex-wrap"
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  className: "text-[11px] font-bold uppercase tracking-widest",
  style: {
    color: C.blue
  }
}, eyebrow), /*#__PURE__*/React.createElement("h2", {
  className: "text-xl font-black fraunces",
  style: {
    color: C.ink
  }
}, title)), right);
const Inp = ({
  className = "",
  style = {},
  ...p
}) => /*#__PURE__*/React.createElement("input", {
  className: `w-full text-sm rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 ${className}`,
  style: {
    borderColor: C.line,
    ...style
  },
  ...p
});
const Sel = ({
  children,
  className = "",
  ...p
}) => /*#__PURE__*/React.createElement("select", {
  className: `w-full text-sm rounded-xl border px-3 py-2 bg-white outline-none ${className}`,
  style: {
    borderColor: C.line
  },
  ...p
}, children);
// Sección plegable: oculta desgloses detrás de un clic para mantener la vista compacta.
function Collapse({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  children
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border",
    style: { borderColor: C.line }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(o => !o),
    className: "w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm font-bold truncate",
    style: { color: C.ink }
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    className: "text-xs truncate",
    style: { color: C.gray }
  }, subtitle)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 shrink-0"
  }, badge, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold",
    style: { color: C.blue }
  }, open ? "Ocultar ▲" : "Ver ▼"))), open && /*#__PURE__*/React.createElement("div", {
    className: "px-4 pb-4 border-t pt-3",
    style: { borderColor: C.line }
  }, children));
}

// Logo de Umbro recreado como SVG (rombo concéntrico). Escalable y sin archivos externos.
// h = alto en px. wordmark = agrega la palabra "umbro" debajo (para el login).
const UmbroLogo = ({ h = 24, color = "#fff", wordmark = false, row = false, className = "", style = {} }) => {
  // h = alto del rombo en px. wordmark = agrega la palabra "umbro" (parte del logo).
  // row = lockup horizontal (rombo + palabra al lado); por defecto vertical (rombo arriba, palabra abajo).
  const cx = 100, cy = 46;
  const dia = (rx, ry) => `M${cx} ${cy - ry}L${cx + rx} ${cy}L${cx} ${cy + ry}L${cx - rx} ${cy}Z`;
  const rings = [[98, 44], [80, 35.5], [60, 26.5], [43, 19], [23, 10], [9, 4]];
  const d = rings.map(([rx, ry]) => dia(rx, ry)).join("");
  const svg = /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 200 92", height: h, width: h * 200 / 92, role: "img", "aria-label": "Umbro",
    style: { display: "block" }
  }, /*#__PURE__*/React.createElement("path", { d, fill: color, fillRule: "evenodd" }));
  if (!wordmark) return /*#__PURE__*/React.createElement("span", { className, style: { display: "inline-flex", ...style } }, svg);
  const word = /*#__PURE__*/React.createElement("span", {
    style: { color, fontWeight: 800, fontSize: h * (row ? 0.92 : 0.66), lineHeight: 1, letterSpacing: "-0.04em", fontFamily: "'Poppins',sans-serif" }
  }, "umbro");
  return /*#__PURE__*/React.createElement("span", {
    className,
    style: row
      ? { display: "inline-flex", flexDirection: "row", alignItems: "center", gap: h * 0.42, ...style }
      : { display: "inline-flex", flexDirection: "column", alignItems: "center", gap: h * 0.2, ...style }
  }, svg, word);
};

/* ── Apariencia ── */
const TEMA0 = {
  ac: "#0A4DA3",
  bg: "#F6F7F9",
  hd: "#0E1B33"
};
const PRESETS = [{
  n: "Clásico",
  ac: "#0A4DA3",
  bg: "#F6F7F9",
  hd: "#0E1B33"
}, {
  n: "Cálido",
  ac: "#C2410C",
  bg: "#FBF7F2",
  hd: "#2A1A12"
}, {
  n: "Verde",
  ac: "#0E8A5F",
  bg: "#F3F8F5",
  hd: "#0E2A20"
}, {
  n: "Violeta",
  ac: "#7C3AED",
  bg: "#F8F6FD",
  hd: "#1E1633"
}, {
  n: "Coral",
  ac: "#E11D74",
  bg: "#FDF6F8",
  hd: "#2A0E1B"
}];
function mezclar(hex, f = 0.88) {
  try {
    const h = hex.replace("#", "");
    const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    return `rgb(${[r, g, b].map(c => Math.round(c + (255 - c) * f)).join(",")})`;
  } catch {
    return "#E8F0FB";
  }
}
function aplicarTema(t) {
  const s = document.documentElement.style;
  s.setProperty("--ac", t.ac);
  s.setProperty("--ac-s", mezclar(t.ac));
  s.setProperty("--bg", t.bg);
  s.setProperty("--hd", t.hd);
}
function PanelApariencia({
  tema,
  setTema,
  cerrar
}) {
  const [t, setT] = useState(tema);
  const ap = nt => {
    setT(nt);
    aplicarTema(nt);
  };
  const [saving, setSaving] = useState(false);
  const guardar = async () => {
    setSaving(true);
    await supa.from("ajustes").upsert({
      id: 1,
      acento: t.ac,
      fondo: t.bg,
      cabecera: t.hd
    });
    setTema(t);
    setSaving(false);
    cerrar();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 flex items-center justify-center p-4",
    style: {
      background: "rgba(14,27,51,0.5)"
    },
    onClick: cerrar
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-black fraunces",
    style: {
      color: C.ink
    }
  }, "Apariencia"), /*#__PURE__*/React.createElement("button", {
    onClick: cerrar,
    className: "p-1.5 rounded-lg hover:bg-slate-100",
    style: {
      color: C.gray
    }
  }, Ic.x)), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 mb-4"
  }, PRESETS.map(p => /*#__PURE__*/React.createElement("button", {
    key: p.n,
    onClick: () => ap({
      ac: p.ac,
      bg: p.bg,
      hd: p.hd
    }),
    className: "flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full border text-xs font-bold hover:scale-105 transition-transform",
    style: {
      borderColor: C.line
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-3.5 h-3.5 rounded-full",
    style: {
      background: p.ac
    }
  }), p.n))), [["Color principal", "ac"], ["Fondo", "bg"], ["Cabecera", "hd"]].map(([l, k]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    className: "flex items-center justify-between py-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium"
  }, l), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-mono px-1.5 py-0.5 rounded",
    style: {
      background: "#F1F4F8",
      color: C.gray
    }
  }, t[k]), /*#__PURE__*/React.createElement("input", {
    type: "color",
    value: t[k],
    onChange: e => ap({
      ...t,
      [k]: e.target.value
    }),
    className: "w-8 h-8 rounded-lg border cursor-pointer p-0.5",
    style: {
      borderColor: C.line
    }
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 justify-end mt-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => ap(TEMA0),
    className: "text-xs font-bold px-3 py-2 rounded-xl",
    style: {
      color: C.gray
    }
  }, "Restablecer"), /*#__PURE__*/React.createElement("button", {
    onClick: guardar,
    disabled: saving,
    className: "text-sm font-bold text-white px-5 py-2 rounded-xl disabled:opacity-50",
    style: {
      background: C.blue
    }
  }, saving ? "Guardando…" : "Guardar"))));
}

/* ── Config check ── */
if (!configOK) {
  ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement("div", {
    className: "min-h-screen flex items-center justify-center p-6",
    style: {
      background: "#F6F7F9"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border p-6 max-w-md",
    style: {
      borderColor: "#E5E9F0"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-lg font-bold mb-2"
  }, "Falta configurar las credenciales"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500"
  }, "Abrí el ", /*#__PURE__*/React.createElement("b", null, "index.html"), " y pegá tu Project URL y anon key de Supabase arriba de todo."))));
}

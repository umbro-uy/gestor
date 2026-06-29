/* ===================================================================
   Objetivos — acordeón de objetivos del equipo
   Parte del Gestor del Equipo. Se carga como <script> clásico desde
   index.html; comparte el ámbito global con los demás archivos js/.
   =================================================================== */

/* ── Objetivos (acordeón) ── */
function Objetivos({
  data,
  recargar,
  esAdmin
}) {
  const {
    objetivos,
    tareas
  } = data;
  const [abiertos, setAbiertos] = useState({});
  const toggle = id => setAbiertos(p => ({
    ...p,
    [id]: !p[id]
  }));
  const setProgreso = async (o, v) => {
    await supa.from("objetivos").update({
      progreso: Number(v)
    }).eq("id", o.id);
    recargar();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-5"
  }, /*#__PURE__*/React.createElement(Title, {
    eyebrow: "Plan anual",
    title: "Objetivos 2026"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-xs -mt-3",
    style: {
      color: C.gray
    }
  }, "Tocá cada objetivo para ver sus acciones. El avance lo actualiza la administradora."), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, objetivos.map(o => {
    const vinc = tareas.filter(t => t.objetivo_id === o.id);
    const hechas = vinc.filter(t => t.estado === "hecho");
    const col = o.progreso >= 70 ? C.green : o.progreso >= 30 ? C.amber : C.red;
    const open = !!abiertos[o.id];
    return /*#__PURE__*/React.createElement("div", {
      key: o.id,
      className: "bg-white rounded-2xl border overflow-hidden",
      style: {
        borderColor: C.line
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "w-full flex items-center gap-4 p-4 sm:p-5 text-left",
      onClick: () => toggle(o.id)
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0",
      style: {
        background: C.soft,
        color: C.blue
      }
    }, o.num), /*#__PURE__*/React.createElement("div", {
      className: "flex-1 min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-bold leading-snug"
    }, o.titulo), /*#__PURE__*/React.createElement("span", {
      className: "text-lg font-black tabular-nums shrink-0",
      style: {
        color: col
      }
    }, o.progreso, "%")), /*#__PURE__*/React.createElement("div", {
      className: "mt-2"
    }, /*#__PURE__*/React.createElement(Bar, {
      pct: o.progreso,
      color: col,
      h: 6
    })), vinc.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "text-xs mt-1",
      style: {
        color: C.gray
      }
    }, hechas.length, "/", vinc.length, " tareas completadas")), /*#__PURE__*/React.createElement("span", {
      style: {
        color: C.gray,
        display: "inline-flex",
        transform: open ? "rotate(90deg)" : "none",
        transition: "transform 0.2s"
      }
    }, Ic.chevR)), open && /*#__PURE__*/React.createElement("div", {
      className: "px-4 sm:px-5 pb-5 pt-1 border-t",
      style: {
        borderColor: C.line
      }
    }, esAdmin ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
      className: "text-sm leading-relaxed mb-3",
      style: {
        color: C.gray
      }
    }, o.detalle), /*#__PURE__*/React.createElement("div", {
      style: {
        color: col
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "range",
      min: "0",
      max: "100",
      step: "5",
      value: o.progreso,
      onChange: e => setProgreso(o, e.target.value),
      className: "w-full"
    }), /*#__PURE__*/React.createElement("div", {
      className: "text-xs font-medium mt-1",
      style: {
        color: C.gray
      }
    }, "Mové el deslizador para actualizar el avance"))) : /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 py-1",
      style: {
        color: C.gray
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex"
      }
    }, Ic.lock), /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-semibold"
    }, "El detalle y el avance los gestiona la administradora.")), vinc.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "mt-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-black uppercase tracking-wide mb-2",
      style: {
        color: C.gray
      }
    }, "Tareas vinculadas"), /*#__PURE__*/React.createElement("div", {
      className: "space-y-1.5"
    }, vinc.map(t => /*#__PURE__*/React.createElement("div", {
      key: t.id,
      className: "flex items-center gap-2 rounded-xl px-3 py-2 text-xs",
      style: {
        background: "#F6F7F9"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: t.estado === "hecho" ? C.green : t.estado === "en_curso" ? C.amber : C.gray,
        display: "inline-flex"
      }
    }, t.estado === "hecho" ? Ic.ok : Ic.clock), /*#__PURE__*/React.createElement("span", {
      className: `flex-1 ${t.estado === "hecho" ? "line-through opacity-50" : ""}`
    }, t.titulo), t.tienda && t.tienda !== "General" && /*#__PURE__*/React.createElement(Chip, {
      color: C.blue,
      soft: C.soft,
      sm: true
    }, t.tienda)))))));
  })));
}

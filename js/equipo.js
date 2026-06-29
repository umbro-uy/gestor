/* ===================================================================
   Equipo — gestión de integrantes
   Parte del Gestor del Equipo. Se carga como <script> clásico desde
   index.html; comparte el ámbito global con los demás archivos js/.
   =================================================================== */

/* ── Equipo ── */
function Equipo({
  data,
  recargar,
  esAdmin
}) {
  const {
    profiles,
    tareas,
    kpis
  } = data;
  const [editando, setEditando] = useState(null);
  const [draft, setDraft] = useState({
    nombre: "",
    rol: ""
  });
  const guardar = async m => {
    const nuevoRol = draft.rol.trim();
    await supa.from("profiles").update({
      nombre: draft.nombre.trim() || m.nombre,
      rol: nuevoRol
    }).eq("id", m.id);
    // Si el rol cambió y la persona no tiene KPIs, inicializarlos automáticamente
    const tieneKpis = kpis.some(k => k.miembro_id === m.id);
    if (nuevoRol && !tieneKpis) {
      await supa.rpc("inicializar_kpis_rol", {
        p_miembro_id: m.id,
        p_rol: nuevoRol
      });
    }
    setEditando(null);
    recargar();
  };
  const inicializarKpis = async m => {
    if (!m.rol) {
      alert("Primero asigná un rol a esta integrante.");
      return;
    }
    if (!window.confirm(`Crear KPIs predefinidos para el rol "${m.rol}" de ${m.nombre}?`)) return;
    await supa.rpc("inicializar_kpis_rol", {
      p_miembro_id: m.id,
      p_rol: m.rol
    });
    recargar();
  };
  const toggleLic = async m => {
    await supa.from("profiles").update({
      licencia: !m.licencia
    }).eq("id", m.id);
    recargar();
  };
  const addKpi = async m => {
    const n = window.prompt("Nombre del KPI:");
    if (!n) return;
    await supa.from("kpis").insert({
      miembro_id: m.id,
      nombre: n,
      meta: "-",
      valor: "-"
    });
    recargar();
  };
  const updKpi = async (k, campo, val) => {
    await supa.from("kpis").update({
      [campo]: val
    }).eq("id", k.id);
    recargar();
  };
  const delKpi = async k => {
    await supa.from("kpis").delete().eq("id", k.id);
    recargar();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-5"
  }, /*#__PURE__*/React.createElement(Title, {
    eyebrow: "Personas",
    title: "Equipo"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-xs -mt-3",
    style: {
      color: C.gray
    }
  }, "Los KPIs se asignan automáticamente cuando guardás el rol de cada integrante. Si ya tienen rol pero no KPIs, tocá \"Inicializar KPIs\" en su tarjeta."), profiles.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border p-6 text-sm text-center",
    style: {
      borderColor: C.line,
      color: C.gray
    }
  }, "Todavía no se registró nadie."), /*#__PURE__*/React.createElement("div", {
    className: "grid lg:grid-cols-2 gap-4"
  }, profiles.map(m => {
    const asig = tareas.filter(t => t.miembro_id === m.id);
    const hechas = asig.filter(t => t.estado === "hecho");
    const pct = asig.length ? Math.round(hechas.length / asig.length * 100) : 0;
    const mkpis = kpis.filter(k => k.miembro_id === m.id);
    const ed = editando === m.id;
    return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      className: "bg-white rounded-2xl border p-4",
      style: {
        borderColor: C.line
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0",
      style: {
        background: C.ink,
        color: "#fff"
      }
    }, (m.nombre || "?").slice(0, 2).toUpperCase()), /*#__PURE__*/React.createElement("div", {
      className: "flex-1 min-w-0"
    }, ed ? /*#__PURE__*/React.createElement("div", {
      className: "space-y-1.5"
    }, /*#__PURE__*/React.createElement(Inp, {
      value: draft.nombre,
      onChange: e => setDraft({
        ...draft,
        nombre: e.target.value
      }),
      placeholder: "Nombre"
    }), /*#__PURE__*/React.createElement(Inp, {
      value: draft.rol,
      onChange: e => setDraft({
        ...draft,
        rol: e.target.value
      }),
      placeholder: "Rol"
    })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 flex-wrap"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-bold"
    }, m.nombre || "Sin nombre"), m.licencia && /*#__PURE__*/React.createElement(Chip, {
      color: C.amber,
      soft: C.amberS
    }, "De licencia")), /*#__PURE__*/React.createElement("div", {
      className: "text-xs",
      style: {
        color: C.gray
      }
    }, m.rol || "Sin rol"))), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-1 shrink-0"
    }, ed ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      onClick: () => guardar(m),
      className: "p-1.5 rounded-lg",
      style: {
        background: C.greenS,
        color: C.green
      }
    }, Ic.check), /*#__PURE__*/React.createElement("button", {
      onClick: () => setEditando(null),
      className: "p-1.5 rounded-lg",
      style: {
        background: "#EEF1F5",
        color: C.gray
      }
    }, Ic.x)) : /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setEditando(m.id);
        setDraft({
          nombre: m.nombre || "",
          rol: m.rol || ""
        });
      },
      className: "p-1.5 rounded-lg hover:bg-slate-100",
      style: {
        color: C.gray
      }
    }, Ic.edit))), /*#__PURE__*/React.createElement("div", {
      className: "mt-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex justify-between text-xs font-medium mb-1",
      style: {
        color: C.gray
      }
    }, /*#__PURE__*/React.createElement("span", null, "Tareas completadas"), /*#__PURE__*/React.createElement("span", null, hechas.length, "/", asig.length, " (", pct, "%)")), /*#__PURE__*/React.createElement(Bar, {
      pct: pct,
      h: 6
    })), /*#__PURE__*/React.createElement("div", {
      className: "mt-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] font-black uppercase tracking-wide",
      style: {
        color: C.gray
      }
    }, "KPIs del mes"), esAdmin && /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2"
    }, mkpis.length === 0 && m.rol && /*#__PURE__*/React.createElement("button", {
      onClick: () => inicializarKpis(m),
      className: "text-xs font-bold px-2 py-0.5 rounded-lg",
      style: {
        background: C.soft,
        color: C.blue
      }
    }, "Inicializar según rol"), /*#__PURE__*/React.createElement("button", {
      onClick: () => addKpi(m),
      className: "text-xs font-bold flex items-center gap-0.5",
      style: {
        color: C.blue
      }
    }, Ic.plus, " Agregar"))), /*#__PURE__*/React.createElement("div", {
      className: "space-y-1.5"
    }, mkpis.map(k => /*#__PURE__*/React.createElement("div", {
      key: k.id,
      className: "flex items-center gap-2 rounded-xl px-2 py-2",
      style: {
        background: "#F6F7F9"
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-medium flex-1 min-w-0"
    }, k.nombre), esAdmin ? /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1 shrink-0"
    }, /*#__PURE__*/React.createElement("input", {
      defaultValue: k.valor,
      onBlur: e => updKpi(k, "valor", e.target.value),
      className: "w-16 text-xs font-bold text-center rounded-lg border px-1 py-1",
      style: {
        borderColor: C.line
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-xs",
      style: {
        color: C.gray
      }
    }, "/"), /*#__PURE__*/React.createElement("input", {
      defaultValue: k.meta,
      onBlur: e => updKpi(k, "meta", e.target.value),
      className: "w-14 text-xs text-center rounded-lg border px-1 py-1",
      style: {
        borderColor: C.line,
        color: C.gray
      }
    }), /*#__PURE__*/React.createElement("button", {
      onClick: () => delKpi(k),
      className: "p-0.5",
      style: {
        color: "#ddd"
      }
    }, Ic.x)) : /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-bold tabular-nums shrink-0"
    }, k.valor, /*#__PURE__*/React.createElement("span", {
      style: {
        color: C.gray,
        fontWeight: 400
      }
    }, " / ", k.meta)))), mkpis.length === 0 && /*#__PURE__*/React.createElement("div", {
      className: "text-xs py-2 text-center rounded-lg",
      style: {
        color: "#9AA5B5",
        background: "#F9FAFB"
      }
    }, m.rol ? "Sin KPIs — tocá 'Inicializar según rol' para cargarlos automáticamente." : "Sin KPIs. Asigná un rol primero."))), esAdmin && /*#__PURE__*/React.createElement("button", {
      onClick: () => toggleLic(m),
      className: "mt-3 text-xs font-semibold",
      style: {
        color: C.gray
      }
    }, m.licencia ? "Marcar como activa" : "Marcar de licencia"));
  })));
}

/* ===================================================================
   Tareas — tablero Kanban + formulario de tarea
   Parte del Gestor del Equipo. Se carga como <script> clásico desde
   index.html; comparte el ámbito global con los demás archivos js/.
   =================================================================== */

/* ── Tareas (Kanban drag & drop) ── */
function Tareas({
  data,
  recargar,
  esAdmin,
  yo
}) {
  const {
    tareas,
    profiles,
    objetivos
  } = data;
  const [filtro, setFiltro] = useState("todos");
  const [filtroTienda, setFiltroTienda] = useState("todas");
  const [form, setForm] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [comentAbierto, setComentAbierto] = useState(null); // id de la tarea con los comentarios abiertos
  // Agrega un comentario (bitácora con fecha y autor) a una tarea, sin pisar los anteriores.
  const agregarComentarioTarea = async (t, texto) => {
    const txt = String(texto || "").trim();
    if (!txt) return;
    const entry = { t: txt, f: new Date().toISOString(), a: (yo && yo.nombre) || "" };
    const nuevo = [...(Array.isArray(t.comentarios) ? t.comentarios : []), entry];
    await supa.from("tareas").update({ comentarios: nuevo }).eq("id", t.id);
    recargar();
  };
  let visibles = tareas.filter(t => filtro === "todos" || t.miembro_id === filtro || filtro === "sin" && !t.miembro_id);
  if (filtroTienda !== "todas") visibles = visibles.filter(t => t.tienda === filtroTienda);
  const mover = async (t, dir) => {
    const ni = ESTADOS.indexOf(t.estado) + dir;
    if (ni < 0 || ni >= ESTADOS.length) return;
    await supa.from("tareas").update({
      estado: ESTADOS[ni]
    }).eq("id", t.id);
    recargar();
  };
  const asignar = async (t, mid) => {
    await supa.from("tareas").update({
      miembro_id: mid || null
    }).eq("id", t.id);
    recargar();
  };
  const borrar = async t => {
    if (!window.confirm(`¿Eliminar "${t.titulo}"?`)) return;
    await supa.from("tareas").delete().eq("id", t.id);
    recargar();
  };
  const crear = async f => {
    await supa.from("tareas").insert({
      titulo: f.titulo.trim(),
      descripcion: (f.descripcion || "").trim() || null,
      miembro_id: esAdmin ? f.miembro || null : null,
      objetivo_id: f.objetivo || null,
      prioridad: f.prioridad,
      estado: "pendiente",
      fecha_limite: f.fecha || null,
      tienda: f.tienda || "General"
    });
    setForm(null);
    recargar();
  };
  const onDragStart = t => {
    setDragging(t);
  };
  const onDragOverCol = (e, est) => {
    e.preventDefault();
    setDragOver(est);
  };
  const onDropCol = async est => {
    if (!dragging || dragging.estado === est) return;
    await supa.from("tareas").update({
      estado: est
    }).eq("id", dragging.id);
    setDragging(null);
    setDragOver(null);
    recargar();
  };
  const coloresEstado = {
    pendiente: C.line,
    en_curso: C.amberS,
    hecho: C.greenS
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-5"
  }, /*#__PURE__*/React.createElement(Title, {
    eyebrow: "Tablero",
    title: "Tareas del equipo",
    right: /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 flex-wrap"
    }, /*#__PURE__*/React.createElement("select", {
      value: filtroTienda,
      onChange: e => setFiltroTienda(e.target.value),
      className: "text-xs font-semibold rounded-xl border px-2 py-1.5 bg-white",
      style: {
        borderColor: C.line
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: "todas"
    }, "Todas las tiendas"), TIENDAS.map(t => /*#__PURE__*/React.createElement("option", {
      key: t,
      value: t
    }, t))), /*#__PURE__*/React.createElement("select", {
      value: filtro,
      onChange: e => setFiltro(e.target.value),
      className: "text-xs font-semibold rounded-xl border px-2 py-1.5 bg-white",
      style: {
        borderColor: C.line
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: "todos"
    }, "Todo el equipo"), /*#__PURE__*/React.createElement("option", {
      value: "sin"
    }, "Sin asignar"), profiles.map(m => /*#__PURE__*/React.createElement("option", {
      key: m.id,
      value: m.id
    }, m.nombre))), /*#__PURE__*/React.createElement("button", {
      onClick: () => setForm({
        titulo: "",
        descripcion: "",
        miembro: "",
        objetivo: "",
        prioridad: "media",
        fecha: "",
        tienda: "General"
      }),
      className: "flex items-center gap-1 text-xs font-bold text-white px-3 py-2 rounded-xl",
      style: {
        background: C.blue
      }
    }, Ic.plus, " Nueva tarea"))
  }), form && /*#__PURE__*/React.createElement(FormTarea, {
    form: form,
    setForm: setForm,
    crear: crear,
    profiles: profiles,
    objetivos: objetivos,
    esAdmin: esAdmin
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-3 gap-3 items-start"
  }, ESTADOS.map(est => {
    const col = visibles.filter(t => t.estado === est);
    const isDragOver = dragOver === est;
    return /*#__PURE__*/React.createElement("div", {
      key: est,
      className: `rounded-2xl p-3 transition-all ${isDragOver ? "drag-over" : ""}`,
      style: {
        background: isDragOver ? C.soft : "#EEF1F5"
      },
      onDragOver: e => onDragOverCol(e, est),
      onDragLeave: () => setDragOver(null),
      onDrop: () => onDropCol(est)
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between px-1 mb-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-black uppercase tracking-wide",
      style: {
        color: C.gray
      }
    }, E_LABEL[est]), /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-black tabular-nums px-2 py-0.5 rounded-full bg-white"
    }, col.length)), /*#__PURE__*/React.createElement("div", {
      className: "space-y-2"
    }, col.length === 0 && /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-center py-6",
      style: {
        color: "#9AA5B5"
      }
    }, "Sin tareas"), col.map(t => {
      const o = objetivos.find(x => x.id === t.objetivo_id);
      const p = PRI[t.prioridad] || PRI.media;
      const venc = vencida(t);
      const m = profiles.find(x => x.id === t.miembro_id);
      return /*#__PURE__*/React.createElement("div", {
        key: t.id,
        className: "bg-white rounded-xl p-3 border cursor-grab active:cursor-grabbing select-none",
        style: {
          borderColor: venc ? "#F3C2CA" : C.line
        },
        draggable: true,
        onDragStart: () => onDragStart(t),
        onDragEnd: () => {
          setDragging(null);
          setDragOver(null);
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-start justify-between gap-1"
      }, /*#__PURE__*/React.createElement("div", {
        className: `text-sm font-semibold leading-snug ${t.estado === "hecho" ? "line-through opacity-50" : ""}`
      }, t.titulo)), t.descripcion && /*#__PURE__*/React.createElement("div", {
        className: "text-xs mt-1 leading-snug",
        style: { color: C.gray, whiteSpace: "pre-wrap" }
      }, t.descripcion), /*#__PURE__*/React.createElement("div", {
        className: "flex flex-wrap items-center gap-1 mt-2"
      }, /*#__PURE__*/React.createElement(Chip, {
        color: p.c,
        soft: p.s,
        sm: true
      }, p.l), t.tienda && t.tienda !== "General" && /*#__PURE__*/React.createElement(Chip, {
        color: C.blue,
        soft: C.soft,
        sm: true
      }, Ic.store, " ", t.tienda), o && /*#__PURE__*/React.createElement(Chip, {
        color: C.gray,
        soft: "#EEF1F5",
        sm: true
      }, "Obj. ", o.num), t.fecha_limite && /*#__PURE__*/React.createElement(Chip, {
        color: venc ? C.red : C.gray,
        soft: venc ? C.redS : "#EEF1F5",
        sm: true
      }, fmtF(t.fecha_limite))), esAdmin ? /*#__PURE__*/React.createElement("select", {
        value: t.miembro_id || "",
        onChange: e => asignar(t, e.target.value),
        className: "w-full mt-2 text-xs font-semibold rounded-lg border px-2 py-1 bg-white",
        style: {
          borderColor: C.line,
          color: t.miembro_id ? C.ink : C.gray
        }
      }, /*#__PURE__*/React.createElement("option", {
        value: ""
      }, "Sin asignar"), profiles.map(x => /*#__PURE__*/React.createElement("option", {
        key: x.id,
        value: x.id
      }, x.nombre))) : /*#__PURE__*/React.createElement("div", {
        className: "mt-2"
      }, /*#__PURE__*/React.createElement(Chip, {
        color: m ? C.blue : C.gray,
        soft: m ? C.soft : "#EEF1F5"
      }, m ? m.nombre : "Sin asignar")), /*#__PURE__*/React.createElement("div", {
        className: "flex items-center justify-between mt-2 pt-2",
        style: {
          borderTop: `1px solid ${C.line}`
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex gap-1"
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => mover(t, -1),
        disabled: t.estado === "pendiente",
        className: "p-1 rounded disabled:opacity-20 hover:bg-slate-100",
        style: {
          color: C.gray
        }
      }, Ic.left), /*#__PURE__*/React.createElement("button", {
        onClick: () => mover(t, 1),
        disabled: t.estado === "hecho",
        className: "p-1 rounded disabled:opacity-20 hover:bg-slate-100",
        style: {
          color: C.gray
        }
      }, Ic.right), /*#__PURE__*/React.createElement("button", {
        onClick: () => setComentAbierto(comentAbierto === t.id ? null : t.id),
        className: "p-1 rounded hover:bg-slate-100 flex items-center gap-0.5 text-[10px] font-bold",
        style: { color: (t.comentarios && t.comentarios.length) ? C.blue : C.gray }
      }, "💬", (t.comentarios && t.comentarios.length) ? /*#__PURE__*/React.createElement("span", null, t.comentarios.length) : null)), esAdmin && /*#__PURE__*/React.createElement("button", {
        onClick: () => borrar(t),
        className: "p-1 rounded hover:bg-red-50",
        style: {
          color: "#ddd"
        }
      }, Ic.trash)), comentAbierto === t.id && /*#__PURE__*/React.createElement("div", {
        className: "mt-2 pt-2 space-y-1.5",
        style: { borderTop: "1px solid " + C.line }
      }, (t.comentarios || []).map((c, i) => /*#__PURE__*/React.createElement("div", { key: i, className: "text-[11px] leading-snug" },
        /*#__PURE__*/React.createElement("span", { style: { color: C.gray } }, (c.a ? c.a + " · " : "") + (c.f ? new Date(c.f).toLocaleDateString("es-UY") : "") + (c.a || c.f ? ": " : "")),
        c.t)),
        /*#__PURE__*/React.createElement("input", { type: "text", placeholder: "Agregar comentario…", onKeyDown: e => { if (e.key === "Enter") { agregarComentarioTarea(t, e.target.value); e.target.value = ""; } }, className: "w-full text-xs rounded-lg border px-2 py-1 outline-none", style: { borderColor: C.line } })));
    })));
  })));
}
function FormTarea({
  form,
  setForm,
  crear,
  profiles,
  objetivos,
  esAdmin
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 border space-y-3",
    style: {
      borderColor: C.line
    }
  }, /*#__PURE__*/React.createElement(Inp, {
    autoFocus: true,
    placeholder: "¿Qué hay que hacer?",
    value: form.titulo,
    onChange: e => setForm({
      ...form,
      titulo: e.target.value
    }),
    onKeyDown: e => e.key === "Enter" && form.titulo.trim() && crear(form)
  }), /*#__PURE__*/React.createElement("textarea", {
    placeholder: "Descripción (opcional)…",
    value: form.descripcion || "",
    onChange: e => setForm({ ...form, descripcion: e.target.value }),
    rows: 2,
    className: "w-full text-sm rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200",
    style: { borderColor: C.line, resize: "vertical" }
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-3 gap-2"
  }, esAdmin && /*#__PURE__*/React.createElement(Sel, {
    value: form.miembro,
    onChange: e => setForm({
      ...form,
      miembro: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Sin asignar"), profiles.map(m => /*#__PURE__*/React.createElement("option", {
    key: m.id,
    value: m.id
  }, m.nombre))), /*#__PURE__*/React.createElement(Sel, {
    value: form.objetivo,
    onChange: e => setForm({
      ...form,
      objetivo: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Sin objetivo"), objetivos.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.id,
    value: o.id
  }, o.titulo))), /*#__PURE__*/React.createElement(Sel, {
    value: form.tienda,
    onChange: e => setForm({
      ...form,
      tienda: e.target.value
    })
  }, TIENDAS.map(t => /*#__PURE__*/React.createElement("option", {
    key: t,
    value: t
  }, t))), /*#__PURE__*/React.createElement(Sel, {
    value: form.prioridad,
    onChange: e => setForm({
      ...form,
      prioridad: e.target.value
    })
  }, Object.entries(PRI).map(([k, v]) => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, v.l))), /*#__PURE__*/React.createElement("div", {
    className: "col-span-2 sm:col-span-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] font-bold uppercase tracking-wide mb-1",
    style: {
      color: C.gray
    }
  }, "Fecha límite"), /*#__PURE__*/React.createElement(Inp, {
    type: "date",
    value: form.fecha,
    onChange: e => setForm({
      ...form,
      fecha: e.target.value
    })
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 justify-end"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setForm(null),
    className: "text-xs font-bold px-3 py-2 rounded-xl",
    style: {
      color: C.gray
    }
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => form.titulo.trim() && crear(form),
    className: "text-xs font-bold text-white px-4 py-2 rounded-xl",
    style: {
      background: C.green
    }
  }, "Crear tarea")));
}

/* ===================================================================
   Resumen — KPIs generales de Operativa y Análisis
   Parte del Gestor del Equipo. Se carga como <script> clásico desde
   index.html; comparte el ámbito global con los demás archivos js/.
   =================================================================== */

/* ── Resumen ── */
function Resumen({
  data,
  setTab,
  esAdmin,
  recargar
}) {
  const {
    tareas,
    objetivos,
    profiles,
    kpis_g
  } = data;
  const abiertas = tareas.filter(t => t.estado !== "hecho").length;
  const vencidas = tareas.filter(vencida).length;
  const hechas = tareas.filter(t => t.estado === "hecho").length;
  const prog = objetivos.length ? Math.round(objetivos.reduce((a, o) => a + o.progreso, 0) / objetivos.length) : 0;
  // ── Datos transversales para el resumen: facturación (metas_mensuales) y operativa (seguimiento) ──
  const fmtUSD = n => "$" + Math.round(n || 0).toLocaleString("es-UY");
  const MESNOM = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const fmtMesCorto = m => MESNOM[(+String(m).split("-")[1]) - 1] || "";
  const [metasM, setMetasM] = useState([]);
  const [seguiR, setSeguiR] = useState([]);
  useEffect(() => {
    let vivo = true;
    (async () => {
      try { const { data: mm } = await supa.from("metas_mensuales").select("*"); if (vivo && mm) setMetasM(mm); } catch (_) {}
      try {
        let all = [], desde = 0;
        for (;;) { const { data: pg, error } = await supa.from("operativa_seguimiento").select("pedido,dias,estado_fen,estado_wms,deposito").range(desde, desde + 999); if (error || !pg || !pg.length) break; all = all.concat(pg); if (pg.length < 1000) break; desde += 1000; }
        if (vivo) setSeguiR(all);
      } catch (_) {}
    })();
    return () => { vivo = false; };
  }, []);
  const mesActual = new Date().toISOString().slice(0, 7);
  const anioActual = String(new Date().getFullYear());
  const sumReal = arr => arr.reduce((a, m) => a + Number(m.real || 0), 0);
  const sumMeta = arr => arr.reduce((a, m) => a + Number(m.meta || 0), 0);
  const realMes = sumReal(metasM.filter(m => m.mes === mesActual));
  const metaMes = sumMeta(metasM.filter(m => m.mes === mesActual));
  const pctMes = metaMes > 0 ? Math.round(realMes / metaMes * 100) : null;
  const colMes = pctMes == null ? C.gray : pctMes >= 100 ? C.green : pctMes >= 70 ? C.amber : C.red;
  const OBJ_ANUAL = 100000000;
  const realAnio = sumReal(metasM.filter(m => String(m.mes || "").startsWith(anioActual)));
  const pctAnio = Math.round(realAnio / OBJ_ANUAL * 100);
  const chartData = Array.from({ length: 12 }, (_, i) => { const m = anioActual + "-" + String(i + 1).padStart(2, "0"); return { m, real: sumReal(metasM.filter(x => x.mes === m)), meta: sumMeta(metasM.filter(x => x.mes === m)) }; });
  const maxChart = Math.max(1, ...chartData.map(c => Math.max(c.real, c.meta)));
  const esEnt = r => /entregad/i.test(String(r.estado_fen || "") + " " + String(r.estado_wms || ""));
  const esCanc = r => /cancel/i.test(String(r.estado_fen || "") + " " + String(r.estado_wms || ""));
  const activosOp = seguiR.filter(r => !esEnt(r) && !esCanc(r));
  const atrasadosN = activosOp.filter(r => Number(r.dias) > 3).length;
  const depo0N = activosOp.filter(r => String(r.deposito || "").replace(/\.0+$/, "").trim() === "0").length;
  const [editKpi, setEditKpi] = useState(null);
  const [draftKpi, setDraftKpi] = useState("");
  const updKpiG = async (k, val) => {
    await supa.from("kpis_globales").update({
      valor: val
    }).eq("id", k.id);
    recargar();
  };
  const addKpiG = async () => {
    const n = window.prompt("Nombre del indicador (ej: Artículos en depo 0):");
    if (!n) return;
    const u = window.prompt("Unidad (ej: unidades, %, días):");
    await supa.from("kpis_globales").insert({
      nombre: n,
      unidad: u || "",
      valor: "—",
      meta: "—",
      orden: (kpis_g.length + 1) * 10
    });
    recargar();
  };
  const delKpiG = async k => {
    if (!window.confirm(`¿Eliminar "${k.nombre}"?`)) return;
    await supa.from("kpis_globales").delete().eq("id", k.id);
    recargar();
  };
  const iconKpi = k => {
    const n = (k.nombre || "").toLowerCase();
    if (n.includes("depo") || n.includes("stock")) return {
      ic: Ic.alert,
      c: C.red,
      s: C.redS
    };
    if (n.includes("entrega") || n.includes("atraso") || n.includes("lead")) return {
      ic: Ic.clock,
      c: C.amber,
      s: C.amberS
    };
    if (n.includes("factura")) return {
      ic: Ic.ops,
      c: C.green,
      s: C.greenS
    };
    if (n.includes("tarea") || n.includes("hecha") || n.includes("cumpl")) return {
      ic: Ic.ok,
      c: C.blue,
      s: C.soft
    };
    return {
      ic: Ic.trend,
      c: C.blue,
      s: C.soft
    };
  };
  const statsBase = [{
    l: "Facturación del mes",
    v: fmtUSD(realMes),
    sub: pctMes != null ? pctMes + "% de " + fmtUSD(metaMes) : "Meta sin definir",
    ic: Ic.ops,
    c: colMes,
    s: C.greenS
  }, {
    l: "Acumulado " + anioActual,
    v: fmtUSD(realAnio),
    sub: pctAnio + "% del objetivo anual",
    ic: Ic.trend,
    c: C.blue,
    s: C.soft
  }, {
    l: "Pedidos atrasados",
    v: seguiR.length ? String(atrasadosN) : "—",
    sub: "Operativa · +3 días háb.",
    ic: Ic.alert,
    c: atrasadosN > 0 ? C.red : C.green,
    s: C.redS
  }, {
    l: "Depo 0 (sin stock)",
    v: seguiR.length ? String(depo0N) : "—",
    sub: "Sin entregar · acción manual",
    ic: Ic.alert,
    c: depo0N > 0 ? "#7C3AED" : C.green,
    s: "#EDE9FE"
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 lg:grid-cols-4 gap-3"
  }, statsBase.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.l,
    className: "bg-white rounded-2xl p-4 border",
    style: {
      borderColor: C.line
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "p-1.5 rounded-lg",
    style: {
      background: s.s,
      color: s.c
    }
  }, s.ic), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold uppercase tracking-wide",
    style: {
      color: C.gray
    }
  }, s.l)), /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-black tabular-nums fraunces",
    style: {
      color: s.c
    }
  }, s.v), s.sub && /*#__PURE__*/React.createElement("div", { className: "text-[11px] mt-1.5 font-medium", style: { color: C.gray } }, s.sub)))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(Title, {
    eyebrow: "Análisis", title: "Facturación mensual " + anioActual
  }), /*#__PURE__*/React.createElement("div", { className: "bg-white rounded-2xl border p-4", style: { borderColor: C.line } }, /*#__PURE__*/React.createElement("div", { className: "flex items-end gap-1.5", style: { height: 170 } }, chartData.map(c => {
    const hPct = Math.round(c.real / maxChart * 100);
    const metaPct = c.meta > 0 ? Math.round(Math.min(c.meta, maxChart) / maxChart * 100) : 0;
    const esActual = c.m === mesActual;
    return /*#__PURE__*/React.createElement("div", { key: c.m, className: "flex-1 flex flex-col items-center justify-end h-full", title: fmtMesCorto(c.m) + ": " + fmtUSD(c.real) + (c.meta > 0 ? " · meta " + fmtUSD(c.meta) : "") }, /*#__PURE__*/React.createElement("div", { className: "w-full relative flex items-end justify-center", style: { flex: 1, minHeight: 0 } }, c.meta > 0 && /*#__PURE__*/React.createElement("div", { style: { position: "absolute", left: 2, right: 2, bottom: metaPct + "%", borderTop: "2px dashed " + C.gray, opacity: 0.45 } }), /*#__PURE__*/React.createElement("div", { className: "rounded-t-md", style: { width: "72%", height: hPct + "%", minHeight: c.real > 0 ? 3 : 0, background: esActual ? C.blue : C.soft, border: esActual ? "none" : "1px solid " + C.line } })), /*#__PURE__*/React.createElement("div", { className: "text-[10px] mt-1 shrink-0", style: { color: esActual ? C.blue : C.gray, fontWeight: esActual ? 700 : 400 } }, fmtMesCorto(c.m)));
  })), /*#__PURE__*/React.createElement("div", { className: "text-[10px] mt-3", style: { color: C.gray } }, "Barras = facturación neta real · línea punteada = meta del mes"))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(Title, {
    eyebrow: "Indicadores clave",
    title: "Estado operativo",
    right: esAdmin && /*#__PURE__*/React.createElement("button", {
      onClick: addKpiG,
      className: "flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl text-white",
      style: {
        background: C.blue
      }
    }, Ic.plus, " KPI")
  }), kpis_g.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border p-5 text-sm text-center",
    style: {
      borderColor: C.line,
      color: C.gray
    }
  }, esAdmin ? "Todavía no hay indicadores. Agregá el primero con el botón." : "Sin indicadores cargados todavía."), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-3"
  }, kpis_g.map(k => {
    const {
      ic,
      c,
      s
    } = iconKpi(k);
    const editando = editKpi === k.id;
    return /*#__PURE__*/React.createElement("div", {
      key: k.id,
      className: "bg-white rounded-2xl p-4 border",
      style: {
        borderColor: C.line
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start justify-between gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "p-1.5 rounded-lg shrink-0",
      style: {
        background: s,
        color: c
      }
    }, ic), /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-semibold leading-tight",
      style: {
        color: C.gray
      }
    }, k.nombre, k.unidad ? ` (${k.unidad})` : "")), esAdmin && /*#__PURE__*/React.createElement("div", {
      className: "flex gap-1 shrink-0"
    }, editando ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        updKpiG(k, draftKpi);
        setEditKpi(null);
      },
      className: "p-1 rounded",
      style: {
        color: C.green
      }
    }, Ic.check), /*#__PURE__*/React.createElement("button", {
      onClick: () => setEditKpi(null),
      className: "p-1 rounded",
      style: {
        color: C.gray
      }
    }, Ic.x)) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setEditKpi(k.id);
        setDraftKpi(k.valor);
      },
      className: "p-1 rounded hover:bg-slate-100",
      style: {
        color: C.gray
      }
    }, Ic.edit), /*#__PURE__*/React.createElement("button", {
      onClick: () => delKpiG(k),
      className: "p-1 rounded hover:bg-red-50",
      style: {
        color: "#ddd"
      }
    }, Ic.trash)))), editando ? /*#__PURE__*/React.createElement("input", {
      autoFocus: true,
      value: draftKpi,
      onChange: e => setDraftKpi(e.target.value),
      onKeyDown: e => {
        if (e.key === "Enter") {
          updKpiG(k, draftKpi);
          setEditKpi(null);
        }
      },
      className: "mt-3 w-full text-2xl font-black border-b-2 outline-none bg-transparent tabular-nums",
      style: {
        color: c,
        borderColor: c
      }
    }) : /*#__PURE__*/React.createElement("div", {
      className: "mt-3 flex items-baseline gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-3xl font-black tabular-nums",
      style: {
        color: c
      }
    }, k.valor), k.meta && k.meta !== "—" && /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-semibold",
      style: {
        color: C.gray
      }
    }, "/ meta: ", k.meta)));
  }))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(Title, {
    eyebrow: "Plan anual",
    title: "Objetivos 2026",
    right: /*#__PURE__*/React.createElement("button", {
      onClick: () => setTab("objetivos"),
      className: "text-xs font-bold",
      style: {
        color: C.blue
      }
    }, "Ver detalle →")
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 gap-3"
  }, objetivos.map(o => {
    const col = o.progreso >= 70 ? C.green : o.progreso >= 30 ? C.amber : C.red;
    return /*#__PURE__*/React.createElement("div", {
      key: o.id,
      className: "bg-white rounded-2xl p-4 border",
      style: {
        borderColor: C.line
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-sm font-semibold pr-2"
    }, o.num, ". ", o.titulo), /*#__PURE__*/React.createElement("span", {
      className: "text-sm font-black tabular-nums",
      style: {
        color: col
      }
    }, o.progreso, "%")), /*#__PURE__*/React.createElement(Bar, {
      pct: o.progreso,
      color: col
    }));
  }))), esAdmin && /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(Title, {
    eyebrow: "Equipo",
    title: "Rendimiento por integrante",
    right: /*#__PURE__*/React.createElement("button", {
      onClick: () => setTab("equipo"),
      className: "text-xs font-bold",
      style: {
        color: C.blue
      }
    }, "Ver equipo →")
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border overflow-hidden",
    style: {
      borderColor: C.line
    }
  }, profiles.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-sm py-8 text-center",
    style: {
      color: C.gray
    }
  }, "Nadie se registró todavía."), [...profiles].map((m, i) => {
    const asig = tareas.filter(t => t.miembro_id === m.id);
    const comp = asig.filter(t => t.estado === "hecho");
    const venc = asig.filter(vencida);
    const pct = asig.length ? Math.round(comp.length / asig.length * 100) : 0;
    return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      className: "flex items-center gap-3 px-4 py-3",
      style: {
        borderTop: i ? `1px solid ${C.line}` : "none"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0",
      style: {
        background: C.soft,
        color: C.blue
      }
    }, (m.nombre || "?").slice(0, 2).toUpperCase()), /*#__PURE__*/React.createElement("div", {
      className: "flex-1 min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 flex-wrap"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-sm font-semibold truncate"
    }, m.nombre || "Sin nombre"), m.licencia && /*#__PURE__*/React.createElement(Chip, {
      color: C.amber,
      soft: C.amberS
    }, "Licencia"), venc.length > 0 && /*#__PURE__*/React.createElement(Chip, {
      color: C.red,
      soft: C.redS
    }, venc.length, " venc.")), /*#__PURE__*/React.createElement("div", {
      className: "text-xs",
      style: {
        color: C.gray
      }
    }, m.rol || "Sin rol")), /*#__PURE__*/React.createElement("div", {
      className: "w-36 shrink-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex justify-between text-xs font-medium mb-1",
      style: {
        color: C.gray
      }
    }, /*#__PURE__*/React.createElement("span", null, comp.length, "/", asig.length), /*#__PURE__*/React.createElement("span", null, pct, "%")), /*#__PURE__*/React.createElement(Bar, {
      pct: pct,
      h: 6
    })));
  }))));
}

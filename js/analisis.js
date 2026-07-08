/* ===================================================================
   Análisis — cruce BAS/Fenicio/WMS, facturación y metas mensuales
   Parte del Gestor del Equipo. Se carga como <script> clásico desde
   index.html; comparte el ámbito global con los demás archivos js/.
   =================================================================== */


/* ── ResultadoCruce (componente separado para evitar hooks en IIFE) ── */
function ResultadoCruce({
  pendientes
}) {
  if (!pendientes) return null;
  const {
    grupos,
    factDuplicadas,
    pedDuplicados,
    porTienda,
    tieneCuponInfo
  } = pendientes;
  const sumImporte = arr => arr.reduce((a, r) => a + (r.importe || 0), 0);
  const exportarXLSX = (rows, nombre) => {
    if (!rows || !rows.length) {
      alert("No hay datos para exportar.");
      return;
    }
    try {
      const limpias = rows.map(r => {
        const o = {};
        Object.entries(r).forEach(([k, v]) => {
          if (typeof v !== "object" && typeof v !== "function") o[k] = v;
        });
        return o;
      });
      const ws = XLSX.utils.json_to_sheet(limpias);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Datos");
      XLSX.writeFile(wb, `${nombre}.xlsx`);
    } catch (e) {
      alert("Error al exportar: " + e.message);
    }
  };
  const fmtI = n => "$" + Math.round(n || 0).toLocaleString("es-UY");
  const TABS = [{
    id: "revisar",
    l: "⚠ Revisar",
    c: C.red,
    s: C.redS,
    arr: grupos.revisar
  }, {
    id: "facturaDup",
    l: "Facturas duplicadas",
    c: "#7C3AED",
    s: "#F3F0FF",
    arr: factDuplicadas || []
  }, {
    id: "pcnManual",
    l: "PCN (manual)",
    c: "#B45309",
    s: "#FEF3C7",
    arr: grupos.pcnManual || []
  }, {
    id: "pendienteOK",
    l: "Pendiente OK",
    c: C.blue,
    s: C.soft,
    arr: grupos.pendienteOK
  }, {
    id: "facturado",
    l: "Facturado",
    c: C.green,
    s: C.greenS,
    arr: grupos.facturado
  }, {
    id: "canceladoCupon",
    l: "Cancelado c/cupón (manual)",
    c: "#C2410C",
    s: "#FFEDD5",
    arr: grupos.canceladoCupon || []
  }, {
    id: "canceladoFactura",
    l: "Cancelado c/factura",
    c: "#BE123C",
    s: "#FFE4E6",
    arr: grupos.canceladoConFactura || []
  }, {
    id: "cancelado",
    l: "Cancelados",
    c: C.gray,
    s: "#EEF1F5",
    arr: grupos.cancelado
  }];
  const pcnArr = grupos.pcnManual || [];
  const [tabAct, setTabAct] = useState(grupos.revisar.length > 0 ? "revisar" : (grupos.canceladoConFactura || []).length > 0 ? "canceladoFactura" : (grupos.canceladoCupon || []).length > 0 ? "canceladoCupon" : (factDuplicadas || []).length > 0 ? "facturaDup" : pcnArr.length > 0 ? "pcnManual" : "facturado");
  const tabActual = TABS.find(t => t.id === tabAct) || TABS[0];
  const POR_PAGINA = 25;
  const [pagina, setPagina] = useState(0);
  // Filtro por tienda: se activa al clickear una fila de "Vendido vs. facturado por tienda".
  const [filtroTienda, setFiltroTienda] = useState(null);
  const irTab = id => { setTabAct(id); setPagina(0); };
  const filtrarTienda = t => { setFiltroTienda(f => f === t ? null : t); setTabAct("revisar"); setPagina(0); };
  // La lista mostrada y los conteos de las solapas respetan el filtro de tienda.
  const arrDe = t => filtroTienda ? t.arr.filter(r => (r.tienda || "—") === filtroTienda) : t.arr;
  const arr = filtroTienda ? tabActual.arr.filter(r => (r.tienda || "—") === filtroTienda) : tabActual.arr;
  const totalPags = Math.max(1, Math.ceil(arr.length / POR_PAGINA));
  const pagActual = Math.min(pagina, totalPags - 1);
  const filasPagina = arr.slice(pagActual * POR_PAGINA, pagActual * POR_PAGINA + POR_PAGINA);
  const sinFacturaTotal = grupos.revisar.length + grupos.pendienteOK.length + pcnArr.length;
  const sinFacturaUrgente = grupos.revisar.length;
  const sinFacturaMonto = sumImporte(grupos.revisar) + sumImporte(grupos.pendienteOK) + sumImporte(pcnArr);
  const fmtSigno = n => (n < 0 ? "−" : "") + "$" + Math.abs(Math.round(n || 0)).toLocaleString("es-UY");
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, (porTienda && porTienda.some(t => t.vendido > 0 || t.facturadoConIVA > 0)) && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border overflow-hidden",
    style: { borderColor: C.line }
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b",
    style: { borderColor: C.line }
  }, /*#__PURE__*/React.createElement("span", { className: "text-sm font-bold", style: { color: C.ink } }, "Vendido vs. facturado por tienda"),
    /*#__PURE__*/React.createElement("span", { className: "text-xs ml-2", style: { color: C.gray } }, "Vendido = Fenicio (c/IVA) · Facturado = BAS · Dif. = control · Sin factura = pedidos a facturar · "), /*#__PURE__*/React.createElement("span", { className: "text-xs font-bold", style: { color: C.blue } }, "clic en una tienda para filtrar los pendientes")),
  /*#__PURE__*/React.createElement("div", { className: "overflow-x-auto" }, /*#__PURE__*/React.createElement("table", {
    className: "w-full", style: { fontSize: 12 }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", { style: { background: "#F6F7F9" } },
    ["Tienda", "Vendido c/IVA", "Facturado c/IVA", "Facturado s/IVA (metas)", "Facturas", "Dif. vendido−facturado", "Sin factura (pend.)"].map((hh, i) => /*#__PURE__*/React.createElement("th", {
      key: hh, className: "px-3 py-2 font-bold uppercase", style: { color: C.gray, fontSize: 10, textAlign: i === 0 ? "left" : "right" }
    }, hh)))),
  /*#__PURE__*/React.createElement("tbody", null, porTienda.map(t => /*#__PURE__*/React.createElement("tr", { key: t.tienda, onClick: () => filtrarTienda(t.tienda), title: "Filtrar pedidos sin factura de " + t.tienda, style: { borderTop: `1px solid ${C.line}`, cursor: "pointer", background: filtroTienda === t.tienda ? C.soft : "transparent" } },
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 font-bold", style: { color: C.ink } }, t.tienda,
      t.nCanc > 0 && /*#__PURE__*/React.createElement("span", { className: "text-[10px] font-normal ml-1", style: { color: C.gray } }, "(", t.nCanc, " cancel.)")),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 tabular-nums text-right", style: { color: C.ink } }, fmtI(t.vendido)),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 tabular-nums text-right", style: { color: C.ink } }, fmtI(t.facturadoConIVA)),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 tabular-nums text-right font-bold", style: { color: C.green } }, fmtI(t.facturadoSinIVA)),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 tabular-nums text-right", style: { color: C.gray } }, t.nFac),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 tabular-nums text-right", style: { color: "#94A3B8" } }, fmtSigno(t.falta)),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 tabular-nums text-right", style: { color: (t.pendCount || 0) > 0 ? C.red : C.gray } }, (t.pendCount || 0) > 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", { className: "font-bold" }, t.pendCount), " · ", fmtI(t.pendMonto)) : "—"))),
  /*#__PURE__*/React.createElement("tr", { style: { borderTop: `2px solid ${C.line}`, background: "#FAFBFC" } },
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 font-black", style: { color: C.ink } }, "Total"),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 tabular-nums text-right font-bold", style: { color: C.ink } }, fmtI(porTienda.reduce((a, t) => a + t.vendido, 0))),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 tabular-nums text-right font-bold", style: { color: C.ink } }, fmtI(porTienda.reduce((a, t) => a + t.facturadoConIVA, 0))),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 tabular-nums text-right font-black", style: { color: C.green } }, fmtI(porTienda.reduce((a, t) => a + t.facturadoSinIVA, 0))),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 tabular-nums text-right", style: { color: C.gray } }, porTienda.reduce((a, t) => a + t.nFac, 0)),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 tabular-nums text-right", style: { color: "#94A3B8" } }, fmtSigno(porTienda.reduce((a, t) => a + t.falta, 0))),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 tabular-nums text-right font-black", style: { color: C.red } }, porTienda.reduce((a, t) => a + (t.pendCount || 0), 0) > 0 ? porTienda.reduce((a, t) => a + (t.pendCount || 0), 0) + " · " + fmtI(porTienda.reduce((a, t) => a + (t.pendMonto || 0), 0)) : "—"))))),
  !tieneCuponInfo && (grupos.cancelado.length > 0) && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl px-4 py-2 text-xs font-semibold",
    style: { background: C.amberS, color: C.amber }
  }, "ℹ El reporte de Fenicio cargado no trae columna de cupón, así que no se pueden separar los cancelados con cupón web. Exportá el reporte de ventas que incluye \"Cupón\" (el de Nacional/TimeOut) para verlos.")),
  (grupos.revisar.length + (grupos.pcnManual || []).length + (grupos.canceladoCupon || []).length) > 0 && /*#__PURE__*/React.createElement("div", { className: "space-y-2" },
    /*#__PURE__*/React.createElement("div", { className: "text-xs font-black uppercase tracking-wide", style: { color: C.gray } }, "Falta por facturar"),
    /*#__PURE__*/React.createElement("div", { className: "grid sm:grid-cols-3 gap-3" },
      [
        { id: "revisar", l: "Automática", sub: "Ya entregados — emitir factura", arr: grupos.revisar, c: C.red, s: C.redS },
        { id: "pcnManual", l: "Manual · PCN", sub: "Personalizadas — solicitar al WMS", arr: grupos.pcnManual || [], c: "#B45309", s: "#FEF3C7" },
        { id: "canceladoCupon", l: "Manual · Cupón", sub: "Cupón web — facturar a mano", arr: grupos.canceladoCupon || [], c: "#C2410C", s: "#FFEDD5" }
      ].map(k => /*#__PURE__*/React.createElement("button", {
        key: k.id, onClick: () => irTab(k.id),
        className: "text-left rounded-2xl p-4 border transition-all", style: { background: k.s, borderColor: k.c + "55" }
      },
        /*#__PURE__*/React.createElement("div", { className: "text-2xl font-black fraunces tabular-nums", style: { color: k.c } }, arrDe(k).length),
        /*#__PURE__*/React.createElement("div", { className: "text-xs font-bold mt-0.5", style: { color: k.c } }, k.l),
        /*#__PURE__*/React.createElement("div", { className: "text-[11px] mt-0.5", style: { color: C.gray } }, k.sub, arrDe(k).length > 0 ? " · " + fmtI(sumImporte(arrDe(k))) : "")))),
    grupos.pendienteOK.length > 0 && /*#__PURE__*/React.createElement("div", { className: "text-[11px]", style: { color: C.gray } }, grupos.pendienteOK.length, " pedidos aún en proceso (no se facturan todavía)")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-8 gap-2"
  }, TABS.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    onClick: () => irTab(t.id),
    className: "rounded-2xl p-3 text-left transition-all border",
    style: {
      background: tabAct === t.id ? t.c : "#fff",
      color: tabAct === t.id ? "#fff" : t.c,
      borderColor: tabAct === t.id ? t.c : C.line
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-black tabular-nums fraunces"
  }, arrDe(t).length), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] font-bold uppercase tracking-wide mt-0.5 leading-tight opacity-90"
  }, t.l.replace("⚠ ", "")), arrDe(t)[0]?.importe != null && /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] mt-0.5 opacity-75"
  }, fmtI(sumImporte(arrDe(t))))))), ((grupos.canceladoConFactura || []).length + (factDuplicadas || []).length) > 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-xs px-1 flex flex-wrap items-center gap-x-2 gap-y-1", style: { color: C.gray }
  }, /*#__PURE__*/React.createElement("span", { className: "font-bold uppercase tracking-wide text-[10px]" }, "A revisar:"),
    (grupos.canceladoConFactura || []).length > 0 && /*#__PURE__*/React.createElement("button", {
      onClick: () => irTab("canceladoFactura"), className: "font-bold underline", style: { color: "#BE123C" }
    }, grupos.canceladoConFactura.length, " cancelados con factura (anular)"),
    (factDuplicadas || []).length > 0 && /*#__PURE__*/React.createElement("button", {
      onClick: () => irTab("facturaDup"), className: "font-bold underline", style: { color: "#7C3AED" }
    }, factDuplicadas.length, " facturados de más sin NC")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border overflow-hidden",
    style: {
      borderColor: C.line
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b flex items-center justify-between gap-2",
    style: {
      borderColor: C.line
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-bold",
    style: {
      color: tabActual.c
    }
  }, tabActual.l.replace("⚠ ", ""), " — ", arr.length, " pedido", arr.length !== 1 ? "s" : "", filtroTienda && /*#__PURE__*/React.createElement("span", { className: "ml-2 text-xs font-bold px-2 py-0.5 rounded-full", style: { background: C.soft, color: C.blue } }, filtroTienda, " ✕")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, filtroTienda && /*#__PURE__*/React.createElement("button", {
    onClick: () => setFiltroTienda(null), className: "text-xs font-bold", style: { color: C.blue }
  }, "Ver todas"), arr[0]?.importe != null && /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold",
    style: {
      color: C.gray
    }
  }, fmtI(sumImporte(arr))), arr.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => exportarXLSX(arr, `facturacion-${tabAct}${filtroTienda ? "-" + filtroTienda : ""}`),
    className: "text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1",
    style: {
      background: C.soft,
      color: C.blue
    }
  }, "↓ Exportar XLSX"))), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full",
    style: {
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "#F6F7F9"
    }
  }, tabAct === "pedDup" ? ["Pedido", "Apariciones"].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    className: "px-3 py-2 text-left font-bold uppercase",
    style: {
      color: C.gray,
      fontSize: 10
    }
  }, h)) : tabAct === "facturaDup" ? ["Pedido", "Tienda", "Facturas (importe s/IVA)", "NC", "Duplicado neto"].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    className: "px-3 py-2 text-left font-bold uppercase",
    style: {
      color: C.gray,
      fontSize: 10
    }
  }, h)) : ["Pedido", "Tienda", "Fecha", "Estado Fenicio", "Estado WMS", "Motivo", "Importe"].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    className: "px-3 py-2 text-left font-bold uppercase",
    style: {
      color: C.gray,
      fontSize: 10
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, filasPagina.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: pagActual * POR_PAGINA + i,
    style: {
      borderTop: `1px solid ${C.line}`,
      background: tabAct === "revisar" ? "#FFF8F8" : tabAct === "facturaDup" ? "#FAF8FF" : "#fff"
    }
  }, tabAct === "pedDup" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-2 font-bold tabular-nums"
  }, r.nro), /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-2 font-bold",
    style: {
      color: C.red
    }
  }, r.apariciones, "×")) : tabAct === "facturaDup" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-2 font-bold tabular-nums"
  }, r.nro), /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-2",
    style: {
      color: C.gray
    }
  }, r.tienda), /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-2 tabular-nums",
    style: {
      color: C.ink, fontSize: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold", style: { color: "#7C3AED" }
  }, r.facturas, " facturas: "), r.detalle), /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-2 tabular-nums",
    style: {
      color: C.gray
    }
  }, r.ncs || "—"), /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-2 font-bold tabular-nums",
    style: {
      color: r.dupNeto > 0 ? C.red : C.green
    }
  }, r.dupNeto > 0 ? "$" + Math.round(r.dupNeto).toLocaleString("es-UY") : "acreditado ✓")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-2 font-bold tabular-nums"
  }, r.nro), /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-2 whitespace-nowrap",
    style: {
      fontSize: 11,
      color: C.gray
    }
  }, r.tienda || "—"), /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-2 whitespace-nowrap",
    style: {
      color: C.gray
    }
  }, String(r.fecha || "").slice(0, 10)), /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-2",
    style: {
      fontSize: 11
    }
  }, r.estadoFen), /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-2",
    style: {
      fontSize: 11,
      color: /no est/i.test(r.estadoWMS || "") ? C.amber : C.gray
    }
  }, r.estadoWMS), /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-2",
    style: {
      fontSize: 11,
      color: tabAct === "revisar" ? C.red : tabAct === "pendienteOK" ? C.blue : C.gray
    }
  }, r.razon || "—"), /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-2 font-bold tabular-nums"
  }, "$", (r.importe || 0).toLocaleString("es-UY")))))))), arr.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 flex items-center justify-between gap-2 text-xs",
    style: {
      color: C.gray,
      borderTop: `1px solid ${C.line}`
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, "Mostrando ", pagActual * POR_PAGINA + 1, "–", Math.min((pagActual + 1) * POR_PAGINA, arr.length), " de ", arr.length), totalPags > 1 && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setPagina(p => Math.max(0, p - 1)),
    disabled: pagActual === 0,
    className: "px-2.5 py-1 rounded-lg font-bold disabled:opacity-30",
    style: { background: C.soft, color: C.blue }
  }, "‹ Anterior"), /*#__PURE__*/React.createElement("span", {
    className: "px-2 font-bold tabular-nums",
    style: { color: C.ink }
  }, pagActual + 1, " / ", totalPags), /*#__PURE__*/React.createElement("button", {
    onClick: () => setPagina(p => Math.min(totalPags - 1, p + 1)),
    disabled: pagActual >= totalPags - 1,
    className: "px-2.5 py-1 rounded-lg font-bold disabled:opacity-30",
    style: { background: C.soft, color: C.blue }
  }, "Siguiente ›"))), arr.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-6 text-sm text-center",
    style: {
      color: tabAct === "pcnManual" ? C.gray : C.green
    }
  }, filtroTienda ? "Sin pedidos de " + filtroTienda + " en esta categoría." : tabAct === "pcnManual" ? "Los pedidos PCN (prendas personalizadas) se detectan desde el Monitor WMS (columna \"Articulo\", prefijo PCN). Si esto está vacío, cargá el Monitor Ecommerce o no hay PCN sin facturar." : "✓ Sin casos en esta categoría.")));
}

/* ── MesesAnio: componente separado para poder usar useState ── */
function MesesAnio({
  dataMeses,
  anio,
  fmtUSD,
  colMeta,
  fmtM
}) {
  const [expandido, setExpandido] = useState(false);
  const mesActual = new Date().toISOString().slice(0, 7);
  const visibles = expandido ? dataMeses : dataMeses.filter(d => d.tieneDatos || d.m === mesActual);
  const C2 = {
    blue: "var(--ac)",
    soft: "var(--ac-s)",
    ink: "var(--hd)",
    gray: "#64748B",
    line: "#E5E9F0"
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-black uppercase tracking-wide",
    style: {
      color: C2.gray
    }
  }, "Mes a mes ", anio), /*#__PURE__*/React.createElement("button", {
    onClick: () => setExpandido(v => !v),
    className: "text-xs font-bold px-3 py-1 rounded-lg",
    style: {
      color: C2.blue,
      background: C2.soft
    }
  }, expandido ? "Contraer ↑" : "Ver todos los meses ↓")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border overflow-hidden",
    style: {
      borderColor: C2.line
    }
  }, visibles.map((d, i) => {
    const pct = d.mMeta > 0 ? Math.round(d.mReal / d.mMeta * 100) : d.mReal > 0 ? 100 : null;
    const col = colMeta(pct);
    const esMesActual = d.m === mesActual;
    return /*#__PURE__*/React.createElement("div", {
      key: d.m,
      className: "flex items-center gap-3 px-4 py-2.5",
      style: {
        borderTop: i ? `1px solid ${C2.line}` : "none",
        background: esMesActual ? "#F8FAFF" : "#fff"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-16 shrink-0 flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-bold",
      style: {
        color: esMesActual ? C2.blue : C2.ink
      }
    }, fmtM(d.m)), esMesActual && /*#__PURE__*/React.createElement("span", {
      className: "text-[9px] font-black px-1 rounded-full",
      style: {
        background: C2.soft,
        color: C2.blue
      }
    }, "HOY")), /*#__PURE__*/React.createElement("div", {
      className: "flex-1"
    }, d.tieneDatos ? /*#__PURE__*/React.createElement(Bar, {
      pct: Math.min(pct || 0, 100),
      color: col,
      h: 6
    }) : /*#__PURE__*/React.createElement("div", {
      className: "h-1.5 rounded-full",
      style: {
        background: "#EDF0F5"
      }
    })), /*#__PURE__*/React.createElement("div", {
      className: "w-32 shrink-0 text-right"
    }, d.tieneDatos ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "text-xs font-black tabular-nums",
      style: {
        color: col
      }
    }, pct != null ? `${pct}%` : "—"), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] tabular-nums",
      style: {
        color: C2.gray
      }
    }, fmtUSD(d.mReal), "/", fmtUSD(d.mMeta))) : /*#__PURE__*/React.createElement("div", {
      className: "text-[10px]",
      style: {
        color: "#C5CBD6"
      }
    }, "Sin datos")));
  })));
}

/* ── ProgresoAnual: componente separado ── */
function ProgresoAnual({
  metas,
  fmtUSD,
  colMeta,
  fmtM
}) {
  const anio = new Date().getFullYear();
  const TIENDAS_META2 = ["TimeOut", "Tienda Nacional", "Classico", "MercadoLibre"];
  const MESES_ANIO = Array.from({
    length: 12
  }, (_, i) => `${anio}-${String(i + 1).padStart(2, "0")}`);
  const OBJ_ANUAL = 100000000;
  let totalRealAnio = 0,
    totalMetaAnio = 0;
  const dataMeses = MESES_ANIO.map(m => {
    const tiendas = TIENDAS_META2.map(t => metas.find(x => x.mes === m && x.tienda === t) || {
      tienda: t,
      meta: 0,
      real: 0
    });
    const mReal = tiendas.reduce((a, t) => a + Number(t.real || 0), 0);
    const mMeta = tiendas.reduce((a, t) => a + Number(t.meta || 0), 0);
    totalRealAnio += mReal;
    totalMetaAnio += mMeta;
    return {
      m,
      mReal,
      mMeta,
      tieneDatos: mReal > 0 || mMeta > 0
    };
  });
  const pctAnual = Math.round(totalRealAnio / OBJ_ANUAL * 100);
  const colAnual = colMeta(pctAnual);
  const C2 = {
    blue: "var(--ac)",
    soft: "var(--ac-s)",
    ink: "var(--hd)",
    gray: "#64748B",
    line: "#E5E9F0"
  };
  return /*#__PURE__*/React.createElement("section", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border p-5",
    style: {
      borderColor: C2.line
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3 flex-wrap mb-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-black uppercase tracking-wide",
    style: {
      color: C2.gray
    }
  }, "Objetivo anual ", anio), /*#__PURE__*/React.createElement("div", {
    className: "text-3xl font-black fraunces tabular-nums mt-0.5",
    style: {
      color: colAnual
    }
  }, fmtUSD(totalRealAnio)), /*#__PURE__*/React.createElement("div", {
    className: "text-xs mt-0.5",
    style: {
      color: C2.gray
    }
  }, "de ", /*#__PURE__*/React.createElement("span", {
    className: "font-bold",
    style: {
      color: C2.ink
    }
  }, "$100.000.000"), " objetivo · ", pctAnual, "% acumulado")), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold uppercase tracking-wide",
    style: {
      color: C2.gray
    }
  }, "Ritmo necesario / mes"), /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-black fraunces tabular-nums",
    style: {
      color: C2.blue
    }
  }, fmtUSD(OBJ_ANUAL / 12)))), /*#__PURE__*/React.createElement(Bar, {
    pct: pctAnual,
    color: colAnual,
    h: 12
  })), /*#__PURE__*/React.createElement(MesesAnio, {
    dataMeses: dataMeses,
    anio: anio,
    fmtUSD: fmtUSD,
    colMeta: colMeta,
    fmtM: fmtM
  }));
}

/* ── Metas mensuales de facturación ── */
const TIENDAS_META = ["TimeOut", "Tienda Nacional", "Classico", "MercadoLibre"];
const MAPA_SUC = {
  "WEB Time Out": "TimeOut",
  "WEB Nacional": "Tienda Nacional",
  "WEB Clásico": "Classico",
  "WEB Clasico": "Classico"
};
// Lookup tolerante: primero exact match, luego palabras clave (case-insensitive, sin tildes)
const mapearTienda = suc => {
  const s = String(suc || "").trim();
  if (MAPA_SUC[s]) return MAPA_SUC[s];
  const sl = s.toLowerCase()
    .replace(/[áàä]/g,"a").replace(/[éèë]/g,"e")
    .replace(/[íìï]/g,"i").replace(/[óòö]/g,"o").replace(/[úùü]/g,"u");
  if (sl.includes("time") || sl.includes("timeout")) return "TimeOut";
  if (sl.includes("nacional")) return "Tienda Nacional";
  if (sl.includes("clasico") || sl.includes("classico")) return "Classico";
  return null;
};
// Clasificación de comprobantes del BAS por PREFIJO (fuente de verdad indicada por operaciones):
//   Notas de crédito → 5004 / 5104 / 5102 / 5204   ·   Facturas → 5011 / 5111 / 5211 / 5001 / 5101 / 5201
// Si el archivo no trae Prefijo se cae al "Abreviado" (NCD… / FA…) como respaldo.
const NCD_PREFIJOS = new Set(["5004", "5104", "5102", "5204"]);
const FAC_PREFIJOS = new Set(["5011", "5111", "5211", "5001", "5101", "5201"]);
const esNCDrow = r => {
  const p = String(r.Prefijo || "").trim();
  if (NCD_PREFIJOS.has(p)) return true;
  if (FAC_PREFIJOS.has(p)) return false;
  const a = String(r.Abreviado || "").trim().toUpperCase();
  return a.startsWith("NCD") || a.startsWith("NTC") || a === "NC";
};
const esFABrow = r => {
  if (String(r.Anulado || "0").trim() === "1") return false;
  const p = String(r.Prefijo || "").trim();
  if (NCD_PREFIJOS.has(p)) return false;
  if (FAC_PREFIJOS.has(p)) return true;
  const a = String(r.Abreviado || "").trim().toUpperCase();
  return a === "FAB" || a === "FA" || a === "FAC" || a.startsWith("FA");
};
// Clave única de comprobante (Prefijo+Numero). BA/BB vienen repetidos en cada renglón del mismo
// comprobante, así que hay que quedarse con UN renglón por comprobante antes de sumar importes.
const claveComprobante = r => {
  const num = String(r.Numero || "").trim();
  return num ? String(r.Prefijo || "").trim() + "-" + num : "OBS:" + String(r.Observacion || "").trim();
};

/* ── Facturación por período: cuánto se facturó y en qué fechas, con filtro Desde/Hasta ── */
function Facturado({ resumenBAS, fmtUSD, fmtM }) {
  const h = React.createElement;
  const meses = resumenBAS.meses || [];
  const [desde, setDesde] = useState(meses[0] || "");
  const [hasta, setHasta] = useState(meses[meses.length - 1] || "");
  // Al recargar un BAS nuevo, reencuadrar el filtro al rango disponible.
  useEffect(() => {
    if (meses.length) { setDesde(meses[0]); setHasta(meses[meses.length - 1]); }
  }, [resumenBAS]);
  const TIENDAS = ["TimeOut", "Tienda Nacional", "Classico"];
  const enRango = m => (!desde || m >= desde) && (!hasta || m <= hasta);
  const mesesSel = meses.filter(enRango);
  const tot = {}; TIENDAS.forEach(t => tot[t] = { neto: 0, ncd: 0, ped: 0, fac: 0 });
  let nNcd = 0;
  mesesSel.forEach(m => {
    TIENDAS.forEach(t => {
      tot[t].neto += resumenBAS.porMesNeto?.[m]?.[t] || 0;
      tot[t].ncd += resumenBAS.ncdPorMesTienda?.[m]?.[t] || 0;
      tot[t].ped += resumenBAS.cantPedMes?.[m]?.[t] || 0;
      tot[t].fac += resumenBAS.cantFacMes?.[m]?.[t] || 0;
    });
    nNcd += resumenBAS.ncdPorMes?.[m]?.cant || 0;
  });
  const totalNeto = TIENDAS.reduce((a, t) => a + tot[t].neto, 0);
  const totalFac = TIENDAS.reduce((a, t) => a + tot[t].fac, 0);
  const inpMes = (val, setV) => h("input", {
    type: "month", value: val, min: meses[0], max: meses[meses.length - 1],
    onChange: e => setV(e.target.value),
    className: "text-sm rounded-lg border px-2 py-1 outline-none", style: { borderColor: C.line }
  });
  return h("div", { className: "bg-white rounded-2xl border p-5", style: { borderColor: C.line } },
    h("div", { className: "flex items-start justify-between gap-3 flex-wrap mb-4" },
      h("div", null,
        h("div", { className: "text-xs font-black uppercase tracking-wide", style: { color: C.gray } }, "Facturado en el período", h("span", { className: "font-normal normal-case ml-1" }, "(sin IVA, neto de NC · 3 tiendas del BAS)")),
        h("div", { className: "text-3xl font-black fraunces tabular-nums mt-0.5", style: { color: C.ink } }, fmtUSD(totalNeto)),
        h("div", { className: "text-xs mt-0.5", style: { color: C.gray } }, totalFac.toLocaleString("es-UY"), " facturas", nNcd > 0 ? " · " + nNcd + " NCD" : "")),
      h("div", { className: "flex items-end gap-2" },
        h("div", null, h("div", { className: "text-[10px] font-bold uppercase tracking-wide mb-0.5", style: { color: C.gray } }, "Desde"), inpMes(desde, setDesde)),
        h("div", null, h("div", { className: "text-[10px] font-bold uppercase tracking-wide mb-0.5", style: { color: C.gray } }, "Hasta"), inpMes(hasta, setHasta)))),
    h("div", { className: "grid sm:grid-cols-3 gap-3" },
      TIENDAS.map(t => h("div", { key: t, className: "rounded-xl p-3", style: { background: "#F6F7F9" } },
        h("div", { className: "text-xs font-bold uppercase tracking-wide mb-1", style: { color: C.gray } }, t),
        h("div", { className: "text-xl font-black tabular-nums fraunces", style: { color: C.ink } }, fmtUSD(tot[t].neto)),
        tot[t].ncd > 0 && h("div", { className: "text-xs", style: { color: C.amber } }, "−", fmtUSD(tot[t].ncd), " NCD"),
        h("div", { className: "text-xs", style: { color: C.gray } }, tot[t].fac.toLocaleString("es-UY"), " facturas · ", tot[t].ped.toLocaleString("es-UY"), " pedidos")))),
    mesesSel.length === 0 && h("div", { className: "text-xs mt-3", style: { color: C.gray } }, "No hay facturación en el rango elegido."));
}

function Metas({
  data,
  recargar,
  esAdmin
}) {
  const mesActual = new Date().toISOString().slice(0, 7);
  const [mes, setMes] = useState(mesActual);
  const [metas, setMetas] = useState([]);
  const [formMeta, setFormMeta] = useState(null);
  const [archivoBAS, setArchivoBAS] = useState(null);
  const [rowsBAS, setRowsBAS] = useState([]);
  const TIENDAS_FEN_AN = [{
    k: "TimeOut",
    l: "TimeOut"
  }, {
    k: "TiendaNacional",
    l: "Tienda Nacional"
  }, {
    k: "Classico",
    l: "Classico"
  }];
  const INIT_OBJ_AN = {
    TimeOut: null,
    TiendaNacional: null,
    Classico: null
  };
  const [archivosFenAn, setArchivosFenAn] = useState({
    ...INIT_OBJ_AN
  });
  const [rowsFenAn, setRowsFenAn] = useState({
    TimeOut: [],
    TiendaNacional: [],
    Classico: []
  });
  const [cargandoFenAn, setCargandoFenAn] = useState({
    TimeOut: false,
    TiendaNacional: false,
    Classico: false
  });
  const rowsFen = [].concat(rowsFenAn.TimeOut.map(r => ({
    ...r,
    _tiendaFen: "TimeOut"
  })), rowsFenAn.TiendaNacional.map(r => ({
    ...r,
    _tiendaFen: "Tienda Nacional"
  })), rowsFenAn.Classico.map(r => ({
    ...r,
    _tiendaFen: "Classico"
  })));
  const [archivoWMS, setArchivoWMS] = useState(null);
  const [rowsWMS, setRowsWMS] = useState([]);
  const [cargandoBAS, setCargandoBAS] = useState(false);
  const [cargandoWMS, setCargandoWMS] = useState(false);
  const [resumenBAS, setResumenBAS] = useState(null);
  const [pendientes, setPendientes] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [snapOK, setSnapOK] = useState(null); // null=sin chequear, true=tabla ok, false=falta crear analisis_snapshot
  const cargarMetas = useCallback(async () => {
    const {
      data: d
    } = await supa.from("metas_mensuales").select("*").order("mes", {
      ascending: false
    });
    setMetas(d || []);
  }, []);
  // Auto-cargar el ÚLTIMO análisis guardado (resumen del BAS + pedidos del cruce), para verlo
  // al entrar sin tener que volver a subir los archivos (se comparte entre personas).
  const cargarSnapshot = useCallback(async () => {
    try {
      const { data, error } = await supa.from("analisis_snapshot").select("*").eq("id", "ultimo").maybeSingle();
      if (error) { setSnapOK(false); return; } // tabla no creada → persistencia del análisis inactiva
      setSnapOK(true);
      if (!data) return; // tabla ok pero todavía sin snapshot guardado
      if (data.resumen) setResumenBAS(data.resumen);
      if (data.pendientes) setPendientes(data.pendientes);
      if (data.mes) setMes(data.mes);
    } catch (_) { setSnapOK(false); }
  }, []);
  // Guarda (upsert) el snapshot del último análisis. Solo se pasan los campos que cambian,
  // así guardar el cruce no pisa el resumen del BAS ni al revés.
  const guardarSnapshot = async campos => {
    try { await supa.from("analisis_snapshot").upsert({ id: "ultimo", actualizado: new Date().toISOString(), ...campos }, { onConflict: "id" }); } catch (_) {}
  };
  useEffect(() => {
    cargarMetas();
    cargarSnapshot();
  }, [cargarMetas, cargarSnapshot]);
  // metasDeMes: real viene del BAS cargado (neto = FABs-NCDs) cuando está disponible,
  // y cae a Supabase si no hay BAS en esta sesión.
  const metasDeMes = TIENDAS_META.map(t => {
    const base = metas.find(m => m.mes === mes && m.tienda === t) || { mes, tienda: t, meta: 0, real: 0, notas: "" };
    const realBAS = resumenBAS?.porMesNeto?.[mes]?.[t];
    return realBAS != null ? { ...base, real: realBAS } : base;
  });
  const guardarMeta = async f => {
    await supa.from("metas_mensuales").upsert({
      mes: f.mes,
      tienda: f.tienda,
      meta: Number(f.meta || 0),
      real: Number(f.real || 0),
      notas: f.notas || ""
    }, {
      onConflict: "mes,tienda"
    });
    setFormMeta(null);
    cargarMetas();
  };
  const leerBAS = e => {
    const file = e && e.target && e.target.files ? e.target.files[0] : null;
    if (!file) return;
    setCargandoBAS(true); setArchivoBAS(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, {type:"array"});
        const ws = wb.Sheets[wb.SheetNames[0]];
        const ref = ws["!ref"];
        if(!ref){setRowsBAS([]);setCargandoBAS(false);return;}
        const rng = XLSX.utils.decode_range(ref);
        const hdrs = [];
        for(let C=rng.s.c;C<=Math.min(rng.e.c,200);C++){
          const cell=ws[XLSX.utils.encode_cell({r:rng.s.r,c:C})];
          hdrs.push(cell?String(cell.v||""):"");
        }
        const hdrsNoVacios=hdrs.filter(h=>h.trim().length>0);
        // Buscar columna por nombre EXACTO primero, luego por patrón (fallback)
        const exact=name=>hdrs.findIndex(h=>h.trim().toLowerCase()===name.toLowerCase());
        const fi=pts=>hdrs.findIndex(h=>pts.some(p=>p.test(h)));
        const pick=(name,pats)=>{const e=exact(name);return e>=0?e:fi(pats);};
        const iA=pick("Abreviado",[/abrevi/i]);
        const iN=pick("Anulado",[/anulad/i]);
        const iPref=pick("Prefijo",[/^prefijo$/i]);                    // 5004/5104/5102/5204 = notas de crédito
        const iNum=pick("Numero",[/^numero$/i,/^nro$/i,/comprob/i]);   // nº de factura/comprobante
        const iItm=pick("Coditm",[/^coditm$/i,/^sku$/i,/^codart/i]);   // SKU del artículo
        const iDesc=pick("Descripcion",[/^descripcion$/i]);
        const iImp=pick("Importe",[/^importe$/i,/^monto$/i]);          // monto por renglón (CON IVA)
        const iIva=pick("IVA",[/^iva$/i,/^i\.?\s*v\.?\s*a\.?$/i,/^imp.*iva$/i]); // IVA por renglón → facturación neta = Importe − IVA
        const iTG=pick("TotGravado",[/totgravad/i,/gravado/i]);        // BA (col amarilla): total de la venta SIN IVA (por comprobante)
        const iO=pick("Observacion",[/^observacion$/i,/observ/i]);     // contiene nº de pedido Fenicio
        const iT=pick("Total",[/^total$/i]);                           // BB (col verde): total de la factura CON IVA (por comprobante)
        const iS=pick("Sucursal",[/sucursal/i,/local/i]);
        const iF=pick("Fecha",[/^fecha$/i]);
        console.log("BAS cols:",{iA,iN,iPref,iNum,iItm,iImp,iIva,iTG,iO,iT,iS,iF});
        if(iA<0){alert("Col Abreviado no encontrada.\nColumnas del archivo: "+hdrsNoVacios.slice(0,25).join(", "));setCargandoBAS(false);return;}
        const cl2=C=>{let s='',n=C;do{s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)-1;}while(n>=0);return s;};
        const L=i=>i>=0?cl2(i):null;
        const lA=L(iA),lN=L(iN),lPref=L(iPref),lNum=L(iNum),lItm=L(iItm),lDesc=L(iDesc),lImp=L(iImp),lIva=L(iIva),lTG=L(iTG),lO=L(iO),lT=L(iT),lS=L(iS),lF=L(iF);
        const gv=(l,R)=>{if(!l)return'';const cl=ws[l+R];if(!cl)return'';return String(cl.w!==undefined&&cl.w!==''?cl.w:cl.v!==undefined?cl.v:'')||"";};
        // Para columnas numéricas leer el valor raw de Excel (no el texto formateado)
        const gvn=(l,R)=>{if(!l)return 0;const cl=ws[l+R];if(!cl)return 0;if(typeof cl.v==='number')return cl.v;const s=String(cl.w||cl.v||'0').trim().replace(/\s/g,'');if(!s||s==='-')return 0;if(s.includes('.')&&s.includes(',')){const li=s.lastIndexOf(',');return li>s.lastIndexOf('.')?parseFloat(s.replace(/\./g,'').replace(',','.'))||0:parseFloat(s.replace(/,/g,''))||0;}if(s.includes('.')&&!s.includes(',')){const p=s.split('.');return p.length>2||p[1]?.length===3?parseFloat(s.replace(/\./g,''))||0:parseFloat(s)||0;}if(s.includes(',')&&!s.includes('.')){const p=s.split(',');return p.length>2||p[1]?.length===3?parseFloat(s.replace(/,/g,''))||0:parseFloat(s.replace(',','.'))||0;}return parseFloat(s)||0;};
        // Fecha: preferir el número de serie de Excel (cl.v) — evita ambigüedad D/M vs M/D del texto formateado
        const gvd=(l,R)=>{if(!l)return'';const cl=ws[l+R];if(!cl)return'';if(typeof cl.v==='number')return cl.v;return String(cl.w||cl.v||'');};
        const colLetras=hdrs.map((_,i)=>cl2(i));
        const rows=[];
        let primeraFAB=null;
        for(let R=rng.s.r+2;R<=rng.e.r+1;R++){
          const ab=lA?gv(lA,R).trim():'';
          if(!ab)continue;
          const row={Abreviado:ab,Anulado:lN?gv(lN,R):'0',Prefijo:lPref?gv(lPref,R).trim():'',Numero:lNum?gv(lNum,R):'',Sku:lItm?gv(lItm,R):'',Descripcion:lDesc?gv(lDesc,R):'',Importe:lImp?gvn(lImp,R):0,Iva:lIva?gvn(lIva,R):0,TotGravado:lTG?gvn(lTG,R):0,Observacion:lO?gv(lO,R):'',Total:lT?gvn(lT,R):0,Sucursal:lS?gv(lS,R):'',Fecha:lF?gvd(lF,R):''};
          rows.push(row);
          if(!primeraFAB && (ab==="FAB"||ab==="FA")){
            const raw={};
            hdrs.forEach((h,i)=>{if(h.trim())raw[h]=gv(colLetras[i],R);});
            primeraFAB=raw;
          }
        }
        console.log("BAS: "+rows.length+" filas. FAB:"+rows.filter(r=>r.Abreviado==="FAB").length);
        rows._colImporte=iImp>=0?hdrs[iImp]:null;
        rows._colIva=iIva>=0?hdrs[iIva]:null;
        rows._colTotGrav=iTG>=0?hdrs[iTG]:null;   // BA sin IVA
        rows._colTotal=iT>=0?hdrs[iT]:null;       // BB con IVA
        rows._colPref=iPref>=0?hdrs[iPref]:null;
        rows._tieneBA=iTG>=0;                      // si el BAS trae TotGravado usamos importes por comprobante
        rows._hdrs=hdrsNoVacios.slice(0,25);
        rows._primeraFAB=primeraFAB;
        setRowsBAS(rows);
      }catch(err){alert("Error BAS: "+err.message);}
      setCargandoBAS(false);
    };
    reader.readAsArrayBuffer(file);
  };
  const leerFenicio = tienda => e => {
    const file = e && e.target && e.target.files ? e.target.files[0] : null;
    if (!file) return;
    const k = tienda.replace(" ", "");
    setCargandoFenAn(p => ({...p, [k]: true}));
    setArchivosFenAn(p => ({...p, [k]: file.name}));
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb = XLSX.read(ev.target.result, {type: "binary"});
        const ws = wb.Sheets[wb.SheetNames[0]];
        // Los .xls de Fenicio son HTML; SheetJS deja etiquetas <td> dentro de cada celda → limpiarlas
        const clean = v => String(v == null ? "" : v).replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#?\w+;/g, "").trim();
        const data = XLSX.utils.sheet_to_json(ws, {header: 1, raw: false, defval: ""}).map(r => (r || []).map(clean));
        let hIdx = -1;
        for (let i = 0; i < Math.min(8, data.length); i++) {
          if ((data[i] || []).some(c => String(c || "").toLowerCase().includes("pedido"))) {
            hIdx = i; break;
          }
        }
        if (hIdx < 0) {
          alert("⚠ " + tienda + ": este archivo no contiene los datos del reporte (parece ser solo el “cascarón” de exportación de " + (file.name||"") + ", 10 KB).\n\nVolvé a exportar desde Fenicio y guardá el reporte como UN SOLO archivo (no “página web completa”).");
          const kErr = tienda.replace(" ", "");
          setRowsFenAn(p => ({...p, [kErr]: []}));
          setCargandoFenAn(p => ({...p, [kErr]: false}));
          return;
        }
        const headers = data[hIdx].map(String);
        const rows = data.slice(hIdx + 1).map(r => {
          const o = {};
          headers.forEach((h, i) => o[h] = r[i] || "");
          return o;
        }).filter(r => /^\d+$/.test(String(Object.values(r)[0] || "").trim()));
        const k2 = tienda.replace(" ", "");
        if (!rows.length) alert("⚠ " + tienda + ": no se encontraron pedidos en el archivo. Verificá que sea el reporte de ventas correcto.");
        setRowsFenAn(p => ({...p, [k2]: rows}));
      } catch (err) {
        alert("Error Fenicio: " + err.message);
      }
      const k3 = tienda.replace(" ", "");
      setCargandoFenAn(p => ({...p, [k3]: false}));
    };
    reader.readAsBinaryString(file);
  };
  const extraerNroPedido = obs => {
    const s = String(obs || "").trim();
    // "123456/texto" o "123456 texto"
    const m1 = s.match(/^(\d{4,10})[/\s]/);
    if (m1) return m1[1];
    // Solo número (4-10 dígitos)
    const m2 = s.match(/^(\d{4,10})$/);
    if (m2) return m2[1];
    // Número de 5-8 dígitos en cualquier parte del string
    const m3 = s.match(/\b(\d{5,8})\b/);
    if (m3) return m3[1];
    return null;
  };
  const leerWMS = e => {
    const file = e.target.files[0];
    if (!file) return;
    setCargandoWMS(true);
    setArchivoWMS(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb = XLSX.read(ev.target.result, {
          type: "binary",
          cellText: true
        });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          raw: false,
          defval: ""
        });
        const headers = data[0].map(String);
        setRowsWMS(data.slice(1).map(r => {
          const o = {};
          headers.forEach((h, i) => o[h] = r[i] || "");
          return o;
        }));
      } catch (err) {
        alert("Error WMS: " + err.message);
      }
      setCargandoWMS(false);
    };
    reader.readAsBinaryString(file);
  };

  // ── Lógica core separada para poder combinarla ──
  const parseMesBAS = f => {
    if (!f) return null;
    const s = String(f).trim();
    const iso = s.match(/^(\d{4})-(\d{2})/);              // 2026-05-02
    if (iso) return `${iso[1]}-${iso[2]}`;
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); // DD/MM/YYYY
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}`;
    const n = parseFloat(s);                               // serial Excel
    if (!isNaN(n) && n > 40000 && n < 50000) {
      const d = new Date(Math.round((n - 25569) * 86400 * 1000));
      const y = d.getUTCFullYear(), m = String(d.getUTCMonth() + 1).padStart(2, "0");
      if (y >= 2020 && y <= 2030) return `${y}-${m}`;
    }
    return null;
  };
  const _coreBAS = async () => {
    console.log('_coreBAS inicio. rowsBAS:',rowsBAS.length);
    if(!rowsBAS.length)return;
    const tieneBA = !!rowsBAS._tieneBA;   // el BAS trae TotGravado (BA) y Total (BB) por comprobante
    const fabLineas = rowsBAS.filter(esFABrow);
    const ncdLineas = rowsBAS.filter(esNCDrow);
    // BA/BB vienen repetidos en todos los renglones de un mismo comprobante → colapsar a UN renglón por
    // comprobante (Prefijo+Numero). Si el archivo no trae BA, se cae a sumar (Importe − IVA) por renglón.
    const porComprobante = lineas => {
      if (!tieneBA) return null;
      const m = new Map();
      lineas.forEach(r => { const k = claveComprobante(r); if (!m.has(k)) m.set(k, r); });
      return [...m.values()];
    };
    const fabDoc = porComprobante(fabLineas);
    const ncdDoc = porComprobante(ncdLineas);
    const sucSinMapa = new Set();
    // Facturación por MES y tienda. "SIN IVA" (para las metas) = TotGravado/BA por comprobante (o, si no
    // hay BA, Importe−IVA por renglón). "CON IVA" = Total/BB por comprobante (o Importe por renglón) — se
    // usa para comparar contra lo VENDIDO en Fenicio (que viene con IVA). El archivo puede abarcar meses.
    const porMes = {};        // sin IVA (BA)  { "2026-06": { TimeOut: 123, ... } }
    const porMesConIVA = {};  // con IVA (BB)  { "2026-06": { TimeOut: 150, ... } }
    const pedMesTienda = {};  // { "2026-06": { TimeOut: Set(pedidos) } }
    const facMesTienda = {};  // { "2026-06": { TimeOut: Set(numeroFactura) } } para CONTAR facturas únicas
    const fabAgg = fabDoc || fabLineas;
    fabAgg.forEach(r => {
      const suc = String(r.Sucursal || "").trim();
      const tienda = mapearTienda(suc);
      if (!tienda) { if (suc) sucSinMapa.add(suc); return; }
      const m = parseMesBAS(r.Fecha) || mes;
      const sinIVA = tieneBA ? (Number(r.TotGravado) || 0) : ((Number(r.Importe) || 0) - (Number(r.Iva) || 0));
      const conIVA = tieneBA ? (Number(r.Total) || 0) : (Number(r.Importe) || 0);
      if (!porMes[m]) porMes[m] = {};
      porMes[m][tienda] = (porMes[m][tienda] || 0) + sinIVA;
      if (!porMesConIVA[m]) porMesConIVA[m] = {};
      porMesConIVA[m][tienda] = (porMesConIVA[m][tienda] || 0) + conIVA;
      const numero = claveComprobante(r) + "|" + tienda;
      if (!facMesTienda[m]) facMesTienda[m] = {};
      if (!facMesTienda[m][tienda]) facMesTienda[m][tienda] = new Set();
      facMesTienda[m][tienda].add(numero);
      const nro = extraerNroPedido(r.Observacion);
      if (nro) {
        if (!pedMesTienda[m]) pedMesTienda[m] = {};
        if (!pedMesTienda[m][tienda]) pedMesTienda[m][tienda] = new Set();
        pedMesTienda[m][tienda].add(nro);
      }
    });
    // Cantidad de facturas únicas por mes/tienda (para mostrar)
    const cantFacMes = {};
    Object.entries(facMesTienda).forEach(([m, tt]) => {
      cantFacMes[m] = {};
      Object.entries(tt).forEach(([t, s]) => { cantFacMes[m][t] = s.size; });
    });
    // NCD por mes (cantidad, monto sin IVA, y por tienda para descontar del real)
    const ncdPorMes = {};
    const ncdPorMesTienda = {};  // { "2026-06": { TimeOut: 340063, ... } }
    const ncdAgg = ncdDoc || ncdLineas;
    ncdAgg.forEach(r => {
      const suc = String(r.Sucursal || "").trim();
      const tienda = mapearTienda(suc);
      const m = parseMesBAS(r.Fecha) || mes;
      const imp = Math.abs(tieneBA ? (Number(r.TotGravado) || 0) : ((Number(r.Importe) || 0) - (Number(r.Iva) || 0)));  // nota de crédito neta (sin IVA)
      if (!ncdPorMes[m]) ncdPorMes[m] = {cant:0, monto:0};
      ncdPorMes[m].cant++;
      ncdPorMes[m].monto += imp;
      if (tienda) {
        if (!ncdPorMesTienda[m]) ncdPorMesTienda[m] = {};
        ncdPorMesTienda[m][tienda] = (ncdPorMesTienda[m][tienda] || 0) + imp;
      }
    });
    const meses = Object.keys(porMes).sort();
    // cantidad de pedidos únicos por mes/tienda (para mostrar)
    const cantPedMes = {};
    Object.entries(pedMesTienda).forEach(([m,tt])=>{ cantPedMes[m]={}; Object.entries(tt).forEach(([t,s])=>cantPedMes[m][t]=s.size); });
    const primeraFAB = rowsBAS._primeraFAB || null;
    const basCols = rowsBAS._hdrs || [];
    // Real NETO por mes/tienda = FABs - NCDs (sin IVA, para mostrar en Metas y guardar en Supabase)
    const porMesNeto = {};
    Object.entries(porMes).forEach(([m,tt]) => {
      porMesNeto[m] = {};
      Object.entries(tt).forEach(([t,fabT]) => {
        porMesNeto[m][t] = Math.max(0, fabT - (ncdPorMesTienda[m]?.[t] || 0));
      });
    });
    const fabTotal = fabDoc ? fabDoc.length : fabLineas.length;
    const ncdTotal = ncdDoc ? ncdDoc.length : ncdLineas.length;
    const resumen = {porMes, porMesConIVA, porMesNeto, ncdPorMes, ncdPorMesTienda, cantPedMes, cantFacMes, meses, fabTotal, ncdTotal, tieneBA, sucSinMapa:Array.from(sucSinMapa), colImporte:tieneBA?rowsBAS._colTotGrav:rowsBAS._colImporte, colIva:rowsBAS._colIva, colTotGrav:rowsBAS._colTotGrav, colTotal:rowsBAS._colTotal, basCols, primeraFAB};
    setResumenBAS(resumen);
    // Posicionar la vista de metas en el mes más reciente del archivo
    const mesReciente = meses[meses.length-1];
    if (mesReciente && mes !== mesReciente) setMes(mesReciente);
    guardarSnapshot({ mes: mesReciente || mes, resumen });
    // Guardar en Supabase: una fila por (mes, tienda)
    if (esAdmin && supa) {
      try {
        for (const [m, tt] of Object.entries(porMesNeto)) {
          for (const [tienda, real] of Object.entries(tt)) {
            await supa.from('metas_mensuales').upsert({mes:m, tienda, real:Math.round(real)}, {onConflict:'mes,tienda'});
          }
        }
        const {data:kpisG} = await supa.from('kpis_globales').select('id,nombre');
        const kpiNC = kpisG?.find(k=>k.nombre.toLowerCase().includes('nota')&&k.nombre.toLowerCase().includes('cr'));
        const ncdReciente = mesReciente && ncdPorMes[mesReciente] ? ncdPorMes[mesReciente].cant : ncdTotal;
        if(kpiNC) await supa.from('kpis_globales').update({valor:String(ncdReciente)}).eq('id',kpiNC.id);
        cargarMetas();
      } catch(e) { console.warn('Supabase _coreBAS:',e.message); }
    }
  };
  const _coreCruce = async () => {
    const findCol = (sample, patterns) => Object.keys(sample).find(k => patterns.some(p => p.test(k))) || "";
    const num = v => { const n = parseFloat(String(v == null ? "" : v).replace(/[^\d.-]/g, "")); return isNaN(n) ? 0 : n; };
    const sF = rowsFen[0] || {};
    const colNro = findCol(sF, [/nro\.?\s*ped/i, /ped.*nro/i]) || "Nro. pedido";
    const colFechF = findCol(sF, [/fecha.*pago/i, /fecha.*com/i, /comienzo/i, /^fecha/i]) || "Fecha pago";
    const colEstF = findCol(sF, [/estado.*entr/i, /entr.*estado/i]) || "Estado entrega";
    const colEstPago = findCol(sF, [/^estado$/i]) || "Estado";
    const colImp = findCol(sF, [/importe.*total.*pedido/i, /importe.*pedido/i]) || findCol(sF, [/importe/i]) || "Importe total pedido";
    const colSku = findCol(sF, [/^sku$/i, /sku/i, /c[oó]d.*art/i]) || "SKU";
    // Cupón / personalizada: sólo vienen en algunos exports de Fenicio (Nacional/TimeOut, no en el "clásico")
    const colCupon = findCol(sF, [/^cup[oó]n$/i, /c[oó]digo.*cup[oó]n/i]);
    const colMontoCup = findCol(sF, [/monto.*cup[oó]n/i]);
    const colPers = findCol(sF, [/personalizada/i]);
    const tieneCuponInfo = !!(colCupon || colMontoCup);
    const hayCupon = r => {
      const c = String(r[colCupon] || "").trim();
      const mc = num(r[colMontoCup]);
      return (!!c && c !== "0" && !/^no$/i.test(c)) || mc !== 0;
    };

    // Comprobantes del BAS (BA/BB por documento). Se colapsa a un renglón por comprobante porque BA/BB
    // se repiten en cada línea. Importes de nota de crédito en valor absoluto (vienen negativos).
    const tieneBA = !!rowsBAS._tieneBA;
    const docMonto = r => ({ ba: Math.abs(tieneBA ? (Number(r.TotGravado) || 0) : ((Number(r.Importe) || 0) - (Number(r.Iva) || 0))), bb: Math.abs(tieneBA ? (Number(r.Total) || 0) : (Number(r.Importe) || 0)) });
    const dedupDocs = lineas => { const m = new Map(); lineas.forEach(r => { const k = claveComprobante(r); if (!m.has(k)) m.set(k, r); }); return [...m.values()]; };
    const fab = dedupDocs(rowsBAS.filter(esFABrow));   // facturas (un renglón por comprobante)
    const ncd = dedupDocs(rowsBAS.filter(esNCDrow));   // notas de crédito (prefijos 5004/5104/5102/5204)

    // Facturas por pedido: con su importe SIN IVA (BA) por comprobante, para revisar duplicados.
    const factsXPed = {};
    fab.forEach(r => {
      const nro = extraerNroPedido(r.Observacion);
      if (!nro) return;
      const { ba, bb } = docMonto(r);
      if (!factsXPed[nro]) factsXPed[nro] = { invoices: [], sumBA: 0, sumBB: 0, tienda: mapearTienda(r.Sucursal) };
      factsXPed[nro].invoices.push({ label: String(r.Prefijo || "") + "/" + String(r.Numero || ""), ba, bb });
      factsXPed[nro].sumBA += ba; factsXPed[nro].sumBB += bb;
    });
    const ncsXPed = {};
    ncd.forEach(r => { const nro = extraerNroPedido(r.Observacion); if (!nro) return; const { ba } = docMonto(r); if (!ncsXPed[nro]) ncsXPed[nro] = { n: 0, ba: 0, labels: [] }; ncsXPed[nro].n++; ncsXPed[nro].ba += ba; ncsXPed[nro].labels.push(String(r.Prefijo || "") + "/" + String(r.Numero || "")); });
    const nInvoices = nro => factsXPed[nro] ? factsXPed[nro].invoices.length : 0;
    const netFacturas = nro => nInvoices(nro) - (ncsXPed[nro] ? ncsXPed[nro].n : 0);
    // Duplicados: mismo pedido facturado en más de una FACTURA. El "duplicado neto" = lo facturado de más
    // DESCONTANDO las notas de crédito (prefijos 5004/5104/5102/5204). Si el duplicado ya tiene su NC,
    // el neto queda en 0 y NO se muestra: ya está resuelto y no requiere acción manual.
    const factDuplicadas = Object.keys(factsXPed)
      .filter(nro => nInvoices(nro) > 1)   // más de una factura para el mismo pedido
      .map(nro => {
        const f = factsXPed[nro];
        const nc = ncsXPed[nro] || { n: 0, ba: 0 };
        const maxBA = f.invoices.reduce((mx, x) => Math.max(mx, x.ba), 0);
        const dupNeto = f.sumBA - maxBA - nc.ba;   // exceso facturado aún no acreditado por NC
        return { nro, facturas: nInvoices(nro), ncs: nc.n, ncMonto: nc.ba, total: f.sumBA, dupNeto: Math.max(0, dupNeto), tienda: f.tienda || "—", detalle: f.invoices.map(x => x.label + " $" + Math.round(x.ba).toLocaleString("es-UY")).join("  ·  ") };
      })
      .filter(d => d.dupNeto > 0.5)   // los ya acreditados con NC se consideran resueltos → fuera
      .sort((a, b) => b.dupNeto - a.dupNeto);
    // Facturado por tienda (BA sin IVA y BB con IVA, netos de nota de crédito)
    const factXTienda = {};
    fab.forEach(r => { const t = mapearTienda(r.Sucursal); if (!t) return; const { ba, bb } = docMonto(r); const o = factXTienda[t] = factXTienda[t] || { facBA: 0, facBB: 0, ncdBA: 0, ncdBB: 0, nFac: 0 }; o.facBA += ba; o.facBB += bb; o.nFac++; });
    ncd.forEach(r => { const t = mapearTienda(r.Sucursal); if (!t) return; const { ba, bb } = docMonto(r); const o = factXTienda[t] = factXTienda[t] || { facBA: 0, facBB: 0, ncdBA: 0, ncdBB: 0, nFac: 0 }; o.ncdBA += ba; o.ncdBB += bb; });

    // ── PCN (prendas personalizadas): sus SKU con prefijo "PCN" SÓLO viven en el Monitor WMS
    //    (columna "Articulo"), NO en los reportes de Fenicio. Se detectan acá, no en Fenicio.
    const wmsMap = {};
    const pcnXVenta = {};   // { venta: { arts:[], estadoEnc, estadoEco, importe, deposito, fecha } }
    if (rowsWMS.length) {
      const sW = rowsWMS[0] || {};
      const colArt = findCol(sW, [/art[ií]culo/i, /^sku$/i, /c[oó]d.*art/i]) || "Articulo";
      const colVenta = findCol(sW, [/^venta$/i, /venta/i]) || "Venta";
      const colEstEnc = findCol(sW, [/estado.*encuentra/i]) || "Estado Encuentra";
      const colEstEco = findCol(sW, [/estado.*ecom/i]) || "Estado ecommerce";
      const colDep = findCol(sW, [/dep[oó]sito/i]) || "Deposito pedido";
      const colImpW = findCol(sW, [/^importe$/i, /importe/i]) || "Importe";
      const colFechW = findCol(sW, [/fecha.*ped/i, /^fecha/i]) || "Fecha pedido";
      rowsWMS.forEach(r => {
        const k = String(r[colVenta] || "").trim();
        if (k && !wmsMap[k]) wmsMap[k] = r;
        const art = String(r[colArt] || "").trim();
        if (k && art.toUpperCase().startsWith("PCN")) {
          if (!pcnXVenta[k]) pcnXVenta[k] = { arts: [], estadoEnc: String(r[colEstEnc]||""), estadoEco: String(r[colEstEco]||""), importe: Number(r[colImpW]||0), deposito: String(r[colDep]||""), fecha: String(r[colFechW]||"").slice(0,10) };
          if (!pcnXVenta[k].arts.includes(art)) pcnXVenta[k].arts.push(art);
        }
      });
    }

    // Agrupar líneas de Fenicio por pedido (Fenicio trae 1 fila por SKU)
    const fenPed = {};
    rowsFen.forEach(r => {
      const nro = String(r[colNro] || "").trim();
      if (!nro) return;
      if (!fenPed[nro]) fenPed[nro] = { nro, fecha: String(r[colFechF]||"").slice(0,10), estadoFen: String(r[colEstF]||""), estadoPago: String(r[colEstPago]||""), importe: Number(r[colImp]||0), tienda: r._tiendaFen || "", cupon: colCupon ? String(r[colCupon]||"").trim() : "", montoCupon: colMontoCup ? num(r[colMontoCup]) : 0, conCupon: hayCupon(r), personalizada: colPers ? /^s[ií]$/i.test(String(r[colPers]||"").trim()) : false, lineas: 0, pcn: false, skusPcn: [] };
      fenPed[nro].lineas++;
    });
    // Marcar como PCN los pedidos de Fenicio que el WMS identifica con artículo personalizado
    Object.keys(pcnXVenta).forEach(v => { if (fenPed[v]) { fenPed[v].pcn = true; fenPed[v].skusPcn = pcnXVenta[v].arts.slice(); } });
    const pedDuplicados = []; // en export por línea, un pedido con varias filas es normal; no es duplicado

    // Vendido por tienda (según Fenicio, CON IVA) — para contrastar con lo facturado en el BAS.
    const ventaXTienda = {};
    Object.values(fenPed).forEach(p => {
      const t = p.tienda; if (!t) return;
      const o = ventaXTienda[t] = ventaXTienda[t] || { vendido: 0, pedidos: 0, cancelado: 0, canc: 0 };
      const canc = /cancel|anul|revers/i.test(p.estadoPago) || /cancel|anul/i.test(p.estadoFen);
      if (canc) { o.cancelado += p.importe; o.canc++; } else { o.vendido += p.importe; o.pedidos++; }
    });
    // Resumen por tienda: Vendido (Fenicio, c/IVA) vs Facturado (BAS) vs lo que falta facturar.
    const porTienda = TIENDAS_META.filter(t => t !== "MercadoLibre").map(t => {
      const v = ventaXTienda[t] || { vendido: 0, pedidos: 0, cancelado: 0, canc: 0 };
      const f = factXTienda[t] || { facBA: 0, facBB: 0, ncdBA: 0, ncdBB: 0, nFac: 0 };
      const facturadoConIVA = f.facBB - f.ncdBB;
      const facturadoSinIVA = f.facBA - f.ncdBA;   // el número que va a las metas
      const falta = v.vendido - facturadoConIVA;   // vendido (c/IVA) − facturado (c/IVA)
      return { tienda: t, vendido: v.vendido, pedidosVend: v.pedidos, canceladoVend: v.cancelado, nCanc: v.canc, facturadoConIVA, facturadoSinIVA, nFac: f.nFac, ncdBA: f.ncdBA, falta };
    });

    const hoy = new Date().toISOString().slice(0, 10);
    // Criterio de facturación automática: SOLO se espera factura si el pedido ya fue procesado,
    // es decir si llegó al menos a "Orden liberada" (o estados posteriores: pronto para despacho,
    // despachado, en tránsito, recibido en tienda, listo para retirar, entregado). Antes de eso
    // (pedido recibido / preparando / items pedidos / confirmados) el pedido NO se procesó, así que
    // todavía no se factura y no debe contar como "sin factura".
    const reLiberado = /clasificad|orden\s*liberad|liberad|pronto.*despach|despachad|tr[aá]nsito|camino|recibid[oa]?\s*(en\s*)?tienda|listo.*retir|entregad/i;
    const reDespEntr = /despachad|tr[aá]nsito|camino|recibid[oa]?\s*(en\s*)?tienda|entregad/i;
    const grupos = { facturado: [], facturaDup: [], pendienteOK: [], pcnManual: [], revisar: [], cancelado: [], canceladoConFactura: [], canceladoCupon: [] };

    Object.values(fenPed).forEach(p => {
      const { nro, fecha, estadoFen, estadoPago, importe, pcn, personalizada, conCupon, cupon, montoCupon, skusPcn } = p;
      const wms = wmsMap[nro];
      const estadoWMS = wms ? (wms["Estado Encuentra"] || wms["Estado ecommerce"] || "—") : "No está en WMS";
      const tieneF = nInvoices(nro) > 0;
      const esDupF = netFacturas(nro) > 1;
      const esPcn = pcn || personalizada;
      const base = { nro, tienda: p.tienda || "—", fecha, estadoFen, estadoPago, estadoWMS, importe, pcn: esPcn, conCupon, cupon, montoCupon, skusPcn: (skusPcn||[]).join(", ") };
      const reversado = /revers/i.test(estadoPago) || /revers/i.test(estadoFen) || /revers/i.test(estadoWMS);
      const cancelado = /cancelad|anulad/i.test(estadoWMS) || /cancelad|anulad/i.test(estadoFen) || /cancelad|anulad/i.test(estadoPago);
      if (cancelado || reversado) {
        const etq = reversado && !cancelado ? "Pago reversado" : "Cancelado";
        // Un cancelado NO debería tener factura. Si la tiene, hay que anularla a mano → avisar.
        if (tieneF) grupos.canceladoConFactura.push({ ...base, nFact: nInvoices(nro), razon: etq + " CON factura — anular la factura manualmente ⚠️" });
        // Con cupón web no se factura solo: hay que facturarlo a mano → categoría aparte.
        else if (conCupon) grupos.canceladoCupon.push({ ...base, razon: etq + " con cupón web (" + (cupon || "cupón") + ") — facturar manualmente ⚠️" });
        else grupos.cancelado.push({ ...base, razon: etq });
        return;
      }
      if (tieneF) {
        if (esDupF) grupos.facturaDup.push({ ...base, nFact: nInvoices(nro), nNCs: ncsXPed[nro] ? ncsXPed[nro].n : 0 });
        else grupos.facturado.push(base);
        return;
      }
      // Sin factura:
      if (esPcn) { grupos.pcnManual.push({ ...base, razon: "Prenda personalizada (PCN) — facturar/forzar manualmente" }); return; }
      // Solo se espera factura si el pedido fue procesado (orden liberada o más). Si no, no se factura todavía.
      const liberado = reLiberado.test(estadoFen) || reLiberado.test(estadoWMS);
      if (!liberado) { grupos.pendienteOK.push({ ...base, razon: "Sin orden liberada — todavía no se procesó (no se factura)" }); return; }
      if (reDespEntr.test(estadoFen) || reDespEntr.test(estadoWMS)) { grupos.revisar.push({ ...base, razon: "Despachado/entregado SIN factura ⚠️" }); return; }
      if (fecha >= hoy) { grupos.pendienteOK.push({ ...base, razon: "Orden liberada hoy — a facturar" }); return; }
      grupos.revisar.push({ ...base, razon: "Orden liberada sin factura — verificar" });
    });

    // Pedidos PCN presentes en el WMS pero ausentes del reporte de Fenicio
    // (p.ej. cuando no se cargó el Fenicio de Tienda Nacional). Igual deben analizarse.
    Object.entries(pcnXVenta).forEach(([v, info]) => {
      if (fenPed[v]) return; // ya procesado arriba
      const tieneF = nInvoices(v) > 0;
      const estadoWMS = info.estadoEnc || info.estadoEco || "—";
      const base = { nro: v, tienda: "—", fecha: info.fecha, estadoFen: "— (sólo en WMS)", estadoPago: "", estadoWMS, importe: info.importe, pcn: true, conCupon: false, cupon: "", montoCupon: 0, skusPcn: info.arts.join(", ") };
      if (/cancelad|anulad/i.test(estadoWMS) || /cancelad|anulad/i.test(info.estadoEco)) {
        if (tieneF) grupos.canceladoConFactura.push({ ...base, nFact: nInvoices(v), razon: "Cancelado CON factura — anular la factura manualmente ⚠️" });
        else grupos.cancelado.push({ ...base, razon: "Cancelado" });
        return;
      }
      if (tieneF) { grupos.facturado.push(base); return; }
      grupos.pcnManual.push({ ...base, razon: `Prenda personalizada (PCN) sin factura — forzar manualmente${info.arts.length ? " · " + info.arts.length + " art." : ""}` });
    });

    // Pendientes sin factura POR TIENDA. Cuenta SOLO "revisar" (automática) para que coincida
    // exactamente con el listado al que lleva el clic (la solapa Revisar filtrada por tienda).
    // Los PCN y cupones tienen su propia tarjeta/solapa (el filtro por tienda se mantiene al cambiar).
    const pendXTienda = {};
    grupos.revisar.forEach(r => {
      const t = r.tienda || "—";
      const o = pendXTienda[t] = pendXTienda[t] || { count: 0, monto: 0 };
      o.count++; o.monto += r.importe || 0;
    });
    porTienda.forEach(pt => { const o = pendXTienda[pt.tienda] || { count: 0, monto: 0 }; pt.pendCount = o.count; pt.pendMonto = o.monto; });

    const totalPedidos = Object.keys(fenPed).length + Object.keys(pcnXVenta).filter(v => !fenPed[v]).length;
    const pend = { grupos, factDuplicadas, pedDuplicados, totalPedidos, porTienda, tieneCuponInfo };
    setPendientes(pend);
    guardarSnapshot({ pendientes: pend });
    if (esAdmin) {
      const pendCount = grupos.revisar.length + grupos.pcnManual.length + grupos.facturaDup.length;
      const { data: kpisG } = await supa.from("kpis_globales").select("id,nombre");
      const kpi = kpisG?.find(k => k.nombre.toLowerCase().includes("factur") && k.nombre.toLowerCase().includes("pendiente"));
      if (kpi) await supa.from("kpis_globales").update({ valor: String(pendCount) }).eq("id", kpi.id);
    }
  };
  const procesarTodo = async () => {
    if (!rowsBAS.length) {
      alert("Cargá el BAS primero.");
      return;
    }
    setProcesando(true);
    try {
      await _coreBAS();
      if (rowsFen.length || rowsWMS.length) await _coreCruce();
    } finally {
      setProcesando(false);
    }
  };
  const fmtUSD = n => "$" + Math.round(n || 0).toLocaleString("es-UY");
  const fmtM = m => {
    if (!m) return "";
    const [y, mo] = m.split("-");
    const ns = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return `${ns[Number(mo) - 1]} ${y}`;
  };
  const colMeta = pct => pct == null ? C.gray : pct >= 100 ? C.green : pct >= 70 ? C.amber : C.red;
  const h = React.createElement;
  // ── KPIs del mes seleccionado ──
  const realMes = metasDeMes.reduce((a, m) => a + Number(m.real || 0), 0);
  const metaMes = metasDeMes.reduce((a, m) => a + Number(m.meta || 0), 0);
  const pctMes = metaMes > 0 ? Math.round(realMes / metaMes * 100) : null;
  const colMes = colMeta(pctMes);
  const pedidosMes = resumenBAS ? Object.values(resumenBAS.cantPedMes?.[mes] || {}).reduce((a, b) => a + b, 0) : null;
  const facturasMes = resumenBAS ? Object.values(resumenBAS.cantFacMes?.[mes] || {}).reduce((a, b) => a + b, 0) : null;
  const pcnArrM = pendientes ? (pendientes.grupos.pcnManual || []) : [];
  const pendUrg = pendientes ? pendientes.grupos.revisar.length : null;
  const pendTot = pendientes ? (pendientes.grupos.revisar.length + pendientes.grupos.pendienteOK.length + pcnArrM.length) : null;
  const kpi = (eyebrow, valor, sub, color, extra) => h("div", {
    className: "bg-white rounded-2xl border p-4 flex flex-col",
    style: { borderColor: C.line }
  }, h("div", {
    className: "text-[11px] font-bold uppercase tracking-wide",
    style: { color: C.gray }
  }, eyebrow), h("div", {
    className: "text-3xl font-black fraunces tabular-nums mt-1",
    style: { color: color || C.ink }
  }, valor), extra, sub && h("div", {
    className: "text-xs mt-1",
    style: { color: C.gray }
  }, sub));
  return h("div", { className: "space-y-4" },
    h(Title, {
      eyebrow: "Análisis",
      title: "Facturación y metas",
      right: h("div", { className: "flex items-center gap-2" },
        h("span", { className: "text-[11px] font-bold uppercase tracking-wide", style: { color: C.gray } }, "Período"),
        h("input", {
          type: "month",
          value: mes,
          onChange: e => setMes(e.target.value),
          className: "text-sm rounded-xl border px-3 py-1.5 outline-none",
          style: { borderColor: C.line }
        }))
    }),
    snapOK === false && h("div", {
      className: "rounded-xl px-4 py-3 text-xs font-medium",
      style: { background: C.amberS, color: C.amber }
    }, "⚠ La persistencia del análisis no está activa: falta crear la tabla en Supabase, así que lo que cargás (resumen del BAS y cruce) NO se guarda ni lo ven los demás al entrar. Ejecutá el SQL de sql/analisis_snapshot.sql en Supabase → SQL Editor."),
    // ── KPIs grandes arriba ──
    h("div", { className: "grid sm:grid-cols-3 gap-3" },
      kpi("Facturación neta · " + fmtM(mes), fmtUSD(realMes),
        pctMes != null ? pctMes + "% de " + fmtUSD(metaMes) : "Meta sin definir",
        colMes,
        h("div", { className: "mt-2" }, h(Bar, { pct: pctMes, color: colMes, h: 8 }))),
      kpi("Pedidos del mes", pedidosMes != null ? pedidosMes.toLocaleString("es-UY") : "—",
        resumenBAS ? (facturasMes + " facturas únicas") : "Cargá el BAS para ver pedidos",
        C.ink),
      kpi("Pendientes sin factura", pendTot != null ? pendTot.toLocaleString("es-UY") : "—",
        pendientes ? (pendUrg > 0 ? pendUrg + " urgentes (despachados sin factura)" : "Sin urgentes ✓") : "Cargá Fenicio para cruzar",
        pendUrg > 0 ? C.red : (pendientes ? C.green : C.ink))),
    // ── Desglose por tienda (plegable) ──
    h(Collapse, {
      title: "Desglose por tienda",
      subtitle: "Meta vs. real del mes · " + metasDeMes.length + " tiendas",
      badge: pctMes != null ? h(Chip, { color: colMes, soft: C.soft }, pctMes + "%") : null
    }, h("div", { className: "grid sm:grid-cols-2 xl:grid-cols-4 gap-3" },
      metasDeMes.map(m => {
        const pct = m.meta > 0 ? Math.round((m.real || 0) / m.meta * 100) : null;
        const col = colMeta(pct);
        return h("div", { key: m.tienda, className: "rounded-2xl border p-4", style: { borderColor: C.line } },
          h("div", { className: "flex items-start justify-between mb-3" },
            h("div", null,
              h("div", { className: "text-xs font-black uppercase tracking-wide", style: { color: C.gray } }, m.tienda),
              h("div", { className: "text-2xl font-black fraunces tabular-nums", style: { color: col } }, pct != null ? pct + "%" : "—")),
            esAdmin && h("button", {
              onClick: () => setFormMeta({ mes: m.mes, tienda: m.tienda, meta: m.meta || "", real: m.real || "", notas: m.notas || "" }),
              className: "p-1.5 rounded-lg hover:bg-slate-100",
              style: { color: C.gray }
            }, Ic.edit)),
          h(Bar, { pct: pct, color: col }),
          h("div", { className: "flex justify-between text-xs mt-1.5", style: { color: C.gray } },
            h("span", null, "Real: ", h("b", { style: { color: C.ink } }, fmtUSD(m.real))),
            h("span", null, "Meta: ", fmtUSD(m.meta))),
          m.tienda === "MercadoLibre" && h("div", { className: "text-[10px] mt-1", style: { color: C.gray } }, "Actualización manual (no está en BAS)"));
      }))),
    // ── Progreso anual (plegable) ──
    (metas.length > 0 || resumenBAS) && h(Collapse, {
      title: "Progreso anual y mes a mes",
      subtitle: "Objetivo " + new Date().getFullYear() + " · $100.000.000"
    }, h(ProgresoAnual, {
      metas: resumenBAS ? metas.map(m => { const r = resumenBAS.porMesNeto?.[m.mes]?.[m.tienda]; return r != null ? { ...m, real: r } : m; }) : metas,
      fmtUSD: fmtUSD,
      colMeta: colMeta,
      fmtM: fmtM
    })),
    // ── Cargar archivos y analizar (plegable; abierto si todavía no se analizó) ──
    h(Collapse, {
      title: "Cargar archivos y analizar",
      subtitle: "BAS (obligatorio) · Fenicio y WMS (opcionales)",
      defaultOpen: !resumenBAS,
      badge: archivoBAS ? h(Chip, { color: C.green, soft: C.greenS }, "BAS ✓") : null
    }, h("p", { className: "text-xs mb-3", style: { color: C.gray } },
        "Subí el archivo de facturación del ERP (BAS): la app calcula el total facturado de TimeOut, Tienda Nacional y Classico y actualiza las barras. MercadoLibre se actualiza manualmente."),
      h("div", { className: "space-y-3" },
        h("div", { className: "rounded-2xl border p-4 space-y-2", style: { borderColor: C.line } },
          h("div", { className: "font-bold text-sm" }, "BAS — ERP de facturación ",
            h("span", { className: "text-xs font-normal", style: { color: C.gray } }, "(actualiza los reales de las 3 tiendas)")),
          h("label", {
            className: "flex items-center gap-2 p-3 rounded-xl border-2 border-dashed cursor-pointer",
            style: { borderColor: archivoBAS ? "#86EFAC" : C.line, background: archivoBAS ? C.greenS : "transparent" }
          }, h("span", { style: { color: archivoBAS ? C.green : C.blue, display: "inline-flex" } }, archivoBAS ? Ic.ok : Ic.upload),
            h("span", { className: "text-sm font-semibold", style: { color: archivoBAS ? C.green : C.gray } }, cargandoBAS ? "Leyendo..." : archivoBAS || "Subí el archivo (.xlsx)"),
            h("input", { type: "file", accept: ".xlsx,.xls", className: "hidden", onChange: leerBAS }))),
        h("div", null,
          h("div", { className: "text-sm font-bold mb-2", style: { color: C.ink } }, "Fenicio — Reportes de ventas ",
            h("span", { className: "text-xs font-normal", style: { color: C.gray } }, "(opcional · uno por tienda, se concatenan)")),
          h("div", { className: "grid sm:grid-cols-3 gap-3" },
            TIENDAS_FEN_AN.map(t => h("div", { key: t.k, className: "rounded-2xl border p-3 space-y-2", style: { borderColor: C.line } },
              h("div", { className: "text-xs font-bold" }, t.l),
              h("label", {
                className: "flex items-center gap-2 p-2.5 rounded-xl border-2 border-dashed cursor-pointer",
                style: { borderColor: archivosFenAn[t.k] ? "#86EFAC" : C.line, background: archivosFenAn[t.k] ? C.greenS : "transparent" }
              }, h("span", { style: { color: archivosFenAn[t.k] ? C.green : C.blue, display: "inline-flex" } }, archivosFenAn[t.k] ? Ic.ok : Ic.upload),
                h("span", { className: "text-xs font-semibold truncate", style: { color: archivosFenAn[t.k] ? C.green : C.gray } }, cargandoFenAn[t.k] ? "Leyendo..." : archivosFenAn[t.k] || "Subí el .xls"),
                h("input", { type: "file", accept: ".xlsx,.xls,.csv", className: "hidden", onChange: leerFenicio(t.k) })),
              rowsFenAn[t.k] && rowsFenAn[t.k].length > 0 && h("div", { className: "text-[10px] font-semibold", style: { color: C.gray } }, rowsFenAn[t.k].length, " pedidos")))),
          rowsFen.length > 0 && h("div", { className: "text-xs font-semibold mt-2", style: { color: C.green } }, "Total: ", rowsFen.length, " pedidos cargados")),
        h("div", { className: "rounded-2xl border p-4 space-y-3", style: { borderColor: C.line } },
          h("div", { className: "font-bold text-sm" }, "Encuentra — Monitor WMS ",
            h("span", { className: "text-xs font-normal", style: { color: C.gray } }, "(opcional, agrega el estado del depósito a cada pendiente)")),
          h("label", {
            className: "flex items-center gap-2 p-3 rounded-xl border-2 border-dashed cursor-pointer",
            style: { borderColor: archivoWMS ? "#86EFAC" : C.line, background: archivoWMS ? C.greenS : "transparent" }
          }, h("span", { style: { color: archivoWMS ? C.green : C.blue, display: "inline-flex" } }, archivoWMS ? Ic.ok : Ic.upload),
            h("span", { className: "text-sm font-semibold", style: { color: archivoWMS ? C.green : C.gray } }, cargandoWMS ? "Leyendo..." : archivoWMS || "Subí el Monitor Ecommerce (.xlsx)"),
            h("input", { type: "file", accept: ".xlsx,.xls", className: "hidden", onChange: leerWMS })),
          h("div", { className: "text-xs", style: { color: C.gray } }, "Columnas usadas: ",
            h("span", { className: "px-1.5 py-px rounded-md", style: { background: "#F1F4F8" } }, "Venta"), " ",
            h("span", { className: "px-1.5 py-px rounded-md", style: { background: "#F1F4F8" } }, "Estado Encuentra"),
            " — permite ver en qué estado está cada pendiente en el depósito."))),
      h("div", { className: "flex gap-2 mt-4 flex-wrap" },
        h("button", {
          onClick: procesarTodo,
          disabled: !rowsBAS.length || procesando,
          className: "text-sm font-bold text-white px-6 py-2.5 rounded-xl disabled:opacity-40",
          style: { background: C.blue }
        }, procesando ? "Analizando..." : "Analizar"))),
    // ── Facturación por período (con filtro de fecha) — plegable, no es lo del día a día ──
    resumenBAS && h(Collapse, {
      title: "Facturado por período (BAS)",
      subtitle: "Total facturado por tienda y rango de fechas · 3 tiendas del BAS (sin MercadoLibre)",
      defaultOpen: false
    }, h(Facturado, { resumenBAS, fmtUSD, fmtM })),
    // Avisos de datos sólo cuando algo no cuadra (no en el flujo normal)
    resumenBAS && resumenBAS.sucSinMapa && resumenBAS.sucSinMapa.length > 0 && h("div", {
      className: "rounded-xl px-4 py-2 text-xs font-semibold",
      style: { background: C.amberS, color: C.amber }
    }, "⚠ Sucursales no reconocidas (no se suman a ninguna tienda): ", resumenBAS.sucSinMapa.join(" · "), "."),
    resumenBAS && !resumenBAS.tieneBA && !resumenBAS.colIva && h("div", {
      className: "rounded-xl px-4 py-2 text-xs font-semibold",
      style: { background: C.redS, color: C.red }
    }, "⚠ No encontré la columna TotGravado (BA) ni la de IVA en el BAS: la facturación quedó CON IVA. Columnas: ", (resumenBAS.basCols || []).join(", "), "."),
    // ── Pedidos (siempre visible, paginado) ──
    pendientes && h(ResultadoCruce, { pendientes: pendientes }),
    // ── Modal edición de meta ──
    formMeta && h("div", {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4",
      style: { background: "rgba(14,27,51,0.45)" },
      onClick: () => setFormMeta(null)
    }, h("div", {
      className: "bg-white rounded-2xl p-5 w-full max-w-sm space-y-3 shadow-2xl",
      onClick: e => e.stopPropagation()
    }, h("h3", { className: "font-black text-lg fraunces", style: { color: C.ink } }, "Meta — ", formMeta.tienda),
      h("div", null, h("label", { className: "text-xs font-bold uppercase tracking-wide block mb-1", style: { color: C.gray } }, "Mes"),
        h("input", { type: "month", value: formMeta.mes, onChange: e => setFormMeta({ ...formMeta, mes: e.target.value }), className: "w-full text-sm rounded-xl border px-3 py-2 outline-none", style: { borderColor: C.line } })),
      h("div", null, h("label", { className: "text-xs font-bold uppercase tracking-wide block mb-1", style: { color: C.gray } }, "Meta ($)"),
        h(Inp, { type: "number", placeholder: "ej: 8300000", value: formMeta.meta, onChange: e => setFormMeta({ ...formMeta, meta: e.target.value }) })),
      h("div", null, h("label", { className: "text-xs font-bold uppercase tracking-wide block mb-1", style: { color: C.gray } }, "Real hasta ahora ($) ",
        formMeta.tienda !== "MercadoLibre" && h("span", { style: { color: C.blue } }, "(se actualiza desde el BAS)")),
        h(Inp, { type: "number", placeholder: "opcional", value: formMeta.real, onChange: e => setFormMeta({ ...formMeta, real: e.target.value }) })),
      h("div", null, h("label", { className: "text-xs font-bold uppercase tracking-wide block mb-1", style: { color: C.gray } }, "Notas"),
        h(Inp, { value: formMeta.notas, onChange: e => setFormMeta({ ...formMeta, notas: e.target.value }) })),
      h("div", { className: "flex gap-2 justify-end pt-1" },
        h("button", { onClick: () => setFormMeta(null), className: "text-xs font-bold px-3 py-2 rounded-xl", style: { color: C.gray } }, "Cancelar"),
        h("button", { onClick: () => guardarMeta(formMeta), className: "text-sm font-bold text-white px-5 py-2 rounded-xl", style: { background: C.blue } }, "Guardar")))));
}

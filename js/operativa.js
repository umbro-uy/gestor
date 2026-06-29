/* ===================================================================
   Operativa — cruce Fenicio × WMS, seguimiento de pedidos
   Parte del Gestor del Equipo. Se carga como <script> clásico desde
   index.html; comparte el ámbito global con los demás archivos js/.
   =================================================================== */

/* ── Operativa — cruce Fenicio × Encuentra ── */
/* COLUMNAS PRE-CONFIGURADAS: Fenicio "Nro. pedido"|"Fecha comienzo"|"Estado entrega" / WMS "Venta"|"Estado Encuentra"|"Estado ecommerce"|"Canal" */
function Operativa({ yo }) {
  // Fenicio: un slot por tienda; se concatenan antes del cruce
  const TIENDAS_FEN = [{k:"TimeOut",l:"TimeOut"},{k:"TiendaNacional",l:"Tienda Nacional"},{k:"Classico",l:"Classico"}];
  const [archivosFen, setArchivosFen] = useState({
    TimeOut: null,
    TiendaNacional: null,
    Classico: null
  });
  const [rowsFenT, setRowsFenT] = useState({
    TimeOut: [],
    TiendaNacional: [],
    Classico: []
  });
  const [cargandoFenT, setCargandoFenT] = useState({
    TimeOut: false,
    TiendaNacional: false,
    Classico: false
  });
  const [archivoB, setArchivoB] = useState(null);
  const [rowsB, setRowsB] = useState([]);
  const [cargandoB, setCargandoB] = useState(false);
  // rowsA = concatenación de las tres tiendas (memoizado: puede ser 10k+ filas)
  const rowsA = useMemo(() => [].concat(rowsFenT.TimeOut.map(r => ({
    ...r,
    _tiendaFen: "TimeOut"
  })), rowsFenT.TiendaNacional.map(r => ({
    ...r,
    _tiendaFen: "Tienda Nacional"
  })), rowsFenT.Classico.map(r => ({
    ...r,
    _tiendaFen: "Classico"
  }))), [rowsFenT]);
  const [filtroDias, setFiltroDias] = useState(3);
  const [filtroTienda, setFiltroTienda] = useState("todas");
  const [filtroFecha, setFiltroFecha] = useState({
    desde: "",
    hasta: ""
  });
  const [resultado, setResultado] = useState(null);
  const [entregaDiag, setEntregaDiag] = useState(null); // diagnóstico de la columna de fecha de entrega de Fenicio
  const [vistaTab, setVistaTab] = useState("atrasados");
  const [page, setPage] = useState(0);
  const [soloCC, setSoloCC] = useState("todos"); // todos | cc | nocc
  const [ccCol, setCcCol] = useState("");
  const [comentarios, setComentarios] = useState({}); // pedido -> { comentario, accionado, comentario_fecha } (persistido)
  const [persistOK, setPersistOK] = useState(null); // null=sin chequear, true=tabla ok, false=falta crear tabla
  const [filtroEstadoFen, setFiltroEstadoFen] = useState("");
  const [filtroDeposito, setFiltroDeposito] = useState("");
  const [filtroDiasMin, setFiltroDiasMin] = useState("");
  const [buscar, setBuscar] = useState("");
  const [calMes, setCalMes] = useState("");
  const [filtroDia, setFiltroDia] = useState(""); // día (YYYY-MM-DD) elegido en el calendario para filtrar la tabla
  const POR_HOJA = 50;
  const leerFenicio = tienda => e => {
    const file = e && e.target && e.target.files ? e.target.files[0] : null;
    if (!file) return;
    const k = tienda.replace ? tienda.replace(" ", "") : tienda;
    setCargandoFenT(p => ({...p, [k]: true}));
    setArchivosFen(p => ({...p, [k]: file.name}));
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb = XLSX.read(ev.target.result, {type: "binary"});
        const ws = wb.Sheets[wb.SheetNames[0]];
        // Los .xls de Fenicio son HTML; SheetJS deja etiquetas <td> y entidades dentro de cada celda → limpiarlas
        const clean = v => String(v == null ? "" : v).replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#?\w+;/g, "").trim();
        const data = XLSX.utils.sheet_to_json(ws, {header: 1, raw: false, defval: ""}).map(r => (r || []).map(clean));
        let hIdx = -1;
        for (let i = 0; i < Math.min(8, data.length); i++) {
          if ((data[i] || []).some(c => String(c || "").toLowerCase().includes("pedido"))) {
            hIdx = i; break;
          }
        }
        const kk = tienda.replace ? tienda.replace(" ", "") : tienda;
        if (hIdx < 0) {
          alert("⚠ " + tienda + ": este archivo no contiene los datos del reporte de ventas.\n\nVolvé a exportar desde Fenicio el reporte completo (no el “cascarón” de exportación).");
          setRowsFenT(p => ({...p, [kk]: []}));
          setCargandoFenT(p => ({...p, [kk]: false}));
          return;
        }
        const headers = data[hIdx].map(String);
        const rows = data.slice(hIdx + 1).map(r => {
          const o = {};
          headers.forEach((h, i) => o[h] = r[i] || "");
          return o;
        }).filter(r => /^\d+$/.test(String(Object.values(r)[0] || "").trim()));
        if (!rows.length) alert("⚠ " + tienda + ": no se encontraron pedidos en el archivo. Verificá que sea el reporte de ventas correcto.");
        setRowsFenT(p => ({...p, [kk]: rows}));
      } catch (err) {
        alert("Error Fenicio: " + err.message);
      }
      const k3 = tienda.replace ? tienda.replace(" ", "") : tienda;
      setCargandoFenT(p => ({...p, [k3]: false}));
    };
    reader.readAsBinaryString(file);
  };
  const leerWMS = e => {
    const file = e.target.files[0];
    if (!file) return;
    setCargandoB(true);
    setArchivoB(file.name);
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
        const rows = data.slice(1).map(r => {
          const o = {};
          headers.forEach((h, i) => o[h] = r[i] || "");
          return o;
        });
        setRowsB(rows);
      } catch (err) {
        alert("Error WMS: " + err.message);
      }
      setCargandoB(false);
    };
    reader.readAsBinaryString(file);
  };
  // Parser robusto: Fenicio usa ISO (YYYY-MM-DD) y el Monitor DD/MM/YYYY [HH:MM:SS]. "---"/"" → null.
  const parseFecha = s => {
    if (s == null) return null;
    const str = String(s).trim();
    if (!str || str === "---" || str === "-") return null;
    let m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
    m = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
    const d = new Date(str);
    return isNaN(d) ? null : d;
  };
  const diasHab = desde => {
    try {
      const d = parseFecha(desde);
      if (!d) return null;
      const hoy = new Date();
      // Normalizar a medianoche y comparar solo la fecha (evita bucle infinito con fechas futuras/horas)
      let cur = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      if (cur >= fin) return 0; // pedido de hoy o fecha futura → 0 días hábiles transcurridos
      let c = 0;
      while (cur < fin) {
        cur.setDate(cur.getDate() + 1);
        const g = cur.getDay();
        if (g !== 0 && g !== 6) c++;
      }
      return c;
    } catch {
      return null;
    }
  };
  const ENTREGADOS = ["Pedido entregado", "Pedido entregado  a cliente"];
  // Deriva días hábiles y banderas (atrasado/critico/etc.) a partir del snapshot de un pedido.
  // Se usa tanto al cruzar como al recargar el seguimiento persistido, así el conteo de días se mantiene al día.
  const calcDeriv = row => {
    const estadoFen = row.estadoFen || "-";
    const estadoWMS = row.estadoWMS || "-";
    const dias = diasHab(row.fecha);
    const diasDesp = row.fechaDespacho && row.fechaDespacho !== "-" ? diasHab(row.fechaDespacho) : null;
    const fenEntregado = String(estadoFen).toLowerCase().includes("entregado");
    const wmsEntregado = String(estadoWMS).toLowerCase().includes("entregado");
    const entregado = fenEntregado || wmsEntregado;
    const cancelado = String(estadoFen).toLowerCase().includes("cancel") || String(estadoWMS).toLowerCase().includes("cancel");
    const despachadoWMS = String(estadoWMS).toLowerCase().includes("despach");
    const movidoWMS = despachadoWMS || String(estadoWMS).toLowerCase().includes("recib");
    // "Listo para retirar" / "Pedido recibido en tienda": el pedido ya está pronto en el pickup
    // esperando al cliente. No hay nada que accionar → NO es atrasado/crítico/estancado.
    const listoRetiro = /listo.*retir/i.test(estadoFen) || /listo.*retir/i.test(estadoWMS) || /recibid[oa]?\s*(en\s*)?tienda/i.test(estadoWMS);
    const atrasado = !entregado && !cancelado && !listoRetiro && dias != null && dias > filtroDias;
    const critico = !entregado && !cancelado && !listoRetiro && dias != null && dias > 10;
    // "Validar despacho": Monitor dice despachado pero Fenicio no pasó a entregado tras +2 días hábiles
    const posibleNoDespacho = despachadoWMS && !fenEntregado && (diasDesp != null ? diasDesp > 2 : (dias != null && dias > 2));
    const inconsistente = posibleNoDespacho;
    const estancado = !row.sinWMS && !entregado && !cancelado && !listoRetiro && !movidoWMS && dias != null && dias > 2;
    // Forma de entrega: Click & Collect ≠ Pickup ≠ Envío a domicilio
    const fe = String(row.formaEntrega || "").toLowerCase();
    const clickCollect = fe.includes("click") || fe.includes("collect");
    const pickup = !clickCollect && fe.includes("pickup");
    const depo = String(row.deposito || "").replace(/\.0+$/, "").trim();
    // Depo 0 = el WMS no encontró stock → acción manual, PERO solo si el pedido sigue "vivo":
    // si ya se entregó, canceló, despachó, está en tránsito/recibido o es PCN (personalizado), se gestionó.
    const movidoODespachado = movidoWMS || listoRetiro || /despach|tr[aá]nsito|camino|recib/i.test(estadoFen) || /tr[aá]nsito|camino/i.test(estadoWMS);
    const sinStock = depo === "0" && !entregado && !cancelado && !movidoODespachado && !row.pcn;
    const ccDepo9 = clickCollect && depo === "9";  // C&C no debería pedirse a depo 9
    // Tiempo a despacho: días corridos compra → "Fecha despacho" del WMS (dato real; la entrega no se registra)
    let leadtime = null;
    if (row.fechaDespacho && row.fechaDespacho !== "-") { const a = parseFecha(row.fecha), b = parseFecha(row.fechaDespacho); if (a && b && b >= a) leadtime = Math.round((b - a) / 86400000); }
    // Tiempo de entrega: días corridos compra → entrega real (fecha de entrega de Fenicio). Mide la experiencia del cliente.
    let leadtimeEntrega = null;
    if (row.fechaEntrega && String(row.fechaEntrega).trim() && row.fechaEntrega !== "-") { const a = parseFecha(row.fecha), b = parseFecha(row.fechaEntrega); if (a && b && b >= a) leadtimeEntrega = Math.round((b - a) / 86400000); }
    return { ...row, dias, diasDesp, fenEntregado, wmsEntregado, entregado, cancelado, despachadoWMS, atrasado, critico, inconsistente, posibleNoDespacho, estancado, listoRetiro, clickCollect, pickup, sinStock, ccDepo9, leadtime, leadtimeEntrega };
  };
  // Carga el seguimiento ya analizado (con comentarios) al entrar a la pestaña, para que el análisis quede fijo.
  const cargarSeguimiento = useCallback(async () => {
    try {
      // Supabase devuelve hasta 1000 filas por request → paginar para traer TODO el seguimiento
      // (si no, con >1000 pedidos seguidos se cortaba en 1000 y, al ordenar por días, quedaban solo los más viejos).
      const PAG = 1000;
      let data = [], desde = 0;
      for (;;) {
        const { data: page, error } = await supa.from("operativa_seguimiento").select("*").order("dias", { ascending: false }).range(desde, desde + PAG - 1);
        if (error) { setPersistOK(false); return; } // tabla no creada u otro problema de acceso
        if (!page || !page.length) break;
        data = data.concat(page);
        if (page.length < PAG) break;
        desde += PAG;
      }
      setPersistOK(true);
      if (data && data.length) {
        const cm = {};
        const histDe = d => Array.isArray(d.historial) && d.historial.length ? d.historial : (d.comentario ? [{ t: d.comentario, f: d.comentario_fecha || "" }] : []);
        data.forEach(d => { cm[d.pedido] = { historial: histDe(d), accionado: !!d.accionado }; });
        setComentarios(cm);
        // Mostrar el seguimiento ya analizado aunque todavía no se suban archivos en esta sesión
        setResultado(data.map(d => calcDeriv({
          pedido: d.pedido, tienda: d.tienda || "-", fecha: d.fecha || "",
          estadoFen: d.estado_fen || "-", estadoWMS: d.estado_wms || "-", estadoEco: d.estado_eco || "-",
          deposito: d.deposito || "-", fechaDespacho: d.fecha_despacho || "-", importe: d.importe || "-",
          formaEntrega: d.forma_entrega || "", fechaEntrega: d.fecha_entrega || "", sinWMS: !!d.sin_wms,
          historial: histDe(d), accionado: !!d.accionado
        })));
      }
    } catch (_) { setPersistOK(false); }
  }, []);
  useEffect(() => { cargarSeguimiento(); }, [cargarSeguimiento]);
  // Marca accionado (no toca el historial de comentarios).
  const guardarSeguimiento = async (pedido, campos) => {
    setResultado(prev => (prev || []).map(r => r.pedido === pedido ? { ...r, ...campos } : r));
    setComentarios(prev => ({ ...prev, [pedido]: { ...(prev[pedido] || {}), ...campos } }));
    try { await supa.from("operativa_seguimiento").upsert({ pedido, ...campos }, { onConflict: "pedido" }); } catch (_) {}
  };
  // Agrega una nota al historial del pedido (bitácora con fecha; no se pisan las anteriores).
  const agregarComentario = async (pedido, texto) => {
    const t = String(texto || "").trim();
    if (!t) return;
    const entry = { t, f: new Date().toISOString(), a: (yo && yo.nombre) || "" };
    // nuevo se calcula de forma síncrona (no dentro del updater de setState) para que el upsert
    // persista el historial completo y no un array vacío por el batching de React.
    const nuevo = [...((comentarios[pedido] && comentarios[pedido].historial) || []), entry];
    setComentarios(prev => ({ ...prev, [pedido]: { ...(prev[pedido] || {}), historial: [...((prev[pedido] && prev[pedido].historial) || []), entry] } }));
    setResultado(prev => (prev || []).map(r => r.pedido === pedido ? { ...r, historial: [...(r.historial || []), entry] } : r));
    try { await supa.from("operativa_seguimiento").upsert({ pedido, historial: nuevo, comentario: t, comentario_fecha: entry.f }, { onConflict: "pedido" }); } catch (_) {}
  };
  const cruzar = () => {
    if (!rowsA.length || !rowsB.length) {
      alert("Carga los dos archivos primero.");
      return;
    }
    // Detección robusta de columnas (mismos patrones que la sección Análisis):
    // los headers de Fenicio/Encuentra varían levemente entre exportaciones.
    const findCol = (sample, patterns) => Object.keys(sample || {}).find(k => patterns.some(p => p.test(k))) || "";
    const sF = rowsA[0] || {};
    const colNro = findCol(sF, [/nro\.?\s*ped/i, /ped.*nro/i, /n[uú]mero.*ped/i, /^pedido$/i]) || "Nro. pedido";
    const colFechF = findCol(sF, [/fecha.*comien/i, /comienzo/i, /fecha.*pago/i, /^fecha/i]) || "Fecha comienzo";
    const colEstF = findCol(sF, [/estado.*entr/i, /entr.*estado/i]) || "Estado entrega";
    // Fecha de entrega REAL = la de Fenicio (estado "Pedido entregado"), no la del WMS (expedición manual, poco confiable)
    // Se prueban varios nombres habituales de la columna de fecha de entrega de Fenicio.
    const colFechEntFen = findCol(sF, [/fecha.*entreg/i, /entreg.*fecha/i, /fecha.*recib/i, /recib.*fecha/i, /fecha.*finaliz/i, /finaliz.*fecha/i, /fecha.*complet/i]) || "";
    const colImp = findCol(sF, [/importe.*total.*pedido/i, /importe.*pedido/i]) || findCol(sF, [/importe/i]) || "Importe total pedido";
    const sW = rowsB[0] || {};
    const colVenta = findCol(sW, [/^venta$/i, /venta/i]) || "Venta";
    const colEstEnc = findCol(sW, [/estado.*encuentra/i]) || "Estado Encuentra";
    const colEstEco = findCol(sW, [/estado.*ecom/i]) || "Estado ecommerce";
    const colCanal = findCol(sW, [/canal/i, /tienda/i]) || "Canal";
    const colDep = findCol(sW, [/dep[oó]sito/i]) || "Deposito pedido";
    const colFechDesp = findCol(sW, [/fecha.*despach/i, /despach/i]) || "Fecha despacho";
    // Forma de entrega (Click & Collect / Pickup / Envío a domicilio) y fecha de entrega real (para lead time)
    const colForma = findCol(sW, [/forma.*entr/i, /m[eé]todo.*entr/i, /tipo.*entr/i, /modalidad/i]) || "Forma entrega";
    const colFechEntrega = findCol(sW, [/fecha.*entrega.*real/i, /fecha.*entrega/i]) || "Fecha entrega real";
    setCcCol(colForma || "");
    // PCN (prendas personalizadas): se detectan por el artículo del WMS con prefijo "PCN".
    // No se cuentan como Depo 0 (su falta de stock es normal, se hacen a pedido).
    const colArt = findCol(sW, [/art[ií]culo/i, /^sku$/i, /c[oó]d.*art/i]) || "Articulo";
    const pcnVentas = new Set();
    rowsB.forEach(r => { if (String(r[colArt] || "").toUpperCase().startsWith("PCN")) { const k = String(r[colVenta] || "").trim(); if (k) pcnVentas.add(k); } });

    const wmsF = filtroTienda === "todas" ? rowsB : rowsB.filter(r => String(r[colCanal] || "").toLowerCase().includes(filtroTienda.toLowerCase()));
    const wmsMap = {};
    const ORDEN_EST = ["Items Pedidos", "Items Confirmados", "Items Clasificados  (Orden Liberada)", "Pedido en  envio pronto para despacho", "Pedido Despachado", "Pedido recibido  en tienda", "Pedido entregado  a cliente", "Cancelado"];
    wmsF.forEach(r => {
      const k = String(r[colVenta] || "").trim();
      if (!k) return;
      if (!wmsMap[k]) wmsMap[k] = r;else {
        const ni = ORDEN_EST.findIndex(s => r[colEstEnc] === s);
        const ai = ORDEN_EST.findIndex(s => wmsMap[k][colEstEnc] === s);
        if (ni > ai) wmsMap[k] = r;
      }
    });
    const res = [];
    const vistosPed = {};
    rowsA.forEach(r => {
      const pedido = String(r[colNro] || "").trim();
      if (!pedido) return;
      if (vistosPed[pedido]) return; // un pedido puede venir en varias filas de Fenicio → evitar duplicados
      vistosPed[pedido] = 1;
      const fecha = r[colFechF] || "";
      const estadoFen = r[colEstF] || "-";
      const importe = r[colImp] || "-";
      const wms = wmsMap[pedido];
      const estadoWMS = wms ? wms[colEstEnc] || "-" : "No encontrado en WMS";
      const estadoEco = wms ? wms[colEstEco] || "-" : "-";
      const deposito = wms ? String(wms[colDep] || "-").replace(/\.0+$/, "").trim() : "-";
      const fechaDespacho = wms ? wms[colFechDesp] || "-" : "-";
      const formaEntrega = wms ? String(wms[colForma] || "") : "";
      // Fecha de entrega real desde Fenicio (no del WMS). Vacío si Fenicio no la trae.
      const fechaEntrega = colFechEntFen ? String(r[colFechEntFen] || "") : "";
      if (filtroFecha.desde && fecha && fecha < filtroFecha.desde) return;
      if (filtroFecha.hasta && fecha && fecha > filtroFecha.hasta) return;
      res.push(calcDeriv({
        pedido,
        tienda: r._tiendaFen || "-",
        fecha: String(fecha).slice(0, 16).replace("T", " "),
        estadoFen,
        estadoWMS,
        estadoEco,
        deposito,
        fechaDespacho,
        formaEntrega,
        fechaEntrega,
        importe,
        pcn: pcnVentas.has(pedido),
        sinWMS: !wms
      }));
    });
    // Diagnóstico de la fecha de entrega: cuántos pedidos quedaron con tiempo de entrega calculado
    // y qué columnas trae Fenicio (para identificar la correcta si no se detectó).
    setEntregaDiag({ col: colFechEntFen, cols: Object.keys(sF), conEntrega: res.filter(r => r.leadtimeEntrega != null).length, total: res.length });
    const matchCount = res.filter(r => !r.sinWMS).length;
    if (res.length === 0) {
      alert("No se pudo leer el N° de pedido del reporte de Fenicio.\n\nColumna buscada: \"" + colNro + "\".\nColumnas encontradas: " + Object.keys(sF).join(", "));
    } else if (matchCount === 0) {
      alert("Se leyeron " + res.length + " pedidos de Fenicio pero ninguno coincidió con la columna \"" + colVenta + "\" del Monitor de Encuentra.\n\nVerificá que el N° de pedido de Fenicio corresponda a la columna Venta del Monitor.");
    }
    // ── Enriquecer cada pedido con su comentario/accionado persistido (no se pierden al recruzar) ──
    const relevante = r => r.atrasado || r.critico || r.posibleNoDespacho || r.estancado || r.inconsistente;
    const merged = res.map(r => {
      const c = comentarios[r.pedido] || {};
      return { ...r, historial: c.historial || [], accionado: !!c.accionado };
    });
    // Conservar los pedidos YA SEGUIDOS (con comentario o marcados como accionado) que NO vinieron en
    // los archivos nuevos, para no perder su seguimiento al recruzar. Se re-derivan para refrescar días.
    const enCruce = new Set(merged.map(r => r.pedido));
    setResultado(prevRes => {
      const retenidos = (prevRes || [])
        .filter(p => !enCruce.has(p.pedido) && ((p.historial && p.historial.length) || p.accionado))
        .map(p => ({ ...calcDeriv(p), retenido: true }));
      return merged.concat(retenidos).sort((a, b) => (b.dias || 0) - (a.dias || 0));
    });
    setVistaTab("atrasados");
    setPage(0);
    // Persistir SOLO los pedidos accionables (snapshot); no pisa comentario/accionado existentes
    const aSeguir = merged.filter(relevante);
    (async () => {
      try {
        const payload = aSeguir.map(r => ({
          pedido: r.pedido, tienda: r.tienda, fecha: r.fecha,
          estado_fen: r.estadoFen, estado_wms: r.estadoWMS, estado_eco: r.estadoEco,
          deposito: r.deposito, fecha_despacho: r.fechaDespacho, importe: String(r.importe),
          forma_entrega: r.formaEntrega || "", fecha_entrega: r.fechaEntrega || "",
          dias: r.dias, click_collect: !!r.clickCollect, sin_wms: !!r.sinWMS
        }));
        for (let i = 0; i < payload.length; i += 200) {
          await supa.from("operativa_seguimiento").upsert(payload.slice(i, i + 200), { onConflict: "pedido" });
        }
      } catch (_) {}
    })();
    // Actualizar KPIs globales automáticamente
    const atrasadosCount = res.filter(r => r.atrasado).length;
    const depo0Count = wmsF.filter(r => r[colEstEnc] === "Items Pedidos").length;
    (async () => {
      try {
        const {
          data: kpisG
        } = await supa.from("kpis_globales").select("id,nombre");
        for (const k of kpisG || []) {
          const n = k.nombre.toLowerCase();
          if (n.includes("atrasad")) await supa.from("kpis_globales").update({
            valor: String(atrasadosCount)
          }).eq("id", k.id);
          if (n.includes("depo") || n.includes("stock")) await supa.from("kpis_globales").update({
            valor: String(depo0Count)
          }).eq("id", k.id);
        }
      } catch (_) {}
    })();
  };
  const atrasados = resultado ? resultado.filter(r => r.atrasado) : [];
  const criticos = resultado ? resultado.filter(r => r.critico) : [];
  const inconsistentes = resultado ? resultado.filter(r => r.inconsistente) : [];
  const noDespacho = resultado ? resultado.filter(r => r.posibleNoDespacho) : [];
  const estancados = resultado ? resultado.filter(r => r.estancado) : [];
  const sinWMS = resultado ? resultado.filter(r => r.sinWMS) : [];
  const sinStockArr = resultado ? resultado.filter(r => r.sinStock) : [];
  const ccDepo9Arr = resultado ? resultado.filter(r => r.ccDepo9) : [];
  const entregadosArr = resultado ? resultado.filter(r => r.entregado) : [];
  const tasaCumpl = resultado && resultado.length ? Math.round(entregadosArr.length / resultado.length * 100) : 0;
  // KPIs operativos por PERCENTIL (no promedio): el P90 refleja la experiencia de la gran mayoría
  // de los pedidos y no se distorsiona con outliers, a diferencia del promedio.
  const percentil = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); const idx = Math.max(0, Math.min(s.length - 1, Math.ceil(p / 100 * s.length) - 1)); return s[idx]; };
  const PCTL = 90;
  const leadtimes = resultado ? resultado.filter(r => r.leadtime != null).map(r => r.leadtime) : [];
  const leadtimeProm = percentil(leadtimes, PCTL);
  const leadtimesEnt = resultado ? resultado.filter(r => r.leadtimeEntrega != null).map(r => r.leadtimeEntrega) : [];
  const leadtimeEntProm = percentil(leadtimesEnt, PCTL);
  // % de cumplimiento de entrega por día de compra (para el calendario)
  const calData = useMemo(() => {
    if (!resultado) return [];
    const m = {};
    resultado.forEach(r => {
      const d = parseFecha(r.fecha);
      if (!d) return;
      const dia = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      if (!m[dia]) m[dia] = { dia, total: 0, entregados: 0 };
      m[dia].total++; if (r.entregado) m[dia].entregados++;
    });
    return Object.values(m).map(x => ({ ...x, pct: x.total ? Math.round(x.entregados / x.total * 100) : 0 })).sort((a, b) => a.dia.localeCompare(b.dia));
  }, [resultado]);
  const mesesCal = Array.from(new Set(calData.map(d => d.dia.slice(0, 7)))).sort();
  const calSelMes = mesesCal.includes(calMes) ? calMes : (mesesCal[mesesCal.length - 1] || "");
  const calDias = calData.filter(d => d.dia.slice(0, 7) === calSelMes);
  const fmtMesYM = ym => { if (!ym) return ""; const p = ym.split("-"); return ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][+p[1] - 1] + " " + p[0]; };
  // Exportar a Excel (disponible en cualquier vista)
  const exportarOper = (rows, nombre) => {
    if (!rows || !rows.length) { alert("No hay datos para exportar en esta vista."); return; }
    try {
      const limpias = rows.map(r => ({
        "Nro. pedido": r.pedido, "Tienda": r.tienda, "Fecha compra": r.fecha,
        "Estado Fenicio": r.estadoFen, "Estado WMS": r.estadoWMS, "Estado Eco": r.estadoEco,
        "Dias habiles": r.dias, "Deposito": r.deposito, "Fecha despacho": r.fechaDespacho,
        "Forma entrega": r.formaEntrega || (r.clickCollect ? "Click & Collect" : r.pickup ? "Pickup" : ""),
        "Tiempo a despacho (dias)": r.leadtime != null ? r.leadtime : "",
        "Tiempo de entrega (dias)": r.leadtimeEntrega != null ? r.leadtimeEntrega : "",
        "Fecha entrega": r.fechaEntrega || "",
        "Importe": r.importe,
        "Atrasado": r.atrasado ? "Si" : "", "Critico": r.critico ? "Si" : "",
        "Validar despacho": r.posibleNoDespacho ? "Si" : "", "Estancado": r.estancado ? "Si" : "",
        "Depo 0": r.sinStock ? "Si" : "", "C&C a depo 9": r.ccDepo9 ? "Si" : "", "Entregado": r.entregado ? "Si" : "",
        "Accionado": r.accionado ? "Si" : "",
        "Comentarios (historial)": (r.historial || []).map(h => (h.f ? new Date(h.f).toLocaleString("es-UY") + ": " : "") + h.t).join(" | ")
      }));
      const ws = XLSX.utils.json_to_sheet(limpias);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Operativa");
      XLSX.writeFile(wb, nombre + "-" + new Date().toISOString().slice(0, 10) + ".xlsx");
    } catch (e) { alert("Error al exportar: " + e.message); }
  };
  // Alerta por mail (mailto pre-armado) para empujar a una tienda
  // Mails por DEPÓSITO (no por tienda): así la alerta llega a quién tiene que accionar el pedido.
  const MAILS_DEPO = {};
  const alertarTienda = (rows, etiqueta) => {
    if (!rows || !rows.length) { alert("No hay pedidos para alertar en esta vista."); return; }
    const porDepo = {};
    rows.forEach(r => { const d = String(r.deposito || "").trim() || "(sin depósito)"; (porDepo[d] = porDepo[d] || []).push(r); });
    // Ordenar depósitos por cantidad de pedidos (los más cargados primero)
    const depos = Object.keys(porDepo).sort((a, b) => porDepo[b].length - porDepo[a].length);
    const dest = depos.map(d => MAILS_DEPO[d]).filter(Boolean).join(",");
    const asunto = "[Gestor] " + etiqueta + " — " + rows.length + " pedido(s) requieren acción";
    let cuerpo = "Hola,\n\nDetectamos los siguientes pedidos que necesitan acción (" + etiqueta + "), organizados por DEPÓSITO:\n\n";
    depos.forEach(d => {
      cuerpo += "■ Depósito " + d + " (" + porDepo[d].length + " pedido(s)):\n";
      porDepo[d].slice(0, 80).forEach(r => {
        cuerpo += "   • Pedido " + r.pedido + " | Tienda: " + (r.tienda || "—") + " | Fenicio: " + r.estadoFen + " | WMS: " + r.estadoWMS + " | " + (r.dias != null ? r.dias + " días háb." : "") + "\n";
      });
      cuerpo += "\n";
    });
    cuerpo += "Por favor procesar/confirmar/despachar cuanto antes.\n\nGracias.";
    window.location.href = "mailto:" + encodeURIComponent(dest) + "?subject=" + encodeURIComponent(asunto) + "&body=" + encodeURIComponent(cuerpo);
  };
  // Opciones de filtros (estados de Fenicio y depósitos presentes en el análisis)
  const estadosFenOpts = resultado ? Array.from(new Set(resultado.map(r => r.estadoFen).filter(Boolean))).sort() : [];
  const depositosOpts = resultado ? Array.from(new Set(resultado.map(r => r.deposito).filter(d => d && d !== "-"))).sort() : [];
  const vistaBase = vistaTab === "criticos" ? criticos : vistaTab === "nodespacho" ? noDespacho : vistaTab === "estancados" ? estancados : vistaTab === "depo0" ? sinStockArr : vistaTab === "sinwms" ? sinWMS : vistaTab === "todos" ? (resultado || []) : atrasados;
  const buscarT = buscar.trim().toLowerCase();
  const diaISO = f => { const d = parseFecha(f); return d ? d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") : ""; };
  const vistaRows = vistaBase.filter(r =>
    (soloCC === "cc" ? r.clickCollect : soloCC === "pickup" ? r.pickup : soloCC === "domicilio" ? (!r.clickCollect && !r.pickup) : true) &&
    (!filtroDia || diaISO(r.fecha) === filtroDia) &&
    (!filtroEstadoFen || r.estadoFen === filtroEstadoFen) &&
    (!filtroDeposito || r.deposito === filtroDeposito) &&
    (!filtroDiasMin || (r.dias != null && r.dias >= Number(filtroDiasMin))) &&
    (!buscarT || String(r.pedido).toLowerCase().includes(buscarT) || String(r.deposito).toLowerCase().includes(buscarT) || String(r.estadoFen).toLowerCase().includes(buscarT) || String(r.estadoWMS).toLowerCase().includes(buscarT))
  );
  const totalPaginas = Math.max(1, Math.ceil(vistaRows.length / POR_HOJA));
  const pageSafe = Math.min(page, totalPaginas - 1);
  const pageRows = vistaRows.slice(pageSafe * POR_HOJA, pageSafe * POR_HOJA + POR_HOJA);
  const Vacio = ({ msg }) => /*#__PURE__*/React.createElement("div", { className: "bg-white rounded-2xl border p-6 text-sm text-center", style: { borderColor: C.line, color: C.green } }, msg);
  // KPI clickable: actúa como botón que filtra la vista por categoría
  const KpiBtn = ({ label, value, color, sub, tab, border }) => /*#__PURE__*/React.createElement("button", {
    onClick: tab ? () => { setVistaTab(tab); setPage(0); } : undefined,
    className: "bg-white rounded-xl border px-3 py-2 text-left " + (tab ? "cursor-pointer hover:shadow-md transition-shadow" : "cursor-default"),
    style: { borderColor: tab && vistaTab === tab ? color : (border || C.line), borderWidth: tab && vistaTab === tab ? 2 : 1 }
  }, /*#__PURE__*/React.createElement("div", { className: "text-[10px] font-bold uppercase", style: { color: C.gray, lineHeight: 1.2 } }, label),
     /*#__PURE__*/React.createElement("div", { className: "text-2xl font-black fraunces", style: { color, lineHeight: 1.1 } }, value),
     sub && /*#__PURE__*/React.createElement("div", { className: "text-[10px]", style: { color: C.gray, lineHeight: 1.1 } }, sub));
  // Tarjeta de ACCIÓN: grande y prominente. Clickable → filtra la vista. Resalta la vista activa.
  const AccionCard = ({ label, value, color, tab, sub }) => /*#__PURE__*/React.createElement("button", {
    onClick: () => { setVistaTab(tab); setPage(0); },
    className: "rounded-2xl border-2 px-4 py-3 text-left transition-all",
    style: { borderColor: vistaTab === tab ? color : C.line, background: vistaTab === tab ? color : "#fff" }
  }, /*#__PURE__*/React.createElement("div", { className: "text-3xl sm:text-4xl font-black fraunces tabular-nums", style: { color: vistaTab === tab ? "#fff" : color, lineHeight: 1 } }, value),
     /*#__PURE__*/React.createElement("div", { className: "text-[11px] font-bold uppercase mt-1", style: { color: vistaTab === tab ? "rgba(255,255,255,0.92)" : C.ink, lineHeight: 1.15 } }, label),
     sub && /*#__PURE__*/React.createElement("div", { className: "text-[10px] mt-0.5", style: { color: vistaTab === tab ? "rgba(255,255,255,0.8)" : C.gray, lineHeight: 1.15 } }, sub));
  // Métrica compacta (informativa). Clickable solo si tiene tab.
  const MetricCard = ({ label, value, color, tab, sub }) => /*#__PURE__*/React.createElement(tab ? "button" : "div", {
    onClick: tab ? () => { setVistaTab(tab); setPage(0); } : undefined,
    className: "bg-white rounded-xl border px-3 py-2 text-left " + (tab ? "cursor-pointer hover:shadow-md transition-shadow" : ""),
    style: { borderColor: tab && vistaTab === tab ? color : C.line, borderWidth: tab && vistaTab === tab ? 2 : 1 }
  }, /*#__PURE__*/React.createElement("div", { className: "text-[10px] font-bold uppercase", style: { color: C.gray, lineHeight: 1.2 } }, label),
     /*#__PURE__*/React.createElement("div", { className: "text-xl font-black fraunces tabular-nums", style: { color, lineHeight: 1.1 } }, value),
     sub && /*#__PURE__*/React.createElement("div", { className: "text-[10px]", style: { color: C.gray, lineHeight: 1.1 } }, sub));
  const TabBtn = ({
    id,
    label,
    count,
    color
  }) => /*#__PURE__*/React.createElement("button", {
    onClick: () => { setVistaTab(id); setPage(0); },
    className: "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors",
    style: {
      background: vistaTab === id ? color : "#EEF1F5",
      color: vistaTab === id ? "#fff" : C.gray
    }
  }, label, /*#__PURE__*/React.createElement("span", {
    className: "ml-1 px-1.5 py-px rounded-full",
    style: {
      background: "rgba(255,255,255,0.25)",
      fontSize: 10
    }
  }, count));
  const Tabla = ({ rows }) => /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border overflow-hidden", style: { borderColor: C.line }
  }, /*#__PURE__*/React.createElement("div", { className: "overflow-auto", style: { maxHeight: "72vh" } }, /*#__PURE__*/React.createElement("table", {
    className: "w-full min-w-[1080px] sheet", style: { fontSize: 12 }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null,
    ["Pedido", "Tienda", "Fecha compra", "Estado Fenicio", "Estado WMS", "Dias hab.", "Deposito", "C&C", "Acc.", "Acción / comentarios"].map(h => /*#__PURE__*/React.createElement("th", {
      key: h, className: "px-3 py-2 text-left font-bold uppercase", style: { color: C.gray, fontSize: 10, whiteSpace: "nowrap" }
    }, h)))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: r.pedido || i,
    style: { borderTop: "1px solid " + C.line, background: r.accionado ? "#F0FDF4" : r.atrasado ? "#FFF5F5" : r.inconsistente ? "#FFFBEB" : "#fff" }
  }, /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 font-bold tabular-nums" }, r.pedido, r.retenido && /*#__PURE__*/React.createElement("span", { className: "ml-1.5 align-middle text-[9px] font-bold px-1.5 py-px rounded-full", style: { background: "#EEF1F5", color: C.gray }, title: "Seguimiento de una carga anterior — no vino en los archivos actuales" }, "previo")),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 text-xs font-semibold", style: { color: C.gray } }, r.tienda),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2", style: { color: C.gray, whiteSpace: "nowrap" } }, r.fecha),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2" }, /*#__PURE__*/React.createElement("span", { style: { background: r.entregado ? C.greenS : C.soft, color: r.entregado ? C.green : C.blue, padding: "2px 6px", borderRadius: 6, fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" } }, r.estadoFen)),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2" }, /*#__PURE__*/React.createElement("span", { style: { background: r.sinWMS ? C.amberS : r.inconsistente ? C.amberS : "#F1F4F8", color: r.sinWMS ? C.amber : r.inconsistente ? C.amber : C.gray, padding: "2px 6px", borderRadius: 6, fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" } }, r.estadoWMS)),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2" }, /*#__PURE__*/React.createElement("span", { style: { fontWeight: 700, color: r.atrasado ? C.red : r.dias > 1 ? C.amber : C.gray } }, r.dias != null ? r.dias : "—"), r.atrasado && /*#__PURE__*/React.createElement("span", { style: { color: C.red } }, " ⚠")),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2", style: { color: C.gray, fontSize: 11, maxWidth: 150, whiteSpace: "normal", wordBreak: "break-word" } }, r.deposito),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2" }, r.clickCollect ? /*#__PURE__*/React.createElement("span", { style: { background: "#EDE9FE", color: "#6D28D9", padding: "2px 6px", borderRadius: 6, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" } }, "C&C") : r.pickup ? /*#__PURE__*/React.createElement("span", { style: { background: "#DBEAFE", color: "#1D4ED8", padding: "2px 6px", borderRadius: 6, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" } }, "Pickup") : ""),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 text-center" }, /*#__PURE__*/React.createElement("input", { type: "checkbox", checked: !!r.accionado, onChange: e => guardarSeguimiento(r.pedido, { accionado: e.target.checked }), title: "Marcar como accionado" })),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2", style: { minWidth: 340, width: 360 } }, (r.historial && r.historial.length) ? /*#__PURE__*/React.createElement("div", { style: { maxHeight: 160, overflowY: "auto", marginBottom: 6 } }, r.historial.slice().reverse().map((h, j) => /*#__PURE__*/React.createElement("div", { key: j, className: "mb-1.5 pl-2", style: { borderLeft: "2px solid " + C.line } }, /*#__PURE__*/React.createElement("div", { className: "text-[10px] font-semibold", style: { color: C.gray } }, (h.f ? new Date(h.f).toLocaleDateString("es-UY") + " " + new Date(h.f).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" }) : "") + (h.a ? " · " + h.a : "")), /*#__PURE__*/React.createElement("div", { className: "text-[12px] leading-snug", style: { color: C.ink, whiteSpace: "pre-wrap", wordBreak: "break-word" } }, h.t)))) : null, /*#__PURE__*/React.createElement("input", { type: "text", placeholder: "Anotá qué se hizo y enter…", onKeyDown: e => { if (e.key === "Enter") { agregarComentario(r.pedido, e.target.value); e.target.value = ""; } }, onBlur: e => { agregarComentario(r.pedido, e.target.value); e.target.value = ""; }, className: "px-2 py-1.5 rounded-lg border text-xs", style: { borderColor: C.line, width: "100%" } }))))))));
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement(Title, {
    eyebrow: "Operativa",
    title: "Cruce Fenicio × Encuentra"
  }), /*#__PURE__*/React.createElement(Collapse, {
    key: resultado ? "cargado" : "vacio",
    title: "Cargar archivos y cruzar",
    subtitle: rowsA.length || rowsB.length ? (rowsA.length + " pedidos Fenicio · " + rowsB.length + " filas WMS") : "Subí Fenicio (.xls por tienda) y el Monitor de Encuentra (.xlsx)",
    defaultOpen: !resultado,
    badge: resultado ? /*#__PURE__*/React.createElement(Chip, { color: C.green, soft: C.greenS }, "✓ Cruzado") : null
  }, /*#__PURE__*/React.createElement("div", { className: "space-y-3" }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs",
    style: {
      color: C.gray
    }
  }, "Subi el reporte de ventas de Fenicio (.xls) y el Monitor de Encuentra (.xlsx). Las columnas estan pre-configuradas con tus archivos — solo subis y apretAs Cruzar."), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm font-bold",
    style: {
      color: C.ink
    }
  }, "Fenicio — Reportes de ventas ", /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-normal",
    style: {
      color: C.gray
    }
  }, "(uno por tienda, se concatenan)")), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-3 gap-3"
  }, TIENDAS_FEN.map(t => /*#__PURE__*/React.createElement("div", {
    key: t.k,
    className: "bg-white rounded-2xl border p-3 space-y-2",
    style: {
      borderColor: C.line
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold"
  }, t.l), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 p-2.5 rounded-xl border-2 border-dashed cursor-pointer",
    style: {
      borderColor: archivosFen[t.k] ? "#86EFAC" : C.line,
      background: archivosFen[t.k] ? C.greenS : "transparent"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: archivosFen[t.k] ? C.green : C.blue,
      display: "inline-flex"
    }
  }, archivosFen[t.k] ? Ic.ok : Ic.upload), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold truncate",
    style: {
      color: archivosFen[t.k] ? C.green : C.gray
    }
  }, cargandoFenT[t.k] ? "Leyendo..." : archivosFen[t.k] || "Subí el .xls"), /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".xlsx,.xls,.csv",
    className: "hidden",
    onChange: leerFenicio(t.k)
  })), rowsFenT[t.k] && rowsFenT[t.k].length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] font-semibold",
    style: {
      color: C.gray
    }
  }, rowsFenT[t.k].length, " pedidos")))), rowsA.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold px-1",
    style: {
      color: C.green
    }
  }, "Total: ", rowsA.length, " pedidos cargados")), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-1 gap-4"
  }, [{
    titulo: "Encuentra",
    sub: "Monitor Ecommerce (.xlsx)",
    leer: leerWMS,
    arch: archivoB,
    carg: cargandoB,
    filas: rowsB.length,
    cols: ["Venta", "Estado Encuentra", "Canal"]
  }].map(s => /*#__PURE__*/React.createElement("div", {
    key: s.titulo,
    className: "bg-white rounded-2xl border p-4 space-y-3",
    style: {
      borderColor: C.line
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-sm"
  }, s.titulo), /*#__PURE__*/React.createElement("div", {
    className: "text-xs",
    style: {
      color: C.gray
    }
  }, s.sub)), s.arch && /*#__PURE__*/React.createElement(Chip, {
    color: C.green,
    soft: C.greenS
  }, s.filas, " filas")), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 p-3 rounded-xl border-2 border-dashed cursor-pointer",
    style: {
      borderColor: s.arch ? "#86EFAC" : C.line,
      background: s.arch ? C.greenS : "transparent"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: s.arch ? C.green : C.blue,
      display: "inline-flex"
    }
  }, s.arch ? Ic.ok : Ic.upload), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-semibold",
    style: {
      color: s.arch ? C.green : C.gray
    }
  }, s.carg ? "Leyendo..." : s.arch || "Subi el archivo"), /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".xlsx,.xls,.csv",
    className: "hidden",
    onChange: s.leer
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-xs",
    style: {
      color: C.gray
    }
  }, "Columnas: ", s.cols.map(c => /*#__PURE__*/React.createElement("span", {
    key: c,
    className: "inline-block mr-1 px-1.5 py-px rounded-md",
    style: {
      background: "#F1F4F8"
    }
  }, c)))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border p-4",
    style: {
      borderColor: C.line
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm font-bold mb-3"
  }, "Parametros"), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-4 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold uppercase block mb-1",
    style: {
      color: C.gray
    }
  }, "Tienda"), /*#__PURE__*/React.createElement(Sel, {
    value: filtroTienda,
    onChange: e => setFiltroTienda(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "todas"
  }, "Todas"), /*#__PURE__*/React.createElement("option", {
    value: "Timeout"
  }, "TimeOut"), /*#__PURE__*/React.createElement("option", {
    value: "Tienda Nacional"
  }, "Tienda Nacional"), /*#__PURE__*/React.createElement("option", {
    value: "Classico"
  }, "Classico"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold uppercase block mb-1",
    style: {
      color: C.gray
    }
  }, "Dias habiles alerta"), /*#__PURE__*/React.createElement(Inp, {
    type: "number",
    value: filtroDias,
    min: "1",
    onChange: e => setFiltroDias(Number(e.target.value))
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold uppercase block mb-1",
    style: {
      color: C.gray
    }
  }, "Fecha desde"), /*#__PURE__*/React.createElement(Inp, {
    type: "date",
    value: filtroFecha.desde,
    onChange: e => setFiltroFecha({
      ...filtroFecha,
      desde: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold uppercase block mb-1",
    style: {
      color: C.gray
    }
  }, "Fecha hasta"), /*#__PURE__*/React.createElement(Inp, {
    type: "date",
    value: filtroFecha.hasta,
    onChange: e => setFiltroFecha({
      ...filtroFecha,
      hasta: e.target.value
    })
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: cruzar,
    disabled: !rowsA.length || !rowsB.length,
    className: "mt-4 text-sm font-bold text-white px-5 py-2.5 rounded-xl disabled:opacity-40",
    style: {
      background: C.blue
    }
  }, !rowsA.length || !rowsB.length ? "Carga los dos archivos primero" : "Cruzar archivos")))), resultado && /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, calData.length > 0 && /*#__PURE__*/React.createElement("div", { className: "bg-white rounded-2xl border p-3", style: { borderColor: C.line } },
    /*#__PURE__*/React.createElement("div", { className: "flex items-center justify-between flex-wrap gap-2 mb-2" },
      /*#__PURE__*/React.createElement("div", null,
        /*#__PURE__*/React.createElement("span", { className: "text-sm font-bold" }, "Filtrar por fecha"),
        /*#__PURE__*/React.createElement("span", { className: "text-[11px] ml-2", style: { color: C.gray } }, "Tocá un día para ver sus pedidos · color = % entregado")),
      /*#__PURE__*/React.createElement("div", { className: "flex items-center gap-2" },
        filtroDia && /*#__PURE__*/React.createElement("button", { onClick: () => { setFiltroDia(""); setPage(0); }, className: "text-xs font-bold px-3 py-1.5 rounded-lg", style: { background: C.soft, color: C.blue } }, "✕ Ver todos los días"),
        /*#__PURE__*/React.createElement("select", { value: calSelMes, onChange: e => setCalMes(e.target.value), className: "px-2 py-1.5 rounded-lg border text-xs font-bold bg-white", style: { borderColor: C.line, color: C.ink } }, mesesCal.map(m => /*#__PURE__*/React.createElement("option", { key: m, value: m }, fmtMesYM(m)))))),
    /*#__PURE__*/React.createElement("div", { className: "flex flex-wrap gap-1.5" }, calDias.map(d => {
      const col = d.pct >= 90 ? C.green : d.pct >= 70 ? C.amber : C.red;
      const bg = d.pct >= 90 ? C.greenS : d.pct >= 70 ? C.amberS : C.redS;
      const sel = filtroDia === d.dia;
      return /*#__PURE__*/React.createElement("button", { key: d.dia, onClick: () => { setFiltroDia(sel ? "" : d.dia); setPage(0); }, title: d.dia + " — " + d.entregados + "/" + d.total + " entregados", className: "rounded-lg px-2 py-1 text-center transition-all", style: { background: sel ? col : bg, minWidth: 50, border: sel ? "2px solid " + col : "2px solid transparent" } },
        /*#__PURE__*/React.createElement("div", { className: "text-[10px] font-bold", style: { color: sel ? "#fff" : C.gray } }, d.dia.slice(8, 10) + "/" + d.dia.slice(5, 7)),
        /*#__PURE__*/React.createElement("div", { className: "text-sm font-black fraunces", style: { color: sel ? "#fff" : col } }, d.pct + "%"));
    })),
    filtroDia && /*#__PURE__*/React.createElement("div", { className: "text-[11px] mt-2 font-semibold", style: { color: C.blue } }, "Mostrando pedidos del " + filtroDia.slice(8, 10) + "/" + filtroDia.slice(5, 7) + "/" + filtroDia.slice(0, 4))),
  /*#__PURE__*/React.createElement("div", { className: "text-[11px] font-bold uppercase tracking-widest", style: { color: C.blue } }, "Acción rápida"),
  /*#__PURE__*/React.createElement("div", { className: "grid grid-cols-2 lg:grid-cols-5 gap-2" },
    /*#__PURE__*/React.createElement(AccionCard, { label: "Atrasados +" + filtroDias + "d", value: atrasados.length, color: C.red, tab: "atrasados", sub: "Sin entregar a tiempo" }),
    /*#__PURE__*/React.createElement(AccionCard, { label: "Críticos +10d", value: criticos.length, color: "#B91C1C", tab: "criticos", sub: "Muy atrasados" }),
    /*#__PURE__*/React.createElement(AccionCard, { label: "Validar despacho", value: noDespacho.length, color: "#B45309", tab: "nodespacho", sub: "Despachado WMS, sin entregar" }),
    /*#__PURE__*/React.createElement(AccionCard, { label: "Estancados", value: estancados.length, color: C.amber, tab: "estancados", sub: "Sin avanzar +2d" }),
    /*#__PURE__*/React.createElement(AccionCard, { label: "Depo 0", value: sinStockArr.length, color: "#7C3AED", tab: "depo0", sub: "Sin stock — acción manual" })),
  /*#__PURE__*/React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2" },
    /*#__PURE__*/React.createElement(MetricCard, { label: "Total pedidos", value: resultado.length, color: C.blue, tab: "todos" }),
    /*#__PURE__*/React.createElement(MetricCard, { label: "Entregados", value: entregadosArr.length, color: C.green, sub: tasaCumpl + "% cumplimiento" }),
    /*#__PURE__*/React.createElement(MetricCard, { label: "Tasa cumplimiento", value: tasaCumpl + "%", color: tasaCumpl >= 90 ? C.green : tasaCumpl >= 70 ? C.amber : C.red, sub: entregadosArr.length + " de " + resultado.length }),
    /*#__PURE__*/React.createElement(MetricCard, { label: "Tiempo a despacho", value: leadtimeProm != null ? leadtimeProm + "d" : "—", color: C.blue, sub: "Compra → despacho (P90)" }),
    /*#__PURE__*/React.createElement(MetricCard, { label: "Tiempo de entrega", value: leadtimeEntProm != null ? leadtimeEntProm + "d" : "—", color: C.ink, sub: "Compra → entrega (P90)" }),
    /*#__PURE__*/React.createElement(MetricCard, { label: "Sin WMS", value: sinWMS.length, color: sinWMS.length ? C.amber : C.gray, tab: sinWMS.length ? "sinwms" : null, sub: "No están en Encuentra" })),
  leadtimeEntProm == null && entregaDiag && /*#__PURE__*/React.createElement("div", { className: "rounded-xl px-4 py-3 text-xs", style: { background: C.amberS, color: C.amber } },
    /*#__PURE__*/React.createElement("b", null, "Tiempo de entrega sin datos. "),
    entregaDiag.col ? ("Detecté la columna “" + entregaDiag.col + "” pero ningún pedido tiene una fecha de entrega válida (" + entregaDiag.conEntrega + " de " + entregaDiag.total + "). ") : "No encontré una columna de fecha de entrega en tu Fenicio. ",
    "Columnas de tu Fenicio: ",
    /*#__PURE__*/React.createElement("span", { style: { color: C.ink, fontWeight: 600 } }, (entregaDiag.cols || []).join(" · ")),
    ". Decime cuál tiene la fecha en que se entregó el pedido al cliente y la conecto."),
  persistOK === false && /*#__PURE__*/React.createElement("div", { className: "rounded-xl px-4 py-3 text-xs font-medium", style: { background: C.amberS, color: C.amber } }, "⚠ La persistencia no está activa: falta crear la tabla en Supabase, así que los comentarios y el seguimiento NO se guardan entre sesiones. Ejecutá el SQL de sql/operativa_seguimiento.sql en Supabase → SQL Editor."),
  ccDepo9Arr.length > 0 && /*#__PURE__*/React.createElement("div", { className: "rounded-xl px-4 py-3 text-xs font-medium", style: { background: "#FEE2E2", color: "#B91C1C" } }, "⚠ " + ccDepo9Arr.length + " pedido(s) Click & Collect asignados a Depo 9 — según el criterio del WMS no deberían; revisar la derivación de depósito."),
  /*#__PURE__*/React.createElement("div", { className: "bg-white rounded-2xl border p-3 flex flex-wrap gap-2 items-end", style: { borderColor: C.line } },
    /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", { className: "text-[10px] font-bold uppercase block mb-1", style: { color: C.gray } }, "Buscar pedido"), /*#__PURE__*/React.createElement("input", { type: "text", value: buscar, onChange: e => { setBuscar(e.target.value); setPage(0); }, placeholder: "N° pedido…", className: "px-2 py-1.5 rounded-lg border text-xs", style: { borderColor: C.line } })),
    /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", { className: "text-[10px] font-bold uppercase block mb-1", style: { color: C.gray } }, "Estado Fenicio"), /*#__PURE__*/React.createElement("select", { value: filtroEstadoFen, onChange: e => { setFiltroEstadoFen(e.target.value); setPage(0); }, className: "px-2 py-1.5 rounded-lg border text-xs bg-white", style: { borderColor: C.line, maxWidth: 220 } }, /*#__PURE__*/React.createElement("option", { value: "" }, "Todos"), estadosFenOpts.map(s => /*#__PURE__*/React.createElement("option", { key: s, value: s }, s)))),
    /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", { className: "text-[10px] font-bold uppercase block mb-1", style: { color: C.gray } }, "Depósito"), /*#__PURE__*/React.createElement("select", { value: filtroDeposito, onChange: e => { setFiltroDeposito(e.target.value); setPage(0); }, className: "px-2 py-1.5 rounded-lg border text-xs bg-white", style: { borderColor: C.line, maxWidth: 200 } }, /*#__PURE__*/React.createElement("option", { value: "" }, "Todos"), depositosOpts.map(s => /*#__PURE__*/React.createElement("option", { key: s, value: s }, s)))),
    /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", { className: "text-[10px] font-bold uppercase block mb-1", style: { color: C.gray } }, "Forma entrega"), /*#__PURE__*/React.createElement("select", { value: soloCC, onChange: e => { setSoloCC(e.target.value); setPage(0); }, className: "px-2 py-1.5 rounded-lg border text-xs bg-white", style: { borderColor: C.line } }, /*#__PURE__*/React.createElement("option", { value: "todos" }, "Todas"), /*#__PURE__*/React.createElement("option", { value: "cc" }, "Click & Collect"), /*#__PURE__*/React.createElement("option", { value: "pickup" }, "Pickup"), /*#__PURE__*/React.createElement("option", { value: "domicilio" }, "Envío a domicilio"))),
    /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", { className: "text-[10px] font-bold uppercase block mb-1", style: { color: C.gray } }, "Días ≥"), /*#__PURE__*/React.createElement("input", { type: "number", value: filtroDiasMin, min: "0", onChange: e => { setFiltroDiasMin(e.target.value); setPage(0); }, placeholder: "0", className: "px-2 py-1.5 rounded-lg border text-xs", style: { borderColor: C.line, width: 72 } })),
    (filtroEstadoFen || filtroDeposito || filtroDiasMin || buscar) ? /*#__PURE__*/React.createElement("button", { onClick: () => { setFiltroEstadoFen(""); setFiltroDeposito(""); setFiltroDiasMin(""); setBuscar(""); setPage(0); }, className: "text-xs font-bold px-3 py-1.5 rounded-lg", style: { background: "#EEF1F5", color: C.gray } }, "Limpiar") : null), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 flex-wrap items-center justify-end"
  }, /*#__PURE__*/React.createElement("button", { onClick: () => exportarOper(vistaRows, "operativa-" + vistaTab), className: "text-xs font-bold px-3 py-2 rounded-xl", style: { background: C.soft, color: C.blue } }, "⬇ Exportar vista"),
    /*#__PURE__*/React.createElement("button", { onClick: () => alertarTienda(vistaRows, vistaTab), className: "text-xs font-bold px-3 py-2 rounded-xl text-white", style: { background: C.amber } }, "✉ Alertar por mail")),
  /*#__PURE__*/React.createElement("div", { className: "flex items-center justify-between flex-wrap gap-2 px-1" },
    /*#__PURE__*/React.createElement("div", { className: "text-[11px]", style: { color: C.gray } }, /*#__PURE__*/React.createElement("b", { style: { color: C.ink } }, ({ atrasados: "Atrasados", criticos: "Críticos", nodespacho: "Validar despacho", estancados: "Estancados", depo0: "Depo 0", sinwms: "Sin WMS", todos: "Todos" }[vistaTab] || "Atrasados")), " · " + vistaRows.length + " pedido(s)" + (ccCol ? " · C&C por columna “" + ccCol + "”" : " · C&C por estado “Listo para retirar”")),
    totalPaginas > 1 && /*#__PURE__*/React.createElement("div", { className: "flex items-center gap-2" },
      /*#__PURE__*/React.createElement("button", { onClick: () => setPage(p => Math.max(0, p - 1)), disabled: pageSafe <= 0, className: "text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-40", style: { background: "#EEF1F5", color: C.gray } }, "← Anterior"),
      /*#__PURE__*/React.createElement("span", { className: "text-xs font-bold", style: { color: C.gray } }, "Hoja " + (pageSafe + 1) + " / " + totalPaginas),
      /*#__PURE__*/React.createElement("button", { onClick: () => setPage(p => Math.min(totalPaginas - 1, p + 1)), disabled: pageSafe >= totalPaginas - 1, className: "text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-40", style: { background: "#EEF1F5", color: C.gray } }, "Siguiente →"))),
  vistaRows.length > 0 ? /*#__PURE__*/React.createElement(Tabla, { rows: pageRows }) : /*#__PURE__*/React.createElement(Vacio, { msg: vistaTab === "criticos" ? "No hay pedidos críticos (+10 días hábiles)." : vistaTab === "nodespacho" ? "No hay pedidos despachados en WMS que sigan sin entregar en Fenicio." : vistaTab === "estancados" ? "No hay pedidos estancados (+2 días hábiles sin avanzar en el WMS)." : vistaTab === "inconsistencias" ? "Todos los estados coinciden." : vistaTab === "depo0" ? "No hay pedidos en Depo 0 (sin stock)." : vistaTab === "atrasados" ? "No hay pedidos atrasados para este periodo." : "No hay pedidos en esta vista." }),
  totalPaginas > 1 && /*#__PURE__*/React.createElement("div", { className: "flex items-center justify-center gap-3 pt-1" },
    /*#__PURE__*/React.createElement("button", { onClick: () => setPage(p => Math.max(0, p - 1)), disabled: pageSafe <= 0, className: "text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-40", style: { background: "#EEF1F5", color: C.gray } }, "← Anterior"),
    /*#__PURE__*/React.createElement("span", { className: "text-xs font-bold", style: { color: C.gray } }, "Hoja " + (pageSafe + 1) + " / " + totalPaginas),
    /*#__PURE__*/React.createElement("button", { onClick: () => setPage(p => Math.min(totalPaginas - 1, p + 1)), disabled: pageSafe >= totalPaginas - 1, className: "text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-40", style: { background: "#EEF1F5", color: C.gray } }, "Siguiente →"))));
}

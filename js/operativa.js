/* ===================================================================
   Operativa — cruce Fenicio × WMS, seguimiento de pedidos
   Parte del Gestor del Equipo. Se carga como <script> clásico desde
   index.html; comparte el ámbito global con los demás archivos js/.
   =================================================================== */

/* ── Operativa — cruce Fenicio × Encuentra ── */
/* COLUMNAS PRE-CONFIGURADAS: Fenicio "Nro. pedido"|"Fecha comienzo"|"Estado entrega" / WMS "Venta"|"Estado Encuentra"|"Estado ecommerce"|"Canal" */
function Operativa({ yo, activo, syncTick }) {
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
  const [deptoCol, setDeptoCol] = useState(""); // nombre de la columna "Departamento" detectada en Fenicio
  const [deptoDiag, setDeptoDiag] = useState(null); // diagnóstico del corte por región (columna y conteos)
  const [depoDiag, setDepoDiag] = useState(null); // diagnóstico de Depo 0 (valores de la columna Depósito)
  const [comentarios, setComentarios] = useState({}); // pedido -> { comentario, accionado, comentario_fecha } (persistido)
  const [persistOK, setPersistOK] = useState(null); // null=sin chequear, true=tabla ok, false=falta crear tabla
  const [ultimaSync, setUltimaSync] = useState(null); // hora de la última lectura del seguimiento compartido
  const [snapError, setSnapError] = useState(null); // mensaje si falló guardar el resumen compartido (operativa_snapshot)
  const [operSnap, setOperSnap] = useState(null); // resumen COMPARTIDO (operativa_snapshot): números que ven todos, = Resumen
  const cruceEnSesion = useRef(false); // true si crucé archivos en esta sesión (no interrumpir mi cruce con el realtime)
  const cruceTs = useRef(0); // cuándo crucé (ms): si lo COMPARTIDO es más nuevo que mi cruce, gana lo compartido
  const supresRealtime = useRef(0); // timestamp del último cambio LOCAL (comentario/accionado): evita que el eco de realtime recargue la lista y te mande al principio
  const [filtroEstadoFen, setFiltroEstadoFen] = useState("");
  const [filtroDeposito, setFiltroDeposito] = useState("");
  const [filtroDiasMin, setFiltroDiasMin] = useState("");
  const [buscar, setBuscar] = useState("");
  const [calMes, setCalMes] = useState("");
  const [kpiPanel, setKpiPanel] = useState(""); // "" | "cumpl" | "stock" | "entrega": desglose abierto bajo los KPI
  // Marcador para "cancelado probable": el pedido dejó de venir en Fenicio (el demorasweb se descarga
  // filtrado por "Pago aprobado") pero el WMS ya lo procesó → perdió el pago aprobado = se canceló.
  const MARK_PROBCANCEL = "Cancelado (probable · sin Fenicio, WMS procesado)";
  const esProbCancel = r => /cancelado \(probable/i.test(String(r && r.estadoFen || ""));
  // Promesa de entrega en días hábiles (el KPI de cumplimiento mide entregas DENTRO de este plazo).
  // Promesa de entrega por DEFECTO (días hábiles). El equipo puede cambiarla desde la UI y queda guardada;
  // todos los KPIs de la promesa se recalculan en pantalla con ese valor (sin volver a cruzar archivos).
  const PROMESA_DH = 5;
  const [promesaDH, setPromesaDH] = useState(() => { try { const v = parseInt(localStorage.getItem("umbro_promesaDH") || "", 10); return v >= 1 && v <= 15 ? v : PROMESA_DH; } catch (e) { return PROMESA_DH; } });
  const setPromesa = n => { const v = Math.max(1, Math.min(15, n | 0)); setPromesaDH(v); try { localStorage.setItem("umbro_promesaDH", String(v)); } catch (e) {} };
  // Vista por TIENDA (selector grande arriba) y subsección (menú lateral).
  const TIENDAS_OP = ["todas", "TimeOut", "Tienda Nacional", "Classico"];
  const [tiendaVista, setTiendaVista] = useState("todas");
  // Región del destino: la promesa de entrega no es igual en todo el país. Montevideo (área metropolitana)
  // podría bajar a 1 día hábil; el interior no. Se clasifica por el departamento del pedido.
  const [regionVista, setRegionVista] = useState("todas"); // todas | montevideo | interior
  const [subOper, setSubOper] = useState("resumen"); // resumen (incluye listado) | tiempos | cargar · calendario va siempre arriba
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
  // Días hábiles ENTRE dos fechas (para medir confirmado → procesado en las solicitudes de stock)
  const diasHabEntre = (desde, hasta) => {
    try {
      const a = parseFecha(desde), b = parseFecha(hasta);
      if (!a || !b) return null;
      let cur = new Date(a.getFullYear(), a.getMonth(), a.getDate());
      const fin = new Date(b.getFullYear(), b.getMonth(), b.getDate());
      if (cur >= fin) return 0;
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
  // Región del destino a partir del departamento (Fenicio). Montevideo = área metropolitana; el resto,
  // Interior. Sin departamento → null (queda fuera de los cortes por región). Los C&C se cuentan por la
  // tienda de retiro: si Fenicio no trae departamento del retiro, quedan sin región (solo en "Todas").
  const regionDe = depto => {
    const d = String(depto || "").toLowerCase().trim();
    if (!d) return null;
    return /montevideo|montevide|\bmvd\b/.test(d) ? "montevideo" : "interior";
  };
  const calcDeriv = row => {
    const estadoFen = row.estadoFen || "-";
    const estadoWMS = row.estadoWMS || "-";
    // "Días hábiles" = desde la COMPRA (Fecha pago) hasta hoy. El atraso se mide por la antigüedad del
    // pedido (decisión de operaciones), no por el tiempo en el estado actual. fechaEstado (último
    // movimiento del WMS) se conserva sólo como dato informativo en el export.
    const dias = diasHab(row.fecha);
    // Días hábiles en el ESTADO ACTUAL del WMS = desde el último cambio de estado (último movimiento).
    const diasEstado = row.fechaEstado && row.fechaEstado !== "-" ? diasHab(row.fechaEstado) : null;
    const diasDesp = row.fechaDespacho && row.fechaDespacho !== "-" ? diasHab(row.fechaDespacho) : null;
    const fenEntregado = String(estadoFen).toLowerCase().includes("entregado");
    const wmsEntregado = String(estadoWMS).toLowerCase().includes("entregado");
    const entregado = fenEntregado || wmsEntregado;
    const canceladoWMS = /cancel|anul/i.test(estadoWMS);
    const canceladoFen = /cancel|anul/i.test(estadoFen) || /cancel|anul/i.test(String(row.estadoPagoFen || ""));
    const cancelado = canceladoWMS || canceladoFen;
    // Un cancelado debería estar cancelado en AMBAS plataformas. Si sólo lo está en una → discrepancia
    // a revisar (se avisa, pero igual no cuenta como atraso).
    const cancelDiscrep = canceladoWMS !== canceladoFen;
    const despachadoWMS = String(estadoWMS).toLowerCase().includes("despach");
    const movidoWMS = despachadoWMS || String(estadoWMS).toLowerCase().includes("recib");
    // OJO: en Fenicio "Pedido recibido" es un estado TEMPRANO (el pedido recién ingresó; sus fechas vienen
    // en 0000-00-00), NO "retirado/recibido por el cliente". Por eso NO se toma "recibido" del estado
    // Fenicio como listo/movido. El "recibido en tienda" real (C&C entregado) es del WMS.
    const listoRetiro = /listo.*retir/i.test(estadoFen) || /listo.*retir/i.test(estadoWMS) || /recibid[oa]?\s*(en\s*)?tienda/i.test(estadoWMS);
    // Fenicio "Listo para retirar": el despacho/entrega de nosotros ya se cumplió y ahora depende del
    // cliente ir a retirarlo → NO es atraso (aunque lleve días en ese estado).
    const fenListoRetiro = /listo.*retir/i.test(estadoFen);
    // EN TRÁNSITO: ya lo despachamos y va camino al cliente (Fenicio "Pedido en tránsito"). NO es atraso
    // — nuestra parte (el despacho) ya se cumplió, ahora depende de la logística de entrega. Se sigue en
    // su propio filtro. "diasTransito" ≈ días hábiles desde el despacho (el tránsito arranca al despachar).
    const enTransito = /tr[aá]nsito|camino/i.test(estadoFen) || /tr[aá]nsito|camino/i.test(estadoWMS);
    const diasTransito = diasDesp != null ? diasDesp : dias;
    const transitoLargo = enTransito && diasTransito != null && diasTransito > 2;
    // ATRASO (definición de operaciones): más de N días hábiles en el mismo estado de Encuentra, que
    // NO figure "Pedido entregado" ni "Listo para retirar" ni "En tránsito" en Fenicio y que NO esté
    // cancelado. Los "En tránsito" salen del atraso: ya se despacharon (van en su propio filtro).
    const atrasado = !cancelado && !fenEntregado && !fenListoRetiro && !enTransito && dias != null && dias > filtroDias;
    const critico = !cancelado && !fenEntregado && !fenListoRetiro && !enTransito && dias != null && dias > 10;
    // "Validar despacho": Monitor dice despachado pero Fenicio no pasó a entregado tras +2 días hábiles.
    // Si Fenicio está "Listo para retirar" o "En tránsito", el despacho SÍ se cumplió → no hay que validar.
    const posibleNoDespacho = despachadoWMS && !fenEntregado && !fenListoRetiro && !enTransito && (diasDesp != null ? diasDesp > 2 : (dias != null && dias > 2));
    const inconsistente = posibleNoDespacho;
    // ESTANCADO: hace +2 días hábiles que NO cambia de estado en el WMS y Fenicio no lo da por entregado
    // ni "Listo para retirar" ni "En tránsito". Es independiente del atraso.
    const estancado = !cancelado && !fenEntregado && !fenListoRetiro && !enTransito && diasEstado != null && diasEstado > 2;
    // Forma de entrega: Click & Collect ≠ Pickup ≠ Envío a domicilio
    const fe = String(row.formaEntrega || "").toLowerCase();
    const clickCollect = fe.includes("click") || fe.includes("collect");
    const pickup = !clickCollect && fe.includes("pickup");
    const depo = String(row.deposito || "").replace(/\.0+$/, "").trim();
    // Depo 0 = el WMS no encontró stock → acción manual, PERO solo si el pedido sigue "vivo":
    // si ya se entregó, canceló, despachó, está en tránsito/recibido o es PCN (personalizado), se gestionó.
    // "Listo para enviar"/"pronto para despacho" = el pedido YA está preparado → tiene stock, no es Depo 0.
    const listoEnviar = /listo.*env[ií]|pronto.*despach|en\s*env[ií]o/i.test(estadoFen) || /pronto.*despach|env[ií]o\s*pronto/i.test(estadoWMS);
    const movidoODespachado = movidoWMS || listoRetiro || listoEnviar || /despach|tr[aá]nsito|camino/i.test(estadoFen) || /tr[aá]nsito|camino/i.test(estadoWMS);
    // Depo 0 = algún artículo sin stock (fila guardada en "0" o cualquier ítem del pedido en "0").
    const sinStock = (depo === "0" || row.depo0Any) && !entregado && !cancelado && !movidoODespachado && !row.pcn;
    const ccDepo9 = clickCollect && depo === "9";  // C&C no debería pedirse a depo 9
    // Tiempo a despacho: días corridos compra → "Fecha despacho" del WMS (dato real; la entrega no se registra)
    let leadtime = null;
    if (row.fechaDespacho && row.fechaDespacho !== "-") { const a = parseFecha(row.fecha), b = parseFecha(row.fechaDespacho); if (a && b && b >= a) leadtime = Math.round((b - a) / 86400000); }
    // Tiempo de entrega: días corridos compra → entrega real (fecha de entrega de Fenicio). Mide la experiencia del cliente.
    let leadtimeEntrega = null;
    if (row.fechaEntrega && String(row.fechaEntrega).trim() && row.fechaEntrega !== "-") { const a = parseFecha(row.fecha), b = parseFecha(row.fechaEntrega); if (a && b && b >= a) leadtimeEntrega = Math.round((b - a) / 86400000); }
    // CUMPLIDO (para la promesa de entrega) = entregado O listo para retirar (en C&C ya hicimos nuestra
    // parte aunque el cliente no lo haya retirado). La fecha del cumplimiento es la de entrega si existe;
    // si no, la de "Listo para retirar". Es la MISMA definición que usa el calendario de cumplimiento.
    const tieneFechaEnt = row.fechaEntrega && String(row.fechaEntrega).trim() && row.fechaEntrega !== "-";
    const cumplido = entregado || listoRetiro;
    const fechaCumplido = tieneFechaEnt ? row.fechaEntrega : (listoRetiro && row.fechaListo && String(row.fechaListo).trim() && row.fechaListo !== "-" ? row.fechaListo : "");
    return { ...row, dias, diasEstado, diasDesp, diasTransito, fenEntregado, wmsEntregado, entregado, cumplido, fechaCumplido, cancelado, cancelDiscrep, despachadoWMS, atrasado, critico, inconsistente, posibleNoDespacho, estancado, enTransito, transitoLargo, listoRetiro, clickCollect, pickup, sinStock, ccDepo9, leadtime, leadtimeEntrega, region: regionDe(row.departamento) };
  };
  // Carga el seguimiento ya analizado (con comentarios) al entrar a la pestaña, para que el análisis quede fijo.
  // opts.soloSiMasNuevo: usado cuando YA crucé archivos en esta sesión — solo pisa mi cruce si otro
  // usuario cruzó DESPUÉS que yo (su snapshot es más nuevo). Antes, tras cruzar una vez, la pestaña
  // quedaba "sorda" a los cruces del resto del equipo hasta recargar la página entera.
  const cargarSeguimiento = useCallback(async (opts) => {
    const soloSiMasNuevo = !!(opts && opts.soloSiMasNuevo);
    try {
      // Snapshot COMPARTIDO (números que ve todo el equipo, iguales a Resumen)
      let os = null;
      try { const r = await supa.from("operativa_snapshot").select("*").eq("id", "ultimo").maybeSingle(); os = r.data || null; } catch (_) {}
      if (soloSiMasNuevo) {
        const remoto = os && os.actualizado ? new Date(os.actualizado).getTime() : 0;
        // +10s de margen para no reaccionar al eco de MI PROPIO upsert del snapshot
        if (!(remoto > (cruceTs.current || 0) + 10000)) return;
      }
      if (os) setOperSnap(os);
      // Supabase devuelve hasta 1000 filas por request → paginar para traer TODO el seguimiento
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
      setUltimaSync(new Date());
      cruceEnSesion.current = false; // al leer lo compartido ya no estoy mirando "mi" cruce local
      const cm = {};
      const histDe = d => Array.isArray(d.historial) && d.historial.length ? d.historial : (d.comentario ? [{ t: d.comentario, f: d.comentario_fecha || "" }] : []);
      (data || []).forEach(d => { cm[d.pedido] = { historial: histDe(d), accionado: !!d.accionado, tienda: d.tienda || "" }; });
      setComentarios(cm);
      // Mostrar el seguimiento COMPARTIDO (accionables + comentarios de todos) aunque no se suban archivos
      setResultado((data || []).map(d => calcDeriv({
        pedido: d.pedido, tienda: d.tienda || "-", fecha: d.fecha || "",
        estadoFen: d.estado_fen || "-", estadoWMS: d.estado_wms || "-", estadoEco: d.estado_eco || "-",
        deposito: d.deposito || "-", fechaDespacho: d.fecha_despacho || "-", importe: d.importe || "-",
        fechaEstado: d.fecha_estado || "", formaEntrega: d.forma_entrega || "", fechaEntrega: d.fecha_entrega || "", sinWMS: !!d.sin_wms,
        historial: histDe(d), accionado: !!d.accionado
      })));
    } catch (_) { setPersistOK(false); }
  }, []);
  // Al ENTRAR a la pestaña (o al montar) traemos lo último compartido: así ves lo que cargó el equipo y
  // coincide con Resumen. PERO si ya cruzaste archivos en esta sesión, NO recargamos: no hay que pisar
  // tu cruce al cambiar de pestaña y volver (era la causa de que "se borrara todo" al volver a Operativa).
  useEffect(() => {
    if (activo === false) return;
    cargarSeguimiento(cruceEnSesion.current ? { soloSiMasNuevo: true } : undefined);
  }, [activo, cargarSeguimiento]);
  // Promesa COMPARTIDA: si el equipo ya definió una promesa (viaja en el snapshot) y este usuario todavía
  // no eligió la suya, adoptamos la del equipo. Si el usuario ya la cambió (localStorage), respetamos la suya.
  useEffect(() => {
    try { if (localStorage.getItem("umbro_promesaDH")) return; } catch (e) {}
    const p = operSnap && operSnap.serie && operSnap.serie.promesaDH;
    if (p >= 1 && p <= 15 && p !== promesaDH) setPromesaDH(p);
  }, [operSnap]);
  // En VIVO: cuando otro usuario cambia algo (realtime → syncTick) recargamos. Si crucé en esta sesión,
  // solo se pisa mi cruce cuando el snapshot remoto es MÁS NUEVO (otro usuario cruzó después que yo).
  useEffect(() => {
    if (activo === false) return;
    // Si el cambio lo hiciste vos (comentario/accionado) hace un instante, el propio upsert dispara el
    // realtime → syncTick. Como ya actualizamos la fila en pantalla, NO recargamos: recargar reconstruiría
    // toda la lista y te mandaría al principio (perdés la posición). El cambio de otros usuarios llega
    // sin ese upsert local reciente, así que sí se recarga.
    if (Date.now() - supresRealtime.current < 5000) return;
    cargarSeguimiento(cruceEnSesion.current ? { soloSiMasNuevo: true } : undefined);
  }, [syncTick, cargarSeguimiento]);
  // Marca accionado (no toca el historial de comentarios).
  const guardarSeguimiento = async (pedido, campos) => {
    supresRealtime.current = Date.now();
    setResultado(prev => (prev || []).map(r => r.pedido === pedido ? { ...r, ...campos } : r));
    setComentarios(prev => ({ ...prev, [pedido]: { ...(prev[pedido] || {}), ...campos } }));
    try { await supa.from("operativa_seguimiento").upsert({ pedido, ...campos }, { onConflict: "pedido" }); } catch (_) {}
    supresRealtime.current = Date.now();
  };
  // Agrega una nota al historial del pedido (bitácora con fecha; no se pisan las anteriores).
  const agregarComentario = async (pedido, texto) => {
    const t = String(texto || "").trim();
    if (!t) return;
    supresRealtime.current = Date.now();
    const entry = { t, f: new Date().toISOString(), a: (yo && yo.nombre) || "" };
    // nuevo se calcula de forma síncrona (no dentro del updater de setState) para que el upsert
    // persista el historial completo y no un array vacío por el batching de React.
    const nuevo = [...((comentarios[pedido] && comentarios[pedido].historial) || []), entry];
    setComentarios(prev => ({ ...prev, [pedido]: { ...(prev[pedido] || {}), historial: [...((prev[pedido] && prev[pedido].historial) || []), entry] } }));
    setResultado(prev => (prev || []).map(r => r.pedido === pedido ? { ...r, historial: [...(r.historial || []), entry] } : r));
    try { await supa.from("operativa_seguimiento").upsert({ pedido, historial: nuevo, comentario: t, comentario_fecha: entry.f }, { onConflict: "pedido" }); } catch (_) {}
    supresRealtime.current = Date.now();
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
    // "Estado" (de pago) de Fenicio: acá aparece "Cancelada" (el "Estado entrega" nunca dice cancelado).
    const colEstPagoF = findCol(sF, [/^estado$/i]) || "";
    // Fecha de entrega REAL = la de Fenicio (estado "Pedido entregado"), no la del WMS (expedición manual, poco confiable)
    // Se prueban varios nombres habituales de la columna de fecha de entrega de Fenicio.
    const colFechEntFen = findCol(sF, [/fecha.*entreg/i, /entreg.*fecha/i, /fecha.*recib/i, /recib.*fecha/i, /fecha.*finaliz/i, /finaliz.*fecha/i, /fecha.*complet/i]) || "";
    // Fecha en que el pedido quedó "Listo para retirar" (Fenicio): para C&C, la promesa se cumple cuando
    // está listo para retirar (nuestra parte), aunque el cliente todavía no lo haya retirado.
    const colFechListo = findCol(sF, [/fecha.*listo.*retir/i, /listo.*retir.*fecha/i]) || "";
    const colImp = findCol(sF, [/importe.*total.*pedido/i, /importe.*pedido/i]) || findCol(sF, [/importe/i]) || "Importe total pedido";
    // Departamento del destino (Fenicio) para separar Montevideo (área metropolitana) del Interior.
    // Preferimos el departamento de ENTREGA (destino) sobre el de facturación.
    const colDepto = findCol(sF, [/departamento.*entrega/i, /departamento.*env[ií]/i]) || findCol(sF, [/departamento/i, /provincia/i, /depto/i, /dpto/i, /estado.*prov/i]) || "";
    setDeptoCol(colDepto || "");
    const sW = rowsB[0] || {};
    const colVenta = findCol(sW, [/^venta$/i, /venta/i]) || "Venta";
    const colEstEnc = findCol(sW, [/estado.*encuentra/i]) || "Estado Encuentra";
    const colEstEco = findCol(sW, [/estado.*ecom/i]) || "Estado ecommerce";
    const colCanal = findCol(sW, [/canal/i, /tienda/i]) || "Canal";
    const colDep = findCol(sW, [/dep[oó]sito/i]) || "Deposito pedido";
    // Anclado: /fecha.*despach/ a secas matchea antes "Fecha PRONTO PARA despachar" (columna previa en el Monitor)
    const colFechDesp = findCol(sW, [/^fecha\s*despacho$/i, /^fecha\s*despach/i, /fecha.*despach/i, /despach/i]) || "Fecha despacho";
    // Forma de entrega (Click & Collect / Pickup / Envío a domicilio) y fecha de entrega real (para lead time)
    const colForma = findCol(sW, [/forma.*entr/i, /m[eé]todo.*entr/i, /tipo.*entr/i, /modalidad/i]) || "Forma entrega";
    const colFechEntrega = findCol(sW, [/fecha.*entrega.*real/i, /fecha.*entrega/i]) || "Fecha entrega real";
    // Fechas de cada estado del WMS. La MÁS RECIENTE = cuándo entró al estado actual → sirve para medir
    // "días hábiles en el estado actual" (el atraso). Se detectan con patrones específicos para no
    // confundir "Fecha despacho" con "Fecha pronto para despachar".
    const colsFechaWMS = [
      findCol(sW, [/^fecha\s*pedido/i]),
      findCol(sW, [/^fecha\s*confirmad/i]),
      findCol(sW, [/^fecha\s*procesad/i]),
      findCol(sW, [/pronto.*despach/i]),
      findCol(sW, [/^fecha\s*despach/i]),
      findCol(sW, [/recibid.*tienda/i]),
      findCol(sW, [/fecha\s*entrega\s*real/i])
    ].filter(Boolean);
    const fechaUltMovWMS = w => {
      let best = null;
      colsFechaWMS.forEach(c => { const d = parseFecha(w[c]); if (d && (!best || d > best)) best = d; });
      if (!best) return "";
      const p = n => String(n).padStart(2, "0");
      return best.getFullYear() + "-" + p(best.getMonth() + 1) + "-" + p(best.getDate()) + " " + p(best.getHours()) + ":" + p(best.getMinutes());
    };
    setCcCol(colForma || "");
    // PCN (prendas personalizadas): se detectan por el artículo del WMS con prefijo "PCN".
    // No se cuentan como Depo 0 (su falta de stock es normal, se hacen a pedido).
    const colArt = findCol(sW, [/art[ií]culo/i, /^sku$/i, /c[oó]d.*art/i]) || "Articulo";
    const pcnVentas = new Set();
    rowsB.forEach(r => { if (String(r[colArt] || "").toUpperCase().startsWith("PCN")) { const k = String(r[colVenta] || "").trim(); if (k) pcnVentas.add(k); } });

    const wmsF = filtroTienda === "todas" ? rowsB : rowsB.filter(r => String(r[colCanal] || "").toLowerCase().includes(filtroTienda.toLowerCase()));
    const wmsMap = {};
    // Encuentra trae 1 fila por ARTÍCULO: un pedido puede tener ítems en varios depósitos (ej. [9,9,0]).
    // Si ALGÚN artículo quedó en Depo 0 (sin stock), el pedido necesita acción manual aunque la fila que
    // guardemos sea de otro depósito. Por eso marcamos aparte los pedidos con algún ítem en Depo 0.
    const anyDepo0 = {};
    const ORDEN_EST = ["Items Pedidos", "Items Confirmados", "Items Clasificados  (Orden Liberada)", "Pedido en  envio pronto para despacho", "Pedido Despachado", "Pedido recibido  en tienda", "Pedido entregado  a cliente", "Cancelado"];
    wmsF.forEach(r => {
      const k = String(r[colVenta] || "").trim();
      if (!k) return;
      if (String(r[colDep] || "").replace(/\.0+$/, "").trim() === "0") anyDepo0[k] = true;
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
      const depo0Any = !!anyDepo0[pedido]; // algún artículo del pedido quedó en Depo 0 (aunque la fila guardada sea de otro depósito)
      const fechaDespacho = wms ? wms[colFechDesp] || "-" : "-";
      const formaEntrega = wms ? String(wms[colForma] || "") : "";
      // Fecha de entrega real desde Fenicio (no del WMS). Vacío si Fenicio no la trae.
      const fechaEntrega = colFechEntFen ? String(r[colFechEntFen] || "") : "";
      const fechaListo = colFechListo ? String(r[colFechListo] || "") : "";
      if (filtroFecha.desde && fecha && fecha < filtroFecha.desde) return;
      if (filtroFecha.hasta && fecha && fecha > filtroFecha.hasta) return;
      res.push(calcDeriv({
        pedido,
        tienda: r._tiendaFen || "-",
        fecha: String(fecha).slice(0, 16).replace("T", " "),
        estadoFen,
        estadoPagoFen: colEstPagoF ? String(r[colEstPagoF] || "") : "",
        estadoWMS,
        estadoEco,
        deposito,
        fechaDespacho,
        fechaEstado: wms ? fechaUltMovWMS(wms) : "",
        formaEntrega,
        fechaEntrega,
        fechaListo,
        importe,
        departamento: colDepto ? String(r[colDepto] || "").trim() : "",
        depo0Any,
        pcn: pcnVentas.has(pedido),
        sinWMS: !wms
      }));
    });
    // Diagnóstico de la fecha de entrega: cuántos pedidos quedaron con tiempo de entrega calculado
    // y qué columnas trae Fenicio (para identificar la correcta si no se detectó).
    setEntregaDiag({ col: colFechEntFen, cols: Object.keys(sF), conEntrega: res.filter(r => r.leadtimeEntrega != null).length, total: res.length });
    const deptoInfo = { col: colDepto, cols: Object.keys(sF), nMvd: res.filter(r => r.region === "montevideo").length, nInt: res.filter(r => r.region === "interior").length, nSin: res.filter(r => !r.region).length, total: res.length };
    setDeptoDiag(deptoInfo);
    // Diagnóstico de Depo 0: distribución de valores de la columna "Depósito" del Encuentra, para entender
    // por qué Depo 0 puede dar 0 (el valor real no es exactamente "0", o esos pedidos ya se movieron).
    const depoVals = {};
    res.forEach(r => { const d = (r.deposito == null || String(r.deposito).trim() === "") ? "(vacío)" : String(r.deposito).replace(/\.0+$/, "").trim(); depoVals[d] = (depoVals[d] || 0) + 1; });
    const depoInfo = { vals: depoVals, nSinStock: res.filter(r => r.sinStock).length, colDep: colDep, total: res.length };
    setDepoDiag(depoInfo);
    const matchCount = res.filter(r => !r.sinWMS).length;
    if (res.length === 0) {
      alert("No se pudo leer el N° de pedido del reporte de Fenicio.\n\nColumna buscada: \"" + colNro + "\".\nColumnas encontradas: " + Object.keys(sF).join(", "));
    } else if (matchCount === 0) {
      alert("Se leyeron " + res.length + " pedidos de Fenicio pero ninguno coincidió con la columna \"" + colVenta + "\" del Monitor de Encuentra.\n\nVerificá que el N° de pedido de Fenicio corresponda a la columna Venta del Monitor.");
    }
    // ── Enriquecer cada pedido con su comentario/accionado persistido (no se pierden al recruzar) ──
    const relevante = r => r.atrasado || r.critico || r.posibleNoDespacho || r.estancado || r.inconsistente || r.enTransito || r.sinStock;
    const merged = res.map(r => {
      const c = comentarios[r.pedido] || {};
      return { ...r, historial: c.historial || [], accionado: !!c.accionado };
    });
    // Conservar los pedidos YA SEGUIDOS (con comentario o marcados como accionado) que NO vinieron en
    // los archivos nuevos, para no perder su seguimiento al recruzar. Se re-derivan para refrescar días.
    const enCruce = new Set(merged.map(r => r.pedido));
    // ¿El pedido está en el Monitor WMS de HOY? El Monitor lista TODOS los pedidos activos, así que si un
    // pedido ya no aparece ahí (ni en Fenicio), está resuelto/archivado: no debe arrastrarse como atrasado
    // con datos viejos. Sin esto, un pedido comentado hace meses seguía saliendo "demorado 30 días".
    const enWMSHoy = p => !!wmsMap[String(p).trim()];
    // Al retener, refrescamos el estado desde el WMS ACTUAL (el Monitor trae TODOS los pedidos, incluso
    // los que Fenicio ya no lista por estar cancelados/entregados). Así un pedido retenido que hoy figura
    // "Cancelado" en el WMS deja de contar como atrasado, aunque no venga en el Fenicio de hoy.
    const retenidos = (resultado || [])
      .filter(p => !enCruce.has(p.pedido) && ((p.historial && p.historial.length) || p.accionado) && enWMSHoy(p.pedido))
      .map(p => {
        const w = wmsMap[String(p.pedido).trim()];
        let base = w ? {
          ...p,
          estadoWMS: w[colEstEnc] || p.estadoWMS,
          estadoEco: w[colEstEco] || p.estadoEco,
          deposito: String(w[colDep] || p.deposito || "-").replace(/\.0+$/, "").trim(),
          fechaDespacho: w[colFechDesp] || p.fechaDespacho,
          fechaEstado: fechaUltMovWMS(w),
          sinWMS: false
        } : p;
        // Cancelado PROBABLE: no vino en Fenicio (filtrado por "Pago aprobado" al descargar) y el WMS ya
        // lo procesó → perdió el pago aprobado = se canceló en Fenicio (ahí no viaja, y en el WMS ya no
        // se puede cancelar un pedido procesado). Se marca en estadoFen para que salga de atrasados y se
        // persista (así también queda resuelto al recargar). No aplica si ya está cancelado/entregado.
        const estW = String(base.estadoWMS || "");
        const wmsProcesado = /clasificad|liberad|pronto|despach|tr[aá]nsito|camino|recib|entregad/i.test(estW);
        const yaResuelto = /cancel|anul|entregad/i.test(String(base.estadoFen || "")) || /cancel|anul|entregad/i.test(estW);
        if (w && wmsProcesado && !yaResuelto) base = { ...base, estadoFen: MARK_PROBCANCEL };
        return { ...calcDeriv(base), retenido: true };
      });
    const finalRows = merged.concat(retenidos).sort((a, b) => (b.dias || 0) - (a.dias || 0));
    setResultado(finalRows);
    cruceEnSesion.current = true;
    cruceTs.current = Date.now();
    setUltimaSync(new Date());
    setVistaTab("atrasados");
    setPage(0);
    // Persistir los accionables + los retenidos marcados como "cancelado probable" (para que su estado
    // quede guardado y no vuelvan a contar como atrasados al recargar la pestaña).
    const aSeguir = merged.filter(relevante).concat(retenidos.filter(esProbCancel));
    (async () => {
      try {
        const payload = aSeguir.map(r => ({
          pedido: r.pedido, tienda: r.tienda, fecha: r.fecha,
          estado_fen: r.estadoFen, estado_wms: r.estadoWMS, estado_eco: r.estadoEco,
          deposito: (r.depo0Any ? "0" : r.deposito), fecha_despacho: r.fechaDespacho, importe: String(r.importe),
          forma_entrega: r.formaEntrega || "", fecha_entrega: r.fechaEntrega || "",
          fecha_estado: r.fechaEstado || "",
          dias: r.dias, click_collect: !!r.clickCollect, sin_wms: !!r.sinWMS
        }));
        for (let i = 0; i < payload.length; i += 200) {
          const { error: eSeg } = await supa.from("operativa_seguimiento").upsert(payload.slice(i, i + 200), { onConflict: "pedido" });
          if (eSeg) { setSnapError("Seguimiento: " + (eSeg.message || eSeg.details || JSON.stringify(eSeg)) + " — quizá falta correr sql/operativa_seguimiento.sql (columna fecha_estado)."); break; }
        }
        // Limpiar de la tabla COMPARTIDA los pedidos que ya NO van en la planilla, así el seguimiento
        // refleja el ÚLTIMO cruce y no arrastra pedidos viejos (era la causa de que Resumen mostrara
        // 617 en vez de los 272 reales). Regla:
        //  · ENTREGADO en este cruce → se borra SIEMPRE (aunque tenga comentario): ya está resuelto.
        //  · Ya NO está en las planillas nuevas (ni en Fenicio ni en el Monitor WMS) → se borra: está
        //    resuelto/archivado, aunque tenga nota (era lo que arrastraba pedidos viejísimos como demorados).
        //  · No accionable y sin nota ni accionado (de una tienda cruzada) → se borra.
        //  · Con comentario / accionado, NO entregado y TODAVÍA en el Monitor → se mantiene (sigue pendiente).
        const keepSet = new Set(aSeguir.map(r => r.pedido));
        const entregadosEnCruce = new Set(merged.filter(r => r.entregado).map(r => r.pedido));
        const tiendasEnCruce = new Set(merged.map(r => r.tienda));
        const aBorrar = Object.entries(comentarios).filter(([p, c]) => {
          if (keepSet.has(p)) return false;
          if (entregadosEnCruce.has(p)) return true;
          if (!enCruce.has(p) && !enWMSHoy(p)) return true; // desapareció de ambas planillas nuevas → resuelto
          return tiendasEnCruce.has(c.tienda) && !(c.historial && c.historial.length) && !c.accionado;
        }).map(([p]) => p);
        for (let i = 0; i < aBorrar.length; i += 200) {
          await supa.from("operativa_seguimiento").delete().in("pedido", aBorrar.slice(i, i + 200));
        }
      } catch (_) {}
    })();
    // Guardar el RESUMEN de Operativa (las MISMAS cifras que se ven en esta pestaña) para que el
    // Resumen y los KPIs automáticos muestren exactamente lo mismo, sin recalcular distinto.
    (async () => {
      try {
        // Los CANCELADOS quedan afuera de todos los cálculos de cumplimiento (serie del mes,
        // calendario, desgloses por tienda): un pedido cancelado no es un incumplimiento de entrega.
        const efectivos = finalRows.filter(r => !esCancEf(r));
        const lt = efectivos.filter(r => r.leadtime != null).map(r => r.leadtime);
        const ltE = efectivos.filter(r => r.leadtimeEntrega != null).map(r => r.leadtimeEntrega);
        // Resumen del mes corriente (para la barra de cumplimiento), calculado del cruce COMPLETO
        const mkNow = new Date().toISOString().slice(0, 7);
        const bk = {};
        efectivos.forEach(r => { const d = parseFecha(r.fecha); if (!d) return; const m = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); const b = bk[m] || (bk[m] = { total: 0, entreg: 0, lt: [], ltE: [] }); b.total++; if (r.entregado) b.entreg++; if (r.leadtime != null) b.lt.push(r.leadtime); if (r.leadtimeEntrega != null) b.ltE.push(r.leadtimeEntrega); });
        const mk = bk[mkNow] ? mkNow : Object.keys(bk).sort().pop();
        const bC = mk ? bk[mk] : null;
        const serie = bC ? { mesKey: mk, total: bC.total, entregados: bC.entreg, cumpl: bC.total ? Math.round(bC.entreg / bC.total * 100) : null, despachoP90: percentil(bC.lt, PCTL), entregaP90: percentil(bC.ltE, PCTL) } : null;
        // Calendario por día de compra (total/entregados): en seguimiento solo se persisten los
        // accionables, así que sin esto otro usuario vería el calendario todo en 0%.
        const calM = {};
        // "Cumplido" = entregado O listo para retirar: en Listo para retirar ya hicimos nuestra parte
        // (falta que el cliente lo retire), igual que en la definición de atrasos. Así un día sin
        // pedidos pendientes/atrasados llega a 100% (antes quedaba por debajo por los listos para retirar).
        efectivos.forEach(r => { const d = parseFecha(r.fecha); if (!d) return; const dia = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); const b = calM[dia] || (calM[dia] = { dia, total: 0, entregados: 0 }); b.total++; if (r.entregado || r.listoRetiro) b.entregados++; });
        const calArr = Object.values(calM).sort((a, b) => a.dia.localeCompare(b.dia));
        // ── Desgloses por tienda/depósito (para los KPI clickeables) ──
        // Cumplimiento y tiempos por tienda (canal de venta). El cumplimiento mide la PROMESA (entregado
        // dentro de PROMESA_DH días háb.), no el crudo entregados/total: entregado tarde = incumplido,
        // recién comprado aún en plazo = no evaluable (fuera).
        const promEval = r => {
          if (r.cumplido) {
            const dhE = r.fechaCumplido && String(r.fechaCumplido).trim() && r.fechaCumplido !== "-" ? diasHabEntre(r.fecha, r.fechaCumplido) : null;
            return dhE == null ? null : (dhE <= PROMESA_DH);   // null = entregado sin fecha (no evaluable)
          }
          return (r.dias != null ? r.dias : 0) > PROMESA_DH ? false : null;  // vencido sin entregar = incumple; en plazo = fuera
        };
        const porTienda = {};
        let promEvalTot = 0, promEnPlazoTot = 0;
        // Histogramas de tiempos en DÍAS HÁBILES (compactos), para poder recalcular en pantalla el
        // cumplimiento con CUALQUIER promesa que elija el equipo, sin volver a cruzar los archivos:
        //   histEnt  = entregados con fecha, por días hábiles compra → entrega
        //   histPend = SIN entregar (no cancelados), por días hábiles desde la compra (para "promesa vencida")
        //   histDesp = por días hábiles compra → despacho del WMS
        // Índice = días hábiles (0..HCAP); el último índice acumula todo lo que supera HCAP.
        const HCAP = 20;
        const histDe = arr => { const h = new Array(HCAP + 2).fill(0); (arr || []).forEach(d => { h[d < 0 ? 0 : d > HCAP ? HCAP + 1 : d]++; }); return h; };
        // Acumula los tiempos (entrega/pendiente/despacho) de un pedido en un sub-bucket (para segmentar por región).
        const emptyBk = () => ({ dhEnt: [], dhPend: [], dhDesp: [] });
        const acumTiempos = (dest, r) => {
          if (r.cumplido) { const dhE = r.fechaCumplido && String(r.fechaCumplido).trim() && r.fechaCumplido !== "-" ? diasHabEntre(r.fecha, r.fechaCumplido) : null; if (dhE != null) dest.dhEnt.push(dhE); }
          else dest.dhPend.push(r.dias != null ? r.dias : 0);
          if (!r.clickCollect && r.fechaDespacho && r.fechaDespacho !== "-") { const dhD = diasHabEntre(r.fecha, r.fechaDespacho); if (dhD != null) dest.dhDesp.push(dhD); } // C&C: los prepara/retira la sucursal → sin despacho nuestro
        };
        const histTriple = src => ({ histEnt: histDe(src.dhEnt), histPend: histDe(src.dhPend), histDesp: histDe(src.dhDesp) });
        efectivos.forEach(r => {
          const t = r.tienda || "-";
          const b = porTienda[t] || (porTienda[t] = { tienda: t, total: 0, entregadosRaw: 0, evalN: 0, enPlazo: 0, lt: [], ltE: [], dhEnt: [], dhPend: [], dhDesp: [], reg: { montevideo: emptyBk(), interior: emptyBk() } });
          b.total++;
          if (r.entregado) b.entregadosRaw++;
          const pe = promEval(r);
          if (pe != null) { b.evalN++; promEvalTot++; if (pe) { b.enPlazo++; promEnPlazoTot++; } }
          if (r.leadtime != null) b.lt.push(r.leadtime);
          if (r.leadtimeEntrega != null) b.ltE.push(r.leadtimeEntrega);
          acumTiempos(b, r);
          if (r.region === "montevideo" || r.region === "interior") acumTiempos(b.reg[r.region], r);
        });
        const cumplPorTienda = Object.values(porTienda).map(b => ({ tienda: b.tienda, total: b.total, entregados: b.entregadosRaw, evalN: b.evalN, enPlazo: b.enPlazo, pct: b.evalN ? Math.round(b.enPlazo / b.evalN * 100) : null, despachoP90: percentil(b.lt, PCTL), entregaP90: percentil(b.ltE, PCTL), histEnt: histDe(b.dhEnt), histPend: histDe(b.dhPend), histDesp: histDe(b.dhDesp), reg: { montevideo: histTriple(b.reg.montevideo), interior: histTriple(b.reg.interior) } })).filter(x => x.total > 0).sort((a, b) => (a.pct == null ? 999 : a.pct) - (b.pct == null ? 999 : b.pct));
        const concatReg = key => Object.values(porTienda).reduce((acc, b) => { acc.dhEnt.push(...b.reg[key].dhEnt); acc.dhPend.push(...b.reg[key].dhPend); acc.dhDesp.push(...b.reg[key].dhDesp); return acc; }, emptyBk());
        const histByReg = { montevideo: histTriple(concatReg("montevideo")), interior: histTriple(concatReg("interior")) };
        const histEntrega = histDe([].concat(...Object.values(porTienda).map(b => b.dhEnt)));
        const histPendGlob = histDe([].concat(...Object.values(porTienda).map(b => b.dhPend)));
        const histDespGlob = histDe([].concat(...Object.values(porTienda).map(b => b.dhDesp)));
        const tasaCumplProm = promEvalTot ? Math.round(promEnPlazoTot / promEvalTot * 100) : 0;
        // ── HISTÓRICO MENSUAL de logística (cumplimiento + volumen), por región. Se ACUMULA en el snapshot:
        // cargar meses viejos una sola vez los deja guardados; los cruces siguientes solo pisan los meses
        // que traen (upsert por mes) y conservan el resto. No cambia nada de lo actual: es info que se suma.
        const mesDe = r => { const d = parseFecha(r.fecha); return d ? d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") : null; };
        const scopesReg = { todas: () => true, montevideo: r => r.region === "montevideo", interior: r => r.region === "interior" };
        const mesesAcum = {};
        efectivos.forEach(r => {
          const m = mesDe(r); if (!m) return;
          const mm = mesesAcum[m] || (mesesAcum[m] = {});
          ["todas", "montevideo", "interior"].forEach(sc => {
            if (!scopesReg[sc](r)) return;
            const b = mm[sc] || (mm[sc] = { total: 0, entregados: 0, dhEnt: [], dhPend: [] });
            b.total++;
            if (r.entregado) b.entregados++;
            if (r.cumplido) { const dhE = r.fechaCumplido && String(r.fechaCumplido).trim() && r.fechaCumplido !== "-" ? diasHabEntre(r.fecha, r.fechaCumplido) : null; if (dhE != null) b.dhEnt.push(dhE); }
            else b.dhPend.push(r.dias != null ? r.dias : 0);
          });
        });
        const mesesCross = {};
        Object.keys(mesesAcum).forEach(m => { mesesCross[m] = {}; Object.keys(mesesAcum[m]).forEach(sc => { const b = mesesAcum[m][sc]; mesesCross[m][sc] = { total: b.total, entregados: b.entregados, histEnt: histDe(b.dhEnt), histPend: histDe(b.dhPend) }; }); });
        const serieMeses = { ...((operSnap && operSnap.serie && operSnap.serie.serieMeses) || {}), ...mesesCross };
        // Solicitud de stock a TIENDAS (Deposito pedido ≠ 9/0): tiempo confirmado → procesado en central.
        // +2 días hábiles sin procesar = la tienda no envió la mercadería o se extravió.
        const colFConf = findCol(sW, [/^fecha\s*confirmad/i]);
        const colFProc = findCol(sW, [/^fecha\s*procesad/i]);
        const colDestino = findCol(sW, [/^destino$/i]);
        let stockTiendas = [];
        if (colFConf && colFProc) {
          // nombre de cada depósito-tienda: viene embebido en "Destino" ("Gral. Flores - 301").
          // Algunos códigos nunca aparecen ahí → nombres conocidos a mano.
          const NOM_FIJO = { "9": "Depósito central", "1601": "Tres Cruces", "1701": "Nuevo Centro" };
          const nomDepo = {};
          rowsB.forEach(r => { const m = String(r[colDestino] || "").trim().match(/^(.*?)[\s.-]*[-–]\s*(\d{3,4})\s*$/); if (m && !nomDepo[m[2]]) nomDepo[m[2]] = m[1].replace(/\s+/g, " ").trim(); });
          const porDepo = {};
          rowsB.forEach(r => {
            const depo = String(r[colDep] || "").trim();
            if (!depo || depo === "0") return; // incluye al central (9); el 0 es "sin stock", no un origen
            const fc = parseFecha(r[colFConf]); if (!fc) return;
            const fp = parseFecha(r[colFProc]);
            const b = porDepo[depo] || (porDepo[depo] = { depo, nombre: NOM_FIJO[depo] || nomDepo[depo] || ("Depo " + depo), conf: 0, dias: [], diasDesp: [], pend: 0, pendAtr: 0 });
            b.conf++;
            if (fp) { const dh = diasHabEntre(fc, fp); if (dh != null) b.dias.push(dh); }
            else { b.pend++; if ((diasHab(r[colFConf]) || 0) > 2) b.pendAtr++; }
            // Tramo completo hasta que el CENTRAL despacha (confirmado → despachado): incluye el tiempo
            // del depo central, que también hay que medir.
            const fd = parseFecha(r[colFechDesp]);
            if (fd) { const dhT = diasHabEntre(fc, fd); if (dhT != null) b.diasDesp.push(dhT); }
          });
          stockTiendas = Object.values(porDepo).map(b => {
            const mas2 = b.dias.filter(x => x > 2).length;
            return { depo: b.depo, nombre: b.nombre, conf: b.conf, mas2, pctMas2: b.dias.length ? Math.round(mas2 / b.dias.length * 100) : 0, p90: percentil(b.dias, PCTL), p90Desp: percentil(b.diasDesp, PCTL), pend: b.pend, pendAtr: b.pendAtr };
          }).sort((a, b) => (a.depo === "9" ? -1 : b.depo === "9" ? 1 : 0) || b.pctMas2 - a.pctMas2 || b.conf - a.conf);
        }
        // Cumplimiento DE LA PROMESA del mes: % de pedidos entregados DENTRO de PROMESA_DH días hábiles.
        // Universo evaluable = entregados con fecha de entrega + no entregados con la promesa ya vencida.
        // Un pedido entregado TARDE cuenta como incumplimiento (antes contaba como éxito si ya estaba
        // entregado). Los recién comprados sin entregar todavía no se pueden juzgar → quedan afuera.
        // Cancelados afuera (no son incumplimiento de entrega).
        let maduros = null;
        if (mk) {
          const delMes = efectivos.filter(r => { const d = parseFecha(r.fecha); return d && (d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")) === mk; });
          let evalTotal = 0, enPlazo = 0; const dhEntMes = [], dhPendMes = [];
          delMes.forEach(r => {
            if (r.cumplido) {
              const dhE = r.fechaCumplido && String(r.fechaCumplido).trim() && r.fechaCumplido !== "-" ? diasHabEntre(r.fecha, r.fechaCumplido) : null;
              if (dhE == null) return; // cumplido sin fecha (entrega/listo): no se puede juzgar
              evalTotal++; if (dhE <= PROMESA_DH) enPlazo++; dhEntMes.push(dhE);
            } else {
              dhPendMes.push(r.dias != null ? r.dias : 0);
              if ((r.dias != null ? r.dias : 0) > PROMESA_DH) evalTotal++; // promesa vencida sin cumplir = incumplida
            }
          });
          // Guardamos también los histogramas del mes para poder recalcular el % con otra promesa en pantalla.
          if (evalTotal) maduros = { total: evalTotal, entregados: enPlazo, pct: Math.round(enPlazo / evalTotal * 100), histEnt: histDe(dhEntMes), histPend: histDe(dhPendMes) };
        }
        const snap = {
          id: "ultimo",
          total: finalRows.length,
          atrasados: finalRows.filter(r => r.atrasado && !esCancEf(r)).length,
          criticos: finalRows.filter(r => r.critico && !esCancEf(r)).length,
          no_despacho: finalRows.filter(r => r.posibleNoDespacho && !esCancEf(r)).length,
          estancados: finalRows.filter(r => r.estancado && !esCancEf(r)).length,
          depo0: finalRows.filter(r => r.sinStock && !esCancEf(r)).length,
          sin_wms: finalRows.filter(r => r.sinWMS && !esCancEf(r)).length,
          entregados: efectivos.filter(r => r.entregado).length,
          // Tasa histórica sobre pedidos EFECTIVOS (sin cancelados): un cancelado no incumple la entrega
          tasa_cumpl: tasaCumplProm,   // % que cumplió la promesa (entregado ≤ PROMESA_DH días háb.)
          leadtime_despacho: percentil(lt, PCTL),
          leadtime_entrega: percentil(ltE, PCTL),
          // El calendario y los desgloses van TAMBIÉN adentro de "serie" (columna jsonb que ya existe
          // en la tabla): así se comparten sin necesidad de correr ninguna migración.
          serie: { ...(serie || {}), calendario: calArr, maduros, promesaDH: promesaDH, deptoInfo, depoInfo, serieMeses, desgloses: { cumplPorTienda, stockTiendas, histEntrega, histPend: histPendGlob, histDesp: histDespGlob, histByReg } },
          calendario: calArr,
          actualizado: new Date().toISOString()
        };
        setOperSnap(snap); // que las tarjetas de volumen/cumplimiento muestren mi cruce al instante
        let { error } = await supa.from("operativa_snapshot").upsert(snap, { onConflict: "id" });
        // Si la tabla todavía no tiene la columna "calendario" (falta correr la migración), guardar
        // el resto del snapshot igual: mejor números compartidos sin calendario que nada.
        if (error && /calendario/i.test(error.message || "")) {
          const { calendario: _cal, ...sinCal } = snap;
          ({ error } = await supa.from("operativa_snapshot").upsert(sinCal, { onConflict: "id" }));
        }
        // Si falla (tabla/columna/permiso), lo mostramos en vez de tragarlo en silencio.
        setSnapError(error ? (error.message || error.details || JSON.stringify(error)) : null);
      } catch (e) { setSnapError(e.message || String(e)); }
    })();
  };
  // Cancelado "efectivo": Fenicio/WMS no siempre marcan la cancelación (el pedido queda en "Listo para
  // enviar"), pero el equipo la anota en el comentario ("Cancelado…"). Si el comentario dice cancelado/
  // anulado, el pedido está resuelto → NO cuenta como atrasado/crítico/estancado/etc.
  const esCancEf = r => r.cancelado || (Array.isArray(r.historial) && r.historial.some(h => /cancel|anul/i.test(String(h && h.t || ""))));
  // Vista filtrada por la tienda elegida arriba. "todas" = todo (coincide con Resumen). Todos los KPIs
  // y listados de abajo se calculan sobre resVista → cada tienda ve sus propios números.
  const porTiendaVista = tiendaVista !== "todas";
  const resVista = !resultado ? null : (porTiendaVista ? resultado.filter(r => (r.tienda || "") === tiendaVista) : resultado);
  const atrasados = resVista ? resVista.filter(r => r.atrasado && !esCancEf(r)) : [];
  const criticos = resVista ? resVista.filter(r => r.critico && !esCancEf(r)) : [];
  const inconsistentes = resVista ? resVista.filter(r => r.inconsistente && !esCancEf(r)) : [];
  const noDespacho = resVista ? resVista.filter(r => r.posibleNoDespacho && !esCancEf(r)) : [];
  // Estancado y atrasado son métricas independientes: un pedido puede ser estancado, atrasado, o ambos.
  const estancados = resVista ? resVista.filter(r => r.estancado && !esCancEf(r)) : [];
  // En tránsito: ya despachados, en camino al cliente (no son atraso). Se ordenan mostrando primero los
  // que llevan más días en tránsito. "transitoLargo" = +2 días hábiles desde el despacho.
  const enTransitoArr = resVista ? resVista.filter(r => r.enTransito && !esCancEf(r)).sort((a, b) => (b.diasTransito || 0) - (a.diasTransito || 0)) : [];
  const transitoLargoN = enTransitoArr.filter(r => r.transitoLargo).length;
  const sinWMS = resVista ? resVista.filter(r => r.sinWMS && !esCancEf(r)) : [];
  const sinStockArr = resVista ? resVista.filter(r => r.sinStock && !esCancEf(r)) : [];
  const ccDepo9Arr = resVista ? resVista.filter(r => r.ccDepo9) : [];
  // Cancelado PROBABLE (inferido: sin Fenicio + WMS procesado). Lista aparte para que Sol lo verifique.
  const probableCancel = resVista ? resVista.filter(esProbCancel) : [];
  // Cancelados en una sola plataforma (WMS o Fenicio, pero no ambas) → a revisar / alinear.
  // Los "cancelado probable" salen de acá: no son para alinear (un pedido procesado no se cancela en WMS).
  const cancelDiscreps = resVista ? resVista.filter(r => r.cancelDiscrep && !esProbCancel(r)) : [];
  // Cifras de las tarjetas: si NO estoy cruzando en vivo, uso el snapshot COMPARTIDO (las MISMAS que ve
  // Resumen) para que Operativa y Resumen coincidan siempre. Al recargar la pestaña se re-derivan los
  // pedidos guardados con la fecha de hoy (más días encima) e inflan el conteo; el snapshot es la cifra
  // oficial del último cruce. Al cruzar archivos (cruceEnSesion) uso el cálculo en vivo.
  // Para "todas" y sin cruce en vivo, las tarjetas usan el snapshot COMPARTIDO (coinciden con Resumen).
  // Para una tienda puntual se cuentan los pedidos de esa tienda (resVista) — el snapshot es global.
  const usarSnap = !cruceEnSesion.current && !!operSnap && !porTiendaVista;
  const nAtrasados = usarSnap ? (operSnap.atrasados || 0) : atrasados.length;
  const nCriticos = usarSnap ? (operSnap.criticos || 0) : criticos.length;
  const nNoDespacho = usarSnap ? (operSnap.no_despacho || 0) : noDespacho.length;
  const nEstancados = usarSnap ? (operSnap.estancados || 0) : estancados.length;
  const nDepo0 = usarSnap ? (operSnap.depo0 || 0) : sinStockArr.length;
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
  // ── Histogramas de tiempos (días hábiles) y helpers para recalcular la promesa en pantalla ──
  const HCAP_V = 20;
  const histBuild = arr => { const h = new Array(HCAP_V + 2).fill(0); (arr || []).forEach(d => { h[d < 0 ? 0 : d > HCAP_V ? HCAP_V + 1 : d]++; }); return h; };
  const histTotal = h => (h || []).reduce((a, b) => a + b, 0);
  const histWithin = (h, n) => { if (!h) return 0; let s = 0; for (let d = 0; d <= Math.min(n, h.length - 1); d++) s += h[d] || 0; return s; };
  const histAbove = (h, n) => histTotal(h) - histWithin(h, n);
  const histPctWithin = (h, n) => { const t = histTotal(h); return t ? Math.round(histWithin(h, n) / t * 100) : null; };
  const histPctl = (h, p) => { const t = histTotal(h); if (!t) return null; const target = t * p / 100; let s = 0; for (let d = 0; d < h.length; d++) { s += h[d] || 0; if (s >= target) return d; } return h.length - 1; };
  const histMediana = h => histPctl(h, 50);
  // Cumplimiento de la promesa para un N cualquiera, a partir de los histogramas (idéntico a promEval en N=5):
  // en plazo = entregados en ≤N ; evaluables = entregados(con fecha) + sin entregar con promesa (N) vencida.
  const cumplHist = (hEnt, hPend, n) => { const enPlazo = histWithin(hEnt, n); const evalN = histTotal(hEnt) + histAbove(hPend, n); return { enPlazo, evalN, pct: evalN ? Math.round(enPlazo / evalN * 100) : null }; };
  // Histogramas por tienda de lo cargado en ESTA sesión (para verlo en vivo antes de que viaje el snapshot).
  const histsLiveDe = rows => {
    const dhEnt = [], dhPend = [], dhDesp = [];
    (rows || []).forEach(r => {
      if (r.cancelado) return; // los cancelados no cuentan (igual que en el cruce, que usa "efectivos")
      if (r.cumplido) { const e = r.fechaCumplido && String(r.fechaCumplido).trim() && r.fechaCumplido !== "-" ? diasHabEntre(r.fecha, r.fechaCumplido) : null; if (e != null) dhEnt.push(e); }
      else dhPend.push(r.dias != null ? r.dias : 0);
      if (!r.clickCollect && r.fechaDespacho && r.fechaDespacho !== "-") { const d = diasHabEntre(r.fecha, r.fechaDespacho); if (d != null) dhDesp.push(d); } // C&C fuera del despacho (los maneja la sucursal)
    });
    return { histEnt: histBuild(dhEnt), histPend: histBuild(dhPend), histDesp: histBuild(dhDesp) };
  };
  // ── Evolución MENSUAL de los KPIs operativos (agrupado por mes de COMPRA) ──
  // Para cada mes calculamos la tasa de cumplimiento y los tiempos por percentil P90,
  // así se ve la tendencia y no solo el número global.
  const MES_NOM_T = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const mesCompra = r => { const d = parseFecha(r.fecha); return d ? d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") : null; };
  const fmtMesT = m => MES_NOM_T[(+m.split("-")[1]) - 1] + " " + m.slice(2, 4);
  const bucketsTend = {};
  (resultado || []).forEach(r => {
    const m = mesCompra(r); if (!m) return;
    const b = bucketsTend[m] || (bucketsTend[m] = { total: 0, entreg: 0, lt: [], ltE: [] });
    b.total++;
    if (r.entregado) b.entreg++;
    if (r.leadtime != null) b.lt.push(r.leadtime);
    if (r.leadtimeEntrega != null) b.ltE.push(r.leadtimeEntrega);
  });
  // Mes corriente (o el último con datos si el mes actual aún no tiene pedidos cargados)
  const mesesTend = Object.keys(bucketsTend).sort();
  const mesCorrienteKey = new Date().toISOString().slice(0, 7);
  const mesCurKey = bucketsTend[mesCorrienteKey] ? mesCorrienteKey : (mesesTend.length ? mesesTend[mesesTend.length - 1] : mesCorrienteKey);
  const bCur = bucketsTend[mesCurKey] || null;
  const cumplCur = bCur && bCur.total ? Math.round(bCur.entreg / bCur.total * 100) : null;
  const despCur = bCur ? percentil(bCur.lt, PCTL) : null;
  const entCur = bCur ? percentil(bCur.ltE, PCTL) : null;
  // ── Números de VOLUMEN / cumplimiento: salen del snapshot COMPARTIDO (iguales a Resumen y a lo que
  // ve todo el equipo). Si todavía no hay snapshot, caen a lo calculado de lo cargado en esta sesión. ──
  // "serie" ahora también transporta el calendario; solo cuenta como serie mensual si trae mesKey.
  const serieSnap = operSnap && operSnap.serie && operSnap.serie.mesKey ? operSnap.serie : null;
  // Desgloses por tienda/depósito del último cruce (viajan dentro de serie, compartidos con el equipo)
  const desgSnap = operSnap && operSnap.serie && operSnap.serie.desgloses ? operSnap.serie.desgloses : null;
  const madurosSnap = operSnap && operSnap.serie && operSnap.serie.maduros ? operSnap.serie.maduros : null;
  // Entrada de cumplimiento/tiempos de la tienda elegida (del snapshot). null = "todas" o sin dato.
  const ctv = porTiendaVista && desgSnap ? (desgSnap.cumplPorTienda || []).find(x => x.tienda === tiendaVista) || null : null;
  const entregadosVista = resVista ? resVista.filter(r => r.entregado) : [];
  // Tarjetas de volumen: para "todas" salen del snapshot global (= Resumen); para una tienda salen de su
  // desglose (cumplPorTienda) y caen a lo calculado en vivo si el snapshot no lo trae.
  const volTotal = porTiendaVista ? (ctv ? ctv.total : (resVista ? resVista.length : 0)) : (operSnap ? (operSnap.total || 0) : (resultado ? resultado.length : 0));
  const volEntreg = porTiendaVista ? (ctv ? (ctv.entregados || 0) : entregadosVista.length) : (operSnap ? (operSnap.entregados || 0) : entregadosArr.length);
  // ── Histogramas VIGENTES (de la vista actual): en vivo si cruzamos en esta sesión, del snapshot si no ──
  // Con ellos recalculamos en pantalla el cumplimiento para la promesa elegida (promesaDH), sin re-cruzar.
  // También respetan la REGIÓN elegida (Montevideo / Interior), porque la promesa no es igual en todo el país.
  const porRegion = regionVista !== "todas";
  const resVistaReg = porRegion ? (resVista || []).filter(r => r.region === regionVista) : resVista;
  const histsLive = cruceEnSesion.current ? histsLiveDe(resVistaReg) : null;
  // Base del snapshot (tienda elegida o global) y, si hay corte por región, su sub-histograma de esa región.
  const snapBase = porTiendaVista ? ctv : (desgSnap ? { histEnt: desgSnap.histEntrega, histPend: desgSnap.histPend, histDesp: desgSnap.histDesp, reg: desgSnap.histByReg } : null);
  const snapReg = snapBase ? (porRegion ? (snapBase.reg && snapBase.reg[regionVista]) || null : snapBase) : null;
  const histEntV = histsLive ? histsLive.histEnt : (snapReg && snapReg.histEnt) || null;
  const histPendV = histsLive ? histsLive.histPend : (snapReg && snapReg.histPend) || null;
  const histDespV = histsLive ? histsLive.histDesp : (snapReg && snapReg.histDesp) || null;
  // Cumplimiento de la promesa (recalculado con promesaDH). Cae al valor guardado si no hay histogramas (snap viejo).
  const cumplV = histEntV ? cumplHist(histEntV, histPendV, promesaDH) : null;
  const volTasa = cumplV && cumplV.pct != null ? cumplV.pct : (porTiendaVista ? (ctv ? ctv.pct : 0) : (operSnap ? (operSnap.tasa_cumpl || 0) : tasaCumpl));
  // Tiempo de despacho / entrega TÍPICOS (mediana en días hábiles), recalculados de los histogramas.
  const volDesp = histDespV && histTotal(histDespV) ? histMediana(histDespV) : (porTiendaVista ? (ctv ? ctv.despachoP90 : null) : (operSnap ? operSnap.leadtime_despacho : leadtimeProm));
  const volEnt = histEntV && histTotal(histEntV) ? histMediana(histEntV) : (porTiendaVista ? (ctv ? ctv.entregaP90 : null) : (operSnap ? operSnap.leadtime_entrega : leadtimeEntProm));
  // Distribución acumulada del tiempo de entrega (para el panel "¿listos para bajar la promesa?"), en vivo con promesaDH.
  const distTramos = Array.from(new Set([2, 3, 5, 7, promesaDH])).filter(d => d >= 1).sort((a, b) => a - b);
  const distEnt = { n: histEntV ? histTotal(histEntV) : 0, tramos: distTramos.map(d => ({ d, pct: histEntV ? histPctWithin(histEntV, d) : null })) };
  // ── Evolución MENSUAL (histórico acumulado en el snapshot): volumen + cumplimiento por mes, respetando
  // la región elegida. El cumplimiento se recalcula con la promesa actual (promesaDH). Solo lectura.
  const serieMesesSnap = (operSnap && operSnap.serie && operSnap.serie.serieMeses) || null;
  const evolMeses = serieMesesSnap ? Object.keys(serieMesesSnap).sort().map(m => {
    const b = serieMesesSnap[m] && serieMesesSnap[m][regionVista];
    if (!b) return { mes: m, total: 0, entregados: 0, pct: null };
    const c = cumplHist(b.histEnt, b.histPend, promesaDH);
    return { mes: m, total: b.total || 0, entregados: b.entregados || 0, pct: c.pct };
  }) : [];
  const cumplShown = serieSnap ? serieSnap.cumpl : cumplCur;
  const despShown = serieSnap ? serieSnap.despachoP90 : despCur;
  const entShown = serieSnap ? serieSnap.entregaP90 : entCur;
  const mesShownKey = serieSnap ? serieSnap.mesKey : mesCurKey;
  const entregMesShown = serieSnap ? serieSnap.entregados : (bCur ? bCur.entreg : null);
  const totalMesShown = serieSnap ? serieSnap.total : (bCur ? bCur.total : null);
  const fmtMesLargo = m => ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][(+m.split("-")[1]) - 1] + " " + m.slice(0, 4);
  // % de cumplimiento de entrega por día de compra (para el calendario)
  // Calendario COMPARTIDO del último cruce: puede venir en la columna "calendario" o adentro de
  // "serie" (si la tabla no tiene la columna nueva). null = el último cruce no lo guardó.
  const calComp = operSnap ? (Array.isArray(operSnap.calendario) && operSnap.calendario.length ? operSnap.calendario
    : (operSnap.serie && Array.isArray(operSnap.serie.calendario) && operSnap.serie.calendario.length ? operSnap.serie.calendario : null)) : null;
  const calData = useMemo(() => {
    // Sin cruce en esta sesión: usar el calendario COMPARTIDO del snapshot. Los pedidos guardados en
    // seguimiento son solo los accionables (sin entregados), y calcular de ahí daría todo 0%.
    if (!cruceEnSesion.current && calComp) {
      return calComp.map(x => ({ ...x, pct: x.total ? Math.round(x.entregados / x.total * 100) : 0 })).sort((a, b) => a.dia.localeCompare(b.dia));
    }
    if (!resultado) return [];
    const m = {};
    resultado.forEach(r => {
      const d = parseFecha(r.fecha);
      if (!d) return;
      const dia = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      if (!m[dia]) m[dia] = { dia, total: 0, entregados: 0 };
      m[dia].total++; if (r.entregado || r.listoRetiro) m[dia].entregados++;
    });
    return Object.values(m).map(x => ({ ...x, pct: x.total ? Math.round(x.entregados / x.total * 100) : 0 })).sort((a, b) => a.dia.localeCompare(b.dia));
  }, [resultado, calComp]);
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
        "Dias habiles (desde compra)": r.dias, "Fecha ult. movimiento WMS": r.fechaEstado || "", "Deposito": r.deposito, "Fecha despacho": r.fechaDespacho,
        "Forma entrega": r.formaEntrega || (r.clickCollect ? "Click & Collect" : r.pickup ? "Pickup" : ""),
        "Tiempo a despacho (dias)": r.leadtime != null ? r.leadtime : "",
        "Tiempo de entrega (dias)": r.leadtimeEntrega != null ? r.leadtimeEntrega : "",
        "Fecha entrega": r.fechaEntrega || "",
        "Importe": r.importe,
        "Atrasado": r.atrasado ? "Si" : "", "Critico": r.critico ? "Si" : "",
        "Validar despacho": r.posibleNoDespacho ? "Si" : "", "Estancado": r.estancado ? "Si" : "",
        "Depo 0": r.sinStock ? "Si" : "", "C&C a depo 9": r.ccDepo9 ? "Si" : "", "Entregado": r.entregado ? "Si" : "",
        "Cancelado (WMS o Fenicio)": r.cancelado ? "Si" : "", "Cancel. en una sola plataforma": r.cancelDiscrep ? "Si" : "",
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
  const vistaBase = vistaTab === "criticos" ? criticos : vistaTab === "nodespacho" ? noDespacho : vistaTab === "estancados" ? estancados : vistaTab === "depo0" ? sinStockArr : vistaTab === "sinwms" ? sinWMS : vistaTab === "canceldiscrep" ? cancelDiscreps : vistaTab === "probcancel" ? probableCancel : vistaTab === "transito" ? enTransitoArr : vistaTab === "todos" ? (resultado || []) : atrasados;
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
  // Métrica compacta (informativa). Clickable si tiene tab (filtra la tabla) u onClick (abre desglose).
  const MetricCard = ({ label, value, color, tab, sub, onClick, activoCard }) => /*#__PURE__*/React.createElement(tab || onClick ? "button" : "div", {
    onClick: onClick || (tab ? () => { setVistaTab(tab); setPage(0); } : undefined),
    className: "bg-white rounded-xl border px-3 py-2 text-left " + (tab || onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""),
    style: { borderColor: (tab && vistaTab === tab) || activoCard ? color : C.line, borderWidth: (tab && vistaTab === tab) || activoCard ? 2 : 1 }
  }, /*#__PURE__*/React.createElement("div", { className: "text-[10px] font-bold uppercase", style: { color: C.gray, lineHeight: 1.2 } }, label),
     /*#__PURE__*/React.createElement("div", { className: "text-xl font-black fraunces tabular-nums", style: { color, lineHeight: 1.1 } }, value),
     sub && /*#__PURE__*/React.createElement("div", { className: "text-[10px]", style: { color: C.gray, lineHeight: 1.1 } }, sub));
  // Panel de DESGLOSE de un KPI (se abre al tocar la tarjeta): muestra qué tiendas/depósitos
  // están afectando el indicador. Los datos vienen del último cruce (compartidos vía snapshot).
  const DesglosePanel = ({ tipo }) => {
    const ce = React.createElement;
    const th = t => ce("th", { key: t, className: "px-3 py-2 text-left font-bold uppercase", style: { color: C.gray, fontSize: 10, whiteSpace: "nowrap" } }, t);
    const td = (v, extra) => ce("td", Object.assign({ className: "px-3 py-1.5", style: { fontSize: 12 } }, extra || {}), v);
    const caja = (titulo, nota, headers, filas) => ce("div", { className: "bg-white rounded-2xl border p-3", style: { borderColor: C.line } },
      ce("div", { className: "flex items-center justify-between flex-wrap gap-2 mb-1" },
        ce("span", { className: "text-sm font-bold" }, titulo),
        ce("button", { onClick: () => setKpiPanel(""), className: "text-xs font-bold px-3 py-1 rounded-lg", style: { background: "#EEF1F5", color: C.gray } }, "✕ Cerrar")),
      nota && ce("div", { className: "text-[11px] mb-2", style: { color: C.gray } }, nota),
      ce("div", { className: "overflow-auto" }, ce("table", { className: "w-full", style: { fontSize: 12 } },
        ce("thead", null, ce("tr", null, headers.map(th))), ce("tbody", null, filas))));
    if (!desgSnap) return caja("Desglose no disponible", "El último cruce se hizo con una versión anterior de la app y no guardó el desglose por tienda. Recargá la app (Ctrl+Shift+R) y volvé a cruzar los archivos.", [], []);
    const colPct = p => p >= 90 ? C.green : p >= 70 ? C.amber : C.red;
    if (tipo === "cumpl" || tipo === "entrega") {
      // Los tiempos de entrega y el cumplimiento por tienda ahora viven en el panel de Resumen (fusionados
      // con la promesa editable). Este desglose quedó solo para las solicitudes de stock a tiendas.
      return distPanel || caja("Tiempos", "Los tiempos de entrega y el cumplimiento por tienda están en la subsección “Tiempos y despacho”.", [], []);
    }
    const filas = (desgSnap.stockTiendas || []).map(t => ce("tr", { key: t.depo, style: { borderTop: "1px solid " + C.line, background: t.depo === "9" ? "#F6F8FB" : undefined } },
      td(t.nombre + " (" + t.depo + ")", { className: "px-3 py-1.5 font-semibold" }), td(t.conf),
      td(t.mas2 + " (" + t.pctMas2 + "%)", { className: "px-3 py-1.5 font-black", style: { color: t.pctMas2 >= 25 ? C.red : t.pctMas2 >= 10 ? C.amber : C.green } }),
      td(t.p90 != null ? t.p90 + " días háb." : "—"),
      td(t.p90Desp != null ? t.p90Desp + " días háb." : "—"),
      td(t.pendAtr ? t.pendAtr + " ⚠" : t.pend, { className: "px-3 py-1.5 " + (t.pendAtr ? "font-black" : ""), style: t.pendAtr ? { color: C.red } : undefined })));
    return caja("Despacho por depósito de origen — confirmado → procesado → despachado",
      "\"Procesado en\" mide cuánto tarda la mercadería confirmada en llegar a procesarse en el central (+2 días háb. sin procesar = no la enviaron o se extravió). \"Despachado en\" incluye además el tiempo del propio depósito central hasta despachar el pedido. Primero el central, después las tiendas de peor a mejor.",
      ["Origen", "Artículos", "Demorados (+2 días háb.)", "Procesado en", "Despachado en", "Sin procesar (vencidos ⚠)"], filas);
  };
  // Mini gráfico de evolución mensual para un KPI (barras por mes; resalta el último mes con dato)
  // Barra de progreso del CUMPLIMIENTO del mes corriente, con la meta 90–95% marcada.
  const ProgresoMes = () => {
    const ce = React.createElement;
    const META_MIN = 90, META_MAX = 95;
    // El % PROTAGONISTA es el EXIGIBLE: pedidos del mes con la promesa (PROMESA_DH días hábiles) ya vencida.
    // El % bruto del mes mezcla compras recientes que aún están en plazo (no son incumplimiento) y
    // contra una meta de 90–95% siempre se vería artificialmente bajo.
    // Recalculamos el % del mes con la promesa elegida (promesaDH) a partir de los histogramas guardados.
    const exigRe = madurosSnap && madurosSnap.histEnt ? cumplHist(madurosSnap.histEnt, madurosSnap.histPend, promesaDH) : null;
    const exig = madurosSnap;
    const pctHead = exigRe && exigRe.pct != null ? exigRe.pct : (exig ? exig.pct : cumplShown);
    const exigEnPlazo = exigRe ? exigRe.enPlazo : (exig ? exig.entregados : null);
    const exigTotal = exigRe ? exigRe.evalN : (exig ? exig.total : null);
    const col = pctHead == null ? C.gray : pctHead >= META_MIN ? C.green : pctHead >= 70 ? C.amber : C.red;
    const pctFill = Math.max(0, Math.min(100, pctHead || 0));
    return ce("div", { className: "bg-white rounded-2xl border p-4", style: { borderColor: C.line } },
      ce("div", { className: "flex items-baseline justify-between mb-2 flex-wrap gap-1" },
        ce("span", { className: "text-[11px] font-bold uppercase tracking-wide", style: { color: C.gray } },
          "Cumplimiento de ", ce("span", { style: { color: C.ink } }, fmtMesLargo(mesShownKey)),
          exig ? " — entregados dentro de la promesa (≤" + promesaDH + " días háb.)" : ""),
        ce("span", { className: "text-3xl font-black fraunces tabular-nums", style: { color: col } }, pctHead != null ? pctHead + "%" : "—")),
      ce("div", { style: { position: "relative", height: 18, borderRadius: 9, background: "#EEF1F5", overflow: "hidden" } },
        ce("div", { title: "Meta 90–95%", style: { position: "absolute", left: META_MIN + "%", width: (META_MAX - META_MIN) + "%", top: 0, bottom: 0, background: "rgba(14,138,95,0.22)" } }),
        ce("div", { style: { position: "absolute", left: 0, top: 0, bottom: 0, width: pctFill + "%", background: col, borderRadius: 9, transition: "width .3s" } })),
      ce("div", { style: { position: "relative", height: 13, marginTop: 2 } },
        ce("span", { style: { position: "absolute", left: META_MIN + "%", transform: "translateX(-50%)", fontSize: 9, color: C.gray } }, "90%"),
        ce("span", { style: { position: "absolute", left: META_MAX + "%", transform: "translateX(-50%)", fontSize: 9, color: C.gray } }, "95%")),
      ce("div", { className: "text-[11px] mt-1", style: { color: C.gray } },
        exig
          ? exigEnPlazo + " de " + exigTotal + " cumplieron la promesa (entregado en ≤" + promesaDH + " días háb.; el entregado tarde cuenta como incumplido) · meta 90–95%"
          : cumplShown != null
            ? entregMesShown + " de " + totalMesShown + " entregados · meta 90–95%"
            : "Cargá archivos para ver el cumplimiento del mes · meta 90–95%"),
      !exig && cumplShown != null && ce("div", { className: "text-[11px] mt-0.5 font-semibold", style: { color: C.amber } },
        "⚠ Este % mezcla compras recientes aún en plazo. Volvé a cruzar los archivos con la app actualizada para ver el % exigible (promesa de " + promesaDH + " dh vencida)."));
  };
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
    ["Pedido", "Acción / comentarios", "Acc.", "Tienda", "Fecha compra", "Estado Fenicio", "Estado WMS", "Días hábiles", "Deposito", "C&C"].map(h => /*#__PURE__*/React.createElement("th", {
      key: h, className: "px-3 py-2 text-left font-bold uppercase", style: { color: C.gray, fontSize: 10, whiteSpace: "nowrap" }
    }, h)))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => { const atrasadoVis = r.atrasado && !esCancEf(r); const rowBg = r.accionado ? "#F0FDF4" : atrasadoVis ? "#FFF5F5" : r.inconsistente ? "#FFFBEB" : "#fff"; return /*#__PURE__*/React.createElement("tr", {
    key: r.pedido || i,
    style: { background: rowBg }
  }, /*#__PURE__*/React.createElement("td", { className: "font-bold tabular-nums", style: { background: rowBg, whiteSpace: "nowrap" } }, /*#__PURE__*/React.createElement("span", { style: { userSelect: "all", cursor: "text" }, title: "Tocá para seleccionar y copiar" }, r.pedido), /*#__PURE__*/React.createElement("button", { onClick: e => { try { navigator.clipboard && navigator.clipboard.writeText(String(r.pedido)); } catch (_) {} const b = e.currentTarget, o = b.textContent; b.textContent = "✓"; setTimeout(() => { b.textContent = o; }, 900); }, title: "Copiar Nº de pedido", className: "ml-1 align-middle text-[11px] leading-none px-1 py-0.5 rounded", style: { background: "#EEF1F5", color: C.gray, cursor: "pointer", border: "none" } }, "⧉"), r.retenido && /*#__PURE__*/React.createElement("span", { className: "ml-1.5 align-middle text-[9px] font-bold px-1.5 py-px rounded-full", style: { background: "#EEF1F5", color: C.gray }, title: "Seguimiento de una carga anterior — no vino en los archivos actuales" }, "previo")),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2", style: { minWidth: 320, width: 340 } }, (r.historial && r.historial.length) ? /*#__PURE__*/React.createElement("div", { style: { maxHeight: 160, overflowY: "auto", marginBottom: 6 } }, r.historial.slice().reverse().map((h, j) => /*#__PURE__*/React.createElement("div", { key: j, className: "mb-1.5 pl-2", style: { borderLeft: "2px solid " + C.line } }, /*#__PURE__*/React.createElement("div", { className: "text-[10px] font-semibold", style: { color: C.gray } }, (h.f ? new Date(h.f).toLocaleDateString("es-UY") + " " + new Date(h.f).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" }) : "") + (h.a ? " · " + h.a : "")), /*#__PURE__*/React.createElement("div", { className: "text-[12px] leading-snug", style: { color: C.ink, whiteSpace: "pre-wrap", wordBreak: "break-word" } }, h.t)))) : /*#__PURE__*/React.createElement("div", { className: "text-[11px] italic mb-1", style: { color: C.amber } }, "Sin acción todavía"), /*#__PURE__*/React.createElement("input", { type: "text", "data-ci": i, placeholder: "Escribí y Enter (salta a la fila siguiente)…", onKeyDown: e => {
      // Estilo planilla: Enter guarda y baja al comentario de la fila siguiente (o Flecha ↓/↑ con Alt).
      const mover = paso => { const tbl = e.target.closest("table"); const t = tbl && tbl.querySelector('input[data-ci="' + (i + paso) + '"]'); if (t) { setTimeout(() => t.focus(), 0); } };
      if (e.key === "Enter") { e.preventDefault(); if (e.target.value.trim()) { agregarComentario(r.pedido, e.target.value); e.target.value = ""; } mover(1); }
      else if (e.key === "ArrowDown" && e.altKey) { e.preventDefault(); mover(1); }
      else if (e.key === "ArrowUp" && e.altKey) { e.preventDefault(); mover(-1); }
    }, onBlur: e => { if (e.target.value.trim()) { agregarComentario(r.pedido, e.target.value); e.target.value = ""; } }, className: "px-2 py-1.5 rounded-lg border text-xs", style: { borderColor: C.line, width: "100%" } })),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 text-center" }, /*#__PURE__*/React.createElement("input", { type: "checkbox", checked: !!r.accionado, onChange: e => guardarSeguimiento(r.pedido, { accionado: e.target.checked }), title: "Marcar como accionado" })),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 text-xs font-semibold", style: { color: C.gray } }, r.tienda),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2", style: { color: C.gray, whiteSpace: "nowrap" } }, r.fecha),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2" }, /*#__PURE__*/React.createElement("span", { style: { background: r.entregado ? C.greenS : C.soft, color: r.entregado ? C.green : C.blue, padding: "2px 6px", borderRadius: 6, fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" } }, r.estadoFen)),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2" }, /*#__PURE__*/React.createElement("span", { style: { background: r.sinWMS ? C.amberS : r.inconsistente ? C.amberS : "#F1F4F8", color: r.sinWMS ? C.amber : r.inconsistente ? C.amber : C.gray, padding: "2px 6px", borderRadius: 6, fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" } }, r.estadoWMS)),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2" }, /*#__PURE__*/React.createElement("span", { style: { fontWeight: 700, color: atrasadoVis ? C.red : r.dias > 1 ? C.amber : C.gray } }, r.dias != null ? r.dias : "—"), atrasadoVis && /*#__PURE__*/React.createElement("span", { style: { color: C.red } }, " ⚠"), r.enTransito && /*#__PURE__*/React.createElement("span", { title: r.diasTransito != null ? r.diasTransito + " días háb. en tránsito (desde el despacho)" : "En tránsito", style: { color: r.transitoLargo ? C.amber : "#0EA5E9", fontWeight: 700 } }, r.transitoLargo ? " 🚚+" + r.diasTransito + "d" : " 🚚")),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2", style: { color: C.gray, fontSize: 11, maxWidth: 150, whiteSpace: "normal", wordBreak: "break-word" } }, r.deposito),
    /*#__PURE__*/React.createElement("td", { className: "px-3 py-2" }, r.clickCollect ? /*#__PURE__*/React.createElement("span", { style: { background: "#EDE9FE", color: "#6D28D9", padding: "2px 6px", borderRadius: 6, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" } }, "C&C") : r.pickup ? /*#__PURE__*/React.createElement("span", { style: { background: "#DBEAFE", color: "#1D4ED8", padding: "2px 6px", borderRadius: 6, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" } }, "Pickup") : "")); })))));
  // ── Selector de TIENDA (grande, arriba) y menú lateral de subsecciones ──
  const ceEl = React.createElement;
  const selectorTienda = ceEl("div", { className: "flex flex-wrap gap-2" }, TIENDAS_OP.map(t => ceEl("button", {
    key: t, onClick: () => { setTiendaVista(t); setPage(0); },
    className: "px-4 py-2 rounded-xl text-sm font-black fraunces transition-colors",
    style: { background: tiendaVista === t ? C.blue : "#EEF1F5", color: tiendaVista === t ? "#fff" : C.ink }
  }, t === "todas" ? "Todas" : t)));
  // El Listado de pedidos vive DENTRO de "Resumen" (ver cuántos atrasados y CUÁLES en la misma vista).
  // El Calendario NO va en el menú: se muestra siempre arriba, unificando las 3 tiendas.
  const SUBS = [{ id: "resumen", l: "Resumen · KPIs" }, { id: "tiempos", l: "Tiempos y despacho" }, { id: "evolucion", l: "Evolución mensual" }, { id: "cargar", l: "Cargar archivos" }];
  const sidebar = ceEl(SubMenuNav, { items: SUBS.map(s => ({ id: s.id, label: s.l })), active: subOper, onSelect: setSubOper });
  // ── Panel SIEMPRE visible: promesa de entrega editable + tiempos por tienda (fusión de ambos paneles) ──
  // Mide COMPRA → ENTREGA al cliente en días hábiles. La promesa se cambia con − / + y todo se recalcula
  // en pantalla: sirve para ver si la operación está lista para bajarla (5 → 3) antes de comprometerse.
  const fmtDH = v => v == null ? "—" : ((v > HCAP_V ? HCAP_V + "+" : v) + " d");
  const fmtDias = v => v == null ? "—" : ((v > HCAP_V ? HCAP_V + "+" : v) + " días");
  const tiemposPorTienda = ((cruceEnSesion.current && resultado)
    ? (() => { const byT = {}; (resultado || []).forEach(r => { if (r.cancelado) return; if (porRegion && r.region !== regionVista) return; const t = r.tienda || "-"; (byT[t] || (byT[t] = [])).push(r); }); return Object.keys(byT).map(t => Object.assign({ tienda: t, total: byT[t].length }, histsLiveDe(byT[t]))); })()
    : (desgSnap && desgSnap.cumplPorTienda ? desgSnap.cumplPorTienda : []).map(t => { const src = porRegion ? (t.reg && t.reg[regionVista]) : t; return { tienda: t.tienda, total: porRegion ? (src ? histTotal(src.histEnt) + histTotal(src.histPend) : 0) : t.total, histEnt: src && src.histEnt, histPend: src && src.histPend, histDesp: src && src.histDesp }; }))
    .filter(t => t.histEnt && (histTotal(t.histEnt) || histTotal(t.histPend) || histTotal(t.histDesp)));
  const conHist = tiemposPorTienda.length > 0;
  const promesaStep = ceEl("div", { className: "flex items-center gap-2" },
    ceEl("span", { className: "text-[11px] font-bold uppercase", style: { color: C.gray } }, "Promesa"),
    ceEl("button", { onClick: () => setPromesa(promesaDH - 1), disabled: promesaDH <= 1, className: "w-7 h-7 rounded-lg font-black disabled:opacity-40", style: { background: C.soft, color: C.blue } }, "−"),
    ceEl("span", { className: "text-sm font-black fraunces tabular-nums", style: { color: C.ink, minWidth: 70, textAlign: "center" } }, promesaDH + " días háb."),
    ceEl("button", { onClick: () => setPromesa(promesaDH + 1), disabled: promesaDH >= 15, className: "w-7 h-7 rounded-lg font-black disabled:opacity-40", style: { background: C.soft, color: C.blue } }, "+"));
  // Corte por REGIÓN: hay datos si detectamos la columna Departamento (cruce actual) o si el snapshot los trae.
  // Diagnóstico del corte por región: el de esta sesión (deptoDiag) o el guardado en el snapshot (para
  // que se vea sin volver a cruzar). Así el cartel explica qué pasa aunque estés mirando lo compartido.
  const deptoDiagEff = deptoDiag || (operSnap && operSnap.serie && operSnap.serie.deptoInfo) || null;
  const depoDiagEff = depoDiag || (operSnap && operSnap.serie && operSnap.serie.depoInfo) || null;
  // Texto del diagnóstico de Depo 0: qué valores tiene la columna Depósito (para ver por qué da 0).
  const depoMsg = depoDiagEff
    ? ("No hay pedidos en Depo 0 (sin stock). Valores de tu columna “" + (depoDiagEff.colDep || "Depósito") + "”: " + Object.entries(depoDiagEff.vals || {}).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => k + " (" + n + ")").join(" · ") + ". Si tus Depo 0 traen otro valor (ej. “0 - Sin stock”), decímelo y ajusto la detección.")
    : "No hay pedidos en Depo 0 (sin stock).";
  const hayRegion = !!deptoCol || !!deptoDiagEff || !!(desgSnap && desgSnap.histByReg);
  const regionToggle = ceEl("div", { className: "flex items-center gap-1" },
    ceEl("span", { className: "text-[11px] font-bold uppercase mr-1", style: { color: C.gray } }, "Región"),
    [["todas", "Todas"], ["montevideo", "Montevideo"], ["interior", "Interior"]].map(([id, l]) => ceEl("button", {
      key: id, onClick: () => setRegionVista(id),
      className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
      style: { background: regionVista === id ? C.blue : "#EEF1F5", color: regionVista === id ? "#fff" : C.ink }
    }, l)));
  const distPanel = (distEnt.n > 0 || conHist || (hayRegion && porRegion)) ? ceEl("div", { className: "bg-white rounded-2xl border p-4 space-y-4", style: { borderColor: C.line } },
    ceEl("div", { className: "flex items-center justify-between flex-wrap gap-2" },
      ceEl("div", null,
        ceEl("span", { className: "text-sm font-black fraunces", style: { color: C.ink } }, "Promesa de entrega y tiempos"),
        ceEl("span", { className: "text-[11px] ml-2", style: { color: C.gray } }, (porTiendaVista ? tiendaVista + " · " : "") + (porRegion ? (regionVista === "montevideo" ? "Montevideo · " : "Interior · ") : "") + distEnt.n + " cumplidos con fecha")),
      ceEl("div", { className: "flex items-center gap-3 flex-wrap" }, hayRegion && regionToggle, promesaStep)),
    porRegion && distEnt.n === 0 && ceEl("div", { className: "text-[11px] rounded-lg px-3 py-2", style: { background: C.amberS, color: C.amber } },
      deptoDiagEff && !deptoDiagEff.col
        ? ceEl("span", null, "No encontré una columna de Departamento en tu Fenicio, así que no puedo separar Montevideo/Interior. Columnas de tu Fenicio: ", ceEl("b", null, (deptoDiagEff.cols || []).join(" · ")), ". Decime cuál trae el departamento del pedido y la conecto.")
        : deptoDiagEff && deptoDiagEff.col
          ? ("Detecté la columna “" + deptoDiagEff.col + "” pero quedaron " + deptoDiagEff.nMvd + " Montevideo y " + deptoDiagEff.nInt + " Interior (" + deptoDiagEff.nSin + " sin departamento, de " + deptoDiagEff.total + "). Si no coincide, revisá que esa columna traiga el departamento o decime cuál es.")
          : "No hay entregas con fecha para " + (regionVista === "montevideo" ? "Montevideo" : "Interior") + " en lo cargado. Volvé a cruzar los archivos (botón Cruzar en “Cargar archivos”) para poblar el corte por región."),
    ceEl("p", { className: "text-[11px]", style: { color: C.gray } }, "Cuenta como cumplido un pedido ENTREGADO o LISTO PARA RETIRAR (en C&C ya hicimos nuestra parte), y mide los días hábiles entre la COMPRA y ese momento. Abajo, qué % se cumplió dentro de cada plazo (acumulado). Cambiá la promesa con − / + para simular: si al bajar a ≤3 días caés muy por debajo del 90%, todavía no conviene bajarla. Los recién comprados que aún están en plazo no cuentan (todavía no se pueden juzgar); por eso este % puede ser más alto que el del calendario, que sí incluye lo reciente sin cumplir."),
    distEnt.n > 0 && ceEl("div", { className: "space-y-2" }, distEnt.tramos.map(t => {
      const esProm = t.d === promesaDH;
      const col = t.pct == null ? C.gray : t.pct >= 90 ? C.green : t.pct >= 70 ? C.amber : C.red;
      return ceEl("div", { key: t.d, className: "flex items-center gap-3" },
        ceEl("span", { className: "text-xs font-bold shrink-0", style: { color: esProm ? C.blue : C.ink, width: 78 } }, "≤ " + t.d + " días"),
        ceEl("div", { className: "flex-1 rounded-full overflow-hidden", style: { background: "#EEF1F5", height: 18, outline: esProm ? "2px solid " + C.blue : "none" } },
          ceEl("div", { className: "h-full rounded-full transition-all", style: { width: (t.pct || 0) + "%", background: col } })),
        ceEl("span", { className: "text-sm font-black fraunces tabular-nums shrink-0", style: { color: col, width: 46, textAlign: "right" } }, t.pct == null ? "—" : t.pct + "%"),
        esProm ? ceEl("span", { className: "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", style: { background: C.soft, color: C.blue } }, "promesa") : ceEl("span", { className: "shrink-0", style: { width: 62 } }));
    })),
    conHist && ceEl("div", null,
      ceEl("div", { className: "text-[11px] font-bold uppercase tracking-widest mb-1", style: { color: C.blue } }, "Por tienda (días hábiles)"),
      ceEl("div", { className: "overflow-auto" }, ceEl("table", { className: "w-full", style: { fontSize: 12 } },
        ceEl("thead", null, ceEl("tr", null, ["Tienda", "Entrega típica", "Despacho típico", "Cumple ≤" + promesaDH + "d", "Pedidos"].map(h => ceEl("th", { key: h, className: "px-3 py-2 text-left font-bold uppercase", style: { color: C.gray, fontSize: 10, whiteSpace: "nowrap" } }, h)))),
        ceEl("tbody", null, tiemposPorTienda.slice().sort((a, b) => (histMediana(b.histEnt) || 0) - (histMediana(a.histEnt) || 0)).map(t => {
          const cp = cumplHist(t.histEnt, t.histPend, promesaDH);
          const cpc = cp.pct == null ? C.gray : cp.pct >= 90 ? C.green : cp.pct >= 70 ? C.amber : C.red;
          return ceEl("tr", { key: t.tienda, style: { borderTop: "1px solid " + C.line } },
            ceEl("td", { className: "px-3 py-1.5 font-semibold" }, t.tienda),
            ceEl("td", { className: "px-3 py-1.5" }, fmtDH(histTotal(t.histEnt) ? histMediana(t.histEnt) : null)),
            ceEl("td", { className: "px-3 py-1.5" }, fmtDH(histTotal(t.histDesp) ? histMediana(t.histDesp) : null)),
            ceEl("td", { className: "px-3 py-1.5 font-black", style: { color: cpc } }, cp.pct == null ? "—" : cp.pct + "%"),
            ceEl("td", { className: "px-3 py-1.5" }, t.total));
        })))),
      ceEl("p", { className: "text-[10px] mt-1", style: { color: C.gray } }, "Entrega/Despacho típico = la mitad de los pedidos llega antes de ese plazo (mediana). El DESPACHO excluye los Click & Collect (los prepara y entrega la sucursal, no es logística nuestra). Cumple = de los pedidos ya juzgables, el % entregado o listo para retirar dentro de la promesa; los recién comprados que aún están en plazo no cuentan y un cumplimiento tarde cuenta como incumplido.")) )
    : null;
  // ── Calendario UNIFICADO (las 3 tiendas) — se muestra siempre, arriba de todo ──
  // ── Panel de EVOLUCIÓN mensual (histórico acumulado) ──
  const evolPanel = ceEl("div", { className: "bg-white rounded-2xl border p-4 space-y-3", style: { borderColor: C.line } },
    ceEl("div", { className: "flex items-center justify-between flex-wrap gap-2" },
      ceEl("div", null,
        ceEl("span", { className: "text-sm font-black fraunces", style: { color: C.ink } }, "Evolución mensual"),
        ceEl("span", { className: "text-[11px] ml-2", style: { color: C.gray } }, "Cumplimiento (≤" + promesaDH + " días háb.) y volumen, mes a mes" + (porRegion ? " · " + (regionVista === "montevideo" ? "Montevideo" : "Interior") : ""))),
      hayRegion && regionToggle),
    evolMeses.length === 0
      ? ceEl("div", { className: "text-[11px] rounded-lg px-3 py-2", style: { background: "#F6F8FB", color: C.gray } }, "Todavía no hay histórico. Cargá los meses (incluidos los anteriores) en “Cargar archivos” y cruzá: cada mes queda guardado y se acumula. No hace falta volver a subir los meses viejos.")
      : ceEl("div", { className: "overflow-auto" }, ceEl("table", { className: "w-full", style: { fontSize: 12 } },
          ceEl("thead", null, ceEl("tr", null, ["Mes", "Pedidos", "Δ vol.", "Cumplimiento", "Δ cumpl."].map(h => ceEl("th", { key: h, className: "px-3 py-2 text-left font-bold uppercase", style: { color: C.gray, fontSize: 10, whiteSpace: "nowrap" } }, h)))),
          ceEl("tbody", null, evolMeses.map((mrow, i) => {
            const prev = i > 0 ? evolMeses[i - 1] : null;
            const dVol = prev ? mrow.total - prev.total : null;
            const dPct = prev && prev.pct != null && mrow.pct != null ? mrow.pct - prev.pct : null;
            const colDelta = v => v == null ? C.gray : v > 0 ? C.green : v < 0 ? C.red : C.gray;
            const pctCol = mrow.pct == null ? C.gray : mrow.pct >= 90 ? C.green : mrow.pct >= 70 ? C.amber : C.red;
            return ceEl("tr", { key: mrow.mes, style: { borderTop: "1px solid " + C.line } },
              ceEl("td", { className: "px-3 py-1.5 font-semibold" }, fmtMesYM(mrow.mes)),
              ceEl("td", { className: "px-3 py-1.5 tabular-nums" }, (mrow.total || 0).toLocaleString("es-UY")),
              ceEl("td", { className: "px-3 py-1.5 tabular-nums font-bold", style: { color: colDelta(dVol) } }, dVol == null ? "—" : (dVol > 0 ? "▲ +" : dVol < 0 ? "▼ " : "= ") + dVol),
              ceEl("td", { className: "px-3 py-1.5 font-black tabular-nums", style: { color: pctCol } }, mrow.pct == null ? "—" : mrow.pct + "%"),
              ceEl("td", { className: "px-3 py-1.5 tabular-nums font-bold", style: { color: colDelta(dPct) } }, dPct == null ? "—" : (dPct > 0 ? "▲ +" : dPct < 0 ? "▼ " : "= ") + dPct + " pts"));
          })))),
    ceEl("p", { className: "text-[10px]", style: { color: C.gray } }, "Se acumula solo: cargá los meses anteriores una vez y quedan guardados para el equipo. Δ = variación vs el mes anterior de la lista. El cumplimiento se recalcula con la promesa actual (≤" + promesaDH + " días háb.)."));
  const calendarEl = calData.length > 0 ? ceEl("div", { className: "bg-white rounded-2xl border p-3", style: { borderColor: C.line } },
    ceEl("div", { className: "flex items-center justify-between flex-wrap gap-2 mb-2" },
      ceEl("div", null,
        ceEl("span", { className: "text-sm font-bold" }, "Cumplimiento por día · las 3 tiendas juntas"),
        ceEl("span", { className: "text-[11px] ml-2", style: { color: C.gray } }, "Tocá un día para filtrar el listado · color = % entregado o listo para retirar"),
        !cruceEnSesion.current && !calComp && ceEl("div", { className: "text-[11px] font-semibold mt-1", style: { color: C.amber } }, "⚠ El último cruce se hizo con una versión anterior de la app y no guardó el calendario compartido: estos % solo cuentan los pedidos accionables. Se corrige recargando la app (Ctrl+Shift+R) y volviendo a cruzar los archivos.")),
      ceEl("div", { className: "flex items-center gap-2" },
        filtroDia && ceEl("button", { onClick: () => { setFiltroDia(""); setPage(0); setSubOper("resumen"); }, className: "text-xs font-bold px-3 py-1.5 rounded-lg", style: { background: C.soft, color: C.blue } }, "✕ Ver todos los días"),
        ceEl("select", { value: calSelMes, onChange: e => setCalMes(e.target.value), className: "px-2 py-1.5 rounded-lg border text-xs font-bold bg-white", style: { borderColor: C.line, color: C.ink } }, mesesCal.map(m => ceEl("option", { key: m, value: m }, fmtMesYM(m)))))),
    ceEl("div", { className: "flex flex-wrap gap-1.5" }, calDias.map(d => {
      const col = d.pct >= 90 ? C.green : d.pct >= 70 ? C.amber : C.red;
      const bg = d.pct >= 90 ? C.greenS : d.pct >= 70 ? C.amberS : C.redS;
      const sel = filtroDia === d.dia;
      return ceEl("button", { key: d.dia, onClick: () => { setFiltroDia(sel ? "" : d.dia); setPage(0); setSubOper("resumen"); }, title: d.dia + " — " + d.entregados + "/" + d.total + " entregados o listos para retirar", className: "rounded-lg px-2 py-1 text-center transition-all", style: { background: sel ? col : bg, minWidth: 50, border: sel ? "2px solid " + col : "2px solid transparent" } },
        ceEl("div", { className: "text-[10px] font-bold", style: { color: sel ? "#fff" : C.gray } }, d.dia.slice(8, 10) + "/" + d.dia.slice(5, 7)),
        ceEl("div", { className: "text-sm font-black fraunces", style: { color: sel ? "#fff" : col } }, d.pct + "%"));
    })),
    filtroDia && ceEl("div", { className: "text-[11px] mt-2 font-semibold", style: { color: C.blue } }, "Mostrando pedidos del " + filtroDia.slice(8, 10) + "/" + filtroDia.slice(5, 7) + "/" + filtroDia.slice(0, 4) + " en el Listado (abajo)")) : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-5"
  }, /*#__PURE__*/React.createElement(Title, {
    eyebrow: "Operativa" + (porTiendaVista ? " · " + tiendaVista : ""),
    title: "Cruce Fenicio × Encuentra"
  }), resultado && selectorTienda, resultado && calendarEl, /*#__PURE__*/React.createElement("div", { className: "flex flex-col lg:flex-row gap-6 lg:gap-8 items-start" }, resultado && sidebar, /*#__PURE__*/React.createElement("div", { className: "flex-1 min-w-0 space-y-5" }, (!resultado || subOper === "cargar") && /*#__PURE__*/React.createElement(Collapse, {
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
    className: "space-y-5"
  }, subOper === "resumen" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", { className: "text-[11px] font-bold uppercase tracking-widest", style: { color: C.blue } }, "Acción rápida" + (porTiendaVista ? " · " + tiendaVista : "")),
  /*#__PURE__*/React.createElement("div", { className: "grid grid-cols-2 lg:grid-cols-5 gap-3" },
    /*#__PURE__*/React.createElement(AccionCard, { label: "Atrasados +" + filtroDias + "d", value: nAtrasados, color: C.red, tab: "atrasados", sub: "Sin entregar a tiempo" }),
    /*#__PURE__*/React.createElement(AccionCard, { label: "Críticos +10d", value: nCriticos, color: "#B91C1C", tab: "criticos", sub: "Muy atrasados" }),
    /*#__PURE__*/React.createElement(AccionCard, { label: "Validar despacho", value: nNoDespacho, color: "#B45309", tab: "nodespacho", sub: "Despachado WMS, sin entregar" }),
    /*#__PURE__*/React.createElement(AccionCard, { label: "Estancados", value: nEstancados, color: C.amber, tab: "estancados", sub: "Mismo estado WMS +2d sin entregar" }),
    /*#__PURE__*/React.createElement(AccionCard, { label: "Depo 0", value: nDepo0, color: "#7C3AED", tab: "depo0", sub: "Sin stock — acción manual" }),
    cancelDiscreps.length > 0 && /*#__PURE__*/React.createElement(AccionCard, { label: "Cancel. a alinear", value: cancelDiscreps.length, color: "#0891B2", tab: "canceldiscrep", sub: "Cancelado en una sola plataforma" }),
    probableCancel.length > 0 && /*#__PURE__*/React.createElement(AccionCard, { label: "Cancelado (probable)", value: probableCancel.length, color: "#64748B", tab: "probcancel", sub: "Sin Fenicio + WMS procesado — verificar" }),
    enTransitoArr.length > 0 && /*#__PURE__*/React.createElement(AccionCard, { label: "En tránsito", value: enTransitoArr.length, color: "#0EA5E9", tab: "transito", sub: "Despachados, en camino" + (transitoLargoN ? " · " + transitoLargoN + " hace +2 días háb." : "") })),
  usarSnap && atrasados.length !== nAtrasados && /*#__PURE__*/React.createElement("div", { className: "text-[11px] -mt-1", style: { color: C.gray } }, "Cifras del último cruce compartido (coinciden con Resumen). Volvé a subir los archivos y cruzar para actualizar el detalle."),
  !porTiendaVista && /*#__PURE__*/React.createElement("div", { className: "text-[11px] font-bold uppercase tracking-widest", style: { color: C.blue } }, "Cumplimiento del mes"),
  !porTiendaVista && /*#__PURE__*/React.createElement(ProgresoMes, null),
  /*#__PURE__*/React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" },
    /*#__PURE__*/React.createElement(MetricCard, { label: "Total pedidos", value: volTotal, color: C.blue, tab: "todos" }),
    /*#__PURE__*/React.createElement(MetricCard, { label: "Entregados", value: volEntreg, color: C.green }),
    /*#__PURE__*/React.createElement(MetricCard, { label: "Cumple promesa", value: volTasa != null ? volTasa + "%" : "—", color: volTasa == null ? C.gray : volTasa >= 90 ? C.green : volTasa >= 70 ? C.amber : C.red, sub: "entregado ≤" + promesaDH + " días háb." }),
    /*#__PURE__*/React.createElement(MetricCard, { label: "Tiempo a despacho", value: fmtDias(volDesp), color: C.blue, sub: "típico (mediana)" }),
    /*#__PURE__*/React.createElement(MetricCard, { label: "Tiempo de entrega", value: fmtDias(volEnt), color: C.ink, sub: "típico (mediana)" }),
    /*#__PURE__*/React.createElement(MetricCard, { label: "Sin WMS", value: operSnap ? (operSnap.sin_wms || 0) : sinWMS.length, color: (operSnap ? operSnap.sin_wms : sinWMS.length) ? C.amber : C.gray, tab: sinWMS.length ? "sinwms" : null })),
  subOper === "resumen" && kpiPanel && DesglosePanel({ tipo: kpiPanel })),
  subOper === "tiempos" && /*#__PURE__*/React.createElement(React.Fragment, null, distPanel, /*#__PURE__*/React.createElement("div", { className: "text-[11px]", style: { color: C.gray } }, "Abajo: tiempo de despacho de STOCK desde cada tienda al depósito central (confirmado → procesado)."), DesglosePanel({ tipo: "stock" })),
  subOper === "evolucion" && evolPanel,
  leadtimeEntProm == null && entregaDiag && /*#__PURE__*/React.createElement("div", { className: "rounded-xl px-4 py-3 text-xs", style: { background: C.amberS, color: C.amber } },
    /*#__PURE__*/React.createElement("b", null, "Tiempo de entrega sin datos. "),
    entregaDiag.col ? ("Detecté la columna “" + entregaDiag.col + "” pero ningún pedido tiene una fecha de entrega válida (" + entregaDiag.conEntrega + " de " + entregaDiag.total + "). ") : "No encontré una columna de fecha de entrega en tu Fenicio. ",
    "Columnas de tu Fenicio: ",
    /*#__PURE__*/React.createElement("span", { style: { color: C.ink, fontWeight: 600 } }, (entregaDiag.cols || []).join(" · ")),
    ". Decime cuál tiene la fecha en que se entregó el pedido al cliente y la conecto."),
  persistOK === false && /*#__PURE__*/React.createElement("div", { className: "rounded-xl px-4 py-3 text-xs font-medium", style: { background: C.amberS, color: C.amber } }, "⚠ La persistencia no está activa: falta crear la tabla en Supabase, así que los comentarios y el seguimiento NO se guardan entre sesiones. Ejecutá el SQL de sql/operativa_seguimiento.sql en Supabase → SQL Editor."),
  snapError && /*#__PURE__*/React.createElement("div", { className: "rounded-xl px-4 py-3 text-xs font-medium", style: { background: C.redS, color: C.red } }, "⚠ No se pudo guardar el resumen compartido de Operativa (por eso el Resumen no coincide). Detalle: " + snapError + ". Suele ser que falta correr sql/operativa_snapshot.sql, o que la tabla quedó con columnas distintas."),
  ccDepo9Arr.length > 0 && /*#__PURE__*/React.createElement("div", { className: "rounded-xl px-4 py-3 text-xs font-medium", style: { background: "#FEE2E2", color: "#B91C1C" } }, "⚠ " + ccDepo9Arr.length + " pedido(s) Click & Collect asignados a Depo 9 — según el criterio del WMS no deberían; revisar la derivación de depósito."),
  subOper === "resumen" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", { className: "text-[11px] font-bold uppercase tracking-widest pt-1", style: { color: C.blue } }, "Listado de pedidos" + (porTiendaVista ? " · " + tiendaVista : "")), /*#__PURE__*/React.createElement("div", { className: "bg-white rounded-2xl border p-3 flex flex-wrap gap-2 items-end", style: { borderColor: C.line } },
    /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", { className: "text-[10px] font-bold uppercase block mb-1", style: { color: C.gray } }, "Buscar pedido"), /*#__PURE__*/React.createElement("input", { type: "text", value: buscar, onChange: e => { setBuscar(e.target.value); setPage(0); }, placeholder: "N° pedido…", className: "px-2 py-1.5 rounded-lg border text-xs", style: { borderColor: C.line } })),
    /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", { className: "text-[10px] font-bold uppercase block mb-1", style: { color: C.gray } }, "Estado Fenicio"), /*#__PURE__*/React.createElement("select", { value: filtroEstadoFen, onChange: e => { setFiltroEstadoFen(e.target.value); setPage(0); }, className: "px-2 py-1.5 rounded-lg border text-xs bg-white", style: { borderColor: C.line, maxWidth: 220 } }, /*#__PURE__*/React.createElement("option", { value: "" }, "Todos"), estadosFenOpts.map(s => /*#__PURE__*/React.createElement("option", { key: s, value: s }, s)))),
    /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", { className: "text-[10px] font-bold uppercase block mb-1", style: { color: C.gray } }, "Depósito"), /*#__PURE__*/React.createElement("select", { value: filtroDeposito, onChange: e => { setFiltroDeposito(e.target.value); setPage(0); }, className: "px-2 py-1.5 rounded-lg border text-xs bg-white", style: { borderColor: C.line, maxWidth: 200 } }, /*#__PURE__*/React.createElement("option", { value: "" }, "Todos"), depositosOpts.map(s => /*#__PURE__*/React.createElement("option", { key: s, value: s }, s)))),
    /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", { className: "text-[10px] font-bold uppercase block mb-1", style: { color: C.gray } }, "Forma entrega"), /*#__PURE__*/React.createElement("select", { value: soloCC, onChange: e => { setSoloCC(e.target.value); setPage(0); }, className: "px-2 py-1.5 rounded-lg border text-xs bg-white", style: { borderColor: C.line } }, /*#__PURE__*/React.createElement("option", { value: "todos" }, "Todas"), /*#__PURE__*/React.createElement("option", { value: "cc" }, "Click & Collect"), /*#__PURE__*/React.createElement("option", { value: "pickup" }, "Pickup"), /*#__PURE__*/React.createElement("option", { value: "domicilio" }, "Envío a domicilio"))),
    /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", { className: "text-[10px] font-bold uppercase block mb-1", style: { color: C.gray } }, "Días ≥"), /*#__PURE__*/React.createElement("input", { type: "number", value: filtroDiasMin, min: "0", onChange: e => { setFiltroDiasMin(e.target.value); setPage(0); }, placeholder: "0", className: "px-2 py-1.5 rounded-lg border text-xs", style: { borderColor: C.line, width: 72 } })),
    (filtroEstadoFen || filtroDeposito || filtroDiasMin || buscar) ? /*#__PURE__*/React.createElement("button", { onClick: () => { setFiltroEstadoFen(""); setFiltroDeposito(""); setFiltroDiasMin(""); setBuscar(""); setPage(0); }, className: "text-xs font-bold px-3 py-1.5 rounded-lg", style: { background: "#EEF1F5", color: C.gray } }, "Limpiar") : null), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 flex-wrap items-center justify-end"
  }, /*#__PURE__*/React.createElement("span", { className: "text-[10px] mr-1", style: { color: C.gray } }, ultimaSync ? "Última act.: " + ultimaSync.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" }) : ""),
    /*#__PURE__*/React.createElement("button", { onClick: () => cargarSeguimiento(), title: "Traer lo último que cargó el equipo (comentarios y pedidos de otros usuarios)", className: "text-xs font-bold px-3 py-2 rounded-xl", style: { background: C.greenS, color: C.green } }, "↻ Actualizar"),
    /*#__PURE__*/React.createElement("button", { onClick: () => exportarOper(vistaRows, "operativa-" + vistaTab), className: "text-xs font-bold px-3 py-2 rounded-xl", style: { background: C.soft, color: C.blue } }, "⬇ Exportar vista"),
    /*#__PURE__*/React.createElement("button", { onClick: () => alertarTienda(vistaRows, vistaTab), className: "text-xs font-bold px-3 py-2 rounded-xl text-white", style: { background: C.amber } }, "✉ Alertar por mail")),
  /*#__PURE__*/React.createElement("div", { className: "flex items-center justify-between flex-wrap gap-2 px-1" },
    /*#__PURE__*/React.createElement("div", { className: "text-[11px]", style: { color: C.gray } }, /*#__PURE__*/React.createElement("b", { style: { color: C.ink } }, ({ atrasados: "Atrasados", criticos: "Críticos", nodespacho: "Validar despacho", estancados: "Estancados", depo0: "Depo 0", sinwms: "Sin WMS", todos: "Todos", transito: "En tránsito", probcancel: "Cancelado (probable)", canceldiscrep: "Cancel. a alinear" }[vistaTab] || "Atrasados")), " · " + vistaRows.length + " pedido(s)" + (vistaTab === "depo0" ? " · algún artículo cayó en Depo 0 (sin stock) — validar mercadería" : "")),
    totalPaginas > 1 && /*#__PURE__*/React.createElement("div", { className: "flex items-center gap-2" },
      /*#__PURE__*/React.createElement("button", { onClick: () => setPage(p => Math.max(0, p - 1)), disabled: pageSafe <= 0, className: "text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-40", style: { background: "#EEF1F5", color: C.gray } }, "← Anterior"),
      /*#__PURE__*/React.createElement("span", { className: "text-xs font-bold", style: { color: C.gray } }, "Hoja " + (pageSafe + 1) + " / " + totalPaginas),
      /*#__PURE__*/React.createElement("button", { onClick: () => setPage(p => Math.min(totalPaginas - 1, p + 1)), disabled: pageSafe >= totalPaginas - 1, className: "text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-40", style: { background: "#EEF1F5", color: C.gray } }, "Siguiente →"))),
  vistaRows.length > 0 ? Tabla({ rows: pageRows }) : Vacio({ msg: vistaTab === "criticos" ? "No hay pedidos críticos (+10 días hábiles)." : vistaTab === "nodespacho" ? "No hay pedidos despachados en WMS que sigan sin entregar en Fenicio." : vistaTab === "estancados" ? "No hay pedidos estancados (+2 días hábiles sin avanzar en el WMS)." : vistaTab === "inconsistencias" ? "Todos los estados coinciden." : vistaTab === "depo0" ? depoMsg : vistaTab === "probcancel" ? "No hay cancelados probables (pedidos que dejaron de venir en Fenicio con el WMS ya procesado)." : vistaTab === "transito" ? "No hay pedidos en tránsito." : vistaTab === "atrasados" ? "No hay pedidos atrasados para este periodo." : "No hay pedidos en esta vista." }),
  totalPaginas > 1 && /*#__PURE__*/React.createElement("div", { className: "flex items-center justify-center gap-3 pt-1" },
    /*#__PURE__*/React.createElement("button", { onClick: () => setPage(p => Math.max(0, p - 1)), disabled: pageSafe <= 0, className: "text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-40", style: { background: "#EEF1F5", color: C.gray } }, "← Anterior"),
    /*#__PURE__*/React.createElement("span", { className: "text-xs font-bold", style: { color: C.gray } }, "Hoja " + (pageSafe + 1) + " / " + totalPaginas),
    /*#__PURE__*/React.createElement("button", { onClick: () => setPage(p => Math.min(totalPaginas - 1, p + 1)), disabled: pageSafe >= totalPaginas - 1, className: "text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-40", style: { background: "#EEF1F5", color: C.gray } }, "Siguiente →")))))));
}

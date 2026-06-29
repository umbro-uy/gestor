/* ===================================================================
   app — Login, Panel (shell + navegación), App (root) y render
   Parte del Gestor del Equipo. Se carga como <script> clásico desde
   index.html; comparte el ámbito global con los demás archivos js/.
   =================================================================== */

/* ── Login ── */
function Login() {
  const [modo, setModo] = useState("entrar");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState(null);
  const [load, setLoad] = useState(false);
  const tr = (m = "") => {
    if (m.includes("Invalid login")) return "Mail o contraseña incorrectos.";
    if (m.includes("already registered")) return "Ese mail ya tiene cuenta. Ingresá en 'Entrar'.";
    if (m.includes("at least 6")) return "La contraseña necesita al menos 6 caracteres.";
    return m;
  };
  const enviar = async () => {
    setMsg(null);
    setLoad(true);
    try {
      if (modo === "crear") {
        const {
          error
        } = await supa.auth.signUp({
          email,
          password: pass,
          options: {
            data: {
              nombre
            }
          }
        });
        if (error) throw error;
        setMsg({
          t: "ok",
          v: "Cuenta creada. Revisá tu mail si no entrás sola."
        });
      } else {
        const {
          error
        } = await supa.auth.signInWithPassword({
          email,
          password: pass
        });
        if (error) throw error;
      }
    } catch (e) {
      setMsg({
        t: "err",
        v: tr(e.message || "")
      });
    } finally {
      setLoad(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen flex items-center justify-center p-5",
    style: {
      background: "var(--hd)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-6"
  }, /*#__PURE__*/React.createElement(UmbroLogo, { h: 60, color: "#fff", wordmark: true, style: { marginBottom: 18 } }), /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold uppercase tracking-widest mb-1",
    style: {
      color: "rgba(255,255,255,0.5)"
    }
  }, "E-commerce · Umbro Uruguay"), /*#__PURE__*/React.createElement("h1", {
    className: "text-3xl font-black fraunces text-white"
  }, "Gestor del equipo")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1 p-1 rounded-xl",
    style: {
      background: "#EEF1F5"
    }
  }, ["entrar", "crear"].map(m => /*#__PURE__*/React.createElement("button", {
    key: m,
    onClick: () => {
      setModo(m);
      setMsg(null);
    },
    className: "flex-1 text-sm font-semibold py-2 rounded-lg transition-colors",
    style: {
      background: modo === m ? "#fff" : "transparent",
      color: modo === m ? "#0E1B33" : "#64748B"
    }
  }, m === "entrar" ? "Entrar" : "Crear cuenta"))), modo === "crear" && /*#__PURE__*/React.createElement(Inp, {
    placeholder: "Tu nombre",
    value: nombre,
    onChange: e => setNombre(e.target.value)
  }), /*#__PURE__*/React.createElement(Inp, {
    type: "email",
    placeholder: "Mail",
    value: email,
    onChange: e => setEmail(e.target.value)
  }), /*#__PURE__*/React.createElement(Inp, {
    type: "password",
    placeholder: "Contraseña",
    value: pass,
    onChange: e => setPass(e.target.value),
    onKeyDown: e => e.key === "Enter" && enviar()
  }), msg && /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold rounded-xl px-3 py-2",
    style: {
      background: msg.t === "err" ? C.redS : C.greenS,
      color: msg.t === "err" ? C.red : C.green
    }
  }, msg.v), /*#__PURE__*/React.createElement("button", {
    onClick: enviar,
    disabled: load,
    className: "w-full text-sm font-bold text-white py-2.5 rounded-xl disabled:opacity-50",
    style: {
      background: C.blue
    }
  }, load ? "Un momento…" : modo === "crear" ? "Crear cuenta" : "Entrar"))));
}

/* ── Panel ── */
function Panel({
  sesion
}) {
  const [tab, setTab] = useState("resumen");
  const [data, setData] = useState({
    profiles: [],
    objetivos: [],
    tareas: [],
    kpis: [],
    kpis_g: []
  });
  const [tema, setTema] = useState(TEMA0);
  const [verAp, setVerAp] = useState(false);
  const [appTitle, setAppTitle] = useState("Gestor del equipo 2026");
  const [editTitle, setEditTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [cargando, setCargando] = useState(true);
  const [sync, setSync] = useState("ok");
  const cargar = useCallback(async () => {
    try {
      const [p, o, t, k, kg, aj] = await Promise.all([supa.from("profiles").select("*").order("creado"), supa.from("objetivos").select("*").order("num"), supa.from("tareas").select("*").order("creada", {
        ascending: false
      }), supa.from("kpis").select("*"), supa.from("kpis_globales").select("*").order("orden"), supa.from("ajustes").select("*").eq("id", 1).maybeSingle()]);
      setData({
        profiles: p.data || [],
        objetivos: o.data || [],
        tareas: t.data || [],
        kpis: k.data || [],
        kpis_g: kg.data || []
      });
      if (aj?.data) {
        const nt = {
          ac: aj.data.acento,
          bg: aj.data.fondo,
          hd: aj.data.cabecera
        };
        setTema(nt);
        aplicarTema(nt);
        if (aj.data.app_title) setAppTitle(aj.data.app_title);
      }
      setSync("ok");
    } catch {
      setSync("err");
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => {
    cargar();
    const c = supa.channel("ch").on("postgres_changes", {
      event: "*",
      schema: "public"
    }, () => cargar()).subscribe();
    return () => supa.removeChannel(c);
  }, [cargar]);
  useEffect(() => {
    aplicarTema(tema);
  }, [tema]);
  const yo = data.profiles.find(p => p.id === sesion.user.id);
  const esAdmin = !!(yo && yo.es_admin);
  const saveTitle = async () => {
    if (!draftTitle.trim()) return;
    setAppTitle(draftTitle.trim());
    await supa.from("ajustes").upsert({
      id: 1,
      app_title: draftTitle.trim()
    });
    setEditTitle(false);
  };
  const TABS = [{
    id: "resumen",
    l: "Resumen",
    ic: Ic.dash
  }, {
    id: "tareas",
    l: "Tareas",
    ic: Ic.board
  }, {
    id: "equipo",
    l: "Equipo",
    ic: Ic.users
  }, {
    id: "objetivos",
    l: "Objetivos",
    ic: Ic.target
  }, {
    id: "metas",
    l: "Análisis",
    ic: Ic.chart
  }, {
    id: "operativa",
    l: "Operativa",
    ic: Ic.ops
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen",
    style: {
      background: C.bg,
      color: C.ink
    }
  }, /*#__PURE__*/React.createElement("header", {
    className: "px-4 sm:px-8 pt-5 pb-0",
    style: {
      background: C.ink
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-6xl mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 sm:gap-4"
  }, /*#__PURE__*/React.createElement(UmbroLogo, { h: 30, color: "#fff", wordmark: true, row: true, style: { flexShrink: 0 } }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-bold uppercase tracking-widest",
    style: {
      color: "rgba(255,255,255,0.45)"
    }
  }, "E-commerce · Umbro Uruguay"), editTitle && esAdmin ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-1"
  }, /*#__PURE__*/React.createElement("input", {
    value: draftTitle,
    onChange: e => setDraftTitle(e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter") saveTitle();
      if (e.key === "Escape") setEditTitle(false);
    },
    autoFocus: true,
    className: "text-2xl font-black text-white bg-transparent border-b-2 border-white/40 outline-none pb-0.5 w-64",
    style: {
      fontFamily: "'Fraunces',serif"
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: saveTitle,
    className: "p-1.5 rounded-lg",
    style: {
      background: C.greenS,
      color: C.green
    }
  }, Ic.check), /*#__PURE__*/React.createElement("button", {
    onClick: () => setEditTitle(false),
    className: "p-1.5 rounded-lg",
    style: {
      background: "rgba(255,255,255,0.1)",
      color: "rgba(255,255,255,0.6)"
    }
  }, Ic.x)) : /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-1 group"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-2xl sm:text-3xl font-black text-white fraunces"
  }, appTitle), esAdmin && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setDraftTitle(appTitle);
      setEditTitle(true);
    },
    className: "opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 transition-all",
    style: {
      color: "rgba(255,255,255,0.5)"
    }
  }, Ic.edit)), /*#__PURE__*/React.createElement("p", {
    className: "text-xs mt-1 flex items-center gap-2",
    style: {
      color: "rgba(255,255,255,0.5)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "Hola", yo?.nombre ? `, ${yo.nombre}` : "", " · TimeOut · Tienda Nacional · Classico"), esAdmin && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-bold px-2 py-px rounded-full",
    style: {
      background: "rgba(255,255,255,0.15)"
    }
  }, "ADMIN")))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-semibold px-2 py-1 rounded-full",
    style: {
      background: sync === "err" ? C.red : "rgba(255,255,255,0.1)",
      color: sync === "err" ? "#fff" : "rgba(255,255,255,0.5)"
    }
  }, sync === "err" ? "Sin conexión" : "En vivo ✓"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setVerAp(true),
    className: "p-1.5 rounded-lg hover:bg-white/10",
    style: {
      color: "rgba(255,255,255,0.5)"
    },
    title: "Apariencia"
  }, Ic.palette), /*#__PURE__*/React.createElement("button", {
    onClick: cargar,
    className: "p-1.5 rounded-lg hover:bg-white/10",
    style: {
      color: "rgba(255,255,255,0.5)"
    },
    title: "Actualizar"
  }, Ic.refresh), /*#__PURE__*/React.createElement("button", {
    onClick: () => supa.auth.signOut(),
    className: "p-1.5 rounded-lg hover:bg-white/10",
    style: {
      color: "rgba(255,255,255,0.5)"
    },
    title: "Salir"
  }, Ic.out))), /*#__PURE__*/React.createElement("nav", {
    className: "flex gap-1 mt-5 overflow-x-auto items-center"
  }, /*#__PURE__*/React.createElement(UmbroLogo, { h: 16, color: "#fff", wordmark: true, row: true, style: { flexShrink: 0, alignSelf: "center", marginRight: 14, marginBottom: 6 } }), TABS.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    onClick: () => setTab(t.id),
    className: "flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-sm font-semibold rounded-t-xl whitespace-nowrap transition-colors",
    style: {
      background: tab === t.id ? C.bg : "transparent",
      color: tab === t.id ? C.ink : "rgba(255,255,255,0.55)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex"
    }
  }, t.ic), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, t.l)))))), verAp && /*#__PURE__*/React.createElement(PanelApariencia, {
    tema: tema,
    setTema: setTema,
    cerrar: () => setVerAp(false)
  }), /*#__PURE__*/React.createElement("main", {
    className: "px-4 sm:px-8 py-6 max-w-6xl mx-auto"
  }, cargando ? /*#__PURE__*/React.createElement("div", {
    className: "text-sm py-10 text-center",
    style: {
      color: C.gray
    }
  }, "Cargando datos…") : /*#__PURE__*/React.createElement(React.Fragment, null,
    // Cada pestaña se mantiene montada (display:none cuando no está activa) para
    // no perder el estado/análisis al cambiar de pestaña.
    /*#__PURE__*/React.createElement("div", { style: { display: tab === "resumen" ? "block" : "none" } }, /*#__PURE__*/React.createElement(Resumen, {
    data: data,
    setTab: setTab,
    esAdmin: esAdmin,
    recargar: cargar
  })), /*#__PURE__*/React.createElement("div", { style: { display: tab === "tareas" ? "block" : "none" } }, /*#__PURE__*/React.createElement(Tareas, {
    data: data,
    recargar: cargar,
    esAdmin: esAdmin,
    yo: yo
  })), /*#__PURE__*/React.createElement("div", { style: { display: tab === "equipo" ? "block" : "none" } }, /*#__PURE__*/React.createElement(Equipo, {
    data: data,
    recargar: cargar,
    esAdmin: esAdmin
  })), /*#__PURE__*/React.createElement("div", { style: { display: tab === "objetivos" ? "block" : "none" } }, /*#__PURE__*/React.createElement(Objetivos, {
    data: data,
    recargar: cargar,
    esAdmin: esAdmin
  })), /*#__PURE__*/React.createElement("div", { style: { display: tab === "metas" ? "block" : "none" } }, /*#__PURE__*/React.createElement(Metas, {
    data: data,
    recargar: cargar,
    esAdmin: esAdmin
  })), /*#__PURE__*/React.createElement("div", { style: { display: tab === "operativa" ? "block" : "none" } }, /*#__PURE__*/React.createElement(Operativa, { yo: yo })))));
}



/* ── App root ── */
function App() {
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    if (!configOK) {
      setCargando(false);
      return;
    }
    supa.auth.getSession().then(({
      data
    }) => {
      setSesion(data.session);
      setCargando(false);
    });
    const {
      data: sub
    } = supa.auth.onAuthStateChange((_, s) => setSesion(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  if (!configOK) return null;
  if (cargando) return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen flex items-center justify-center",
    style: {
      background: "#F6F7F9"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-semibold",
    style: {
      color: "#64748B"
    }
  }, "Cargando…"));
  if (!sesion) return /*#__PURE__*/React.createElement(Login, null);
  return /*#__PURE__*/React.createElement(Panel, {
    sesion: sesion
  });
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));

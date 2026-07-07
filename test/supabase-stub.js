// Stub de Supabase para el smoke test (offline, determinista). Reemplaza al SDK real: sesión de
// admin y unas pocas filas, para que la app monte completa sin pegarle a la red.
window.supabase = {
  createClient: function () {
    const session = { user: { id: "u1", email: "demo@demo.com" } };
    const DATA = {
      profiles: [{ id: "u1", nombre: "Demo", es_admin: true, rol: "Admin", creado: "2026-01-01" }],
      objetivos: [], tareas: [], kpis: [], kpis_globales: [], operativa_seguimiento: [],
      operativa_snapshot: [], analisis_snapshot: [], ajustes: [],
      metas_mensuales: [
        { mes: "2026-06", tienda: "TimeOut", meta: 3000000, real: 2400000, notas: "" },
        { mes: "2026-06", tienda: "Tienda Nacional", meta: 2500000, real: 2700000, notas: "" },
        { mes: "2026-06", tienda: "Classico", meta: 2000000, real: 900000, notas: "" },
        { mes: "2026-06", tienda: "MercadoLibre", meta: 1500000, real: 1500000, notas: "" },
      ],
    };
    function builder(table) {
      const rows = DATA[table] || [];
      const p = {
        select() { return p; }, order() { return p; }, eq() { return p; }, in() { return p; },
        upsert() { return Promise.resolve({ data: null, error: null }); },
        update() { return p; }, insert() { return Promise.resolve({ data: null, error: null }); },
        delete() { return p; },
        maybeSingle() { return Promise.resolve({ data: null, error: null }); },
        single() { return Promise.resolve({ data: rows[0] || null, error: null }); },
        then(res) { return Promise.resolve({ data: rows, error: null }).then(res); },
      };
      return p;
    }
    const chan = { on() { return chan; }, subscribe() { return chan; } };
    return {
      from: builder, channel() { return chan; }, removeChannel() {},
      auth: {
        getSession() { return Promise.resolve({ data: { session } }); },
        onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
        signOut() { return Promise.resolve({}); },
      },
    };
  },
};

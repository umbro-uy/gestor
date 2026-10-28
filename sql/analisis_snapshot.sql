-- Snapshot del ÚLTIMO análisis de la sección Análisis: guarda el resumen del BAS y los
-- pedidos del cruce (sin factura / cancelado con factura / etc.) en una sola fila ('ultimo'),
-- para auto-cargarlo al entrar sin tener que volver a subir los archivos, y que lo vean todos.
--
-- Ejecutar una sola vez en Supabase → SQL Editor.

create table if not exists public.analisis_snapshot (
  id          text primary key,        -- siempre 'ultimo' (guardamos solo el más reciente)
  mes         text,
  resumen     jsonb,                    -- resumenBAS: facturación neta/bruta, NCD, pedidos, etc. por mes/tienda
  pendientes  jsonb,                    -- resultado del cruce: grupos (revisar, cancelado c/factura, PCN, ...)
  stock_depos jsonb,                    -- último stock de los depósitos de facturación (8101/8001/8201), para el control de egresos
  fraude_resumen jsonb,                 -- resumen (solo números, sin datos de clientes) del último reporte analizado en Fraude
  fraude_cola jsonb,                    -- cola de revisión del último análisis de Fraude (pedidos marcados), para compartirla sin recargar
  actualizado timestamptz default now()
);
-- Si la tabla ya existía, agregar las columnas nuevas:
alter table public.analisis_snapshot add column if not exists stock_depos jsonb;
alter table public.analisis_snapshot add column if not exists fraude_resumen jsonb;
alter table public.analisis_snapshot add column if not exists fraude_cola jsonb;

-- Seguridad a nivel de fila: usuarios autenticados pueden leer/escribir
alter table public.analisis_snapshot enable row level security;

drop policy if exists "analisis_snapshot_rw" on public.analisis_snapshot;
create policy "analisis_snapshot_rw"
  on public.analisis_snapshot
  for all
  to authenticated
  using (true)
  with check (true);

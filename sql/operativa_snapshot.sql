-- Resumen del ÚLTIMO análisis de Operativa: guarda las cifras tal cual se ven en esa pestaña
-- (atrasados, críticos, depo 0, tiempos P90, etc.) en una sola fila ('ultimo'), para que el
-- Resumen y los KPIs automáticos muestren EXACTAMENTE lo mismo que Operativa (una sola fuente
-- de verdad) y se actualice solo cada vez que alguien cruza archivos.
--
-- Ejecutar una sola vez en Supabase → SQL Editor.

create table if not exists public.operativa_snapshot (
  id                text primary key,     -- siempre 'ultimo'
  total             int,
  atrasados         int,
  criticos          int,
  no_despacho       int,
  estancados        int,
  depo0             int,
  sin_wms           int,
  entregados        int,
  tasa_cumpl        int,                   -- % de cumplimiento de entrega
  leadtime_despacho int,                   -- tiempo a despacho (P90, días)
  leadtime_entrega  int,                   -- tiempo de entrega (P90, días)
  serie             jsonb,                 -- reservado para tendencia mensual (opcional)
  calendario        jsonb,                 -- [{dia, total, entregados}] por día de compra (para el calendario compartido)
  actualizado       timestamptz default now()
);

-- Si la tabla ya existía de antes, agregá las columnas nuevas:
alter table public.operativa_snapshot add column if not exists calendario jsonb;

alter table public.operativa_snapshot enable row level security;

drop policy if exists "operativa_snapshot_rw" on public.operativa_snapshot;
create policy "operativa_snapshot_rw"
  on public.operativa_snapshot
  for all
  to authenticated
  using (true)
  with check (true);

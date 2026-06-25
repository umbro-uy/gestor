-- Tabla de seguimiento de la Operativa: persiste los pedidos accionables
-- (atrasados/críticos/no-despacho/estancados/inconsistentes) junto con el
-- comentario y la marca de "accionado", para que el análisis no se pierda al
-- recargar archivos. El cruce actualiza el snapshot de estados sin pisar el
-- comentario; los comentarios se guardan por pedido.
--
-- Ejecutar una sola vez en Supabase → SQL Editor.

create table if not exists public.operativa_seguimiento (
  pedido           text primary key,
  tienda           text,
  fecha            text,
  estado_fen       text,
  estado_wms       text,
  estado_eco       text,
  deposito         text,
  fecha_despacho   text,
  forma_entrega    text,
  fecha_entrega    text,
  importe          text,
  dias             int,
  click_collect    boolean default false,
  sin_wms          boolean default false,
  comentario       text default '',
  comentario_fecha timestamptz,
  historial        jsonb default '[]'::jsonb,
  accionado        boolean default false,
  actualizado      timestamptz default now()
);

-- Si la tabla ya existía de antes, agregá las columnas nuevas:
alter table public.operativa_seguimiento add column if not exists forma_entrega text;
alter table public.operativa_seguimiento add column if not exists fecha_entrega text;
alter table public.operativa_seguimiento add column if not exists comentario_fecha timestamptz;
alter table public.operativa_seguimiento add column if not exists historial jsonb default '[]'::jsonb;

-- Mantener "actualizado" al día en cada cambio
create or replace function public.set_actualizado()
returns trigger language plpgsql as $$
begin
  new.actualizado = now();
  return new;
end;
$$;

drop trigger if exists trg_operativa_seguimiento_upd on public.operativa_seguimiento;
create trigger trg_operativa_seguimiento_upd
  before update on public.operativa_seguimiento
  for each row execute function public.set_actualizado();

-- Seguridad a nivel de fila: permitir a usuarios autenticados leer/escribir
alter table public.operativa_seguimiento enable row level security;

drop policy if exists "operativa_seguimiento_rw" on public.operativa_seguimiento;
create policy "operativa_seguimiento_rw"
  on public.operativa_seguimiento
  for all
  to authenticated
  using (true)
  with check (true);

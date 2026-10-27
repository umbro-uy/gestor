-- Red histórica de vínculos para que la "lupa" (patrones: misma tarjeta/mail/IP usados por varios
-- documentos) contemple TODO el histórico, no sólo el reporte cargado. Se acumula sola cada vez que se
-- carga un reporte en Análisis → Fraude: cada mes suma, nada se recarga.
--
-- Privacidad: TODO hasheado. No se guarda PII legible de clientes (ni de los que no son fraude): sólo sirve
-- para contar cuántos documentos distintos compartieron una misma tarjeta / mail / IP.
--   pivote = 'card:'||hash(PAN)  |  'mail:'||hash(mail)  |  'ip:'||hash(IP)
--   doc    = hash(documento)
--
-- Ejecutar una sola vez en Supabase → SQL Editor.

create table if not exists public.fraude_red (
  pivote text not null,
  doc    text not null,
  creado timestamptz default now(),
  primary key (pivote, doc)   -- un vínculo entra una sola vez (dedupe entre meses/cargas)
);

alter table public.fraude_red enable row level security;
drop policy if exists "fraude_red_rw" on public.fraude_red;
create policy "fraude_red_rw" on public.fraude_red for all to authenticated using (true) with check (true);

-- Vista con los pivotes "interesantes" (usados por 2+ documentos distintos). Es lo único que necesita el
-- navegador para puntuar: devuelve pocas filas aunque la red tenga millones de vínculos.
create or replace view public.fraude_red_multi
with (security_invoker = true) as
  select pivote, count(distinct doc)::int as docs
  from public.fraude_red
  group by pivote
  having count(distinct doc) >= 2;

-- Zonas de entrega marcadas como riesgosas (geolocalización). Detectamos que gran parte de los fraudes
-- vienen de ciertas localidades (p.ej. Cerrillos), así que un pedido entregado en una zona de riesgo suma
-- puntos al score. Es una lista compartida y editable desde la app (Análisis → Fraude).
--
-- Ejecutar una sola vez en Supabase → SQL Editor.

create table if not exists public.fraude_zonas_riesgo (
  localidad text primary key,   -- localidad de entrega normalizada (minúsculas, sin acentos)
  etiqueta  text,               -- cómo se muestra (p.ej. "Cerrillos")
  creado    timestamptz default now()
);

alter table public.fraude_zonas_riesgo enable row level security;
drop policy if exists "fraude_zonas_riesgo_rw" on public.fraude_zonas_riesgo;
create policy "fraude_zonas_riesgo_rw"
  on public.fraude_zonas_riesgo
  for all
  to authenticated
  using (true)
  with check (true);

-- Semilla: Cerrillos
insert into public.fraude_zonas_riesgo (localidad, etiqueta)
values ('cerrillos', 'Cerrillos')
on conflict (localidad) do nothing;

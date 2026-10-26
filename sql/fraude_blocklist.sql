-- Lista negra COMPARTIDA de fraude (la "red colaborativa" entre tiendas: TimeOut 8001, Tienda Nacional 8101,
-- Classico 8201, y la cuarta a futuro). Guarda SÓLO atributos de pedidos confirmados como fraude, para que
-- cuando un mismo defraudador vuelva —con otra identidad pero reusando un dato— se detecte al instante, en
-- CUALQUIER tienda. Lo usa la pestaña Análisis → Fraude.
--
-- PCI / privacidad: la TARJETA nunca se guarda entera. Se guarda el hash SHA-256 del número (para poder
-- compararla) más BIN (primeros 6) y últimos 4, que alcanzan para que una persona la reconozca. El PAN
-- completo y el CVV NO se almacenan jamás. Todo queda en esta base, no sale a ningún servicio externo.
--
-- Ejecutar una sola vez en Supabase → SQL Editor.

create table if not exists public.fraude_blocklist (
  id      bigint generated always as identity primary key,
  tipo    text not null,              -- 'card' | 'doc' | 'mail' | 'ip'
  valor   text not null,              -- card: hash SHA-256 (NUNCA el PAN). doc/mail/ip: valor normalizado
  bin     text,                       -- sólo card: primeros 6 dígitos (para reconocerla)
  last4   text,                       -- sólo card: últimos 4 dígitos
  tienda  text,                       -- tienda donde se detectó
  pedido  text,                       -- pedido de origen
  motivo  text,                       -- motivo registrado (fraude confirmado, robo de tarjeta, etc.)
  creado  timestamptz default now(),
  unique (tipo, valor)                -- un atributo entra una sola vez (upsert lo deduplica entre tiendas)
);

-- Seguridad a nivel de fila: usuarios autenticados pueden leer/escribir
alter table public.fraude_blocklist enable row level security;

drop policy if exists "fraude_blocklist_rw" on public.fraude_blocklist;
create policy "fraude_blocklist_rw"
  on public.fraude_blocklist
  for all
  to authenticated
  using (true)
  with check (true);

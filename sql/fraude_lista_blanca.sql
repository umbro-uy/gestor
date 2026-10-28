-- Lista BLANCA de fraude: clientes conocidos (p.ej. que compran grandes volúmenes) para que NO se marquen
-- como sospechosos en cada compra. Compartida entre tiendas, igual que la lista negra.
--
-- Al analizar, si un pedido coincide por documento / mail / tarjeta con la lista blanca, se baja a "Bajo/OK"
-- (no entra a la cola de revisión), salvo que además esté en la lista negra (reincidencia de fraude confirmado),
-- en cuyo caso la lista negra manda.
--
-- Privacidad: la tarjeta se guarda hasheada (nunca el PAN). Documento/mail quedan legibles para que el equipo
-- vea a quién habilitó (es un cliente conocido, no un dato sensible de fraude).
--
-- Ejecutar una sola vez en Supabase → SQL Editor.

create table if not exists public.fraude_lista_blanca (
  id      bigint generated always as identity primary key,
  tipo    text not null,              -- 'doc' | 'mail' | 'card'
  valor   text not null,              -- doc/mail normalizado; card = hash SHA-256 (NUNCA el PAN)
  bin     text,                       -- sólo card
  last4   text,                       -- sólo card
  cliente text,                       -- nombre del cliente conocido (legible)
  nota    text,
  creado  timestamptz default now(),
  unique (tipo, valor)
);

alter table public.fraude_lista_blanca enable row level security;
drop policy if exists "fraude_lista_blanca_rw" on public.fraude_lista_blanca;
create policy "fraude_lista_blanca_rw"
  on public.fraude_lista_blanca
  for all
  to authenticated
  using (true)
  with check (true);

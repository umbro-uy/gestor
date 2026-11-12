-- Historial de pedidos para la sección Análisis → Fraude. La idea es cargar los reportes de ventas de
-- Fenicio UNA sola vez (desde el inicio de la venta online, 2020) y que queden persistidos y compartidos,
-- para poder BUSCAR cualquier pedido más adelante y marcarlo como fraude a mano, aunque no se haya vuelto a
-- cargar ese reporte. Se guarda una fila por pedido (tienda + nº de pedido).
--
-- Privacidad: NO se guarda el número de tarjeta completo (PAN), sólo su hash + BIN + últimos 4 (igual que la
-- lista negra). Documento/mail/teléfono/IP se guardan normalizados para poder buscar y cruzar. Es una tabla
-- interna, sólo accesible a usuarios autenticados (RLS).
--
-- Ejecutar una sola vez en Supabase → SQL Editor.

create table if not exists public.fraude_historial (
  tienda       text not null,          -- "TimeOut" | "Tienda Nacional" | "Classico"
  pedido       text not null,          -- Nro. de pedido (se repite entre tiendas, por eso la clave es tienda+pedido)
  fecha        text,                   -- fecha de pago (texto tal cual viene del reporte)
  nombre       text,                   -- nombre y apellido del comprador
  doc          text,                   -- documento normalizado
  mail         text,                   -- mail normalizado
  tel          text,                   -- teléfono normalizado
  ip           text,                   -- IP normalizada
  bin          text,                   -- primeros 6 de la tarjeta
  last4        text,                   -- últimos 4 de la tarjeta
  card_hash    text,                   -- hash de la tarjeta (nunca el PAN completo)
  importe      numeric,
  localidad    text,
  departamento text,
  actualizado  timestamptz default now(),
  primary key (tienda, pedido)
);

-- Índices para el buscador (nº de pedido, documento, mail, teléfono exactos/por prefijo).
create index if not exists fraude_historial_pedido_idx on public.fraude_historial (pedido);
create index if not exists fraude_historial_doc_idx on public.fraude_historial (doc);
create index if not exists fraude_historial_mail_idx on public.fraude_historial (mail);
create index if not exists fraude_historial_tel_idx on public.fraude_historial (tel);
-- Nombre: índice trigram para búsquedas por "contiene" (ILIKE %texto%).
create extension if not exists pg_trgm;
create index if not exists fraude_historial_nombre_trgm on public.fraude_historial using gin (nombre gin_trgm_ops);

alter table public.fraude_historial enable row level security;
drop policy if exists "fraude_historial_rw" on public.fraude_historial;
create policy "fraude_historial_rw"
  on public.fraude_historial
  for all
  to authenticated
  using (true)
  with check (true);

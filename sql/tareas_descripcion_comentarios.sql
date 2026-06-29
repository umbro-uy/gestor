-- Agrega descripción y comentarios (bitácora) a las tareas del tablero.
-- Ejecutar una sola vez en Supabase → SQL Editor.

alter table public.tareas add column if not exists descripcion text;
alter table public.tareas add column if not exists comentarios jsonb default '[]'::jsonb;

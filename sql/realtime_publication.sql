-- OPCIONAL pero recomendado: hace que los cambios de Operativa/Análisis lleguen EN VIVO al resto
-- de los usuarios (sin tener que recargar ni tocar "Actualizar"). Agrega las tablas a la
-- publicación de realtime de Supabase. Es idempotente: se puede correr varias veces.
--
-- Ejecutar una sola vez en Supabase → SQL Editor.

do $$
declare t text;
begin
  foreach t in array array['operativa_seguimiento','operativa_snapshot','analisis_snapshot','metas_mensuales','kpis_globales']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

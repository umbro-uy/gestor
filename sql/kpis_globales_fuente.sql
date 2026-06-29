-- KPIs de "Estado operativo" (Resumen): permite que un indicador se calcule SOLO
-- desde los datos reales en vez de cargarse a mano.
--   fuente      = null/'manual' → el valor se tipea; o una clave automática
--                 ('atrasados_op', 'depo0_op', 'pendientes_factura', 'facturacion_mes')
--                 → el valor sale en vivo de Operativa / Análisis y no se edita a mano.
--   actualizado = fecha de la última edición manual (para mostrar "actualizado hace X días").
--
-- Ejecutar una sola vez en Supabase → SQL Editor.

alter table public.kpis_globales add column if not exists fuente text;
alter table public.kpis_globales add column if not exists actualizado timestamptz;

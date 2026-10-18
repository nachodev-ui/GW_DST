-- SOLO SQL Editor de Supabase con rol postgres. NUNCA desde la app.
-- Operación manual privilegiada para una cuenta de prueba que ya solicitó acceso.
-- Reemplazar el UUID; verificar cuidadosamente la cuenta antes de ejecutar TODO.
begin;
do $$
declare
  test_driver_id uuid := '00000000-0000-0000-0000-000000000000';
begin
  if test_driver_id = '00000000-0000-0000-0000-000000000000' then
    raise exception 'Reemplaza test_driver_id por el UUID de la cuenta de prueba';
  end if;
  perform 1 from public.profiles where id = test_driver_id for update;
  if not found then raise exception 'La cuenta no tiene perfil'; end if;
  perform 1 from public.drivers where id = test_driver_id for update;
  if not found then raise exception 'La cuenta debe solicitar acceso desde la app primero'; end if;
  update public.profiles set role = 'driver' where id = test_driver_id;
  update public.drivers set is_verified = true where id = test_driver_id;
  -- No modifica disponibilidad ni comunas: el repartidor las elige en la app.
  raise notice 'Cuenta de prueba aprobada: %', test_driver_id;
end;
$$;
commit;

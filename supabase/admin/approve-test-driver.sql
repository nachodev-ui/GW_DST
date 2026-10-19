-- SOLO SQL Editor de Supabase con rol postgres. NUNCA desde la app.
-- Desde 20261019004638, las nuevas incorporaciones requieren invitación del negocio
-- aceptada con el correo confirmado correcto y formulario privado completo.
-- Requiere 20261018195303_distributors_driver_review.sql y distribuidor verificado.
-- Con 20261018211559, la cuenta debe completar el formulario y solicitar ese distribuidor.
-- Con 20261018213030, el responsable del negocio debe confirmar la versión de esa solicitud.
-- Antes de reparto real, revisar licencia apropiada/vigente, vehículo y capacitación;
-- esta operación no sustituye los antecedentes exigibles ni certifica autorización SEC.
-- Operación manual privilegiada para una cuenta de prueba que ya solicitó acceso.
-- Reemplazar el UUID; verificar cuidadosamente la cuenta antes de ejecutar TODO.
begin;
do $$
declare
  test_driver_id uuid := '00000000-0000-0000-0000-000000000000';
  test_distributor_id uuid := '00000000-0000-0000-0000-000000000000';
  operator_reference text := 'REEMPLAZAR';
begin
  if test_driver_id = '00000000-0000-0000-0000-000000000000'
    or test_distributor_id = '00000000-0000-0000-0000-000000000000'
    or operator_reference = 'REEMPLAZAR' then
    raise exception 'Completa cuenta, distribuidor verificado y referencia del operador';
  end if;
  perform private.review_driver_application(test_driver_id, 'approved', test_distributor_id,
    'Cuenta de prueba revisada manualmente', operator_reference);
  -- Queda no disponible; el repartidor elige disponibilidad y comunas en la app.
  raise notice 'Cuenta de prueba aprobada: %', test_driver_id;
end;
$$;
commit;

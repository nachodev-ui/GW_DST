begin;

-- delivered_at already exists. Keep the transition and event triggers as the
-- single source of truth; no duplicate event insertion in this RPC.
create function private.advance_driver_order(p_order_id uuid, p_status public.order_status) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  current_status public.order_status;
begin
  -- Match acceptance/settings lock order: driver first, then order.
  perform 1 from public.drivers d join public.profiles p on p.id = d.id
    where d.id = caller and d.is_verified and p.role = 'driver' for update of d;
  if not found then
    raise exception 'Driver not eligible' using errcode = '42501';
  end if;
  select status into current_status from public.orders
    where id = p_order_id and driver_id = caller for update;
  if not found then
    raise exception 'Order not assigned to caller' using errcode = '42501';
  end if;
  if p_status is null or not (
    (current_status = 'accepted' and p_status = 'on_the_way') or
    (current_status = 'on_the_way' and p_status = 'delivered')
  ) then
    raise exception 'Invalid delivery transition' using errcode = '55000';
  end if;
  update public.orders set status = p_status,
    delivered_at = case when p_status = 'delivered' then now() else delivered_at end
    where id = p_order_id;
  -- updated_at and actor/from/to events are written atomically by existing triggers.
  return private.get_driver_order(p_order_id);
end;
$$;

create function public.advance_driver_order(p_order_id uuid, p_status public.order_status) returns jsonb
language sql security invoker set search_path = '' as $$
  select private.advance_driver_order(p_order_id, p_status);
$$;
revoke all on function private.advance_driver_order(uuid, public.order_status),
  public.advance_driver_order(uuid, public.order_status) from public, anon, authenticated;
grant execute on function private.advance_driver_order(uuid, public.order_status),
  public.advance_driver_order(uuid, public.order_status) to authenticated;

-- Preserve participant-only SELECT policies and read-only mobile table grants.
-- The initial migration already publishes orders; tolerate that configuration.
do $$
begin
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$$;

commit;

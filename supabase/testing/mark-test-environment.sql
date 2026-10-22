-- Install only on Gasway Test, after all migrations. Never on the linked app database.
create table if not exists private.test_environment (
  project_ref text primary key check (project_ref = 'xnrueexpwzvxotgwmamj')
);
alter table private.test_environment enable row level security;
revoke all on private.test_environment from public, anon, authenticated, service_role;
insert into private.test_environment(project_ref) values ('xnrueexpwzvxotgwmamj')
on conflict do nothing;

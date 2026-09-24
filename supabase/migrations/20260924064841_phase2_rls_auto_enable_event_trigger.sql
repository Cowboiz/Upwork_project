create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  command record;
begin
  for command in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type = 'table'
      and schema_name = 'public'
  loop
    begin
      execute format(
        'alter table %s enable row level security',
        command.objid::regclass
      );
    exception
      when others then
        raise warning
          'Could not enable row level security on %.%: %',
          command.schema_name,
          command.object_identity,
          sqlerrm;
    end;
  end loop;
end;
$$;

revoke all on function public.rls_auto_enable() from public;
revoke all on function public.rls_auto_enable() from anon;
revoke all on function public.rls_auto_enable() from authenticated;
revoke all on function public.rls_auto_enable() from service_role;

drop event trigger if exists ensure_rls;

create event trigger ensure_rls
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();

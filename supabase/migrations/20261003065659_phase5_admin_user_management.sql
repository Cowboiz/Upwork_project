alter table public.profiles
  add column if not exists account_status text not null default 'active';

alter table public.profiles
  drop constraint if exists profiles_account_status_check,
  add constraint profiles_account_status_check
    check (account_status = any (array['active'::text, 'deactivated'::text]));

create index if not exists profiles_account_status_idx
  on public.profiles using btree (account_status);

create or replace function public.prevent_generic_admin_account_lifecycle_change()
  returns trigger
  language plpgsql
  set search_path = ''
as $function$
begin
  if old.role = 'admin' then
    if tg_op = 'DELETE' then
      raise exception 'Admin accounts cannot be deleted through generic user management';
    end if;

    if new.role <> 'admin' then
      raise exception 'Admin accounts cannot be demoted through generic user management';
    end if;

    if new.account_status <> 'active' then
      raise exception 'Admin accounts cannot be deactivated through generic user management';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$;

drop trigger if exists prevent_generic_admin_account_lifecycle_change on public.profiles;

create trigger prevent_generic_admin_account_lifecycle_change
  before update or delete on public.profiles
  for each row
  execute function public.prevent_generic_admin_account_lifecycle_change();

revoke all on function public.prevent_generic_admin_account_lifecycle_change() from public;
revoke all on function public.prevent_generic_admin_account_lifecycle_change() from anon;
revoke all on function public.prevent_generic_admin_account_lifecycle_change() from authenticated;

create or replace function public.admin_list_users(
  p_q text default null,
  p_role text default null,
  p_status text default null,
  p_sort text default 'newest',
  p_limit integer default 10,
  p_offset integer default 0
)
  returns table (
    id uuid,
    full_name text,
    username text,
    email text,
    role text,
    account_status text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    total_count bigint
  )
  language sql
  security definer
  stable
  set search_path = ''
as $function$
  with normalized as (
    select
      nullif(trim(p_q), '') as q,
      case
        when p_role in ('student', 'freelancer', 'both', 'admin') then p_role
        else null
      end as selected_role,
      case
        when p_status in ('active', 'deactivated') then p_status
        else null
      end as selected_status,
      case when p_sort = 'oldest' then true else false end as sort_ascending,
      least(greatest(coalesce(p_limit, 10), 1), 50) as safe_limit,
      greatest(coalesce(p_offset, 0), 0) as safe_offset
  ),
  filtered as (
    select
      profiles.id,
      profiles.full_name,
      profiles.username,
      auth_users.email,
      profiles.role,
      profiles.account_status,
      profiles.created_at,
      profiles.updated_at,
      auth_users.last_sign_in_at
    from public.profiles
    join auth.users as auth_users
      on auth_users.id = profiles.id
    cross join normalized
    where public.is_admin()
      and (
        normalized.selected_role is null
        or profiles.role = normalized.selected_role
      )
      and (
        normalized.selected_status is null
        or profiles.account_status = normalized.selected_status
      )
      and (
        normalized.q is null
        or profiles.full_name ilike ('%' || normalized.q || '%')
        or profiles.username ilike ('%' || normalized.q || '%')
        or auth_users.email ilike ('%' || normalized.q || '%')
      )
  )
  select
    filtered.id,
    filtered.full_name,
    filtered.username,
    filtered.email,
    filtered.role,
    filtered.account_status,
    filtered.created_at,
    filtered.updated_at,
    filtered.last_sign_in_at,
    count(*) over () as total_count
  from filtered
  cross join normalized
  order by
    case when normalized.sort_ascending then filtered.created_at end asc,
    case when not normalized.sort_ascending then filtered.created_at end desc,
    filtered.id asc
  limit (select safe_limit from normalized)
  offset (select safe_offset from normalized);
$function$;

create or replace function public.admin_get_user(p_user_id uuid)
  returns table (
    id uuid,
    full_name text,
    username text,
    email text,
    role text,
    account_status text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    last_sign_in_at timestamp with time zone
  )
  language sql
  security definer
  stable
  set search_path = ''
as $function$
  select
    profiles.id,
    profiles.full_name,
    profiles.username,
    auth_users.email,
    profiles.role,
    profiles.account_status,
    profiles.created_at,
    profiles.updated_at,
    auth_users.last_sign_in_at
  from public.profiles
  join auth.users as auth_users
    on auth_users.id = profiles.id
  where public.is_admin()
    and profiles.id = p_user_id;
$function$;

create or replace function public.admin_user_business_history(p_user_id uuid)
  returns table (
    has_history boolean,
    protected_reference_count bigint
  )
  language sql
  security definer
  stable
  set search_path = ''
as $function$
  with protected_refs as (
    select id from public.project_requests
    where linked_student_profile_id = p_user_id
       or reviewed_by = p_user_id
    union all
    select id from public.provider_applications
    where linked_provider_profile_id = p_user_id
       or reviewed_by = p_user_id
    union all
    select id from public.request_candidates
    where linked_provider_profile_id = p_user_id
       or curated_by = p_user_id
    union all
    select id from public.workflow_events
    where actor_user_id = p_user_id
    union all
    select id from public.contracts
    where student_id = p_user_id
       or freelancer_id = p_user_id
    union all
    select id from public.conversations
    where student_id = p_user_id
       or freelancer_id = p_user_id
    union all
    select id from public.messages
    where sender_id = p_user_id
    union all
    select id from public.reviews
    where reviewer_id = p_user_id
       or reviewee_id = p_user_id
    union all
    select id from public.projects
    where student_id = p_user_id
    union all
    select id from public.proposals
    where freelancer_id = p_user_id
  ),
  counted as (
    select count(*)::bigint as reference_count
    from protected_refs
  )
  select
    counted.reference_count > 0 as has_history,
    counted.reference_count as protected_reference_count
  from counted
  where public.is_admin();
$function$;

revoke all on function public.admin_list_users(text, text, text, text, integer, integer) from public;
revoke all on function public.admin_list_users(text, text, text, text, integer, integer) from anon;
revoke all on function public.admin_list_users(text, text, text, text, integer, integer) from authenticated;
grant execute on function public.admin_list_users(text, text, text, text, integer, integer) to authenticated;

revoke all on function public.admin_get_user(uuid) from public;
revoke all on function public.admin_get_user(uuid) from anon;
revoke all on function public.admin_get_user(uuid) from authenticated;
grant execute on function public.admin_get_user(uuid) to authenticated;

revoke all on function public.admin_user_business_history(uuid) from public;
revoke all on function public.admin_user_business_history(uuid) from anon;
revoke all on function public.admin_user_business_history(uuid) from authenticated;
grant execute on function public.admin_user_business_history(uuid) to authenticated;

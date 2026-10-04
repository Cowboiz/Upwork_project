create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
  as $function$
declare
  v_requested_role text;
  v_safe_role text;
begin
  v_requested_role := coalesce(
    new.raw_user_meta_data ->> 'account_role',
    new.raw_user_meta_data ->> 'role'
  );

  v_safe_role := case
    when v_requested_role in ('student', 'freelancer', 'both') then v_requested_role
    else 'student'
  end;

  insert into public.profiles (
    id,
    full_name,
    avatar_url,
    role
  )
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    new.raw_user_meta_data ->> 'avatar_url',
    v_safe_role
  );

  return new;
end;
$function$;

create or replace function public.update_my_profile(
  p_full_name text,
  p_username text
)
  returns table (
    id uuid,
    full_name text,
    username text,
    role text,
    updated_at timestamp with time zone
  )
  language plpgsql
  security definer
  set search_path = ''
  as $function$
declare
  v_user_id uuid;
  v_full_name text;
  v_username text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_full_name := nullif(trim(p_full_name), '');
  v_username := lower(nullif(trim(p_username), ''));

  if v_full_name is not null and char_length(v_full_name) > 120 then
    raise exception 'Full name is too long';
  end if;

  if v_username is not null and (
    char_length(v_username) < 3
    or char_length(v_username) > 40
    or v_username !~ '^[a-z0-9][a-z0-9_.-]*$'
  ) then
    raise exception 'Username is invalid';
  end if;

  return query
  update public.profiles
  set
    full_name = v_full_name,
    username = v_username,
    updated_at = now()
  where public.profiles.id = v_user_id
  returning
    public.profiles.id,
    public.profiles.full_name,
    public.profiles.username,
    public.profiles.role,
    public.profiles.updated_at;
end;
$function$;

revoke all on function public.update_my_profile(text, text) from public;
revoke all on function public.update_my_profile(text, text) from anon;
revoke all on function public.update_my_profile(text, text) from authenticated;
grant execute on function public.update_my_profile(text, text) to authenticated;

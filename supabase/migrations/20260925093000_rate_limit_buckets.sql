create table public.rate_limit_buckets (
  key_hash text not null,
  action text not null,
  window_start timestamp with time zone not null,
  hit_count integer not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint rate_limit_buckets_pkey primary key (action, key_hash, window_start),
  constraint rate_limit_buckets_action_check
    check (char_length(btrim(action)) between 1 and 100),
  constraint rate_limit_buckets_key_hash_check
    check (char_length(btrim(key_hash)) between 1 and 128),
  constraint rate_limit_buckets_hit_count_check
    check (hit_count >= 0)
);

create index rate_limit_buckets_window_start_idx
on public.rate_limit_buckets (window_start);

alter table public.rate_limit_buckets enable row level security;

revoke all on table public.rate_limit_buckets from public;
revoke all on table public.rate_limit_buckets from anon;
revoke all on table public.rate_limit_buckets from authenticated;
grant select, insert, update, delete on table public.rate_limit_buckets to service_role;

create or replace function public.check_rate_limit(
  p_action text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text := pg_catalog.btrim(p_action);
  v_key_hash text := pg_catalog.btrim(p_key_hash);
  v_now timestamp with time zone := pg_catalog.statement_timestamp();
  v_window_epoch bigint;
  v_window_start timestamp with time zone;
  v_hit_count integer;
  v_retry_after_seconds integer;
begin
  if v_action is null or pg_catalog.char_length(v_action) = 0 or pg_catalog.char_length(v_action) > 100 then
    raise exception using
      errcode = '22023',
      message = 'invalid rate limit action';
  end if;

  if v_key_hash is null or pg_catalog.char_length(v_key_hash) = 0 or pg_catalog.char_length(v_key_hash) > 128 then
    raise exception using
      errcode = '22023',
      message = 'invalid rate limit key';
  end if;

  if p_limit is null or p_limit <= 0 or p_limit > 10000 then
    raise exception using
      errcode = '22023',
      message = 'invalid rate limit';
  end if;

  if p_window_seconds is null or p_window_seconds <= 0 or p_window_seconds > 86400 then
    raise exception using
      errcode = '22023',
      message = 'invalid rate limit window';
  end if;

  v_window_epoch := (
    pg_catalog.floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  )::bigint;
  v_window_start := pg_catalog.to_timestamp(v_window_epoch);

  insert into public.rate_limit_buckets (
    action,
    key_hash,
    window_start,
    hit_count,
    created_at,
    updated_at
  )
  values (
    v_action,
    v_key_hash,
    v_window_start,
    1,
    v_now,
    v_now
  )
  on conflict (action, key_hash, window_start)
  do update set
    hit_count = pg_catalog.least(public.rate_limit_buckets.hit_count, 10000) + 1,
    updated_at = v_now
  returning public.rate_limit_buckets.hit_count into v_hit_count;

  begin
    delete from public.rate_limit_buckets
    where ctid in (
      select ctid
      from public.rate_limit_buckets
      where window_start < v_now - interval '2 days'
      order by window_start
      limit 100
    );
  exception
    when others then
      raise warning 'rate limit cleanup failed';
  end;

  v_retry_after_seconds := pg_catalog.ceil(
    extract(epoch from (v_window_start + (p_window_seconds * interval '1 second')) - v_now)
  )::integer;

  if v_retry_after_seconds < 0 then
    v_retry_after_seconds := 0;
  end if;

  allowed := v_hit_count <= p_limit;

  if v_hit_count >= p_limit then
    remaining := 0;
  else
    remaining := p_limit - v_hit_count;
  end if;

  if allowed then
    retry_after_seconds := 0;
  else
    retry_after_seconds := v_retry_after_seconds;
  end if;

  return next;
end;
$$;

revoke all on function public.check_rate_limit(text, text, integer, integer) from public;
revoke all on function public.check_rate_limit(text, text, integer, integer) from anon;
revoke all on function public.check_rate_limit(text, text, integer, integer) from authenticated;
grant execute on function public.check_rate_limit(text, text, integer, integer) to service_role;

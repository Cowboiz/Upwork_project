create table if not exists public.engagement_messages (
  id uuid primary key default gen_random_uuid(),
  project_engagement_id uuid not null
    references public.project_engagements(id)
    on delete cascade,
  sender_profile_id uuid not null
    references public.profiles(id),
  client_message_id uuid not null,
  body text not null,
  created_at timestamp with time zone not null default now(),
  constraint engagement_messages_body_length_check
    check (
      char_length(btrim(body)) >= 1
      and char_length(btrim(body)) <= 4000
    ),
  constraint engagement_messages_sender_client_message_key
    unique (sender_profile_id, client_message_id)
);

create index if not exists engagement_messages_engagement_created_idx
  on public.engagement_messages using btree (
    project_engagement_id,
    created_at desc,
    id desc
  );

create index if not exists engagement_messages_sender_created_idx
  on public.engagement_messages using btree (
    sender_profile_id,
    created_at desc
  );

alter table public.engagement_messages enable row level security;

revoke all on table public.engagement_messages from anon, authenticated;

create or replace function public.get_engagement_thread(p_engagement_id uuid)
  returns table (
    engagement_id uuid,
    category text,
    engagement_status text,
    participant_side text,
    counterparty_display_name text,
    last_message_preview text,
    last_message_at timestamp with time zone,
    created_at timestamp with time zone,
    can_send boolean
  )
  language sql
  security definer
  stable
  set search_path = ''
as $function$
  with current_profile as (
    select profiles.id, profiles.role, profiles.account_status
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role in ('student', 'freelancer', 'both')
      and profiles.account_status = 'active'
  ),
  engagement_participants as (
    select
      project_engagements.id as engagement_id,
      project_engagements.status as engagement_status,
      project_engagements.created_at,
      project_requests.category,
      project_requests.linked_student_profile_id as student_profile_id,
      coalesce(
        request_candidates.linked_provider_profile_id,
        provider_applications.linked_provider_profile_id
      ) as provider_profile_id
    from public.project_engagements
    join public.request_candidates
      on request_candidates.id = project_engagements.request_candidate_id
    join public.project_requests
      on project_requests.id = request_candidates.project_request_id
    left join public.provider_applications
      on provider_applications.id = request_candidates.provider_application_id
    where project_engagements.id = p_engagement_id
  ),
  authorized as (
    select
      engagement_participants.*,
      case
        when current_profile.id = engagement_participants.student_profile_id then 'student'
        when current_profile.id = engagement_participants.provider_profile_id then 'provider'
      end as participant_side,
      case
        when current_profile.id = engagement_participants.student_profile_id then engagement_participants.provider_profile_id
        else engagement_participants.student_profile_id
      end as counterparty_profile_id
    from engagement_participants
    join current_profile on current_profile.id in (
      engagement_participants.student_profile_id,
      engagement_participants.provider_profile_id
    )
    where engagement_participants.student_profile_id is not null
      and engagement_participants.provider_profile_id is not null
  ),
  last_message as (
    select distinct on (engagement_messages.project_engagement_id)
      engagement_messages.project_engagement_id,
      engagement_messages.body,
      engagement_messages.created_at
    from public.engagement_messages
    join authorized
      on authorized.engagement_id = engagement_messages.project_engagement_id
    order by
      engagement_messages.project_engagement_id,
      engagement_messages.created_at desc,
      engagement_messages.id desc
  )
  select
    authorized.engagement_id,
    authorized.category,
    authorized.engagement_status,
    authorized.participant_side,
    coalesce(
      nullif(counterparty.full_name, ''),
      nullif(counterparty.username, ''),
      'ProjectMatch participant'
    ) as counterparty_display_name,
    case
      when last_message.body is null then null
      when char_length(last_message.body) > 140 then left(last_message.body, 140) || '...'
      else last_message.body
    end as last_message_preview,
    last_message.created_at as last_message_at,
    authorized.created_at,
    (
      authorized.engagement_status in ('agreed', 'in_progress', 'submitted')
      and counterparty.account_status = 'active'
      and counterparty.role in ('student', 'freelancer', 'both')
    ) as can_send
  from authorized
  join public.profiles as counterparty
    on counterparty.id = authorized.counterparty_profile_id
  left join last_message
    on last_message.project_engagement_id = authorized.engagement_id;
$function$;

create or replace function public.get_my_engagement_threads(
  p_limit integer,
  p_offset integer
)
  returns table (
    engagement_id uuid,
    category text,
    engagement_status text,
    participant_side text,
    counterparty_display_name text,
    last_message_preview text,
    last_message_at timestamp with time zone,
    created_at timestamp with time zone,
    can_send boolean,
    total_count bigint
  )
  language sql
  security definer
  stable
  set search_path = ''
as $function$
  with current_profile as (
    select profiles.id, profiles.role, profiles.account_status
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role in ('student', 'freelancer', 'both')
      and profiles.account_status = 'active'
  ),
  engagement_participants as (
    select
      project_engagements.id as engagement_id,
      project_engagements.status as engagement_status,
      project_engagements.created_at,
      project_requests.category,
      project_requests.linked_student_profile_id as student_profile_id,
      coalesce(
        request_candidates.linked_provider_profile_id,
        provider_applications.linked_provider_profile_id
      ) as provider_profile_id
    from public.project_engagements
    join public.request_candidates
      on request_candidates.id = project_engagements.request_candidate_id
    join public.project_requests
      on project_requests.id = request_candidates.project_request_id
    left join public.provider_applications
      on provider_applications.id = request_candidates.provider_application_id
  ),
  authorized as (
    select
      engagement_participants.*,
      case
        when current_profile.id = engagement_participants.student_profile_id then 'student'
        when current_profile.id = engagement_participants.provider_profile_id then 'provider'
      end as participant_side,
      case
        when current_profile.id = engagement_participants.student_profile_id then engagement_participants.provider_profile_id
        else engagement_participants.student_profile_id
      end as counterparty_profile_id
    from engagement_participants
    join current_profile on current_profile.id in (
      engagement_participants.student_profile_id,
      engagement_participants.provider_profile_id
    )
    where engagement_participants.student_profile_id is not null
      and engagement_participants.provider_profile_id is not null
  ),
  last_messages as (
    select distinct on (engagement_messages.project_engagement_id)
      engagement_messages.project_engagement_id,
      engagement_messages.body,
      engagement_messages.created_at
    from public.engagement_messages
    join authorized
      on authorized.engagement_id = engagement_messages.project_engagement_id
    order by
      engagement_messages.project_engagement_id,
      engagement_messages.created_at desc,
      engagement_messages.id desc
  ),
  threads as (
    select
      authorized.engagement_id,
      authorized.category,
      authorized.engagement_status,
      authorized.participant_side,
      coalesce(
        nullif(counterparty.full_name, ''),
        nullif(counterparty.username, ''),
        'ProjectMatch participant'
      ) as counterparty_display_name,
      case
        when last_messages.body is null then null
        when char_length(last_messages.body) > 140 then left(last_messages.body, 140) || '...'
        else last_messages.body
      end as last_message_preview,
      last_messages.created_at as last_message_at,
      authorized.created_at,
      (
        authorized.engagement_status in ('agreed', 'in_progress', 'submitted')
        and counterparty.account_status = 'active'
        and counterparty.role in ('student', 'freelancer', 'both')
      ) as can_send
    from authorized
    join public.profiles as counterparty
      on counterparty.id = authorized.counterparty_profile_id
    left join last_messages
      on last_messages.project_engagement_id = authorized.engagement_id
  )
  select
    threads.engagement_id,
    threads.category,
    threads.engagement_status,
    threads.participant_side,
    threads.counterparty_display_name,
    threads.last_message_preview,
    threads.last_message_at,
    threads.created_at,
    threads.can_send,
    count(*) over () as total_count
  from threads
  order by coalesce(threads.last_message_at, threads.created_at) desc, threads.engagement_id desc
  limit least(greatest(coalesce(p_limit, 10), 1), 10)
  offset greatest(coalesce(p_offset, 0), 0);
$function$;

create or replace function public.get_engagement_messages(
  p_engagement_id uuid,
  p_limit integer,
  p_offset integer
)
  returns table (
    id uuid,
    project_engagement_id uuid,
    sender_profile_id uuid,
    sender_display_name text,
    body text,
    created_at timestamp with time zone,
    total_count bigint
  )
  language sql
  security definer
  stable
  set search_path = ''
as $function$
  with authorized_thread as (
    select get_engagement_thread.engagement_id
    from public.get_engagement_thread(p_engagement_id)
  ),
  all_messages as (
    select
      engagement_messages.*,
      count(*) over () as total_count
    from public.engagement_messages
    join authorized_thread
      on authorized_thread.engagement_id = engagement_messages.project_engagement_id
  ),
  selected_messages as (
    select all_messages.*
    from all_messages
    order by all_messages.created_at desc, all_messages.id desc
    limit least(greatest(coalesce(p_limit, 50), 1), 50)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select
    selected_messages.id,
    selected_messages.project_engagement_id,
    selected_messages.sender_profile_id,
    coalesce(
      nullif(sender.full_name, ''),
      nullif(sender.username, ''),
      'ProjectMatch participant'
    ) as sender_display_name,
    selected_messages.body,
    selected_messages.created_at,
    selected_messages.total_count
  from selected_messages
  join public.profiles as sender
    on sender.id = selected_messages.sender_profile_id
  order by selected_messages.created_at asc, selected_messages.id asc;
$function$;

create or replace function public.send_engagement_message(
  p_engagement_id uuid,
  p_client_message_id uuid,
  p_body text
)
  returns table (
    id uuid,
    project_engagement_id uuid,
    sender_profile_id uuid,
    body text,
    created_at timestamp with time zone
  )
  language plpgsql
  security definer
  set search_path = ''
as $function$
declare
  v_sender_id uuid;
  v_body text;
  v_thread record;
  v_message public.engagement_messages;
begin
  v_sender_id := auth.uid();

  if v_sender_id is null then
    raise exception 'Authentication required';
  end if;

  v_body := btrim(coalesce(p_body, ''));

  if char_length(v_body) < 1 or char_length(v_body) > 4000 then
    raise exception 'Message body is invalid';
  end if;

  select *
  into v_thread
  from public.get_engagement_thread(p_engagement_id);

  if not found or v_thread.engagement_id is null then
    raise exception 'Messaging is unavailable';
  end if;

  if not v_thread.can_send then
    raise exception 'Messaging is unavailable';
  end if;

  insert into public.engagement_messages (
    project_engagement_id,
    sender_profile_id,
    client_message_id,
    body
  )
  values (
    p_engagement_id,
    v_sender_id,
    p_client_message_id,
    v_body
  )
  on conflict (sender_profile_id, client_message_id)
  do update set body = public.engagement_messages.body
  returning * into v_message;

  return query
  select
    v_message.id,
    v_message.project_engagement_id,
    v_message.sender_profile_id,
    v_message.body,
    v_message.created_at;
end;
$function$;

revoke all on function public.get_engagement_thread(uuid) from public, anon, authenticated;
grant execute on function public.get_engagement_thread(uuid) to authenticated;

revoke all on function public.get_my_engagement_threads(integer, integer) from public, anon, authenticated;
grant execute on function public.get_my_engagement_threads(integer, integer) to authenticated;

revoke all on function public.get_engagement_messages(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.get_engagement_messages(uuid, integer, integer) to authenticated;

revoke all on function public.send_engagement_message(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.send_engagement_message(uuid, uuid, text) to authenticated;

-- Legacy public.conversations and public.messages are intentionally untouched by this migration.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'engagement_messages_id_engagement_key'
      and conrelid = 'public.engagement_messages'::regclass
  ) then
    alter table public.engagement_messages
      add constraint engagement_messages_id_engagement_key
      unique (id, project_engagement_id);
  end if;
end $$;

create table if not exists public.engagement_message_reads (
  project_engagement_id uuid not null
    references public.project_engagements(id)
    on delete cascade,
  profile_id uuid not null
    references public.profiles(id)
    on delete cascade,
  last_read_message_id uuid null,
  last_read_created_at timestamp with time zone null,
  updated_at timestamp with time zone not null default now(),
  primary key (project_engagement_id, profile_id),
  constraint engagement_message_reads_message_watermark_fkey
    foreign key (last_read_message_id, project_engagement_id)
    references public.engagement_messages(id, project_engagement_id),
  constraint engagement_message_reads_watermark_pair_check
    check (
      (last_read_message_id is null and last_read_created_at is null)
      or (last_read_message_id is not null and last_read_created_at is not null)
    )
);

create index if not exists engagement_message_reads_profile_updated_idx
  on public.engagement_message_reads using btree (
    profile_id,
    updated_at desc
  );

alter table public.engagement_message_reads enable row level security;

revoke all on table public.engagement_message_reads from anon, authenticated;

grant select on table public.engagement_messages to authenticated;

create or replace function public.can_access_engagement_chat(p_engagement_id uuid)
  returns boolean
  language sql
  security definer
  stable
  set search_path = ''
as $function$
  with current_profile as (
    select profiles.id
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.account_status = 'active'
      and profiles.role in ('student', 'freelancer', 'both')
  ),
  engagement_participants as (
    select
      public.project_requests.linked_student_profile_id as student_profile_id,
      coalesce(
        public.request_candidates.linked_provider_profile_id,
        public.provider_applications.linked_provider_profile_id
      ) as provider_profile_id
    from public.project_engagements
    join public.request_candidates
      on public.request_candidates.id = public.project_engagements.request_candidate_id
    join public.project_requests
      on public.project_requests.id = public.request_candidates.project_request_id
    left join public.provider_applications
      on public.provider_applications.id = public.request_candidates.provider_application_id
    where public.project_engagements.id = p_engagement_id
  )
  select coalesce(
    exists (
      select 1
      from engagement_participants
      join current_profile
        on current_profile.id in (
          engagement_participants.student_profile_id,
          engagement_participants.provider_profile_id
        )
      where engagement_participants.student_profile_id is not null
        and engagement_participants.provider_profile_id is not null
    ),
    false
  );
$function$;

create policy "Engagement message active participants can select realtime rows"
  on public.engagement_messages
  for select
  to authenticated
  using (
    public.can_access_engagement_chat(project_engagement_id)
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'engagement_messages'
  ) then
    alter publication supabase_realtime add table public.engagement_messages;
  end if;
end $$;

drop function if exists public.get_engagement_thread(uuid);

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
    can_send boolean,
    unread_count bigint
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
      current_profile.id as viewer_profile_id,
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
  ),
  unread_messages as (
    select
      authorized.engagement_id,
      count(engagement_messages.id) as unread_count
    from authorized
    left join public.engagement_message_reads as engagement_message_reads
      on engagement_message_reads.project_engagement_id = authorized.engagement_id
      and engagement_message_reads.profile_id = authorized.viewer_profile_id
    join public.engagement_messages as engagement_messages
      on engagement_messages.project_engagement_id = authorized.engagement_id
      and engagement_messages.sender_profile_id = authorized.counterparty_profile_id
      and (
        engagement_message_reads.last_read_created_at is null
        or (
          engagement_messages.created_at,
          engagement_messages.id
        ) > (
          engagement_message_reads.last_read_created_at,
          engagement_message_reads.last_read_message_id
        )
      )
    group by authorized.engagement_id
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
    ) as can_send,
    coalesce(unread_messages.unread_count, 0::bigint) as unread_count
  from authorized
  join public.profiles as counterparty
    on counterparty.id = authorized.counterparty_profile_id
  left join last_message
    on last_message.project_engagement_id = authorized.engagement_id
  left join unread_messages
    on unread_messages.engagement_id = authorized.engagement_id;
$function$;

drop function if exists public.get_my_engagement_threads(integer, integer);

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
    unread_count bigint,
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
      current_profile.id as viewer_profile_id,
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
  unread_messages as (
    select
      authorized.engagement_id,
      count(engagement_messages.id) as unread_count
    from authorized
    left join public.engagement_message_reads as engagement_message_reads
      on engagement_message_reads.project_engagement_id = authorized.engagement_id
      and engagement_message_reads.profile_id = authorized.viewer_profile_id
    join public.engagement_messages as engagement_messages
      on engagement_messages.project_engagement_id = authorized.engagement_id
      and engagement_messages.sender_profile_id = authorized.counterparty_profile_id
      and (
        engagement_message_reads.last_read_created_at is null
        or (
          engagement_messages.created_at,
          engagement_messages.id
        ) > (
          engagement_message_reads.last_read_created_at,
          engagement_message_reads.last_read_message_id
        )
      )
    group by authorized.engagement_id
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
      ) as can_send,
      coalesce(unread_messages.unread_count, 0::bigint) as unread_count
    from authorized
    join public.profiles as counterparty
      on counterparty.id = authorized.counterparty_profile_id
    left join last_messages
      on last_messages.project_engagement_id = authorized.engagement_id
    left join unread_messages
      on unread_messages.engagement_id = authorized.engagement_id
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
    threads.unread_count,
    count(*) over () as total_count
  from threads
  order by coalesce(threads.last_message_at, threads.created_at) desc, threads.engagement_id desc
  limit least(greatest(coalesce(p_limit, 10), 1), 10)
  offset greatest(coalesce(p_offset, 0), 0);
$function$;

create or replace function public.get_my_unread_message_count()
  returns bigint
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
  authorized as (
    select
      project_engagements.id as engagement_id,
      current_profile.id as viewer_profile_id,
      case
        when current_profile.id = project_requests.linked_student_profile_id then
          coalesce(
            request_candidates.linked_provider_profile_id,
            provider_applications.linked_provider_profile_id
          )
        else project_requests.linked_student_profile_id
      end as counterparty_profile_id
    from public.project_engagements
    join public.request_candidates
      on request_candidates.id = project_engagements.request_candidate_id
    join public.project_requests
      on project_requests.id = request_candidates.project_request_id
    left join public.provider_applications
      on provider_applications.id = request_candidates.provider_application_id
    join current_profile on current_profile.id in (
      project_requests.linked_student_profile_id,
      coalesce(
        request_candidates.linked_provider_profile_id,
        provider_applications.linked_provider_profile_id
      )
    )
    where project_requests.linked_student_profile_id is not null
      and coalesce(
        request_candidates.linked_provider_profile_id,
        provider_applications.linked_provider_profile_id
      ) is not null
  )
  select coalesce(count(engagement_messages.id), 0::bigint)
  from authorized
  left join public.engagement_message_reads as engagement_message_reads
    on engagement_message_reads.project_engagement_id = authorized.engagement_id
    and engagement_message_reads.profile_id = authorized.viewer_profile_id
  join public.engagement_messages as engagement_messages
    on engagement_messages.project_engagement_id = authorized.engagement_id
    and engagement_messages.sender_profile_id = authorized.counterparty_profile_id
    and (
      engagement_message_reads.last_read_created_at is null
      or (
        engagement_messages.created_at,
        engagement_messages.id
      ) > (
        engagement_message_reads.last_read_created_at,
        engagement_message_reads.last_read_message_id
      )
    );
$function$;

create or replace function public.mark_engagement_thread_read(
  p_engagement_id uuid,
  p_message_id uuid
)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $function$
declare
  v_reader_id uuid;
  v_thread record;
  v_message public.engagement_messages;
begin
  v_reader_id := auth.uid();

  if v_reader_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_thread
  from public.get_engagement_thread(p_engagement_id);

  if not found or v_thread.engagement_id is null then
    raise exception 'Messaging is unavailable';
  end if;

  select em.*
  into v_message
  from public.engagement_messages as em
  where em.id = p_message_id
    and em.project_engagement_id = p_engagement_id;

  if not found then
    raise exception 'Messaging is unavailable';
  end if;

  insert into public.engagement_message_reads as emr (
    project_engagement_id,
    profile_id,
    last_read_message_id,
    last_read_created_at,
    updated_at
  )
  values (
    p_engagement_id,
    v_reader_id,
    v_message.id,
    v_message.created_at,
    now()
  )
  on conflict (project_engagement_id, profile_id)
  do update set
    last_read_message_id = excluded.last_read_message_id,
    last_read_created_at = excluded.last_read_created_at,
    updated_at = now()
  where emr.last_read_created_at is null
    or (
      excluded.last_read_created_at,
      excluded.last_read_message_id
    ) > (
      emr.last_read_created_at,
      emr.last_read_message_id
    );
end;
$function$;

revoke all on function public.get_engagement_thread(uuid) from public, anon, authenticated;
grant execute on function public.get_engagement_thread(uuid) to authenticated;

revoke all on function public.get_my_engagement_threads(integer, integer) from public, anon, authenticated;
grant execute on function public.get_my_engagement_threads(integer, integer) to authenticated;

revoke all on function public.get_my_unread_message_count() from public, anon, authenticated;
grant execute on function public.get_my_unread_message_count() to authenticated;

revoke all on function public.can_access_engagement_chat(uuid) from public, anon, authenticated;
grant execute on function public.can_access_engagement_chat(uuid) to authenticated;

revoke all on function public.mark_engagement_thread_read(uuid, uuid) from public, anon, authenticated;
grant execute on function public.mark_engagement_thread_read(uuid, uuid) to authenticated;

-- Legacy public.conversations and public.messages are intentionally untouched by this migration.

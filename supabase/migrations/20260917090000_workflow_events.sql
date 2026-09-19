create table public.workflow_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  project_request_id uuid references public.project_requests(id) on delete cascade,
  request_candidate_id uuid references public.request_candidates(id) on delete cascade,
  provider_application_id uuid references public.provider_applications(id) on delete cascade,
  project_engagement_id uuid references public.project_engagements(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  occurred_at timestamp with time zone not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint workflow_events_known_event_check
    check (event_name = any (array[
      'request_submitted'::text,
      'request_first_reviewed'::text,
      'request_integrity_cleared'::text,
      'request_integrity_rejected'::text,
      'request_qualified'::text,
      'provider_application_submitted'::text,
      'provider_first_reviewed'::text,
      'provider_approved'::text,
      'candidate_added'::text,
      'provider_contacted'::text,
      'provider_responded_interested'::text,
      'provider_responded_declined'::text,
      'provider_no_response_marked'::text,
      'provider_withdrawn'::text,
      'shortlist_presented'::text,
      'student_decision_accepted'::text,
      'student_decision_declined'::text,
      'engagement_created'::text,
      'engagement_started'::text,
      'engagement_submitted'::text,
      'engagement_completed'::text,
      'engagement_cancelled'::text,
      'engagement_disputed'::text,
      'payment_status_changed'::text
    ])),
  constraint workflow_events_related_record_check
    check (
      num_nonnulls(
        project_request_id,
        request_candidate_id,
        provider_application_id,
        project_engagement_id
      ) >= 1
    ),
  constraint workflow_events_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

alter table public.workflow_events enable row level security;

create index workflow_events_project_request_occurred_at_idx
  on public.workflow_events using btree (project_request_id, occurred_at)
  where project_request_id is not null;

create index workflow_events_request_candidate_occurred_at_idx
  on public.workflow_events using btree (request_candidate_id, occurred_at)
  where request_candidate_id is not null;

create index workflow_events_provider_application_occurred_at_idx
  on public.workflow_events using btree (provider_application_id, occurred_at)
  where provider_application_id is not null;

create index workflow_events_project_engagement_occurred_at_idx
  on public.workflow_events using btree (project_engagement_id, occurred_at)
  where project_engagement_id is not null;

create index workflow_events_event_name_occurred_at_idx
  on public.workflow_events using btree (event_name, occurred_at);

create unique index workflow_events_project_request_once_idx
  on public.workflow_events (event_name, project_request_id)
  where project_request_id is not null
    and event_name = any (array[
      'request_submitted'::text,
      'request_first_reviewed'::text,
      'request_qualified'::text
    ]);

create unique index workflow_events_provider_application_once_idx
  on public.workflow_events (event_name, provider_application_id)
  where provider_application_id is not null
    and event_name = any (array[
      'provider_application_submitted'::text,
      'provider_first_reviewed'::text
    ]);

create unique index workflow_events_request_candidate_once_idx
  on public.workflow_events (event_name, request_candidate_id)
  where request_candidate_id is not null
    and event_name = any (array[
      'candidate_added'::text,
      'provider_contacted'::text
    ]);

create unique index workflow_events_project_engagement_once_idx
  on public.workflow_events (event_name, project_engagement_id)
  where project_engagement_id is not null
    and event_name = any (array[
      'engagement_created'::text,
      'engagement_started'::text
    ]);

revoke all on table public.workflow_events from anon, authenticated, service_role;
grant select on table public.workflow_events to authenticated;
grant select on table public.workflow_events to service_role;

create policy "Admins can read workflow events"
  on public.workflow_events
  for select
  to authenticated
  using (public.is_admin());

create function public.record_project_request_workflow_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.workflow_events (
      event_name,
      project_request_id,
      actor_user_id
    )
    values (
      'request_submitted',
      new.id,
      auth.uid()
    )
    on conflict do nothing;

    return new;
  end if;

  if old.reviewed_by is null and new.reviewed_by is not null then
    insert into public.workflow_events (
      event_name,
      project_request_id,
      actor_user_id
    )
    values (
      'request_first_reviewed',
      new.id,
      auth.uid()
    )
    on conflict do nothing;
  end if;

  if old.integrity_review_status is distinct from new.integrity_review_status then
    if new.integrity_review_status = 'clear' then
      insert into public.workflow_events (
        event_name,
        project_request_id,
        actor_user_id,
        metadata
      )
      values (
        'request_integrity_cleared',
        new.id,
        auth.uid(),
        jsonb_build_object(
          'from', old.integrity_review_status,
          'to', new.integrity_review_status
        )
      );
    elsif new.integrity_review_status = 'rejected' then
      insert into public.workflow_events (
        event_name,
        project_request_id,
        actor_user_id,
        metadata
      )
      values (
        'request_integrity_rejected',
        new.id,
        auth.uid(),
        jsonb_build_object(
          'from', old.integrity_review_status,
          'to', new.integrity_review_status
        )
      );
    end if;
  end if;

  if new.status = 'reviewed'
    and new.integrity_review_status = 'clear'
    and not (
      old.status = 'reviewed'
      and old.integrity_review_status = 'clear'
    )
  then
    insert into public.workflow_events (
      event_name,
      project_request_id,
      actor_user_id,
      metadata
    )
    values (
      'request_qualified',
      new.id,
      auth.uid(),
      jsonb_build_object(
        'status', new.status,
        'integrity_review_status', new.integrity_review_status
      )
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.record_project_request_workflow_event() from public;

create trigger project_requests_record_workflow_event
  after insert or update on public.project_requests
  for each row
  execute function public.record_project_request_workflow_event();

create function public.record_provider_application_workflow_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.workflow_events (
      event_name,
      provider_application_id,
      actor_user_id
    )
    values (
      'provider_application_submitted',
      new.id,
      auth.uid()
    )
    on conflict do nothing;

    return new;
  end if;

  if old.reviewed_by is null and new.reviewed_by is not null then
    insert into public.workflow_events (
      event_name,
      provider_application_id,
      actor_user_id
    )
    values (
      'provider_first_reviewed',
      new.id,
      auth.uid()
    )
    on conflict do nothing;
  end if;

  if old.status is distinct from new.status
    and new.status = 'approved'
  then
    insert into public.workflow_events (
      event_name,
      provider_application_id,
      actor_user_id,
      metadata
    )
    values (
      'provider_approved',
      new.id,
      auth.uid(),
      jsonb_build_object(
        'from', old.status,
        'to', new.status
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function public.record_provider_application_workflow_event() from public;

create trigger provider_applications_record_workflow_event
  after insert or update on public.provider_applications
  for each row
  execute function public.record_provider_application_workflow_event();

create function public.record_request_candidate_workflow_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.workflow_events (
      event_name,
      project_request_id,
      request_candidate_id,
      provider_application_id,
      actor_user_id
    )
    values (
      'candidate_added',
      new.project_request_id,
      new.id,
      new.provider_application_id,
      auth.uid()
    )
    on conflict do nothing;

    return new;
  end if;

  if old.provider_response_status is distinct from new.provider_response_status then
    if new.provider_response_status = 'interested' then
      insert into public.workflow_events (
        event_name,
        project_request_id,
        request_candidate_id,
        provider_application_id,
        actor_user_id,
        metadata
      )
      values (
        'provider_responded_interested',
        new.project_request_id,
        new.id,
        new.provider_application_id,
        auth.uid(),
        jsonb_build_object(
          'from', old.provider_response_status,
          'to', new.provider_response_status
        )
      );
    elsif new.provider_response_status = 'declined' then
      insert into public.workflow_events (
        event_name,
        project_request_id,
        request_candidate_id,
        provider_application_id,
        actor_user_id,
        metadata
      )
      values (
        'provider_responded_declined',
        new.project_request_id,
        new.id,
        new.provider_application_id,
        auth.uid(),
        jsonb_build_object(
          'from', old.provider_response_status,
          'to', new.provider_response_status,
          'declined_by', new.declined_by
        )
      );
    elsif new.provider_response_status = 'no_response' then
      insert into public.workflow_events (
        event_name,
        project_request_id,
        request_candidate_id,
        provider_application_id,
        actor_user_id,
        metadata
      )
      values (
        'provider_no_response_marked',
        new.project_request_id,
        new.id,
        new.provider_application_id,
        auth.uid(),
        jsonb_build_object(
          'from', old.provider_response_status,
          'to', new.provider_response_status
        )
      );
    elsif new.provider_response_status = 'withdrawn' then
      insert into public.workflow_events (
        event_name,
        project_request_id,
        request_candidate_id,
        provider_application_id,
        actor_user_id,
        metadata
      )
      values (
        'provider_withdrawn',
        new.project_request_id,
        new.id,
        new.provider_application_id,
        auth.uid(),
        jsonb_build_object(
          'from', old.provider_response_status,
          'to', new.provider_response_status,
          'declined_by', new.declined_by
        )
      );
    end if;
  end if;

  if old.student_decision_status is distinct from new.student_decision_status then
    if new.student_decision_status = 'presented' then
      insert into public.workflow_events (
        event_name,
        project_request_id,
        request_candidate_id,
        provider_application_id,
        actor_user_id,
        metadata
      )
      values (
        'shortlist_presented',
        new.project_request_id,
        new.id,
        new.provider_application_id,
        auth.uid(),
        jsonb_build_object(
          'candidate_rank', new.candidate_rank,
          'from', old.student_decision_status,
          'to', new.student_decision_status
        )
      );
    elsif new.student_decision_status = 'accepted' then
      insert into public.workflow_events (
        event_name,
        project_request_id,
        request_candidate_id,
        provider_application_id,
        actor_user_id,
        metadata
      )
      values (
        'student_decision_accepted',
        new.project_request_id,
        new.id,
        new.provider_application_id,
        auth.uid(),
        jsonb_build_object(
          'candidate_rank', new.candidate_rank,
          'from', old.student_decision_status,
          'to', new.student_decision_status
        )
      );
    elsif new.student_decision_status = 'declined' then
      insert into public.workflow_events (
        event_name,
        project_request_id,
        request_candidate_id,
        provider_application_id,
        actor_user_id,
        metadata
      )
      values (
        'student_decision_declined',
        new.project_request_id,
        new.id,
        new.provider_application_id,
        auth.uid(),
        jsonb_build_object(
          'candidate_rank', new.candidate_rank,
          'from', old.student_decision_status,
          'to', new.student_decision_status,
          'declined_by', new.declined_by
        )
      );
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.record_request_candidate_workflow_event() from public;

create trigger request_candidates_record_workflow_event
  after insert or update on public.request_candidates
  for each row
  execute function public.record_request_candidate_workflow_event();

create function public.mark_request_candidate_contacted(
  p_request_id uuid,
  p_candidate_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate public.request_candidates%rowtype;
begin
  if not public.is_admin() then
    raise exception 'admin_required';
  end if;

  select *
  into v_candidate
  from public.request_candidates
  where id = p_candidate_id
  for update;

  if not found then
    raise exception 'candidate_not_found';
  end if;

  if v_candidate.project_request_id <> p_request_id then
    raise exception 'candidate_request_mismatch';
  end if;

  if exists (
    select 1
    from public.workflow_events
    where event_name = 'provider_contacted'
      and request_candidate_id = p_candidate_id
  ) then
    return;
  end if;

  if v_candidate.provider_response_status <> 'pending' then
    raise exception 'candidate_already_responded';
  end if;

  insert into public.workflow_events (
    event_name,
    project_request_id,
    request_candidate_id,
    provider_application_id,
    actor_user_id
  )
  values (
    'provider_contacted',
    v_candidate.project_request_id,
    v_candidate.id,
    v_candidate.provider_application_id,
    auth.uid()
  )
  on conflict do nothing;
end;
$$;

revoke all on function public.mark_request_candidate_contacted(uuid, uuid) from public;
grant execute on function public.mark_request_candidate_contacted(uuid, uuid) to authenticated;

create function public.record_project_engagement_workflow_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_request_id uuid;
  v_provider_application_id uuid;
begin
  select
    request_candidates.project_request_id,
    request_candidates.provider_application_id
  into
    v_project_request_id,
    v_provider_application_id
  from public.request_candidates
  where request_candidates.id = new.request_candidate_id;

  if tg_op = 'INSERT' then
    insert into public.workflow_events (
      event_name,
      project_request_id,
      request_candidate_id,
      provider_application_id,
      project_engagement_id,
      actor_user_id
    )
    values (
      'engagement_created',
      v_project_request_id,
      new.request_candidate_id,
      v_provider_application_id,
      new.id,
      auth.uid()
    )
    on conflict do nothing;

    return new;
  end if;

  if old.started_at is null and new.started_at is not null then
    insert into public.workflow_events (
      event_name,
      project_request_id,
      request_candidate_id,
      provider_application_id,
      project_engagement_id,
      actor_user_id
    )
    values (
      'engagement_started',
      v_project_request_id,
      new.request_candidate_id,
      v_provider_application_id,
      new.id,
      auth.uid()
    )
    on conflict do nothing;
  end if;

  if old.status is distinct from new.status then
    if new.status = 'submitted' then
      insert into public.workflow_events (
        event_name,
        project_request_id,
        request_candidate_id,
        provider_application_id,
        project_engagement_id,
        actor_user_id,
        metadata
      )
      values (
        'engagement_submitted',
        v_project_request_id,
        new.request_candidate_id,
        v_provider_application_id,
        new.id,
        auth.uid(),
        jsonb_build_object('from', old.status, 'to', new.status)
      );
    elsif new.status = 'completed' then
      insert into public.workflow_events (
        event_name,
        project_request_id,
        request_candidate_id,
        provider_application_id,
        project_engagement_id,
        actor_user_id,
        metadata
      )
      values (
        'engagement_completed',
        v_project_request_id,
        new.request_candidate_id,
        v_provider_application_id,
        new.id,
        auth.uid(),
        jsonb_build_object('from', old.status, 'to', new.status)
      );
    elsif new.status = 'cancelled' then
      insert into public.workflow_events (
        event_name,
        project_request_id,
        request_candidate_id,
        provider_application_id,
        project_engagement_id,
        actor_user_id,
        metadata
      )
      values (
        'engagement_cancelled',
        v_project_request_id,
        new.request_candidate_id,
        v_provider_application_id,
        new.id,
        auth.uid(),
        jsonb_build_object('from', old.status, 'to', new.status)
      );
    elsif new.status = 'disputed' then
      insert into public.workflow_events (
        event_name,
        project_request_id,
        request_candidate_id,
        provider_application_id,
        project_engagement_id,
        actor_user_id,
        metadata
      )
      values (
        'engagement_disputed',
        v_project_request_id,
        new.request_candidate_id,
        v_provider_application_id,
        new.id,
        auth.uid(),
        jsonb_build_object('from', old.status, 'to', new.status)
      );
    end if;
  end if;

  if old.payment_status is distinct from new.payment_status then
    insert into public.workflow_events (
      event_name,
      project_request_id,
      request_candidate_id,
      provider_application_id,
      project_engagement_id,
      actor_user_id,
      metadata
    )
    values (
      'payment_status_changed',
      v_project_request_id,
      new.request_candidate_id,
      v_provider_application_id,
      new.id,
      auth.uid(),
      jsonb_build_object(
        'from', old.payment_status,
        'to', new.payment_status
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function public.record_project_engagement_workflow_event() from public;

create trigger project_engagements_record_workflow_event
  after insert or update on public.project_engagements
  for each row
  execute function public.record_project_engagement_workflow_event();

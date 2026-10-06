create or replace function public.get_my_engagement_action_state(
  p_engagement_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with current_profile as (
    select profiles.id, profiles.role
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.account_status = 'active'
      and profiles.role in ('student', 'freelancer', 'both')
  ),
  engagement_context as (
    select
      project_engagements.id as engagement_id,
      project_engagements.status as engagement_status,
      project_requests.status as request_status,
      project_requests.linked_student_profile_id as student_profile_id,
      coalesce(
        request_candidates.linked_provider_profile_id,
        provider_applications.linked_provider_profile_id
      ) as provider_profile_id,
      engagement_feedback.id as feedback_id
    from public.project_engagements
    join public.request_candidates
      on request_candidates.id = project_engagements.request_candidate_id
    join public.project_requests
      on project_requests.id = request_candidates.project_request_id
    left join public.provider_applications
      on provider_applications.id = request_candidates.provider_application_id
    left join public.engagement_feedback
      on engagement_feedback.project_engagement_id = project_engagements.id
    where project_engagements.id = p_engagement_id
  ),
  authorized as (
    select
      engagement_context.*,
      case
        when current_profile.id = engagement_context.student_profile_id
          and current_profile.role in ('student', 'both')
          then 'student'
        when current_profile.id = engagement_context.provider_profile_id
          and current_profile.role in ('freelancer', 'both')
          then 'provider'
      end as participant_side
    from engagement_context
    join current_profile
      on current_profile.id in (
        engagement_context.student_profile_id,
        engagement_context.provider_profile_id
      )
    where engagement_context.student_profile_id is not null
      and engagement_context.provider_profile_id is not null
  )
  select jsonb_build_object(
    'participant_side', authorized.participant_side,
    'engagement_status', authorized.engagement_status,
    'request_status', authorized.request_status,
    'can_start',
      authorized.participant_side = 'provider'
      and authorized.engagement_status = 'agreed'
      and authorized.request_status = 'matched',
    'can_submit',
      authorized.participant_side = 'provider'
      and authorized.engagement_status = 'in_progress'
      and authorized.request_status = 'in_progress',
    'can_complete',
      authorized.participant_side = 'student'
      and authorized.engagement_status = 'submitted'
      and authorized.request_status = 'in_progress',
    'can_dispute',
      authorized.participant_side = 'student'
      and authorized.engagement_status = 'submitted'
      and authorized.request_status = 'in_progress',
    'can_feedback',
      authorized.participant_side = 'student'
      and authorized.engagement_status = 'completed'
      and authorized.request_status = 'completed'
      and authorized.feedback_id is null
  )
  from authorized
  where authorized.participant_side in ('student', 'provider');
$$;

create or replace function public.start_my_engagement_work(
  p_engagement_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_actor public.profiles%rowtype;
  v_engagement public.project_engagements%rowtype;
  v_candidate public.request_candidates%rowtype;
  v_request public.project_requests%rowtype;
  v_provider_profile_id uuid;
begin
  v_actor_id := auth.uid();

  if v_actor_id is null then
    raise exception 'auth_required';
  end if;

  select *
  into v_actor
  from public.profiles
  where id = v_actor_id;

  if not found
    or v_actor.account_status <> 'active'
    or not (v_actor.role = any (array['freelancer'::text, 'both'::text]))
  then
    raise exception 'not_authorized';
  end if;

  select *
  into v_engagement
  from public.project_engagements
  where id = p_engagement_id
  for update;

  if not found then
    raise exception 'not_authorized';
  end if;

  select *
  into v_candidate
  from public.request_candidates
  where id = v_engagement.request_candidate_id
  for update;

  if not found then
    raise exception 'candidate_not_found';
  end if;

  if v_candidate.provider_application_id is not null then
    select coalesce(
      v_candidate.linked_provider_profile_id,
      provider_applications.linked_provider_profile_id
    )
    into v_provider_profile_id
    from public.provider_applications
    where provider_applications.id = v_candidate.provider_application_id
    for update;
  else
    v_provider_profile_id := v_candidate.linked_provider_profile_id;
  end if;

  if v_provider_profile_id is null
    or v_provider_profile_id <> v_actor_id
  then
    raise exception 'not_authorized';
  end if;

  select *
  into v_request
  from public.project_requests
  where id = v_candidate.project_request_id
  for update;

  if not found then
    raise exception 'request_not_found';
  end if;

  if v_request.linked_student_profile_id is null then
    raise exception 'not_authorized';
  end if;

  if v_engagement.status = 'agreed' then
    if v_request.status <> 'matched' then
      raise exception 'request_state_invalid';
    end if;

    update public.project_engagements
    set
      status = 'in_progress',
      started_at = coalesce(started_at, now())
    where id = v_engagement.id;

    if not found then
      raise exception 'engagement_update_failed';
    end if;

    update public.project_requests
    set status = 'in_progress'
    where id = v_request.id;

    if not found then
      raise exception 'request_update_failed';
    end if;

    return 'in_progress';
  end if;

  if v_engagement.status = any (array['in_progress'::text, 'submitted'::text]) then
    if v_request.status <> 'in_progress' then
      raise exception 'request_state_invalid';
    end if;

    return v_engagement.status;
  end if;

  if v_engagement.status = any (array['completed'::text, 'cancelled'::text, 'disputed'::text]) then
    raise exception 'engagement_closed';
  end if;

  raise exception 'engagement_status_invalid';
end;
$$;

create or replace function public.submit_my_engagement_deliverable(
  p_engagement_id uuid,
  p_deliverable_url text default null,
  p_deliverable_summary text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_actor public.profiles%rowtype;
  v_engagement public.project_engagements%rowtype;
  v_candidate public.request_candidates%rowtype;
  v_request public.project_requests%rowtype;
  v_provider_profile_id uuid;
  v_deliverable_url text;
  v_deliverable_summary text;
begin
  v_actor_id := auth.uid();

  if v_actor_id is null then
    raise exception 'auth_required';
  end if;

  select *
  into v_actor
  from public.profiles
  where id = v_actor_id;

  if not found
    or v_actor.account_status <> 'active'
    or not (v_actor.role = any (array['freelancer'::text, 'both'::text]))
  then
    raise exception 'not_authorized';
  end if;

  v_deliverable_url := nullif(btrim(coalesce(p_deliverable_url, '')), '');
  v_deliverable_summary := nullif(btrim(coalesce(p_deliverable_summary, '')), '');

  if v_deliverable_url is null and v_deliverable_summary is null then
    raise exception 'deliverable_required';
  end if;

  if v_deliverable_url is not null and char_length(v_deliverable_url) > 2000 then
    raise exception 'deliverable_url_too_long';
  end if;

  if v_deliverable_summary is not null and char_length(v_deliverable_summary) > 5000 then
    raise exception 'deliverable_summary_too_long';
  end if;

  if v_deliverable_url is not null
    and v_deliverable_url !~* '^https?://[^[:space:]]+$'
  then
    raise exception 'deliverable_url_invalid';
  end if;

  select *
  into v_engagement
  from public.project_engagements
  where id = p_engagement_id
  for update;

  if not found then
    raise exception 'not_authorized';
  end if;

  select *
  into v_candidate
  from public.request_candidates
  where id = v_engagement.request_candidate_id
  for update;

  if not found then
    raise exception 'candidate_not_found';
  end if;

  if v_candidate.provider_application_id is not null then
    select coalesce(
      v_candidate.linked_provider_profile_id,
      provider_applications.linked_provider_profile_id
    )
    into v_provider_profile_id
    from public.provider_applications
    where provider_applications.id = v_candidate.provider_application_id
    for update;
  else
    v_provider_profile_id := v_candidate.linked_provider_profile_id;
  end if;

  if v_provider_profile_id is null
    or v_provider_profile_id <> v_actor_id
  then
    raise exception 'not_authorized';
  end if;

  select *
  into v_request
  from public.project_requests
  where id = v_candidate.project_request_id
  for update;

  if not found then
    raise exception 'request_not_found';
  end if;

  if v_request.linked_student_profile_id is null then
    raise exception 'not_authorized';
  end if;

  if v_engagement.status = 'in_progress' then
    if v_request.status <> 'in_progress' then
      raise exception 'request_state_invalid';
    end if;

    update public.project_engagements
    set
      status = 'submitted',
      deliverable_url = v_deliverable_url,
      deliverable_summary = v_deliverable_summary,
      submitted_at = now()
    where id = v_engagement.id;

    if not found then
      raise exception 'engagement_update_failed';
    end if;

    return 'submitted';
  end if;

  if v_engagement.status = 'submitted' then
    if v_request.status <> 'in_progress' then
      raise exception 'request_state_invalid';
    end if;

    if v_engagement.deliverable_url is not distinct from v_deliverable_url
      and v_engagement.deliverable_summary is not distinct from v_deliverable_summary
    then
      return 'submitted';
    end if;

    raise exception 'deliverable_conflict';
  end if;

  if v_engagement.status = 'agreed' then
    raise exception 'engagement_not_started';
  end if;

  if v_engagement.status = any (array['completed'::text, 'cancelled'::text, 'disputed'::text]) then
    raise exception 'engagement_closed';
  end if;

  raise exception 'engagement_status_invalid';
end;
$$;

create or replace function public.complete_my_engagement(
  p_engagement_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_actor public.profiles%rowtype;
  v_engagement public.project_engagements%rowtype;
  v_candidate public.request_candidates%rowtype;
  v_request public.project_requests%rowtype;
  v_provider_profile_id uuid;
begin
  v_actor_id := auth.uid();

  if v_actor_id is null then
    raise exception 'auth_required';
  end if;

  select *
  into v_actor
  from public.profiles
  where id = v_actor_id;

  if not found
    or v_actor.account_status <> 'active'
    or not (v_actor.role = any (array['student'::text, 'both'::text]))
  then
    raise exception 'not_authorized';
  end if;

  select *
  into v_engagement
  from public.project_engagements
  where id = p_engagement_id
  for update;

  if not found then
    raise exception 'not_authorized';
  end if;

  select *
  into v_candidate
  from public.request_candidates
  where id = v_engagement.request_candidate_id
  for update;

  if not found then
    raise exception 'candidate_not_found';
  end if;

  if v_candidate.provider_application_id is not null then
    select coalesce(
      v_candidate.linked_provider_profile_id,
      provider_applications.linked_provider_profile_id
    )
    into v_provider_profile_id
    from public.provider_applications
    where provider_applications.id = v_candidate.provider_application_id
    for update;
  else
    v_provider_profile_id := v_candidate.linked_provider_profile_id;
  end if;

  select *
  into v_request
  from public.project_requests
  where id = v_candidate.project_request_id
  for update;

  if not found
    or v_request.linked_student_profile_id <> v_actor_id
    or v_provider_profile_id is null
  then
    raise exception 'not_authorized';
  end if;

  if v_engagement.status = 'submitted' then
    if v_request.status <> 'in_progress' then
      raise exception 'request_state_invalid';
    end if;

    update public.project_engagements
    set
      status = 'completed',
      completed_at = now()
    where id = v_engagement.id;

    if not found then
      raise exception 'engagement_update_failed';
    end if;

    update public.project_requests
    set status = 'completed'
    where id = v_request.id;

    if not found then
      raise exception 'request_update_failed';
    end if;

    return 'completed';
  end if;

  if v_engagement.status = 'completed' then
    if v_request.status <> 'completed' then
      raise exception 'request_state_invalid';
    end if;

    return 'completed';
  end if;

  if v_engagement.status = 'disputed'
    and v_request.status <> 'in_progress'
  then
    raise exception 'request_state_invalid';
  end if;

  if v_engagement.status = any (array['agreed'::text, 'in_progress'::text]) then
    raise exception 'engagement_not_submitted';
  end if;

  if v_engagement.status = any (array['cancelled'::text, 'disputed'::text]) then
    raise exception 'engagement_closed';
  end if;

  raise exception 'engagement_status_invalid';
end;
$$;

create or replace function public.dispute_my_engagement(
  p_engagement_id uuid,
  p_dispute_notes text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_actor public.profiles%rowtype;
  v_engagement public.project_engagements%rowtype;
  v_candidate public.request_candidates%rowtype;
  v_request public.project_requests%rowtype;
  v_provider_profile_id uuid;
  v_dispute_notes text;
begin
  v_actor_id := auth.uid();

  if v_actor_id is null then
    raise exception 'auth_required';
  end if;

  select *
  into v_actor
  from public.profiles
  where id = v_actor_id;

  if not found
    or v_actor.account_status <> 'active'
    or not (v_actor.role = any (array['student'::text, 'both'::text]))
  then
    raise exception 'not_authorized';
  end if;

  v_dispute_notes := nullif(btrim(coalesce(p_dispute_notes, '')), '');

  if v_dispute_notes is null then
    raise exception 'dispute_notes_required';
  end if;

  if char_length(v_dispute_notes) > 5000 then
    raise exception 'dispute_notes_too_long';
  end if;

  select *
  into v_engagement
  from public.project_engagements
  where id = p_engagement_id
  for update;

  if not found then
    raise exception 'not_authorized';
  end if;

  select *
  into v_candidate
  from public.request_candidates
  where id = v_engagement.request_candidate_id
  for update;

  if not found then
    raise exception 'candidate_not_found';
  end if;

  if v_candidate.provider_application_id is not null then
    select coalesce(
      v_candidate.linked_provider_profile_id,
      provider_applications.linked_provider_profile_id
    )
    into v_provider_profile_id
    from public.provider_applications
    where provider_applications.id = v_candidate.provider_application_id
    for update;
  else
    v_provider_profile_id := v_candidate.linked_provider_profile_id;
  end if;

  select *
  into v_request
  from public.project_requests
  where id = v_candidate.project_request_id
  for update;

  if not found
    or v_request.linked_student_profile_id <> v_actor_id
    or v_provider_profile_id is null
  then
    raise exception 'not_authorized';
  end if;

  if v_engagement.status = 'submitted' then
    if v_request.status <> 'in_progress' then
      raise exception 'request_state_invalid';
    end if;

    update public.project_engagements
    set
      status = 'disputed',
      dispute_notes = v_dispute_notes
    where id = v_engagement.id;

    if not found then
      raise exception 'engagement_update_failed';
    end if;

    return 'disputed';
  end if;

  if v_engagement.status = 'disputed' then
    if v_request.status <> 'in_progress' then
      raise exception 'request_state_invalid';
    end if;

    if v_engagement.dispute_notes is not distinct from v_dispute_notes then
      return 'disputed';
    end if;

    raise exception 'dispute_conflict';
  end if;

  if v_engagement.status = 'completed'
    and v_request.status <> 'completed'
  then
    raise exception 'request_state_invalid';
  end if;

  if v_engagement.status = any (array['agreed'::text, 'in_progress'::text]) then
    raise exception 'engagement_not_submitted';
  end if;

  if v_engagement.status = any (array['completed'::text, 'cancelled'::text]) then
    raise exception 'engagement_closed';
  end if;

  raise exception 'engagement_status_invalid';
end;
$$;

create or replace function public.submit_my_engagement_feedback(
  p_engagement_id uuid,
  p_rating integer,
  p_feedback_text text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_actor public.profiles%rowtype;
  v_engagement public.project_engagements%rowtype;
  v_candidate public.request_candidates%rowtype;
  v_request public.project_requests%rowtype;
  v_provider_profile_id uuid;
  v_existing_feedback public.engagement_feedback%rowtype;
  v_feedback_text text;
begin
  v_actor_id := auth.uid();

  if v_actor_id is null then
    raise exception 'auth_required';
  end if;

  select *
  into v_actor
  from public.profiles
  where id = v_actor_id;

  if not found
    or v_actor.account_status <> 'active'
    or not (v_actor.role = any (array['student'::text, 'both'::text]))
  then
    raise exception 'not_authorized';
  end if;

  select *
  into v_engagement
  from public.project_engagements
  where id = p_engagement_id
  for update;

  if not found then
    raise exception 'not_authorized';
  end if;

  if v_engagement.status <> 'completed' then
    raise exception 'engagement_not_completed';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'feedback_rating_invalid';
  end if;

  v_feedback_text := nullif(btrim(coalesce(p_feedback_text, '')), '');

  if v_feedback_text is not null and char_length(v_feedback_text) > 5000 then
    raise exception 'feedback_text_too_long';
  end if;

  select *
  into v_candidate
  from public.request_candidates
  where id = v_engagement.request_candidate_id
  for update;

  if not found then
    raise exception 'candidate_not_found';
  end if;

  if v_candidate.provider_application_id is not null then
    select coalesce(
      v_candidate.linked_provider_profile_id,
      provider_applications.linked_provider_profile_id
    )
    into v_provider_profile_id
    from public.provider_applications
    where provider_applications.id = v_candidate.provider_application_id
    for update;
  else
    v_provider_profile_id := v_candidate.linked_provider_profile_id;
  end if;

  select *
  into v_request
  from public.project_requests
  where id = v_candidate.project_request_id
  for update;

  if not found
    or v_request.linked_student_profile_id <> v_actor_id
    or v_provider_profile_id is null
  then
    raise exception 'not_authorized';
  end if;

  select *
  into v_existing_feedback
  from public.engagement_feedback
  where project_engagement_id = v_engagement.id
  for update;

  if found then
    if v_existing_feedback.rating = p_rating
      and v_existing_feedback.feedback_text is not distinct from v_feedback_text
    then
      return 'submitted';
    end if;

    raise exception 'feedback_conflict';
  end if;

  insert into public.engagement_feedback (
    project_engagement_id,
    rating,
    feedback_text
  )
  values (
    v_engagement.id,
    p_rating,
    v_feedback_text
  );

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
    'engagement_feedback_submitted',
    v_candidate.project_request_id,
    v_candidate.id,
    v_candidate.provider_application_id,
    v_engagement.id,
    auth.uid(),
    jsonb_build_object('rating', p_rating)
  )
  on conflict do nothing;

  return 'submitted';
end;
$$;

revoke all on function public.get_my_engagement_action_state(uuid) from public;
revoke all on function public.get_my_engagement_action_state(uuid) from anon;
revoke all on function public.get_my_engagement_action_state(uuid) from authenticated;
grant execute on function public.get_my_engagement_action_state(uuid) to authenticated;

revoke all on function public.start_my_engagement_work(uuid) from public;
revoke all on function public.start_my_engagement_work(uuid) from anon;
revoke all on function public.start_my_engagement_work(uuid) from authenticated;
grant execute on function public.start_my_engagement_work(uuid) to authenticated;

revoke all on function public.submit_my_engagement_deliverable(uuid, text, text) from public;
revoke all on function public.submit_my_engagement_deliverable(uuid, text, text) from anon;
revoke all on function public.submit_my_engagement_deliverable(uuid, text, text) from authenticated;
grant execute on function public.submit_my_engagement_deliverable(uuid, text, text) to authenticated;

revoke all on function public.complete_my_engagement(uuid) from public;
revoke all on function public.complete_my_engagement(uuid) from anon;
revoke all on function public.complete_my_engagement(uuid) from authenticated;
grant execute on function public.complete_my_engagement(uuid) to authenticated;

revoke all on function public.dispute_my_engagement(uuid, text) from public;
revoke all on function public.dispute_my_engagement(uuid, text) from anon;
revoke all on function public.dispute_my_engagement(uuid, text) from authenticated;
grant execute on function public.dispute_my_engagement(uuid, text) to authenticated;

revoke all on function public.submit_my_engagement_feedback(uuid, integer, text) from public;
revoke all on function public.submit_my_engagement_feedback(uuid, integer, text) from anon;
revoke all on function public.submit_my_engagement_feedback(uuid, integer, text) from authenticated;
grant execute on function public.submit_my_engagement_feedback(uuid, integer, text) to authenticated;

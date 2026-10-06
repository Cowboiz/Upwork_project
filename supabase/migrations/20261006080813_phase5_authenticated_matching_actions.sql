create or replace function public.get_my_project_request_detail(p_request_id uuid)
returns table (
  id uuid,
  category text,
  description text,
  desired_deliverables text,
  deadline date,
  deadline_flexible boolean,
  budget_range text,
  currency text,
  integrity_review_status text,
  status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  matching_candidates jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with current_profile as (
    select profiles.id
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.account_status = 'active'
      and profiles.role in ('student', 'both')
  )
  select
    project_requests.id,
    project_requests.category,
    project_requests.description,
    project_requests.desired_deliverables,
    project_requests.deadline,
    project_requests.deadline_flexible,
    project_requests.budget_range,
    project_requests.currency,
    project_requests.integrity_review_status,
    project_requests.status,
    project_requests.created_at,
    project_requests.updated_at,
    coalesce(candidate_lifecycle.matching_candidates, '[]'::jsonb) as matching_candidates
  from public.project_requests
  join current_profile
    on current_profile.id = project_requests.linked_student_profile_id
  left join lateral (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'request_candidate_id', candidate_items.request_candidate_id,
          'candidate_rank', candidate_items.candidate_rank,
          'provider_response_status', candidate_items.provider_response_status,
          'student_decision_status', candidate_items.student_decision_status,
          'provider_application_status', candidate_items.provider_application_status,
          'can_decide', candidate_items.can_decide,
          'engagement_id', candidate_items.engagement_id,
          'engagement_status', candidate_items.engagement_status
        )
        order by
          candidate_items.candidate_rank asc nulls last,
          candidate_items.candidate_created_at desc,
          candidate_items.request_candidate_id desc
      ),
      '[]'::jsonb
    ) as matching_candidates
    from (
      select
        request_candidates.id as request_candidate_id,
        request_candidates.created_at as candidate_created_at,
        request_candidates.candidate_rank,
        request_candidates.provider_response_status,
        request_candidates.student_decision_status,
        provider_applications.status as provider_application_status,
        project_engagements.id as engagement_id,
        project_engagements.status as engagement_status,
        project_requests.status = 'reviewed'
          and project_requests.integrity_review_status = 'clear'
          and request_candidates.provider_response_status = 'interested'
          and request_candidates.student_decision_status = 'presented'
          and request_candidates.candidate_rank between 1 and 3
          and provider_applications.id is not null
          and provider_applications.status = 'approved'
          and project_engagements.id is null as can_decide
      from public.request_candidates
      left join public.provider_applications
        on provider_applications.id = request_candidates.provider_application_id
      left join public.project_engagements
        on project_engagements.request_candidate_id = request_candidates.id
      where request_candidates.project_request_id = project_requests.id
    ) as candidate_items
  ) as candidate_lifecycle on true
  where project_requests.id = p_request_id;
$$;

create or replace function public.get_my_provider_application_detail(
  p_application_id uuid
)
returns table (
  id uuid,
  applicant_name text,
  skills text[],
  preferred_project_types text[],
  portfolio_urls text[],
  availability text,
  rate_expectations text,
  status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  matches jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with current_profile as (
    select profiles.id
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.account_status = 'active'
      and profiles.role in ('freelancer', 'both')
  )
  select
    provider_applications.id,
    provider_applications.applicant_name,
    provider_applications.skills,
    provider_applications.preferred_project_types,
    provider_applications.portfolio_urls,
    provider_applications.availability,
    provider_applications.rate_expectations,
    provider_applications.status,
    provider_applications.created_at,
    provider_applications.updated_at,
    coalesce(match_lifecycle.matches, '[]'::jsonb) as matches
  from public.provider_applications
  join current_profile
    on current_profile.id = provider_applications.linked_provider_profile_id
  left join lateral (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'request_candidate_id', candidate_lifecycle.request_candidate_id,
          'project_request_id', candidate_lifecycle.project_request_id,
          'request_category', candidate_lifecycle.request_category,
          'request_status', candidate_lifecycle.request_status,
          'request_integrity_review_status', candidate_lifecycle.request_integrity_review_status,
          'provider_contacted', candidate_lifecycle.provider_contacted,
          'can_respond', candidate_lifecycle.can_respond,
          'candidate_rank', candidate_lifecycle.candidate_rank,
          'provider_response_status', candidate_lifecycle.provider_response_status,
          'student_decision_status', candidate_lifecycle.student_decision_status,
          'proposed_price', candidate_lifecycle.proposed_price,
          'agreed_price', candidate_lifecycle.agreed_price,
          'agreed_deadline', candidate_lifecycle.agreed_deadline,
          'currency', candidate_lifecycle.currency,
          'engagement_id', candidate_lifecycle.engagement_id,
          'engagement_status', candidate_lifecycle.engagement_status
        )
        order by
          candidate_lifecycle.candidate_rank asc nulls last,
          candidate_lifecycle.candidate_created_at desc,
          candidate_lifecycle.request_candidate_id desc
      ),
      '[]'::jsonb
    ) as matches
    from (
      select
        request_candidates.id as request_candidate_id,
        request_candidates.created_at as candidate_created_at,
        request_candidates.candidate_rank,
        request_candidates.provider_response_status,
        request_candidates.student_decision_status,
        request_candidates.proposed_price,
        request_candidates.agreed_price,
        request_candidates.agreed_deadline,
        request_candidates.currency,
        project_requests.id as project_request_id,
        project_requests.category as request_category,
        project_requests.status as request_status,
        project_requests.integrity_review_status as request_integrity_review_status,
        project_engagements.id as engagement_id,
        project_engagements.status as engagement_status,
        exists (
          select 1
          from public.workflow_events
          where workflow_events.event_name = 'provider_contacted'
            and workflow_events.request_candidate_id = request_candidates.id
        ) as provider_contacted,
        provider_applications.status = 'approved'
          and request_candidates.provider_response_status = 'pending'
          and request_candidates.student_decision_status = 'not_presented'
          and request_candidates.candidate_rank is null
          and project_engagements.id is null
          and project_requests.status = 'reviewed'
          and project_requests.integrity_review_status = 'clear'
          and exists (
            select 1
            from public.workflow_events
            where workflow_events.event_name = 'provider_contacted'
              and workflow_events.request_candidate_id = request_candidates.id
          ) as can_respond
      from public.request_candidates
      join public.project_requests
        on project_requests.id = request_candidates.project_request_id
      left join public.project_engagements
        on project_engagements.request_candidate_id = request_candidates.id
      where request_candidates.provider_application_id = provider_applications.id
    ) as candidate_lifecycle
  ) as match_lifecycle on true
  where provider_applications.id = p_application_id;
$$;

create or replace function public.respond_to_my_request_candidate(
  p_request_candidate_id uuid,
  p_response text,
  p_decline_reason text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_actor public.profiles%rowtype;
  v_candidate public.request_candidates%rowtype;
  v_provider_application public.provider_applications%rowtype;
  v_request public.project_requests%rowtype;
  v_decline_reason text;
begin
  v_actor_id := auth.uid();

  if v_actor_id is null then
    raise exception 'auth_required';
  end if;

  if p_response is distinct from 'interested'
    and p_response is distinct from 'declined'
  then
    raise exception 'response_invalid';
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
  into v_candidate
  from public.request_candidates
  where id = p_request_candidate_id
  for update;

  if not found then
    raise exception 'not_authorized';
  end if;

  if v_candidate.provider_application_id is null then
    raise exception 'provider_application_required';
  end if;

  select *
  into v_provider_application
  from public.provider_applications
  where id = v_candidate.provider_application_id;

  if not found
    or v_provider_application.linked_provider_profile_id <> v_actor_id
  then
    raise exception 'not_authorized';
  end if;

  if v_candidate.provider_response_status = p_response
    and p_response = any (array['interested'::text, 'declined'::text])
  then
    return v_candidate.provider_response_status;
  end if;

  if v_candidate.provider_response_status <> 'pending' then
    raise exception 'response_closed';
  end if;

  if v_candidate.student_decision_status = any (array['accepted'::text, 'declined'::text])
    or v_candidate.student_decision_status = 'presented'
    or v_candidate.candidate_rank is not null
  then
    raise exception 'candidate_already_presented';
  end if;

  if v_provider_application.status <> 'approved' then
    raise exception 'provider_not_approved';
  end if;

  select *
  into v_request
  from public.project_requests
  where id = v_candidate.project_request_id;

  if not found then
    raise exception 'request_not_found';
  end if;

  if v_request.status <> 'reviewed'
    or v_request.integrity_review_status <> 'clear'
  then
    raise exception 'request_not_eligible';
  end if;

  if not exists (
    select 1
    from public.workflow_events
    where event_name = 'provider_contacted'
      and request_candidate_id = v_candidate.id
  ) then
    raise exception 'candidate_not_contacted';
  end if;

  if exists (
    select 1
    from public.project_engagements
    where request_candidate_id = v_candidate.id
  ) then
    raise exception 'engagement_exists';
  end if;

  v_decline_reason := nullif(left(btrim(coalesce(p_decline_reason, '')), 1000), '');

  update public.request_candidates
  set
    provider_response_status = p_response,
    provider_responded_at = now(),
    declined_by = case when p_response = 'declined' then 'provider' else null end,
    decline_reason = case when p_response = 'declined' then v_decline_reason else null end
  where id = v_candidate.id;

  if not found then
    raise exception 'candidate_update_failed';
  end if;

  return p_response;
end;
$$;

create or replace function public.decide_on_my_presented_candidate(
  p_request_candidate_id uuid,
  p_decision text,
  p_decline_reason text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_actor public.profiles%rowtype;
  v_candidate public.request_candidates%rowtype;
  v_request public.project_requests%rowtype;
  v_provider_status text;
  v_existing_accepted uuid;
  v_decline_reason text;
begin
  v_actor_id := auth.uid();

  if v_actor_id is null then
    raise exception 'auth_required';
  end if;

  if p_decision is distinct from 'accepted'
    and p_decision is distinct from 'declined'
  then
    raise exception 'decision_invalid';
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
  into v_candidate
  from public.request_candidates
  where id = p_request_candidate_id
  for update;

  if not found then
    raise exception 'not_authorized';
  end if;

  select *
  into v_request
  from public.project_requests
  where id = v_candidate.project_request_id
  for update;

  if not found
    or v_request.linked_student_profile_id <> v_actor_id
  then
    raise exception 'not_authorized';
  end if;

  if v_candidate.student_decision_status = p_decision
    and p_decision = any (array['accepted'::text, 'declined'::text])
  then
    return v_candidate.student_decision_status;
  end if;

  if v_candidate.student_decision_status = any (array['accepted'::text, 'declined'::text]) then
    raise exception 'decision_final';
  end if;

  if v_candidate.student_decision_status <> 'presented' then
    raise exception 'candidate_not_presented';
  end if;

  if v_candidate.provider_response_status <> 'interested' then
    raise exception 'candidate_not_interested';
  end if;

  if v_candidate.provider_application_id is null then
    raise exception 'stage1_provider_required';
  end if;

  select status
  into v_provider_status
  from public.provider_applications
  where id = v_candidate.provider_application_id;

  if not found then
    raise exception 'provider_not_found';
  end if;

  if v_provider_status <> 'approved' then
    raise exception 'provider_not_approved';
  end if;

  if v_request.status <> 'reviewed'
    or v_request.integrity_review_status <> 'clear'
  then
    raise exception 'request_not_eligible';
  end if;

  if exists (
    select 1
    from public.project_engagements
    where request_candidate_id = v_candidate.id
  ) then
    raise exception 'engagement_exists';
  end if;

  if p_decision = 'accepted' then
    if v_candidate.candidate_rank is null then
      raise exception 'candidate_not_ranked';
    end if;

    if v_candidate.candidate_rank < 1 or v_candidate.candidate_rank > 3 then
      raise exception 'candidate_rank_invalid';
    end if;

    select id
    into v_existing_accepted
    from public.request_candidates
    where project_request_id = v_candidate.project_request_id
      and student_decision_status = 'accepted'
      and id <> v_candidate.id
    limit 1;

    if found then
      raise exception 'candidate_already_accepted';
    end if;

    update public.request_candidates
    set
      student_decision_status = 'accepted',
      student_decision_at = now(),
      declined_by = null,
      decline_reason = null
    where id = v_candidate.id;

    if not found then
      raise exception 'candidate_update_failed';
    end if;

    update public.project_requests
    set status = 'matched'
    where id = v_candidate.project_request_id;

    if not found then
      raise exception 'request_update_failed';
    end if;

    return 'accepted';
  end if;

  v_decline_reason := nullif(left(btrim(coalesce(p_decline_reason, '')), 1000), '');

  update public.request_candidates
  set
    student_decision_status = 'declined',
    student_decision_at = now(),
    declined_by = 'student',
    decline_reason = v_decline_reason,
    candidate_rank = null
  where id = v_candidate.id;

  if not found then
    raise exception 'candidate_update_failed';
  end if;

  return 'declined';
end;
$$;

revoke all on function public.get_my_project_request_detail(uuid) from public;
revoke all on function public.get_my_project_request_detail(uuid) from anon;
revoke all on function public.get_my_project_request_detail(uuid) from authenticated;
grant execute on function public.get_my_project_request_detail(uuid) to authenticated;

revoke all on function public.get_my_provider_application_detail(uuid) from public;
revoke all on function public.get_my_provider_application_detail(uuid) from anon;
revoke all on function public.get_my_provider_application_detail(uuid) from authenticated;
grant execute on function public.get_my_provider_application_detail(uuid) to authenticated;

revoke all on function public.respond_to_my_request_candidate(uuid, text, text) from public;
revoke all on function public.respond_to_my_request_candidate(uuid, text, text) from anon;
revoke all on function public.respond_to_my_request_candidate(uuid, text, text) from authenticated;
grant execute on function public.respond_to_my_request_candidate(uuid, text, text) to authenticated;

revoke all on function public.decide_on_my_presented_candidate(uuid, text, text) from public;
revoke all on function public.decide_on_my_presented_candidate(uuid, text, text) from anon;
revoke all on function public.decide_on_my_presented_candidate(uuid, text, text) from authenticated;
grant execute on function public.decide_on_my_presented_candidate(uuid, text, text) to authenticated;

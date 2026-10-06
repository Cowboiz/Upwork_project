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

revoke all on function public.respond_to_my_request_candidate(uuid, text, text) from public;
revoke all on function public.respond_to_my_request_candidate(uuid, text, text) from anon;
revoke all on function public.respond_to_my_request_candidate(uuid, text, text) from authenticated;
grant execute on function public.respond_to_my_request_candidate(uuid, text, text) to authenticated;

revoke all on function public.decide_on_my_presented_candidate(uuid, text, text) from public;
revoke all on function public.decide_on_my_presented_candidate(uuid, text, text) from anon;
revoke all on function public.decide_on_my_presented_candidate(uuid, text, text) from authenticated;
grant execute on function public.decide_on_my_presented_candidate(uuid, text, text) to authenticated;

create or replace function public.accept_request_candidate(
  p_request_id uuid,
  p_candidate_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request public.project_requests%rowtype;
  v_candidate public.request_candidates%rowtype;
  v_provider_status text;
  v_existing_accepted uuid;
begin
  if not public.is_admin() then
    raise exception 'admin_required';
  end if;

  select *
  into v_request
  from public.project_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'request_not_found';
  end if;

  select *
  into v_candidate
  from public.request_candidates
  where id = p_candidate_id;

  if not found then
    raise exception 'candidate_not_found';
  end if;

  if v_candidate.project_request_id <> p_request_id then
    raise exception 'candidate_request_mismatch';
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

  if v_candidate.provider_response_status <> 'interested' then
    raise exception 'candidate_not_interested';
  end if;

  if v_candidate.student_decision_status <> 'presented' then
    raise exception 'candidate_not_presented';
  end if;

  if v_candidate.candidate_rank is null then
    raise exception 'candidate_not_ranked';
  end if;

  if v_candidate.candidate_rank < 1 or v_candidate.candidate_rank > 3 then
    raise exception 'candidate_rank_invalid';
  end if;

  if v_request.status <> 'reviewed'
    or v_request.integrity_review_status <> 'clear'
  then
    raise exception 'request_not_eligible';
  end if;

  select id
  into v_existing_accepted
  from public.request_candidates
  where project_request_id = p_request_id
    and student_decision_status = 'accepted'
    and id <> p_candidate_id
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
  where id = p_candidate_id;

  if not found then
    raise exception 'candidate_update_failed';
  end if;

  update public.project_requests
  set status = 'matched'
  where id = p_request_id;

  if not found then
    raise exception 'request_update_failed';
  end if;
end;
$$;

revoke all on function public.accept_request_candidate(uuid, uuid) from public;
grant execute on function public.accept_request_candidate(uuid, uuid) to authenticated;

create or replace function public.create_project_engagement(
  p_request_id uuid,
  p_candidate_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request public.project_requests%rowtype;
  v_candidate public.request_candidates%rowtype;
  v_provider_status text;
  v_engagement_id uuid;
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
  where id = p_candidate_id
  for update;

  if not found then
    raise exception 'candidate_not_found';
  end if;

  if v_candidate.project_request_id <> p_request_id then
    raise exception 'candidate_request_mismatch';
  end if;

  if v_candidate.student_decision_status <> 'accepted' then
    raise exception 'candidate_not_accepted';
  end if;

  if v_request.status <> 'matched' then
    raise exception 'request_not_matched';
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

  if v_candidate.agreed_price is null then
    raise exception 'agreed_price_required';
  end if;

  if v_candidate.agreed_deadline is null then
    raise exception 'agreed_deadline_required';
  end if;

  if exists (
    select 1
    from public.project_engagements
    where request_candidate_id = p_candidate_id
  ) then
    raise exception 'engagement_already_exists';
  end if;

  insert into public.project_engagements (
    request_candidate_id,
    agreed_amount,
    currency,
    agreed_deadline
  )
  values (
    p_candidate_id,
    v_candidate.agreed_price,
    v_candidate.currency,
    v_candidate.agreed_deadline
  )
  returning id into v_engagement_id;

  return v_engagement_id;
end;
$$;

create or replace function public.update_project_engagement_status(
  p_request_id uuid,
  p_engagement_id uuid,
  p_status text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_engagement public.project_engagements%rowtype;
  v_request public.project_requests%rowtype;
  v_candidate public.request_candidates%rowtype;
  v_request_status text;
begin
  if not public.is_admin() then
    raise exception 'admin_required';
  end if;

  select *
  into v_engagement
  from public.project_engagements
  where id = p_engagement_id
  for update;

  if not found then
    raise exception 'engagement_not_found';
  end if;

  select *
  into v_candidate
  from public.request_candidates
  where id = v_engagement.request_candidate_id;

  if not found then
    raise exception 'candidate_not_found';
  end if;

  if v_candidate.project_request_id <> p_request_id then
    raise exception 'engagement_request_mismatch';
  end if;

  select *
  into v_request
  from public.project_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'request_not_found';
  end if;

  if p_status = v_engagement.status then
    return;
  end if;

  if not (p_status = any (array[
    'agreed',
    'in_progress',
    'submitted',
    'completed',
    'cancelled',
    'disputed'
  ])) then
    raise exception 'engagement_status_invalid';
  end if;

  if v_engagement.status in ('completed', 'cancelled') then
    raise exception 'engagement_terminal';
  end if;

  if not (
    (v_engagement.status = 'agreed'
      and p_status = any (array['in_progress', 'cancelled']))
    or (v_engagement.status = 'in_progress'
      and p_status = any (array['submitted', 'disputed', 'cancelled']))
    or (v_engagement.status = 'submitted'
      and p_status = any (array['completed', 'disputed', 'cancelled']))
    or (v_engagement.status = 'disputed'
      and p_status = any (array['in_progress', 'submitted', 'cancelled']))
  ) then
    raise exception 'engagement_transition_invalid';
  end if;

  v_request_status := case
    when p_status = 'completed' then 'completed'
    when p_status = 'cancelled' then 'cancelled'
    else 'in_progress'
  end;

  update public.project_engagements
  set
    status = p_status,
    started_at = case
      when p_status = 'in_progress' and started_at is null then now()
      else started_at
    end,
    completed_at = case
      when p_status = 'completed' then now()
      else completed_at
    end,
    cancelled_at = case
      when p_status = 'cancelled' then now()
      else cancelled_at
    end
  where id = p_engagement_id;

  if not found then
    raise exception 'engagement_update_failed';
  end if;

  update public.project_requests
  set status = v_request_status
  where id = p_request_id;

  if not found then
    raise exception 'request_update_failed';
  end if;
end;
$$;

revoke all on function public.create_project_engagement(uuid, uuid) from public;
revoke all on function public.update_project_engagement_status(uuid, uuid, text) from public;

grant execute on function public.create_project_engagement(uuid, uuid) to authenticated;
grant execute on function public.update_project_engagement_status(uuid, uuid, text) to authenticated;

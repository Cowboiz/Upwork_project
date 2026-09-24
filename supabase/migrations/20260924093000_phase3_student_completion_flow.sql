create or replace function public.complete_engagement(
  p_token_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token public.engagement_access_tokens%rowtype;
  v_engagement public.project_engagements%rowtype;
  v_candidate public.request_candidates%rowtype;
  v_request public.project_requests%rowtype;
begin
  select *
  into v_token
  from public.engagement_access_tokens
  where id = p_token_id
  for update;

  if not found then
    raise exception 'token_not_found';
  end if;

  if v_token.audience <> 'student' then
    raise exception 'token_audience_invalid';
  end if;

  if v_token.revoked_at is not null then
    raise exception 'token_revoked';
  end if;

  if v_token.expires_at <= now() then
    raise exception 'token_expired';
  end if;

  select *
  into v_engagement
  from public.project_engagements
  where id = v_token.project_engagement_id
  for update;

  if not found then
    raise exception 'engagement_not_found';
  end if;

  select *
  into v_candidate
  from public.request_candidates
  where id = v_engagement.request_candidate_id
  for update;

  if not found then
    raise exception 'candidate_not_found';
  end if;

  select *
  into v_request
  from public.project_requests
  where id = v_candidate.project_request_id
  for update;

  if not found then
    raise exception 'request_not_found';
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

create or replace function public.dispute_engagement(
  p_token_id uuid,
  p_dispute_notes text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token public.engagement_access_tokens%rowtype;
  v_engagement public.project_engagements%rowtype;
  v_candidate public.request_candidates%rowtype;
  v_request public.project_requests%rowtype;
  v_dispute_notes text;
begin
  select *
  into v_token
  from public.engagement_access_tokens
  where id = p_token_id
  for update;

  if not found then
    raise exception 'token_not_found';
  end if;

  if v_token.audience <> 'student' then
    raise exception 'token_audience_invalid';
  end if;

  if v_token.revoked_at is not null then
    raise exception 'token_revoked';
  end if;

  if v_token.expires_at <= now() then
    raise exception 'token_expired';
  end if;

  select *
  into v_engagement
  from public.project_engagements
  where id = v_token.project_engagement_id
  for update;

  if not found then
    raise exception 'engagement_not_found';
  end if;

  select *
  into v_candidate
  from public.request_candidates
  where id = v_engagement.request_candidate_id
  for update;

  if not found then
    raise exception 'candidate_not_found';
  end if;

  select *
  into v_request
  from public.project_requests
  where id = v_candidate.project_request_id
  for update;

  if not found then
    raise exception 'request_not_found';
  end if;

  v_dispute_notes := nullif(btrim(coalesce(p_dispute_notes, '')), '');

  if v_dispute_notes is null then
    raise exception 'dispute_notes_required';
  end if;

  if char_length(v_dispute_notes) > 5000 then
    raise exception 'dispute_notes_too_long';
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

revoke all on function public.complete_engagement(uuid) from public;
revoke all on function public.complete_engagement(uuid) from anon;
revoke all on function public.complete_engagement(uuid) from authenticated;
grant execute on function public.complete_engagement(uuid) to service_role;

revoke all on function public.dispute_engagement(uuid, text) from public;
revoke all on function public.dispute_engagement(uuid, text) from anon;
revoke all on function public.dispute_engagement(uuid, text) from authenticated;
grant execute on function public.dispute_engagement(uuid, text) to service_role;

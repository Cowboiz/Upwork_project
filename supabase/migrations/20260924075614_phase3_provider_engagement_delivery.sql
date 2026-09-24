create or replace function public.start_engagement_work(
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

  if v_token.audience <> 'provider' then
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

create or replace function public.submit_engagement_deliverable(
  p_token_id uuid,
  p_deliverable_url text default null,
  p_deliverable_summary text default null
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
  v_deliverable_url text;
  v_deliverable_summary text;
begin
  select *
  into v_token
  from public.engagement_access_tokens
  where id = p_token_id
  for update;

  if not found then
    raise exception 'token_not_found';
  end if;

  if v_token.audience <> 'provider' then
    raise exception 'token_audience_invalid';
  end if;

  if v_token.revoked_at is not null then
    raise exception 'token_revoked';
  end if;

  if v_token.expires_at <= now() then
    raise exception 'token_expired';
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

revoke all on function public.start_engagement_work(uuid) from public;
revoke all on function public.start_engagement_work(uuid) from anon;
revoke all on function public.start_engagement_work(uuid) from authenticated;
grant execute on function public.start_engagement_work(uuid) to service_role;

revoke all on function public.submit_engagement_deliverable(uuid, text, text) from public;
revoke all on function public.submit_engagement_deliverable(uuid, text, text) from anon;
revoke all on function public.submit_engagement_deliverable(uuid, text, text) from authenticated;
grant execute on function public.submit_engagement_deliverable(uuid, text, text) to service_role;

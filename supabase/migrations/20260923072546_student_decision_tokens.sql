create table public.student_decision_tokens (
  id uuid primary key default gen_random_uuid(),
  request_candidate_id uuid not null unique
    references public.request_candidates(id) on delete cascade,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone not null default now()
);

alter table public.student_decision_tokens enable row level security;

create index student_decision_tokens_expires_at_idx
  on public.student_decision_tokens using btree (expires_at);

revoke all on table public.student_decision_tokens from public;
revoke all on table public.student_decision_tokens from anon;
revoke all on table public.student_decision_tokens from authenticated;
grant all on table public.student_decision_tokens to service_role;

create or replace function public.respond_to_presented_candidate(
  p_token_id uuid,
  p_decision text,
  p_decline_reason text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token public.student_decision_tokens%rowtype;
  v_candidate public.request_candidates%rowtype;
  v_request public.project_requests%rowtype;
  v_provider_status text;
  v_existing_accepted uuid;
  v_decline_reason text;
begin
  if p_decision is distinct from 'accepted'
    and p_decision is distinct from 'declined'
  then
    raise exception 'decision_invalid';
  end if;

  select *
  into v_token
  from public.student_decision_tokens
  where id = p_token_id
  for update;

  if not found then
    raise exception 'token_not_found';
  end if;

  if v_token.expires_at <= now() then
    raise exception 'token_expired';
  end if;

  select *
  into v_candidate
  from public.request_candidates
  where id = v_token.request_candidate_id
  for update;

  if not found then
    raise exception 'candidate_not_found';
  end if;

  if v_candidate.student_decision_status = p_decision
    and p_decision = any (array['accepted'::text, 'declined'::text])
  then
    return v_candidate.student_decision_status;
  end if;

  if v_candidate.student_decision_status = any (array['accepted'::text, 'declined'::text]) then
    raise exception 'decision_final';
  end if;

  select *
  into v_request
  from public.project_requests
  where id = v_candidate.project_request_id
  for update;

  if not found then
    raise exception 'request_not_found';
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

revoke all on function public.respond_to_presented_candidate(uuid, text, text) from public;
revoke all on function public.respond_to_presented_candidate(uuid, text, text) from anon;
revoke all on function public.respond_to_presented_candidate(uuid, text, text) from authenticated;
grant execute on function public.respond_to_presented_candidate(uuid, text, text) to service_role;

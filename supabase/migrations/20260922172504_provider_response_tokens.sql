create table public.provider_response_tokens (
  id uuid primary key default gen_random_uuid(),
  request_candidate_id uuid not null unique
    references public.request_candidates(id) on delete cascade,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone not null default now()
);

alter table public.provider_response_tokens enable row level security;

create index provider_response_tokens_expires_at_idx
  on public.provider_response_tokens using btree (expires_at);

revoke all on table public.provider_response_tokens from public;
revoke all on table public.provider_response_tokens from anon;
revoke all on table public.provider_response_tokens from authenticated;
grant all on table public.provider_response_tokens to service_role;

create or replace function public.respond_to_request_candidate_invitation(
  p_token_id uuid,
  p_response text,
  p_decline_reason text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token public.provider_response_tokens%rowtype;
  v_candidate public.request_candidates%rowtype;
  v_provider_status text;
  v_request public.project_requests%rowtype;
  v_decline_reason text;
begin
  if p_response is distinct from 'interested'
    and p_response is distinct from 'declined'
  then
    raise exception 'response_invalid';
  end if;

  select *
  into v_token
  from public.provider_response_tokens
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

  if v_candidate.provider_response_status = p_response
    and p_response = any (array['interested'::text, 'declined'::text])
  then
    return v_candidate.provider_response_status;
  end if;

  if v_candidate.provider_response_status <> 'pending' then
    raise exception 'response_closed';
  end if;

  if v_candidate.provider_application_id is null then
    raise exception 'provider_application_required';
  end if;

  if v_candidate.student_decision_status = any (array['accepted'::text, 'declined'::text])
    or v_candidate.student_decision_status = 'presented'
    or v_candidate.candidate_rank is not null
  then
    raise exception 'candidate_already_presented';
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

revoke all on function public.respond_to_request_candidate_invitation(uuid, text, text) from public;
revoke all on function public.respond_to_request_candidate_invitation(uuid, text, text) from anon;
revoke all on function public.respond_to_request_candidate_invitation(uuid, text, text) from authenticated;
grant execute on function public.respond_to_request_candidate_invitation(uuid, text, text) to service_role;

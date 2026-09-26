create table public.engagement_feedback (
  id uuid primary key default gen_random_uuid(),
  project_engagement_id uuid not null
    references public.project_engagements(id) on delete cascade,
  rating smallint not null,
  feedback_text text,
  created_at timestamp with time zone not null default now(),
  constraint engagement_feedback_project_engagement_id_key
    unique (project_engagement_id),
  constraint engagement_feedback_rating_check
    check (rating between 1 and 5),
  constraint engagement_feedback_text_length_check
    check (feedback_text is null or char_length(feedback_text) <= 5000)
);

alter table public.engagement_feedback enable row level security;

create index engagement_feedback_created_at_idx
  on public.engagement_feedback using btree (created_at desc);

revoke all on table public.engagement_feedback from public;
revoke all on table public.engagement_feedback from anon;
revoke all on table public.engagement_feedback from authenticated;
grant all on table public.engagement_feedback to service_role;

alter table public.workflow_events
  drop constraint workflow_events_known_event_check,
  add constraint workflow_events_known_event_check
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
      'engagement_feedback_submitted'::text,
      'payment_status_changed'::text
    ]));

create unique index workflow_events_engagement_feedback_submitted_once_idx
  on public.workflow_events (project_engagement_id)
  where project_engagement_id is not null
    and event_name = 'engagement_feedback_submitted';

create or replace function public.submit_engagement_feedback(
  p_token_id uuid,
  p_rating integer,
  p_feedback_text text
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
  v_existing_feedback public.engagement_feedback%rowtype;
  v_feedback_text text;
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

  select *
  into v_candidate
  from public.request_candidates
  where id = v_engagement.request_candidate_id
  for update;

  if not found then
    raise exception 'candidate_not_found';
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

revoke all on function public.submit_engagement_feedback(uuid, integer, text) from public;
revoke all on function public.submit_engagement_feedback(uuid, integer, text) from anon;
revoke all on function public.submit_engagement_feedback(uuid, integer, text) from authenticated;
grant execute on function public.submit_engagement_feedback(uuid, integer, text) to service_role;

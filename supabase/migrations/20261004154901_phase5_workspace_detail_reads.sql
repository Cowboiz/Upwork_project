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
  request_candidate_id uuid,
  candidate_rank integer,
  provider_response_status text,
  student_decision_status text,
  engagement_id uuid,
  engagement_status text
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
    request_candidate.id as request_candidate_id,
    request_candidate.candidate_rank,
    request_candidate.provider_response_status,
    request_candidate.student_decision_status,
    project_engagements.id as engagement_id,
    project_engagements.status as engagement_status
  from public.project_requests
  join current_profile
    on current_profile.id = project_requests.linked_student_profile_id
  left join lateral (
    select
      request_candidates.id,
      request_candidates.candidate_rank,
      request_candidates.provider_response_status,
      request_candidates.student_decision_status
    from public.request_candidates
    where request_candidates.project_request_id = project_requests.id
    order by
      request_candidates.candidate_rank asc nulls last,
      request_candidates.created_at desc,
      request_candidates.id desc
    limit 1
  ) as request_candidate on true
  left join public.project_engagements
    on project_engagements.request_candidate_id = request_candidate.id
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
  request_candidate_id uuid,
  project_request_id uuid,
  request_category text,
  candidate_rank integer,
  provider_response_status text,
  student_decision_status text,
  proposed_price numeric,
  agreed_price numeric,
  agreed_deadline date,
  currency text,
  engagement_id uuid,
  engagement_status text
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
    request_candidates.id as request_candidate_id,
    project_requests.id as project_request_id,
    project_requests.category as request_category,
    request_candidates.candidate_rank,
    request_candidates.provider_response_status,
    request_candidates.student_decision_status,
    request_candidates.proposed_price,
    request_candidates.agreed_price,
    request_candidates.agreed_deadline,
    request_candidates.currency,
    project_engagements.id as engagement_id,
    project_engagements.status as engagement_status
  from public.provider_applications
  join current_profile
    on current_profile.id = provider_applications.linked_provider_profile_id
  left join public.request_candidates
    on request_candidates.provider_application_id = provider_applications.id
  left join public.project_requests
    on project_requests.id = request_candidates.project_request_id
  left join public.project_engagements
    on project_engagements.request_candidate_id = request_candidates.id
  where provider_applications.id = p_application_id
  order by
    request_candidates.candidate_rank asc nulls last,
    request_candidates.created_at desc,
    request_candidates.id desc
  limit 1;
$$;

create or replace function public.get_my_engagement_detail(p_engagement_id uuid)
returns table (
  engagement_id uuid,
  project_request_id uuid,
  request_candidate_id uuid,
  participant_side text,
  category text,
  engagement_status text,
  payment_status text,
  agreed_amount numeric,
  currency text,
  agreed_deadline date,
  started_at timestamp with time zone,
  submitted_at timestamp with time zone,
  completed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  deliverable_summary text,
  deliverable_url text,
  counterparty_display_name text,
  candidate_rank integer,
  provider_response_status text,
  student_decision_status text,
  feedback_rating integer,
  feedback_text text,
  feedback_created_at timestamp with time zone
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
      and profiles.role in ('student', 'freelancer', 'both')
  ),
  engagement_participants as (
    select
      project_engagements.id as engagement_id,
      project_engagements.request_candidate_id,
      project_engagements.status as engagement_status,
      project_engagements.payment_status,
      project_engagements.agreed_amount,
      project_engagements.currency,
      project_engagements.agreed_deadline,
      project_engagements.started_at,
      project_engagements.submitted_at,
      project_engagements.completed_at,
      project_engagements.cancelled_at,
      project_engagements.created_at,
      project_engagements.updated_at,
      project_engagements.deliverable_summary,
      project_engagements.deliverable_url,
      request_candidates.id as candidate_id,
      request_candidates.candidate_rank,
      request_candidates.provider_response_status,
      request_candidates.student_decision_status,
      project_requests.id as project_request_id,
      project_requests.category,
      project_requests.linked_student_profile_id as student_profile_id,
      coalesce(
        request_candidates.linked_provider_profile_id,
        provider_applications.linked_provider_profile_id
      ) as provider_profile_id
    from public.project_engagements
    join public.request_candidates
      on request_candidates.id = project_engagements.request_candidate_id
    join public.project_requests
      on project_requests.id = request_candidates.project_request_id
    left join public.provider_applications
      on provider_applications.id = request_candidates.provider_application_id
    where project_engagements.id = p_engagement_id
  ),
  authorized as (
    select
      engagement_participants.*,
      case
        when current_profile.id = engagement_participants.student_profile_id then 'student'
        when current_profile.id = engagement_participants.provider_profile_id then 'provider'
      end as participant_side,
      case
        when current_profile.id = engagement_participants.student_profile_id then engagement_participants.provider_profile_id
        else engagement_participants.student_profile_id
      end as counterparty_profile_id
    from engagement_participants
    join current_profile
      on current_profile.id in (
        engagement_participants.student_profile_id,
        engagement_participants.provider_profile_id
      )
    where engagement_participants.student_profile_id is not null
      and engagement_participants.provider_profile_id is not null
  )
  select
    authorized.engagement_id,
    authorized.project_request_id,
    authorized.request_candidate_id,
    authorized.participant_side,
    authorized.category,
    authorized.engagement_status,
    authorized.payment_status,
    authorized.agreed_amount,
    authorized.currency,
    authorized.agreed_deadline,
    authorized.started_at,
    authorized.submitted_at,
    authorized.completed_at,
    authorized.cancelled_at,
    authorized.created_at,
    authorized.updated_at,
    authorized.deliverable_summary,
    authorized.deliverable_url,
    coalesce(
      nullif(counterparty.full_name, ''),
      nullif(counterparty.username, ''),
      'ProjectMatch participant'
    ) as counterparty_display_name,
    authorized.candidate_rank,
    authorized.provider_response_status,
    authorized.student_decision_status,
    engagement_feedback.rating as feedback_rating,
    engagement_feedback.feedback_text,
    engagement_feedback.created_at as feedback_created_at
  from authorized
  join public.profiles as counterparty
    on counterparty.id = authorized.counterparty_profile_id
  left join public.engagement_feedback
    on engagement_feedback.project_engagement_id = authorized.engagement_id;
$$;

revoke all on function public.get_my_project_request_detail(uuid) from public;
revoke all on function public.get_my_project_request_detail(uuid) from anon;
revoke all on function public.get_my_project_request_detail(uuid) from authenticated;
grant execute on function public.get_my_project_request_detail(uuid) to authenticated;

revoke all on function public.get_my_provider_application_detail(uuid) from public;
revoke all on function public.get_my_provider_application_detail(uuid) from anon;
revoke all on function public.get_my_provider_application_detail(uuid) from authenticated;
grant execute on function public.get_my_provider_application_detail(uuid) to authenticated;

revoke all on function public.get_my_engagement_detail(uuid) from public;
revoke all on function public.get_my_engagement_detail(uuid) from anon;
revoke all on function public.get_my_engagement_detail(uuid) from authenticated;
grant execute on function public.get_my_engagement_detail(uuid) to authenticated;

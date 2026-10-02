drop function if exists public.get_my_project_requests();
drop function if exists public.get_my_provider_applications();

create or replace function public.get_my_project_requests(
  p_limit integer,
  p_offset integer
)
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
  total_count bigint,
  active_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with safe_args as (
    select
      least(greatest(coalesce(p_limit, 10), 1), 10)::integer as page_limit,
      greatest(coalesce(p_offset, 0), 0)::integer as page_offset
  ),
  owned_requests as (
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
      count(*) over () as total_count,
      count(*) filter (
        where project_requests.status in (
          'new',
          'needs_clarification',
          'reviewed',
          'matched',
          'in_progress'
        )
      ) over () as active_count
    from public.project_requests
    where (select auth.uid()) is not null
      and project_requests.linked_student_profile_id = (select auth.uid())
  )
  select owned_requests.*
  from owned_requests, safe_args
  order by owned_requests.created_at desc, owned_requests.id desc
  limit safe_args.page_limit
  offset safe_args.page_offset;
$$;

create or replace function public.get_my_provider_applications(
  p_limit integer,
  p_offset integer
)
returns table (
  id uuid,
  applicant_name text,
  skills text[],
  preferred_project_types text[],
  availability text,
  rate_expectations text,
  status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  total_count bigint,
  active_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with safe_args as (
    select
      least(greatest(coalesce(p_limit, 10), 1), 10)::integer as page_limit,
      greatest(coalesce(p_offset, 0), 0)::integer as page_offset
  ),
  owned_applications as (
    select
      provider_applications.id,
      provider_applications.applicant_name,
      provider_applications.skills,
      provider_applications.preferred_project_types,
      provider_applications.availability,
      provider_applications.rate_expectations,
      provider_applications.status,
      provider_applications.created_at,
      provider_applications.updated_at,
      count(*) over () as total_count
    from public.provider_applications
    where (select auth.uid()) is not null
      and provider_applications.linked_provider_profile_id = (select auth.uid())
  )
  select owned_applications.*
  from owned_applications, safe_args
  order by owned_applications.created_at desc, owned_applications.id desc
  limit safe_args.page_limit
  offset safe_args.page_offset;
$$;

create or replace function public.get_my_engagements(
  p_limit integer,
  p_offset integer
)
returns table (
  engagement_id uuid,
  project_request_id uuid,
  request_candidate_id uuid,
  participant_side text,
  category text,
  status text,
  payment_status text,
  agreed_amount numeric,
  currency text,
  agreed_deadline date,
  started_at timestamp with time zone,
  submitted_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with safe_args as (
    select
      least(greatest(coalesce(p_limit, 10), 1), 10)::integer as page_limit,
      greatest(coalesce(p_offset, 0), 0)::integer as page_offset
  ),
  visible_engagements as (
    select
      project_engagements.id as engagement_id,
      project_requests.id as project_request_id,
      request_candidates.id as request_candidate_id,
      case
        when project_requests.linked_student_profile_id = (select auth.uid())
          then 'student'
        when coalesce(
          request_candidates.linked_provider_profile_id,
          provider_applications.linked_provider_profile_id
        ) = (select auth.uid())
          then 'provider'
      end as participant_side,
      project_requests.category,
      project_engagements.status,
      project_engagements.payment_status,
      project_engagements.agreed_amount,
      project_engagements.currency,
      project_engagements.agreed_deadline,
      project_engagements.started_at,
      project_engagements.submitted_at,
      project_engagements.completed_at,
      project_engagements.created_at,
      project_engagements.updated_at,
      count(*) over () as total_count,
      count(*) filter (
        where project_engagements.status in ('agreed', 'in_progress')
      ) over () as active_count
    from public.project_engagements
    join public.request_candidates
      on request_candidates.id = project_engagements.request_candidate_id
    join public.project_requests
      on project_requests.id = request_candidates.project_request_id
    left join public.provider_applications
      on provider_applications.id = request_candidates.provider_application_id
    where (select auth.uid()) is not null
      and (
        project_requests.linked_student_profile_id = (select auth.uid())
        or coalesce(
          request_candidates.linked_provider_profile_id,
          provider_applications.linked_provider_profile_id
        ) = (select auth.uid())
      )
  )
  select visible_engagements.*
  from visible_engagements, safe_args
  order by visible_engagements.created_at desc, visible_engagements.engagement_id desc
  limit safe_args.page_limit
  offset safe_args.page_offset;
$$;

revoke all on function public.get_my_project_requests(integer, integer) from public;
revoke all on function public.get_my_project_requests(integer, integer) from anon;
revoke all on function public.get_my_project_requests(integer, integer) from authenticated;
grant execute on function public.get_my_project_requests(integer, integer) to authenticated;

revoke all on function public.get_my_provider_applications(integer, integer) from public;
revoke all on function public.get_my_provider_applications(integer, integer) from anon;
revoke all on function public.get_my_provider_applications(integer, integer) from authenticated;
grant execute on function public.get_my_provider_applications(integer, integer) to authenticated;

revoke all on function public.get_my_engagements(integer, integer) from public;
revoke all on function public.get_my_engagements(integer, integer) from anon;
revoke all on function public.get_my_engagements(integer, integer) from authenticated;
grant execute on function public.get_my_engagements(integer, integer) to authenticated;

create or replace function public.get_my_project_requests()
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
  updated_at timestamp with time zone
)
language sql
stable
security definer
set search_path = ''
as $$
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
    project_requests.updated_at
  from public.project_requests
  where auth.uid() is not null
    and project_requests.linked_student_profile_id = auth.uid();
$$;

create or replace function public.get_my_provider_applications()
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
  updated_at timestamp with time zone
)
language sql
stable
security definer
set search_path = ''
as $$
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
    provider_applications.updated_at
  from public.provider_applications
  where auth.uid() is not null
    and provider_applications.linked_provider_profile_id = auth.uid();
$$;

revoke all on function public.get_my_project_requests() from public;
revoke all on function public.get_my_project_requests() from anon;
grant execute on function public.get_my_project_requests() to authenticated;

revoke all on function public.get_my_provider_applications() from public;
revoke all on function public.get_my_provider_applications() from anon;
grant execute on function public.get_my_provider_applications() to authenticated;

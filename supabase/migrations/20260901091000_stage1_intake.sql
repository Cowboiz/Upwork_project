create table public.project_requests (
  id uuid primary key default gen_random_uuid(),
  requester_name text not null,
  contact_method text not null,
  contact_value text not null,
  school_or_context text,
  category text not null,
  description text not null,
  desired_deliverables text,
  deadline date,
  deadline_flexible boolean not null default false,
  budget_range text not null,
  currency character(3) not null,
  asset_links text[] not null default '{}',
  source_channel text,
  contact_permission_confirmed boolean not null default false,
  age_eligible_confirmed boolean not null default false,
  integrity_attested boolean not null default false,
  integrity_review_status text not null default 'needs_review',
  status text not null default 'new',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamp with time zone,
  rejection_reason text,
  cancellation_reason text,
  internal_notes text,
  linked_student_profile_id uuid references public.profiles(id),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint project_requests_contact_method_check
    check (contact_method = any (array['email'::text, 'phone'::text, 'discord'::text, 'telegram'::text, 'whatsapp'::text, 'other'::text])),
  constraint project_requests_category_check
    check (category = any (array['web_landing_page'::text, 'ui_ux_prototype'::text, 'graphic_brand_design'::text, 'small_web_development'::text, 'integration_automation'::text, 'other'::text])),
  constraint project_requests_budget_range_check
    check (budget_range = any (array['lt_50'::text, '50_100'::text, '100_300'::text, '300_500'::text, '500_plus'::text, 'unknown'::text])),
  constraint project_requests_currency_check
    check (currency ~ '^[A-Z]{3}$'),
  constraint project_requests_integrity_review_status_check
    check (integrity_review_status = any (array['needs_review'::text, 'clear'::text, 'rejected'::text])),
  constraint project_requests_status_check
    check (status = any (array['new'::text, 'needs_clarification'::text, 'reviewed'::text, 'matched'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'rejected'::text]))
);

comment on column public.project_requests.budget_range is
  'Provisional Stage 1 budget bands from the current PRD pricing hypothesis; revisit after pilot evidence.';

alter table public.project_requests enable row level security;

create trigger project_requests_set_updated_at
  before update on public.project_requests
  for each row
  execute function public.set_updated_at();

create index project_requests_status_created_at_idx
  on public.project_requests using btree (status, created_at desc);

create index project_requests_integrity_review_status_created_at_idx
  on public.project_requests using btree (integrity_review_status, created_at desc);

create index project_requests_reviewed_by_idx
  on public.project_requests using btree (reviewed_by)
  where reviewed_by is not null;

create index project_requests_linked_student_profile_id_idx
  on public.project_requests using btree (linked_student_profile_id)
  where linked_student_profile_id is not null;

revoke all on table public.project_requests from anon, authenticated;
grant all on table public.project_requests to service_role;

create table public.provider_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_name text not null,
  contact_method text not null,
  contact_value text not null,
  skills text[] not null default '{}',
  preferred_project_types text[] not null default '{}',
  portfolio_urls text[] not null default '{}',
  availability text not null,
  rate_expectations text not null,
  source_channel text,
  age_eligible_confirmed boolean not null default false,
  privacy_acknowledged_at timestamp with time zone,
  policy_accepted_at timestamp with time zone,
  status text not null default 'new',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamp with time zone,
  internal_notes text,
  linked_provider_profile_id uuid references public.profiles(id),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint provider_applications_contact_method_check
    check (contact_method = any (array['email'::text, 'phone'::text, 'discord'::text, 'telegram'::text, 'whatsapp'::text, 'other'::text])),
  constraint provider_applications_portfolio_required_check
    check (cardinality(portfolio_urls) > 0),
  constraint provider_applications_status_check
    check (status = any (array['new'::text, 'approved'::text, 'waitlisted'::text, 'rejected'::text, 'inactive'::text]))
);

alter table public.provider_applications enable row level security;

create trigger provider_applications_set_updated_at
  before update on public.provider_applications
  for each row
  execute function public.set_updated_at();

create index provider_applications_status_created_at_idx
  on public.provider_applications using btree (status, created_at desc);

create index provider_applications_reviewed_by_idx
  on public.provider_applications using btree (reviewed_by)
  where reviewed_by is not null;

create index provider_applications_linked_provider_profile_id_idx
  on public.provider_applications using btree (linked_provider_profile_id)
  where linked_provider_profile_id is not null;

revoke all on table public.provider_applications from anon, authenticated;
grant all on table public.provider_applications to service_role;

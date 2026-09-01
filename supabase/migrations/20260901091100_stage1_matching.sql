create table public.request_candidates (
  id uuid primary key default gen_random_uuid(),
  project_request_id uuid not null references public.project_requests(id) on delete cascade,
  provider_application_id uuid references public.provider_applications(id),
  linked_provider_profile_id uuid references public.profiles(id),
  curated_by uuid references public.profiles(id),
  curated_at timestamp with time zone not null default now(),
  candidate_rank smallint,
  provider_response_status text not null default 'pending',
  provider_responded_at timestamp with time zone,
  student_decision_status text not null default 'not_presented',
  student_decision_at timestamp with time zone,
  proposed_price numeric(12,2),
  agreed_price numeric(12,2),
  currency character(3) not null,
  scope_summary text,
  agreed_deadline date,
  declined_by text,
  decline_reason text,
  internal_notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint request_candidates_provider_source_check
    check (num_nonnulls(provider_application_id, linked_provider_profile_id) = 1),
  constraint request_candidates_rank_check
    check (candidate_rank is null or candidate_rank between 1 and 3),
  constraint request_candidates_provider_response_status_check
    check (provider_response_status = any (array['pending'::text, 'interested'::text, 'declined'::text, 'no_response'::text, 'withdrawn'::text])),
  constraint request_candidates_student_decision_status_check
    check (student_decision_status = any (array['not_presented'::text, 'presented'::text, 'accepted'::text, 'declined'::text])),
  constraint request_candidates_price_check
    check (
      (proposed_price is null or proposed_price >= 0)
      and (agreed_price is null or agreed_price >= 0)
    ),
  constraint request_candidates_currency_check
    check (currency ~ '^[A-Z]{3}$'),
  constraint request_candidates_declined_by_check
    check (declined_by is null or declined_by = any (array['student'::text, 'provider'::text, 'operator'::text]))
);

alter table public.request_candidates enable row level security;

create trigger request_candidates_set_updated_at
  before update on public.request_candidates
  for each row
  execute function public.set_updated_at();

create unique index request_candidates_project_rank_key
  on public.request_candidates using btree (project_request_id, candidate_rank)
  where candidate_rank is not null;

create index request_candidates_project_request_id_idx
  on public.request_candidates using btree (project_request_id);

create index request_candidates_provider_application_id_idx
  on public.request_candidates using btree (provider_application_id)
  where provider_application_id is not null;

create index request_candidates_linked_provider_profile_id_idx
  on public.request_candidates using btree (linked_provider_profile_id)
  where linked_provider_profile_id is not null;

create index request_candidates_curated_by_idx
  on public.request_candidates using btree (curated_by)
  where curated_by is not null;

create index request_candidates_provider_response_status_idx
  on public.request_candidates using btree (provider_response_status, created_at desc);

create index request_candidates_student_decision_status_idx
  on public.request_candidates using btree (student_decision_status, created_at desc);

create unique index request_candidates_project_provider_application_key
on public.request_candidates (
  project_request_id,
  provider_application_id
)
where provider_application_id is not null;

create unique index request_candidates_project_linked_provider_profile_key
on public.request_candidates (
  project_request_id,
  linked_provider_profile_id
)
where linked_provider_profile_id is not null;

revoke all on table public.request_candidates from anon, authenticated;
grant all on table public.request_candidates to service_role;

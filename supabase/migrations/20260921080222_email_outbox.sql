create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null,
  template_key text not null,
  recipient_role text not null,
  recipient_email text not null,
  provider_recipient_email text not null,
  provider_message_id text,
  related_project_request_id uuid references public.project_requests(id) on delete cascade,
  related_provider_application_id uuid references public.provider_applications(id) on delete cascade,
  related_request_candidate_id uuid references public.request_candidates(id) on delete cascade,
  related_project_engagement_id uuid references public.project_engagements(id) on delete cascade,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  last_error text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint email_outbox_dedupe_key_key unique (dedupe_key),
  constraint email_outbox_status_check
    check (status = any (array['pending'::text, 'sent'::text, 'failed'::text])),
  constraint email_outbox_attempt_count_check
    check (attempt_count >= 0),
  constraint email_outbox_recipient_role_check
    check (recipient_role = any (array['student'::text, 'provider'::text, 'admin'::text])),
  constraint email_outbox_related_record_check
    check (
      num_nonnulls(
        related_project_request_id,
        related_provider_application_id,
        related_request_candidate_id,
        related_project_engagement_id
      ) >= 1
    )
);

alter table public.email_outbox enable row level security;

create trigger email_outbox_set_updated_at
  before update on public.email_outbox
  for each row
  execute function public.set_updated_at();

create index email_outbox_status_created_at_idx
  on public.email_outbox using btree (status, created_at);

create index email_outbox_related_project_request_id_idx
  on public.email_outbox using btree (related_project_request_id)
  where related_project_request_id is not null;

create index email_outbox_related_provider_application_id_idx
  on public.email_outbox using btree (related_provider_application_id)
  where related_provider_application_id is not null;

revoke all on table public.email_outbox from anon, authenticated;
grant all on table public.email_outbox to service_role;
grant select on table public.email_outbox to authenticated;

create policy "Admins can read email outbox"
  on public.email_outbox
  for select
  to authenticated
  using (public.is_admin());

alter table public.project_requests
  add column intake_submission_id uuid;

create unique index project_requests_intake_submission_id_key
  on public.project_requests (intake_submission_id)
  where intake_submission_id is not null;

alter table public.provider_applications
  add column intake_submission_id uuid;

create unique index provider_applications_intake_submission_id_key
  on public.provider_applications (intake_submission_id)
  where intake_submission_id is not null;

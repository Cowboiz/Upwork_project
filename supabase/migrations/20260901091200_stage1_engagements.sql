create table public.project_engagements (
  id uuid primary key default gen_random_uuid(),
  request_candidate_id uuid not null references public.request_candidates(id) on delete restrict,
  agreed_amount numeric(12,2) not null,
  currency character(3) not null,
  agreed_deadline date,
  status text not null default 'agreed',
  payment_status text not null default 'not_started',
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  student_feedback text,
  provider_feedback text,
  dispute_notes text,
  repeat_intent text,
  referral_signal text,
  internal_notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint project_engagements_request_candidate_key
    unique (request_candidate_id),
  constraint project_engagements_agreed_amount_check
    check (agreed_amount >= 0),
  constraint project_engagements_currency_check
    check (currency ~ '^[A-Z]{3}$'),
  constraint project_engagements_status_check
    check (status = any (array['agreed'::text, 'in_progress'::text, 'submitted'::text, 'completed'::text, 'cancelled'::text, 'disputed'::text])),
  constraint project_engagements_payment_status_check
    check (payment_status = any (array['not_started'::text, 'agreed'::text, 'paid'::text, 'partially_paid'::text, 'refunded'::text, 'chargeback_disputed'::text])),
  constraint project_engagements_repeat_intent_check
    check (repeat_intent is null or repeat_intent = any (array['yes'::text, 'no'::text, 'unknown'::text])),
  constraint project_engagements_referral_signal_check
    check (referral_signal is null or referral_signal = any (array['yes'::text, 'no'::text, 'unknown'::text])),
  constraint project_engagements_completion_timestamp_check
    check (status <> 'completed'::text or completed_at is not null),
  constraint project_engagements_cancelled_timestamp_check
    check (status <> 'cancelled'::text or cancelled_at is not null)
);

alter table public.project_engagements enable row level security;

create trigger project_engagements_set_updated_at
  before update on public.project_engagements
  for each row
  execute function public.set_updated_at();

create index project_engagements_status_created_at_idx
  on public.project_engagements using btree (status, created_at desc);

create index project_engagements_payment_status_created_at_idx
  on public.project_engagements using btree (payment_status, created_at desc);

revoke all on table public.project_engagements from anon, authenticated;
grant all on table public.project_engagements to service_role;

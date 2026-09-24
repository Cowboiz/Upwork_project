alter table public.project_engagements
  add column deliverable_url text,
  add column deliverable_summary text,
  add column submitted_at timestamp with time zone,
  add constraint project_engagements_deliverable_url_length_check
    check (deliverable_url is null or char_length(deliverable_url) <= 2000),
  add constraint project_engagements_deliverable_summary_length_check
    check (
      deliverable_summary is null
      or char_length(deliverable_summary) <= 5000
    );

create table public.engagement_access_tokens (
  id uuid primary key default gen_random_uuid(),
  project_engagement_id uuid not null
    references public.project_engagements(id) on delete cascade,
  audience text not null,
  expires_at timestamp with time zone not null,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint engagement_access_tokens_audience_check
    check (audience = any (array['provider'::text, 'student'::text])),
  constraint engagement_access_tokens_project_engagement_audience_key
    unique (project_engagement_id, audience),
  constraint engagement_access_tokens_expires_after_created_check
    check (expires_at > created_at),
  constraint engagement_access_tokens_revoked_after_created_check
    check (revoked_at is null or revoked_at >= created_at)
);

alter table public.engagement_access_tokens enable row level security;

create index engagement_access_tokens_expires_at_idx
  on public.engagement_access_tokens using btree (expires_at);

revoke all on table public.engagement_access_tokens from public;
revoke all on table public.engagement_access_tokens from anon;
revoke all on table public.engagement_access_tokens from authenticated;
grant all on table public.engagement_access_tokens to service_role;

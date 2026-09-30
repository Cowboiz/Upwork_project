# ProjectMatch Pilot Security Launch Gate

> Phase: 5.1A.1
> Branch: `feature/phase5-free-plan-controls`
> Audited base SHA: `043a2b9a2fc2217c5911cd7fbc1fe2030db91250`
> DEV Supabase: `vuvsrpzbdrnvsctgxebb`
> Pilot Supabase: `aghkijjnvphvarnnzwne`

This document records the security-advisor triage and launch gate for moving the
current Phase 4/early Phase 5 codebase toward the Pilot Supabase environment.
It also records the accepted Supabase Free-plan security posture for the
Controlled Pilot. It is a documentation gate only unless a later verification
step finds database authorization drift.

## A. Pilot Schema Parity

Read-only migration checks were run against DEV and Pilot:

```bash
npx.cmd supabase migration list --project-ref vuvsrpzbdrnvsctgxebb
npx.cmd supabase migration list --project-ref aghkijjnvphvarnnzwne
```

Result: DEV and Pilot both report local/remote parity through:

```text
20260926090000_phase3_engagement_feedback.sql
```

Launch gate:

- PASS if Pilot migration history matches the repository through
  `20260926090000`.
- STOP if Pilot is missing a migration, has an unknown extra migration, or has
  migration order drift.

## B. SECURITY DEFINER Inventory

Current intentionally retained `SECURITY DEFINER` functions after applied
migrations:

| Function | Purpose | Direct execute model | Classification |
| --- | --- | --- | --- |
| `public.handle_new_user()` | Auth trigger creates a profile row for a new Supabase user. | Direct execute revoked from `PUBLIC`, `anon`, `authenticated`, and `service_role`; trigger remains. | Accept, trigger-only. |
| `public.is_admin()` | Boolean helper for admin RLS and server-side admin checks. | `authenticated`, `service_role`; `anon` revoked. | Accept with monitoring. |
| `public.record_project_request_workflow_event()` | Trigger-only workflow event writer. | Direct execute revoked from app roles and service role. | Accept, trigger-only. |
| `public.record_provider_application_workflow_event()` | Trigger-only workflow event writer. | Direct execute revoked from app roles and service role. | Accept, trigger-only. |
| `public.record_request_candidate_workflow_event()` | Trigger-only workflow event writer. | Direct execute revoked from app roles and service role. | Accept, trigger-only. |
| `public.record_project_engagement_workflow_event()` | Trigger-only workflow event writer. | Direct execute revoked from app roles and service role. | Accept, trigger-only. |
| `public.mark_request_candidate_contacted(uuid, uuid)` | Authenticated admin RPC to record first provider contact. | `authenticated`; internal `public.is_admin()` check. | Accept with monitoring. |
| `public.respond_to_request_candidate_invitation(uuid, text, text)` | Service-role token response RPC for provider public flow. | `service_role` only. | Accept. |
| `public.respond_to_presented_candidate(uuid, text, text)` | Service-role token response RPC for student decision public flow. | `service_role` only. | Accept. |
| `public.rls_auto_enable()` | Event trigger helper that enables RLS on future public tables. | Direct execute revoked from `PUBLIC`, `anon`, and `authenticated`. | Accept, event-trigger-only. |
| `public.start_engagement_work(uuid)` | Service-role token RPC for provider engagement start. | `service_role` only. | Accept. |
| `public.submit_engagement_deliverable(uuid, text, text)` | Service-role token RPC for provider deliverable submission. | `service_role` only. | Accept. |
| `public.complete_engagement(uuid)` | Service-role token RPC for student completion. | `service_role` only. | Accept. |
| `public.dispute_engagement(uuid, text)` | Service-role token RPC for student dispute. | `service_role` only. | Accept. |
| `public.check_rate_limit(text, text, integer, integer)` | Service-role rate-limit bucket mutation RPC. | `service_role` only. | Accept. |
| `public.submit_engagement_feedback(uuid, integer, text)` | Service-role token RPC for student feedback. | `service_role` only. | Accept. |

Obsolete legacy functions from the initial remote schema export,
`public.accept_proposal(uuid)` and `public.handle_new_proposal()`, are dropped by
`20260901091300_security_hardening.sql` and are not part of the current surface.

## C. Advisor Triage

### `public.is_admin()`

Evidence:

- Defined as `SECURITY DEFINER`, `stable`, `set search_path = ''`.
- Checks `public.profiles.id = auth.uid()` and `public.profiles.role = 'admin'`.
- Used by admin RLS policies on private operational tables.
- ACL hardened by `20260925090000_security_definer_function_acl_hardening.sql`
  to revoke `anon` while keeping `authenticated` and `service_role`.

Classification: accepted advisor warning.

Rationale: the function returns only a boolean and is required for authenticated
admin RLS checks. Keeping `authenticated` execute is product behavior; removing
it would break admin login and admin RLS policy evaluation.

Launch gate:

- PASS if `anon` has no execute privilege and the function keeps
  `search_path = ''`.
- STOP if `anon` can execute it or if its implementation returns private data.

### `public.mark_request_candidate_contacted(uuid, uuid)`

Evidence:

- Defined as `SECURITY DEFINER` with `set search_path = ''`.
- Callable by `authenticated` only.
- First statement enforces `if not public.is_admin() then raise exception
  'admin_required'; end if;`.
- Locks the candidate row, validates request/candidate ownership, requires
  `provider_response_status = 'pending'`, and writes only the
  `provider_contacted` workflow event.
- The admin UI calls it from the authenticated SSR client after `requireAdmin()`.

Classification: accepted advisor warning.

Rationale: the function is an intentional narrow admin RPC. Non-admin
authenticated users can technically call the RPC name, but the internal
`public.is_admin()` guard prevents privilege escalation before any business
mutation.

Launch gate:

- PASS if `authenticated` is the only app role with execute and the
  `public.is_admin()` guard remains.
- STOP if `anon` can execute it, if the admin guard is removed, or if it accepts
  client-provided actor/timestamp fields.

### Auth Leaked-Password Protection

Pilot advisor reported leaked-password protection disabled in Supabase Auth. The
Controlled Pilot intentionally remains on the Supabase Free plan, and native
"Prevent use of leaked passwords" protection is available only on Pro and
above. The advisor is expected to continue reporting
`auth_leaked_password_protection` while Pilot stays on Free.

Classification: accepted platform limitation for Controlled Pilot.

This is not an unresolved repository security defect and is not an automatic
launch blocker while the project remains in a narrow controlled-pilot posture.
It becomes a recommended native platform control when the project moves to
Supabase Pro.

Required compensating controls before Pilot launch:

- Supabase Auth minimum password length must be at least 12 characters.
- Configure the strongest available Supabase password character requirements.
- Admin/operator passwords must be unique, randomly generated, and not reused
  from any other service.
- Admin/operators must use a password manager.
- Public Supabase Auth signup should be disabled when not required for the
  controlled pilot.
- Existing admin login rate limiting remains required.
- Only known admin/operator accounts should exist.
- Current RLS and function ACL protections remain required.
- No service-role credential may be exposed client-side.

Do not claim leaked-password protection is enabled unless it has been
independently verified in the Supabase dashboard or management API.

Custom HaveIBeenPwned password checking is intentionally deferred. The current
password-authenticated surface is narrow, custom auth-security code would add
maintenance risk, and strong password policy plus restricted account creation
plus rate limiting are sufficient compensating controls for the Controlled Pilot
posture. Reconsider this if the project remains on Free while password
authentication expands.

MFA is a future hardening option, not a currently enforced control. Supabase MFA
requires enrollment, challenge handling, and enforcement in the application; do
not simply enable a dashboard option and claim admin MFA protection.

### RLS Enabled With No Policies

Expected no-policy private tables include service-role-only operational tables:

- `public.provider_response_tokens`
- `public.student_decision_tokens`
- `public.engagement_access_tokens`
- `public.engagement_feedback`
- `public.rate_limit_buckets`

Classification: accepted informational findings when table privileges are also
revoked from `PUBLIC`, `anon`, and `authenticated`.

Rationale: these tables are not browser-readable data surfaces. They are private
server-side storage accessed through service-role helpers/RPCs. No permissive
RLS policy is intentionally created.

Launch gate:

- PASS if no-policy tables revoke all table privileges from `PUBLIC`, `anon`,
  and `authenticated`.
- STOP if an app role has direct table DML/read access without a reviewed RLS
  policy.

## D. RLS / No-Policy Explanation

ProjectMatch uses two patterns:

1. Admin-operable tables grant app-role table privileges but require admin RLS
   policies using `public.is_admin()`.
2. Private system tables grant no app-role access and are accessed only through
   server-side service-role code or trigger functions.

The second pattern naturally appears in Supabase Advisor as "RLS enabled, no
policies." That finding is acceptable only when direct privileges are revoked.
It is not acceptable for tables intended to be queried directly from
authenticated browser sessions.

## E. Auth Configuration Checks

Before launch, verify in the Pilot Supabase dashboard:

- Minimum password length is at least 12 characters.
- The strongest available password character requirements are configured.
- Admin/operator users are known and intentional.
- Admin/operator passwords are unique, randomly generated, and stored in a
  password manager.
- Public sign-up behavior matches the intended Pilot posture.
- Native leaked-password protection is not required on Free, but should be
  enabled if the project upgrades to Pro.
- No service-role key is exposed to browser or GitHub browser-smoke CI.

Do not record secret values in this repository.

## F. Free-Plan Operations Notes

Controlled Pilot may run on Supabase Free with documented compensating controls.
Before storing irreplaceable or materially costly data, review backup strategy,
availability expectations, and project auto-pause characteristics.

Free-plan limitations to keep visible during Pilot:

- Do not rely on native Pro leaked-password protection.
- Review database backup strategy before storing irreplaceable data.
- Review project availability and auto-pause characteristics before moving from
  controlled pilot to regular production usage.

Do not implement backup automation as part of this gate.

## G. When to Upgrade to Supabase Pro

Supabase Pro is not currently required for the Controlled Pilot. Upgrade should
be revisited when one or more of these triggers appears:

- Pilot becomes regular production usage.
- Losing database data would become materially costly.
- Automatic backups are operationally required.
- Project auto-pause is no longer acceptable.
- More admin/operator accounts are introduced.
- The password-authenticated user population grows.
- Longer operational log retention is required.
- Free-plan limits become operationally relevant.

Native leaked-password protection should be enabled after a Pro upgrade.

## H. Pilot Launch Stop Conditions

Do not launch Pilot if any of these are true:

- Pilot migration history does not match the repository through
  `20260926090000`.
- Any private table has direct `anon` access.
- Any service-role-only table has direct `authenticated` read/write access.
- `public.is_admin()` is executable by `anon`.
- `public.mark_request_candidate_contacted(uuid, uuid)` is executable by `anon`.
- `public.mark_request_candidate_contacted(uuid, uuid)` no longer checks
  `public.is_admin()` internally.
- Trigger-only workflow helper functions are directly executable by app roles.
- Public token RPCs are executable by `anon` or `authenticated` instead of only
  by service-role server code.
- Weak minimum password policy is configured.
- Public signup is unintentionally open.
- Admin accounts use shared, reused, or weak passwords.
- Admin-login rate limiting is removed or broken.
- Anonymous or authenticated access expands unexpectedly.
- Production/Pilot environment variables are missing required server secrets.
- Quality Gate or browser smoke fails on the release candidate.

## I. Verification Procedure

Read-only migration parity:

```bash
npx.cmd supabase migration list --project-ref vuvsrpzbdrnvsctgxebb
npx.cmd supabase migration list --project-ref aghkijjnvphvarnnzwne
```

Pilot SQL checks to run in the Supabase SQL editor or psql as an operator:

```sql
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args,
  p.prosecdef as security_definer,
  p.proconfig as config,
  has_function_privilege('anon', p.oid, 'execute') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'execute') as service_role_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'handle_new_user',
    'is_admin',
    'record_project_request_workflow_event',
    'record_provider_application_workflow_event',
    'record_request_candidate_workflow_event',
    'record_project_engagement_workflow_event',
    'mark_request_candidate_contacted',
    'respond_to_request_candidate_invitation',
    'respond_to_presented_candidate',
    'rls_auto_enable',
    'start_engagement_work',
    'submit_engagement_deliverable',
    'complete_engagement',
    'dispute_engagement',
    'check_rate_limit',
    'submit_engagement_feedback'
  )
order by p.proname, args;
```

Expected:

- `is_admin`: `authenticated_execute = true`, `service_role_execute = true`,
  `anon_execute = false`.
- `mark_request_candidate_contacted`: `authenticated_execute = true`,
  `anon_execute = false`.
- Service token RPCs and `check_rate_limit`: `service_role_execute = true`,
  `anon_execute = false`, `authenticated_execute = false`.
- Trigger/event helpers: no direct app-role execution.
- Security-sensitive definer functions use an explicit safe search path.

Table privilege check:

```sql
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity,
  has_table_privilege('anon', c.oid, 'select') as anon_select,
  has_table_privilege('authenticated', c.oid, 'select') as authenticated_select,
  has_table_privilege('anon', c.oid, 'insert') as anon_insert,
  has_table_privilege('anon', c.oid, 'update') as anon_update,
  has_table_privilege('anon', c.oid, 'delete') as anon_delete,
  has_table_privilege('authenticated', c.oid, 'insert') as authenticated_insert,
  has_table_privilege('authenticated', c.oid, 'update') as authenticated_update,
  has_table_privilege('authenticated', c.oid, 'delete') as authenticated_delete
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'provider_response_tokens',
    'student_decision_tokens',
    'engagement_access_tokens',
    'engagement_feedback',
    'rate_limit_buckets'
  )
order by c.relname;
```

Expected:

- RLS enabled.
- `anon_select = false`.
- `authenticated_select = false`.
- `anon_insert/update/delete = false`.
- `authenticated_insert/update/delete = false`.

Function implementation spot checks:

```sql
select pg_get_functiondef('public.is_admin()'::regprocedure);
select pg_get_functiondef('public.mark_request_candidate_contacted(uuid, uuid)'::regprocedure);
```

Expected:

- `is_admin()` checks the caller via `auth.uid()` against admin profile role.
- `mark_request_candidate_contacted()` includes `if not public.is_admin()`.
- Neither function returns contact values, tokens, or private row data.

No mutation is required for these verification queries.

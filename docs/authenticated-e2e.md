# Authenticated Lifecycle E2E

Phase 5.4A adds a DEV-only Playwright regression gate for the authenticated ProjectMatch lifecycle. It uses real Supabase Auth sessions for student, provider, and admin accounts, while privileged fixture setup stays in the Playwright Node process.

## Scope

- Accepted lifecycle: provider response, student acceptance, admin engagement creation, provider start, provider deliverable submission, student completion, and student feedback.
- Dispute lifecycle: accepted engagement, provider start and submit, then student dispute.
- Wrong-role API checks for provider response and student decision.
- Engagement action authorization checks for Phase 5.3C authenticated RPCs.
- Public smoke coverage remains in `e2e/public-smoke.spec.ts`.

The tests do not add database migrations, do not touch Pilot or Production, and do not expose the Supabase service key to browser code.

## Required DEV Configuration

Set these variables before running authenticated E2E:

- `E2E_SUPABASE_URL`
- `E2E_SUPABASE_PUBLISHABLE_KEY`
- `E2E_SUPABASE_SECRET_KEY`
- `E2E_SUPABASE_SERVICE_ROLE_KEY`
- `E2E_STUDENT_EMAIL`
- `E2E_STUDENT_PASSWORD`
- `E2E_PROVIDER_EMAIL`
- `E2E_PROVIDER_PASSWORD`
- `E2E_ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD`

The Next.js browser process also needs:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `RATE_LIMIT_HASH_SECRET`

The helper falls back from `E2E_SUPABASE_URL` and `E2E_SUPABASE_PUBLISHABLE_KEY` to the public Next.js variable names for local convenience.

`E2E_SUPABASE_SECRET_KEY` is the DEV modern `sb_secret_*` key used by Playwright fixture/admin setup tooling. It is not passed to the browser.

`E2E_SUPABASE_SERVICE_ROLE_KEY` is the DEV legacy service-role JWT. In the authenticated CI job only, it is mapped to `SUPABASE_SECRET_KEY` for the local Next.js server because the real `/login` action invokes server-side rate limiting, and rate-limit checks create a Supabase admin client. It must not be exposed as a `NEXT_PUBLIC_*` variable.

`RATE_LIMIT_HASH_SECRET` is generated ephemerally inside the authenticated CI job and appended to `GITHUB_ENV` before Playwright runs. It is not a repository secret, is not committed, and is not derived from any Supabase key.

## Hard DEV Guard

The authenticated suite is hard-coded to fail closed unless the configured Supabase URL targets ProjectMatch DEV:

```text
project ref: vuvsrpzbdrnvsctgxebb
vuvsrpzbdrnvsctgxebb.supabase.co
```

`E2E_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`, when both are present, must resolve to that same DEV project hostname. Any other Supabase project, Pilot, Production, localhost, or malformed URL is rejected before a service-role client is created or any account/database mutation can occur.

## Commands

Run the existing browser smoke gate:

```bash
npm run test:e2e
```

Run the authenticated lifecycle regression gate:

```bash
npm run test:e2e:authenticated
```

Run every Playwright spec:

```bash
npm run test:e2e:all
```

## Fixture Behavior

The authenticated suite creates isolated DEV fixture rows with an `E2E_AUTH_LIFECYCLE` marker and deletes those rows at the end of each test. It may create or update the configured Supabase Auth test users and their matching `profiles` rows so the credentials and roles are deterministic.

Configured admin, student, and provider emails must be dedicated E2E identities and must be distinct. The suite marks managed Auth users with:

```text
projectmatch_e2e_fixture = E2E_AUTH_LIFECYCLE
```

If a configured email already belongs to an unmarked Auth user, the suite fails and does not change that user's password, profile, or role. Existing marked fixture users may have credentials/profile roles reset by the suite. A marked auxiliary student account is derived from `E2E_STUDENT_EMAIL` for same-role non-owner authorization checks.

The service key is used only by Playwright setup/cleanup code. Browser actions authenticate through `/login` and use the same app routes and server actions as real users.

## CI

The normal `browser-smoke` job continues to run public smoke tests.

The `authenticated-browser-regression` job is guarded by:

```text
vars.AUTHENTICATED_E2E_ENABLED == 'true'
```

When enabled, missing required secrets fail the job during the validation step. When the variable is absent or not `true`, the authenticated job is skipped rather than reported as a passing executed gate.

The authenticated CI job keeps two privileged Supabase values separate:

- `E2E_SUPABASE_SECRET_KEY`: modern DEV `sb_secret_*` key for fixture setup and cleanup.
- `E2E_SUPABASE_SERVICE_ROLE_KEY`: legacy DEV service-role JWT mapped only to `SUPABASE_SECRET_KEY` for the local application server.

The job generates a fresh `RATE_LIMIT_HASH_SECRET` for each run so login rate-limit buckets stay isolated across CI executions.

Leave `AUTHENTICATED_E2E_ENABLED` unset or not `true` until an operator has configured the DEV-only secrets above and completed a real successful DEV run.

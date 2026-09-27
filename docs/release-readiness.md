# ProjectMatch Production Release Readiness

This checklist is for the future Phase 4 production release. It records the
current audit state only. It does not mark the release complete.

## A. Release Scope

- Release source: `dev`
- Release target: `main`
- Audited `dev` SHA: `706a7e5c5b777154daf1b2bb03f223fd7e3a6bb4`
- Audited `main` SHA: `56ac961e476954eeb5ff5cf61a069d25cb0ff076`
- Phase 4 features being released:
  - Vitest unit test foundation.
  - GitHub Quality Gate.
  - Playwright public browser smoke tests.
  - Dependency-free `/api/health`.
  - Supabase-backed `/api/readiness`.
  - Next.js server error instrumentation.
  - Safe route and global error boundaries.
  - Structured operational runtime logging.
  - Operations runbook.

## B. Pre-Merge Checks

- [ ] `dev` Quality Gate is green.
- [ ] `dev` browser-smoke is green.
- [ ] Unit tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Build passes.
- [ ] Playwright passes.
- [ ] `git diff --check` passes.
- [ ] `dev` has no unexpected divergence from `main`.
- [ ] No unresolved migration delta exists.
- [ ] Production environment variable names are reviewed.
- [ ] `docs/operations-runbook.md` exists.

## C. Production Environment Checklist

Set and review variable names only. Never record values in this document.

Public client config:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Required server secrets/config:

- `SUPABASE_SECRET_KEY`
- `APP_BASE_URL`
- `PROVIDER_RESPONSE_TOKEN_SECRET`
- `STUDENT_DECISION_TOKEN_SECRET`
- `ENGAGEMENT_ACCESS_TOKEN_SECRET`
- `RATE_LIMIT_HASH_SECRET`

Email configuration:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `ADMIN_NOTIFICATION_EMAIL`
- `EMAIL_ENABLED`
- `EMAIL_REPLY_TO`

Optional/development-only:

- `EMAIL_DEV_OVERRIDE_TO`

Vercel platform-provided variables used by the app in preview/runtime behavior:

- `VERCEL`
- `VERCEL_ENV`
- `VERCEL_BRANCH_URL`
- `VERCEL_URL`

Production notes:

- `APP_BASE_URL` must point to the production application base URL after release.
- `EMAIL_ENABLED` is an explicit operator decision. Do not assume production
  email is enabled unless the production environment has been checked.
- GitHub repository variables `E2E_SUPABASE_URL` and
  `E2E_SUPABASE_PUBLISHABLE_KEY` are CI browser-smoke configuration only. They
  are not production application environment variables.
- Do not add `SUPABASE_SECRET_KEY`, `RATE_LIMIT_HASH_SECRET`, or other server
  secrets to browser-smoke CI.

## D. Database Release Requirement

Phase 4 itself has no new Supabase migration to apply. Repository evidence:
`git diff --name-only origin/main...origin/dev -- supabase/migrations/`
returned no files during this audit.

This does not prove production database health. It only means Phase 4 introduces
no new migration requirement.

## E. Release Procedure

Do not execute this procedure as part of this audit. Use it later for the
actual release.

1. Confirm `dev` CI is green.
2. Confirm production environment variable names/configuration are present.
3. Confirm no pending required database migration.
4. Merge `dev` into `main` with a merge commit.
5. Push `main`.
6. Watch the `main` Quality Gate.
7. Wait for the production deployment to finish.
8. Verify `GET /api/health`.
9. Verify `GET /api/readiness`.
10. Smoke-test public pages.
11. Verify the admin login page renders.
12. Review Vercel Runtime Logs for unexpected error events.
13. Verify no obvious regression in the admin Ops page.
14. Record the released `main` SHA.
15. Tag the release only after verification.

## F. Production Smoke Checklist

Public safe checks:

- `/`
- `/request`
- `/provider/apply`
- `/admin/login`
- `/api/health`
- `/api/readiness`

Engagement token routes:

- Do not use real bearer tokens in public smoke checks.
- Do not submit fake actions against real production workflows.
- The current invalid-token smoke behavior may be checked only in the same
  non-destructive way used by Playwright.

Do not submit forms in production merely for smoke testing unless a later
release procedure explicitly authorizes controlled test data.

## G. Runtime Log Review

Use `docs/operations-runbook.md` for event meanings and first response steps.

Review Vercel Runtime Logs for unexpected:

- `next_request_error`
- `dependency_readiness_failed`
- `rate_limit_check_failed`
- `intake_operation_failed`
- `email_delivery_failed`
- `email_pipeline_failed`

Do not treat `rate_limit_blocked` alone as an outage.

## H. Rollback Plan

Current production/main baseline SHA at audit time:
`56ac961e476954eeb5ff5cf61a069d25cb0ff076`

The operator must re-check `main` immediately before the actual release because
the baseline may change.

Preferred source-code rollback after a bad merge:

1. Identify the Phase 4 merge commit on `main`.
2. Revert that merge commit.
3. Push the revert through normal CI/deployment.

Example form only:

```bash
git revert -m 1 <PHASE_4_MERGE_COMMIT>
```

Do not run this during release preparation unless a rollback is actually
needed. Never force-push `main`.

Platform redeploy/rollback may be used for emergency recovery if appropriate,
but source control must ultimately reflect the intended state.

## I. Release Stop Conditions

Do not release if:

- Quality Gate fails.
- Browser-smoke fails.
- Readiness fails before release for the target environment.
- Required production environment configuration is missing.
- An unexpected migration appears.
- `dev` is behind or diverged from `main` unexpectedly.
- Build fails.
- Security/privacy review finds sensitive logging.
- Production deployment reports build/runtime failure.

# ProjectMatch Operations Runbook

This runbook covers the current lightweight operational checks and runtime log
signals for ProjectMatch. Runtime logs must stay safe for shared operational
review and must not contain user content, secrets, tokens, or raw provider
errors.

## Service Checks

### Liveness

Request:

```text
GET /api/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "projectmatch"
}
```

Meaning: the Next.js application can answer requests. This endpoint is
dependency-free and does not check Supabase.

### Readiness

Request:

```text
GET /api/readiness
```

Expected healthy response:

```json
{
  "status": "ready",
  "service": "projectmatch",
  "dependencies": {
    "supabase": "ok"
  }
}
```

Expected dependency problem response:

```json
{
  "status": "not_ready",
  "service": "projectmatch",
  "dependencies": {
    "supabase": "unavailable"
  }
}
```

Meaning: the application can reach the required Supabase database dependency.
This endpoint performs a bounded read-only check.

## Runtime Log Event Catalog

All events are one-line JSON entries in Vercel Runtime Logs.

### `next_request_error`

Severity: `error`

Meaning: Next.js reported an unhandled server request error through
`onRequestError`.

First check: inspect `routePath`, `routeType`, `routerKind`, and `digest` in
Vercel Runtime Logs. Use the digest to correlate with the failing request in
the deployment logs.

### `dependency_readiness_failed`

Severity: `error`

Meaning: `/api/readiness` could not complete its Supabase dependency check.

First check: verify Supabase availability and server-side environment
configuration for the deployment.

### `rate_limit_blocked`

Severity: `warn`

Meaning: a configured rate limit denied a request.

First check: inspect the `action` and `retryAfterSeconds`. This is normally a
control signal, not an outage.

### `rate_limit_check_failed`

Severity: `error`

Meaning: the rate-limit backend check failed before the app could determine
allow or deny.

First check: call `/api/readiness`, then check Supabase/RPC availability and
recent database errors.

### `intake_operation_failed`

Severity: `error`

Meaning: a public intake workflow could not continue due to an operational
problem after validation had already passed.

First check: inspect `intake` and `stage`. For `rate_limit`, check the
rate-limit backend. For `insert`, check Supabase table availability and recent
database errors. For `idempotency_lookup`, check whether duplicate-submit
recovery is unable to read the existing row.

### `email_delivery_failed`

Severity: `error`

Meaning: an email outbox delivery attempt failed or an email outbox row could
not be created for a notification attempt.

First check: inspect `/admin/ops` email delivery state, the failed outbox row,
and the email provider status. The runtime log intentionally contains only
`templateKey`, `recipientRole`, `phase`, and possibly `attemptCount`.

### `email_pipeline_failed`

Severity: `error`

Meaning: a notification helper failed before normal outbox delivery state could
fully represent the failure.

First check: inspect the related server execution in Runtime Logs, then review
email outbox state in `/admin/ops`.

## Incident Triage

### Health Fails

Likely area: deployment, runtime, routing, or platform issue.

First actions:

1. Check Vercel deployment status.
2. Review recent Runtime Logs for build/runtime errors.
3. Verify the deployment URL is routing to the expected project.

### Health Works, Readiness Fails

Likely area: Supabase dependency, database network path, or server-side
configuration.

First actions:

1. Check Supabase project status.
2. Confirm required server-side Supabase environment variables are present in
   the deployment.
3. Review Runtime Logs for `dependency_readiness_failed` and
   `rate_limit_check_failed`.

### `next_request_error` Rises

Likely area: unhandled application error.

First actions:

1. Group by `routePath`.
2. Inspect `routerKind`, `routeType`, and `digest`.
3. Reproduce on the matching route without using real user data.

### `rate_limit_check_failed`

Likely area: rate-limit RPC or Supabase connectivity.

First actions:

1. Call `/api/readiness`.
2. Check Supabase availability.
3. Check whether the `check_rate_limit` RPC is available in the target
   environment.

### `rate_limit_blocked`

Likely area: expected abuse or repeated submissions.

First actions:

1. Review `action` and `retryAfterSeconds`.
2. Treat as a control signal unless volume is unusually high or legitimate
   users report being blocked.

### `email_delivery_failed`

Likely area: email provider, email configuration, or outbox send attempt.

First actions:

1. Open `/admin/ops`.
2. Review failed email rows and sanitized `last_error`.
3. Check provider status and email environment configuration.
4. Use the admin retry action only when the row is eligible.

### `email_pipeline_failed`

Likely area: notification preparation before delivery attempt.

First actions:

1. Review the `notification` field.
2. Inspect nearby Runtime Logs for the same server execution.
3. Review `/admin/ops` email outbox state for related failed or missing rows.

## Email Recovery

ProjectMatch currently exposes email delivery health in `/admin/ops`.

Existing recovery workflow:

1. Sign in as an admin.
2. Open `/admin/ops`.
3. Review the Email Delivery section.
4. For a failed email row, use the displayed retry control.
5. The retry uses the existing private outbox row and does not create a new
   notification type.

If a retry reports `sent`, the row was sent. If it reports another state, use
the displayed admin message and sanitized outbox error to decide whether to
retry again later.

## Privacy Rules

Runtime logs must never contain:

- email addresses, phone numbers, names, or contact handles
- IP addresses or raw rate-limit identifiers
- rate-limit identifier hashes
- authorization headers or cookies
- bearer tokens or tokenized URLs
- form bodies or project content
- feedback text
- raw Supabase, database, Resend, or provider errors
- email subject or body content

Use database records and admin-only pages for detailed operational state. Use
runtime logs only for safe signals and routing to the next inspection point.

## Release Verification Checklist

After future releases:

1. Confirm Quality Gate is green.
2. Confirm browser-smoke is green.
3. Check `GET /api/health` returns `200`.
4. Check `GET /api/readiness` returns `200`.
5. Review recent Vercel Runtime Logs for unexpected `error` events.

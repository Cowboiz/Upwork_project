# ProjectMatch Controlled Pilot Rehearsal

Date: 2026-09-30

Environment: Pilot preview

Source branch: `feature/phase5-pilot-rehearsal`

Source SHA tested: `5571203b4af1662c82e1d22dfdf2bd22d39400b2`

Base `origin/dev` SHA: `54e42e3cd6bc918117dd0e560d14eb43f865740b`

Rehearsal marker reserved: `PILOT-REHEARSAL-20260930-5571203`

Pilot preview deployment inspected:

- Project: `upwork-project`
- Deployment: `dpl_vc2XzWhwAfgsrT14JgfcDAydFbLm`
- URL: `https://upwork-project-cwao4tgx3-ciel08-cowboiz10.vercel.app`
- Alias: `https://upwork-project-git-feature-phase5-pilot-5b40e1-ciel08-cowboiz10.vercel.app`
- Deployment state: `READY`
- Deployment target: `preview`
- Deployment branch: `feature/phase5-pilot-rehearsal`
- Deployment SHA: `5571203b4af1662c82e1d22dfdf2bd22d39400b2`

## Result

Status: BLOCKED before creating rehearsal records.

The original 2026-09-27 blocked result treated unauthenticated `302 Found`
responses as health/readiness failures. That interpretation is obsolete:
deployment protection can legitimately return Vercel SSO redirects to ordinary
unauthenticated requests.

The current 2026-09-30 continuation used authenticated Vercel access against
the feature preview deployment. Application health passed, but readiness failed
because the Supabase dependency reported unavailable. Per the rehearsal safety
rules, the synthetic lifecycle stopped before submitting the first project
request or provider application.

No rehearsal project request, provider application, candidate, engagement,
feedback, token, workflow event, or email outbox row was created.

## Precondition Checks

| Check | Result | Notes |
| --- | --- | --- |
| Repository branch | PASS | Current branch is `feature/phase5-pilot-rehearsal`. |
| Source SHA | PASS | `HEAD` is `5571203b4af1662c82e1d22dfdf2bd22d39400b2`. |
| Base SHA | PASS | `origin/dev` is `54e42e3cd6bc918117dd0e560d14eb43f865740b`. |
| Preview deployment | PASS | Deployment is `READY`, `preview`, and built from the feature branch SHA. |
| Production untouched | PASS | No production deployment, env, schema, or data mutation was performed. |
| Application health | PASS | Authenticated Vercel CLI request returned `{"status":"ok","service":"projectmatch"}`. |
| Application readiness | FAIL | Authenticated Vercel CLI request returned `{"status":"not_ready","service":"projectmatch","dependencies":{"supabase":"unavailable"}}`. |
| Pilot Supabase dependency | FAIL | Readiness reported Supabase unavailable. |
| Controlled test contacts | NOT RUN | Stopped before creating data or triggering email. |
| Admin login | NOT RUN | Stopped because readiness failed. |
| Admin Ops | NOT RUN | Stopped because readiness failed. |
| Password posture | NOT RECHECKED | Not rechecked in this run because readiness failed first. |
| Public Auth signup posture | NOT RUN | Stopped because readiness failed. |

## Inspected Current Workflow

The workflow was rechecked against the current source before attempting any
Pilot data creation.

1. Request intake uses `/request`, `submitProjectRequest`, and the `Submit project request` button.
2. Provider intake uses `/provider/apply`, `submitProviderApplication`, and the `Submit provider application` button.
3. Admin login uses `/admin/login` and `loginAdmin`.
4. Request review actions include `markReviewed`, `markIntegrityClear`, `markNeedsClarification`, and `rejectRequest`.
5. Provider review uses `updateProviderStatus`.
6. Matching uses `addCandidate`, `markCandidateContacted`, `presentCandidate`, and candidate detail/decision actions.
7. Provider response uses `/provider/respond` and `submitProviderInvitationResponse`.
8. Student decision uses `/request/status` and `submitStudentDecision`.
9. Engagement creation uses `createEngagement`.
10. Provider engagement delivery uses `/engagement/provider`, `startProviderEngagementWork`, and `submitProviderEngagementDeliverable`.
11. Student completion and feedback use `/engagement/status`, `completeStudentEngagement`, and `submitStudentEngagementFeedback`.

`src/lib/workflow/` does not exist in the current repository.

## Lifecycle Stage Results

| Stage | Result |
| --- | --- |
| Project request submitted | NOT RUN |
| Provider application submitted | NOT RUN |
| Admin request review | NOT RUN |
| Provider review | NOT RUN |
| Add provider as candidate | NOT RUN |
| Mark candidate contacted | NOT RUN |
| Provider response | NOT RUN |
| Present candidate to student | NOT RUN |
| Student decision | NOT RUN |
| Engagement created | NOT RUN |
| Provider starts work | NOT RUN |
| Provider submits deliverable | NOT RUN |
| Student confirms completion | NOT RUN |
| Student submits feedback | NOT RUN |
| Request timeline verification | NOT RUN |
| Provider timeline verification | NOT RUN |
| Admin Ops/email verification | NOT RUN |

## Email And Outbox

Not evaluated. The run stopped before any data submission or email-triggering
workflow step. No recipient address, magic link, token URL, provider message ID,
or email body was accessed or documented.

## Authorization Negative Checks

Not run. Provider response, student decision, and engagement-token flows were
not reached because readiness failed before synthetic data creation.

## Workflow And Database Integrity

No rehearsal workflow events or business rows were intentionally created. There
were no synthetic records to count, mutate, or clean up.

Non-sensitive record IDs:

- Request ID: none
- Provider application ID: none
- Candidate ID: none
- Engagement ID: none
- Feedback ID: none

## Health And Readiness

Authenticated Vercel access was used so deployment protection did not mask the
application result.

- `GET /api/health`: PASS, returned `{"status":"ok","service":"projectmatch"}`.
- `GET /api/readiness`: FAIL, returned `{"status":"not_ready","service":"projectmatch","dependencies":{"supabase":"unavailable"}}`.

The earlier unauthenticated `302 Found` responses are now classified as expected
Vercel Deployment Protection behavior, not an application endpoint failure.

## Runtime Log Review

Runtime logs for deployment `dpl_vc2XzWhwAfgsrT14JgfcDAydFbLm` showed the
readiness failure:

- `GET /api/readiness` returned `503`.
- Sanitized application log event: `dependency_readiness_failed` with
  dependency `supabase`.

No lifecycle server actions were executed.

## Free-Plan Security Context

Phase 5.1A.1 documents the accepted Supabase Free-plan posture for the
Controlled Pilot. Native Supabase leaked-password protection remains unavailable
on Free and is not treated as a rehearsal failure by itself.

Documented compensating controls include:

- Supabase Auth minimum password length at least 12 characters.
- Strongest available password character requirements.
- Unique randomly generated admin/operator passwords stored in a password manager.
- Public signup disabled when not required for the Pilot posture.
- Admin login rate limiting.

The repository does not claim these controls are equivalent to Supabase's paid
leaked-password protection.

## Security And Token Privacy

No bearer-token URLs, admin passwords, cookies, email addresses, phone numbers,
service-role keys, secret values, magic links, or other users' data were written
into this document.

## Cleanup Status

No cleanup required. No rehearsal data was created.

## Known Deviations

The controlled lifecycle rehearsal could not begin because the current feature
preview readiness check reported the Supabase dependency as unavailable.

## Launch Recommendation

Do not invite real Pilot users yet. First restore readiness for the current
feature preview deployment so `/api/readiness` reports Supabase `ok`, then rerun
the controlled Pilot rehearsal from the beginning with controlled test contacts.

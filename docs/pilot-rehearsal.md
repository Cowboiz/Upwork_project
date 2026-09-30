# ProjectMatch Controlled Pilot Rehearsal

Date: 2026-09-30

Environment: Pilot preview

Source branch: `feature/phase5-pilot-rehearsal`

Source SHA tested: `dd31345b082b39a65ac6237ac205d6f48f102c4f`

Base `origin/dev` SHA: `54e42e3cd6bc918117dd0e560d14eb43f865740b`

Rehearsal marker reserved: `PILOT-REHEARSAL-20260930-DD31345`

Pilot preview deployment inspected:

- Project: `upwork-project`
- Deployment: `dpl_6N7jCPsfktpJr8iR4jVYAXmBo7uj`
- URL: `https://upwork-project-cro9old0j-ciel08-cowboiz10.vercel.app`
- Alias: `https://upwork-project-git-feature-phase5-pilot-5b40e1-ciel08-cowboiz10.vercel.app`
- Deployment state: `READY`
- Deployment target: `preview`
- Deployment branch: `feature/phase5-pilot-rehearsal`
- Deployment SHA: `dd31345b082b39a65ac6237ac205d6f48f102c4f`

## Result

Status: BLOCKED.

The original 2026-09-27 blocked result treated unauthenticated `302 Found`
responses as health/readiness failures. That interpretation is obsolete:
deployment protection can legitimately return Vercel SSO redirects to ordinary
unauthenticated requests.

The 2026-09-30 continuation used authenticated Vercel access against the
feature preview deployment. Application health passed. A later controlled Pilot
run reached the matching and student-decision lifecycle and exposed a
match-state blocker.

Confirmed Pilot defect:

- Request ID: `f53c31c8-7c72-4524-8a97-d5de652a1471`
- Accepted candidate ID: `3a5c7d4f-59ce-4952-bb3c-5dcb5402fbe2`

Observed invalid state:

- The accepted candidate still exists.
- The request regressed from `matched` to `reviewed`.
- `integrity_review_status` remains `clear`.
- Engagement creation fails because the request is no longer `matched`.

Root cause confirmed in current `main`/`dev` code: admin review actions can
mutate a matched request back to `reviewed` because
`markReviewed`/`updateRequestReview` do not guard against post-match states.

No engagement was created for the affected Pilot request.

## Precondition Checks

| Check | Result | Notes |
| --- | --- | --- |
| Repository branch | PASS | Current branch is `feature/phase5-pilot-rehearsal`. |
| Source SHA | PASS | `HEAD` is `dd31345b082b39a65ac6237ac205d6f48f102c4f`. |
| Base SHA | PASS | `origin/dev` is `54e42e3cd6bc918117dd0e560d14eb43f865740b`. |
| Preview deployment | PASS | Deployment is `READY`, `preview`, and built from the feature branch SHA. |
| Production untouched | PASS | No production deployment, env, schema, or data mutation was performed. |
| Application health | PASS | Authenticated Vercel CLI request returned `{"status":"ok","service":"projectmatch"}`. |
| Application readiness | SUPERSEDED | An earlier run reported Supabase unavailable. The confirmed Phase 5.1B blocker is now the matched-request state regression below. |
| Pilot Supabase dependency | SUPERSEDED | Earlier readiness issue is not the current confirmed blocker. |
| Controlled test contacts | PASS | Controlled synthetic rehearsal data was used; no PII is documented here. |
| Admin login | PASS | Rehearsal reached admin matching workflow. |
| Admin Ops | NOT FINALIZED | Engagement creation did not complete because of the match-state blocker. |
| Password posture | NOT RECHECKED | Not rechecked as part of this documentation update. |
| Public Auth signup posture | NOT RUN | Not rechecked as part of this documentation update. |

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
| Project request submitted | PASS |
| Provider application submitted | PASS |
| Admin request review | PASS |
| Provider review | PASS |
| Add provider as candidate | PASS |
| Mark candidate contacted | PASS |
| Provider response | PASS |
| Present candidate to student | PASS |
| Student decision | PASS |
| Engagement created | FAIL |
| Provider starts work | NOT RUN |
| Provider submits deliverable | NOT RUN |
| Student confirms completion | NOT RUN |
| Student submits feedback | NOT RUN |
| Request timeline verification | BLOCKED by request state regression |
| Provider timeline verification | NOT FINALIZED |
| Admin Ops/email verification | NOT FINALIZED |

## Email And Outbox

Partially evaluated through the matching/student-decision workflow. No recipient
address, magic link, token URL, provider message ID, or email body is documented
here.

## Authorization Negative Checks

Not run. Provider response, student decision, and engagement-token flows were
not completed because the rehearsal stopped at the engagement-creation blocker.

## Workflow And Database Integrity

The affected Pilot request and accepted candidate remain as residual synthetic
rehearsal records. No direct database mutation was performed to repair or bypass
the invalid state.

Non-sensitive record IDs:

- Request ID: `f53c31c8-7c72-4524-8a97-d5de652a1471`
- Provider application ID: none
- Candidate ID: `3a5c7d4f-59ce-4952-bb3c-5dcb5402fbe2`
- Engagement ID: none
- Feedback ID: none

Database consistency result:

- Accepted candidate exists.
- Request status is invalid for the accepted state: `reviewed`.
- Request integrity state remains `clear`.
- Engagement creation fails because the request is no longer `matched`.
- No `project_engagements` row exists for the affected request.

## Health And Readiness

Authenticated Vercel access was used so deployment protection did not mask the
application result.

- `GET /api/health`: PASS, returned `{"status":"ok","service":"projectmatch"}`.
- `GET /api/readiness`: FAIL, returned `{"status":"not_ready","service":"projectmatch","dependencies":{"supabase":"unavailable"}}`.

The earlier unauthenticated `302 Found` responses are now classified as expected
Vercel Deployment Protection behavior, not an application endpoint failure.

## Runtime Log Review

Runtime logs for deployment `dpl_6N7jCPsfktpJr8iR4jVYAXmBo7uj` showed the
readiness failure:

- `GET /api/readiness` returned `503`.
- Sanitized application log event: `dependency_readiness_failed` with
  dependency `supabase`.

The confirmed blocker is in the application lifecycle, not a token or secret
exposure issue.

## Confirmed Phase 5.1B Blocker

Stage: engagement creation after student acceptance.

Expected behavior: once a candidate is accepted and the request has entered the
matched flow, admin review actions should not regress the request back to a
pre-match review state.

Actual behavior: admin review actions can mutate a matched request back to
`reviewed`. With the request no longer `matched`, engagement creation fails even
though the accepted candidate still exists.

Related behavior:

- Another candidate can continue through shortlist/decision if the request is
  first regressed to `reviewed`.
- Declining that secondary candidate clears `candidate_rank`, which can make
  the UI look like previous presentation data disappeared.
- No engagement was created for the affected Pilot request.

Severity: Controlled Pilot blocker.

Affected code path: admin request review actions,
`markReviewed`/`updateRequestReview`, because post-match states are not guarded.

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

No cleanup performed. The affected synthetic Pilot records are retained as
evidence of the blocker.

## Known Deviations

The controlled lifecycle rehearsal reached student acceptance but could not
create an engagement because the request regressed from `matched` to `reviewed`.

## Launch Recommendation

Do not invite real Pilot users yet. First fix the matched-request regression so
admin review actions cannot move post-match requests back to `reviewed`, then
rerun the controlled Pilot rehearsal from the beginning with controlled test
contacts.

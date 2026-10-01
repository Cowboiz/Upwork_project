# ProjectMatch Controlled Pilot Rehearsal

Date: 2026-10-01

Environment: Controlled Pilot

Source branch: `feature/phase5-pilot-rehearsal`

Final validated source SHA: `d43a1cbb36460cca2eaf127c9114a7393c89128b`

Base `origin/dev` SHA: `54e42e3cd6bc918117dd0e560d14eb43f865740b`

Rehearsal marker reserved: `PILOT-REHEARSAL-20260930-DD31345`

Final validated Pilot surface:

- Project: `upwork-project`
- Deployment: `dpl_Dq4SLetGDCXg3TjFjnfKTdpneRYh`
- URL: `https://upwork-project-gold.vercel.app`
- Deployment state: `READY`
- Vercel deployment target: production
- Business/data environment: Controlled Pilot
- Deployment branch: `main`
- Deployment SHA: `d43a1cbb36460cca2eaf127c9114a7393c89128b`
- Pilot Supabase project: `ProjectMatch Pilot`
- Pilot Supabase project ref: `aghkijjnvphvarnnzwne`

## Result

Status: PASS.

Phase 5.1B Controlled Pilot Rehearsal is closed as PASS based on the final
controlled smoke test against the validated Pilot surface.

The previous BLOCKED result is preserved below as historical context. It is no
longer the current Phase 5.1B result.

Final successful controlled smoke test:

- Request ID: `0bba0038-41f9-47a4-96ff-5d9f5c8974c8`
- Provider application ID: `c8a85115-5a55-418d-8569-7e596df9dfa7`
- Candidate ID: `a687d611-a150-4c66-9ea0-ffc68b050a3e`
- Engagement ID: `430aa1bf-bd80-48b4-9ead-92c8ac308a28`

Final request state:

- Request status: `completed`

Final candidate state:

- `provider_response_status`: `interested`
- `student_decision_status`: `accepted`
- `candidate_rank`: `1`
- `agreed_price`: `100 USD`
- `agreed_deadline`: `2026-10-29`

Final engagement state:

- Engagement status: `completed`
- Deliverable present: yes
- Feedback submitted: yes
- Feedback rating: `5`

Historical BLOCKED context:

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
| Source SHA | PASS | Final validated Pilot deployment source SHA is `d43a1cbb36460cca2eaf127c9114a7393c89128b`. |
| Base SHA | PASS | `origin/dev` is `54e42e3cd6bc918117dd0e560d14eb43f865740b`. |
| Pilot deployment | PASS | Deployment `dpl_Dq4SLetGDCXg3TjFjnfKTdpneRYh` is the validated Pilot surface. |
| Application health | PASS | `/api/health` returned `200` with status `ok`. |
| Application readiness | PASS | `/api/readiness` returned `200`; Supabase dependency reported ok. |
| Pilot Supabase dependency | PASS | Pilot Supabase project `aghkijjnvphvarnnzwne` was available for the successful rehearsal. |
| Controlled test contacts | PASS | Controlled synthetic rehearsal data was used; no PII is documented here. |
| Admin login | PASS | Rehearsal reached admin matching workflow. |
| Admin Ops | PASS | Final successful rehearsal completed through engagement completion and feedback. |
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
| Engagement created | PASS |
| Provider starts work | PASS |
| Provider submits deliverable | PASS |
| Student confirms completion | PASS |
| Student submits feedback | PASS |
| Request timeline verification | PASS |
| Provider timeline verification | PASS |
| Admin Ops/email verification | PASS |

Observed workflow events, in order:

1. `request_submitted`
2. `request_first_reviewed`
3. `request_integrity_cleared`
4. `request_qualified`
5. `candidate_added`
6. `provider_contacted`
7. `provider_responded_interested`
8. `shortlist_presented`
9. `student_decision_accepted`
10. `engagement_created`
11. `engagement_started`
12. `engagement_submitted`
13. `engagement_completed`
14. `engagement_feedback_submitted`

External/token routes verified through actual POST requests:

- `POST /provider/respond`
- `POST /request/status`
- `POST /engagement/provider` to start work
- `POST /engagement/provider` to submit deliverable
- `POST /engagement/status` to complete engagement
- `POST /engagement/status` to submit feedback

All returned HTTP `200` during the successful rehearsal.

## Email And Outbox

No recipient address, magic link, token URL, provider message ID, or email body
is documented here.

Email outbox result for the successful rehearsal:

| Email type | Result |
| --- | --- |
| `request_submitted_student_confirmation` | sent on attempt 1 |
| `request_submitted_admin_alert` | sent on attempt 1 |
| `provider_contacted_provider` | sent on attempt 1 |
| `shortlist_presented_student` | sent on attempt 1 |
| `engagement_created_provider` | sent on attempt 1 |
| `engagement_submitted_student` | sent on attempt 1 |
| `engagement_completed_provider` | sent on attempt 1 |

Previously observed email failures were diagnosed as infrastructure and
configuration failures, not workflow defects. Resend returned HTTP `403`
because the application was using the `resend.dev` testing domain. The provider
reported that `resend.dev` can only send to the account owner's email address
and requires a verified sender domain/from address for other recipients.

After correcting the sender/domain configuration, the final controlled
rehearsal produced 7/7 successful email deliveries.

Old failed email rows remain historical operational records and should not be
rewritten or deleted as part of this closeout.

## Authorization Negative Checks

Provider response, student decision, and engagement-token flows completed
successfully in the final controlled smoke test.

## Workflow And Database Integrity

The affected historical Pilot request and accepted candidate remain as residual
synthetic rehearsal records. No direct database mutation was performed to repair
or bypass the invalid state.

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

Final successful rehearsal consistency result:

- Final request status is `completed`.
- Accepted candidate remains linked to the engagement.
- Final candidate state is `interested` and `accepted`.
- Engagement status is `completed`.
- Engagement deliverable is present.
- Feedback is submitted with rating `5`.
- Match-state regression did not recur.
- `payment_status` being `not_started` is not a Phase 5.1B blocker because
  payment was not part of this rehearsal acceptance gate.

## Health And Readiness

- `GET /api/health`: PASS, returned HTTP `200` with status `ok`.
- `GET /api/readiness`: PASS, returned HTTP `200`; Supabase dependency was ok.

The earlier unauthenticated `302 Found` responses are now classified as expected
Vercel Deployment Protection behavior, not an application endpoint failure.

## Runtime Log Review

No error, warning, or fatal runtime logs were observed during the final
successful rehearsal window.

Historical runtime logs for deployment `dpl_6N7jCPsfktpJr8iR4jVYAXmBo7uj`
showed the earlier readiness failure:

- `GET /api/readiness` returned `503`.
- Sanitized application log event: `dependency_readiness_failed` with
  dependency `supabase`.

That earlier readiness failure is historical and is not the final Phase 5.1B
result.

## Historical Phase 5.1B Blocker

Status: RESOLVED for Phase 5.1B closeout; the match-state regression did not
recur in the final successful rehearsal.

Historical stage: engagement creation after student acceptance.

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

Historical severity: Controlled Pilot blocker.

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

No cleanup performed. The affected historical synthetic Pilot records are
retained as evidence of the prior blocker. Old failed email rows also remain
historical operational records and should not be rewritten or deleted as part
of this closeout.

## Known Deviations

The historical controlled lifecycle rehearsal reached student acceptance but
could not create an engagement because the request regressed from `matched` to
`reviewed`. That regression did not recur during the final successful
controlled rehearsal.

Payment was not part of the Phase 5.1B acceptance gate. A `payment_status` of
`not_started` is therefore not a blocker for this closeout.

## Pilot Entry Conditions

- Only a very small initial cohort may enter the Pilot.
- Onboarding must remain operator-controlled.
- Monitor `/admin/ops` after each early lifecycle.
- Failed emails require investigation rather than repeated blind retry.
- Use only verified email sender/domain configuration.
- Stop inviting new users if lifecycle, auth, email delivery, or data-integrity
  regressions appear.

## Launch Recommendation

Controlled real Pilot may begin with a very small operator-supervised cohort.
This is not general availability and is not an unrestricted production launch.

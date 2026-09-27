# ProjectMatch Controlled Pilot Rehearsal

Date: 2026-09-27

Environment: Pilot

Source branch: `feature/phase5-pilot-rehearsal`

Source SHA: `54e42e3cd6bc918117dd0e560d14eb43f865740b`

Base `origin/dev` SHA: `54e42e3cd6bc918117dd0e560d14eb43f865740b`

Pilot deployment inspected:

- Project: `upwork-project`
- Deployment: `dpl_2fr4vL89xcYvyKRDHt3vLT8YDPGi`
- URL: `https://upwork-project-a0b27wod7-ciel08-cowboiz10.vercel.app`
- Alias: `https://upwork-project-git-dev-ciel08-cowboiz10.vercel.app`
- Deployment state: `READY`
- Deployment branch: `dev`
- Deployment SHA: `54e42e3cd6bc918117dd0e560d14eb43f865740b`

## Result

Status: BLOCKED before creating rehearsal records.

Reason: the required Pilot health/readiness precondition did not pass. Both
`/api/health` and `/api/readiness` returned `302 Found` and redirected to Vercel
SSO instead of returning application-level `200` responses.

No rehearsal project request, provider application, candidate, engagement,
feedback, token, workflow event, or email outbox row was created.

## Precondition Checks

| Check | Result | Notes |
| --- | --- | --- |
| Repository branch | PASS | Current branch is `feature/phase5-pilot-rehearsal`. |
| Source SHA | PASS | `HEAD` matches `origin/dev` at `54e42e3cd6bc918117dd0e560d14eb43f865740b`. |
| Migration delta | PASS | No migration file delta exists between this branch and `origin/dev`. |
| Pilot health | FAIL | `GET /api/health` returned `302 Found`. |
| Pilot readiness | FAIL | `GET /api/readiness` returned `302 Found`. |
| Admin login | NOT RUN | Stopped because health/readiness failed. |
| Admin Ops | NOT RUN | Stopped because health/readiness failed. |
| Password posture | NOT RECHECKED | Stopped before continuing preconditions. |
| Public Auth signup posture | NOT RUN | Stopped because health/readiness failed. |

## Inspected Current Workflow

The deployed workflow was inspected from the current code before attempting any
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
| Admin review and matching | NOT RUN |
| Provider contacted | NOT RUN |
| Provider acceptance | NOT RUN |
| Student acceptance | NOT RUN |
| Engagement created | NOT RUN |
| Provider starts work | NOT RUN |
| Provider submits deliverable | NOT RUN |
| Student confirms completion | NOT RUN |
| Student submits feedback | NOT RUN |
| Request timeline verification | NOT RUN |
| Provider timeline verification | NOT RUN |
| Admin Ops/email verification | NOT RUN |

## Email Mode

Not evaluated. Stopped before triggering or inspecting workflow emails because
the Pilot health/readiness precondition failed.

## Workflow Integrity

Not evaluated. No rehearsal workflow events were created.

## Database Integrity

Not evaluated beyond confirming no rehearsal records were intentionally created.

## Health And Readiness

- `GET /api/health`: FAIL, `302 Found`, redirected to Vercel SSO.
- `GET /api/readiness`: FAIL, `302 Found`, redirected to Vercel SSO.

The same result was observed on the deployment URL and the `dev` alias.

## Runtime Log Review

Vercel runtime logs for deployment `dpl_2fr4vL89xcYvyKRDHt3vLT8YDPGi` over the
checked 30-minute window returned no application logs. This is consistent with
the failed endpoint checks being intercepted before application route execution.

## Security And Token Privacy

No bearer-token URLs, admin passwords, email addresses, phone numbers,
service-role keys, secret values, or other users' records were accessed or
written into this document.

## Cleanup Status

No cleanup required. No rehearsal data was created.

## Known Deviations

The controlled lifecycle rehearsal could not begin because required Pilot
health/readiness checks did not return `200`.

## Launch Recommendation

Do not invite real Pilot users yet. First make the Pilot health and readiness
endpoints reachable for the intended controlled rehearsal access path, then
rerun the controlled Pilot rehearsal from the beginning.

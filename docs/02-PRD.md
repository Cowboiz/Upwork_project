# Product Requirements Document

> Version: v0.1  
> Product stage: Manual validation / concierge MVP  
> Principle: Build only what helps validate demand, supply, matching, trust, fulfillment, or willingness to pay.

## Product Summary

The MVP is a lightweight marketplace workflow for students with legitimate digital projects and vetted designers/developers who can complete small project-based work.

A student submits a structured project request. A provider submits skills, portfolio, availability, and rate expectations. The marketplace operator reviews both sides, manually selects relevant providers, coordinates the introduction, and tracks whether the project is accepted, paid, completed, referred, repeated, disputed, or cancelled.

The first MVP intentionally avoids open bidding, native chat, automated escrow, and complex recommendations. Manual operations are a feature at this stage because they allow the business model to be tested before engineering expensive automation.

## Primary Objective

Validate the marketplace business model as quickly and cheaply as possible.

Specifically validate:

1. Qualified student demand.
2. Responsive provider supply.
3. Fast, relevant matching.
4. Real project payment.
5. Acceptable completion and dispute rates.
6. Evidence of repeat usage or referrals.

## MVP Scope

### Must Have

- Capture student project requests.
- Capture designer/developer provider profiles or availability.
- Screen requests for prohibited academic-integrity use cases.
- Enable operator review and manual/lightweight matching.
- Record provider interest or decline.
- Track project status from request through outcome.
- Record agreed budget/price and whether payment occurred.
- Support basic trust, communication, scope, and handoff expectations.
- Capture project outcome and qualitative feedback.
- Capture acquisition source for each student/provider.
- Allow the operator to export or inspect validation data easily.

### Should Have

- **Basic project categories:** Web/landing page, UI/UX/prototype, graphic/brand design, small web development, simple integration/automation.
- **Basic budget ranges:** <50, 50–100, 100–300, 300–500, 500+ USD equivalent; local labels can be substituted.
- **Provider skill tags:** UI/UX, Figma, graphic design, HTML/CSS, JavaScript/TypeScript, React/Next.js, back-end, automation/integration.
- **Simple admin workflow:** New requests, provider review, candidate shortlist, match status, project outcome, notes.
- **Integrity screening:** Student confirms that the request is not asking someone to complete graded coursework, exams, or prohibited work.

### Could Have

- Lightweight reviews after completion.
- Portfolio links and example thumbnails.
- Templates for project briefs.
- Automated email notifications.
- A public provider directory.
- Basic referral tracking.

### Out of Scope

- Full freelance platform automation.
- Open/complex bidding.
- Native chat.
- Automated escrow.
- Advanced AI recommendations.
- Full mobile app.
- Enterprise accounts.
- Multi-currency settlement.
- Automated dispute resolution.
- Work that violates academic-integrity policies.

## User Personas

### Student

- **Goal:** Get a legitimate digital project completed by a capable person without spending hours searching or evaluating freelancers.
- **Pain:** Limited network, unclear pricing, short deadline, uncertainty about provider quality, difficulty writing a technical brief.
- **Constraint:** Student-sized budget, limited procurement experience, potentially time-sensitive.
- **Success moment:** Receives a relevant provider match, agrees on clear scope/price/deadline, and receives usable work on time.

### Designer or Developer

- **Goal:** Find real, reasonably scoped projects that fit their skills and availability.
- **Pain:** High competition, poor-quality leads, unpaid proposal time, lack of early portfolio/reputation.
- **Constraint:** Limited time, small-project economics, need to avoid vague or unrealistic briefs.
- **Success moment:** Receives a qualified lead, accepts clear terms, delivers successfully, gets paid, and gains a reference or repeat opportunity.

### Marketplace Operator

- **Goal:** Prove that demand and supply can be matched repeatedly with acceptable economics and trust.
- **Pain:** Manual coordination, inconsistent briefs, slow replies, provider quality risk, ambiguous outcomes.
- **Constraint:** Solo/small-team operations, limited budget, need for measurable learning.
- **Success moment:** Can move requests through a repeatable process, see conversion metrics, identify failure reasons, and know which workflow deserves automation.

## Core User Stories

- As a student, I want to submit a project request so that I can find someone qualified to help.
- As a student, I want to understand the expected process so that I know what happens after submission.
- As a student, I want to state budget and deadline so that I receive realistic matches.
- As a provider, I want to list my skills and availability so that I can receive relevant opportunities.
- As a provider, I want to see scope, budget, and deadline before accepting a lead.
- As an operator, I want to review requests and providers so that I can make good matches manually.
- As an operator, I want to reject prohibited or unsafe requests before matching.
- As an operator, I want to record match and project outcomes so that I can learn whether the marketplace works.
- As an operator, I want to know the source of each request/provider so that I can identify useful acquisition channels.

## Functional Requirements

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| PRD-001 | Student can submit name, contact, project category, description, deadline, budget range, files/links, and acquisition source | Must | Keep form short; school/context optional unless needed |
| PRD-002 | Student must confirm the request is legitimate and not prohibited academic-assignment/exam completion | Must | Operator can reject requests that violate policy |
| PRD-003 | Provider can submit contact, skills, portfolio, availability, preferred project types, and rate expectations | Must | At least one portfolio/example link required for approval |
| PRD-004 | Operator can mark provider as New, Approved, Waitlisted, Rejected, or Inactive | Must | Manual review in first MVP |
| PRD-005 | Operator can mark request as New, Reviewed, Matched, In progress, Completed, or Cancelled | Must | Status history preferred if cheap |
| PRD-006 | Operator can create a match between one request and one provider and record provider response | Must | Multiple candidate matches per request are allowed |
| PRD-007 | System records proposed date, accepted/declined state, and decline reason | Must | Needed to diagnose liquidity |
| PRD-008 | Operator can record agreed price, payment state, completion state, and dispute/refund notes | Must | Do not store raw card data |
| PRD-009 | Operator can view a simple pipeline of requests, providers, matches, and outcomes | Must | Spreadsheet/admin table is acceptable |
| PRD-010 | Operator can export or otherwise inspect validation data | Must | CSV/spreadsheet is sufficient |
| PRD-011 | Student/provider receive a clear next-step message after submission | Should | Email or manual message is acceptable |
| PRD-012 | Operator can filter providers by skill, availability, project type, and status | Should | Manual filtering is acceptable |
| PRD-013 | Operator can capture qualitative feedback from both sides after completion | Should | Simple text + optional rating |
| PRD-014 | Operator can record referral/repeat intent | Should | Needed for retention signal |
| PRD-015 | Public provider profile can show opt-in name/display name, skills, and portfolio | Could | Avoid exposing private contact information |

## Non-Functional Requirements

- Keep operational complexity low.
- Keep technical complexity low.
- Protect personal information and project files.
- Make manual operations easy to perform and measure.
- Do not store raw payment card data.
- Keep data exportable.
- Forms should work well on mobile.
- Student/provider forms should be understandable without technical knowledge.
- Admin access must be restricted.
- The system should support the initial pilot with low operating cost.
- Prefer graceful manual fallbacks over fragile automation.

## Metrics

Initial pilot targets are hypotheses.

- **Student requests submitted:** >=20 qualified requests within 4–6 weeks.
- **Qualified providers onboarded:** >=30.
- **Provider responsiveness:** >=60% response rate to relevant outreach.
- **Match rate:** >=50% of qualified requests receive a viable match.
- **Time to first response:** <12 hours during operating hours.
- **Time to shortlist/next step:** <24 hours target.
- **Payment conversion:** >=30% of matched students agree to a real paid scope.
- **Completed projects:** >=5 paid completions in initial pilot.
- **Refunds or material disputes:** <10% of completed projects.
- **Repeat/referral signal:** >=20% of completed users refer, repeat, or explicitly intend to reuse.

## Open Questions

- **Open Question:** Which 2–3 project categories are included in the first public pilot?
- **Open Question:** Is the first pilot invite-only or publicly accessible?
- **Open Question:** Which communication channel should be the default during manual matching: email, WhatsApp/Telegram/Discord, or another channel?
- **Open Question:** At what traction threshold should user accounts be introduced?
- **Open Question:** At what traction threshold should integrated payments be introduced?

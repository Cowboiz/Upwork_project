# Architecture

> Version: v0.1  
> Status: No final production stack is locked. This document defines a staged architecture strategy aligned with validation.

## Architecture Status

No final technical architecture has been chosen yet.

The recommended approach is to **start hybrid/manual**, collect real marketplace evidence, and only move to a custom product after repetitive workflows are proven.

Any final technology choice must be recorded in `09-DECISIONS.md`.

## MVP Architecture Goals

- Minimize build time.
- Minimize operating cost.
- Support fast learning.
- Keep data easy to inspect and export.
- Avoid over-engineering marketplace automation before validation.
- Make manual fallback possible.
- Keep private requests and contact information access-controlled.
- Avoid storing payment-card data directly.

## Constraints

- **Budget:** Working target is minimal/pre-revenue infrastructure; ideally near free tier and under roughly USD 50/month until real usage justifies more.
- **Timeline:** First validation should begin within days, not months. Lightweight product work should be measured in weeks.
- **Team skills:** Assume a solo founder/vibe-coder using Codex, with limited time for DevOps.
- **Expected traffic:** Pilot-scale traffic, likely under 1,000 monthly active users initially.
- **Manual operations tolerance:** High during Stage 1–2; manual matching is intentional.
- **Compliance or privacy constraints:** Personal contact data, private project descriptions/files, and payment metadata require restricted access. Academic-integrity screening is required.
- **Reliability:** The system does not need hyperscale architecture; it does need reliable data capture and recoverable exports.

## Candidate Approaches

### No-Code or Low-Code

- **Tools considered:** Tally/Google Forms for intake, Airtable/Google Sheets for operations, Notion for procedures, email or approved messaging channel for coordination.
- **Pros:**
  - Fastest launch.
  - Cheapest way to validate demand/supply.
  - Data is easy to inspect manually.
  - Little engineering risk.
- **Cons:**
  - Weak user experience at scale.
  - Permissions and data-model complexity become awkward.
  - Manual work grows quickly.
  - Harder to create a coherent marketplace brand/product.
- **Validation fit:** Excellent for Stage 1 manual validation.

### Simple Custom Web App

- **Tools considered (candidates, not decisions):**
  - Next.js + TypeScript.
  - Managed PostgreSQL/Auth/Storage such as Supabase.
  - Vercel or comparable managed hosting.
  - Transactional email provider later.
  - Stripe or another reputable payment processor later.
- **Pros:**
  - One coherent user experience.
  - Easier to automate repeated workflows.
  - Stronger access control and data relationships.
  - Better foundation for user accounts and payments.
- **Cons:**
  - More build time.
  - More security/maintenance responsibility.
  - High risk of overbuilding before validation.
- **Validation fit:** Good for Stage 3 after manual matching is repeatable.

### Hybrid Manual Operations

- **Tools considered:** Simple landing/intake experience + structured database/spreadsheet + manual operator workflow + external communication.
- **Pros:**
  - Looks more trustworthy than pure forms.
  - Preserves manual learning.
  - Can automate only the highest-friction steps.
  - Easier migration path to a custom app.
- **Cons:**
  - Some duplicated operational work.
  - Requires discipline to keep source-of-truth clear.
- **Validation fit:** Recommended baseline for Stage 1–2.

## Recommended Stage-by-Stage Architecture

### Stage 1 — Manual Validation

Use the lightest tools capable of capturing:

- Student requests.
- Provider applications.
- Match records.
- Project outcomes.
- Acquisition source.
- Payment/willingness-to-pay evidence.

No user accounts, native chat, bidding, or escrow.

### Stage 2 — Concierge MVP

Add a small custom or semi-custom interface only if manual operations reveal clear repeated pain.

Likely first automations:

- Cleaner request intake.
- Provider filtering.
- Admin pipeline/status updates.
- Email notifications.
- Outcome reporting.

### Stage 3 — Lightweight Product

Only after repeated successful paid matches:

- User authentication.
- Student dashboard.
- Provider profiles.
- Match workflow.
- Integrated payment.
- Review/reputation.
- Basic analytics.

## Core System Capabilities

- **Student request intake:** Public form with validation, privacy notice, integrity confirmation, and source attribution.
- **Provider intake:** Application form with skills, portfolio, availability, rate expectations, and policy agreement.
- **Admin review:** Restricted interface or spreadsheet for approving requests/providers.
- **Matching workflow:** Link request and provider; record proposed/accepted/declined status and reasons.
- **Status tracking:** Request, provider, match, and project outcome statuses.
- **Payment or payment-intent tracking:** Store status/amount/reference only; never raw card data.
- **Notifications:** Manual or email first; automate after volume proves need.
- **Analytics:** Funnel counts, match speed, conversion, completion, disputes, source attribution.

## Integration Candidates

Do not choose integrations until needed.

- **Forms:** Tally, Google Forms, or custom form.
- **Spreadsheet or database:** Google Sheets/Airtable initially; managed PostgreSQL later.
- **Email:** Manual email initially; transactional provider later.
- **Messaging:** External channel selected for pilot; do not build native chat initially.
- **Payments:** Reputable payment processor such as Stripe where legally/regionally appropriate; exact provider remains open.
- **Analytics:** Simple event/count tracking first; product analytics later if needed.
- **File uploads:** Avoid unless clearly needed. If introduced, use managed private storage and signed/expiring access URLs.

## Data Flow Draft

```text
Student acquisition source
        ↓
Student request form
        ↓
Request record
        ↓
Operator review + policy check
        ↓
Provider search/filter
        ↓
Candidate match record(s)
        ↓
Provider interest/availability
        ↓
Student selection
        ↓
Accepted match
        ↓
Scope + price + deadline recorded
        ↓
Work performed externally
        ↓
Outcome + payment status + feedback
        ↓
Validation metrics + product decisions
```

Provider data follows a parallel path:

```text
Provider acquisition source
        ↓
Provider application
        ↓
Operator review
        ↓
Approved provider pool
        ↓
Relevant opportunity
        ↓
Match response + outcome history
```

## Operational Model

### What will be manual?

- Request quality review.
- Academic-integrity screening.
- Provider vetting.
- Candidate selection.
- Clarification of ambiguous briefs.
- Initial introduction.
- Dispute review.
- Qualitative interview/feedback.
- Validation analysis.

### What may be automated early?

Only repetitive low-risk steps:

- Form confirmation.
- Status reminders.
- Provider filtering.
- Basic funnel reporting.
- Templated messages.

### What evidence is needed before automating?

Automate a workflow only when:

1. It has occurred repeatedly.
2. The manual steps are stable.
3. The operator can describe clear rules.
4. Automation saves meaningful time or improves conversion.
5. Failure modes are understood.

## Open Questions

- **Open Question:** Which low-code/manual tools will be used in Stage 1?
- **Open Question:** What traction threshold triggers a custom web app?
- **Open Question:** If a custom app is built, is Supabase the best fit for auth/database/storage or should alternatives be compared?
- **Open Question:** Which payment provider is supported in the launch geography and business structure?
- **Open Question:** What communication channel will be used before native messaging is justified?

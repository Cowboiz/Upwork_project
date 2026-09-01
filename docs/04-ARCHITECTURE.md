# Architecture

> Version: v0.2  
> Last updated: 2026-08-31  
> Status: Approved MVP architecture for Stage 1–3 implementation.  
> Canonical technical decisions are recorded in `docs/09-DECISIONS.md`.

---

## Architecture Status

Stage 0 is complete.

The project has selected the following technical direction:

- **Frontend / web application:** Next.js
- **Application language:** TypeScript
- **Backend application layer:** Next.js server-side functionality
- **Backend platform:** Supabase
- **Database:** PostgreSQL through Supabase
- **Authentication:** Supabase Auth when authentication enters scope
- **Authorization:** Supabase Row Level Security plus server-side authorization
- **Storage:** Supabase Storage only when justified
- **Source control:** Git + GitHub
- **Database change management:** Version-controlled Supabase migrations

The architecture is intentionally simple. The project will not introduce a separate Express, NestJS, or other custom API service unless a proven requirement later justifies it.

Choosing a custom web stack does not change the product strategy:

- Stage 1–2 remain manual/concierge-oriented.
- Matching remains curated rather than open bidding.
- Automation is added only when repeated operational pain is proven.

---

## MVP Architecture Goals

- Minimize build time and operating cost.
- Support fast marketplace validation.
- Keep the codebase understandable for a solo founder using Codex.
- Keep data relational, inspectable, and exportable.
- Keep private student/provider/project information access-controlled.
- Make manual operational fallback possible.
- Avoid unnecessary services and infrastructure.
- Support incremental automation rather than a full marketplace build.
- Keep database changes reproducible through migrations.
- Never store raw payment-card data.

---

## Constraints

### Budget

- Pre-revenue infrastructure should remain close to free-tier usage where practical.
- Working target: under roughly USD 50/month until real usage justifies more.

### Timeline

- Product iterations should be measured in days or weeks, not months.
- Ship the first useful vertical slice before broad feature expansion.

### Team

- Solo founder / vibe-coder using Codex.
- Limited DevOps time.
- Prefer managed services over self-hosted infrastructure.

### Expected Traffic

- Pilot-scale traffic initially.
- No hyperscale architecture is required.

### Operational Model

- Manual operations remain acceptable during Stage 1–2.
- Operator-led matching, review, trust checks, and qualitative feedback are intentional.

### Security / Privacy

- Student contact data is private.
- Provider private data is restricted.
- Project descriptions/files may be sensitive.
- Payment metadata must be protected.
- Academic-integrity screening is mandatory.

---

## High-Level Architecture

```text
                         Browser
                            │
                            ▼
                    ┌───────────────┐
                    │    Next.js    │
                    ├───────────────┤
                    │ UI            │
                    │ Server        │
                    │ Components    │
                    │ Server Actions│
                    │ Route Handlers│
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Supabase    │
                    ├───────────────┤
                    │ PostgreSQL    │
                    │ Auth          │
                    │ RLS           │
                    │ Storage       │
                    │ Platform APIs │
                    └───────────────┘
```

### Browser Responsibilities

- Render interactive UI.
- Collect user input.
- Call approved application actions.
- Display only authorized data.

The browser must never contain privileged Supabase credentials.

### Next.js Responsibilities

- Page rendering.
- Server Components.
- Server-side business logic.
- Sensitive validation and authorization.
- Admin/operator workflows.
- Future integration orchestration.
- Secure access to server-only environment variables.
- Route handlers when required.

### Supabase Responsibilities

- PostgreSQL database.
- Managed authentication.
- Database authorization with RLS.
- Managed storage when needed.
- Database APIs and persistent marketplace data.

---

## Client / Server Boundary

### Client-Side Code

Use Client Components only when browser interactivity is required.

Examples:

- Form interaction.
- Local UI state.
- Modal/dropdown behavior.
- Optimistic feedback where appropriate.

Client code must not:

- Contain service-role credentials.
- Make privileged admin decisions.
- Bypass RLS.
- Contain secrets.
- Be the only authorization layer.

### Server-Side Code

Prefer server-side logic for:

- Admin/operator actions.
- Private marketplace data.
- Authorization-sensitive operations.
- Creating/updating curated match records.
- Trust and safety decisions.
- Future payment operations.
- Future transactional integrations.
- Any use of privileged Supabase credentials.

---

## Authentication Model

Authentication should be introduced when the relevant roadmap stage requires it.

When implemented:

- Use Supabase Auth.
- Do not implement custom password storage.
- Keep auth identity separate from marketplace profile/business fields.
- Use authenticated user ID as the authorization anchor.
- Require server-side ownership/role checks for sensitive operations.
- Require MFA for admin/operator accounts when supported and practical.

### Initial Roles

- `student`
- `provider`
- `admin`

Avoid complex role hierarchies until proven necessary.

---

## Authorization and RLS

RLS is required for browser-accessible private tables.

Security model:

```text
Default deny
    ↓
Explicit policy
    ↓
Valid user / role / ownership
```

### Profiles

- Users may access their own private profile.
- Public provider fields are exposed only when explicitly intended.
- Admin may access records needed for operations.

### Projects

- Students may create/read/update their own project subject to status rules.
- Providers should not automatically see all private project details.
- Admin/operator may review relevant project requests.

### Matches / Proposals

The MVP does not use open bidding.

If the existing `proposals` table represents operator-curated candidate matches, document and model that explicitly. Do not expose a public “bid on every project” workflow. Rename/refactor later if the current name creates domain confusion.

### Messages / Conversations

These tables may exist but are not part of initial product scope. Do not expose them until native messaging is explicitly approved.

---

## Database Architecture

### System of Record

PostgreSQL in Supabase is the system of record.

### Schema Management

All future schema changes should follow:

```text
Migration
   ↓
Git
   ↓
Review
   ↓
Apply
```

After migration baseline is established, avoid direct production-dashboard schema edits unless necessary.

If a manual change occurs:

1. Capture it in a migration.
2. Commit it to Git.
3. Update documentation if the domain model changed.

### Type Safety

Generate TypeScript database types from the Supabase schema and prefer them over duplicated manual interfaces where practical.

### Existing Tables

Current tables may include:

- `profiles`
- `projects`
- `proposals`
- `contracts`
- `conversations`
- `messages`
- `favorites`
- `reviews`

Their existence does not mean their features must be implemented now. The PRD and Roadmap determine feature scope.

---

## MVP Vertical-Slice Strategy

### Vertical Slice 1

```text
Landing
   ↓
Student submits project request
   ↓
Project stored in Supabase
   ↓
Operator reviews request
   ↓
Request status updated
```

### Vertical Slice 2

```text
Provider application
   ↓
Provider data stored
   ↓
Operator reviews provider
   ↓
Provider approved / waitlisted / rejected
```

### Vertical Slice 3

```text
Reviewed request
   ↓
Operator identifies candidate providers
   ↓
Provider interest confirmed
   ↓
Up to 3 curated options
   ↓
Student selects provider
   ↓
Match outcome tracked
```

### Later Slices

Only after evidence justifies them:

- Authentication/dashboard.
- Payment integration.
- Reviews/reputation.
- Automated notifications.
- Storage/uploads.
- Native messaging.
- Referral automation.
- Advanced matching.

---

## Product Data Flow

```text
Student acquisition source
        ↓
Project request
        ↓
Database record
        ↓
Operator review
        ↓
Integrity / quality check
        ↓
Provider filter / review
        ↓
Curated candidate record(s)
        ↓
Provider interest
        ↓
Student receives up to 3 options
        ↓
Student selects provider
        ↓
Scope + price + deadline
        ↓
Project begins
        ↓
Outcome tracked
        ↓
Validation metrics
```

This is not an open bidding architecture.

---

## Manual vs Automated Responsibilities

### Manual During Stage 1–2

- Request quality review.
- Academic-integrity review.
- Provider vetting.
- Candidate selection.
- Provider interest confirmation.
- Clarification of project briefs.
- Initial introduction.
- Dispute review.
- Qualitative feedback.
- Marketplace learning analysis.

### Safe Early Automation

- Form validation.
- Submission confirmations.
- Status updates.
- Provider filters.
- Operator dashboards.
- Basic funnel reporting.
- Templated notifications.

### Automation Gate

Automate only when:

1. The workflow occurs repeatedly.
2. The manual process is stable.
3. Rules can be clearly described.
4. Automation saves meaningful time or improves conversion.
5. Failure modes are understood.

---

## File and Storage Strategy

Initial Stage 1 policy:

- Prefer external links for project assets.
- Do not require direct file uploads.

If uploads become necessary:

- Use Supabase Storage or another approved managed private-storage provider.
- Files are private by default.
- Use signed/expiring access URLs where appropriate.
- Validate size/type.
- Do not expose public bucket URLs for private data.

---

## Environment Variables

When implementation begins, use `.env.example` with placeholders only.

Expected categories:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Rules:

- Browser-safe/public variables may be used by browser-safe clients.
- Privileged keys remain server-only.
- Never commit real secrets.
- Never prefix privileged credentials with `NEXT_PUBLIC_`.
- Exact names should follow the SDK/version actually used.

---

## Deployment

Production hosting is not finalized.

The eventual host should:

- Support Next.js reliably.
- Support required server-side execution.
- Support environment variables/secrets.
- Integrate cleanly with GitHub.
- Support preview deployments if useful.
- Keep operational overhead low.

Vercel is a candidate, not yet a locked decision.

---

## Observability and Analytics

Do not introduce a large observability stack initially.

Early metrics can come from:

- Database counts/queries.
- Admin funnel reporting.
- Basic application logs.
- Manual operational tracking.

Add dedicated analytics/error monitoring only when it solves a real need.

---

## Payment Architecture

Payment integration is deferred until willingness-to-pay and fee hypotheses are validated.

When introduced:

- Use a reputable third-party payment provider.
- Never store raw card data.
- Keep privileged payment API calls server-side.
- Store only necessary transaction references/status in Supabase.
- Document refund/dispute behavior before launch.

The payment provider remains undecided.

---

## Deferred Architecture

Explicitly deferred:

- Separate microservices.
- Separate Node/Nest/Express backend.
- Native mobile app.
- Native real-time chat.
- Automated escrow.
- AI matching.
- Advanced search infrastructure.
- Dedicated queue infrastructure.
- Complex event-driven architecture.
- Multi-region database architecture.
- Enterprise authorization hierarchy.

Do not add these without a documented decision.

---

## Engineering Principles

1. Prefer Server Components by default where appropriate.
2. Use Client Components only where browser interaction requires them.
3. Keep business rules outside presentational UI components.
4. Validate user-controlled input server-side.
5. Enforce authorization at application and database layers.
6. Keep database schema reproducible.
7. Prefer managed infrastructure.
8. Build vertical slices rather than technical layers.
9. Defer features not required by the current roadmap.
10. Update `09-DECISIONS.md` when a major technical choice changes.

---

## Open Questions

- Which production hosting provider will be used?
- Which transactional email provider will be used?
- Which payment provider will be used?
- Which analytics/error-monitoring provider will be used if needed?
- Should `proposals` be renamed/refactored to reflect curated matching?
- At what roadmap milestone should Supabase Auth become user-facing?
- When should direct file uploads replace external-link-only assets?

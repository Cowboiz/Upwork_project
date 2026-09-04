# Decisions

> Version: v0.2  
> Last updated: 2026-08-31  
> This document is the canonical source for finalized product, business, design, technical, security, and operational decisions.

---

## Decision Log

| Date | Decision | Context | Options Considered | Rationale | Status / Owner |
| --- | --- | --- | --- | --- | --- |
| 2026-08-30 | Create documentation-only project foundation before implementation | The project was starting as an MVP marketplace for student project work and designer/developer services. | Build immediately; choose stack first; documentation first | Documentation first prevented premature implementation and forced the project to define marketplace risks before software. | Active historical decision / Founder |
| 2026-08-30 | Validate the marketplace manually before building a full platform | The largest early risks are demand, supply, match quality, willingness to pay, completion, and trust. | Full marketplace; custom app immediately; manual/concierge validation first | Manual matching produces business evidence faster than feature-heavy platform development. | Active product strategy / Founder |
| 2026-08-30 | Focus first demand hypothesis on university students/student-led teams aged 18+ with legitimate digital projects | Narrow demand improves positioning and liquidity. | All students; all SMBs; university/student-led projects | The segment is accessible and aligned with small digital-project demand. | Provisional—review after Stage 1 |
| 2026-08-30 | Focus first supply hypothesis on vetted early-career designers/developers aged 18+ with portfolio evidence | Affordable supply is needed without sacrificing trust. | Open enrollment; agencies; established freelancers only; vetted early-career providers | Early-career providers can benefit from real paid projects while manual vetting protects quality. | Provisional—review after Stage 1 |
| 2026-08-30 | Prohibit academic-cheating work | A student marketplace creates academic-integrity risk. | Allow all requests; disclaimer only; screening and rejection | Protects users/product legitimacy while allowing legitimate startup, club, hackathon, portfolio, personal-project, tutoring, and feedback use cases. | Active product policy |
| 2026-08-30 | Do not build open bidding, native chat, automated escrow, advanced AI matching, or mobile app in first MVP | These features add complexity before core marketplace behavior is validated. | Full feature set; selective build; manual-first | None is required to validate the core transaction loop. | Active MVP-scope decision |
| 2026-08-30 | Do not require platform fee during earliest demand/match validation | Early monetization friction may obscure whether marketplace works. | Commission from day one; subscription; listing fee; fee-free first | First validate willingness to pay providers, then test whether marketplace can capture value. | Provisional business decision |
| 2026-08-30 | Use a 10% total take-rate hypothesis for first fee-sensitivity test | Need a concrete test without locking final pricing. | 5%; 10%; 15%+; subscription | 10% is simple enough to test and adjust from evidence. | Provisional—test later |
| 2026-08-30 | Keep final production architecture undecided during Stage 0 | At that time no validated workflow justified committing to a custom stack. | No-code only; custom app immediately; hybrid/manual then custom | Delayed stack lock until project definition was mature enough. | Superseded on 2026-08-31 |
| 2026-08-30 | Use initial validation targets defined in PRD | Project needs explicit continue/pivot/stop thresholds. | No thresholds; vanity metrics; funnel/transaction metrics | Marketplace behavior matters more than registrations alone. | Provisional—canonical metrics live in `02-PRD.md` |
| 2026-08-31 | Select Next.js as primary web application framework | Stage 0 is complete and implementation needs a stable full-stack framework. | Next.js; React SPA + separate API; other full-stack frameworks | Keeps UI and server-side application logic in one TypeScript codebase and lowers operational complexity. | Active / Founder |
| 2026-08-31 | Use TypeScript for application code | Strong contracts are needed between UI, server logic, and database types. | JavaScript; TypeScript | Reduces schema/API mistakes and works well with generated Supabase types. | Active / Founder |
| 2026-08-31 | Select Supabase as primary backend platform | Project needs managed relational DB and later auth, authorization, storage, and platform services. | Supabase; Firebase; custom PostgreSQL/backend; other BaaS | Supabase provides PostgreSQL and managed services while keeping data relational/exportable. | Active / Founder |
| 2026-08-31 | Use PostgreSQL through Supabase as system-of-record database | Marketplace entities/workflow state are relational. | PostgreSQL; document DB; spreadsheet as permanent system of record | Relational constraints/querying fit profiles, projects, curated matches, contracts, outcomes, and reviews. | Active / Founder |
| 2026-08-31 | Do not create separate custom backend service for initial MVP | Next.js + Supabase meet current server-side needs. | Separate Node/Nest/Express API; browser-only Supabase; Next.js server + Supabase | Avoids unnecessary deployment/auth/networking/maintenance complexity. | Active / Founder |
| 2026-08-31 | Use Next.js server-side code as application orchestration layer | Sensitive operations and integrations should not rely only on browser code. | Browser does everything; separate API; Next.js server-side orchestration | Keeps sensitive logic server-side while preserving a simple architecture. | Active / Founder |
| 2026-08-31 | Require Supabase RLS for browser-accessible private data | Database contains private student/provider/project/match data. | Frontend checks only; server-only DB access; RLS + app authorization | Provides defense in depth against cross-user data exposure. | Active security decision |
| 2026-08-31 | Keep Supabase privileged/service credentials server-only | Privileged credentials can bypass normal user protections. | Expose to client; browser-safe publishable credentials + server-only privileged credentials | Prevents unrestricted DB access from browser code. | Active security decision |
| 2026-08-31 | Bring Supabase schema changes under Git-controlled migrations | Existing schema must evolve reproducibly. | Continue dashboard edits; dumps only; versioned migrations | Makes schema changes reviewable/reproducible and compatible with PR workflow. | Active engineering decision |
| 2026-08-31 | Preserve manual/curated matching despite selecting Next.js + Supabase | Technology decision does not change marketplace-validation strategy. | Open bidding; automated matching; operator-curated matching | Match quality must be validated before automation. | Active product/architecture decision |
| 2026-08-31 | Present up to 3 curated provider options rather than open bidding | Students need choice without recreating broad marketplace bidding. | One provider; up to 3 curated providers; open bidding | Balances choice, learning, and quality control. | Provisional Stage 1–2 decision |
| 2026-08-31 | Use external links instead of direct file uploads initially | Uploads add storage, permission, malware, and retention complexity. | Direct uploads; links only; no assets | Links are sufficient for early matching and avoid a non-core subsystem. | Active Stage 1 scope decision |
| 2026-08-31 | Build product as end-to-end vertical slices | Current schema contains capabilities beyond immediate validation scope. | Build all table-driven features; build by technical layer; vertical slices | Produces testable user value earlier and avoids unused MVP complexity. | Active engineering strategy |
| 2026-08-31 | Treat `02-PRD.md` as canonical for validation metrics | Metrics appear in multiple documents and can drift. | Duplicate everywhere; PRD canonical; Decisions canonical | PRD is the correct product-requirements source for metric definitions. | Active documentation decision |
| 2026-08-31 | Treat `07-SECURITY.md` as canonical for security and academic-integrity policy | Security rules appear across documents. | Duplicate everywhere; Security canonical | Keeps detailed security/policy rules in one maintainable source. | Active documentation decision |
| 2026-08-31 | Treat `09-DECISIONS.md` as canonical for finalized decisions | Major choices need one historical source. | Scatter decisions; one decision log | Prevents silent divergence between planning documents. | Active documentation decision |
| 2026-09-03 | Introduce operator/admin authentication during Stage 1 | Private project-request review needs secure operational access before marketplace-user accounts are justified. | Keep admin review manual outside the app; use service-role admin UI; use Supabase Auth with RLS; introduce all user accounts now | Supabase Auth plus RLS and `public.is_admin()` protects private operational workflows without exposing service-role credentials or adding student/provider auth. | Active security/implementation decision |

---

## Approved Technical Stack

```text
Browser
   ↓
Next.js
   ├── UI
   ├── Server Components
   ├── Server Actions / server-side application logic
   └── Route Handlers where needed
   ↓
Supabase
   ├── PostgreSQL
   ├── Authentication
   ├── Row Level Security
   ├── Storage when justified
   └── Backend platform services
```

### Approved

- Frontend: Next.js
- Language: TypeScript
- Backend application layer: Next.js server-side code
- Backend platform: Supabase
- Database: PostgreSQL
- Authentication: Supabase Auth when authentication enters scope
- Authorization: Supabase RLS plus server/application authorization
- Database change management: version-controlled Supabase migrations
- Source control: Git
- Repository hosting: GitHub
- Primary branches: `main` and `dev`

Operator/admin authentication is now in scope for Stage 1 private operational workflows. Student and provider authentication remains deferred until marketplace-user accounts are justified by the roadmap.

### Explicitly Not Required for Initial MVP

- Separate Express/NestJS backend
- Microservices
- Native mobile app
- Native chat
- Open bidding
- Automated escrow
- AI matching infrastructure

---

## Architecture Consequences

### Next.js

- UI and server-side application code remain in one repository.
- Sensitive operations prefer server-side execution.
- Avoid unnecessary separate API infrastructure.
- Client Components are used only where browser interaction requires them.

### Supabase

- PostgreSQL is system of record.
- Schema changes are version controlled.
- RLS protects browser-accessible private data.
- Privileged credentials remain server-only.
- Admin dashboard reads and writes use authenticated Supabase sessions, RLS, and `public.is_admin()`; they must not use service-role credentials.
- Table existence does not define product scope.

### Manual / Curated Matching

- Existing `proposals` naming must not be interpreted as open bidding.
- Operator review remains part of Stage 1–2.
- Up to 3 curated provider options may be presented.
- Match automation is deferred until manual matching produces evidence.

---

## Current MVP Technical Scope

### Build First

```text
Landing
   ↓
Student project request
   ↓
Supabase record
   ↓
Operator review
   ↓
Provider onboarding / review
   ↓
Curated provider candidate(s)
   ↓
Match outcome
   ↓
Validation reporting
```

### Defer

- Open bidding
- Native chat
- Favorites
- Full review/reputation UI
- Automated escrow
- Complex payment flows
- AI matching
- Native mobile app
- Complex notifications
- Advanced analytics
- Microservices

---

## Current Provisional Assumptions

These are not permanent decisions and must be replaced by evidence.

- Typical first-project price range: USD 50–500 equivalent.
- Target sweet spot: USD 100–300 equivalent.
- First response target: within 12 hours during active operation.
- Shortlist/next-step target: within 24 hours.
- Accepted-match target: within 48 hours where supply exists.
- Initial launch should be limited to one founder-accessible community and 2–3 project categories.
- No raw payment-card data will be stored.
- Initial traffic is small enough for one Next.js application plus Supabase.
- Manual operator involvement is acceptable in Stage 1–2.
- A separate backend service is not required for the first product version.

Canonical metric definitions live in `docs/02-PRD.md`.

---

## Decisions Still Required

### Market / Launch

1. First campus/community or geographic wedge.
2. Primary operating language.
3. Final first 2–3 project categories.
4. Local pricing labels/currency.
5. Launch date and outreach list.
6. Public working name.

### Operations

7. Default student/provider communication channel.
8. Exact Stage 1 operator workflow.
9. Validation-tracker implementation/tool if custom app does not fully replace it.

### Technical

10. Production hosting provider.
11. Transactional email provider.
12. Payment provider.
13. Analytics provider if/when needed.
14. Error-monitoring provider if/when needed.
15. Whether `proposals` should be renamed/refactored for curated matching.
16. Exact point at which Supabase Auth becomes user-facing.
17. Exact point at which direct file uploads become justified.

---

## Decision Rules

When a major choice is made:

1. Update this file.
2. Update the relevant canonical document.
3. Mark old conflicting decisions as `Superseded` rather than deleting history.
4. Record consequences and follow-up work.
5. Do not present provisional assumptions as validated facts.

---

## Decision Template

### YYYY-MM-DD: Decision Title

**Decision:** State the decision.

**Context:** Explain why the decision is needed.

**Options Considered:**

- Option 1
- Option 2
- Option 3

**Rationale:** Explain why this option was chosen.

**Consequences:** Note tradeoffs, risks, and follow-up work.

**Owner:** Name the person or role responsible.

**Status:** Active / Provisional / Superseded.

**Review Date:** Optional date to revisit the decision.

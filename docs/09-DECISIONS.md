# Decisions

> Version: v0.1  
> Use this document to record important product, business, design, technical, and operational decisions.

## Decision Log

| Date | Decision | Context | Options Considered | Rationale | Owner |
| --- | --- | --- | --- | --- | --- |
| 2026-08-30 | Create documentation-only project foundation before implementation | The project is starting as an MVP marketplace for student project work and designer/developer services. | Build immediately; choose stack first; document foundation first | Documentation first keeps the project focused on fast, cheap business-model validation without premature technical commitments | Founder / Codex baseline |
| 2026-08-30 | Validate the marketplace manually before building a full platform | The largest risks are demand, supply, match quality, willingness to pay, and completion—not software scale | Full marketplace; lightweight custom app immediately; manual/concierge validation first | Manual matching produces trustworthy learning fastest and makes later automation evidence-driven | Founder / Codex baseline |
| 2026-08-30 | Focus the first demand hypothesis on university students/student-led teams aged 18+ with legitimate digital projects | A narrow demand segment improves message clarity, trust, and marketplace liquidity | All students; all small businesses; university/student-led projects first | The segment is accessible, has recurring small digital needs, and matches the proposed supply side | Provisional—review after Stage 1 |
| 2026-08-30 | Focus the first supply hypothesis on vetted early-career designers/developers aged 18+ with portfolio evidence | The marketplace needs affordable supply but cannot sacrifice trust | Open enrollment; agencies; established freelancers only; vetted early-career providers | Early-career providers benefit from real projects and may fit student-sized budgets, while manual vetting protects quality | Provisional—review after Stage 1 |
| 2026-08-30 | Prohibit academic-cheating work | Student marketplaces create a clear academic-integrity risk | Allow all requests; disclaimer only; explicit policy + screening + rejection | Protects users, providers, and product legitimacy; keeps focus on legitimate startup, club, portfolio, hackathon, and personal projects | Product policy |
| 2026-08-30 | Do not build open bidding, native chat, automated escrow, advanced AI matching, or a mobile app in the first MVP | These features increase build/security complexity before core marketplace behavior is proven | Build full feature set; build selectively; manual-first | None is required to validate whether students and providers will successfully transact | MVP scope |
| 2026-08-30 | Do not require a platform fee during the earliest demand/match validation; test fee willingness after real paid matches exist | Monetization matters, but premature fees can obscure whether the underlying marketplace works | Commission from day one; subscription; listing fee; fee-free validation then test transaction fee | First prove willingness to pay for the service provider; then test whether the marketplace can capture value | Provisional business hypothesis |
| 2026-08-30 | Use a 10% total take-rate hypothesis for the first fee-sensitivity test, not as a final price | A concrete number is needed for validation without locking the business model | 5%; 10%; 15%+; subscription | 10% is simple enough to test and can later be raised/lowered based on price sensitivity and support cost | Provisional—test before implementation |
| 2026-08-30 | Keep final production architecture undecided and prefer hybrid/manual operations through Stage 1–2 | The project currently has no validated workflow that justifies a custom stack | No-code only; custom app now; hybrid/manual then custom | Preserves speed and learning while leaving a clean path to a custom web app after traction | Architecture principle |
| 2026-08-30 | Use initial validation targets of 20 qualified requests, 30 vetted providers, >=50% viable match rate, >=5 paid completions, and >=20% repeat/referral signal | The team needs explicit thresholds to decide whether to continue, pivot, or stop | No thresholds; vanity metrics; transaction/funnel thresholds | These metrics test the marketplace loop rather than sign-up volume alone | Provisional—revise after first pilot |

## Current Provisional Assumptions

These are **not permanent decisions** and should be replaced by evidence.

- Typical first-project price range: USD 50–500 equivalent.
- Target sweet spot: USD 100–300 equivalent.
- First response target: within 12 hours during active operation.
- Shortlist/next-step target: within 24 hours.
- Accepted-match target: within 48 hours where supply exists.
- Initial launch should be limited to one founder-accessible community and 2–3 project categories.
- No raw payment-card data will be stored by the product.

## Decisions Still Required Before Stage 1 Launch

1. First campus/community or geographic wedge.
2. Primary operating language.
3. First 2–3 project categories.
4. Stage 1 manual tool stack.
5. Default student/provider communication channel.
6. Exact public working name.
7. Local pricing labels/currency.
8. Launch date and outreach list.

## Decision Template

### YYYY-MM-DD: Decision Title

**Decision:** State the decision.

**Context:** Explain why the decision is needed.

**Options Considered:**

- Option 1:
- Option 2:
- Option 3:

**Rationale:** Explain why this option was chosen.

**Consequences:** Note tradeoffs, risks, or follow-up work.

**Owner:** Name the person or role responsible.

**Review Date:** Optional date to revisit the decision.

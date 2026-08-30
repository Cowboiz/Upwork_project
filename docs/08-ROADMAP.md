# Roadmap

> Version: v0.1  
> Roadmap rule: Move through the cheapest validation stages before building heavier marketplace software.

## Roadmap Principle

Every stage should answer a marketplace question.

Do not progress because a feature “feels ready”. Progress when the previous stage produces evidence that justifies more automation.

The core risk order is:

```text
Demand
  ↓
Supply
  ↓
Match quality
  ↓
Willingness to pay
  ↓
Completion/trust
  ↓
Repeat/referral
  ↓
Unit economics
  ↓
Automation
```

## Stage 0: Definition

**Goal:** Clarify the marketplace thesis and first validation experiment.

### Deliverables

- **Vision draft:** Completed as v0.1.
- **Business model hypotheses:** Initial customer, provider, pricing, fee, acquisition, and liquidity assumptions documented.
- **Initial PRD:** Concierge/manual MVP requirements documented.
- **User flows:** Student, provider, matching, completion, admin, and exception flows documented.
- **Risk list:** Trust, payment, provider quality, privacy, academic integrity, seasonality.
- **Decision log:** Provisional choices recorded.
- **First pilot wedge:** Choose the first community and 2–3 project categories.
- **Validation tracker:** Define exactly how requests/providers/matches/outcomes will be recorded.

### Exit Criteria

- **Clear target student segment:** University students/student founders/clubs aged 18+ for legitimate digital projects.
- **Clear provider segment:** Vetted early-career designers/developers aged 18+ with portfolio evidence.
- **Clear first project category:** Founder must choose 2–3 categories before public outreach.
- **Clear success metric:** 20 qualified requests, 30 vetted providers, >=10 accepted matches or >=50% match rate, and >=5 paid completed projects as the initial validation hypothesis.
- **Prohibited-work policy:** Academic-integrity boundary is explicit.

## Stage 1: Manual Validation

**Goal:** Test demand and supply without building a full marketplace.

### Target Duration

Working hypothesis: 2–4 weeks of active outreach, extend to 4–6 weeks if needed to collect enough qualified requests.

### Deliverables

- **Landing or intake page:** Simple explanation + student request form.
- **Provider application form:** Skills, portfolio, availability, rates, policy acceptance.
- **Manual matching tracker:** Spreadsheet/low-code database with request/provider/match/outcome tables.
- **Outreach scripts:** Student and provider outreach.
- **Basic analytics:** Source, response, match, payment, completion.
- **Policy copy:** Privacy note, prohibited academic work, basic process expectations.
- **Operator playbook:** How to review, match, clarify, reject, and follow up.

### Exit Criteria

- **Student requests received:** >=20 qualified requests.
- **Providers onboarded:** >=30 vetted providers, with enough coverage in chosen categories.
- **Matches attempted:** Every qualified request receives a real matching attempt.
- **Match rate:** >=50% viable match or enough evidence to understand why not.
- **Payment or strong willingness-to-pay signal:** >=30% of matched students accept a real paid scope.
- **Paid completions:** Target >=5.
- **Learning:** Top 3 request failure reasons and provider decline reasons are known.

### Stop / Pivot Signals

- Qualified demand is consistently weak despite direct outreach.
- Students repeatedly refuse realistic prices.
- Providers will not accept the available project economics.
- Match quality is poor even with manual curation.
- Academic-integrity risk dominates the request mix.

## Stage 2: Concierge MVP

**Goal:** Run the marketplace manually with enough structure to learn from real transactions.

### Entry Requirement

Stage 1 demonstrates real demand, available supply, and at least some paid matches.

### Possible Deliverables

- **Simple request intake:** Branded, mobile-friendly form.
- **Simple provider directory or tracker:** Restricted operator view with filters.
- **Admin workflow:** New → Reviewed → Matched → In progress → Completed/Cancelled.
- **Status tracking:** Request/provider/match/outcome state.
- **Feedback collection:** Short completion survey.
- **Templated notifications:** Confirmation, provider opportunity, student next step.
- **Basic reporting:** Funnel + match-speed + outcome view.

### Exit Criteria

- **Repeatable match process:** Operator can describe the matching rules and common exceptions.
- **Completed paid projects:** Target cumulative >=10–15.
- **Known quality-control issues:** Major causes of late delivery, mismatch, or dispute identified.
- **Known unit economics:** Typical project value, provider payout, potential fee, and support time understood.
- **Repeat/referral evidence:** >=20% positive repeat/referral signal.
- **Automation candidates:** At least 2–3 repeated operator tasks clearly worth automating.

## Stage 3: Lightweight Product

**Goal:** Automate only workflows that have proven repetitive and valuable.

### Possible Deliverables

- User accounts.
- Student request dashboard.
- Provider profiles.
- Operator/admin dashboard.
- Structured matching workflow.
- Email notifications.
- Integrated payment if justified.
- Lightweight reviews.
- Referral tracking.
- Event/funnel analytics.

### Explicitly Avoid Unless Proven Necessary

- Open bidding marketplace.
- Native real-time chat.
- Complex AI matching.
- Mobile app.
- Advanced freelancer analytics.
- Automated dispute resolution.

### Exit Criteria

- **Consistent acquisition channel:** At least one channel repeatedly brings qualified demand.
- **Reliable provider pool:** Enough active providers for core categories.
- **Positive contribution-margin hypothesis:** Potential take rate can cover payment/support costs.
- **Reduced manual workload:** Product measurably reduces operator time without reducing match quality.
- **Stable completion quality:** Dispute/refund rate remains acceptable.
- **Payment case proven:** Integrated payment solves a real problem rather than being infrastructure for its own sake.

## Stage 4: Marketplace Expansion

Only consider after Stage 3 works.

Potential directions:

- More campuses/communities.
- More project categories.
- Reputation and provider ranking.
- Smarter matching.
- Standardized project packages.
- Provider availability/calendar.
- Referral incentives.
- Managed payments.
- Stronger trust/verification.

Expansion decisions must follow data, not feature ambition.

## Backlog

| Item | Stage | Hypothesis | Priority | Notes |
| --- | --- | --- | --- | --- |
| Choose first pilot community | 0 | A narrow community improves liquidity and learning | P0 | Founder decision required |
| Choose first 2–3 project categories | 0 | Category focus improves provider fit | P0 | Prefer categories with clear deliverables |
| Create student request form | 1 | Structured briefs increase match quality | P0 | Keep short |
| Create provider application | 1 | Manual vetting protects trust | P0 | Portfolio required |
| Create validation tracker | 1 | Funnel/outcome data enables decisions | P0 | Spreadsheet acceptable |
| Write outreach scripts | 1 | Founder-led outreach can generate first liquidity | P0 | Separate demand/supply |
| Create operator matching playbook | 1 | Repeatable rules can emerge before code | P1 | Document decline/failure reasons |
| Branded landing page | 1–2 | Trust improves request conversion | P1 | Do not over-design |
| Basic admin pipeline | 2 | Repetitive manual tracking becomes costly | P1 | Build only after tracker pain appears |
| Automated confirmation emails | 2 | Manual acknowledgments waste time | P1 | Low-risk automation |
| Provider filtering | 2–3 | Manual candidate search becomes slow | P1 | Skills + availability + status |
| User accounts | 3 | Users need self-service when repeat usage emerges | P2 | Not before evidence |
| Integrated payment | 3 | Platform fee/trust justify checkout complexity | P2 | Validate fee first |
| Reviews/reputation | 3 | Repeat matching benefits from quality history | P2 | Manual feedback first |
| Native chat | Later | On-platform communication reduces leakage/friction | P3 | Prove need first |
| AI matching | Later | Sufficient data can improve match ranking | P3 | Data volume first |
| Mobile app | Later | Mobile-specific retention justifies native app | P3 | Web first |

## Open Questions

- **Open Question:** What exact date and community will Stage 1 launch into?
- **Open Question:** Which 2–3 project categories are the first wedge?
- **Open Question:** What manual tool stack will be used for Stage 1?
- **Open Question:** What conversion threshold should trigger Stage 2 custom UI work?

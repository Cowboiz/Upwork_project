# Repository Instructions for Codex

## Project Context

This repository is for an MVP marketplace connecting university students/student-led teams with designers and developers for **legitimate digital project work**.

Primary demand hypothesis:

- University students aged 18+.
- Student founders.
- Student clubs.
- Hackathon teams.
- Personal/portfolio creators.

Primary supply hypothesis:

- Vetted early-career designers and developers aged 18+.
- At least one demonstrable portfolio example.
- Availability for small project-based work.

The primary objective is to validate the marketplace business model as quickly and cheaply as possible.

The marketplace must prove:

1. Demand.
2. Supply.
3. Match quality.
4. Willingness to pay.
5. Completion and trust.
6. Repeat/referral behavior.

## Current Product Strategy

The project is intentionally following this order:

```text
Stage 0: Definition
    ↓
Stage 1: Manual validation
    ↓
Stage 2: Concierge MVP
    ↓
Stage 3: Lightweight product
    ↓
Stage 4: Expansion only if justified
```

Do not skip stages merely because software can be built.

## Source-of-Truth Order

Before making product or implementation changes, inspect the relevant documents.

1. `AGENTS.md` — how Codex must work.
2. `docs/00-VISION.md` — who the product is for and why it exists.
3. `docs/01-BUSINESS-MODEL.md` — marketplace and monetization hypotheses.
4. `docs/02-PRD.md` — current product requirements and scope.
5. `docs/03-USER-FLOWS.md` — intended workflows and exception paths.
6. `docs/04-ARCHITECTURE.md` — architecture status, constraints, and candidates.
7. `docs/05-DATABASE.md` — logical data model.
8. `docs/06-DESIGN-SYSTEM.md` — UX/design rules.
9. `docs/07-SECURITY.md` — privacy, trust, access, and payment constraints.
10. `docs/08-ROADMAP.md` — build/validation sequence.
11. `docs/09-DECISIONS.md` — recorded decisions and provisional assumptions.

If documents conflict, do not silently choose one. Surface the conflict and update `09-DECISIONS.md` when the user resolves it.

## Working Principles

- Do not assume the final technology stack until it has been explicitly decided and recorded.
- Do not initialize a framework unless the user asks for implementation work or the roadmap stage explicitly requires it.
- Do not install packages unless the user explicitly authorizes package installation or the implementation task clearly requires it and approval is available.
- Do not write application source code during documentation or planning tasks.
- Prefer simple, low-cost validation paths over polished platform buildout.
- Keep the MVP narrow: focus on proving demand, supply, matching, trust, fulfillment, willingness to pay, and repeat/referral.
- Treat major product, business, design, and technical choices as decisions to capture in `docs/09-DECISIONS.md`.
- Clearly distinguish `Decision`, `Assumption`, `Hypothesis`, and `Open Question`.
- Never present unvalidated marketplace numbers as factual market evidence.

## Academic Integrity Guardrail

This product must not facilitate academic cheating.

Do not design, implement, or market flows whose purpose is to have another person:

- Complete graded assignments on behalf of a student.
- Take exams or take-home assessments.
- Impersonate a student.
- Produce work intended to be submitted deceptively as the student's own when outside help is prohibited.

Legitimate support may include, when allowed:

- Tutoring.
- Concept explanations.
- Code review.
- Debugging assistance.
- Feedback.
- Practice exercises.
- Non-graded projects.
- Startup, club, portfolio, hackathon, and personal projects.

When a request is ambiguous, design for clarification and operator review rather than automatic acceptance.

## Documentation Conventions

- Keep documents concise, practical, and easy to update.
- Use clear headings, tables, and checklists where useful.
- Mark unresolved items as `Open Question`.
- Mark unvalidated claims as `Assumption` or `Hypothesis`.
- When a decision is made, update the relevant document and add an entry to `docs/09-DECISIONS.md`.
- Prefer validation experiments, measurable outcomes, and learning goals over speculative features.
- Keep metrics consistent across Vision, Business Model, PRD, Roadmap, and Decisions.
- Do not remove context or user-authored notes without reason.

## Engineering Guardrails

Before editing:

1. Inspect existing files.
2. Understand the requested scope.
3. Identify affected documents/code.
4. Preserve unrelated user changes.
5. Check whether the task conflicts with current roadmap stage or recorded decisions.

During implementation:

- Keep changes scoped to the requested task.
- Prefer the smallest complete slice.
- Reuse existing code/components before introducing new abstractions.
- Do not add unrelated tooling, configuration, generated files, or dependencies.
- Do not commit secrets.
- Do not expose private student/provider data.
- Do not store raw payment-card data.
- Enforce authorization server-side when private data exists.
- Use managed authentication/payment/storage when appropriate instead of inventing security-critical systems.

After implementation:

1. Run relevant formatting/lint/type checks.
2. Run relevant tests.
3. Review the final diff.
4. Check privacy/security effects.
5. Check whether documentation or decision log needs updating.
6. Report what changed, verification performed, risks, and unresolved questions.

## Git Guardrails

- Check `git status` before major edits.
- Do not overwrite unrelated uncommitted user changes.
- Keep commits focused.
- Use descriptive commit messages.
- Never commit `.env` files containing secrets.
- Prefer a clean checkpoint before a large refactor or new feature.

## MVP Bias

For every proposed feature, ask:

1. Which marketplace risk does this validate?
2. Can this be tested manually before building software?
3. What is the cheapest version that produces trustworthy evidence?
4. What metric or observation would make us continue, change direction, or stop?
5. Is this feature required now, or is it compensating for a business-process problem we have not yet understood?

If a feature does not help validate or operate the current roadmap stage, default to postponing it.

## Initial Validation Targets

Treat these as **provisional hypotheses**, not verified facts:

- >=20 qualified student requests in the first 4–6 week pilot.
- >=30 vetted providers.
- >=50% of qualified requests reach a viable match.
- >=5 completed paid projects.
- >=30% of matched students agree to a real paid scope.
- >=20% repeat/referral/explicit reuse signal.
- <10% material dispute/refund rate on completed projects.
- First human response target: <12 hours.
- Shortlist/next step target: <24 hours.

Update these after Stage 1 evidence.

## Current Architecture Position

- Final application architecture is not chosen.
- Stage 1 should prefer manual/low-code/hybrid operations.
- Stage 2 may add limited custom UI for repeated workflows.
- Stage 3 may introduce accounts, structured matching, and integrated payments only after evidence justifies them.
- Candidate technologies mentioned in docs are options, not approved dependencies.

## Current Repository State

The repository is documentation-first.

Do not assume application code exists.

Before the first implementation task, confirm:

- The roadmap stage.
- The specific validation objective.
- The chosen first community.
- The chosen first project categories.
- The implementation scope.

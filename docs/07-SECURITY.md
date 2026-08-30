# Security

> Version: v0.1  
> Status: Security and trust baseline for MVP planning. Requirements must be revisited before implementation and before integrated payments.

## Security Status

Security requirements are preliminary but several constraints are already non-negotiable because the product handles private project details, contact information, provider portfolios, and potentially payment metadata.

## Security Principles

- Collect the least personal data needed.
- Limit access to student and provider information.
- Treat project requests and uploaded files as private by default.
- Avoid storing sensitive payment information directly.
- Use reputable third-party services for payments when needed.
- Make trust and safety part of the MVP, not an afterthought.
- Give admin/operator accounts stronger protection than normal public users.
- Keep secrets out of source control.
- Record enough operational history to investigate disputes without collecting unnecessary private content.
- Reject prohibited academic-integrity work before matching.

## Data Classification

### Public

- Marketing copy.
- Product help/FAQ.
- Public provider profile fields only if the provider explicitly opts in.
- Public portfolio links already intentionally published by the provider.

### Internal

- Student request metadata.
- Provider applications.
- Match notes.
- Internal quality/review notes.
- Operational analytics.
- Acquisition source.

### Sensitive

- Contact details.
- Private project descriptions.
- Uploaded project files.
- Payment status/references.
- Dispute details.
- Internal fraud or trust notes.

Sensitive data must never be exposed through public pages or guessable URLs.

## Key Risks

- **Exposure of student personal information:** Private request/contact data leaks through a public page, log, or misconfigured database.
- **Exposure of project files:** Uploads are stored publicly or shared beyond intended participants.
- **Provider fraud or impersonation:** Fake identity, copied portfolio, misrepresented skill.
- **Student non-payment:** Work begins without a clear payment/scope agreement.
- **Provider non-delivery:** Provider disappears, misses deadline, or delivers materially different scope.
- **Payment disputes:** Scope and expectations are not documented.
- **Academic integrity concerns:** User requests prohibited completion of graded work or assessment impersonation.
- **Admin-account compromise:** One operator account may expose the entire early dataset.
- **Secret leakage:** API keys or service credentials committed to Git.

## Access Control

### Who can view student requests?

- The student who submitted the request once user accounts exist.
- Authorized marketplace operator/admin.
- A provider only after the operator intentionally shares the minimum necessary brief.
- Private contact details should not be exposed to providers before introduction is approved.

### Who can view provider profiles?

- Operator/admin can view full application.
- Students may see curated public/opt-in fields.
- Private contact information remains restricted until a match/introduction is approved.

### Who can create matches?

- Operator/admin during Stage 1–2.
- Later, controlled system actions may create candidate matches, but final sharing should respect permissions.

### Who can view payment or dispute details?

- Operator/admin.
- Relevant student/provider only for their own transaction once accounts exist.
- Never public.

## Authentication and Admin Security

Before a custom app is used with real data:

- Use managed authentication rather than building password storage from scratch.
- Require strong passwords or passwordless managed auth.
- Enable MFA for admin/operator accounts where supported.
- Separate admin authorization from normal user authentication.
- Default-deny private routes and data.
- Protect against insecure direct object reference by checking ownership/role server-side.
- Do not rely on hidden UI elements as authorization.
- Use short-lived/signed links for private files where possible.

## Trust and Safety Requirements

- **Provider review process:** Portfolio check, skill fit, communication quality, current availability, policy acceptance.
- **Student expectations:** Honest project description, realistic budget/deadline, no prohibited academic work, respectful conduct.
- **Scope clarity:** Record deliverables, price, deadline, revisions/change process before work begins.
- **Dispute handling:** Collect facts, preserve minimum necessary evidence, document outcome and root cause.
- **Prohibited work policy:** Do not facilitate completion of graded assignments, exams, take-home assessments, impersonation, credential fraud, or other dishonest academic behavior. Allowed support can include tutoring, explanations, feedback, debugging, practice, and legitimate non-graded projects.

## File Security

If file uploads are added:

- Store files privately.
- Validate file type and size.
- Do not execute uploaded files.
- Use malware scanning if risk/volume justifies it.
- Use randomized object keys.
- Prefer signed/expiring download links.
- Do not expose storage bucket paths as public browsing.
- Delete files when no longer needed according to retention policy.

## Payment Security

- **Payment provider candidates:** Use a reputable provider appropriate to launch geography, such as Stripe where supported; final choice remains open.
- **Data not to store:** Raw card number, CVV, full magnetic-stripe data, payment passwords, bank login credentials.
- **Refund handling:** Manual documented process initially; later use payment-provider APIs and policy.
- **Chargeback handling:** Preserve scope agreement, delivery evidence, transaction reference, and communication notes; follow provider process.
- **Marketplace funds:** Do not manually hold client funds in personal accounts as a substitute for proper marketplace payment infrastructure.

## Secrets and Development Security

When implementation begins:

- Use `.env.example` with placeholder names only.
- Keep `.env*` containing secrets out of Git.
- Rotate any leaked secret immediately.
- Use least-privilege service keys.
- Do not send production secrets to client-side code.
- Review dependencies before adding them.
- Run lint/typecheck/tests before merge.
- Keep production admin tools behind authentication/authorization.

## MVP Security Checklist

- [ ] Private request data is not publicly accessible.
- [ ] Provider private contact information is not publicly accessible.
- [ ] Raw payment card data is never stored.
- [ ] Uploaded files are not public by default.
- [ ] Admin access uses managed authentication and MFA where supported.
- [ ] Server-side authorization protects private records.
- [ ] Secrets are excluded from Git.
- [ ] Academic-integrity confirmation exists in request flow.
- [ ] Provider policy acceptance exists.
- [ ] Scope, price, and deadline are recorded before project start.
- [ ] Dispute notes are restricted.
- [ ] Data deletion request process exists.
- [ ] Production data is backed up/exportable once a real database is used.

## Open Questions

- **Open Question:** Which launch jurisdiction determines privacy, payment, and marketplace obligations?
- **Open Question:** What identity verification is proportionate for the pilot?
- **Open Question:** Will Stage 1 accept file uploads or only links to reduce security risk?
- **Open Question:** Which payment provider supports the required marketplace model in the launch region?
- **Open Question:** What exact data-retention period is appropriate?

# Database

> Version: v0.1  
> Status: Logical data model only. Database technology is intentionally undecided.

## Database Status

No database technology has been selected yet.

This document defines the minimum data concepts needed to operate and validate the marketplace. The same concepts can initially live in a spreadsheet/low-code database and later migrate to a relational database.

## Data Principles

- Collect only data needed for validation and operations.
- Keep data exportable.
- Protect personal and project information.
- Prefer simple schemas that can evolve.
- Separate public provider information from private contact/operational notes.
- Do not store raw card data, CVV, passwords in plain text, government IDs unless explicitly required later, or unnecessary sensitive information.
- Record acquisition source and failure reason because they are essential for marketplace learning.
- Use generated IDs instead of email/phone as primary keys.

## Core Entities

### Student

- **ID:** Unique generated identifier.
- **Name:** Required.
- **Contact:** Required; private.
- **School or context:** Optional.
- **Age eligibility confirmation:** Boolean/attestation for adult-only pilot.
- **Created at:** Timestamp.
- **Source channel:** Acquisition source.
- **Consent/privacy acknowledged at:** Timestamp.
- **Status:** Active, Inactive, Blocked.
- **Notes:** Internal; avoid unnecessary sensitive details.

### Project Request

- **ID:** Unique identifier.
- **Student ID:** Foreign-key/reference to Student.
- **Project type:** Controlled category + optional Other.
- **Title:** Short internal/user-facing summary.
- **Description:** Required.
- **Desired deliverables:** Optional structured text.
- **Deadline:** Date or flexible flag.
- **Budget range:** Controlled range.
- **Currency/local price context:** Optional.
- **Status:** New, Reviewed, Matched, In progress, Completed, Cancelled.
- **Integrity attestation:** Confirmation request is permitted.
- **Integrity review status:** Clear, Needs review, Rejected.
- **Created at:** Timestamp.
- **Reviewed at:** Timestamp.
- **Source channel:** Acquisition source.
- **File/link references:** Optional; private.
- **Cancellation/rejection reason:** Optional structured reason.
- **Notes:** Internal.

### Provider

- **ID:** Unique identifier.
- **Name/display name:** Required.
- **Contact:** Required; private.
- **Skills:** Controlled tags + optional notes.
- **Portfolio:** One or more links.
- **Availability:** Current capacity/next available date.
- **Preferred project types:** Controlled categories.
- **Rate expectations:** Range/minimum project value.
- **Time zone/location:** Optional.
- **Status:** New, Approved, Waitlisted, Rejected, Inactive.
- **Review notes:** Internal.
- **Created at:** Timestamp.
- **Approved at:** Timestamp.
- **Source channel/referrer:** Acquisition source.
- **Policy accepted at:** Timestamp.
- **Public-profile opt in:** Boolean.
- **Notes:** Internal.

### Match

- **ID:** Unique identifier.
- **Project request ID:** Reference to Project Request.
- **Provider ID:** Reference to Provider.
- **Status:** Proposed, Accepted, Declined, Withdrawn, In progress, Completed, Disputed.
- **Proposed at:** Timestamp.
- **Provider responded at:** Timestamp.
- **Accepted at:** Timestamp.
- **Student decision at:** Timestamp.
- **Declined by:** Student or Provider.
- **Declined reason:** Controlled reason + optional detail.
- **Proposed price:** Optional.
- **Agreed price:** Optional.
- **Currency:** Optional.
- **Agreed deadline:** Optional.
- **Scope summary:** Optional concise text.
- **Notes:** Internal.

### Project Outcome

- **ID:** Unique identifier.
- **Match ID:** Reference to accepted Match.
- **Final status:** Completed, Cancelled, Refunded, Disputed, Abandoned.
- **Final price:** Amount.
- **Platform fee:** Amount, zero during fee-free validation if applicable.
- **Payment status:** Not started, Agreed, Paid, Partially paid, Refunded, Chargeback/disputed.
- **Payment provider/reference:** Optional non-sensitive reference only.
- **Completion date:** Optional date.
- **On-time:** Boolean/unknown.
- **Student feedback:** Short text.
- **Student rating:** Optional 1–5 if collected.
- **Provider feedback:** Short text.
- **Provider rating:** Optional 1–5 if collected.
- **Repeat intent:** Yes, No, Unknown.
- **Referral created:** Boolean/unknown.
- **Dispute notes:** Restricted internal text.
- **Root-cause category:** Optional structured failure reason.

## Optional Supporting Entities

Only create these when the operating process needs them.

### Activity / Status History

- Entity type.
- Entity ID.
- Previous status.
- New status.
- Changed at.
- Changed by.
- Note.

### Communication Log

Do not store full private message content unless necessary.

- Related request/match ID.
- Channel.
- Direction.
- Sent at.
- Template/type.
- Outcome/response received.

## Status Definitions

### Request Status

- **New:** Submitted and not yet reviewed.
- **Reviewed:** Checked for policy, clarity, budget, deadline, and basic fit.
- **Matched:** At least one provider has been accepted by the student.
- **In progress:** Work has started with an accepted provider.
- **Completed:** Work outcome confirmed.
- **Cancelled:** Request stopped, rejected, expired, or no longer needed. Record reason.

### Provider Status

- **New:** Application not reviewed.
- **Approved:** Eligible to receive opportunities.
- **Waitlisted:** Potentially suitable but not currently needed or missing a non-critical requirement.
- **Rejected:** Not suitable for the pilot. Record a non-sensitive reason.
- **Inactive:** Previously approved but unavailable or unresponsive.

### Match Status

- **Proposed:** Provider is being considered/contacted.
- **Accepted:** Student and provider have agreed to proceed.
- **Declined:** One side declined; record who and why.
- **Withdrawn:** Opportunity removed before acceptance.
- **In progress:** Work has started.
- **Completed:** Work delivered and outcome recorded.
- **Disputed:** Material disagreement requires review.

## Privacy and Retention

- **Personal data collected:** Name, contact, optional school/context, provider portfolio, availability, project details, operator notes.
- **Sensitive data to avoid:** Raw card data, CVV, account passwords, unnecessary government identifiers, health data, academic records, private data unrelated to the project.
- **Project files:** Treat as private by default; do not expose through public URLs.
- **Retention policy:** Working hypothesis: retain active operational records while needed, review inactive personal data after 12 months, and anonymize/delete where no longer needed, subject to legal/accounting obligations.
- **Deletion process:** Provide a manual deletion request path during MVP; complete deletion/anonymization within a reasonable operational window (working target: 30 days) unless retention is legally required.
- **Access:** Only operator/admin roles should access private request, contact, payment, or dispute data.

## Reporting Needs

- Requests by source.
- Requests by project type.
- Requests by budget band.
- Requests rejected for policy/fit.
- Provider count by skill and availability.
- Provider response rate.
- Candidate-to-match conversion.
- Match rate.
- Time to first response.
- Time to accepted match.
- Payment conversion.
- Completion rate.
- Dispute/refund rate.
- Repeat/referral rate.
- Failure reasons.
- Contribution/fee data once monetization is tested.

## Open Questions

- **Open Question:** Which fields are genuinely necessary in the first form versus follow-up?
- **Open Question:** Which low-code data store should hold Stage 1 records?
- **Open Question:** When the custom app begins, should the relational schema use separate auth-user and marketplace-profile records?
- **Open Question:** What retention period is legally and operationally appropriate in the launch jurisdiction?

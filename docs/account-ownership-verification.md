# Account Ownership Verification

Phase: 5.2D

Purpose: verify that authenticated ownership reads work without broadening
normal-user mutation access or auto-claiming historical rows.

## RLS Verification Plan

Run against a non-production development database after applying
`20261001163117_phase5_account_ownership_select_policies.sql`.

Use synthetic profiles and intake rows only. Do not use real contact values.

Expected checks:

1. Student A can select a `project_requests` row where
   `linked_student_profile_id = auth.uid()`.
2. Student B cannot select Student A's linked `project_requests` row.
3. Provider A can select a `provider_applications` row where
   `linked_provider_profile_id = auth.uid()`.
4. Provider B cannot select Provider A's linked `provider_applications` row.
5. Anonymous requests cannot select private owned intake rows.
6. Admin access through the existing admin workflow remains available.

## Mutation Boundary

Phase 5.2D does not add normal-user `INSERT`, `UPDATE`, or `DELETE` policies
for `project_requests` or `provider_applications`. Public intake continues
through the existing controlled server actions.

## Historical Records

Historical rows are not claimed by email, name, contact value, username, or any
other weak identifier. Existing anonymous rows remain anonymous until a future
explicit claiming design exists.

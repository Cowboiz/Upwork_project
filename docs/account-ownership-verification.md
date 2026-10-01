# Account Ownership Verification

Phase: 5.2D

Purpose: verify that authenticated ownership reads work without broadening
normal-user mutation access or auto-claiming historical rows.

## RPC Verification Plan

Run against a non-production development database after applying
`20261001163117_phase5_account_ownership_select_policies.sql`.

Use synthetic profiles and intake rows only. Do not use real contact values.

Expected checks:

1. Student A can execute `public.get_my_project_requests()` and receive only
   rows where `linked_student_profile_id = auth.uid()`.
2. Student B can execute `public.get_my_project_requests()` and receives no
   Student A records.
3. Provider A can execute `public.get_my_provider_applications()` and receive
   only rows where `linked_provider_profile_id = auth.uid()`.
4. Provider B can execute `public.get_my_provider_applications()` and receives
   no Provider A records.
5. Anonymous callers cannot execute either RPC.
6. The RPC signatures accept no ownership or user ID parameters.
7. Operator-only columns such as `internal_notes`, `reviewed_by`, and contact
   values are not present in either RPC return type.
8. Admin access through the existing admin workflow remains available.

## Safe Read Boundary

Phase 5.2D does not grant normal users direct base-table `SELECT` policies on
`project_requests` or `provider_applications`. Owner reads are exposed only
through SECURITY DEFINER RPCs with explicit safe return columns:

- `public.get_my_project_requests()`
- `public.get_my_provider_applications()`

## Mutation Boundary

Phase 5.2D does not add normal-user `INSERT`, `UPDATE`, or `DELETE` policies
for `project_requests` or `provider_applications`. Public intake continues
through the existing controlled server actions.

## Historical Records

Historical rows are not claimed by email, name, contact value, username, or any
other weak identifier. Existing anonymous rows remain anonymous until a future
explicit claiming design exists.

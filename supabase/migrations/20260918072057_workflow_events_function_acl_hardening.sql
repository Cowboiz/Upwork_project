-- Trigger-only helper functions must not be callable directly.

revoke all privileges
on function public.record_project_request_workflow_event()
from public, anon, authenticated, service_role;

revoke all privileges
on function public.record_provider_application_workflow_event()
from public, anon, authenticated, service_role;

revoke all privileges
on function public.record_request_candidate_workflow_event()
from public, anon, authenticated, service_role;

revoke all privileges
on function public.record_project_engagement_workflow_event()
from public, anon, authenticated, service_role;


-- Explicit admin operation:
-- callable by authenticated users, but authorization is still enforced
-- inside the function with public.is_admin().

revoke all privileges
on function public.mark_request_candidate_contacted(uuid, uuid)
from public, anon, authenticated, service_role;

grant execute
on function public.mark_request_candidate_contacted(uuid, uuid)
to authenticated;
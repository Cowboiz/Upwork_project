revoke execute
on function public.record_project_request_workflow_event()
from PUBLIC, anon, authenticated, service_role;

revoke execute
on function public.record_provider_application_workflow_event()
from PUBLIC, anon, authenticated, service_role;

revoke execute
on function public.record_request_candidate_workflow_event()
from PUBLIC, anon, authenticated, service_role;

revoke execute
on function public.record_project_engagement_workflow_event()
from PUBLIC, anon, authenticated, service_role;

revoke execute
on function public.mark_request_candidate_contacted(uuid, uuid)
from PUBLIC, anon, authenticated, service_role;

grant execute
on function public.mark_request_candidate_contacted(uuid, uuid)
to authenticated;
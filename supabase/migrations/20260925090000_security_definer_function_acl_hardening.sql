-- Phase 3.3A: reduce direct execution of SECURITY DEFINER helper functions.
-- Trigger execution of public.handle_new_user() remains controlled by the
-- existing auth.users trigger; the function is not intended as an RPC.

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;
revoke all on function public.handle_new_user() from service_role;

revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated, service_role;

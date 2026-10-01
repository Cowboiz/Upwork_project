create policy "Users can read own linked project requests"
on public.project_requests
for select
to authenticated
using (linked_student_profile_id = (select auth.uid()));

create policy "Users can read own linked provider applications"
on public.provider_applications
for select
to authenticated
using (linked_provider_profile_id = (select auth.uid()));

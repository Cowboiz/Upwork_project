grant select on table public.profiles to authenticated;

create policy "Authenticated users can read own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

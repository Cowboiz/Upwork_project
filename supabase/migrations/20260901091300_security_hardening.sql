create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles
    where public.profiles.id = auth.uid()
      and public.profiles.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;

alter table public.profiles
  drop constraint profiles_role_check,
  add constraint profiles_role_check
    check (role = any (array['student'::text, 'freelancer'::text, 'both'::text, 'admin'::text]));

drop policy if exists "Freelancers submit proposals" on public.proposals;
drop policy if exists "Freelancers edit pending proposals" on public.proposals;
drop trigger if exists on_proposal_created on public.proposals;
drop function if exists public.handle_new_proposal();
drop function if exists public.accept_proposal(uuid);

drop policy if exists "Users upload own avatar" on storage.objects;

drop policy if exists "Profiles are publicly readable" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;

drop policy if exists "Projects visibility" on public.projects;
drop policy if exists "Users create own projects" on public.projects;
drop policy if exists "Owners update projects" on public.projects;
drop policy if exists "Owners delete unfinished projects" on public.projects;

drop policy if exists "Proposal participants can view" on public.proposals;
drop policy if exists "Contract participants can view" on public.contracts;

drop policy if exists "Conversation participants can view" on public.conversations;
drop policy if exists "Participants read messages" on public.messages;
drop policy if exists "Participants send messages" on public.messages;

drop policy if exists "Users create own favorites" on public.favorites;
drop policy if exists "Users delete own favorites" on public.favorites;
drop policy if exists "Users read own favorites" on public.favorites;

drop policy if exists "Reviews are public" on public.reviews;
drop policy if exists "Contract participants create reviews" on public.reviews;

drop policy if exists "Freelancer profiles are public" on public.freelancer_profiles;
drop policy if exists "Users create own freelancer profile" on public.freelancer_profiles;
drop policy if exists "Users update own freelancer profile" on public.freelancer_profiles;

drop policy if exists "Portfolio items are public" on public.portfolio_items;
drop policy if exists "Users create own portfolio" on public.portfolio_items;
drop policy if exists "Users update own portfolio" on public.portfolio_items;
drop policy if exists "Users delete own portfolio" on public.portfolio_items;

drop policy if exists "Profile skills are public" on public.profile_skills;
drop policy if exists "Users add own skills" on public.profile_skills;
drop policy if exists "Users update own skills" on public.profile_skills;
drop policy if exists "Users delete own skills" on public.profile_skills;

drop policy if exists "Users read own notifications" on public.notifications;
drop policy if exists "Users update own notifications" on public.notifications;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.projects from anon, authenticated;
revoke all on table public.proposals from anon, authenticated;
revoke all on table public.contracts from anon, authenticated;
revoke all on table public.freelancer_profiles from anon, authenticated;
revoke all on table public.portfolio_items from anon, authenticated;
revoke all on table public.profile_skills from anon, authenticated;
revoke all on table public.project_skills from anon, authenticated;
revoke all on table public.conversations from anon, authenticated;
revoke all on table public.messages from anon, authenticated;
revoke all on table public.favorites from anon, authenticated;
revoke all on table public.reviews from anon, authenticated;
revoke all on table public.notifications from anon, authenticated;

revoke all on table public.skills from anon, authenticated;
grant select on table public.skills to anon, authenticated;

grant select, insert, update, delete on table public.project_requests to authenticated;
grant select, insert, update, delete on table public.provider_applications to authenticated;
grant select, insert, update, delete on table public.request_candidates to authenticated;
grant select, insert, update, delete on table public.project_engagements to authenticated;

create policy "Admins can manage project requests"
  on public.project_requests
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can manage provider applications"
  on public.provider_applications
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can manage request candidates"
  on public.request_candidates
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can manage project engagements"
  on public.project_engagements
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

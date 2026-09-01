SET local check_function_bodies = off;

CREATE TABLE "public"."contracts" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "project_id"    uuid                     NOT NULL,
  "proposal_id"   uuid                     NOT NULL,
  "student_id"    uuid                     NOT NULL,
  "freelancer_id" uuid                     NOT NULL,
  "agreed_amount" numeric(12,2)            NOT NULL,
  "currency"      character(3)             NOT NULL DEFAULT 'USD'::bpchar,
  "status"        text                     NOT NULL DEFAULT 'active'::text,
  "started_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "completed_at"  timestamp with time zone,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "contracts_check" CHECK ((student_id <> freelancer_id)),
  CONSTRAINT "contracts_pkey" PRIMARY KEY (id),
  CONSTRAINT "contracts_project_id_key" UNIQUE (project_id),
  CONSTRAINT "contracts_proposal_id_key" UNIQUE (proposal_id),
  CONSTRAINT "contracts_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'submitted'::text, 'completed'::text, 'cancelled'::text, 'disputed'::text])))
);

ALTER TABLE "public"."contracts"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."conversations" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "proposal_id"   uuid                     NOT NULL,
  "project_id"    uuid                     NOT NULL,
  "student_id"    uuid                     NOT NULL,
  "freelancer_id" uuid                     NOT NULL,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "conversations_check" CHECK ((student_id <> freelancer_id)),
  CONSTRAINT "conversations_pkey" PRIMARY KEY (id),
  CONSTRAINT "conversations_proposal_id_key" UNIQUE (proposal_id)
);

ALTER TABLE "public"."conversations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."favorites" (
  "student_id"    uuid                     NOT NULL,
  "freelancer_id" uuid                     NOT NULL,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "favorites_check" CHECK ((student_id <> freelancer_id)),
  CONSTRAINT "favorites_pkey" PRIMARY KEY (student_id, freelancer_id)
);

ALTER TABLE "public"."favorites"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."freelancer_profiles" (
  "user_id"          uuid                     NOT NULL,
  "headline"         text,
  "hourly_rate"      numeric(12,2),
  "availability"     text                     NOT NULL DEFAULT 'available'::text,
  "years_experience" smallint,
  "website_url"      text,
  "github_url"       text,
  "is_verified"      boolean                  NOT NULL DEFAULT false,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "freelancer_profiles_availability_check" CHECK ((availability = ANY (ARRAY['available'::text, 'busy'::text, 'unavailable'::text]))),
  CONSTRAINT "freelancer_profiles_pkey" PRIMARY KEY (user_id),
  CONSTRAINT "freelancer_profiles_years_experience_check" CHECK ((years_experience >= 0))
);

ALTER TABLE "public"."freelancer_profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."messages" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "conversation_id" uuid                     NOT NULL,
  "sender_id"       uuid                     NOT NULL,
  "body"            text,
  "attachment_url"  text,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "messages_check" CHECK (((body IS NOT NULL) OR (attachment_url IS NOT NULL))),
  CONSTRAINT "messages_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."messages"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."notifications" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid                     NOT NULL,
  "type"       text                     NOT NULL,
  "payload"    jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "read_at"    timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "notifications_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."notifications"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."portfolio_items" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"     uuid                     NOT NULL,
  "title"       text                     NOT NULL,
  "description" text,
  "media_url"   text,
  "project_url" text,
  "sort_order"  integer                  NOT NULL DEFAULT 0,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "portfolio_items_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."portfolio_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profile_skills" (
  "user_id"     uuid     NOT NULL,
  "skill_id"    uuid     NOT NULL,
  "proficiency" smallint,
  CONSTRAINT "profile_skills_pkey" PRIMARY KEY (user_id, skill_id),
  CONSTRAINT "profile_skills_proficiency_check" CHECK (((proficiency >= 1) AND (proficiency <= 5)))
);

ALTER TABLE "public"."profile_skills"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "id"          uuid                     NOT NULL,
  "username"    text,
  "full_name"   text,
  "avatar_url"  text,
  "role"        text                     NOT NULL DEFAULT 'student'::text,
  "bio"         text,
  "school_name" text,
  "location"    text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id),
  CONSTRAINT "profiles_role_check" CHECK ((role = ANY (ARRAY['student'::text, 'freelancer'::text, 'both'::text]))),
  CONSTRAINT "profiles_username_key" UNIQUE (username)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."project_skills" (
  "project_id" uuid NOT NULL,
  "skill_id"   uuid NOT NULL,
  CONSTRAINT "project_skills_pkey" PRIMARY KEY (project_id, skill_id)
);

ALTER TABLE "public"."project_skills"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."projects" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "student_id"  uuid                     NOT NULL,
  "title"       text                     NOT NULL,
  "description" text                     NOT NULL,
  "category"    text                     NOT NULL,
  "budget_type" text                     NOT NULL DEFAULT 'fixed'::text,
  "budget_min"  numeric(12,2),
  "budget_max"  numeric(12,2),
  "currency"    character(3)             NOT NULL DEFAULT 'USD'::bpchar,
  "deadline"    date,
  "status"      text                     NOT NULL DEFAULT 'draft'::text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "projects_budget_type_check" CHECK ((budget_type = ANY (ARRAY['fixed'::text, 'hourly'::text]))),
  CONSTRAINT "projects_category_check" CHECK ((category = ANY (ARRAY['design'::text, 'development'::text, 'other'::text]))),
  CONSTRAINT "projects_check" CHECK (((budget_min IS NULL) OR (budget_max IS NULL) OR (budget_min <= budget_max))),
  CONSTRAINT "projects_pkey" PRIMARY KEY (id),
  CONSTRAINT "projects_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'open'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))
);

ALTER TABLE "public"."projects"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."proposals" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "project_id"     uuid                     NOT NULL,
  "freelancer_id"  uuid                     NOT NULL,
  "cover_letter"   text                     NOT NULL,
  "proposed_price" numeric(12,2)            NOT NULL,
  "currency"       character(3)             NOT NULL DEFAULT 'USD'::bpchar,
  "estimated_days" integer,
  "status"         text                     NOT NULL DEFAULT 'pending'::text,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "proposals_estimated_days_check" CHECK ((estimated_days > 0)),
  CONSTRAINT "proposals_pkey" PRIMARY KEY (id),
  CONSTRAINT "proposals_project_id_freelancer_id_key" UNIQUE (project_id, freelancer_id),
  CONSTRAINT "proposals_proposed_price_check" CHECK ((proposed_price >= (0)::numeric)),
  CONSTRAINT "proposals_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'withdrawn'::text])))
);

ALTER TABLE "public"."proposals"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."reviews" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "contract_id" uuid                     NOT NULL,
  "reviewer_id" uuid                     NOT NULL,
  "reviewee_id" uuid                     NOT NULL,
  "rating"      smallint                 NOT NULL,
  "comment"     text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "reviews_check" CHECK ((reviewer_id <> reviewee_id)),
  CONSTRAINT "reviews_contract_id_reviewer_id_key" UNIQUE (contract_id, reviewer_id),
  CONSTRAINT "reviews_pkey" PRIMARY KEY (id),
  CONSTRAINT "reviews_rating_check" CHECK (((rating >= 1) AND (rating <= 5)))
);

ALTER TABLE "public"."reviews"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."skills" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"       text                     NOT NULL,
  "category"   text                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "skills_category_check" CHECK ((category = ANY (ARRAY['design'::text, 'development'::text, 'other'::text]))),
  CONSTRAINT "skills_name_key" UNIQUE (name),
  CONSTRAINT "skills_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."skills"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.accept_proposal (
  p_proposal_id uuid
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_proposal public.proposals%rowtype;
  v_project public.projects%rowtype;
  v_contract_id uuid;
begin

  select *
  into v_proposal
  from public.proposals
  where id = p_proposal_id
  for update;

  if not found then
    raise exception 'Proposal not found';
  end if;


  select *
  into v_project
  from public.projects
  where id = v_proposal.project_id
  for update;


  if v_project.student_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;


  if v_project.status <> 'open' then
    raise exception 'Project is not open';
  end if;


  if v_proposal.status <> 'pending' then
    raise exception 'Proposal is not pending';
  end if;


  update public.proposals
  set
    status = 'accepted',
    updated_at = now()
  where id = p_proposal_id;


  update public.proposals
  set
    status = 'rejected',
    updated_at = now()
  where project_id = v_project.id
    and id <> p_proposal_id
    and status = 'pending';


  insert into public.contracts (
    project_id,
    proposal_id,
    student_id,
    freelancer_id,
    agreed_amount,
    currency
  )
  values (
    v_project.id,
    v_proposal.id,
    v_project.student_id,
    v_proposal.freelancer_id,
    v_proposal.proposed_price,
    v_proposal.currency
  )
  returning id into v_contract_id;


  update public.projects
  set
    status = 'in_progress',
    updated_at = now()
  where id = v_project.id;


  return v_contract_id;

end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_proposal()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_student_id uuid;
begin

  select student_id
  into v_student_id
  from public.projects
  where id = new.project_id;


  insert into public.conversations (
    proposal_id,
    project_id,
    student_id,
    freelancer_id
  )
  values (
    new.id,
    new.project_id,
    v_student_id,
    new.freelancer_id
  );

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  insert into public.profiles (
    id,
    full_name,
    avatar_url
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

ALTER TABLE "public"."messages"
  ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."contracts"
  ADD CONSTRAINT "contracts_freelancer_id_fkey" FOREIGN KEY (freelancer_id) REFERENCES public.profiles(id);

ALTER TABLE "public"."contracts"
  ADD CONSTRAINT "contracts_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.profiles(id);

ALTER TABLE "public"."conversations"
  ADD CONSTRAINT "conversations_freelancer_id_fkey" FOREIGN KEY (freelancer_id) REFERENCES public.profiles(id);

ALTER TABLE "public"."conversations"
  ADD CONSTRAINT "conversations_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.profiles(id);

ALTER TABLE "public"."favorites"
  ADD CONSTRAINT "favorites_freelancer_id_fkey" FOREIGN KEY (freelancer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."favorites"
  ADD CONSTRAINT "favorites_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."freelancer_profiles"
  ADD CONSTRAINT "freelancer_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."messages"
  ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES public.profiles(id);

ALTER TABLE "public"."notifications"
  ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."portfolio_items"
  ADD CONSTRAINT "portfolio_items_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."profile_skills"
  ADD CONSTRAINT "profile_skills_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."contracts"
  ADD CONSTRAINT "contracts_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id);

ALTER TABLE "public"."conversations"
  ADD CONSTRAINT "conversations_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE "public"."project_skills"
  ADD CONSTRAINT "project_skills_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE "public"."projects"
  ADD CONSTRAINT "projects_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."proposals"
  ADD CONSTRAINT "proposals_freelancer_id_fkey" FOREIGN KEY (freelancer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."contracts"
  ADD CONSTRAINT "contracts_proposal_id_fkey" FOREIGN KEY (proposal_id) REFERENCES public.proposals(id);

ALTER TABLE "public"."conversations"
  ADD CONSTRAINT "conversations_proposal_id_fkey" FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE CASCADE;

ALTER TABLE "public"."proposals"
  ADD CONSTRAINT "proposals_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_contract_id_fkey" FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;

ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_reviewee_id_fkey" FOREIGN KEY (reviewee_id) REFERENCES public.profiles(id);

ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id);

ALTER TABLE "public"."profile_skills"
  ADD CONSTRAINT "profile_skills_skill_id_fkey" FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE;

ALTER TABLE "public"."project_skills"
  ADD CONSTRAINT "project_skills_skill_id_fkey" FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE;

CREATE INDEX contracts_freelancer_id_idx ON public.contracts USING btree (freelancer_id);

CREATE INDEX contracts_student_id_idx ON public.contracts USING btree (student_id);

CREATE INDEX conversations_freelancer_id_idx ON public.conversations USING btree (freelancer_id);

CREATE INDEX conversations_student_id_idx ON public.conversations USING btree (student_id);

CREATE INDEX messages_conversation_created_idx ON public.messages USING btree (conversation_id, created_at);

CREATE INDEX notifications_user_created_idx ON public.notifications USING btree (user_id, created_at DESC);

CREATE INDEX projects_status_created_at_idx ON public.projects USING btree (status, created_at DESC);

CREATE INDEX projects_student_id_idx ON public.projects USING btree (student_id);

CREATE INDEX proposals_freelancer_id_idx ON public.proposals USING btree (freelancer_id);

CREATE INDEX proposals_project_id_idx ON public.proposals USING btree (project_id);

CREATE INDEX proposals_project_status_idx ON public.proposals USING btree (project_id, status);

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER contracts_set_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER freelancer_profiles_set_updated_at
  BEFORE UPDATE ON public.freelancer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER portfolio_items_set_updated_at
  BEFORE UPDATE ON public.portfolio_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER on_proposal_created
  AFTER INSERT ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_proposal();

CREATE TRIGGER proposals_set_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER reviews_set_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Contract participants can view" ON "public"."contracts"
  FOR SELECT
  TO "authenticated"
  USING (((student_id = ( SELECT auth.uid() AS uid)) OR (freelancer_id = ( SELECT auth.uid() AS uid))));

CREATE POLICY "Conversation participants can view" ON "public"."conversations"
  FOR SELECT
  TO "authenticated"
  USING (((student_id = ( SELECT auth.uid() AS uid)) OR (freelancer_id = ( SELECT auth.uid() AS uid))));

CREATE POLICY "Users create own favorites" ON "public"."favorites"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((student_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Users delete own favorites" ON "public"."favorites"
  FOR DELETE
  TO "authenticated"
  USING ((student_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Users read own favorites" ON "public"."favorites"
  FOR SELECT
  TO "authenticated"
  USING ((student_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Freelancer profiles are public" ON "public"."freelancer_profiles"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "Users create own freelancer profile" ON "public"."freelancer_profiles"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users update own freelancer profile" ON "public"."freelancer_profiles"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Participants read messages" ON "public"."messages"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = messages.conversation_id) AND ((c.student_id = ( SELECT auth.uid() AS uid)) OR (c.freelancer_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "Participants send messages" ON "public"."messages"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((sender_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = messages.conversation_id) AND ((c.student_id = ( SELECT auth.uid() AS uid)) OR (c.freelancer_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "Users read own notifications" ON "public"."notifications"
  FOR SELECT
  TO "authenticated"
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Users update own notifications" ON "public"."notifications"
  FOR UPDATE
  TO "authenticated"
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Portfolio items are public" ON "public"."portfolio_items"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "Users create own portfolio" ON "public"."portfolio_items"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users delete own portfolio" ON "public"."portfolio_items"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users update own portfolio" ON "public"."portfolio_items"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Profile skills are public" ON "public"."profile_skills"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "Users add own skills" ON "public"."profile_skills"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users delete own skills" ON "public"."profile_skills"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users update own skills" ON "public"."profile_skills"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Profiles are publicly readable" ON "public"."profiles"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "Users update own profile" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = id));

CREATE POLICY "Owners delete unfinished projects" ON "public"."projects"
  FOR DELETE
  TO "authenticated"
  USING (((student_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['draft'::text, 'open'::text]))));

CREATE POLICY "Owners update projects" ON "public"."projects"
  FOR UPDATE
  TO "authenticated"
  USING ((student_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((student_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Projects visibility" ON "public"."projects"
  FOR SELECT
  TO "anon", "authenticated"
  USING (((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'completed'::text])) OR (student_id = ( SELECT auth.uid() AS uid))));

CREATE POLICY "Users create own projects" ON "public"."projects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((student_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Freelancers edit pending proposals" ON "public"."proposals"
  FOR UPDATE
  TO "authenticated"
  USING (((freelancer_id = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::text)))
  WITH CHECK (((freelancer_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['pending'::text, 'withdrawn'::text]))));

CREATE POLICY "Freelancers submit proposals" ON "public"."proposals"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((freelancer_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = proposals.project_id) AND (p.status = 'open'::text) AND (p.student_id <> ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "Proposal participants can view" ON "public"."proposals"
  FOR SELECT
  TO "authenticated"
  USING (((freelancer_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = proposals.project_id) AND (p.student_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "Contract participants create reviews" ON "public"."reviews"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((reviewer_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.contracts c
  WHERE
    ((c.id = reviews.contract_id) AND (c.status = 'completed'::text) AND (((c.student_id = reviews.reviewer_id) AND (c.freelancer_id = reviews.reviewee_id)) OR ((c.freelancer_id =
    reviews.reviewer_id) AND (c.student_id = reviews.reviewee_id))))))));

CREATE POLICY "Reviews are public" ON "public"."reviews"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "Skills are public" ON "public"."skills"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "Users upload own avatar" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid))));

REVOKE ALL ON FUNCTION "public"."accept_proposal"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."accept_proposal"(uuid) TO "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."handle_new_proposal"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."contracts" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."conversations" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."favorites" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."freelancer_profiles" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."messages" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notifications" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."portfolio_items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profile_skills" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."project_skills" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."projects" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."proposals" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."reviews" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."skills" TO "anon", "authenticated", "postgres", "service_role";


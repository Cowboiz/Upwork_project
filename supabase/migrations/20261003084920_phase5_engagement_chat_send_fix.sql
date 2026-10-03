create or replace function public.send_engagement_message(
  p_engagement_id uuid,
  p_client_message_id uuid,
  p_body text
)
  returns table (
    id uuid,
    project_engagement_id uuid,
    sender_profile_id uuid,
    body text,
    created_at timestamp with time zone
  )
  language plpgsql
  security definer
  set search_path = ''
as $function$
declare
  v_sender_id uuid;
  v_body text;
  v_thread record;
  v_message public.engagement_messages;
begin
  v_sender_id := auth.uid();

  if v_sender_id is null then
    raise exception 'Authentication required';
  end if;

  v_body := btrim(coalesce(p_body, ''));

  if char_length(v_body) < 1 or char_length(v_body) > 4000 then
    raise exception 'Message body is invalid';
  end if;

  select *
  into v_thread
  from public.get_engagement_thread(p_engagement_id);

  if not found or v_thread.engagement_id is null then
    raise exception 'Messaging is unavailable';
  end if;

  if not v_thread.can_send then
    raise exception 'Messaging is unavailable';
  end if;

  insert into public.engagement_messages as em (
    project_engagement_id,
    sender_profile_id,
    client_message_id,
    body
  )
  values (
    p_engagement_id,
    v_sender_id,
    p_client_message_id,
    v_body
  )
  on conflict on constraint engagement_messages_sender_client_message_key
  do nothing
  returning em.* into v_message;

  if not found then
    select em.*
    into v_message
    from public.engagement_messages as em
    where em.sender_profile_id = v_sender_id
      and em.client_message_id = p_client_message_id
      and em.project_engagement_id = p_engagement_id;

    if not found then
      raise exception 'Messaging is unavailable';
    end if;
  end if;

  return query
  select
    v_message.id,
    v_message.project_engagement_id,
    v_message.sender_profile_id,
    v_message.body,
    v_message.created_at;
end;
$function$;

revoke all on function public.send_engagement_message(uuid, uuid, text) from public;
revoke all on function public.send_engagement_message(uuid, uuid, text) from anon;
revoke all on function public.send_engagement_message(uuid, uuid, text) from authenticated;
grant execute on function public.send_engagement_message(uuid, uuid, text) to authenticated;

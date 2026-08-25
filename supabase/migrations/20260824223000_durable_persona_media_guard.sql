create or replace function public.enforce_durable_persona_media()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  media_reference text;
  media_references text[];
begin
  select
    array[new.avatar, new.reference_image, new.alternate_reference_image]
    || coalesce(array_agg(additional_reference), '{}'::text[])
  into media_references
  from jsonb_array_elements_text(
    coalesce(nullif(new.additional_reference_images, ''), '[]')::jsonb
  ) as refs(additional_reference);

  foreach media_reference in array media_references loop
    continue when media_reference is null or btrim(media_reference) = '';

    if media_reference ~* '^(blob:|file:|data:(image|audio|video)/)'
      or media_reference ~* '^(/api)?/uploads/'
      or media_reference ~* '^uploads/'
      or media_reference ~* '^https?://[^/]+/(api/)?uploads/'
      or media_reference ~* '/storage/v1/object/sign/workspace-media/' then
      raise exception using
        errcode = '23514',
        message = 'Temporary persona media cannot be saved. Upload it to permanent workspace storage first.';
    end if;

    if media_reference like 'supabase-media://%'
      and media_reference not like 'supabase-media://' || new.user_id || '/%' then
      raise exception using
        errcode = '23514',
        message = 'Persona media must belong to the same account.';
    end if;
  end loop;

  return new;
end;
$$;

revoke execute on function public.enforce_durable_persona_media() from public, anon, authenticated;

drop trigger if exists enforce_durable_persona_media on public.personas;
create trigger enforce_durable_persona_media
before insert or update of avatar, reference_image, additional_reference_images, alternate_reference_image, user_id
on public.personas
for each row
execute function public.enforce_durable_persona_media();

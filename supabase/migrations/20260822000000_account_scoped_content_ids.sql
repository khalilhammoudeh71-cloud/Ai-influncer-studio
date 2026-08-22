begin;

update public.personas set user_id = 'legacy-unowned' where user_id is null;
update public.generated_images set user_id = 'legacy-unowned' where user_id is null;
update public.revenue_entries set user_id = 'legacy-unowned' where user_id is null;
update public.planned_posts set user_id = 'legacy-unowned' where user_id is null;

alter table public.personas alter column user_id set not null;
alter table public.generated_images alter column user_id set not null;
alter table public.revenue_entries alter column user_id set not null;
alter table public.planned_posts alter column user_id set not null;

do $account_constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.personas'::regclass
      and conname = 'personas_user_client_id_unique'
  ) then
    alter table public.personas
      add constraint personas_user_client_id_unique unique (user_id, client_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.generated_images'::regclass
      and conname = 'generated_images_user_client_id_unique'
  ) then
    alter table public.generated_images
      add constraint generated_images_user_client_id_unique unique (user_id, client_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.revenue_entries'::regclass
      and conname = 'revenue_entries_user_client_id_unique'
  ) then
    alter table public.revenue_entries
      add constraint revenue_entries_user_client_id_unique unique (user_id, client_id);
  end if;
end
$account_constraints$;

create index if not exists planned_posts_user_id_idx on public.planned_posts (user_id);

alter table public.personas enable row level security;
alter table public.generated_images enable row level security;
alter table public.revenue_entries enable row level security;
alter table public.planned_posts enable row level security;

revoke all on table public.personas, public.generated_images, public.revenue_entries, public.planned_posts from anon;
grant select, insert, update, delete on table public.personas, public.generated_images, public.revenue_entries, public.planned_posts to authenticated;
revoke all on sequence public.personas_id_seq, public.generated_images_id_seq, public.revenue_entries_id_seq, public.planned_posts_id_seq from anon;
grant usage, select on sequence public.personas_id_seq, public.generated_images_id_seq, public.revenue_entries_id_seq, public.planned_posts_id_seq to authenticated;

do $account_policies$
declare
  target_table text;
  policy_prefix text;
begin
  foreach target_table in array array['personas', 'generated_images', 'revenue_entries', 'planned_posts']
  loop
    policy_prefix := target_table || '_own';

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = target_table
        and policyname = policy_prefix || '_select'
    ) then
      execute format(
        'create policy %I on public.%I for select to authenticated using ((select auth.uid())::text = user_id)',
        policy_prefix || '_select',
        target_table
      );
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = target_table
        and policyname = policy_prefix || '_insert'
    ) then
      execute format(
        'create policy %I on public.%I for insert to authenticated with check ((select auth.uid())::text = user_id)',
        policy_prefix || '_insert',
        target_table
      );
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = target_table
        and policyname = policy_prefix || '_update'
    ) then
      execute format(
        'create policy %I on public.%I for update to authenticated using ((select auth.uid())::text = user_id) with check ((select auth.uid())::text = user_id)',
        policy_prefix || '_update',
        target_table
      );
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = target_table
        and policyname = policy_prefix || '_delete'
    ) then
      execute format(
        'create policy %I on public.%I for delete to authenticated using ((select auth.uid())::text = user_id)',
        policy_prefix || '_delete',
        target_table
      );
    end if;
  end loop;
end
$account_policies$;

commit;

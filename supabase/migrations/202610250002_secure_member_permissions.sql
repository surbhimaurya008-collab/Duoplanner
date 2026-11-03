-- Secure per-user ownership and completion records for tasks and study sessions.
-- Existing rows are preserved; legacy assigned_to/is_completed columns remain for compatibility.

alter table public.workspace_members
  add column if not exists member_number smallint;

with ranked_members as (
  select id, row_number() over (partition by workspace_id order by joined_at, id)::smallint as member_number
  from public.workspace_members
)
update public.workspace_members members
set member_number = ranked_members.member_number
from ranked_members
where members.id = ranked_members.id
  and members.member_number is null;

alter table public.workspace_members
  alter column member_number set not null;

create unique index if not exists workspace_members_workspace_number_key
  on public.workspace_members(workspace_id, member_number);

alter table public.tasks
  add column if not exists assigned_user_ids uuid[] not null default '{}';

alter table public.study_sessions
  add column if not exists assigned_user_ids uuid[] not null default '{}';

update public.tasks task
set assigned_user_ids = coalesce((
  select array_agg(member.user_id order by member.member_number)
  from public.workspace_members member
  where member.workspace_id = task.workspace_id
    and (
      task.assigned_to = 'both'::public.member_key
      or (task.assigned_to = 'surbhi'::public.member_key and member.member_number = 1)
      or (task.assigned_to = 'aaryan'::public.member_key and member.member_number = 2)
    )
), '{}')
where cardinality(task.assigned_user_ids) = 0;

update public.study_sessions session
set assigned_user_ids = coalesce((
  select array_agg(member.user_id order by member.member_number)
  from public.workspace_members member
  where member.workspace_id = session.workspace_id
    and (
      session.assigned_to = 'both'::public.member_key
      or (session.assigned_to = 'surbhi'::public.member_key and member.member_number = 1)
      or (session.assigned_to = 'aaryan'::public.member_key and member.member_number = 2)
    )
), '{}')
where cardinality(session.assigned_user_ids) = 0;

create table if not exists public.task_completions (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

create table if not exists public.study_completions (
  study_session_id uuid not null references public.study_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_completed boolean not null default false,
  actual_minutes integer not null default 0 check (actual_minutes >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (study_session_id, user_id)
);

insert into public.task_completions (task_id, user_id, is_completed, completed_at)
select task.id, assignee.user_id, task.is_completed, case when task.is_completed then task.completed_at else null end
from public.tasks task
cross join lateral unnest(task.assigned_user_ids) as assignee(user_id)
on conflict (task_id, user_id) do nothing;

insert into public.study_completions (study_session_id, user_id, is_completed, actual_minutes, completed_at)
select session.id, assignee.user_id, session.is_completed, session.actual_minutes, case when session.is_completed then session.completed_at else null end
from public.study_sessions session
cross join lateral unnest(session.assigned_user_ids) as assignee(user_id)
on conflict (study_session_id, user_id) do nothing;

create or replace function public.validate_task_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.workspace_id is null or cardinality(new.assigned_user_ids) not between 1 and 2 then
    raise exception 'A task must be assigned to one or two workspace members';
  end if;

  if exists (
    select 1
    from unnest(new.assigned_user_ids) as assigned(user_id)
    where not exists (
      select 1 from public.workspace_members member
      where member.workspace_id = new.workspace_id
        and member.user_id = assigned.user_id
    )
  ) then
    raise exception 'Task assignments must belong to the task workspace';
  end if;

  if tg_op = 'UPDATE' and (
    old.workspace_id is distinct from new.workspace_id
    or old.created_by is distinct from new.created_by
    or old.assigned_user_ids is distinct from new.assigned_user_ids
  ) then
    raise exception 'Task ownership and assignment cannot be changed directly';
  end if;

  return new;
end;
$$;

create or replace function public.validate_study_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.workspace_id is null or cardinality(new.assigned_user_ids) not between 1 and 2 then
    raise exception 'A study session must be assigned to one or two workspace members';
  end if;

  if exists (
    select 1
    from unnest(new.assigned_user_ids) as assigned(user_id)
    where not exists (
      select 1 from public.workspace_members member
      where member.workspace_id = new.workspace_id
        and member.user_id = assigned.user_id
    )
  ) then
    raise exception 'Study assignments must belong to the study workspace';
  end if;

  if tg_op = 'UPDATE' and (
    old.workspace_id is distinct from new.workspace_id
    or old.created_by is distinct from new.created_by
    or old.assigned_user_ids is distinct from new.assigned_user_ids
  ) then
    raise exception 'Study ownership and assignment cannot be changed directly';
  end if;

  return new;
end;
$$;

create or replace function public.ensure_task_completion_rows()
returns trigger language plpgsql security definer set search_path = public as $$
declare assigned_user uuid;
begin
  foreach assigned_user in array new.assigned_user_ids loop
    insert into public.task_completions (task_id, user_id)
    values (new.id, assigned_user)
    on conflict (task_id, user_id) do nothing;
  end loop;
  return new;
end;
$$;

create or replace function public.ensure_study_completion_rows()
returns trigger language plpgsql security definer set search_path = public as $$
declare assigned_user uuid;
begin
  foreach assigned_user in array new.assigned_user_ids loop
    insert into public.study_completions (study_session_id, user_id)
    values (new.id, assigned_user)
    on conflict (study_session_id, user_id) do nothing;
  end loop;
  return new;
end;
$$;

create or replace function public.sync_task_completion_summary()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_task_id uuid := coalesce(new.task_id, old.task_id);
begin
  update public.tasks task
  set is_completed = (
    cardinality(task.assigned_user_ids) > 0
    and not exists (
      select 1 from public.task_completions completion
      where completion.task_id = target_task_id and not completion.is_completed
    )
  ),
  completed_at = case when (
    cardinality(task.assigned_user_ids) > 0
    and not exists (
      select 1 from public.task_completions completion
      where completion.task_id = target_task_id and not completion.is_completed
    )
  ) then now() else null end,
  updated_at = now()
  where task.id = target_task_id;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.sync_study_completion_summary()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_session_id uuid := coalesce(new.study_session_id, old.study_session_id);
begin
  update public.study_sessions session
  set is_completed = (
    cardinality(session.assigned_user_ids) > 0
    and not exists (
      select 1 from public.study_completions completion
      where completion.study_session_id = target_session_id and not completion.is_completed
    )
  ),
  actual_minutes = coalesce((select sum(completion.actual_minutes) from public.study_completions completion where completion.study_session_id = target_session_id), 0),
  completed_at = case when (
    cardinality(session.assigned_user_ids) > 0
    and not exists (
      select 1 from public.study_completions completion
      where completion.study_session_id = target_session_id and not completion.is_completed
    )
  ) then now() else null end,
  updated_at = now()
  where session.id = target_session_id;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists validate_task_assignment_trigger on public.tasks;
create trigger validate_task_assignment_trigger
before insert or update on public.tasks
for each row execute function public.validate_task_assignment();

drop trigger if exists ensure_task_completion_rows_trigger on public.tasks;
create trigger ensure_task_completion_rows_trigger
after insert or update of assigned_user_ids on public.tasks
for each row execute function public.ensure_task_completion_rows();

drop trigger if exists validate_study_assignment_trigger on public.study_sessions;
create trigger validate_study_assignment_trigger
before insert or update on public.study_sessions
for each row execute function public.validate_study_assignment();

drop trigger if exists ensure_study_completion_rows_trigger on public.study_sessions;
create trigger ensure_study_completion_rows_trigger
after insert or update of assigned_user_ids on public.study_sessions
for each row execute function public.ensure_study_completion_rows();

drop trigger if exists sync_task_completion_summary_trigger on public.task_completions;
create trigger sync_task_completion_summary_trigger
after insert or update or delete on public.task_completions
for each row execute function public.sync_task_completion_summary();

drop trigger if exists sync_study_completion_summary_trigger on public.study_completions;
create trigger sync_study_completion_summary_trigger
after insert or update or delete on public.study_completions
for each row execute function public.sync_study_completion_summary();

alter table public.task_completions enable row level security;
alter table public.study_completions enable row level security;

drop policy if exists "tasks members insert" on public.tasks;
drop policy if exists "tasks members update" on public.tasks;
drop policy if exists "tasks members delete" on public.tasks;
create policy "tasks members insert" on public.tasks
for insert with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
  and not exists (
    select 1 from unnest(assigned_user_ids) assigned(user_id)
    where not exists (
      select 1 from public.workspace_members member
      where member.workspace_id = tasks.workspace_id and member.user_id = assigned.user_id
    )
  )
);
create policy "tasks creators update" on public.tasks
for update using (public.is_workspace_member(workspace_id) and created_by = auth.uid())
with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());
create policy "tasks creators delete" on public.tasks
for delete using (public.is_workspace_member(workspace_id) and created_by = auth.uid());

drop policy if exists "study members insert" on public.study_sessions;
drop policy if exists "study members update" on public.study_sessions;
drop policy if exists "study members delete" on public.study_sessions;
create policy "study members insert" on public.study_sessions
for insert with check (
  public.is_workspace_member(workspace_id)
  and (created_by is null or created_by = auth.uid())
  and not exists (
    select 1 from unnest(assigned_user_ids) assigned(user_id)
    where not exists (
      select 1 from public.workspace_members member
      where member.workspace_id = study_sessions.workspace_id and member.user_id = assigned.user_id
    )
  )
);
create policy "study creators update" on public.study_sessions
for update using (public.is_workspace_member(workspace_id) and (created_by = auth.uid() or created_by is null))
with check (public.is_workspace_member(workspace_id) and (created_by = auth.uid() or created_by is null));
create policy "study creators delete" on public.study_sessions
for delete using (public.is_workspace_member(workspace_id) and (created_by = auth.uid() or created_by is null));

create policy "task completion members read" on public.task_completions
for select using (
  exists (
    select 1 from public.tasks task
    where task.id = task_completions.task_id and public.is_workspace_member(task.workspace_id)
  )
);
create policy "task completion owner insert" on public.task_completions
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.tasks task
    where task.id = task_completions.task_id
      and public.is_workspace_member(task.workspace_id)
      and auth.uid() = any(task.assigned_user_ids)
  )
);
create policy "task completion owner update" on public.task_completions
for update using (user_id = auth.uid())
with check (user_id = auth.uid());
create policy "task completion owner delete" on public.task_completions
for delete using (user_id = auth.uid());

create policy "study completion members read" on public.study_completions
for select using (
  exists (
    select 1 from public.study_sessions session
    where session.id = study_completions.study_session_id and public.is_workspace_member(session.workspace_id)
  )
);
create policy "study completion owner insert" on public.study_completions
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.study_sessions session
    where session.id = study_completions.study_session_id
      and public.is_workspace_member(session.workspace_id)
      and auth.uid() = any(session.assigned_user_ids)
  )
);
create policy "study completion owner update" on public.study_completions
for update using (user_id = auth.uid())
with check (user_id = auth.uid());
create policy "study completion owner delete" on public.study_completions
for delete using (user_id = auth.uid());

alter publication supabase_realtime add table public.task_completions;
alter publication supabase_realtime add table public.study_completions;

create or replace function public.create_workspace_invitation(target_workspace_id uuid, target_email text)
returns text language plpgsql security definer set search_path = public as $$
declare
  raw_token text := encode(gen_random_bytes(24), 'hex');
begin
  if not public.is_workspace_member(target_workspace_id) then
    raise exception 'You are not a member of this workspace';
  end if;
  insert into public.workspace_invitations (workspace_id, invited_by, invited_email, token_hash)
  values (target_workspace_id, auth.uid(), lower(trim(target_email)), encode(digest(raw_token, 'sha256'), 'hex'));
  return raw_token;
end;
$$;

create or replace function public.accept_workspace_invitation(invite_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  invitation public.workspace_invitations;
  current_email text;
begin
  if auth.uid() is null then raise exception 'You must be signed in to accept an invitation'; end if;
  select lower(email) into current_email from auth.users where id = auth.uid();
  select * into invitation from public.workspace_invitations
  where token_hash = encode(digest(invite_token, 'sha256'), 'hex')
    and accepted_at is null and expires_at > now()
  for update;
  if invitation.id is null then raise exception 'This invitation is invalid or expired'; end if;
  if current_email is distinct from lower(invitation.invited_email) then raise exception 'This invitation was created for a different email address'; end if;
  if exists (select 1 from public.workspace_members where workspace_id = invitation.workspace_id and member_number = 2 and user_id <> auth.uid()) then raise exception 'This workspace already has two members'; end if;
  insert into public.workspace_members (workspace_id, user_id, role, member_number)
  values (invitation.workspace_id, auth.uid(), 'member', 2)
  on conflict (workspace_id, user_id) do nothing;
  update public.workspace_invitations set accepted_at = now() where id = invitation.id;
  return invitation.workspace_id;
end;
$$;

-- Keep DuoPlan workspaces limited to User 1 and User 2, and make the
-- per-user completion boundary explicit in database RLS.

create or replace function public.is_workspace_creator(target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.workspaces
    where id = target_workspace_id and created_by = auth.uid()
  );
$$;

create or replace function public.workspace_has_member_number(target_workspace_id uuid, target_member_number smallint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id and member_number = target_member_number
  );
$$;

create or replace function public.validate_workspace_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.member_number not in (1, 2) then
    raise exception 'A DuoPlan workspace can only have User 1 and User 2';
  end if;

  if exists (
    select 1
    from public.workspace_members existing
    where existing.workspace_id = new.workspace_id
      and existing.member_number = new.member_number
      and existing.id <> new.id
  ) then
    raise exception 'That workspace member slot is already in use';
  end if;

  if tg_op = 'INSERT' and (
    select count(*) from public.workspace_members existing where existing.workspace_id = new.workspace_id
  ) >= 2 then
    raise exception 'A DuoPlan workspace can only have two members';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_workspace_member_trigger on public.workspace_members;
create trigger validate_workspace_member_trigger
before insert or update on public.workspace_members
for each row execute function public.validate_workspace_member();

drop policy if exists "owner add members" on public.workspace_members;
drop policy if exists "workspace creator add self" on public.workspace_members;
drop policy if exists "workspace owner add second member" on public.workspace_members;

create policy "workspace creator add self" on public.workspace_members
for insert with check (
  public.is_workspace_creator(workspace_id)
  and user_id = auth.uid()
  and role = 'owner'
  and member_number = 1
);

create policy "workspace owner add second member" on public.workspace_members
for insert with check (
  public.is_workspace_creator(workspace_id)
  and user_id <> auth.uid()
  and role = 'member'
  and member_number = 2
  and not public.workspace_has_member_number(workspace_id, 2)
);

create or replace function public.validate_task_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.workspace_id is null or cardinality(new.assigned_user_ids) not between 1 and 2 then
    raise exception 'A task must be assigned to one or two workspace members';
  end if;

  if exists (
    select assigned.user_id
    from unnest(new.assigned_user_ids) as assigned(user_id)
    group by assigned.user_id
    having count(*) > 1
  ) then
    raise exception 'A task cannot assign the same user twice';
  end if;

  if exists (
    select 1
    from unnest(new.assigned_user_ids) as assigned(user_id)
    where not exists (
      select 1
      from public.workspace_members member
      where member.workspace_id = new.workspace_id
        and member.user_id = assigned.user_id
        and member.member_number in (1, 2)
    )
  ) then
    raise exception 'Task assignments must belong to User 1 or User 2 in the task workspace';
  end if;

  if tg_op = 'UPDATE' and (
    old.workspace_id is distinct from new.workspace_id
    or old.created_by is distinct from new.created_by
    or old.assigned_to is distinct from new.assigned_to
    or old.assigned_user_ids is distinct from new.assigned_user_ids
    or (pg_trigger_depth() = 1 and old.is_completed is distinct from new.is_completed)
    or (pg_trigger_depth() = 1 and old.completed_at is distinct from new.completed_at)
  ) then
    raise exception 'Task ownership, assignment, and completion summary are database-managed';
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
    select assigned.user_id
    from unnest(new.assigned_user_ids) as assigned(user_id)
    group by assigned.user_id
    having count(*) > 1
  ) then
    raise exception 'A study session cannot assign the same user twice';
  end if;

  if exists (
    select 1
    from unnest(new.assigned_user_ids) as assigned(user_id)
    where not exists (
      select 1
      from public.workspace_members member
      where member.workspace_id = new.workspace_id
        and member.user_id = assigned.user_id
        and member.member_number in (1, 2)
    )
  ) then
    raise exception 'Study assignments must belong to User 1 or User 2 in the study workspace';
  end if;

  if tg_op = 'UPDATE' and (
    old.workspace_id is distinct from new.workspace_id
    or old.created_by is distinct from new.created_by
    or old.assigned_to is distinct from new.assigned_to
    or old.assigned_user_ids is distinct from new.assigned_user_ids
    or (pg_trigger_depth() = 1 and old.is_completed is distinct from new.is_completed)
    or (pg_trigger_depth() = 1 and old.actual_minutes is distinct from new.actual_minutes)
    or (pg_trigger_depth() = 1 and old.completed_at is distinct from new.completed_at)
  ) then
    raise exception 'Study ownership, assignment, and completion summary are database-managed';
  end if;

  return new;
end;
$$;

drop policy if exists "tasks members insert" on public.tasks;
create policy "tasks members insert" on public.tasks
for insert with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
  and cardinality(assigned_user_ids) between 1 and 2
  and not exists (
    select 1
    from unnest(assigned_user_ids) assigned(user_id)
    where not exists (
      select 1
      from public.workspace_members member
      where member.workspace_id = tasks.workspace_id
        and member.user_id = assigned.user_id
        and member.member_number in (1, 2)
    )
  )
);

drop policy if exists "task completion owner insert" on public.task_completions;
drop policy if exists "task completion owner update" on public.task_completions;
drop policy if exists "task completion owner delete" on public.task_completions;

create policy "task completion owner insert" on public.task_completions
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tasks task
    where task.id = task_completions.task_id
      and public.is_workspace_member(task.workspace_id)
      and auth.uid() = any(task.assigned_user_ids)
  )
);

create policy "task completion owner update" on public.task_completions
for update using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tasks task
    where task.id = task_completions.task_id
      and public.is_workspace_member(task.workspace_id)
      and auth.uid() = any(task.assigned_user_ids)
  )
) with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tasks task
    where task.id = task_completions.task_id
      and public.is_workspace_member(task.workspace_id)
      and auth.uid() = any(task.assigned_user_ids)
  )
);

create policy "task completion owner delete" on public.task_completions
for delete using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tasks task
    where task.id = task_completions.task_id
      and public.is_workspace_member(task.workspace_id)
      and auth.uid() = any(task.assigned_user_ids)
  )
);

drop policy if exists "study completion owner insert" on public.study_completions;
drop policy if exists "study completion owner update" on public.study_completions;
drop policy if exists "study completion owner delete" on public.study_completions;

create policy "study completion owner insert" on public.study_completions
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.study_sessions session
    where session.id = study_completions.study_session_id
      and public.is_workspace_member(session.workspace_id)
      and auth.uid() = any(session.assigned_user_ids)
  )
);

create policy "study completion owner update" on public.study_completions
for update using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.study_sessions session
    where session.id = study_completions.study_session_id
      and public.is_workspace_member(session.workspace_id)
      and auth.uid() = any(session.assigned_user_ids)
  )
) with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.study_sessions session
    where session.id = study_completions.study_session_id
      and public.is_workspace_member(session.workspace_id)
      and auth.uid() = any(session.assigned_user_ids)
  )
);

create policy "study completion owner delete" on public.study_completions
for delete using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.study_sessions session
    where session.id = study_completions.study_session_id
      and public.is_workspace_member(session.workspace_id)
      and auth.uid() = any(session.assigned_user_ids)
  )
);

drop trigger if exists task_completions_touch_updated_at on public.task_completions;
create trigger task_completions_touch_updated_at
before update on public.task_completions
for each row execute function public.touch_updated_at();

drop trigger if exists study_completions_touch_updated_at on public.study_completions;
create trigger study_completions_touch_updated_at
before update on public.study_completions
for each row execute function public.touch_updated_at();

create extension if not exists pgcrypto;

create type public.workspace_role as enum ('owner', 'member');
create type public.member_key as enum ('surbhi', 'aaryan', 'both');
create type public.task_priority as enum ('low', 'medium', 'high');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  profile_key text check (profile_key in ('surbhi', 'aaryan')),
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  workspace_name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240),
  description text not null default '',
  task_date date not null,
  due_time time,
  category text not null default 'Other',
  priority public.task_priority not null default 'medium',
  assigned_to public.member_key not null default 'both',
  created_by uuid not null references auth.users(id) on delete restrict,
  is_completed boolean not null default false,
  completed_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subject text not null check (char_length(trim(subject)) between 1 and 120),
  topic text not null check (char_length(trim(topic)) between 1 and 240),
  study_date date not null,
  start_time time,
  end_time time,
  planned_minutes integer not null default 0 check (planned_minutes >= 0),
  actual_minutes integer not null default 0 check (actual_minutes >= 0),
  assigned_to public.member_key not null default 'both',
  study_goal text not null default '',
  notes text not null default '',
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  habit_name text not null check (char_length(trim(habit_name)) between 1 and 160),
  assigned_to public.member_key not null default 'both',
  frequency text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_key text not null check (user_key in ('surbhi', 'aaryan')),
  habit_date date not null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  unique (habit_id, user_key, habit_date)
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null,
  entity_id uuid,
  description text not null,
  created_at timestamptz not null default now()
);

create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  daily_study_goal_minutes integer not null default 120 check (daily_study_goal_minutes between 15 and 1440),
  theme text not null default 'light' check (theme in ('light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  invited_email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index tasks_workspace_date_idx on public.tasks(workspace_id, task_date);
create index tasks_workspace_assignee_idx on public.tasks(workspace_id, assigned_to);
create index study_workspace_date_idx on public.study_sessions(workspace_id, study_date);
create index activity_workspace_created_idx on public.activity_logs(workspace_id, created_at desc);
create index habit_logs_date_idx on public.habit_logs(habit_date);

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members where workspace_id = target_workspace_id and user_id = auth.uid());
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger tasks_touch_updated_at before update on public.tasks for each row execute function public.touch_updated_at();
create trigger study_touch_updated_at before update on public.study_sessions for each row execute function public.touch_updated_at();
create trigger settings_touch_updated_at before update on public.user_settings for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.tasks enable row level security;
alter table public.study_sessions enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.activity_logs enable row level security;
alter table public.user_settings enable row level security;
alter table public.workspace_invitations enable row level security;

create policy "profiles own or shared" on public.profiles for select using (id = auth.uid() or exists (select 1 from public.workspace_members mine join public.workspace_members shared on shared.workspace_id = mine.workspace_id where mine.user_id = auth.uid() and shared.user_id = profiles.id));
create policy "profiles self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles self insert" on public.profiles for insert with check (id = auth.uid());

create policy "workspace members read" on public.workspaces for select using (public.is_workspace_member(id));
create policy "workspace creator insert" on public.workspaces for insert with check (created_by = auth.uid());
create policy "workspace owner update" on public.workspaces for update using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "members read" on public.workspace_members for select using (public.is_workspace_member(workspace_id));
create policy "owner add members" on public.workspace_members for insert with check (exists (select 1 from public.workspaces where id = workspace_id and created_by = auth.uid()));

create policy "tasks members read" on public.tasks for select using (public.is_workspace_member(workspace_id));
create policy "tasks members insert" on public.tasks for insert with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());
create policy "tasks members update" on public.tasks for update using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "tasks members delete" on public.tasks for delete using (public.is_workspace_member(workspace_id));

create policy "study members read" on public.study_sessions for select using (public.is_workspace_member(workspace_id));
create policy "study members insert" on public.study_sessions for insert with check (public.is_workspace_member(workspace_id));
create policy "study members update" on public.study_sessions for update using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "study members delete" on public.study_sessions for delete using (public.is_workspace_member(workspace_id));

create policy "habits members read" on public.habits for select using (public.is_workspace_member(workspace_id));
create policy "habits members insert" on public.habits for insert with check (public.is_workspace_member(workspace_id));
create policy "habits members update" on public.habits for update using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "habits members delete" on public.habits for delete using (public.is_workspace_member(workspace_id));
create policy "habit logs members read" on public.habit_logs for select using (exists (select 1 from public.habits where habits.id = habit_logs.habit_id and public.is_workspace_member(habits.workspace_id)));
create policy "habit logs members write" on public.habit_logs for all using (exists (select 1 from public.habits where habits.id = habit_logs.habit_id and public.is_workspace_member(habits.workspace_id))) with check (exists (select 1 from public.habits where habits.id = habit_logs.habit_id and public.is_workspace_member(habits.workspace_id)));

create policy "activity members read" on public.activity_logs for select using (public.is_workspace_member(workspace_id));
create policy "activity members insert" on public.activity_logs for insert with check (public.is_workspace_member(workspace_id) and actor_id = auth.uid());

create policy "settings own read" on public.user_settings for select using (user_id = auth.uid());
create policy "settings own write" on public.user_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "invitation creators read" on public.workspace_invitations for select using (invited_by = auth.uid());

alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.study_sessions;
alter publication supabase_realtime add table public.activity_logs;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

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
begin
  if auth.uid() is null then raise exception 'You must be signed in to accept an invitation'; end if;
  select * into invitation from public.workspace_invitations
  where token_hash = encode(digest(invite_token, 'sha256'), 'hex')
    and accepted_at is null and expires_at > now()
  for update;
  if invitation.id is null then raise exception 'This invitation is invalid or expired'; end if;
  insert into public.workspace_members (workspace_id, user_id, role)
  values (invitation.workspace_id, auth.uid(), 'member')
  on conflict (workspace_id, user_id) do nothing;
  update public.workspace_invitations set accepted_at = now() where id = invitation.id;
  return invitation.workspace_id;
end;
$$;

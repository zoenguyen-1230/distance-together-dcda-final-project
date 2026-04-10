create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  username text unique,
  avatar_url text,
  bio text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.relationships (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  relationship_type text not null check (relationship_type in ('partner', 'friend', 'family')),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.relationship_members (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default timezone('utc', now()),
  unique (relationship_id, profile_id)
);

create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null,
  handle text,
  url text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships (id) on delete cascade,
  title text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  message_type text not null check (message_type in ('text', 'photo', 'voice_memo', 'video_message')),
  body text,
  media_url text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.checkin_prompts (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships (id) on delete cascade,
  prompt_text text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  send_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.checkin_responses (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.checkin_prompts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  response_text text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mood_updates (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  mood text not null,
  energy text,
  health text,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  cover_image_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.time_capsules (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text,
  media_url text,
  unlock_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  details text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.visit_plans (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships (id) on delete cascade,
  destination text not null,
  starts_on date not null,
  ends_on date,
  checklist jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.date_ideas (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid references public.relationships (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  idea_text text not null,
  category text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add column if not exists location text,
  add column if not exists timezone text,
  add column if not exists relationship_focus text,
  add column if not exists note text,
  add column if not exists photo_uri text;

create table if not exists public.workspace_state (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  profile_data jsonb not null default '{}'::jsonb,
  app_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.relationship_invites (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_email text not null,
  recipient_name text,
  relationship_type text not null check (relationship_type in ('partner', 'friend', 'family')),
  note text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'canceled')),
  created_at timestamptz not null default timezone('utc', now()),
  responded_at timestamptz
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.accept_relationship_invite(invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_record public.relationship_invites%rowtype;
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  sender_name text;
  recipient_name text;
  existing_relationship_id uuid;
  next_relationship_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if current_email = '' then
    raise exception 'Signed-in account is missing an email address';
  end if;

  select *
  into invite_record
  from public.relationship_invites
  where id = invite_id
    and status in ('pending', 'accepted')
    and lower(recipient_email) = current_email;

  if not found then
    raise exception 'Invite not found';
  end if;

  insert into public.profiles (id, full_name)
  values (
    current_user_id,
    split_part(current_email, '@', 1)
  )
  on conflict (id) do nothing;

  sender_name := coalesce(
    (select full_name from public.profiles where id = invite_record.sender_id),
    'Shared space'
  );

  recipient_name := coalesce(
    (select full_name from public.profiles where id = current_user_id),
    split_part(current_email, '@', 1)
  );

  select r.id
  into existing_relationship_id
  from public.relationships r
  join public.relationship_members sender_member
    on sender_member.relationship_id = r.id
   and sender_member.profile_id = invite_record.sender_id
  join public.relationship_members recipient_member
    on recipient_member.relationship_id = r.id
   and recipient_member.profile_id = current_user_id
  where r.relationship_type = invite_record.relationship_type
  order by r.created_at desc
  limit 1;

  if existing_relationship_id is null then
    insert into public.relationships (name, relationship_type, created_by)
    values (
      recipient_name || ' & ' || sender_name,
      invite_record.relationship_type,
      invite_record.sender_id
    )
    returning id into next_relationship_id;
  else
    next_relationship_id := existing_relationship_id;
  end if;

  insert into public.relationship_members (relationship_id, profile_id, role)
  values
    (next_relationship_id, invite_record.sender_id, 'member'),
    (next_relationship_id, current_user_id, 'member')
  on conflict (relationship_id, profile_id) do nothing;

  update public.relationship_invites
  set status = 'accepted',
      responded_at = timezone('utc', now())
  where sender_id = invite_record.sender_id
    and relationship_type = invite_record.relationship_type
    and lower(recipient_email) = current_email
    and status in ('pending', 'accepted');

  return next_relationship_id;
end;
$$;

create or replace function public.decline_relationship_invite(invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.relationship_invites
  set status = 'declined',
      responded_at = timezone('utc', now())
  where id = invite_id
    and status = 'pending'
    and lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''));
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.relationships enable row level security;
alter table public.relationship_members enable row level security;
alter table public.social_links enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.checkin_prompts enable row level security;
alter table public.checkin_responses enable row level security;
alter table public.mood_updates enable row level security;
alter table public.journal_entries enable row level security;
alter table public.time_capsules enable row level security;
alter table public.calendar_events enable row level security;
alter table public.visit_plans enable row level security;
alter table public.date_ideas enable row level security;
alter table public.workspace_state enable row level security;
alter table public.relationship_invites enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own social links" on public.social_links;
drop policy if exists "Users can manage their own social links" on public.social_links;
drop policy if exists "Members can read relationships" on public.relationships;
drop policy if exists "Creators can insert relationships" on public.relationships;
drop policy if exists "Members can read membership rows" on public.relationship_members;
drop policy if exists "Members can insert membership rows" on public.relationship_members;
drop policy if exists "Members can read conversations" on public.conversations;
drop policy if exists "Members can create conversations" on public.conversations;
drop policy if exists "Members can read messages" on public.messages;
drop policy if exists "Members can send messages" on public.messages;
drop policy if exists "Members can read prompts" on public.checkin_prompts;
drop policy if exists "Members can insert prompts" on public.checkin_prompts;
drop policy if exists "Members can read prompt responses" on public.checkin_responses;
drop policy if exists "Authors can insert prompt responses" on public.checkin_responses;
drop policy if exists "Members can read moods" on public.mood_updates;
drop policy if exists "Authors can insert moods" on public.mood_updates;
drop policy if exists "Members can read journal entries" on public.journal_entries;
drop policy if exists "Authors can insert journal entries" on public.journal_entries;
drop policy if exists "Authors can update journal entries" on public.journal_entries;
drop policy if exists "Authors can delete journal entries" on public.journal_entries;
drop policy if exists "Members can read time capsules" on public.time_capsules;
drop policy if exists "Authors can insert time capsules" on public.time_capsules;
drop policy if exists "Authors can update time capsules" on public.time_capsules;
drop policy if exists "Authors can delete time capsules" on public.time_capsules;
drop policy if exists "Members can read calendar events" on public.calendar_events;
drop policy if exists "Members can insert calendar events" on public.calendar_events;
drop policy if exists "Authors can update calendar events" on public.calendar_events;
drop policy if exists "Authors can delete calendar events" on public.calendar_events;
drop policy if exists "Members can read visit plans" on public.visit_plans;
drop policy if exists "Members can insert visit plans" on public.visit_plans;
drop policy if exists "Members can read date ideas" on public.date_ideas;
drop policy if exists "Members can insert date ideas" on public.date_ideas;
drop policy if exists "Users can read their own workspace state" on public.workspace_state;
drop policy if exists "Users can insert their own workspace state" on public.workspace_state;
drop policy if exists "Users can update their own workspace state" on public.workspace_state;
drop policy if exists "Users can read profiles in shared relationships" on public.profiles;
drop policy if exists "Senders can read their invites" on public.relationship_invites;
drop policy if exists "Recipients can read their invites" on public.relationship_invites;
drop policy if exists "Senders can create invites" on public.relationship_invites;

create policy "Users can read their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can read profiles in shared relationships"
  on public.profiles
  for select
  using (
    auth.uid() = id
    or exists (
      select 1
      from public.relationship_members mine
      join public.relationship_members theirs
        on mine.relationship_id = theirs.relationship_id
      where mine.profile_id = auth.uid()
        and theirs.profile_id = profiles.id
    )
  );

create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

create policy "Users can insert their own social links"
  on public.social_links
  for insert
  with check (auth.uid() = profile_id);

create policy "Users can manage their own social links"
  on public.social_links
  for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "Members can read relationships"
  on public.relationships
  for select
  using (
    exists (
      select 1
      from public.relationship_members rm
      where rm.relationship_id = relationships.id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Creators can insert relationships"
  on public.relationships
  for insert
  with check (auth.uid() = created_by);

create policy "Members can read membership rows"
  on public.relationship_members
  for select
  using (
    profile_id = auth.uid()
    or exists (
      select 1
      from public.relationship_members rm
      where rm.relationship_id = relationship_members.relationship_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Members can insert membership rows"
  on public.relationship_members
  for insert
  with check (
    exists (
      select 1
      from public.relationships r
      where r.id = relationship_id
        and r.created_by = auth.uid()
    )
  );

create policy "Members can read conversations"
  on public.conversations
  for select
  using (
    exists (
      select 1
      from public.relationship_members rm
      where rm.relationship_id = conversations.relationship_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Members can create conversations"
  on public.conversations
  for insert
  with check (
    exists (
      select 1
      from public.relationship_members rm
      where rm.relationship_id = conversations.relationship_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Members can read messages"
  on public.messages
  for select
  using (
    exists (
      select 1
      from public.conversations c
      join public.relationship_members rm on rm.relationship_id = c.relationship_id
      where c.id = messages.conversation_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Members can send messages"
  on public.messages
  for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.conversations c
      join public.relationship_members rm on rm.relationship_id = c.relationship_id
      where c.id = messages.conversation_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Members can read prompts"
  on public.checkin_prompts
  for select
  using (
    exists (
      select 1
      from public.relationship_members rm
      where rm.relationship_id = checkin_prompts.relationship_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Members can insert prompts"
  on public.checkin_prompts
  for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.relationship_members rm
      where rm.relationship_id = checkin_prompts.relationship_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Members can read prompt responses"
  on public.checkin_responses
  for select
  using (
    exists (
      select 1
      from public.checkin_prompts p
      join public.relationship_members rm on rm.relationship_id = p.relationship_id
      where p.id = checkin_responses.prompt_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Authors can insert prompt responses"
  on public.checkin_responses
  for insert
  with check (author_id = auth.uid());

create policy "Members can read moods"
  on public.mood_updates
  for select
  using (
    exists (
      select 1
      from public.relationship_members rm
      where rm.relationship_id = mood_updates.relationship_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Authors can insert moods"
  on public.mood_updates
  for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1
      from public.relationship_members rm
      where rm.relationship_id = mood_updates.relationship_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Members can read journal entries"
  on public.journal_entries
  for select
  using (
    exists (
      select 1
      from public.relationship_members rm
      where rm.relationship_id = journal_entries.relationship_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Authors can insert journal entries"
  on public.journal_entries
  for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1
      from public.relationship_members rm
      where rm.relationship_id = journal_entries.relationship_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Authors can update journal entries"
  on public.journal_entries
  for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "Authors can delete journal entries"
  on public.journal_entries
  for delete
  using (author_id = auth.uid());

create policy "Members can read time capsules"
  on public.time_capsules
  for select
  using (
    exists (
      select 1
      from public.relationship_members rm
      where rm.relationship_id = time_capsules.relationship_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Authors can insert time capsules"
  on public.time_capsules
  for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1
      from public.relationship_members rm
      where rm.relationship_id = time_capsules.relationship_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Authors can update time capsules"
  on public.time_capsules
  for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "Authors can delete time capsules"
  on public.time_capsules
  for delete
  using (author_id = auth.uid());

create policy "Members can read calendar events"
  on public.calendar_events
  for select
  using (
    exists (
      select 1
      from public.relationship_members rm
      where rm.relationship_id = calendar_events.relationship_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Members can insert calendar events"
  on public.calendar_events
  for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.relationship_members rm
      where rm.relationship_id = calendar_events.relationship_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Authors can update calendar events"
  on public.calendar_events
  for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "Authors can delete calendar events"
  on public.calendar_events
  for delete
  using (created_by = auth.uid());

create policy "Members can read visit plans"
  on public.visit_plans
  for select
  using (
    exists (
      select 1
      from public.relationship_members rm
      where rm.relationship_id = visit_plans.relationship_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Members can insert visit plans"
  on public.visit_plans
  for insert
  with check (
    exists (
      select 1
      from public.relationship_members rm
      where rm.relationship_id = visit_plans.relationship_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Members can read date ideas"
  on public.date_ideas
  for select
  using (
    relationship_id is null
    or exists (
      select 1
      from public.relationship_members rm
      where rm.relationship_id = date_ideas.relationship_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Members can insert date ideas"
  on public.date_ideas
  for insert
  with check (
    created_by = auth.uid()
    and (
      relationship_id is null
      or exists (
        select 1
        from public.relationship_members rm
        where rm.relationship_id = date_ideas.relationship_id
          and rm.profile_id = auth.uid()
      )
    )
  );

create policy "Users can read their own workspace state"
  on public.workspace_state
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own workspace state"
  on public.workspace_state
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own workspace state"
  on public.workspace_state
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Senders can read their invites"
  on public.relationship_invites
  for select
  using (auth.uid() = sender_id);

create policy "Recipients can read their invites"
  on public.relationship_invites
  for select
  using (lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy "Senders can create invites"
  on public.relationship_invites
  for insert
  with check (auth.uid() = sender_id);

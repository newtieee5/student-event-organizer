-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  updated_at timestamp with time zone,
  username text,
  full_name text,
  avatar_url text,
  website text,
  role text default 'student',
  primary key (id)
);

-- EVENTS
create table public.events (
  id uuid not null default uuid_generate_v4(),
  created_at timestamp with time zone not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  date text not null, -- Storing as YYYY-MM-DD string based on frontend
  time text not null, -- Storing as HH:MM string based on frontend
  location text,
  type text check (type in ('Academic', 'Social', 'Personal', 'Work', 'Organizer')), 
  priority text check (priority in ('Low', 'Medium', 'High')),
  total_budget numeric default 0,
  total_spent numeric default 0,
  primary key (id)
);

-- TASKS
create table public.tasks (
  id uuid not null default uuid_generate_v4(),
  created_at timestamp with time zone not null default now(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  completed boolean default false,
  deadline text, -- Storing as string based on frontend usage
  primary key (id)
);

-- BUDGET ITEMS
create table public.budget_items (
  id uuid not null default uuid_generate_v4(),
  created_at timestamp with time zone not null default now(),
  event_id uuid not null references public.events(id) on delete cascade,
  description text not null,
  amount numeric not null default 0,
  paid boolean default false,
  category text,
  primary key (id)
);

-- REGISTRATIONS (For Public Events)
create table public.registrations (
  id uuid not null default uuid_generate_v4(),
  created_at timestamp with time zone not null default now(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text default 'registered' check (status in ('registered', 'attended', 'cancelled')),
  primary key (id),
  unique(event_id, user_id)
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;
alter table events enable row level security;
alter table tasks enable row level security;
alter table budget_items enable row level security;
alter table registrations enable row level security;

-- Policies (Simplified for demonstration)
-- Profiles: Users can view and edit their own profile
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- Events: 
-- 1. Users can view their own events
-- 2. "Organizer" type events are viewable by everyone (Public)
create policy "Users can view own events" on events for select using (auth.uid() = user_id);
create policy "Public events are viewable by everyone" on events for select using (type = 'Organizer');
create policy "Users can insert own events" on events for insert with check (auth.uid() = user_id);
create policy "Users can update own events" on events for update using (auth.uid() = user_id);
create policy "Users can delete own events" on events for delete using (auth.uid() = user_id);

-- Tasks & Budget Items: Inherit access via event_id
-- (Requires more complex RLS or just simple check)
create policy "Users can view tasks of own events" on tasks for select using (
  exists (select 1 from events where events.id = tasks.event_id and events.user_id = auth.uid())
);
create policy "Users can insert tasks to own events" on tasks for insert with check (
  exists (select 1 from events where events.id = event_id and events.user_id = auth.uid())
);
-- ... repeat for update/delete and budget_items

-- Registrations:
-- 1. Users can view their own registrations
-- 2. Event Organizers can view registrations for their events
create policy "Users can see own registrations" on registrations for select using (auth.uid() = user_id);
create policy "Organizers can see registrations for their events" on registrations for select using (
  exists (select 1 from events where events.id = registrations.event_id and events.user_id = auth.uid())
);
create policy "Users can register themselves" on registrations for insert with check (auth.uid() = user_id);

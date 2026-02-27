# Supabase Setup Guide

Follow these steps to configure your database for the Student Event Organiser.

## 1. Create a Project
1. Go to [Supabase](https://supabase.com/) and create a new project.
2. In your Project Settings > API, copy the **Project URL** and **anon public key**.
3. Create a `.env` file in the root of your project (`c:\Users\Admin\Downloads\app\testing`) and add these keys:

```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 2. SQL Schema Setup
Go to the **SQL Editor** in Supabase and run the following script to create all tables and policies.

```sql
-- Create Profiles Table (Users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin'))
);

-- Create Events Table
CREATE TABLE public.events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  location TEXT,
  type TEXT CHECK (type IN ('Academic', 'Social', 'Personal', 'Work')),
  priority TEXT CHECK (priority IN ('Low', 'Medium', 'High')),
  total_budget NUMERIC DEFAULT 0,
  total_spent NUMERIC DEFAULT 0
);

-- Create Tasks Table
CREATE TABLE public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  deadline TIMESTAMP WITH TIME ZONE
);

-- Create Budget Items Table
CREATE TABLE public.budget_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  category TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policies for Events
CREATE POLICY "Users can view own events." ON public.events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events." ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events." ON public.events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events." ON public.events FOR DELETE USING (auth.uid() = user_id);

-- Policies for Tasks (Check parent event ownership)
CREATE POLICY "Users can view tasks of own events." ON public.tasks FOR SELECT USING (
  exists ( select 1 from public.events where id = tasks.event_id and user_id = auth.uid() )
);
CREATE POLICY "Users can insert tasks to own events." ON public.tasks FOR INSERT WITH CHECK (
  exists ( select 1 from public.events where id = tasks.event_id and user_id = auth.uid() )
);
CREATE POLICY "Users can update tasks of own events." ON public.tasks FOR UPDATE USING (
  exists ( select 1 from public.events where id = tasks.event_id and user_id = auth.uid() )
);
CREATE POLICY "Users can delete tasks of own events." ON public.tasks FOR DELETE USING (
  exists ( select 1 from public.events where id = tasks.event_id and user_id = auth.uid() )
);

-- Policies for Budget Items (Check parent event ownership)
CREATE POLICY "Users can view budget items of own events." ON public.budget_items FOR SELECT USING (
  exists ( select 1 from public.events where id = budget_items.event_id and user_id = auth.uid() )
);
CREATE POLICY "Users can insert budget items to own events." ON public.budget_items FOR INSERT WITH CHECK (
  exists ( select 1 from public.events where id = budget_items.event_id and user_id = auth.uid() )
);
CREATE POLICY "Users can update budget items of own events." ON public.budget_items FOR UPDATE USING (
  exists ( select 1 from public.events where id = budget_items.event_id and user_id = auth.uid() )
);
CREATE POLICY "Users can delete budget items of own events." ON public.budget_items FOR DELETE USING (
  exists ( select 1 from public.events where id = budget_items.event_id and user_id = auth.uid() )
);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', 'student');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

```

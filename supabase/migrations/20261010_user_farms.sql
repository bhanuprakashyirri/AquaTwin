-- ==============================================================================
-- AQUATWIN USER-OWNED FARM DATA MODEL & ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- 1. Profiles table linked to Supabase Auth
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  preferred_unit text default 'ha' check (preferred_unit in ('ha', 'acres')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 2. Farms table
create table if not exists public.farms (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  country text default '',
  state_region text default '',
  district_city text default '',
  location text default '',
  total_area numeric not null check (total_area > 0),
  preferred_unit text not null default 'ha' check (preferred_unit in ('ha', 'acres')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.farms enable row level security;

create policy "Users can select own farms"
  on public.farms for select
  using (auth.uid() = user_id);

create policy "Users can insert own farms"
  on public.farms for insert
  with check (auth.uid() = user_id);

create policy "Users can update own farms"
  on public.farms for update
  using (auth.uid() = user_id);

create policy "Users can delete own farms"
  on public.farms for delete
  using (auth.uid() = user_id);

-- 3. Fields table
create table if not exists public.fields (
  id uuid default gen_random_uuid() primary key,
  farm_id uuid references public.farms(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  area numeric not null check (area > 0),
  boundary_geojson jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.fields enable row level security;

create policy "Users can select own fields"
  on public.fields for select
  using (auth.uid() = user_id);

create policy "Users can insert own fields"
  on public.fields for insert
  with check (auth.uid() = user_id);

create policy "Users can update own fields"
  on public.fields for update
  using (auth.uid() = user_id);

create policy "Users can delete own fields"
  on public.fields for delete
  using (auth.uid() = user_id);

-- 4. Crop configurations table
create table if not exists public.crop_configurations (
  id uuid default gen_random_uuid() primary key,
  field_id uuid references public.fields(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  crop_type text not null,
  variety text default '',
  planting_date date,
  growth_stage text default '',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.crop_configurations enable row level security;

create policy "Users can select own crop configs"
  on public.crop_configurations for select
  using (auth.uid() = user_id);

create policy "Users can insert own crop configs"
  on public.crop_configurations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own crop configs"
  on public.crop_configurations for update
  using (auth.uid() = user_id);

create policy "Users can delete own crop configs"
  on public.crop_configurations for delete
  using (auth.uid() = user_id);

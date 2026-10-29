-- GYMBROS schema. Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.

-- Profiles ------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Bro',
  kcal_goal integer not null default 2500 check (kcal_goal between 800 and 8000),
  protein_goal integer not null default 160 check (protein_goal between 20 and 500),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Everyone signed in can see names and goals (needed for the Squad board).
create policy "profiles readable by members" on public.profiles
  for select to authenticated using (true);
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Create a profile row on sign up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''),
             nullif(new.raw_user_meta_data ->> 'full_name', ''),
             split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Meals ---------------------------------------------------------------------
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,                -- the user's local calendar day
  eaten_at timestamptz not null default now(),
  name text not null,
  items jsonb not null default '[]',
  kcal integer not null check (kcal >= 0),
  protein_g numeric(6,1) not null check (protein_g >= 0),
  carbs_g numeric(6,1) not null default 0,
  fat_g numeric(6,1) not null default 0,
  confidence text,
  photo_path text,
  created_at timestamptz not null default now()
);

create index if not exists meals_user_day on public.meals (user_id, day);

alter table public.meals enable row level security;

create policy "own meals" on public.meals
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- AI usage log (daily cap per user, protects the API bill) -------------------
create table if not exists public.analysis_log (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.analysis_log enable row level security;

create policy "own log read" on public.analysis_log
  for select to authenticated using (user_id = auth.uid());
create policy "own log insert" on public.analysis_log
  for insert to authenticated with check (user_id = auth.uid());

-- Squad board: daily totals per member, no photos or meal details shared ----
create or replace function public.squad_board(p_day date)
returns table (
  user_id uuid,
  display_name text,
  kcal bigint,
  protein_g numeric,
  kcal_goal integer,
  protein_goal integer,
  meals bigint
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name,
         coalesce(sum(m.kcal), 0)::bigint,
         coalesce(sum(m.protein_g), 0),
         p.kcal_goal, p.protein_goal,
         count(m.id)
  from public.profiles p
  left join public.meals m on m.user_id = p.id and m.day = p_day
  group by p.id
  order by coalesce(sum(m.protein_g), 0) / p.protein_goal desc;
$$;

revoke all on function public.squad_board(date) from public, anon;
grant execute on function public.squad_board(date) to authenticated;

-- Photo storage (private bucket, one folder per user) -----------------------
insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', false)
on conflict (id) do nothing;

create policy "upload own photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read own photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

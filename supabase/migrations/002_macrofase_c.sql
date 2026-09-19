-- Macrofase C: pantry, weekly planning and safe administrative editing.
-- Additive migration: 001_initial.sql remains unchanged.

create table if not exists pantry_items (
  ingredient_id uuid primary key references ingredients(id) on delete cascade,
  available boolean not null default false,
  use_soon boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists weekly_plans (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  name text not null default 'Mi semana',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists weekly_plan_entries (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid not null references weekly_plans(id) on delete cascade,
  planned_date date not null,
  meal_slot text not null check (meal_slot in ('breakfast', 'midday', 'lunch', 'afternoon', 'dinner')),
  meal_option_id uuid references meal_options(id) on delete set null,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (weekly_plan_id, planned_date, meal_slot)
);

alter table meal_options add column if not exists edited boolean not null default false;
alter table meal_options alter column daily_plan_id drop not null;

create index if not exists pantry_items_available_idx on pantry_items(available, use_soon);
create index if not exists weekly_plans_start_date_idx on weekly_plans(start_date desc);
create index if not exists weekly_plan_entries_plan_date_idx on weekly_plan_entries(weekly_plan_id, planned_date, meal_slot);

drop trigger if exists pantry_items_set_updated_at on pantry_items;
create trigger pantry_items_set_updated_at before update on pantry_items for each row execute function set_updated_at();
drop trigger if exists app_settings_set_updated_at on app_settings;
create trigger app_settings_set_updated_at before update on app_settings for each row execute function set_updated_at();
drop trigger if exists weekly_plans_set_updated_at on weekly_plans;
create trigger weekly_plans_set_updated_at before update on weekly_plans for each row execute function set_updated_at();
drop trigger if exists weekly_plan_entries_set_updated_at on weekly_plan_entries;
create trigger weekly_plan_entries_set_updated_at before update on weekly_plan_entries for each row execute function set_updated_at();

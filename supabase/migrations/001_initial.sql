create extension if not exists pgcrypto;

create table if not exists daily_plans (
  id uuid primary key,
  source_key text not null unique,
  source_file text not null,
  source_hash text not null,
  source_index integer not null,
  raw_text text not null,
  imported_at timestamptz not null default now()
);

create table if not exists meal_options (
  id uuid primary key,
  source_key text not null unique,
  daily_plan_id uuid not null references daily_plans(id) on delete cascade,
  meal_slot text not null check (meal_slot in ('wake_up', 'breakfast', 'midday', 'lunch', 'afternoon', 'dinner')),
  source_index integer not null,
  option_position integer not null default 0,
  title text not null,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dish_components (
  id uuid primary key,
  source_key text not null unique,
  meal_option_id uuid not null references meal_options(id) on delete cascade,
  source_label text,
  position integer not null default 0,
  optional boolean not null default false,
  notes text
);

create table if not exists ingredients (
  id uuid primary key,
  canonical_name text not null,
  normalized_name text not null unique,
  category text not null default 'other',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ingredient_aliases (
  id text primary key,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  unique (ingredient_id, normalized_alias)
);

create table if not exists dish_ingredients (
  id uuid primary key,
  source_key text not null unique,
  component_id uuid not null references dish_components(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id),
  original_name text not null,
  original_text text not null,
  amount numeric,
  unit text,
  household_amount text,
  household_unit text,
  household_text text,
  optional boolean not null default false,
  importance text not null default 'normal' check (importance in ('primary', 'normal', 'minor', 'optional')),
  position integer not null default 0
);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists meal_tags (
  meal_option_id uuid not null references meal_options(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (meal_option_id, tag_id)
);

create table if not exists meal_preferences (
  meal_option_id uuid primary key references meal_options(id) on delete cascade,
  favorite boolean not null default false,
  hidden boolean not null default false,
  rating integer check (rating between 1 and 4),
  updated_at timestamptz not null default now()
);

create table if not exists meal_history (
  id uuid primary key default gen_random_uuid(),
  meal_option_id uuid not null references meal_options(id) on delete cascade,
  eaten_at timestamptz not null default now(),
  rating integer check (rating between 1 and 4),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists meal_options_slot_active_idx on meal_options(meal_slot, active);
create index if not exists dish_components_meal_idx on dish_components(meal_option_id, position);
create index if not exists dish_ingredients_component_idx on dish_ingredients(component_id, position);
create index if not exists meal_history_option_date_idx on meal_history(meal_option_id, eaten_at desc);
create index if not exists meal_history_date_idx on meal_history(eaten_at desc);
create index if not exists meal_preferences_hidden_idx on meal_preferences(hidden);

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists meal_options_set_updated_at on meal_options;
create trigger meal_options_set_updated_at before update on meal_options for each row execute function set_updated_at();
drop trigger if exists ingredients_set_updated_at on ingredients;
create trigger ingredients_set_updated_at before update on ingredients for each row execute function set_updated_at();
drop trigger if exists meal_preferences_set_updated_at on meal_preferences;
create trigger meal_preferences_set_updated_at before update on meal_preferences for each row execute function set_updated_at();

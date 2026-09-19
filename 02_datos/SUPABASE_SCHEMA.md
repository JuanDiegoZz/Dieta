# Esquema Supabase sugerido

## tables

### meal_options

```sql
id uuid primary key
meal_slot text not null
title text not null
active boolean default true
favorite boolean default false
source_index integer
notes text
created_at timestamptz default now()
updated_at timestamptz default now()
```

### dish_components

```sql
id uuid primary key
meal_option_id uuid references meal_options(id) on delete cascade
name text not null
position integer default 0
optional boolean default false
notes text
```

### ingredients

```sql
id uuid primary key
canonical_name text unique not null
normalized_name text not null
category text
active boolean default true
```

### ingredient_aliases

```sql
id uuid primary key
ingredient_id uuid references ingredients(id) on delete cascade
alias text not null
normalized_alias text not null
```

### dish_ingredients

```sql
id uuid primary key
component_id uuid references dish_components(id) on delete cascade
ingredient_id uuid references ingredients(id)
amount numeric
unit text
household_amount text
household_unit text
importance text default 'normal'
optional boolean default false
original_text text
position integer default 0
```

### meal_history

```sql
id uuid primary key
meal_option_id uuid references meal_options(id)
eaten_at timestamptz default now()
rating integer
note text
```

### pantry_items

```sql
ingredient_id uuid primary key references ingredients(id)
available boolean default true
priority_use boolean default false
updated_at timestamptz default now()
```

### meal_preferences

```sql
meal_option_id uuid primary key references meal_options(id)
favorite boolean default false
rating integer
hidden boolean default false
```

### tags

```sql
id uuid primary key
name text unique
```

### meal_tags

```sql
meal_option_id uuid
tag_id uuid
primary key(meal_option_id, tag_id)
```

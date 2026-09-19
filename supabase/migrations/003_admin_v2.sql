-- Administrar v2: operaciones de catálogo atómicas y verificadas.
-- No modifica ni recrea tablas existentes.

create or replace function admin_save_meal(payload jsonb, existing_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  meal_id uuid;
  component_id_value uuid;
  dish_ingredient_id_value uuid;
  source_key_value text;
  component_source_key text;
  ingredient_source_key text;
  daily_plan_id_value uuid;
  source_index_value integer;
  active_value boolean;
  component_value jsonb;
  ingredient_value jsonb;
  amount_value numeric;
  position_value integer;
begin
  if jsonb_typeof(payload) <> 'object' then
    raise exception using errcode = '22023', message = 'El payload debe ser un objeto JSON.';
  end if;
  if coalesce(trim(payload->>'title'), '') = '' or length(payload->>'title') > 200 then
    raise exception using errcode = '22023', message = 'El nombre del platillo es obligatorio.';
  end if;
  if payload->>'slot' not in ('wake_up', 'breakfast', 'midday', 'lunch', 'afternoon', 'dinner') then
    raise exception using errcode = '22023', message = 'La franja del platillo no es válida.';
  end if;
  if jsonb_typeof(payload->'components') <> 'array' or jsonb_array_length(payload->'components') = 0 then
    raise exception using errcode = '22023', message = 'El platillo necesita al menos un componente.';
  end if;

  if existing_id is null then
    meal_id := gen_random_uuid();
    source_key_value := 'manual:meal:' || meal_id::text;
    daily_plan_id_value := null;
    source_index_value := -1;
    active_value := coalesce((payload->>'active')::boolean, true);
    insert into meal_options (id, source_key, daily_plan_id, meal_slot, source_index, option_position, title, notes, active, edited)
    values (meal_id, source_key_value, daily_plan_id_value, payload->>'slot', source_index_value, 0, trim(payload->>'title'), nullif(trim(payload->>'note'), ''), active_value, false);
  else
    meal_id := existing_id;
    select source_key, daily_plan_id, source_index, active
      into source_key_value, daily_plan_id_value, source_index_value, active_value
      from meal_options
      where id = meal_id
      for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'MealOption no encontrada.';
    end if;
    active_value := coalesce((payload->>'active')::boolean, active_value);
    update meal_options
       set meal_slot = payload->>'slot', title = trim(payload->>'title'), notes = nullif(trim(payload->>'note'), ''), active = active_value, edited = true
     where id = meal_id;
  end if;

  -- Validate supplied component and relationship IDs before deleting anything.
  for component_value in select value from jsonb_array_elements(payload->'components') loop
    if nullif(component_value->>'id', '') is not null then
      if component_value->>'id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        raise exception using errcode = '22023', message = 'ID de componente inválido.';
      end if;
      component_id_value := (component_value->>'id')::uuid;
      if not exists (select 1 from dish_components where id = component_id_value and meal_option_id = meal_id) then
        raise exception using errcode = '22023', message = 'El componente no pertenece al platillo.';
      end if;
    end if;
    if jsonb_typeof(component_value->'ingredients') <> 'array' then
      raise exception using errcode = '22023', message = 'Cada componente necesita una lista de ingredientes.';
    end if;
    for ingredient_value in select value from jsonb_array_elements(component_value->'ingredients') loop
      if coalesce(trim(ingredient_value->>'name'), '') = '' then
        raise exception using errcode = '22023', message = 'Cada ingrediente necesita nombre original.';
      end if;
      if ingredient_value->>'ingredientId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        raise exception using errcode = '22023', message = 'Cada ingrediente necesita un Ingredient válido.';
      end if;
      if not exists (select 1 from ingredients where id = (ingredient_value->>'ingredientId')::uuid) then
        raise exception using errcode = '22023', message = 'El Ingredient seleccionado no existe.';
      end if;
      if ingredient_value ? 'amount' and ingredient_value->>'amount' is not null then
        if jsonb_typeof(ingredient_value->'amount') <> 'number' or (ingredient_value->>'amount')::numeric < 0 then
          raise exception using errcode = '22023', message = 'La cantidad debe ser numérica y no negativa.';
        end if;
      end if;
      if nullif(ingredient_value->>'id', '') is not null then
        if ingredient_value->>'id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
          raise exception using errcode = '22023', message = 'ID de ingrediente del platillo inválido.';
        end if;
      end if;
    end loop;
  end loop;

  delete from dish_components existing_component
   where existing_component.meal_option_id = meal_id
     and not exists (
       select 1 from jsonb_array_elements(payload->'components') item
        where nullif(item->>'id', '') is not null
          and (item->>'id')::uuid = existing_component.id
     );

  position_value := 0;
  for component_value in select value from jsonb_array_elements(payload->'components') loop
    if nullif(component_value->>'id', '') is null then
      component_id_value := gen_random_uuid();
      component_source_key := 'manual:component:' || component_id_value::text;
      insert into dish_components (id, source_key, meal_option_id, source_label, position, optional, notes)
      values (component_id_value, component_source_key, meal_id, nullif(trim(component_value->>'label'), ''), position_value, coalesce((component_value->>'optional')::boolean, false), nullif(trim(component_value->>'note'), ''));
    else
      component_id_value := (component_value->>'id')::uuid;
      select current_component.source_key into component_source_key from dish_components current_component where current_component.id = component_id_value and current_component.meal_option_id = meal_id for update;
      update dish_components
         set source_label = nullif(trim(component_value->>'label'), ''), position = position_value, optional = coalesce((component_value->>'optional')::boolean, false), notes = nullif(trim(component_value->>'note'), '')
       where id = component_id_value and meal_option_id = meal_id;
    end if;

    delete from dish_ingredients existing_ingredient
     where existing_ingredient.component_id = component_id_value
       and not exists (
         select 1 from jsonb_array_elements(component_value->'ingredients') item
          where nullif(item->>'id', '') is not null
            and (item->>'id')::uuid = existing_ingredient.id
       );

    position_value := 0;
    for ingredient_value in select value from jsonb_array_elements(component_value->'ingredients') loop
      if nullif(ingredient_value->>'id', '') is null then
        dish_ingredient_id_value := gen_random_uuid();
        ingredient_source_key := 'manual:dish-ingredient:' || dish_ingredient_id_value::text;
        insert into dish_ingredients (id, source_key, component_id, ingredient_id, original_name, original_text, amount, unit, household_amount, household_unit, household_text, optional, importance, position)
        values (dish_ingredient_id_value, ingredient_source_key, component_id_value, (ingredient_value->>'ingredientId')::uuid, trim(ingredient_value->>'name'), coalesce(nullif(trim(ingredient_value->>'originalText'), ''), trim(ingredient_value->>'name')), (ingredient_value->>'amount')::numeric, nullif(trim(ingredient_value->>'unit'), ''), nullif(trim(ingredient_value->>'householdAmount'), ''), nullif(trim(ingredient_value->>'householdUnit'), ''), nullif(trim(ingredient_value->>'householdMeasure'), ''), coalesce((ingredient_value->>'optional')::boolean, false), coalesce(nullif(ingredient_value->>'importance', ''), 'normal'), position_value);
      else
        dish_ingredient_id_value := (ingredient_value->>'id')::uuid;
        select current_dish_ingredient.source_key into ingredient_source_key from dish_ingredients current_dish_ingredient where current_dish_ingredient.id = dish_ingredient_id_value and current_dish_ingredient.component_id = component_id_value for update;
        if not found then
          raise exception using errcode = '22023', message = 'La relación de ingrediente no pertenece al componente.';
        end if;
        update dish_ingredients as current_dish_ingredient
           set ingredient_id = (ingredient_value->>'ingredientId')::uuid, original_name = trim(ingredient_value->>'name'), original_text = coalesce(nullif(trim(ingredient_value->>'originalText'), ''), trim(ingredient_value->>'name')), amount = (ingredient_value->>'amount')::numeric, unit = nullif(trim(ingredient_value->>'unit'), ''), household_amount = nullif(trim(ingredient_value->>'householdAmount'), ''), household_unit = nullif(trim(ingredient_value->>'householdUnit'), ''), household_text = nullif(trim(ingredient_value->>'householdMeasure'), ''), optional = coalesce((ingredient_value->>'optional')::boolean, false), importance = coalesce(nullif(ingredient_value->>'importance', ''), 'normal'), position = position_value
         where current_dish_ingredient.id = dish_ingredient_id_value and current_dish_ingredient.component_id = component_id_value;
      end if;
      position_value := position_value + 1;
    end loop;
    position_value := position_value + 1;
  end loop;

  return jsonb_build_object('id', meal_id, 'sourceKey', source_key_value);
end;
$$;

create or replace function admin_update_ingredient(p_ingredient_id uuid, p_canonical_name text, p_normalized_name text, p_category text, p_aliases jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  alias_value jsonb;
  alias_text text;
  alias_normalized text;
begin
  if coalesce(trim(p_canonical_name), '') = '' or coalesce(trim(p_normalized_name), '') = '' then
    raise exception using errcode = '22023', message = 'El nombre del Ingredient es obligatorio.';
  end if;
  if not exists (select 1 from ingredients where id = p_ingredient_id) then
    raise exception using errcode = 'P0002', message = 'Ingredient no encontrado.';
  end if;
  update ingredients
     set canonical_name = trim(p_canonical_name), normalized_name = trim(p_normalized_name), category = coalesce(nullif(trim(p_category), ''), category)
   where id = p_ingredient_id;
  if jsonb_typeof(p_aliases) <> 'array' then
    raise exception using errcode = '22023', message = 'Los aliases deben ser una lista.';
  end if;
  for alias_value in select value from jsonb_array_elements(p_aliases) loop
    if jsonb_typeof(alias_value) <> 'object' or coalesce(trim(alias_value->>'alias'), '') = '' or coalesce(trim(alias_value->>'normalizedAlias'), '') = '' then
      raise exception using errcode = '22023', message = 'Cada alias necesita texto y normalización.';
    end if;
  end loop;
  delete from ingredient_aliases current_alias
   where current_alias.ingredient_id = p_ingredient_id
     and not exists (
       select 1 from jsonb_array_elements(p_aliases) item
        where item->>'normalizedAlias' = current_alias.normalized_alias
     );
  for alias_value in select value from jsonb_array_elements(p_aliases) loop
    alias_text := trim(alias_value->>'alias');
    alias_normalized := trim(alias_value->>'normalizedAlias');
    if alias_text <> '' and alias_normalized <> '' then
      insert into ingredient_aliases (id, ingredient_id, alias, normalized_alias)
      values (p_ingredient_id::text || ':' || alias_normalized, p_ingredient_id, alias_text, alias_normalized)
      on conflict (ingredient_id, normalized_alias) do update set alias = excluded.alias;
    end if;
  end loop;
  return jsonb_build_object('id', p_ingredient_id);
end;
$$;

create or replace function admin_merge_ingredients(p_source_id uuid, p_destination_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  relation_count integer;
  alias_value record;
  destination_available boolean;
  destination_use_soon boolean;
begin
  if p_source_id = p_destination_id then
    raise exception using errcode = '22023', message = 'El origen y destino deben ser distintos.';
  end if;
  perform 1 from ingredients where id = p_source_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Ingredient origen no encontrado.'; end if;
  perform 1 from ingredients where id = p_destination_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Ingredient destino no encontrado.'; end if;
  select count(*) into relation_count from dish_ingredients where ingredient_id = p_source_id;
  for alias_value in select alias, normalized_alias from ingredient_aliases where ingredient_id = p_source_id loop
    insert into ingredient_aliases (id, ingredient_id, alias, normalized_alias)
    values (p_destination_id::text || ':' || alias_value.normalized_alias, p_destination_id, alias_value.alias, alias_value.normalized_alias)
    on conflict (ingredient_id, normalized_alias) do nothing;
  end loop;
  delete from ingredient_aliases where ingredient_id = p_source_id;
  update dish_ingredients set ingredient_id = p_destination_id where ingredient_id = p_source_id;
  select available, use_soon into destination_available, destination_use_soon from pantry_items where ingredient_id = p_destination_id for update;
  if found then
    update pantry_items
       set available = destination_available or coalesce((select available from pantry_items where ingredient_id = p_source_id), false),
           use_soon = destination_use_soon or coalesce((select use_soon from pantry_items where ingredient_id = p_source_id), false)
     where ingredient_id = p_destination_id;
    delete from pantry_items where ingredient_id = p_source_id;
  else
    update pantry_items set ingredient_id = p_destination_id where ingredient_id = p_source_id;
  end if;
  delete from ingredients where id = p_source_id;
  return jsonb_build_object('sourceId', p_source_id, 'destinationId', p_destination_id, 'relations', relation_count);
end;
$$;

create or replace function admin_delete_meal(p_meal_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from meal_options where id = p_meal_id for update) then
    raise exception using errcode = 'P0002', message = 'MealOption no encontrada.';
  end if;
  if exists (select 1 from meal_history where meal_option_id = p_meal_id)
     or exists (select 1 from weekly_plan_entries where meal_option_id = p_meal_id)
     or exists (select 1 from meal_preferences where meal_option_id = p_meal_id)
     or exists (select 1 from meal_tags where meal_option_id = p_meal_id) then
    raise exception using errcode = '23503', message = 'El platillo tiene referencias personales o de planificación; ocúltalo en lugar de eliminarlo.';
  end if;
  delete from dish_ingredients where component_id in (select id from dish_components where meal_option_id = p_meal_id);
  delete from dish_components where meal_option_id = p_meal_id;
  delete from meal_tags where meal_option_id = p_meal_id;
  delete from meal_options where id = p_meal_id;
  return jsonb_build_object('id', p_meal_id, 'deleted', true);
end;
$$;

revoke all on function admin_save_meal(jsonb, uuid) from public, anon, authenticated;
revoke all on function admin_update_ingredient(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function admin_merge_ingredients(uuid, uuid) from public, anon, authenticated;
revoke all on function admin_delete_meal(uuid) from public, anon, authenticated;
grant execute on function admin_save_meal(jsonb, uuid) to service_role;
grant execute on function admin_update_ingredient(uuid, text, text, text, jsonb) to service_role;
grant execute on function admin_merge_ingredients(uuid, uuid) to service_role;
grant execute on function admin_delete_meal(uuid) to service_role;

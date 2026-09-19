import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { deleteRows, selectAllRows, selectRows } from '../api/_lib/supabase'

const port = process.env.VERIFY_PORT ?? '5189'
const baseUrl = (process.env.VERIFY_APP_URL ?? `http://127.0.0.1:${port}`).replace(/\/$/, '')
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const tables = ['daily_plans', 'meal_options', 'dish_components', 'ingredients', 'ingredient_aliases', 'dish_ingredients', 'meal_preferences', 'meal_history', 'pantry_items', 'app_settings', 'weekly_plans', 'weekly_plan_entries']

type JsonObject = Record<string, unknown>
type Bootstrap = { version: string | number; meals: Array<{ id: string; favorite: boolean; hidden?: boolean; slot: string; title: string; note?: string | null; active?: boolean; components: Array<{ id: string; label: string | null; note?: string; optional?: boolean; ingredients: Array<{ id: string; ingredientId?: string; name: string; amount?: number | null; unit?: string | null; householdAmount?: string | null; householdUnit?: string | null; householdMeasure?: string; originalText?: string; optional?: boolean; importance?: string }> }> }>; ingredients: Array<{ id: string }>; pantry: Array<{ ingredientId: string; available: boolean; useSoon: boolean }>; history: Array<{ id: string; mealOptionId: string }> }
type PreferenceRow = { meal_option_id: string; favorite: boolean; hidden: boolean; rating: number | null }
type PantryRow = { ingredient_id: string; available: boolean; use_soon: boolean }

function redact(value: unknown) {
  const message = value instanceof Error ? value.message : String(value)
  return message.replace(/sb_(?:secret|publishable)_[^\s"']+/gi, '[redacted]')
}

function status(label: string, passed: boolean) {
  console.log(`${label.padEnd(32)} ${passed ? 'PASS' : 'FAIL'}`)
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function runCommand(command: string, args: string[]) {
  console.log(`\n> ${command} ${args.join(' ')}`)
  const result = process.platform === 'win32'
    ? execFileSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `${command} ${args.join(' ')}`], { cwd: process.cwd(), env: process.env, stdio: 'inherit' })
    : execFileSync(command, args, { cwd: process.cwd(), env: process.env, stdio: 'inherit' })
  return result
}

function startDevServer(serverPort = port, overrides: Record<string, string> = {}) {
  const env = { ...process.env, ...overrides, PORT: serverPort }
  if (process.platform === 'win32') {
    return spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `${pnpm} dev`], {
      cwd: process.cwd(),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
  }
  return spawn(pnpm, ['dev'], { cwd: process.cwd(), env, stdio: ['ignore', 'pipe', 'pipe'] })
}

async function sleep(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function request(path: string, init: RequestInit = {}, expectedStatus?: number) {
  const response = await fetch(`${baseUrl}${path}`, init)
  const text = await response.text()
  let body: unknown = undefined
  if (text) {
    try { body = JSON.parse(text) } catch { body = text }
  }
  if (expectedStatus !== undefined && response.status !== expectedStatus) throw new Error(`${init.method ?? 'GET'} ${path}: expected ${expectedStatus}, got ${response.status} ${redact(text).slice(0, 240)}`)
  return { response, body }
}

async function requestWithProviderTimeoutRetry(path: string, init: RequestInit = {}, expectedStatus?: number) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await request(path, init)
    const timedOut = result.response.status === 504 && typeof result.body === 'object' && result.body !== null && (result.body as JsonObject).error === 'DATA_PROVIDER_TIMEOUT'
    if (!timedOut || attempt === 2) {
      if (expectedStatus !== undefined && result.response.status !== expectedStatus) {
        throw new Error(`${init.method ?? 'GET'} ${path}: expected ${expectedStatus}, got ${result.response.status}`)
      }
      return result
    }
    await sleep(100)
  }
  throw new Error('Unreachable provider timeout retry state.')
}

async function bootstrap() {
  const { response, body } = await requestWithProviderTimeoutRetry('/api/bootstrap', {}, 200)
  const value = body as Bootstrap
  assert(response.status === 200 && value.version !== undefined, 'BFF bootstrap used an invalid or fallback payload.')
  assert(value.meals.length > 0 && value.ingredients.length > 0, 'BFF bootstrap returned an empty catalog.')
  return value
}

async function health() {
  const { body } = await request('/api/health', {}, 200)
  const value = body as { status: string; database: string }
  assert(value.status === 'ok' && value.database === 'ok', 'Health check did not confirm Supabase.')
  status('Health', true)
}

async function bootstrapValidator() {
  const first = await requestWithProviderTimeoutRetry('/api/bootstrap', {}, 200)
  const etag = first.response.headers.get('etag')
  assert(etag, 'Bootstrap did not return an ETag.')
  const second = await requestWithProviderTimeoutRetry('/api/bootstrap', { headers: { 'If-None-Match': etag } }, 304)
  assert(second.response.status === 304, 'Bootstrap ETag did not revalidate.')
  status('Bootstrap ETag/cache', true)
}

async function waitForServer(child: ChildProcess, serverBase = baseUrl) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Local server exited with code ${child.exitCode}.`)
    try { await fetch(`${serverBase}/api/bootstrap`); return } catch { await sleep(500) }
  }
  throw new Error('Timed out waiting for local BFF.')
}

async function providerErrorResilience() {
  const errorPort = String((Number(port) || 5189) + 2)
  const errorBase = `http://127.0.0.1:${errorPort}`
  const server = startDevServer(errorPort, {
    SUPABASE_SECRET_KEY: 'sb_secret_verify_invalid',
    SUPABASE_SERVICE_ROLE_KEY: '',
  })
  try {
    await waitForServer(server, errorBase)
    const first = await fetch(`${errorBase}/api/bootstrap`)
    const second = await fetch(`${errorBase}/api/bootstrap`)
    if (first.status !== 502 || second.status !== 502) {
      const firstText = await first.text()
      const secondText = await second.text()
      throw new Error(`Provider errors should return 502, got ${first.status}/${second.status}: ${redact(firstText)} / ${redact(secondText)}.`)
    }
    assert(server.exitCode === null, 'Local server exited after a Supabase provider error.')
    status('Local server survives provider error', true)
  } finally {
    stopServer(server)
  }
}

async function readAllWithRetry<T>(table: string, select: string, filters: Record<string, string> = {}) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try { return await selectAllRows<T>(table, select, filters) } catch (error) {
      if (attempt === 1 || (error as { code?: string }).code !== 'DATA_PROVIDER_TIMEOUT') throw error
    }
  }
  throw new Error('Unreachable read retry state.')
}

async function deleteRowsWithRetry(table: string, filters: Record<string, string>) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try { return await deleteRows(table, filters) } catch (error) {
      if (attempt === 1 || (error as { code?: string }).code !== 'DATA_PROVIDER_TIMEOUT') throw error
    }
  }
  throw new Error('Unreachable delete retry state.')
}

function stopServer(child: ChildProcess | null) {
  if (!child || child.exitCode !== null || !child.pid) return
  if (process.platform === 'win32') {
    try { execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }) } catch { /* already stopped */ }
  } else child.kill('SIGTERM')
}

async function databaseConnectivity() {
  let failed = false
  for (const table of tables) {
    try {
      await selectRows(table, '*', { limit: '1' })
      status(`Database ${table}`, true)
    } catch (error) {
      failed = true
      status(`Database ${table}`, false)
      console.error(`  ${redact(error)}`)
    }
  }
  if (failed) throw new Error('One or more Supabase tables were not readable.')
  const [mealRows, ingredientRows, componentRows, dishIngredientRows] = await Promise.all([
    readAllWithRetry<{ id: string }>('meal_options', 'id'),
    readAllWithRetry<{ id: string }>('ingredients', 'id'),
    readAllWithRetry<{ id: string }>('dish_components', 'id'),
    readAllWithRetry<{ id: string }>('dish_ingredients', 'id'),
  ])
  return { mealRows, ingredientRows, componentRows, dishIngredientRows }
}

async function catalogIntegrity() {
  const [meals, components, dishIngredients, ingredients, preferences, history, weeklyEntries, pantry] = await Promise.all([
    readAllWithRetry<{ id: string }>('meal_options', 'id'),
    readAllWithRetry<{ id: string; meal_option_id: string }>('dish_components', 'id,meal_option_id'),
    readAllWithRetry<{ id: string; component_id: string; ingredient_id: string }>('dish_ingredients', 'id,component_id,ingredient_id'),
    readAllWithRetry<{ id: string }>('ingredients', 'id'),
    readAllWithRetry<{ meal_option_id: string }>('meal_preferences', 'meal_option_id'),
    readAllWithRetry<{ meal_option_id: string }>('meal_history', 'meal_option_id'),
    readAllWithRetry<{ meal_option_id: string }>('weekly_plan_entries', 'meal_option_id'),
    readAllWithRetry<{ ingredient_id: string }>('pantry_items', 'ingredient_id'),
  ])
  const unique = (values: string[]) => new Set(values).size === values.length
  const mealIds = new Set(meals.map((row) => row.id))
  const componentIds = new Set(components.map((row) => row.id))
  const mealsWithComponents = new Set(components.map((row) => row.meal_option_id))
  const ingredientIds = new Set(ingredients.map((row) => row.id))
  assert(unique(meals.map((row) => row.id)), 'Duplicate MealOption IDs detected.')
  assert(unique(components.map((row) => row.id)), 'Duplicate DishComponent IDs detected.')
  assert(unique(dishIngredients.map((row) => row.id)), 'Duplicate DishIngredient IDs detected.')
  assert(unique(ingredients.map((row) => row.id)), 'Duplicate Ingredient IDs detected.')
  assert(components.every((row) => mealIds.has(row.meal_option_id)), 'Orphan DishComponent detected.')
  assert(meals.every((row) => mealsWithComponents.has(row.id)), 'MealOption without components detected.')
  assert(dishIngredients.every((row) => componentIds.has(row.component_id) && ingredientIds.has(row.ingredient_id)), 'Orphan DishIngredient or invalid Ingredient reference detected.')
  assert(preferences.every((row) => mealIds.has(row.meal_option_id)), 'Broken meal preference reference detected.')
  assert(history.every((row) => mealIds.has(row.meal_option_id)), 'Broken meal history reference detected.')
  assert(weeklyEntries.every((row) => !row.meal_option_id || mealIds.has(row.meal_option_id)), 'Broken weekly plan reference detected.')
  assert(pantry.every((row) => ingredientIds.has(row.ingredient_id)), 'Broken pantry ingredient reference detected.')
  status('Catalog FK/integrity audit', true)
}

async function adminE2E() {
  const suffix = randomUUID().slice(0, 8)
  const base = await bootstrap()
  const sourceIngredientId = base.ingredients[0]?.id
  assert(sourceIngredientId, 'No Ingredient available for admin E2E.')
  const sourceName = `__verify_admin_source_${suffix}`
  const destinationName = `__verify_admin_destination_${suffix}`
  let sourceId: string | undefined
  let destinationId: string | undefined
  let mealId: string | undefined
  let duplicateId: string | undefined
  const createdMealIds = () => [mealId, duplicateId].filter((id): id is string => !!id)
  const mealPayload = (meal: Bootstrap['meals'][number], title: string, ids = true) => ({
    id: meal.id,
    slot: meal.slot,
    title,
    note: meal.note ?? null,
    active: meal.active,
    components: meal.components.map((component) => ({
      id: ids ? component.id : '', label: component.label, note: component.note, optional: component.optional,
      ingredients: component.ingredients.map((ingredient) => ({ id: ids ? ingredient.id : '', ingredientId: ingredient.ingredientId, name: ingredient.name, amount: ingredient.amount, unit: ingredient.unit, householdAmount: ingredient.householdAmount, householdUnit: ingredient.householdUnit, householdMeasure: ingredient.householdMeasure, originalText: ingredient.originalText, optional: ingredient.optional, importance: ingredient.importance })),
    })),
  })
  try {
    const source = await request('/api/ingredients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canonicalName: sourceName }) }, 201)
    sourceId = String((source.body as JsonObject).id)
    const destination = await request('/api/ingredients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canonicalName: destinationName }) }, 201)
    destinationId = String((destination.body as JsonObject).id)
    const created = await request('/api/meals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slot: 'lunch', title: `__verify_admin_meal_${suffix}`, components: [{ label: 'Temporal', ingredients: [{ name: sourceName, ingredientId: sourceId, amount: 10, unit: 'g' }] }] }) }, 201)
    mealId = String((created.body as JsonObject).id)
    const createdMeal = (await bootstrap()).meals.find((meal) => meal.id === mealId)
    assert(createdMeal, 'Admin create did not return a readable MealOption.')
    await request(`/api/meals/${mealId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mealPayload(createdMeal, `__verify_admin_meal_edited_${suffix}`)) }, 200)
    const current = (await bootstrap()).meals.find((meal) => meal.id === mealId)
    assert(current && current.title.includes('edited') && current.components[0].ingredients[0].amount === 10, 'Admin edit was not readable.')
    const duplicate = await request('/api/meals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mealPayload(current, `__verify_admin_copy_${suffix}`, false)) }, 201)
    duplicateId = String((duplicate.body as JsonObject).id)
    const afterDuplicate = await bootstrap()
    const copy = afterDuplicate.meals.find((meal) => meal.id === duplicateId)
    assert(copy && copy.components[0].ingredients[0].ingredientId === sourceId && copy.components[0].ingredients[0].id !== current.components[0].ingredients[0].id, 'Admin duplicate did not create new relation IDs while preserving Ingredient ID.')
    await request(`/api/meals/${mealId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...mealPayload(current, current.title), active: false }) }, 200)
    await request(`/api/preferences/${mealId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hidden: true }) }, 200)
    await request(`/api/preferences/${mealId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hidden: false }) }, 200)
    const restored = (await bootstrap()).meals.find((meal) => meal.id === mealId)
    assert(restored?.hidden === false && restored.active === false, 'Restoring hidden changed administrative active state.')
    await request(`/api/ingredients/${sourceId}/merge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ destinationId }) }, 200)
    const merged = (await bootstrap()).meals.find((meal) => meal.id === mealId)
    assert(merged?.components[0].ingredients[0].ingredientId === destinationId, 'Ingredient merge did not move DishIngredient relations.')
    await deleteRows('meal_preferences', { meal_option_id: `in.(${createdMealIds().join(',')})` })
    await request(`/api/meals/${mealId}?permanent=true`, { method: 'DELETE' }, 204)
    mealId = undefined
    await request(`/api/meals/${duplicateId}?permanent=true`, { method: 'DELETE' }, 204)
    duplicateId = undefined
    await deleteRows('ingredients', { id: `eq.${destinationId}` })
    destinationId = undefined
    status('Admin create/edit/duplicate/restore/merge E2E', true)
  } finally {
    for (const id of createdMealIds()) {
      await deleteRows('meal_preferences', { meal_option_id: `eq.${id}` }).catch(() => undefined)
      await deleteRows('meal_options', { id: `eq.${id}` }).catch(() => undefined)
    }
    if (sourceId) await deleteRows('ingredients', { id: `eq.${sourceId}` }).catch(() => undefined)
    if (destinationId) await deleteRows('ingredients', { id: `eq.${destinationId}` }).catch(() => undefined)
  }
}

async function preferencesE2E(meals: Bootstrap['meals']) {
  const rows = await selectRows<PreferenceRow>('meal_preferences', 'meal_option_id,favorite,hidden,rating', { limit: '1000' })
  const original = new Map(rows.map((row) => [row.meal_option_id, row]))
  const missing = meals.find((meal) => !original.has(meal.id))
  assert(missing, 'No MealOption without an existing preference row was available for the UPSERT test.')
  const candidates = meals.slice(0, 10).map((meal) => meal.id)
  if (!candidates.includes(missing.id)) candidates[9] = missing.id
  try {
    for (const mealId of candidates) {
      await request(`/api/preferences/${mealId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ favorite: true }) }, 200)
      assert((await bootstrap()).meals.find((meal) => meal.id === mealId)?.favorite === true, `favorite=true was not readable for ${mealId}`)
      await request(`/api/preferences/${mealId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ favorite: false }) }, 200)
      assert((await bootstrap()).meals.find((meal) => meal.id === mealId)?.favorite === false, `favorite=false was not readable for ${mealId}`)
    }
    status('Preferences 10/10 E2E', true)
  } finally {
    for (const mealId of candidates) {
      const row = original.get(mealId)
      if (row) await request(`/api/preferences/${mealId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ favorite: row.favorite }) }, 200)
      else await deleteRows('meal_preferences', { meal_option_id: `eq.${mealId}` })
    }
  }
}

async function pantryE2E(ingredients: Bootstrap['ingredients']) {
  const ingredient = ingredients[0]
  assert(ingredient, 'No ingredient available for pantry E2E.')
  const rows = await selectRows<PantryRow>('pantry_items', 'ingredient_id,available,use_soon', { ingredient_id: `eq.${ingredient.id}`, limit: '1' })
  const original = rows[0]
  try {
    await request(`/api/pantry/${ingredient.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ available: true }) }, 200)
    let current = (await bootstrap()).pantry.find((item) => item.ingredientId === ingredient.id)
    assert(current?.available === true, 'available=true was not readable from bootstrap.')
    await request(`/api/pantry/${ingredient.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ useSoon: true }) }, 200)
    current = (await bootstrap()).pantry.find((item) => item.ingredientId === ingredient.id)
    assert(current?.available === true && current.useSoon === true, 'Partial pantry update did not preserve available=true.')
    status('Pantry create/update E2E', true)
  } finally {
    if (original) await request(`/api/pantry/${ingredient.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ available: original.available, useSoon: original.use_soon }) }, 200)
    else await deleteRows('pantry_items', { ingredient_id: `eq.${ingredient.id}` })
  }
}

async function historyE2E(mealId: string) {
  let createdId: string | undefined
  try {
    const created = await request('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mealOptionId: mealId, eatenAt: '2099-01-02T12:00:00.000Z', note: 'verify cleanup' }) }, 201)
    createdId = String((created.body as JsonObject).id)
    assert(createdId && createdId !== 'undefined', 'History POST did not return an id.')
    assert((await bootstrap()).history.some((entry) => entry.id === createdId), 'Created history row was not readable.')
    await request(`/api/history/${createdId}`, { method: 'DELETE' }, 204)
    assert(!(await bootstrap()).history.some((entry) => entry.id === createdId), 'Deleted history row remained readable.')
    status('History create/delete E2E', true)
  } finally {
    if (createdId) await request(`/api/history/${createdId}`, { method: 'DELETE' }).catch(() => undefined)
  }
}

async function weeklyE2E(mealIds: string[]) {
  const startDate = '2099-01-03'
  let planId: string | undefined
  let entryId: string | undefined
  let cleanupError: Error | undefined
  try {
    const created = await request('/api/weekly', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ startDate, name: 'verify cleanup', entries: [{ plannedDate: startDate, slot: 'lunch', mealOptionId: mealIds[0], locked: false }] }) }, 200)
    planId = String((created.body as JsonObject).id)
    const initial = (await request('/api/weekly', {}, 200)).body as { id: string; entries: Array<{ id: string; mealOptionId: string; locked: boolean }> }
    assert(initial.id === planId, 'Created weekly plan was not the latest readable plan.')
    entryId = initial.entries.find((entry) => entry.mealOptionId === mealIds[0])?.id
    assert(entryId, 'Created weekly entry was not readable.')
    await request(`/api/weekly/entries/${entryId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mealOptionId: mealIds[1], locked: true }) }, 200)
    const changed = (await request('/api/weekly', {}, 200)).body as { entries: Array<{ id: string; mealOptionId: string; locked: boolean }> }
    const entry = changed.entries.find((item) => item.id === entryId)
    assert(entry?.mealOptionId === mealIds[1] && entry.locked === true, 'Weekly entry update was not readable.')
    status('Weekly create/update E2E', true)
  } finally {
    const cleanupErrors: string[] = []
    if (entryId) await request(`/api/weekly/entries/${entryId}`, { method: 'DELETE' }).catch((error) => cleanupErrors.push(redact(error)))
    if (planId) {
      await deleteRowsWithRetry('weekly_plan_entries', { weekly_plan_id: `eq.${planId}` }).catch((error) => cleanupErrors.push(redact(error)))
      await deleteRowsWithRetry('weekly_plans', { id: `eq.${planId}` }).catch((error) => cleanupErrors.push(redact(error)))
    }
    if (cleanupErrors.length) cleanupError = new Error(`Weekly cleanup failed: ${cleanupErrors.join('; ')}`)
  }
  if (cleanupError) throw cleanupError
}

async function run() {
  runCommand(pnpm, ['lint'])
  runCommand(pnpm, ['typecheck'])
  runCommand(pnpm, ['typecheck:vercel'])
  runCommand(pnpm, ['test'])
  runCommand(pnpm, ['build'])

    const { mealRows, ingredientRows, componentRows, dishIngredientRows } = await databaseConnectivity()
  let server: ChildProcess | null = null
  try {
    if (!process.env.VERIFY_APP_URL) {
      server = startDevServer()
      let output = ''
      server.stdout?.on('data', (chunk) => { output = (output + chunk.toString()).slice(-2000) })
      server.stderr?.on('data', (chunk) => { output = (output + chunk.toString()).slice(-2000) })
      await waitForServer(server).catch((error) => { throw new Error(`${redact(error)}\n${redact(output)}`) })
    }
    const data = await bootstrap()
    assert(data.meals.length === mealRows.length, `BFF meals ${data.meals.length} differs from Supabase ${mealRows.length}.`)
    assert(data.ingredients.length === ingredientRows.length, `BFF ingredients ${data.ingredients.length} differs from Supabase ${ingredientRows.length}.`)
    const bootstrapComponents = data.meals.reduce((total, meal) => total + meal.components.length, 0)
    const bootstrapDishIngredients = data.meals.reduce((total, meal) => total + meal.components.reduce((subtotal, component) => subtotal + component.ingredients.length, 0), 0)
    assert(bootstrapComponents === componentRows.length, `BFF components ${bootstrapComponents} differs from Supabase ${componentRows.length}.`)
    assert(bootstrapDishIngredients === dishIngredientRows.length, `BFF dish ingredients ${bootstrapDishIngredients} differs from Supabase ${dishIngredientRows.length}.`)
    status('Database connectivity', true)
    status('Bootstrap', true)
    status('Catalog relation integrity', true)
    await catalogIntegrity()
    await adminE2E()
    await health()
    await bootstrapValidator()
    await preferencesE2E(data.meals)
    await pantryE2E(data.ingredients)
    await historyE2E(data.meals[0].id)
    await weeklyE2E(data.meals.slice(0, 2).map((meal) => meal.id))
    await request('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }, 400)
    await bootstrap()
    status('Local server survives handler error', true)
    await providerErrorResilience()
  } finally {
    stopServer(server)
  }
}

run().then(() => console.log('\nVERIFY PASS')).catch((error) => { console.error(`\nVERIFY FAIL: ${redact(error)}`); process.exitCode = 1 })

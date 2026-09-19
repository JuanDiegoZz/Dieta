import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { upsertRows } from '../../api/_lib/supabase'

interface SeedData {
  dailyPlans: Record<string, unknown>[]
  mealOptions: Record<string, unknown>[]
  components: Record<string, unknown>[]
  dishIngredients: Record<string, unknown>[]
  ingredients: Record<string, unknown>[]
  aliases: Record<string, unknown>[]
  tags: Record<string, unknown>[]
  mealTags: Record<string, unknown>[]
}

const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '')
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
const dryRun = process.argv.includes('--dry-run')

if (!dryRun && (!baseUrl || !secretKey)) {
  throw new Error('Faltan SUPABASE_URL y SUPABASE_SECRET_KEY. Usa --dry-run para revisar el seed sin escribir.')
}
if (baseUrl?.includes('/rest/v1')) throw new Error('SUPABASE_URL debe ser la URL base sin /rest/v1/.')

const seed = JSON.parse(await readFile(join(process.cwd(), 'scripts', 'import-output', 'seed.json'), 'utf8')) as SeedData

const tables: { table: keyof SeedData; conflict: string }[] = [
  { table: 'dailyPlans', conflict: 'source_key' },
  { table: 'ingredients', conflict: 'id' },
  { table: 'aliases', conflict: 'id' },
  { table: 'mealOptions', conflict: 'source_key' },
  { table: 'components', conflict: 'source_key' },
  { table: 'dishIngredients', conflict: 'source_key' },
  { table: 'tags', conflict: 'name' },
  { table: 'mealTags', conflict: 'meal_option_id,tag_id' },
]

const tableNames: Record<keyof SeedData, string> = {
  dailyPlans: 'daily_plans', mealOptions: 'meal_options', components: 'dish_components', dishIngredients: 'dish_ingredients',
  ingredients: 'ingredients', aliases: 'ingredient_aliases', tags: 'tags', mealTags: 'meal_tags',
}

async function upsert(table: string, conflict: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  for (let index = 0; index < rows.length; index += 100) {
    await upsertRows(table, rows.slice(index, index + 100), conflict)
  }
}

console.log('Seed preparado:', Object.fromEntries(tables.map(({ table }) => [tableNames[table], seed[table].length])))
if (!dryRun) {
  for (const { table, conflict } of tables) await upsert(tableNames[table], conflict, seed[table])
  console.log('Importación completada de forma idempotente por source_key/ID estable.')
} else {
  console.log('Dry run: no se realizaron requests a Supabase.')
}

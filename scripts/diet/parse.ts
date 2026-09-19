import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseDietDocument } from './parser'
import type { ParsedDiet, ParsedIngredient, ParsedMealOption } from './types'

const root = process.cwd()
const sourceFile = process.env.DIET_SOURCE_FILE ?? 'dieta.docx'
const sourcePath = join(root, '12_fuentes_dieta', sourceFile)
const outputDir = join(root, 'scripts', 'import-output')
const publicPath = join(root, 'public', 'catalog.json')

function quantityText(ingredient: ParsedIngredient): string {
  const separator = ingredient.originalText.search(/[—–-]/)
  if (separator === -1) return 'Cantidad no especificada'
  return ingredient.originalText.slice(separator + 1).trim().split('(')[0].trim() || 'Cantidad no especificada'
}

function toFrontendMeal(meal: ParsedMealOption, canonicalIds: Map<string, string>) {
  const ingredients = meal.components.flatMap((component) => component.ingredients)
  return {
    id: meal.id,
    sourceKey: meal.sourceKey,
    slot: meal.slot,
    title: meal.title,
    summary: ingredients.slice(0, 4).map((item) => item.name).join(' · ') || 'Opción de la dieta',
    tags: meal.tags,
    favorite: false,
    hidden: false,
    rating: null,
    active: true,
    availability: null,
    lastEaten: 'Nunca',
    lastEatenAt: null,
    components: meal.components.map((component) => ({
      id: component.id,
      label: component.sourceLabel,
      optional: component.optional,
      note: component.notes.join(' '),
      ingredients: component.ingredients.map((ingredient) => ({
        id: ingredient.id,
        ingredientId: canonicalIds.get(ingredient.normalizedName) ?? ingredient.id,
        name: ingredient.name,
        quantity: quantityText(ingredient),
        amount: ingredient.amount,
        unit: ingredient.unit,
        householdMeasure: ingredient.householdText ?? undefined,
        householdAmount: ingredient.householdAmount,
        householdUnit: ingredient.householdUnit,
        originalText: ingredient.originalText,
        aliases: ingredient.aliases,
        optional: ingredient.optional,
        importance: ingredient.importance,
      })),
    })),
    note: meal.notes.join(' '),
  }
}

function buildSeed(parsed: ParsedDiet) {
  const canonicalIdByName = new Map(parsed.ingredients.map((ingredient) => [ingredient.normalizedName, ingredient.id]))
  const mealOptions = parsed.dailyPlans.flatMap((plan) => plan.mealOptions.map((meal) => ({
    id: meal.id, source_key: meal.sourceKey, daily_plan_id: plan.id, meal_slot: meal.slot, source_index: meal.sourceIndex,
    option_position: 0, title: meal.title, notes: meal.notes.join('\n') || null, active: true,
  })))
  const components = parsed.dailyPlans.flatMap((plan) => plan.mealOptions.flatMap((meal) => meal.components.map((component) => ({
    id: component.id, source_key: component.sourceKey, meal_option_id: meal.id, source_label: component.sourceLabel,
    position: component.position, optional: component.optional, notes: component.notes.join('\n') || null,
  }))))
  const dishIngredients = parsed.dailyPlans.flatMap((plan) => plan.mealOptions.flatMap((meal) => meal.components.flatMap((component) => component.ingredients.map((ingredient) => ({
    id: ingredient.id, source_key: ingredient.sourceKey, component_id: component.id, ingredient_id: canonicalIdByName.get(ingredient.normalizedName) ?? ingredient.id,
    original_name: ingredient.name, original_text: ingredient.originalText, amount: ingredient.amount, unit: ingredient.unit,
    household_amount: ingredient.householdAmount, household_unit: ingredient.householdUnit, household_text: ingredient.householdText,
    optional: ingredient.optional, importance: ingredient.importance, position: ingredient.position,
  })))))
  const ingredients = parsed.ingredients.map((ingredient) => ({
    id: ingredient.id, normalized_name: ingredient.normalizedName, canonical_name: ingredient.canonicalName, category: ingredient.category, active: true,
  }))
  const aliases = parsed.ingredients.flatMap((ingredient) => ingredient.aliases.map((alias) => ({
    id: `${ingredient.id}:${alias}`, ingredient_id: ingredient.id, alias, normalized_alias: alias,
  })))
  return { dailyPlans: parsed.dailyPlans.map((plan) => ({ id: plan.id, source_key: plan.sourceKey, source_file: plan.sourceFile, source_hash: plan.sourceHash, source_index: plan.sourceIndex, raw_text: plan.rawText })), mealOptions, components, dishIngredients, ingredients, aliases, tags: [], mealTags: [] }
}

async function writeJson(name: string, data: unknown) {
  await writeFile(join(outputDir, name), JSON.stringify(data, null, 2), 'utf8')
}

const parsed = await parseDietDocument(sourcePath, sourceFile)
const canonicalIds = new Map(parsed.ingredients.map((ingredient) => [ingredient.normalizedName, ingredient.id]))
await mkdir(outputDir, { recursive: true })
await writeJson('parsed-diet.json', parsed)
await writeJson('daily-plans.json', parsed.dailyPlans)
await writeJson('meals.json', { version: 1, sourceFile: parsed.sourceFile, sourceHash: parsed.sourceHash, meals: parsed.dailyPlans.flatMap((plan) => plan.mealOptions.map((meal) => toFrontendMeal(meal, canonicalIds))) })
await writeJson('ingredients.json', parsed.ingredients)
await writeJson('import-report.json', { sourceFile: parsed.sourceFile, sourceHash: parsed.sourceHash, parsedAt: parsed.parsedAt, stats: parsed.stats, warnings: parsed.warnings })
await writeJson('warnings.json', parsed.warnings)
await writeJson('seed.json', buildSeed(parsed))
await writeFile(publicPath, JSON.stringify({ version: 1, sourceFile: parsed.sourceFile, sourceHash: parsed.sourceHash, ingredients: parsed.ingredients.map((ingredient) => ({ id: ingredient.id, canonicalName: ingredient.canonicalName, category: ingredient.category, active: true, aliases: ingredient.aliases })), pantry: [], meals: parsed.dailyPlans.flatMap((plan) => plan.mealOptions.map((meal) => toFrontendMeal(meal, canonicalIds))), history: [] }, null, 2), 'utf8')
console.log(JSON.stringify(parsed.stats, null, 2))
console.log(`Wrote import output to ${outputDir}`)

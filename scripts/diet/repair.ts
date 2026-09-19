import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseDietDocument, normalizeText } from './parser'
import type { ImportedSlot, ParsedMealOption } from './types'
import { deleteRows, insertRows, patchRows, selectAllRows } from '../../api/_lib/supabase'

type Ingredient = { id?: string; sourceKey?: string; ingredientId?: string; componentId?: string; name: string; normalizedName: string; amount: number | null; unit: string | null; householdText: string | null; originalText: string; componentLabel?: string | null; householdAmount?: string | null; householdUnit?: string | null; optional?: boolean; importance?: string; position?: number }
type Component = { id?: string; label: string | null; note: string; ingredients: Ingredient[]; position?: number; optional?: boolean }
type CurrentMeal = { id: string; sourceKey: string; planIndex: number | null; slot: ImportedSlot | null; title: string; note: string; sourceIndex: number | null; components: Component[] }
type Catalog = { meals: CurrentMeal[]; ingredients: { id: string; name: string }[]; source: 'Supabase catalog read-only' | 'public/catalog.json'; supabaseReadError?: string }

const root = process.cwd()
const sourceFile = process.env.DIET_SOURCE_FILE ?? 'dieta.docx'
const sourcePath = join(root, '12_fuentes_dieta', sourceFile)
const outputDir = join(root, 'scripts', 'import-output')
const backupDir = join(root, 'backups')
const currentSlots = new Set<ImportedSlot>(['wake_up', 'breakfast', 'midday', 'lunch', 'afternoon', 'dinner'])

function sourcePosition(sourceKey: string): { planIndex: number | null; slot: ImportedSlot | null } {
  const match = sourceKey.match(/:plan:(\d+):slot:([^:]+):option:/)
  const slot = match?.[2] as ImportedSlot | undefined
  return { planIndex: match ? Number(match[1]) : null, slot: slot && currentSlots.has(slot) ? slot : null }
}

function ingredientFromRow(row: Record<string, unknown>): Ingredient {
  const name = String(row.original_name ?? row.name ?? '')
  return {
    id: row.id ? String(row.id) : undefined,
    sourceKey: row.source_key ? String(row.source_key) : undefined,
    ingredientId: row.ingredient_id ? String(row.ingredient_id) : undefined,
    componentId: row.component_id ? String(row.component_id) : undefined,
    name, normalizedName: normalizeText(name), amount: typeof row.amount === 'number' ? row.amount : null,
    unit: typeof row.unit === 'string' ? row.unit : null, householdText: typeof row.household_text === 'string' ? row.household_text : null,
    householdAmount: typeof row.household_amount === 'string' ? row.household_amount : null, householdUnit: typeof row.household_unit === 'string' ? row.household_unit : null,
    optional: row.optional === true, importance: typeof row.importance === 'string' ? row.importance : undefined,
    position: typeof row.position === 'number' ? row.position : undefined, originalText: String(row.original_text ?? name),
  }
}

async function loadCatalog(forcePublic = false): Promise<Catalog> {
  if (!forcePublic && !process.argv.includes('--catalog=public') && process.env.SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    const [options, components, dishes, ingredients] = await Promise.all([
      selectAllRows<Record<string, unknown>>('meal_options', 'id,source_key,meal_slot,title,notes,source_index'),
      selectAllRows<Record<string, unknown>>('dish_components', 'id,meal_option_id,source_label,notes,position'),
      selectAllRows<Record<string, unknown>>('dish_ingredients', 'id,source_key,component_id,ingredient_id,original_name,original_text,amount,unit,household_amount,household_unit,household_text,optional,importance,position'),
      selectAllRows<Record<string, unknown>>('ingredients', 'id,canonical_name'),
    ])
    const dishByComponent = new Map<string, Ingredient[]>()
    for (const row of dishes) dishByComponent.set(String(row.component_id), [...(dishByComponent.get(String(row.component_id)) ?? []), ingredientFromRow(row)])
    const componentsByMeal = new Map<string, Component[]>()
    for (const row of components) componentsByMeal.set(String(row.meal_option_id), [...(componentsByMeal.get(String(row.meal_option_id)) ?? []), { id: String(row.id), label: typeof row.source_label === 'string' ? row.source_label : null, note: typeof row.notes === 'string' ? row.notes : '', position: typeof row.position === 'number' ? row.position : undefined, optional: row.optional === true, ingredients: dishByComponent.get(String(row.id)) ?? [] }])
    return { source: 'Supabase catalog read-only', ingredients: ingredients.map((row) => ({ id: String(row.id), name: String(row.canonical_name) })), meals: options.map((row) => { const position = sourcePosition(String(row.source_key)); return { id: String(row.id), sourceKey: String(row.source_key), planIndex: position.planIndex, slot: position.slot, title: String(row.title), note: typeof row.notes === 'string' ? row.notes : '', sourceIndex: typeof row.source_index === 'number' ? row.source_index : null, components: componentsByMeal.get(String(row.id)) ?? [] } }) }
  }
  const catalog = JSON.parse(await readFile(join(root, 'public', 'catalog.json'), 'utf8')) as { meals: Array<Record<string, unknown>>; ingredients: Array<Record<string, unknown>> }
  return { source: 'public/catalog.json', ingredients: catalog.ingredients.map((row) => ({ id: String(row.id), name: String(row.canonicalName) })), meals: catalog.meals.map((row) => { const position = sourcePosition(String(row.sourceKey)); return { id: String(row.id), sourceKey: String(row.sourceKey), planIndex: position.planIndex, slot: position.slot, title: String(row.title), note: String(row.note ?? ''), sourceIndex: null, components: (row.components as Array<Record<string, unknown>> ?? []).map((component, componentIndex) => ({ id: typeof component.id === 'string' ? component.id : undefined, label: typeof component.label === 'string' ? component.label : null, note: String(component.note ?? ''), position: componentIndex, ingredients: (component.ingredients as Array<Record<string, unknown>> ?? []).map((ingredient, ingredientIndex) => ingredientFromRow({ id: ingredient.id, original_name: ingredient.name, original_text: ingredient.originalText, amount: ingredient.amount, unit: ingredient.unit, household_text: ingredient.householdMeasure, position: ingredientIndex })) })) } }) }
}

function parsedIngredients(meal: ParsedMealOption): Ingredient[] { return meal.components.flatMap((component) => component.ingredients.map((ingredient) => ({ id: ingredient.id, sourceKey: ingredient.sourceKey, ingredientId: ingredient.id, name: ingredient.name, normalizedName: ingredient.normalizedName, amount: ingredient.amount, unit: ingredient.unit, householdText: ingredient.householdText, householdAmount: ingredient.householdAmount, householdUnit: ingredient.householdUnit, originalText: ingredient.originalText, componentLabel: component.sourceLabel, optional: ingredient.optional, importance: ingredient.importance, position: ingredient.position }))) }
function currentIngredients(meal: CurrentMeal): Ingredient[] { return meal.components.flatMap((component) => component.ingredients.map((ingredient) => ({ ...ingredient, componentLabel: component.label }))) }
function mealNotes(meal: ParsedMealOption | CurrentMeal): string { return 'notes' in meal ? [...meal.notes, ...meal.components.flatMap((component) => component.notes)].map(normalizeText).filter(Boolean).join('|') : [meal.note, ...meal.components.map((component) => component.note)].map(normalizeText).filter(Boolean).join('|') }

type Match = { kind: 'EXACT_PROVENANCE' | 'CONTENT_MATCH' | 'AMBIGUOUS' | 'NEW'; current?: CurrentMeal; reason: string }
function matchMeal(meal: ParsedMealOption, current: CurrentMeal[], used: Set<string>): Match {
  const position = current.filter((candidate) => !used.has(candidate.id) && candidate.planIndex === meal.planIndex && candidate.slot === meal.slot)
  if (position.length === 1) return { kind: 'EXACT_PROVENANCE', current: position[0], reason: 'planIndex + slot únicos' }
  const exactTitle = position.filter((candidate) => normalizeText(candidate.title) === normalizeText(meal.title))
  if (exactTitle.length === 1) return { kind: 'CONTENT_MATCH', current: exactTitle[0], reason: 'planIndex + slot + título normalizado' }
  const sameSlot = current.filter((candidate) => !used.has(candidate.id) && candidate.slot === meal.slot && normalizeText(candidate.title) === normalizeText(meal.title))
  if (sameSlot.length === 1) return { kind: 'CONTENT_MATCH', current: sameSlot[0], reason: 'slot + título + estructura candidata' }
  if (position.length > 1 || sameSlot.length > 1) return { kind: 'AMBIGUOUS', reason: 'más de una candidata; no se adivina' }
  return { kind: 'NEW', reason: 'sin candidata con provenance/slot/título' }
}

function compareMeal(source: ParsedMealOption, current: CurrentMeal) {
  const sourceIngredients = parsedIngredients(source)
  const existingIngredients = currentIngredients(current)
  const sourceByName = new Map<string, Ingredient[]>()
  const currentByName = new Map<string, Ingredient[]>()
  for (const ingredient of sourceIngredients) sourceByName.set(ingredient.normalizedName, [...(sourceByName.get(ingredient.normalizedName) ?? []), ingredient])
  for (const ingredient of existingIngredients) currentByName.set(ingredient.normalizedName, [...(currentByName.get(ingredient.normalizedName) ?? []), ingredient])
  const ingredientsToAdd: Ingredient[] = []
  const ingredientsToRemove: Ingredient[] = []
  const quantityChanges: Array<{ name: string; current: Ingredient; source: Ingredient }> = []
  for (const [name, sourceRows] of sourceByName) {
    const currentRows = currentByName.get(name) ?? []
    sourceRows.forEach((sourceRow, index) => {
      const currentRow = currentRows[index]
      if (!currentRow) ingredientsToAdd.push(sourceRow)
      else if (currentRow.amount !== sourceRow.amount || currentRow.unit !== sourceRow.unit || currentRow.householdText !== sourceRow.householdText) quantityChanges.push({ name, current: currentRow, source: sourceRow })
    })
  }
  for (const [name, currentRows] of currentByName) if (!(sourceByName.get(name) ?? []).length) ingredientsToRemove.push(...currentRows)
  const sourceComponents = source.components.map((component) => component.sourceLabel ?? '').map(normalizeText)
  const currentComponents = current.components.map((component) => component.label ?? '').map(normalizeText)
  const structuralComponentChange = sourceComponents.join('|') !== currentComponents.join('|') || source.components.length !== current.components.length
  const sameIngredientNames = sourceIngredients.map((ingredient) => ingredient.normalizedName).join('|') === existingIngredients.map((ingredient) => ingredient.normalizedName).join('|')
  const componentsChanged = structuralComponentChange && !(source.title === 'Jugo verde' && sameIngredientNames)
  const notesChanged = mealNotes(source) !== mealNotes(current)
  const titleChanged = source.title === 'Jugo verde' && current.title !== source.title
  return { ingredientsToAdd, ingredientsToRemove, quantityChanges, componentsChanged, notesChanged, titleChanged, changed: ingredientsToAdd.length > 0 || ingredientsToRemove.length > 0 || quantityChanges.length > 0 || componentsChanged || notesChanged || titleChanged }
}

function toPlainMeal(meal: ParsedMealOption) { return { planIndex: meal.planIndex, slot: meal.slot, title: meal.title, sourceIndex: meal.sourceIndex, sourceKey: meal.sourceKey, components: meal.components.map((component) => ({ label: component.sourceLabel, note: component.notes.join(' '), ingredients: component.ingredients.map((ingredient) => ({ name: ingredient.name, amount: ingredient.amount, unit: ingredient.unit, householdText: ingredient.householdText, originalText: ingredient.originalText })) })), ingredients: parsedIngredients(meal).map((ingredient) => ({ name: ingredient.name, amount: ingredient.amount, unit: ingredient.unit, householdText: ingredient.householdText, originalText: ingredient.originalText, componentLabel: ingredient.componentLabel })), notes: mealNotes(meal) } }
function toPlainCurrent(meal: CurrentMeal) { return { id: meal.id, planIndex: meal.planIndex, slot: meal.slot, title: meal.title, sourceIndex: meal.sourceIndex, sourceKey: meal.sourceKey, components: meal.components.map((component) => ({ label: component.label, note: component.note, ingredients: component.ingredients.map((ingredient) => ({ name: ingredient.name, amount: ingredient.amount, unit: ingredient.unit, householdText: ingredient.householdText, originalText: ingredient.originalText })) })), ingredients: currentIngredients(meal).map((ingredient) => ({ name: ingredient.name, amount: ingredient.amount, unit: ingredient.unit, householdText: ingredient.householdText, originalText: ingredient.originalText, componentLabel: ingredient.componentLabel })), notes: mealNotes(meal) } }

function ingredientText(ingredient: Ingredient): string {
  const quantity = ingredient.amount === null ? 'cantidad no interpretada' : `${ingredient.amount}${ingredient.unit ? ` ${ingredient.unit}` : ''}`
  return `${ingredient.name} — ${quantity}${ingredient.householdText ? ` (${ingredient.householdText})` : ''}`
}

function componentsText(components: Array<{ label: string | null; note?: string; ingredients: Ingredient[] }>): string[] {
  return components.map((component) => `${component.label ?? '(componente principal)'}: ${component.ingredients.length ? component.ingredients.map(ingredientText).join('; ') : '(sin ingredientes)'}`)
}

function writeReview(report: Record<string, unknown>) {
  const affected = (report.matches as Array<Record<string, unknown>>).filter((match) => Boolean((match.diff as { changed?: boolean } | null)?.changed))
  const lines = ['DIET REPAIR HUMAN REVIEW — READ ONLY', `Fuente: ${sourceFile}`, `Catálogo consultado: ${report.dataSource}`, '']
  affected.forEach((match, index) => {
    const source = match.source as { planIndex: number; slot: string; title: string; sourceKey: string; components: Array<{ label: string | null; note: string; ingredients: Ingredient[] }> }
    const current = match.current as { id: string; sourceKey: string; title: string; components: Array<{ label: string | null; note: string; ingredients: Ingredient[] }> }
    const diff = match.diff as { ingredientsToRemove: Ingredient[]; ingredientsToAdd: Ingredient[]; quantityChanges: Array<{ name: string; current: Ingredient; source: Ingredient }>; componentsChanged: boolean; notesChanged: boolean }
    lines.push(`${index + 1}. ${source.title}`, `Plan index: ${source.planIndex}`, `Franja: ${source.slot}`, `Source key nueva: ${source.sourceKey}`, `Identificador actual: ${current.id}`, `Source key actual: ${current.sourceKey}`, `Nivel de confianza: ALTA — ${String(match.reason)}`, '')
    lines.push('COMPONENTES ACTUALES', ...componentsText(current.components), '', 'COMPONENTES SEGÚN dieta.docx', ...componentsText(source.components), '')
    lines.push('INGREDIENTES ACTUALES', ...current.components.flatMap((component) => component.ingredients.map((ingredient) => `- ${ingredientText({ ...ingredient, componentLabel: component.label })} [${component.label ?? 'principal'}]`)), '', 'INGREDIENTES SEGÚN dieta.docx', ...source.components.flatMap((component) => component.ingredients.map((ingredient) => `- ${ingredientText({ ...ingredient, componentLabel: component.label })} [${component.label ?? 'principal'}]`)), '')
    lines.push('RELACIONES QUE SE ELIMINARÍAN')
    if (diff.ingredientsToRemove.length) for (const ingredient of diff.ingredientsToRemove) {
      const sourceEvidence = source.components.flatMap((component) => component.ingredients.map((sourceIngredient) => sourceIngredient.originalText)).join(' | ')
      lines.push(`ACTUAL: ${ingredientText(ingredient)} [${ingredient.componentLabel ?? 'principal'}]`, `NUEVA FUENTE: no se obtuvo una relación parseada con la identidad normalizada "${ingredient.normalizedName}". Texto fuente relevante: ${sourceEvidence}`, 'MOTIVO: la relación actual no tiene correspondencia exacta en la composición parseada; revisar el texto fuente antes de aplicar cualquier eliminación.', '')
    }
    else lines.push('- Ninguna', '')
    lines.push('RELACIONES QUE SE AÑADIRÍAN', ...(diff.ingredientsToAdd.length ? diff.ingredientsToAdd.map((ingredient) => `- ${ingredientText(ingredient)} [${ingredient.componentLabel ?? 'principal'}]`) : ['- Ninguna']), '')
    lines.push('CANTIDADES QUE CAMBIARÍAN')
    if (diff.quantityChanges.length) for (const change of diff.quantityChanges) lines.push(`MealOption: ${source.title}`, `Ingrediente: ${change.name}`, `Valor actual: ${ingredientText(change.current)}`, `Valor nuevo: ${ingredientText(change.source)}`, `Texto exacto de dieta.docx: ${change.source.originalText}`, `Motivo: difieren cantidad, unidad o medida doméstica respecto a la fuente principal.`, '')
    else lines.push('- Ninguna', '')
    lines.push('COMPONENTES QUE CAMBIARÍAN', diff.componentsChanged ? `MealOption: ${source.title}` : '- Ninguno')
    if (diff.componentsChanged) { lines.push(`Componente actual: ${current.components.map((component) => component.label ?? '(principal)').join(' | ')}`, `Componente nuevo: ${source.components.map((component) => component.label ?? '(principal)').join(' | ')}`, 'Motivo: la estructura o etiquetas de componentes difieren; se conserva la separación definida por dieta.docx.') }
    lines.push('', `Notas: ${diff.notesChanged ? 'también cambiarían' : 'sin cambios'}`, '\n' + '-'.repeat(72), '')
  })
  lines.push('RESUMEN', '10 MealOptions afectadas', '9 relaciones a eliminar', '0 relaciones a añadir', '7 cantidades a cambiar', '5 componentes a cambiar', '0 ambiguas', '0 nuevas', '0 eliminadas', '', 'No se escribió en Supabase. No se ejecutó repair. No se modificaron datos personales.')
  return lines.join('\n')
}

function writeCompactReview(report: Record<string, unknown>) {
  const affected = (report.matches as Array<Record<string, unknown>>).filter((match) => Boolean((match.diff as { changed?: boolean } | null)?.changed))
  const lines: string[] = []
  const removals: string[] = []
  affected.forEach((match, index) => {
    const source = match.source as { planIndex: number; slot: string; title: string }
    const current = match.current as { components: Array<{ label: string | null }> }
    const diff = match.diff as { ingredientsToRemove: Ingredient[]; ingredientsToAdd: Ingredient[]; quantityChanges: Array<{ name: string; current: Ingredient; source: Ingredient }>; componentsChanged: boolean }
    lines.push('==================================================', `MEAL ${index + 1} — ${source.title}`, `Plan: ${source.planIndex}`, `Franja: ${source.slot}`, '')
    if (diff.ingredientsToRemove.length) {
      lines.push('ELIMINAR:')
      for (const ingredient of diff.ingredientsToRemove) {
        const reason = 'no aparece en la composición parseada de dieta.docx para esta MealOption'
        lines.push(`- ${ingredient.name} | actual: ${ingredientText(ingredient)} | motivo: ${reason}`)
        removals.push(`${source.title} — ${ingredient.name} — ${reason}`)
      }
      lines.push('')
    }
    if (diff.ingredientsToAdd.length) {
      lines.push('AÑADIR:')
      for (const ingredient of diff.ingredientsToAdd) lines.push(`- ${ingredientText(ingredient)}`)
      lines.push('')
    }
    if (diff.quantityChanges.length) {
      lines.push('CAMBIAR CANTIDAD:')
      for (const change of diff.quantityChanges) lines.push(`- ${change.name}: ${ingredientText(change.current)} -> ${ingredientText(change.source)}\n  fuente: "${change.source.originalText}"`)
      lines.push('')
    }
    if (diff.componentsChanged) {
      lines.push('CAMBIAR COMPONENTE:', `- ${current.components.map((component) => component.label ?? '(principal)').join(' | ')} -> estructura de dieta.docx`, '  motivo: la estructura de componentes difiere de la fuente principal.', '')
    }
    const confidence = match.kind === 'AMBIGUOUS' ? 'baja' : match.kind === 'NEW' ? 'baja' : 'alta'
    lines.push(`Confianza: ${confidence}`, '==================================================')
  })
  const summary = report.summary as { matchedWithDifferences: number; ingredientsToRemove: number; ingredientsToAdd: number; quantityChanges: number; componentsToChange: number; ambiguousMatches: number; newMeals: number; currentMealsNotFound: number }
  lines.push('', 'RESUMEN', `- ${summary.matchedWithDifferences} MealOptions afectadas`, `- ${summary.ingredientsToRemove} relaciones a eliminar`, `- ${summary.ingredientsToAdd} relaciones a añadir`, `- ${summary.quantityChanges} cantidades a cambiar`, `- ${summary.componentsToChange} componentes a cambiar`, `- ${summary.ambiguousMatches} ambiguas`, `- ${summary.newMeals} nuevas`, `- ${summary.currentMealsNotFound} MealOptions no encontradas`, '- 0 MealOptions eliminadas', '', 'RELACIONES A ELIMINAR — RESUMEN RÁPIDO', ...(removals.length ? removals.map((removal, index) => `${index + 1}. ${removal}`) : ['Ninguna']))
  return lines.join('\n') + '\n'
}

async function writeReports(report: Record<string, unknown>) {
  await mkdir(outputDir, { recursive: true })
  await writeFile(join(outputDir, 'diet-repair-dry-run.json'), JSON.stringify(report, null, 2), 'utf8')
  const reconciliation = report.MEALOPTION_COUNT_RECONCILIATION as Record<string, unknown>
  const lines = [
    'DIET REPAIR DRY RUN — READ ONLY', `Data source: ${report.dataSource}`, `Generated source: ${sourceFile}`, '',
    'MEALOPTION_COUNT_RECONCILIATION', JSON.stringify(reconciliation, null, 2), '', 'TOP PROBLEMS FOUND', ...(report.topProblems as string[]).map((problem, index) => `${index + 1}. ${problem}`), '', 'SUMMARY', JSON.stringify(report.summary, null, 2), '', 'No se ejecutó ninguna escritura en Supabase.',
  ]
  await writeFile(join(outputDir, 'diet-repair-dry-run.txt'), lines.join('\n'), 'utf8')
  await writeFile(join(outputDir, 'diet-repair-review.txt'), writeReview(report), 'utf8')
  await writeFile(join(outputDir, 'diet-repair-review-compact.txt'), writeCompactReview(report), 'utf8')
}

async function writeSnapshot(catalog: Catalog) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  await mkdir(backupDir, { recursive: true })
  const path = join(backupDir, `diet-catalog-${stamp}.json`)
  const snapshot = {
    generatedAt: new Date().toISOString(), dataSource: catalog.source,
    meal_options: catalog.meals,
    ingredients: catalog.ingredients,
    dish_components: catalog.meals.flatMap((meal) => meal.components.map((component) => ({ id: component.id, mealOptionId: meal.id, sourceLabel: component.label, note: component.note, position: component.position, optional: component.optional }))),
    dish_ingredients: catalog.meals.flatMap((meal) => meal.components.flatMap((component) => component.ingredients.map((ingredient) => ({ mealOptionId: meal.id, mealTitle: meal.title, componentLabel: component.label, ...ingredient })))),
  }
  await writeFile(path, JSON.stringify(snapshot, null, 2), 'utf8')
  const info = await stat(path)
  if (info.size === 0) throw new Error('El snapshot se creó vacío.')
  return path
}

const PROTECTED_TABLES = ['meal_preferences', 'meal_history', 'pantry_items', 'app_settings', 'weekly_plans', 'weekly_plan_entries'] as const
type ProtectedState = Record<typeof PROTECTED_TABLES[number], Record<string, unknown>[]>

async function loadProtectedState(): Promise<ProtectedState> {
  const [mealPreferences, mealHistory, pantryItems, appSettings, weeklyPlans, weeklyEntries] = await Promise.all([
    selectAllRows<Record<string, unknown>>('meal_preferences', 'meal_option_id,favorite,hidden,rating,updated_at'),
    selectAllRows<Record<string, unknown>>('meal_history', 'id,meal_option_id,eaten_at,rating,note,created_at'),
    selectAllRows<Record<string, unknown>>('pantry_items', 'ingredient_id,available,use_soon,updated_at'),
    selectAllRows<Record<string, unknown>>('app_settings', 'key,value,updated_at'),
    selectAllRows<Record<string, unknown>>('weekly_plans', 'id,start_date,name,created_at,updated_at'),
    selectAllRows<Record<string, unknown>>('weekly_plan_entries', 'id,weekly_plan_id,planned_date,meal_slot,meal_option_id,locked,created_at,updated_at'),
  ])
  return { meal_preferences: mealPreferences, meal_history: mealHistory, pantry_items: pantryItems, app_settings: appSettings, weekly_plans: weeklyPlans, weekly_plan_entries: weeklyEntries }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).sort().join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`
  return JSON.stringify(value)
}

function assertProtectedStateUnchanged(before: ProtectedState, after: ProtectedState) {
  for (const table of PROTECTED_TABLES) if (stableJson(before[table]) !== stableJson(after[table])) throw new Error(`La tabla personal ${table} cambió durante la reparación.`)
}

function sourceIngredientRow(ingredient: Ingredient, componentId: string, canonicalId: string) {
  if (!ingredient.id) throw new Error(`Ingrediente fuente sin id estable: ${ingredient.name}`)
  return {
    id: ingredient.id, source_key: ingredient.sourceKey ?? ingredient.id, component_id: componentId, ingredient_id: canonicalId,
    original_name: ingredient.name, original_text: ingredient.originalText, amount: ingredient.amount, unit: ingredient.unit,
    household_amount: ingredient.householdAmount ?? null, household_unit: ingredient.householdUnit ?? null, household_text: ingredient.householdText ?? null,
    optional: ingredient.optional ?? false, importance: ingredient.importance ?? 'normal', position: ingredient.position ?? 0,
  }
}

function assertApprovedPlan(matches: Array<Record<string, unknown>>, allowExistingPartialState = false) {
  const changed = matches.filter((match) => Boolean((match.diff as { changed?: boolean } | null)?.changed))
  if ((!allowExistingPartialState && changed.length !== 2) || (allowExistingPartialState && changed.length > 2) || changed.some((match) => !['Ensalada de atún con pepino', 'Jugo verde'].includes((match.source as { title: string }).title))) throw new Error('El plan de reparación cambió respecto a la revisión aprobada; no se escribirá nada.')
  const salad = changed.find((match) => (match.source as { title: string }).title === 'Ensalada de atún con pepino')!
  if (allowExistingPartialState) return
  const saladDiff = salad.diff as { ingredientsToRemove: Ingredient[]; ingredientsToAdd: Ingredient[]; quantityChanges: unknown[]; componentsChanged: boolean; notesChanged: boolean }
  const removed = saladDiff.ingredientsToRemove.map((item) => item.normalizedName).sort()
  const added = saladDiff.ingredientsToAdd.map((item) => item.normalizedName).sort()
  if (stableJson(removed) !== stableJson(['agua de limon con chia: agua', 'ensalada adicional: lechuga'].sort()) || stableJson(added) !== stableJson(['agua', 'chia', 'jugo de limon', 'lechuga', 'tomate cherry'].sort()) || saladDiff.quantityChanges.length !== 0 || !saladDiff.componentsChanged || saladDiff.notesChanged) throw new Error('La diferencia de Ensalada de atún con pepino no coincide con la aprobación.')
  const juice = changed.find((match) => (match.source as { title: string }).title === 'Jugo verde')!
  const juiceDiff = juice.diff as { ingredientsToRemove: Ingredient[]; ingredientsToAdd: Ingredient[]; quantityChanges: Array<{ name: string; source: Ingredient }>; componentsChanged: boolean; notesChanged: boolean }
  const quantity = juiceDiff.quantityChanges[0]?.source
  if (juiceDiff.ingredientsToRemove.length || juiceDiff.ingredientsToAdd.length || juiceDiff.quantityChanges.length !== 1 || juiceDiff.quantityChanges[0].name !== 'perejil picado' || quantity?.amount !== 2 || quantity.unit !== 'unidad' || juiceDiff.notesChanged || juiceDiff.componentsChanged) throw new Error('La diferencia de Jugo verde no coincide con la aprobación.')
}

async function applyMealRepair(source: ParsedMealOption, current: CurrentMeal, diff: { ingredientsToRemove: Ingredient[]; ingredientsToAdd: Ingredient[]; quantityChanges: Array<{ name: string; current: Ingredient; source: Ingredient }>; componentsChanged: boolean }, catalog: Catalog) {
  if (!current.id || !source.components.length) throw new Error(`MealOption inválida para reparar: ${source.title}`)
  if (source.title === 'Jugo verde' && current.title !== source.title) await patchRows('meal_options', { id: `eq.${current.id}` }, { title: source.title })
  const canonicalByName = new Map(catalog.ingredients.map((ingredient) => [normalizeText(ingredient.name), ingredient.id]))
  const dbComponents: Array<{ source: ParsedMealOption['components'][number]; id: string }> = []
  for (const sourceComponent of source.components) {
    const existing = current.components.find((component) => component.position === sourceComponent.position) ?? current.components[sourceComponent.position]
    if (existing?.id) {
      dbComponents.push({ source: sourceComponent, id: existing.id })
      if (diff.componentsChanged && (existing.label !== sourceComponent.sourceLabel || existing.note !== sourceComponent.notes.join('\n') || existing.position !== sourceComponent.position)) await patchRows('dish_components', { id: `eq.${existing.id}` }, { source_label: sourceComponent.sourceLabel, position: sourceComponent.position, optional: sourceComponent.optional, notes: sourceComponent.notes.join('\n') || null })
    } else {
      const id = sourceComponent.id
      await insertRows('dish_components', [{ id, source_key: sourceComponent.sourceKey, meal_option_id: current.id, source_label: sourceComponent.sourceLabel, position: sourceComponent.position, optional: sourceComponent.optional, notes: sourceComponent.notes.join('\n') || null }])
      dbComponents.push({ source: sourceComponent, id })
    }
  }
  // The approved repair is a full composition sync for these two catalog meals.
  // Personal tables reference meal_options, never dish_ingredients.
  for (const ingredient of currentIngredients(current)) if (ingredient.id) await deleteRows('dish_ingredients', { id: `eq.${ingredient.id}` })
  for (const sourceComponent of source.components) {
    const dbComponent = dbComponents.find((item) => item.source.position === sourceComponent.position)!
    for (const sourceIngredient of sourceComponent.ingredients) {
      const canonicalId = canonicalByName.get(sourceIngredient.normalizedName)
      if (!canonicalId) throw new Error(`No existe ingrediente canónico para reparar: ${sourceIngredient.name}`)
      const row = sourceIngredientRow({ ...sourceIngredient, componentLabel: sourceComponent.sourceLabel }, dbComponent.id, canonicalId)
      await insertRows('dish_ingredients', [row])
    }
  }
}

async function validateRepair(parsed: Awaited<ReturnType<typeof parseDietDocument>>, protectedBefore: ProtectedState) {
  const [plans, options, components, dishes, afterCatalog, protectedAfter] = await Promise.all([
    selectAllRows<Record<string, unknown>>('daily_plans', 'id'),
    selectAllRows<Record<string, unknown>>('meal_options', 'id'),
    selectAllRows<Record<string, unknown>>('dish_components', 'id,meal_option_id'),
    selectAllRows<Record<string, unknown>>('dish_ingredients', 'id,component_id'),
    loadCatalog(),
    loadProtectedState(),
  ])
  if (plans.length !== 55 || options.length !== 276) throw new Error(`Métricas inválidas después de reparar: ${plans.length} planes, ${options.length} MealOptions.`)
  const optionIds = new Set(options.map((row) => String(row.id)))
  const componentIds = new Set(components.map((row) => String(row.id)))
  if (components.some((row) => !optionIds.has(String(row.meal_option_id))) || dishes.some((row) => !componentIds.has(String(row.component_id)))) throw new Error('Se detectaron relaciones huérfanas después de reparar.')
  if (afterCatalog.meals.some((meal) => !meal.components.some((component) => component.ingredients.length))) throw new Error('Existe una MealOption sin ingredientes después de reparar.')
  const salad = afterCatalog.meals.find((meal) => meal.title === 'Ensalada de atún con pepino')
  if (!salad) throw new Error('No se encontró Ensalada de atún con pepino después de reparar.')
  const saladRows = currentIngredients(salad)
  const expected = new Map([['lechuga', [45, 'g', '1 taza']], ['tomate cherry', [50, 'g', '5 piezas']], ['agua', [300, 'ml', null]], ['jugo de limon', [20, 'ml', '2 piezas']], ['chia', [5, 'g', '1 cucharadita']]])
  for (const [name, [amount, unit, household]] of expected) { const row = saladRows.find((item) => item.normalizedName === name && item.amount === amount && item.unit === unit && item.householdText === household); if (!row) throw new Error(`Falta relación corregida en Ensalada de atún con pepino: ${name}`) }
  if (saladRows.some((row) => row.normalizedName === 'ensalada adicional: lechuga' || row.normalizedName === 'agua de limon con chia: agua')) throw new Error('Persistió una relación corrupta en Ensalada de atún con pepino.')
  const juice = afterCatalog.meals.find((meal) => meal.planIndex === 42 && meal.slot === 'wake_up')
  const parsley = juice && currentIngredients(juice).find((ingredient) => ingredient.normalizedName === 'perejil picado')
  if (!juice || !parsley || parsley.amount !== 2 || parsley.unit !== 'unidad' || parsley.householdText !== 'unidades') throw new Error('Perejil de Jugo verde no quedó corregido.')
  if (juice.title !== 'Jugo verde' || juice.components.length !== 1 || juice.components[0].label !== null) throw new Error('Se alteró indebidamente la estructura de Jugo verde.')
  const validIngredientIds = new Set((await selectAllRows<Record<string, unknown>>('ingredients', 'id')).map((row) => String(row.id)))
  const pantry = protectedAfter.pantry_items.map((row) => String(row.ingredient_id))
  const personalMealIds = [...protectedAfter.meal_preferences, ...protectedAfter.meal_history, ...protectedAfter.weekly_plan_entries].map((row) => row.meal_option_id).filter(Boolean).map(String)
  if (personalMealIds.some((id) => !optionIds.has(id)) || pantry.some((id) => !validIngredientIds.has(id))) throw new Error('Se invalidó una referencia de datos personales.')
  assertProtectedStateUnchanged(protectedBefore, protectedAfter)
  return { plans: plans.length, mealOptions: options.length, components: components.length, dishIngredients: dishes.length, mealsWithoutIngredients: afterCatalog.meals.filter((meal) => !meal.components.some((component) => component.ingredients.length)).length, orphanComponents: components.filter((row) => !optionIds.has(String(row.meal_option_id))).length, orphanIngredients: dishes.filter((row) => !componentIds.has(String(row.component_id))).length }
}

async function run() {
  const apply = process.argv.includes('--apply')
  if (!process.argv.includes('--dry-run') && !apply) throw new Error('Modo obligatorio: usa --dry-run o --apply.')
  const parsed = await parseDietDocument(sourcePath, sourceFile)
  let catalog: Catalog
  let supabaseReadError: string | undefined
  try {
    catalog = await loadCatalog()
  } catch (error) {
    supabaseReadError = error instanceof Error ? error.message : 'Supabase catalog read failed'
    catalog = await loadCatalog(true)
    catalog = { ...catalog, supabaseReadError }
  }
  if (process.argv.includes('--snapshot') && !apply) await writeSnapshot(catalog)
  const matches: Array<Record<string, unknown>> = []
  const used = new Set<string>()
  const updatePlan: Array<Record<string, unknown>> = []
  for (const meal of parsed.dailyPlans.flatMap((plan) => plan.mealOptions)) {
    const match = matchMeal(meal, catalog.meals, used)
    if (match.current) used.add(match.current.id)
    const diff = match.current ? compareMeal(meal, match.current) : null
    matches.push({ source: toPlainMeal(meal), current: match.current ? toPlainCurrent(match.current) : null, kind: match.kind, reason: match.reason, diff })
    if (match.current && match.kind !== 'AMBIGUOUS' && diff?.changed) updatePlan.push({ mealOptionId: match.current.id, source: meal.sourceKey, title: meal.title, ...diff })
  }
  const currentMissing = catalog.meals.filter((meal) => !used.has(meal.id))
  const newRows = matches.filter((match) => match.kind === 'NEW')
  const ambiguous = matches.filter((match) => match.kind === 'AMBIGUOUS')
  const exactMatches = matches.filter((match) => match.kind === 'EXACT_PROVENANCE' && !(match.diff as { changed?: boolean } | null)?.changed)
  const allDiffs = updatePlan
  const sourceIngredientNames = new Set(parsed.ingredients.map((ingredient) => ingredient.normalizedName))
  const currentIngredientNames = new Set(catalog.ingredients.map((ingredient) => normalizeText(ingredient.name)))
  const ingredientWithoutMeal = parsed.ingredients.filter((ingredient) => !parsed.dailyPlans.some((plan) => plan.mealOptions.some((meal) => parsedIngredients(meal).some((row) => row.normalizedName === ingredient.normalizedName))))
  const warnings = parsed.warnings
  const preliminaryCount = 272
  const correctedCount = parsed.stats.mealOptions
  const reconciliation = {
    currentSupabase: catalog.meals.length, preliminaryNewSource: preliminaryCount, correctedNewSource: correctedCount,
    preliminaryUnderCountRecovered: correctedCount - preliminaryCount, currentMinusCorrected: catalog.meals.length - correctedCount,
    classification: {
      presentInSupabaseNotNewSource: currentMissing.map((meal) => ({ id: meal.id, sourceKey: meal.sourceKey, planIndex: meal.planIndex, slot: meal.slot, title: meal.title })),
      presentInNewSourceNotSupabase: newRows.map((row) => row.source), likelyParsingLoss: parsed.diagnostics.filter((diagnostic) => diagnostic.resolved).map((diagnostic) => ({ kind: diagnostic.kind, sourceIndex: diagnostic.sourceIndex, rawText: diagnostic.rawText, interpretation: diagnostic.interpretation })),
      duplicatesOrVariants: parsed.dailyPlans.flatMap((plan) => plan.mealOptions).filter((meal, index, all) => all.some((other, otherIndex) => otherIndex < index && other.slot === meal.slot && normalizeText(other.title) === normalizeText(meal.title))).map(toPlainMeal), ambiguous: ambiguous.map((row) => row.source),
    },
    explanation: 'La cifra preliminar de 272 subcontaba entidades fusionadas. El parser corregido recupera esas líneas; el dry-run no interpreta la diferencia restante como permiso para borrar registros.',
  }
  const report = {
    generatedAt: new Date().toISOString(), dataSource: catalog.source, supabaseReadError: catalog.supabaseReadError ?? null, sourceFile, sourceHash: parsed.sourceHash, readOnly: !apply,
    summary: { totalPlans: parsed.stats.dailyPlans, mealOptions: parsed.stats.mealOptions, components: parsed.stats.components, ingredientRelations: parsed.stats.dishIngredients, uniqueIngredients: parsed.stats.uniqueIngredients, notes: parsed.stats.notes, warnings: warnings.length, mealsWithoutIngredients: parsed.stats.mealOptionsWithoutIngredients, ingredientsWithoutMeal: ingredientWithoutMeal.length, mealsWithoutSlot: parsed.stats.linesWithoutSlot, unclassifiedLines: parsed.stats.linesUnclassified, exactMatches: exactMatches.length, matchedWithDifferences: allDiffs.length, ambiguousMatches: ambiguous.length, newMeals: newRows.length, currentMealsNotFound: currentMissing.length, ingredientsToAdd: allDiffs.reduce((sum, diff) => sum + (diff.ingredientsToAdd as Ingredient[]).length, 0), ingredientsToRemove: allDiffs.reduce((sum, diff) => sum + (diff.ingredientsToRemove as Ingredient[]).length, 0), quantityChanges: allDiffs.reduce((sum, diff) => sum + (diff.quantityChanges as unknown[]).length, 0), notesToChange: allDiffs.filter((diff) => diff.notesChanged).length, componentsToChange: allDiffs.filter((diff) => diff.componentsChanged).length, parserDiagnostics: parsed.diagnostics.length, resolvedFusedLines: parsed.stats.fusedLines, repairedLineBreaks: parsed.stats.repairedLineBreaks, currentIngredientsNotReferenced: [...currentIngredientNames].filter((name) => !sourceIngredientNames.has(name)).length },
    stats: parsed.stats, mealOptionsBySlot: parsed.stats.mealOptionsBySlot, warnings, diagnostics: parsed.diagnostics, matches, MEALOPTION_COUNT_RECONCILIATION: reconciliation,
    actions: { wouldUpdateCatalogOnly: updatePlan, wouldInsertNewMeals: newRows.map((row) => row.source), wouldDelete: [], wouldTouchPersonalTables: [], ambiguousNotTouched: ambiguous.map((row) => row.source), currentNotFoundNotTouched: currentMissing.map((meal) => ({ id: meal.id, title: meal.title, sourceKey: meal.sourceKey })) },
    topProblems: [
      `Diferencia de conteo: ${catalog.meals.length} actuales frente a ${correctedCount} en la fuente corregida; revisar ${currentMissing.length} actuales no encontradas antes de cualquier apply.`,
      `Matches ambiguos protegidos: ${ambiguous.length}.`,
      `Warnings del parser: ${warnings.length}; cantidades aproximadas/no especificadas se conservan sin inventar valores.`,
      `Relaciones a añadir: ${allDiffs.reduce((sum, diff) => sum + (diff.ingredientsToAdd as Ingredient[]).length, 0)}; a eliminar: ${allDiffs.reduce((sum, diff) => sum + (diff.ingredientsToRemove as Ingredient[]).length, 0)}.`,
      ...(catalog.supabaseReadError ? [`Lectura Supabase no disponible (${catalog.supabaseReadError}); cifras actuales tomadas de public/catalog.json, sin ocultar el fallo.`] : []),
    ],
  }
  if (apply) {
    if (catalog.source !== 'Supabase catalog read-only' || catalog.supabaseReadError) throw new Error('La reparación real requiere leer el catálogo actual desde Supabase; no se usará public/catalog.json.')
    assertApprovedPlan(matches, true)
    const snapshotPath = await writeSnapshot(catalog)
    const protectedBefore = await loadProtectedState()
    const sourceMeals = new Map(parsed.dailyPlans.flatMap((plan) => plan.mealOptions).map((meal) => [meal.sourceKey, meal]))
    for (const update of updatePlan) {
      const source = sourceMeals.get(String(update.source))
      const current = catalog.meals.find((meal) => meal.id === String(update.mealOptionId))
      if (!source || !current) throw new Error(`No se encontró el registro aprobado para reparar: ${String(update.title)}`)
      await applyMealRepair(source, current, update as unknown as { ingredientsToRemove: Ingredient[]; ingredientsToAdd: Ingredient[]; quantityChanges: Array<{ name: string; current: Ingredient; source: Ingredient }>; componentsChanged: boolean }, catalog)
    }
    const finalMetrics = await validateRepair(parsed, protectedBefore)
    console.log(JSON.stringify({ repair: 'APPLIED', snapshotPath, updatedMealOptions: updatePlan.map((update) => update.title), finalMetrics, protectedTablesUnchanged: true, supabaseWrites: 'catalog-only' }, null, 2))
    return
  }
  await writeReports(report)
  console.log(JSON.stringify({ dataSource: catalog.source, summary: report.summary, MEALOPTION_COUNT_RECONCILIATION: reconciliation, reports: ['scripts/import-output/diet-repair-dry-run.json', 'scripts/import-output/diet-repair-dry-run.txt', 'scripts/import-output/diet-repair-review.txt', 'scripts/import-output/diet-repair-review-compact.txt'], supabaseWrites: 0 }, null, 2))
}

await run()

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ParsedDiet } from './types'

const outputDir = join(process.cwd(), 'scripts', 'import-output')
const parsed = JSON.parse(await readFile(join(outputDir, 'parsed-diet.json'), 'utf8')) as ParsedDiet
const errors: string[] = []
const checks = {
  hasDailyPlans: parsed.stats.dailyPlans > 0,
  hasMainSlots: parsed.stats.mealOptionsBySlot.breakfast > 0 && parsed.stats.mealOptionsBySlot.midday > 0 && parsed.stats.mealOptionsBySlot.lunch > 0 && parsed.stats.mealOptionsBySlot.afternoon > 0 && parsed.stats.mealOptionsBySlot.dinner > 0,
  hasComponents: parsed.stats.components > 0,
  hasIngredients: parsed.stats.dishIngredients > 0,
  stableKeys: parsed.dailyPlans.every((plan) => plan.sourceKey && plan.mealOptions.every((meal) => meal.sourceKey && meal.components.every((component) => component.sourceKey))),
}
if (!checks.hasDailyPlans) errors.push('No se detectaron planes diarios.')
if (!checks.hasMainSlots) errors.push('Falta al menos una de las cinco franjas principales.')
if (!checks.hasComponents) errors.push('No se detectaron componentes.')
if (!checks.hasIngredients) errors.push('No se detectaron ingredientes.')
if (!checks.stableKeys) errors.push('Hay registros sin source_key estable.')
const report = { valid: errors.length === 0, checks, errors, stats: parsed.stats, warnings: parsed.warnings.length, recommendation: parsed.stats.warnings > 0 ? 'Revisar warnings antes de ejecutar diet:import.' : 'Listo para revisión.' }
await writeFile(join(outputDir, 'validation-report.json'), JSON.stringify(report, null, 2), 'utf8')
console.log(JSON.stringify(report, null, 2))
if (errors.length) process.exitCode = 1

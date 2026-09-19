export type ImportedSlot = 'wake_up' | 'breakfast' | 'midday' | 'lunch' | 'afternoon' | 'dinner'

export interface ImportWarning {
  code: string
  severity: 'warning' | 'error'
  message: string
  sourceIndex: number
  rawText: string
  planIndex?: number
  slot?: ImportedSlot
}

export type ParseDiagnosticKind = 'split-heading' | 'split-title' | 'fused-line' | 'orphan-ingredient' | 'orphan-note' | 'block-without-slot' | 'unclassified-line'

export interface ParseDiagnostic {
  kind: ParseDiagnosticKind
  rawText: string
  sourceIndex: number
  interpretation: string
  resolved: boolean
  planIndex?: number
  slot?: ImportedSlot
}

export interface ParsedIngredient {
  id: string
  sourceKey: string
  name: string
  canonicalName: string
  normalizedName: string
  category: string
  originalText: string
  amount: number | null
  unit: string | null
  householdAmount: string | null
  householdUnit: string | null
  householdText: string | null
  optional: boolean
  importance: 'primary' | 'normal' | 'minor' | 'optional'
  position: number
  aliases: string[]
  sourceIndex: number
  warningCodes: string[]
}

export interface ParsedComponent {
  id: string
  sourceKey: string
  sourceLabel: string | null
  position: number
  optional: boolean
  notes: string[]
  ingredients: ParsedIngredient[]
  sourceIndex: number
}

export interface ParsedMealOption {
  id: string
  sourceKey: string
  planIndex: number
  sourceIndex: number
  slot: ImportedSlot
  title: string
  notes: string[]
  components: ParsedComponent[]
  tags: string[]
  rawText: string
}

export interface ParsedDailyPlan {
  id: string
  sourceKey: string
  planIndex: number
  sourceIndex: number
  sourceFile: string
  sourceHash: string
  rawText: string
  mealOptions: ParsedMealOption[]
}

export interface ParsedDiet {
  version: 1
  sourceFile: string
  sourceHash: string
  parsedAt: string
  dailyPlans: ParsedDailyPlan[]
  ingredients: ParsedIngredient[]
  warnings: ImportWarning[]
  stats: {
    dailyPlans: number
    mealOptions: number
    mealOptionsBySlot: Record<ImportedSlot, number>
    components: number
    dishIngredients: number
    uniqueIngredients: number
    aliases: number
    notes: number
    warnings: number
    potentialDuplicates: number
    linesUnclassified: number
    linesWithoutSlot: number
    orphanIngredients: number
    orphanNotes: number
    fusedLines: number
    repairedLineBreaks: number
    mealOptionsWithoutIngredients: number
  }
  diagnostics: ParseDiagnostic[]
}

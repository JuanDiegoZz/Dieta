export type MealSlot = 'wake_up' | 'breakfast' | 'midday' | 'lunch' | 'afternoon' | 'dinner'

export interface DishIngredient {
  id: string
  ingredientId?: string
  name: string
  quantity: string
  householdMeasure?: string
  aliases: string[]
  note?: string
  amount?: number | null
  unit?: string | null
  householdAmount?: string | null
  householdUnit?: string | null
  originalText?: string
  optional?: boolean
  importance?: string
  category?: string
}

export interface Ingredient {
  id: string
  canonicalName: string
  category: string
  aliases: string[]
  active: boolean
}

export interface PantryItem {
  ingredientId: string
  available: boolean
  useSoon: boolean
  updatedAt?: string
}

export interface MealCompatibility {
  score: number
  available: string[]
  missing: string[]
  optionalMissing: string[]
  label: string
}

export interface DishComponent {
  id: string
  label: string | null
  ingredients: DishIngredient[]
  note?: string
  optional?: boolean
}

export interface MealOption {
  id: string
  slot: MealSlot
  title: string
  summary: string
  tags: string[]
  favorite: boolean
  availability: number | null
  lastEaten: string
  lastEatenAt?: string | null
  hidden?: boolean
  rating?: number | null
  active?: boolean
  edited?: boolean
  components: DishComponent[]
  note?: string
  compatibility?: MealCompatibility
}

export interface HistoryEntry {
  id: string
  mealOptionId: string
  eatenAt: string
  rating: number | null
  note: string | null
}

export interface WeeklyPlanEntry {
  id: string
  plannedDate: string
  slot: Exclude<MealSlot, 'wake_up'>
  mealOptionId: string | null
  locked: boolean
}

export interface WeeklyPlan {
  id: string | null
  startDate: string
  name: string
  entries: WeeklyPlanEntry[]
}

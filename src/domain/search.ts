import type { MealOption, MealSlot } from './types'

export interface SearchResult {
  meal: MealOption
  score: number
}

interface IndexedMeal {
  meal: MealOption
  title: string
  components: string[]
  ingredients: string[]
  aliases: string[]
  tags: string[]
  summary: string
}

export interface MealSearchIndex {
  byId: Map<string, IndexedMeal>
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function createMealSearchIndex(meals: MealOption[]): MealSearchIndex {
  return { byId: new Map(meals.map((meal) => [meal.id, {
    meal,
    title: normalize(meal.title),
    components: meal.components.map((component) => normalize(component.label ?? '')),
    ingredients: meal.components.flatMap((component) => component.ingredients.map((ingredient) => normalize(ingredient.name))),
    aliases: meal.components.flatMap((component) => component.ingredients.flatMap((ingredient) => ingredient.aliases.map(normalize))),
    tags: meal.tags.map(normalize),
    summary: normalize(meal.summary),
  }])) }
}

function wordMatch(value: string, token: string) { return value.split(/[^a-z0-9\u00c0-\u024f]+/).some((word) => word.startsWith(token)) }

export function matchesSearchText(value: string, query: string) {
  const normalized = normalize(value)
  return normalize(query).split(/[^a-z0-9\u00c0-\u024f]+/).filter(Boolean).every((token) => wordMatch(normalized, token))
}

function scoreToken(indexed: IndexedMeal, token: string): number {
  const { title, components, ingredients, aliases, tags, summary } = indexed

  const direct = [title, ...ingredients, ...aliases].some((value) => value.split(/[^a-z0-9\u00c0-\u024f]+/).includes(token)) ? 100 : 0
  if (title === token) return 200
  if (wordMatch(title, token)) return 70 + direct
  if (components.some((value) => wordMatch(value, token))) return 60 + direct
  if (ingredients.some((value) => wordMatch(value, token))) return 50 + direct
  if (aliases.some((value) => wordMatch(value, token))) return 45 + direct
  if (tags.some((value) => wordMatch(value, token))) return 30
  if (wordMatch(summary, token)) return 20
  return 0
}

export function searchMealOptions(meals: MealOption[], query: string, index = createMealSearchIndex(meals), slot?: MealSlot): SearchResult[] {
  const tokens = normalize(query).split(/[^a-z0-9\u00c0-\u024f]+/).filter(Boolean)
  const candidates = slot ? meals.filter((meal) => meal.slot === slot) : meals

  return candidates.map((meal) => {
      const indexed = index.byId.get(meal.id) ?? createMealSearchIndex([meal]).byId.get(meal.id)
      if (!indexed) return { meal, score: 0, matches: false }
      const tokenScores = tokens.map((token) => scoreToken(indexed, token))
      const matches = tokens.length === 0 || tokenScores.every((score) => score > 0)
      const score = tokenScores.reduce((total, value) => total + value, 0)

      return { meal, score, matches }
    })
    .filter((result) => result.matches)
    .sort((a, b) => b.score - a.score || a.meal.title.localeCompare(b.meal.title, 'es'))
    .map(({ meal, score }) => ({ meal, score }))
}

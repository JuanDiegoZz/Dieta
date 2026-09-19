import type { MealOption } from './types'

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

function scoreToken(indexed: IndexedMeal, token: string): number {
  const { title, components, ingredients, aliases, tags, summary } = indexed

  if (title === token) return 100
  if (title.includes(token)) return 70
  if (components.some((value) => value.includes(token))) return 60
  if (ingredients.some((value) => value.includes(token))) return 50
  if (aliases.some((value) => value.includes(token))) return 45
  if (tags.some((value) => value.includes(token))) return 30
  if (summary.includes(token)) return 20
  return 0
}

export function searchMealOptions(meals: MealOption[], query: string, index = createMealSearchIndex(meals)): SearchResult[] {
  const tokens = normalize(query).split(' ').filter(Boolean)

  return meals.map((meal) => {
      const indexed = index.byId.get(meal.id) ?? createMealSearchIndex([meal]).byId.get(meal.id)
      if (!indexed) return { meal, score: 0, matches: false }
      const tokenScores = tokens.map((token) => scoreToken(indexed, token))
      const matches = tokens.length === 0 || tokenScores.every((score) => score > 0)
      const score = tokenScores.reduce((total, value) => total + value, 0) + (meal.favorite ? 10 : 0)

      return { meal, score, matches }
    })
    .filter((result) => result.matches)
    .sort((a, b) => b.score - a.score || a.meal.title.localeCompare(b.meal.title, 'es'))
    .map(({ meal, score }) => ({ meal, score }))
}

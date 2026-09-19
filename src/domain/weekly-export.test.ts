import { describe, expect, it } from 'vitest'
import { buildWeeklyPlanSvg } from './weekly-export'
import type { MealOption, WeeklyPlan } from './types'

const meals: MealOption[] = [{
  id: 'meal-1', slot: 'breakfast', title: 'Avena', summary: '', tags: [], favorite: false,
  availability: null, lastEaten: 'Nunca', components: [],
}]

const plan: WeeklyPlan = {
  id: 'week-1', name: 'Mi semana', startDate: '2026-09-21', entries: [
    { id: 'entry-1', plannedDate: '2026-09-21', slot: 'breakfast', mealOptionId: 'meal-1', locked: false },
  ],
}

describe('buildWeeklyPlanSvg', () => {
  it('includes the week title, date range, day, slot and selected meal', () => {
    const svg = buildWeeklyPlanSvg(plan, meals)

    expect(svg).toContain('Mi semana')
    expect(svg).toContain('2026-09-21')
    expect(svg).toContain('Lunes')
    expect(svg).toContain('Desayuno')
    expect(svg).toContain('Avena')
  })

  it('wraps long meal names inside text spans instead of overflowing the canvas', () => {
    const longMeal = { ...meals[0], title: 'Ensalada de pollo con aguacate, verduras frescas y vinagreta de limón' }
    const svg = buildWeeklyPlanSvg(plan, [longMeal])

    expect(svg).toContain('<tspan')
    expect(svg).toContain('Ensalada de pollo')
    expect(svg).toContain('vinagreta de')
  })
})

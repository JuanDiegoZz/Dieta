import { describe, expect, it } from 'vitest'
import { buildShoppingList, generateWeeklyPlan } from './weekly'
import type { MealOption } from './types'

const meal = (id: string, slot: 'breakfast' | 'lunch'): MealOption => ({ id, slot, title: id, summary: '', tags: [], favorite: false, availability: null, lastEaten: 'Nunca', components: [{ id: `${id}-component`, label: null, ingredients: [{ id: `${id}-ingredient`, ingredientId: 'tomato', name: 'Tomate', quantity: '100 g', amount: 100, unit: 'g', aliases: [], importance: 'normal' }] }] })

describe('weekly planning and shopping', () => {
  it('preserves locked entries while generating the rest', () => {
    const breakfast = meal('breakfast', 'breakfast')
    const locked = { id: 'entry-1', plannedDate: '2026-09-21', slot: 'breakfast' as const, mealOptionId: breakfast.id, locked: true }
    const plan = generateWeeklyPlan([breakfast], '2026-09-21', [], { id: 'plan', startDate: '2026-09-21', name: 'x', entries: [locked] })
    expect(plan.entries.find((entry) => entry.plannedDate === '2026-09-21' && entry.slot === 'breakfast')).toEqual(locked)
  })

  it('sums compatible units and keeps incompatible units separate', () => {
    const first = meal('one', 'lunch')
    const second = { ...meal('two', 'lunch'), components: [{ ...meal('two', 'lunch').components[0], ingredients: [{ ...meal('two', 'lunch').components[0].ingredients[0], amount: 2, unit: 'pieza', quantity: '2 piezas' }] }] }
    const plan = { id: 'plan', startDate: '2026-09-21', name: 'x', entries: [{ id: 'a', plannedDate: '2026-09-21', slot: 'lunch' as const, mealOptionId: first.id, locked: false }, { id: 'b', plannedDate: '2026-09-22', slot: 'lunch' as const, mealOptionId: second.id, locked: false }] }
    expect(buildShoppingList(plan, [first, second], [], false)).toHaveLength(2)
  })
})

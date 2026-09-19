import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { normalizeLogicalLines, normalizeText, parseDietDocument, parseFraction, parseIngredientLine, parseMeasure, splitIngredientSequence } from './parser'

describe('diet importer primitives', () => {
  it('normalizes accents without changing source text', () => {
    expect(normalizeText('  Champiñones  ')).toBe('champinones')
  })

  it('parses mass, volume, and household measures', () => {
    expect(parseMeasure('90 g')).toEqual({ amount: 90, unit: 'g' })
    expect(parseMeasure('240 ml')).toEqual({ amount: 240, unit: 'ml' })
    expect(parseMeasure('1½ tazas')).toEqual({ amount: 1.5, unit: 'taza' })
  })

  it('understands common fractions', () => {
    expect(parseFraction('½')).toBe(.5)
    expect(parseFraction('3½')).toBe(3.5)
    expect(parseFraction('1½')).toBe(1.5)
    expect(parseFraction('⅓')).toBeCloseTo(1 / 3)
    expect(parseFraction('¼')).toBe(.25)
  })

  it('parses ingredient lines with or without a bullet', () => {
    const withBullet = parseIngredientLine('• Lechuga — 90 g (2 tazas)')
    const withoutBullet = parseIngredientLine('Lechuga — 90 g (2 tazas)')

    expect(withBullet?.name).toBe('Lechuga')
    expect(withBullet?.amount).toBe(90)
    expect(withBullet?.unit).toBe('g')
    expect(withBullet?.householdText).toBe('2 tazas')
    expect(withoutBullet?.name).toBe(withBullet?.name)
    expect(withoutBullet?.originalText).toBe('Lechuga — 90 g (2 tazas)')
  })

  it.each([
    ['Crema de cacahuate sin azúcar — 30 ml (2 cucharadas soperas) Manzana con piel — 106 g (1 pieza)', ['Crema de cacahuate sin azúcar', 'Manzana con piel'], ['2 cucharadas soperas', '1 pieza']],
    ['Cebolla blanca — 25 g Quinoa — 120 g (½ taza)', ['Cebolla blanca', 'Quinoa'], [null, '½ taza']],
    ['Queso cottage muy bajo en grasa — 48 g (3 cucharadas) Almendras — 15 g (15 piezas)', ['Queso cottage muy bajo en grasa', 'Almendras'], ['3 cucharadas', '15 piezas']],
    ['Chía — 5 g (1 cucharadita) Stevia (endulzante) — 1 g (1 pieza)', ['Chía', 'Stevia (endulzante)'], ['1 cucharadita', '1 pieza']],
    ['Pan integral — 70 g (2 piezas) Pechuga de pavo — 40 g (2 rebanadas)', ['Pan integral', 'Pechuga de pavo'], ['2 piezas', '2 rebanadas']],
    ['Pan integral — 35 g (1 pieza) Espinaca cruda — 60 g (1 taza)', ['Pan integral', 'Espinaca cruda'], ['1 pieza', '1 taza']],
  ])('separa ingredientes fusionados sin propagar medidas: %s', (text, names, householdTexts) => {
    const segments = splitIngredientSequence(text)
    const ingredients = segments.map((segment) => parseIngredientLine(segment))
    expect(ingredients).toHaveLength(2)
    expect(ingredients.map((ingredient) => ingredient?.name)).toEqual(names)
    expect(ingredients.map((ingredient) => ingredient?.householdText)).toEqual(householdTexts)
  })

  it('interprets Perejil picado — 2 (unidades) without inventing grams', () => {
    expect(parseIngredientLine('Perejil picado — 2 (unidades)')).toMatchObject({ amount: 2, unit: 'unidad', householdText: 'unidades' })
  })

  it('recognizes unbulleted quantity lines as ingredients and keeps fused households isolated', () => {
    expect(parseIngredientLine('Blueberries 40 g')).toMatchObject({ name: 'Blueberries', amount: 40, unit: 'g' })
    expect(parseIngredientLine('Tomate rojo 40 g (4 rebanadas)')).toMatchObject({ name: 'Tomate rojo', amount: 40, unit: 'g', householdText: '4 rebanadas' })
    expect(normalizeLogicalLines([{ text: 'Pan integral — 35 g (1 pieza) Espinaca cruda — 60 g (1 taza)', sourceIndex: 1 }]).map((line) => line.text)).toEqual([
      'Pan integral — 35 g (1 pieza)',
      'Espinaca cruda — 60 g (1 taza)',
    ])
  })

  it('separates inline component labels from comma-separated ingredients', () => {
    expect(normalizeLogicalLines([{ text: 'Ensalada adicional: Lechuga — 45 g (1 taza), Tomate Cherry — 50 g (5 piezas)', sourceIndex: 1 }]).map((line) => line.text)).toEqual([
      'Ensalada adicional',
      'Lechuga — 45 g (1 taza),',
      'Tomate Cherry — 50 g (5 piezas)',
    ])
  })

  it('joins split slot headings and preserves their source positions', () => {
    const lines = normalizeLogicalLines([{ text: 'Medio', sourceIndex: 10 }, { text: 'día', sourceIndex: 11 }])

    expect(lines.map((line) => line.text)).toEqual(['Medio día'])
    expect(lines[0].sourceIndex).toBe(10)
    expect(lines[0].diagnostics[0]?.resolved).toBe(true)
  })

  it('keeps notes attached and repairs an embedded slot heading', () => {
    const lines = normalizeLogicalLines([{ text: 'Nota: Calienta la leche. Medio día', sourceIndex: 1843 }])
    expect(lines.map((line) => line.text)).toEqual(['Nota: Calienta la leche.', 'Medio día'])
    expect(lines[0].diagnostics[0]?.kind).toBe('fused-line')
  })

  it('repairs the known sandwich block and fused vinaigrette line', async () => {
    const parsed = await parseDietDocument(join(process.cwd(), '12_fuentes_dieta', 'dieta.docx'), 'dieta.docx')
    const sandwich = parsed.dailyPlans.flatMap((plan) => plan.mealOptions).find((meal) => meal.title === 'Sandwich de huevo y jamón')
    const fusedIngredient = parsed.dailyPlans.flatMap((plan) => plan.mealOptions).flatMap((meal) => meal.components).flatMap((component) => component.ingredients).find((ingredient) => ingredient.name === 'Pechuga de pollo empanizada')
    const vinaigrette = parsed.dailyPlans.flatMap((plan) => plan.mealOptions).flatMap((meal) => meal.components).find((component) => component.sourceLabel === 'Vinagreta miel mostaza (opcional)')

    expect(sandwich?.slot).toBe('breakfast')
    expect(sandwich?.components.flatMap((component) => component.ingredients).map((ingredient) => ingredient.name)).toEqual(['Huevo entero frito', 'Pan Thins Bimbo', 'Jamón de pavo'])
    expect(fusedIngredient?.amount).toBe(30)
    expect(vinaigrette?.ingredients.map((ingredient) => ingredient.name)).toContain('Mostaza')
    expect(parsed.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'fused-line', sourceIndex: 155, resolved: true }),
      expect.objectContaining({ kind: 'fused-line', sourceIndex: 342, resolved: true }),
    ]))
  })

  it('parses the reviewed source into the expected scale without dropping slots', async () => {
    const parsed = await parseDietDocument(join(process.cwd(), '12_fuentes_dieta', 'DietaCompleta.docx'))
    expect(parsed.stats.dailyPlans).toBe(55)
    expect(parsed.stats.mealOptions).toBeGreaterThan(250)
    expect(parsed.stats.dishIngredients).toBeGreaterThan(1200)
    expect(parsed.stats.mealOptionsBySlot.breakfast).toBe(55)
    expect(parsed.stats.mealOptionsBySlot.dinner).toBe(55)
    expect(parsed.warnings.length).toBeGreaterThan(0)
  })
})

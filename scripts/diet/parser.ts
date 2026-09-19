import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import JSZip from 'jszip'
import type { ImportedSlot, ImportWarning, ParseDiagnostic, ParsedComponent, ParsedDailyPlan, ParsedDiet, ParsedIngredient, ParsedMealOption } from './types'

const SLOT_LABELS: Record<string, ImportedSlot> = {
  'al despertar': 'wake_up', desayuno: 'breakfast', 'medio dia': 'midday', comida: 'lunch', 'media tarde': 'afternoon', cena: 'dinner',
}
const SLOT_PREFIXES = ['Al despertar', 'Media tarde', 'Medio día', 'Desayuno', 'Comida', 'Cena'].sort((a, b) => b.length - a.length)
const FRACTIONS = '¼½¾⅓⅔⅕⅖⅗⅘⅛⅜⅝⅞'
const KNOWN_UNITS = 'mg|kg|ml|g|l|gramos?|mililitros?|piezas?|unidad(?:es)?|tazas?|cucharadas?|cucharaditas?|cuchar[oó]n(?:es)?|rebanadas?|sobres?|latas?|filetes?|paquetes?|botellas?|trozos?'

function normalizeText(value: string): string {
  return value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[•\u00a0]/g, ' ').replace(/\s+/g, ' ').trim()
}

function decodeXml(value: string): string {
  return value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
}

function stableUuid(value: string): string {
  const hex = createHash('sha256').update(value).digest('hex').slice(0, 32)
  const versioned = `${hex.slice(0, 12)}4${hex.slice(13, 16)}${hex.slice(16, 20)}${((Number.parseInt(hex.slice(20, 22), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0')}${hex.slice(22, 32)}`
  return `${versioned.slice(0, 8)}-${versioned.slice(8, 12)}-${versioned.slice(12, 16)}-${versioned.slice(16, 20)}-${versioned.slice(20, 32)}`
}

function sourceKey(...parts: (string | number)[]): string { return parts.map(String).join(':') }

function parseFraction(value: string): number | null {
  const fractions: Record<string, number> = { '¼': .25, '½': .5, '¾': .75, '⅓': 1 / 3, '⅔': 2 / 3, '⅕': .2, '⅖': .4, '⅗': .6, '⅘': .8, '⅛': .125, '⅜': .375, '⅝': .625, '⅞': .875 }
  const normalized = value.replace(',', '.').replace(/\s+/g, '')
  const mixed = normalized.match(/^(\d+(?:\.\d+)?)([¼½¾⅓⅔⅕⅖⅗⅘⅛⅜⅝⅞])$/)
  if (mixed) return Number(mixed[1]) + fractions[mixed[2]]
  if (fractions[normalized] !== undefined) return fractions[normalized]
  const numeric = Number(normalized)
  return Number.isFinite(numeric) ? numeric : null
}

function normalizeUnit(value: string): string {
  const normalized = normalizeText(value)
  if (normalized === 'unidad' || normalized === 'unidades') return 'unidad'
  if (normalized === 'gramo' || normalized === 'gramos') return 'g'
  if (normalized === 'mililitro' || normalized === 'mililitros') return 'ml'
  if (normalized.startsWith('cucharada')) return 'cucharada'
  if (normalized.startsWith('cucharadita')) return 'cucharadita'
  if (normalized.startsWith('cucharon')) return 'cucharón'
  return normalized.replace(/s$/, '')
}

function parseMeasure(value: string): { amount: number | null; unit: string | null } {
  const match = value.trim().match(new RegExp(`^([\\d.,]+(?:[${FRACTIONS}]|\\s+[${FRACTIONS}])?|[${FRACTIONS}])(?:\\s+(${KNOWN_UNITS}))?`, 'i'))
  if (!match) return { amount: null, unit: null }
  return { amount: parseFraction(match[1]), unit: match[2] ? normalizeUnit(match[2]) : null }
}

function aliasesFor(name: string): string[] {
  const normalized = normalizeText(name)
  const aliases = new Set<string>()
  if (normalized.includes('yogurt')) aliases.add(normalized.replace(/yogurt/g, 'yogur'))
  else if (normalized.includes('yogur')) aliases.add(normalized.replace(/yogur/g, 'yogurt'))
  if (normalized.includes('jitomate')) aliases.add(normalized.replace(/jitomate/g, 'tomate'))
  if (normalized.includes('tomate')) aliases.add(normalized.replace(/tomate/g, 'jitomate'))
  if (normalized.includes('champi')) aliases.add('champis')
  aliases.delete(normalized)
  return [...aliases]
}

function categoryFor(name: string): string {
  const value = normalizeText(name)
  if (/pollo|pavo|huevo|pescado|salmon|atun|carne|res|surimi/.test(value)) return 'proteina'
  if (/yogur|queso|leche|crema|mantequilla|jocoque/.test(value)) return 'lacteos'
  if (/manzana|fresa|papaya|platano|pera|melon|sandia|piña|uva|kiwi|mango|naranja|mandarina|fruta/.test(value)) return 'fruta'
  if (/tortilla|pan|arroz|avena|quinoa|pasta|espagueti|tostada|galleta|granola|camote|papa/.test(value)) return 'cereal'
  if (/agua|cafe|te|infusion|limonada|jamaica|gelatina/.test(value)) return 'bebida'
  if (/aceite|sal|pimienta|salsa|vinagre|mostaza|miel|stevia|tajin|canela|ajo/.test(value)) return 'condimento'
  return 'verdura'
}

function splitHousehold(raw: string): { main: string; householdText: string | null } {
  const match = raw.match(/\(([^()]*)\)\s*$/)
  return match && match.index !== undefined ? { main: raw.slice(0, match.index).trim(), householdText: match[1].trim() } : { main: raw.trim(), householdText: null }
}

interface ParsedIngredientLine {
  name: string
  amount: number | null
  unit: string | null
  householdAmount: string | null
  householdUnit: string | null
  householdText: string | null
  originalText: string
  optional: boolean
}

function ingredientParts(line: string): { name: string; rawQuantity: string } | null {
  const clean = line.replace(/^[•·▪◦]\s*/, '').trim()
  const separator = clean.match(/\s+[—–-]\s+|[—–]/)
  if (separator && separator.index !== undefined) {
    const name = clean.slice(0, separator.index).trim()
    const rawQuantity = clean.slice(separator.index + separator[0].length).trim().replace(/,\s*$/, '')
    return name && rawQuantity ? { name, rawQuantity } : null
  }
  const noSeparator = clean.match(/^(.+?)\s+((?:\d+(?:[.,]\d+)?(?:\s*[¼½¾⅓⅔⅕⅖⅗⅘⅛⅜⅝⅞])?|[¼½¾⅓⅔⅕⅖⅗⅘⅛⅜⅝⅞])\s+(?:mg|kg|ml|g|l|gramos?|mililitros?|piezas?|unidad(?:es)?|tazas?|cucharadas?|cucharaditas?|cuchar[oó]n(?:es)?|rebanadas?|sobres?|latas?|filetes?|paquetes?|botellas?|trozos?)(?:\s*\([^)]*\))?)$/iu)
  return noSeparator ? { name: noSeparator[1].trim(), rawQuantity: noSeparator[2].trim() } : null
}

function parseIngredientLine(line: string): ParsedIngredientLine | null {
  const parts = ingredientParts(line)
  if (!parts) return null
  const { main, householdText } = splitHousehold(parts.rawQuantity)
  const mainMeasure = parseMeasure(main)
  const householdMeasure = householdText ? parseMeasure(householdText.replace(/^aproximadamente\s+/i, '')) : { amount: null, unit: null }
  const bareNumber = main.match(new RegExp(`^([\\d.,]+\\s*[${FRACTIONS}]?|[${FRACTIONS}])$`))
  const householdUnit = householdMeasure.unit ?? (householdText && !householdMeasure.amount ? normalizeUnit(householdText) : null)
  const amount = mainMeasure.amount ?? (bareNumber ? parseFraction(bareNumber[1]) : null)
  const unit = mainMeasure.unit ?? (bareNumber && householdUnit ? householdUnit : null)
  const householdAmount = householdMeasure.amount === null && bareNumber ? bareNumber[1].replace(/\s+/g, '') : householdMeasure.amount === null ? null : householdText!.match(new RegExp(`^([\\d.,]+\\s*[${FRACTIONS}]?|[${FRACTIONS}])`))?.[1] ?? null
  const cleanName = parts.name.replace(/\s*\(opcional\)/i, '').trim()
  return { name: cleanName, amount, unit, householdAmount, householdUnit, householdText, originalText: line.replace(/^[•·▪◦]\s*/, '').trim(), optional: /opcional/i.test(line) }
}

function parseIngredientText(line: string, planIndex: number, slot: ImportedSlot, componentKey: string, position: number, sourceIndex: number, sourceFile: string, warnings: ImportWarning[]): ParsedIngredient | null {
  const parsed = parseIngredientLine(line)
  if (!parsed) return null
  const warningCodes: string[] = []
  const warning = (code: string, message: string) => { warningCodes.push(code); warnings.push({ code, severity: 'warning', message, sourceIndex, rawText: line, planIndex, slot }) }
  const quantityText = line.split(/[—–]/).slice(1).join('—')
  const lowerMain = normalizeText(splitHousehold(quantityText).main)
  if (lowerMain.includes('cantidad no especificada')) warning('unspecified-quantity', 'La fuente declara una cantidad no especificada; no se asumió un valor.')
  if (lowerMain.includes('aproximadamente') || parsed.householdText?.toLocaleLowerCase('es').includes('aproximadamente')) warning('approximate-quantity', 'La cantidad está marcada como aproximada.')
  if (parsed.amount === null && !lowerMain.includes('cantidad no especificada')) warning('unparsed-quantity', 'No se pudo interpretar una cantidad principal con seguridad.')
  if (parsed.householdText && !parsed.householdUnit && !/al gusto|endulzada|para cocinar|filete de|^aproximadamente$/i.test(parsed.householdText)) warning('unknown-household-unit', 'La medida doméstica se conserva como texto, pero su unidad no se interpretó.')
  const key = sourceKey(sourceFile.toLocaleLowerCase('es'), 'plan', planIndex, slot, componentKey, 'ingredient', position)
  return {
    id: stableUuid(key), sourceKey: key, name: parsed.name, canonicalName: parsed.name, normalizedName: normalizeText(parsed.name), category: categoryFor(parsed.name), originalText: parsed.originalText,
    amount: parsed.amount, unit: parsed.unit, householdAmount: parsed.householdAmount, householdUnit: parsed.householdUnit, householdText: parsed.householdText,
    optional: parsed.optional, importance: parsed.optional ? 'optional' : position === 0 ? 'primary' : 'normal', position, aliases: aliasesFor(parsed.name), sourceIndex, warningCodes,
  }
}

function isPlanMarker(line: string): boolean { return normalizeText(line).startsWith('plan de alimentacion') }
function getSlot(line: string): ImportedSlot | null { return SLOT_LABELS[normalizeText(line).replace(/:$/, '')] ?? null }
function isNote(line: string): boolean { return /^nota(?: adicional)?\s*:/i.test(line) }
function isLikelyIngredient(line: string): boolean { return parseIngredientLine(line) !== null }

interface RawLine { text: string; sourceIndex: number }
interface LogicalLine extends RawLine { originalText: string; diagnostics: ParseDiagnostic[] }

function splitPlanAndSlot(text: string): string[] {
  const marker = text.match(/plan\s+de\s+alimentaci[oó]n\s+diario?/i)
  if (!marker) return [text]
  const rest = text.slice(marker[0].length).trim()
  return getSlot(rest) ? [marker[0], rest] : [text]
}

function splitFusedIngredient(text: string): string[] {
  const match = text.match(/^(.*?\s[—–]\s.*?\([^)]*\))\s+([A-ZÁÉÍÓÚÑ][^—–]+)$/u)
  if (match && isLikelyIngredient(match[1])) return [match[1].trim(), ...splitFusedIngredient(match[2].trim())]
  const prefix = text.match(/^(.+?\s+[—–]\s+(?:\d+(?:[.,]\d+)?(?:\s*[¼½¾⅓⅔⅕⅖⅗⅘⅛⅜⅝⅞])?|[¼½¾⅓⅔⅕⅖⅗⅘⅛⅜⅝⅞])\s+(?:mg|kg|ml|g|l|gramos?|mililitros?|piezas?|unidad(?:es)?|tazas?|cucharadas?|cucharaditas?|cuchar[oó]n(?:es)?|rebanadas?|sobres?|latas?|filetes?|paquetes?|botellas?|trozos?)(?:\s*\([^)]*\))?)\s+([A-ZÁÉÍÓÚÑ].+)$/u)
  if (prefix && isLikelyIngredient(prefix[1]) && !isLikelyIngredient(prefix[2]) && !isNote(prefix[2]) && !getSlot(prefix[2])) return [prefix[1].trim(), prefix[2].trim()]
  return [text]
}

function splitInlineComponent(text: string): string[] {
  if (isNote(text)) return [text]
  const match = text.match(/^([^:]+):\s*(.+)$/)
  return match && isLikelyIngredient(match[2]) ? [match[1].trim(), match[2].trim()] : [text]
}

function splitTrailingBareIngredient(text: string): string[] {
  const amount = `[\\d.,]+(?:[${FRACTIONS}]|\\s+[${FRACTIONS}])?|[${FRACTIONS}]`
  const match = text.match(new RegExp(`\\s+([A-ZÁÉÍÓÚÑ][^—–\\n]*?)\\s+(${amount}\\s+(?:${KNOWN_UNITS})(?:\\s*\\([^)]*\\))?)$`, 'u'))
  if (!match || match.index === undefined) return [text]
  const left = text.slice(0, match.index).trim()
  const right = text.slice(match.index).trim()
  return parseIngredientLine(left) && parseIngredientLine(right) ? [left, right] : [text]
}

function splitIngredientSequence(text: string): string[] {
  const pattern = new RegExp(`(^|\\s)([A-ZÁÉÍÓÚÑ][^—–\\n]*?)\\s+[—–]\\s+(?=[\\d${FRACTIONS}])`, 'gu')
  const starts: number[] = []
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text))) starts.push(match.index + match[1].length)
  if (starts.length < 2) return starts.length === 1 ? splitTrailingBareIngredient(text) : [text]
  const segments = starts.map((start, index) => text.slice(start, starts[index + 1] ?? text.length).trim()).filter(Boolean)
  return segments.flatMap(splitTrailingBareIngredient)
}

function splitSlotPrefix(text: string): string[] {
  for (const slot of SLOT_PREFIXES) {
    const match = text.match(new RegExp(`^${slot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s*\\S)`, 'i'))
    if (match && text.length > match[0].length) return [match[0], text.slice(match[0].length).trim()]
  }
  return [text]
}

function splitEmbeddedSlot(text: string): string[] {
  const pattern = new RegExp(`\\s+(${SLOT_PREFIXES.map((slot) => slot.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')).join('|')})(?=\\s|$)`)
  const match = text.match(pattern)
  if (!match || match.index === undefined || match.index === 0) return [text]
  if (!/^nota(?: adicional)?\s*:/i.test(text)) return [text]
  const before = text.slice(0, match.index).trim()
  const slot = match[1]
  const after = text.slice(match.index + match[0].length).trim()
  return after ? [before, slot, after] : [before, slot]
}

function expandRawLine(raw: RawLine): LogicalLine[] {
  const cleaned = raw.text.replace(/\u00a0/g, ' ').replace(/\r/g, '').trim()
  if (!cleaned) return []
  const pieces = cleaned.includes('•') ? cleaned.replace(/•/g, '\n•').split('\n') : [cleaned]
  const result: LogicalLine[] = []
  for (const rawPiece of pieces) {
    const piece = rawPiece.trim().replace(/^[•·▪◦]\s*/, '')
    if (!piece) continue
    for (const planPiece of splitPlanAndSlot(piece)) {
      for (const embeddedPiece of splitEmbeddedSlot(planPiece)) {
        for (const slotPiece of splitSlotPrefix(embeddedPiece)) {
          const fused = splitIngredientSequence(slotPiece).flatMap(splitFusedIngredient).flatMap(splitInlineComponent)
          for (const splitPiece of fused) result.push({ text: splitPiece, sourceIndex: raw.sourceIndex, originalText: raw.text, diagnostics: fused.length > 1 || splitPiece !== piece ? [{ kind: 'fused-line', rawText: raw.text, sourceIndex: raw.sourceIndex, interpretation: 'Separar líneas o entidades fusionadas.', resolved: true }] : [] })
        }
      }
    }
  }
  return result
}

function mergeSplitHeadings(lines: LogicalLine[]): LogicalLine[] {
  const result: LogicalLine[] = []
  for (let index = 0; index < lines.length; index++) {
    const current = lines[index]
    const next = lines[index + 1]
    if (next && normalizeText(current.text) === 'medio' && normalizeText(next.text) === 'dia') {
      result.push({ ...current, text: 'Medio día', originalText: `${current.originalText}\n${next.originalText}`, diagnostics: [...current.diagnostics, ...next.diagnostics, { kind: 'split-heading', rawText: `${current.originalText}\n${next.originalText}`, sourceIndex: current.sourceIndex, interpretation: 'Unir encabezado Medio + día como Medio día.', resolved: true }] })
      index++
      continue
    }
    if (next && /^de\s+/i.test(next.text) && !isLikelyIngredient(current.text) && !isLikelyIngredient(next.text) && !isNote(current.text) && !isNote(next.text) && !getSlot(current.text) && !getSlot(next.text) && !isPlanMarker(current.text) && !isPlanMarker(next.text)) {
      result.push({ ...current, text: `${current.text} ${next.text}`.replace(/\s+/g, ' ').trim(), originalText: `${current.originalText}\n${next.originalText}`, diagnostics: [...current.diagnostics, ...next.diagnostics, { kind: 'split-title', rawText: `${current.originalText}\n${next.originalText}`, sourceIndex: current.sourceIndex, interpretation: 'Unir título de comida partido entre líneas.', resolved: true }] })
      index++
      continue
    }
    result.push(current)
  }
  return result
}

function normalizeLogicalLines(input: RawLine[]): LogicalLine[] { return mergeSplitHeadings(input.flatMap(expandRawLine)) }

async function readDocxParagraphs(filePath: string): Promise<RawLine[]> {
  const buffer = await readFile(filePath)
  const zip = await JSZip.loadAsync(buffer)
  const documentFile = zip.file('word/document.xml')
  if (!documentFile) throw new Error('El DOCX no contiene word/document.xml')
  const xml = await documentFile.async('string')
  const paragraphs: RawLine[] = []
  const paragraphPattern = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g
  let match: RegExpExecArray | null
  let index = 0
  while ((match = paragraphPattern.exec(xml))) {
    const body = match[1].replace(/<w:(?:br|tab)[^>]*\/?>(?:<\/w:(?:br|tab)>)?/g, ' ')
    const text = [...body.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((item) => decodeXml(item[1])).join('')
    paragraphs.push({ text, sourceIndex: index++ })
  }
  return paragraphs
}

function createComponent(planIndex: number, slot: ImportedSlot, position: number, label: string | null, sourceIndex: number, sourceFile: string): ParsedComponent {
  const key = sourceKey(sourceFile.toLocaleLowerCase('es'), 'plan', planIndex, slot, 'component', position)
  return { id: stableUuid(key), sourceKey: key, sourceLabel: label, position, optional: Boolean(label && /opcional/i.test(label)), notes: [], ingredients: [], sourceIndex }
}

export async function parseDietDocument(filePath: string, sourceFile = 'DietaCompleta.docx'): Promise<ParsedDiet> {
  const fileBuffer = await readFile(filePath)
  const sourceHash = createHash('sha256').update(fileBuffer).digest('hex')
  const lines = normalizeLogicalLines(await readDocxParagraphs(filePath))
  const warnings: ImportWarning[] = []
  const diagnostics = [...new Map(lines.flatMap((line) => line.diagnostics).map((diagnostic) => [`${diagnostic.kind}:${diagnostic.sourceIndex}:${diagnostic.rawText}`, diagnostic])).values()]
  const plans: ParsedDailyPlan[] = []
  let currentPlan: ParsedDailyPlan | null = null
  let currentSlot: ImportedSlot | null = null
  let currentOption: ParsedMealOption | null = null
  let currentComponent: ParsedComponent | null = null
  const normalizedSource = sourceFile.toLocaleLowerCase('es')
  const finalizeOption = () => { currentOption = null; currentComponent = null }
  const finalizePlan = () => { finalizeOption(); currentSlot = null; currentPlan = null }
  for (const entry of lines) {
    const line = entry.text.trim()
    if (!line) continue
    if (isPlanMarker(line)) {
      finalizePlan()
      const planIndex = plans.length
      const key = sourceKey(normalizedSource, 'plan', planIndex)
      currentPlan = { id: stableUuid(key), sourceKey: key, planIndex, sourceIndex: entry.sourceIndex, sourceFile, sourceHash, rawText: entry.originalText, mealOptions: [] }
      plans.push(currentPlan)
      continue
    }
    if (!currentPlan) continue
    const slot = getSlot(line)
    if (slot) { finalizeOption(); currentSlot = slot; continue }
    currentPlan.rawText += `\n${entry.originalText}`
    if (!currentSlot) {
      const kind = isLikelyIngredient(line) ? 'orphan-ingredient' : isNote(line) ? 'orphan-note' : 'block-without-slot'
      const interpretation = isLikelyIngredient(line) ? 'Ingrediente sin franja; no se asignó.' : isNote(line) ? 'Nota sin franja; se conservó.' : 'Bloque o platillo sin franja reconocida.'
      diagnostics.push({ kind, rawText: entry.originalText, sourceIndex: entry.sourceIndex, interpretation, resolved: false, planIndex: currentPlan.planIndex })
      warnings.push({ code: kind, severity: 'warning', message: interpretation, sourceIndex: entry.sourceIndex, rawText: line, planIndex: currentPlan.planIndex })
      continue
    }
    if (currentSlot === 'wake_up' && !currentOption && isLikelyIngredient(line)) {
      const optionKey = sourceKey(normalizedSource, 'plan', currentPlan.planIndex, 'slot', currentSlot, 'option', 0)
      currentOption = { id: stableUuid(optionKey), sourceKey: optionKey, planIndex: currentPlan.planIndex, sourceIndex: entry.sourceIndex, slot: currentSlot, title: 'Al despertar', notes: [], components: [], tags: [], rawText: entry.originalText }
      currentPlan.mealOptions.push(currentOption)
      currentComponent = createComponent(currentPlan.planIndex, currentSlot, 0, null, entry.sourceIndex, normalizedSource)
      currentOption.components.push(currentComponent)
    }
    if (isNote(line)) {
      const note = line.replace(/^nota(?: adicional)?\s*:\s*/i, '').trim()
      if (currentOption && currentComponent?.sourceLabel) currentComponent.notes.push(note)
      else if (currentOption) currentOption.notes.push(note)
      else warnings.push({ code: 'note-without-option', severity: 'warning', message: 'Nota sin opción asociada.', sourceIndex: entry.sourceIndex, rawText: line, planIndex: currentPlan.planIndex, slot: currentSlot })
      continue
    }
    const ingredient = currentComponent ? parseIngredientText(line, currentPlan.planIndex, currentSlot, currentComponent.sourceKey, currentComponent.ingredients.length, entry.sourceIndex, normalizedSource, warnings) : null
    if (ingredient && currentComponent) { currentComponent.ingredients.push(ingredient); continue }
    if (!currentOption || (currentComponent && currentComponent.ingredients.length === 0 && currentComponent.sourceLabel === null)) {
      const optionPosition = currentPlan.mealOptions.filter((meal) => meal.slot === currentSlot).length
      const optionKey = sourceKey(normalizedSource, 'plan', currentPlan.planIndex, 'slot', currentSlot, 'option', optionPosition)
      currentOption = { id: stableUuid(optionKey), sourceKey: optionKey, planIndex: currentPlan.planIndex, sourceIndex: entry.sourceIndex, slot: currentSlot, title: line, notes: [], components: [], tags: [], rawText: entry.originalText }
      currentPlan.mealOptions.push(currentOption)
      currentComponent = createComponent(currentPlan.planIndex, currentSlot, 0, null, entry.sourceIndex, normalizedSource)
      currentOption.components.push(currentComponent)
      continue
    }
    const component = createComponent(currentPlan.planIndex, currentSlot, currentOption.components.length, line, entry.sourceIndex, normalizedSource)
    currentOption.components.push(component)
    currentComponent = component
  }
  const meals = plans.flatMap((plan) => plan.mealOptions)
  const allIngredients = meals.flatMap((meal) => meal.components.flatMap((component) => component.ingredients))
  const ingredientMap = new Map<string, ParsedIngredient>()
  for (const ingredient of allIngredients) if (!ingredientMap.has(ingredient.normalizedName)) ingredientMap.set(ingredient.normalizedName, ingredient)
  for (const meal of meals) {
    if (!meal.title) warnings.push({ code: 'missing-title', severity: 'error', message: 'MealOption sin título.', sourceIndex: meal.sourceIndex, rawText: meal.rawText, planIndex: meal.planIndex, slot: meal.slot })
    if (!meal.components.some((component) => component.ingredients.length > 0)) warnings.push({ code: 'empty-meal', severity: 'warning', message: 'MealOption sin ingredientes interpretados.', sourceIndex: meal.sourceIndex, rawText: meal.title, planIndex: meal.planIndex, slot: meal.slot })
    for (const component of meal.components) if (!component.ingredients.length) warnings.push({ code: 'empty-component', severity: 'warning', message: 'Componente sin ingredientes interpretados.', sourceIndex: component.sourceIndex, rawText: component.sourceLabel ?? meal.title, planIndex: meal.planIndex, slot: meal.slot })
  }
  const slotCounts: Record<ImportedSlot, number> = { wake_up: 0, breakfast: 0, midday: 0, lunch: 0, afternoon: 0, dinner: 0 }
  let notes = 0
  for (const meal of meals) { slotCounts[meal.slot]++; notes += meal.notes.length + meal.components.reduce((sum, component) => sum + component.notes.length, 0) }
  const potentialDuplicates = meals.filter((meal, index, all) => all.some((other, otherIndex) => otherIndex < index && normalizeText(other.title) === normalizeText(meal.title) && other.slot === meal.slot && other.id !== meal.id)).length
  const count = (kind: ParseDiagnostic['kind']) => diagnostics.filter((diagnostic) => diagnostic.kind === kind).length
  return {
    version: 1, sourceFile, sourceHash, parsedAt: new Date().toISOString(), dailyPlans: plans, ingredients: [...ingredientMap.values()], warnings,
    stats: {
      dailyPlans: plans.length, mealOptions: meals.length, mealOptionsBySlot: slotCounts, components: meals.reduce((total, meal) => total + meal.components.length, 0), dishIngredients: allIngredients.length,
      uniqueIngredients: ingredientMap.size, aliases: [...ingredientMap.values()].reduce((sum, ingredient) => sum + ingredient.aliases.length, 0), notes, warnings: warnings.length, potentialDuplicates,
      linesUnclassified: count('unclassified-line'), linesWithoutSlot: count('block-without-slot'), orphanIngredients: count('orphan-ingredient'), orphanNotes: count('orphan-note'), fusedLines: count('fused-line'), repairedLineBreaks: count('split-heading') + count('split-title'),
      mealOptionsWithoutIngredients: meals.filter((meal) => !meal.components.some((component) => component.ingredients.length)).length,
    }, diagnostics,
  }
}

export { normalizeText, parseFraction, parseMeasure, parseIngredientLine, splitIngredientSequence, normalizeLogicalLines, stableUuid }

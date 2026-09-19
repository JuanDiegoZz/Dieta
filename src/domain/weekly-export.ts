import { PLANNING_SLOTS } from './weekly'
import type { MealOption, WeeklyPlan, WeeklyPlanEntry } from './types'

const WIDTH = 1080
const PADDING = 64
const DAY_HEIGHT = 228
const SLOT_HEIGHT = 30

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character] ?? character))
}

function dateKey(startDate: string, offset: number) {
  const date = new Date(`${startDate}T12:00:00`)
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

function wrapText(value: string, maxCharacters: number) {
  const words = value.trim().split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    if (word.length > maxCharacters) {
      if (line) { lines.push(line); line = '' }
      let remaining = word
      while (remaining.length > maxCharacters) { lines.push(remaining.slice(0, maxCharacters)); remaining = remaining.slice(maxCharacters) }
      line = remaining
      continue
    }
    const next = line ? `${line} ${word}` : word
    if (line && next.length > maxCharacters) { lines.push(line); line = word } else line = next
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['Sin opción']
}

function slotLabel(slot: WeeklyPlanEntry['slot']) {
  return ({ breakfast: 'Desayuno', midday: 'Medio día', lunch: 'Comida', afternoon: 'Media tarde', dinner: 'Cena' } as Record<string, string>)[slot] ?? slot
}

function dateLabel(dateKeyValue: string) {
  const label = new Date(`${dateKeyValue}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  return label.charAt(0).toLocaleUpperCase('es-MX') + label.slice(1)
}

function shortDateLabel(dateKeyValue: string) {
  return new Date(`${dateKeyValue}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function weeklyExportDimensions() {
  return { width: WIDTH, height: PADDING * 2 + 142 + DAY_HEIGHT * 7 }
}

export function buildWeeklyPlanSvg(plan: WeeklyPlan, meals: MealOption[]) {
  const dimensions = weeklyExportDimensions()
  const byId = new Map(meals.map((meal) => [meal.id, meal]))
  const endDate = dateKey(plan.startDate, 6)
  const dayBlocks: string[] = []

  for (let day = 0; day < 7; day += 1) {
    const currentDate = dateKey(plan.startDate, day)
    const top = PADDING + 142 + day * DAY_HEIGHT
    const entries = PLANNING_SLOTS.map((slot) => plan.entries.find((entry) => entry.plannedDate === currentDate && entry.slot === slot))
    const rows = entries.map((entry, index) => {
      const meal = entry?.mealOptionId ? byId.get(entry.mealOptionId) : undefined
      const lines = wrapText(meal?.title ?? 'Sin opción', 34)
      const rowTop = top + 53 + index * SLOT_HEIGHT
      return `<text x="${PADDING + 24}" y="${rowTop}" class="slot-label">${escapeXml(slotLabel(PLANNING_SLOTS[index]))}</text><text x="${PADDING + 220}" y="${rowTop}" class="meal-name">${lines.map((line, lineIndex) => `<tspan x="${PADDING + 220}" dy="${lineIndex ? 22 : 0}">${escapeXml(line)}</tspan>`).join('')}</text>`
    }).join('')
    dayBlocks.push(`<g><rect x="${PADDING}" y="${top}" width="${WIDTH - PADDING * 2}" height="${DAY_HEIGHT - 12}" rx="24" class="day-card"/><text x="${PADDING + 24}" y="${top + 34}" class="day-title">${escapeXml(dateLabel(currentDate))}</text>${rows}</g>`)
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}" role="img" aria-labelledby="title description"><title id="title">${escapeXml(plan.name || 'Mi semana')}</title><desc id="description">Semana ${escapeXml(plan.startDate)} a ${escapeXml(endDate)}</desc><style>text{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.background{fill:#f7f6f2}.eyebrow{fill:#c65e40;font-size:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase}.title{fill:#202521;font-size:52px;font-weight:750}.range{fill:#767d76;font-size:22px}.day-card{fill:#fff;stroke:#e6e8e2;stroke-width:2}.day-title{fill:#202521;font-size:24px;font-weight:700}.slot-label{fill:#c65e40;font-size:15px;font-weight:700}.meal-name{fill:#202521;font-size:18px;font-weight:600}</style><rect width="100%" height="100%" class="background"/><text x="${PADDING}" y="${PADDING + 20}" class="eyebrow">Mi plan personal</text><text x="${PADDING}" y="${PADDING + 80}" class="title">${escapeXml(plan.name || 'Mi semana')}</text><text x="${PADDING}" y="${PADDING + 116}" class="range">${escapeXml(shortDateLabel(plan.startDate))} — ${escapeXml(shortDateLabel(endDate))}</text>${dayBlocks.join('')}</svg>`
}

function triggerDownload(dataUrl: string, filename: string) {
  const anchor = document.createElement('a')
  if ('download' in anchor) {
    anchor.href = dataUrl
    anchor.download = filename
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    return 'downloaded' as const
  }
  const popup = window.open('', '_blank')
  if (popup) popup.location.href = dataUrl
  return 'opened' as const
}

function svgToPng(svg: string, width: number, height: number) {
  return new Promise<string | null>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (!context) { resolve(null); return }
        context.drawImage(image, 0, 0, width, height)
        resolve(canvas.toDataURL('image/png'))
      } catch (error) { reject(error) }
    }
    image.onerror = () => resolve(null)
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}

export async function exportWeeklyPlan(plan: WeeklyPlan, meals: MealOption[]) {
  const svg = buildWeeklyPlanSvg(plan, meals)
  const dimensions = weeklyExportDimensions()
  const png = typeof document !== 'undefined' && typeof Image !== 'undefined' ? await svgToPng(svg, dimensions.width, dimensions.height).catch(() => null) : null
  if (png) return triggerDownload(png, 'mi-semana.png')
  return triggerDownload(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, 'mi-semana.svg')
}

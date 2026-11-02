/* global module, URL, document, innerWidth, innerHeight, sessionStorage, localStorage, window, getComputedStyle, EventTarget, Event */
// All data and writes are synthetic. Evaluate the exported function with the Playwright browser tool.
module.exports = async (page, phase = 'before', checksThrough = 7) => {
  const sizes = [[1024, 768], [1112, 834], [1180, 820], [1194, 834], [1366, 1024], [768, 1024], [375, 812]]
  const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const assert = (value, message) => { if (!value) throw Error(message) }
  const reports = [], errors = []
  const onError = error => errors.push(error.message)
  page.on('pageerror', onError)
  await page.unrouteAll({ behavior: 'wait' })
  const slots = ['breakfast', 'midday', 'lunch', 'afternoon', 'dinner']
  const ingredients = Array.from({ length: 12 }, (_, i) => ({ id: uuid(100 + i), canonicalName: i === 0 ? 'Piña (cualquier variedad)' : `Ingrediente de prueba ${i}`, category: 'fruta', aliases: [], active: true }))
  const meals = Array.from({ length: 20 }, (_, i) => ({ id: uuid(i + 1), slot: slots[i % 5], title: i % 4 === 0 ? 'Piña con yogur natural, almendras y acompañamiento de la dieta' : `Opción con piña ${i + 1}`, summary: 'Piña · Yogur natural · Almendras · Agua', tags: [], favorite: true, active: true, hidden: false, availability: null, lastEaten: 'Nunca', lastEatenAt: null, note: 'Nota de prueba: conservar las cantidades y medidas originales.', components: Array.from({ length: 3 }, (_, c) => ({ id: uuid(200 + i * 3 + c), label: ['Principal', 'Guarnición', 'Bebida'][c], note: 'Nota del componente: respetar la medida indicada.', ingredients: Array.from({ length: c === 2 ? 1 : 4 }, (_, j) => ({ id: uuid(500 + i * 12 + c * 4 + j), ingredientId: ingredients[j].id, name: j === 0 ? 'Piña (cualquier variedad)' : ingredients[j].canonicalName, quantity: j === 0 ? '124 g' : '100 g', householdMeasure: '¾ taza, medida original del plan', aliases: [] })) })) }))
  const entries = Array.from({ length: 35 }, (_, i) => ({ id: uuid(1000 + i), plannedDate: `2026-11-${String(2 + Math.floor(i / 5)).padStart(2, '0')}`, slot: slots[i % 5], mealOptionId: meals[i % 20].id, locked: false }))
  let plan = { id: uuid(900), startDate: '2026-11-02', name: 'Semana sintética', entries }
  const history = [{ id: uuid(950), mealOptionId: meals[0].id, eatenAt: '2026-11-01T12:00:00.000Z', rating: 4, note: null }]
  const payload = () => ({ version: 'landscape-fixture', meals, ingredients, pantry: [], history })
  await page.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/bootstrap') return reply(payload())
    if (path === '/api/weekly') { if (request.method() === 'POST') plan = request.postDataJSON(); return reply(plan) }
    if (path.startsWith('/api/preferences/')) { const meal = meals.find(m => m.id === path.split('/').pop()); Object.assign(meal, request.postDataJSON()); return reply(meal) }
    return reply({ error: 'UNEXPECTED_SYNTHETIC_REQUEST' }, 400)
  })
  await page.route('**/catalog.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload()) }))
  try {
    await page.goto('http://127.0.0.1:5180/#/explore')
    await page.evaluate(() => { sessionStorage.clear(); localStorage.clear() })
    await page.reload()
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height })
      for (const screen of ['today', 'explore', 'pantry', 'favorites', 'history', 'week', 'admin', 'detail', 'kitchen']) {
        await page.goto(`http://127.0.0.1:5180/#/${screen}${['detail', 'kitchen'].includes(screen) ? `?id=${uuid(1)}` : ''}`)
        await page.locator('h1:visible').first().waitFor()
        if (screen === 'today') await page.getByRole('button', { name: 'Desayuno', exact: true }).click()
        if (screen === 'explore') await page.locator('input[type=search]').fill('piña')
        if (screen === 'admin') await page.locator('.admin-list__item').first().click()
        if (screen === 'week') await page.locator('.week-grid').waitFor()
        if (screen === 'history') await page.locator('.history-row').waitFor()
        if (screen === 'detail') await page.locator('.component-section').first().waitFor()
        const metrics = await page.evaluate(() => {
          const box = selector => { const e = document.querySelector(selector); if (!e) return null; const b = e.getBoundingClientRect(); if (!b.width) return null; return { width: Math.round(b.width), height: Math.round(b.height), top: Math.round(b.top), bottom: Math.round(b.bottom), scroll: e.scrollWidth } }
          return { pageWidth: document.documentElement.scrollWidth, sidebar: box('.desktop-sidebar'), main: box('.app-main'), card: box('.meal-card'), filter: box('.filter-row'), week: box('.week-grid'), day: box('.day-column'), cookingAction: box('.kitchen-done'), components: box('.component-list'), kitchen: box('.kitchen-ingredients'), bottomNav: box('.mobile-nav') }
        })
        if (phase === 'after') {
          assert(metrics.pageWidth <= width, `${screen} overflows at ${width}`)
          if (width >= 1000) {
            assert(metrics.sidebar.width <= 120, `navigation consumes too much width at ${width}`)
            assert(!metrics.bottomNav || metrics.bottomNav.height === 0, 'landscape must not reserve a bottom navigation')
            if (metrics.card) assert(metrics.card.width >= 250, `cards compressed at ${width}`)
            if (screen === 'week' && checksThrough >= 4) assert(metrics.week.scroll <= metrics.week.width + 1, 'weekly meals must fit without horizontal calendar scrolling')
            if (screen === 'kitchen' && checksThrough >= 5) assert(metrics.cookingAction.top >= 0 && metrics.cookingAction.bottom <= height, 'preparation action must be initially visible in landscape')
            if (screen === 'admin' && checksThrough >= 6) {
              const save = await page.getByRole('button', { name: 'Guardar cambios', exact: true }).boundingBox()
              assert(save.y >= 0 && save.y + save.height <= height, 'admin save must be reachable at the start')
              await page.evaluate(() => window.scrollTo(0, 1400))
              const stickySave = await page.getByRole('button', { name: 'Guardar cambios', exact: true }).boundingBox()
              assert(stickySave.y >= 0 && stickySave.y + stickySave.height <= height, 'save must remain visible while editing')
              await page.evaluate(() => window.scrollTo(0, 0))
            }
          }
        }
        reports.push({ width, height, screen, ...metrics })
        if (['explore', 'week', 'detail', 'kitchen', 'admin'].includes(screen)) await page.screenshot({ path: `C:/Dev/dieta-app/docs/evidence/landscape/${phase}/${screen}-${width}.png` })
        if (phase === 'after' && checksThrough >= 4 && screen === 'week') {
          assert(await page.locator('.week-days button').count() === 7, 'all seven dates must remain available')
          assert(await page.locator('.week-entry').count() === 5, 'selected day must contain five slots')
          await page.locator('.week-days button').nth(3).click()
          const unlock = page.getByRole('button', { name: /^Desbloquear Comida / })
          if (await unlock.count()) { await unlock.click(); await page.getByRole('button', { name: /^Bloquear Comida / }).waitFor() }
          await page.getByRole('button', { name: /^Bloquear Comida / }).click()
          await page.getByRole('button', { name: /^Desbloquear Comida / }).waitFor()
          await page.locator('.week-days button').first().click()
          await page.locator('.week-days button').nth(3).click()
          assert(await page.getByRole('button', { name: /^Desbloquear Comida / }).getAttribute('aria-pressed') === 'true', 'day navigation must preserve locks')
          await page.setViewportSize({ width: 768, height: 1024 })
          assert(await page.locator('.week-days button').nth(3).getAttribute('aria-pressed') === 'true', 'rotation must preserve selected day')
          await page.setViewportSize({ width, height })
          await page.locator('.week-days button').nth(3).focus(); await page.keyboard.press('End')
          assert(await page.locator('.week-days button').nth(6).getAttribute('aria-pressed') === 'true', 'End must select final day')
          await page.keyboard.press('Home')
          assert(await page.locator('.week-days button').first().getAttribute('aria-pressed') === 'true', 'Home must select first day')
          await page.getByRole('button', { name: /^Limpiar Comida / }).click()
          await page.locator('.week-entry').nth(2).locator('.week-entry__empty').waitFor()
          await page.locator('.week-entry').nth(2).locator('.week-entry__empty').click()
          await page.getByRole('button', { name: /^Cambiar Comida / }).waitFor()
          assert(plan.entries.length === 35, 'editing a selected day must retain the entire week')
        }
      }
      await page.goto('http://127.0.0.1:5180/#/week')
      await page.getByRole('button', { name: /^Cambiar / }).first().click()
      await page.getByRole('textbox', { name: 'Buscar alternativa' }).fill('PIÑA')
      assert(await page.locator('.change-option').count() > 0, 'weekly alternatives must still find pineapple')
      await page.screenshot({ path: `C:/Dev/dieta-app/docs/evidence/landscape/${phase}/dialog-${width}.png` })
      await page.locator('.change-option').last().focus(); await page.keyboard.press('Tab')
      assert(await page.evaluate(() => !!document.activeElement.closest('[role=dialog]')), 'modal focus must remain contained')
      await page.keyboard.press('Escape')
    }
    await page.setViewportSize({ width: 1024, height: 380 })
    await page.getByRole('button', { name: /^Cambiar / }).first().click()
    await page.getByRole('textbox', { name: 'Buscar alternativa' }).focus()
    const short = await page.getByRole('dialog').boundingBox()
    assert(short.y >= 0 && short.y + short.height <= 380, 'dialog must fit reduced height')
    await page.screenshot({ path: `C:/Dev/dieta-app/docs/evidence/landscape/${phase}/dialog-short.png` })
    await page.keyboard.press('Escape')
    if (phase === 'after' && checksThrough >= 6) {
      await page.evaluate(() => {
        const viewport = Object.assign(new EventTarget(), { height: 280, offsetTop: 45 })
        Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport })
      })
      await page.getByRole('button', { name: /^Cambiar / }).first().click()
      let dialog = await page.getByRole('dialog').boundingBox()
      assert(dialog.y >= 45 && dialog.y + dialog.height <= 325, 'dialog must fit a simulated visual viewport')
      await page.evaluate(() => { window.visualViewport.height = 240; window.visualViewport.offsetTop = 70; window.visualViewport.dispatchEvent(new Event('resize')) })
      dialog = await page.getByRole('dialog').boundingBox()
      assert(dialog.y >= 70 && dialog.y + dialog.height <= 310, 'dialog must follow visual viewport resize')
      await page.keyboard.press('Escape')
      await page.evaluate(() => { delete window.visualViewport })
    }
    assert(errors.length === 0, errors.join('; '))
    return reports
  } finally { page.off('pageerror', onError); await page.unrouteAll({ behavior: 'wait' }) }
}

/* global module, URL, sessionStorage, localStorage, document, innerWidth, window, getComputedStyle, Event */
// Exported Playwright suite. For the browser tool, evaluate the function after removing `module.exports =`.
// Every API response is synthetic. No request can reach the production BFF.
module.exports = async (page, iteration = 1, captureEvidence = false) => {
  const assert = (condition, message) => { if (!condition) throw new Error(message) }
  const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const sizes = [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1112, height: 834 }, { width: 1180, height: 820 }, { width: 1194, height: 834 }, { width: 1366, height: 1024 }, { width: 1366, height: 900 }]
  const reports = []
  await page.unrouteAll({ behavior: 'wait' })
  const errors = []
  const onError = (error) => errors.push(error.message)
  page.on('pageerror', onError)
  try {
    for (const size of sizes) {
      await page.setViewportSize(size)
      const meals = Array.from({ length: 18 }, (_, index) => ({
        id: uuid(index + 1), slot: index < 14 ? 'breakfast' : 'lunch', title: index < 14 ? `Piña ${String(index + 1).padStart(2, '0')}` : index === 14 ? 'Espinaca' : `Café ${index}`,
        summary: index < 14 ? 'Piña y yogur' : index === 14 ? 'Espinaca' : 'Café', tags: [], favorite: true, active: true, hidden: false, availability: null, lastEaten: 'Nunca', lastEatenAt: null,
        components: [{ id: uuid(index + 50), label: 'Principal', note: 'Conservar la medida original.', ingredients: [{ id: uuid(index + 80), ingredientId: uuid(100), name: index < 14 ? 'Piña' : index === 14 ? 'Espinaca' : 'Café', quantity: '100 g', aliases: [] }] }, { id: uuid(index + 200), label: 'Bebida', note: 'Sin cambiar cantidades.', ingredients: [{ id: uuid(index + 230), ingredientId: uuid(101), name: 'Agua', quantity: '200 ml', aliases: [] }] }],
      }))
      const ingredients = [{ id: uuid(100), canonicalName: 'Piña', category: 'fruta', active: true, aliases: ['ananás'] }, { id: uuid(101), canonicalName: 'Agua', category: 'bebida', active: true, aliases: [] }]
      const state = { mode: 'success', posts: [], saved: new Map(), pantry: [], weeklyError: false, bootstrapError: false, bootstrapReads: 0, weeklyReads: 0, version: 'synthetic-v1', weekly: { id: uuid(500), startDate: '2026-11-02', name: 'Semana de prueba', entries: [{ id: uuid(501), plannedDate: '2026-11-02', slot: 'breakfast', mealOptionId: uuid(1), locked: false }] } }
      const payload = () => ({ version: state.version, meals, ingredients, pantry: state.pantry, history: [...state.saved.values()].map(r => ({ id: r.id, mealOptionId: r.meal_option_id, eatenAt: r.eaten_at, rating: r.rating, note: null })) })
      await page.route('**/catalog.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload()) }))
      await page.route('**/api/**', async route => {
        const request = route.request(), path = new URL(request.url()).pathname
        const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
        if (path === '/api/bootstrap') { state.bootstrapReads++; return state.bootstrapError ? reply({ error: 'SIMULATED' }, 503) : reply(payload()) }
        if (path === '/api/weekly') {
          if (request.method() === 'POST') { state.weekly = request.postDataJSON(); return reply(state.weekly) }
          state.weeklyReads++
          return state.weeklyError ? reply({ error: 'SIMULATED' }, 503) : reply(state.weekly)
        }
        if (path.startsWith('/api/preferences/') && request.method() === 'PATCH') {
          const meal = meals.find(m => m.id === path.split('/').pop())
          Object.assign(meal, request.postDataJSON())
          return reply({ meal_option_id: meal.id, favorite: meal.favorite, hidden: meal.hidden, rating: meal.rating ?? null })
        }
        if (path.startsWith('/api/pantry/') && request.method() === 'PATCH') {
          const ingredientId = path.split('/').pop()
          const current = state.pantry.find(i => i.ingredientId === ingredientId) ?? { ingredientId, available: false, useSoon: false }
          Object.assign(current, request.postDataJSON())
          state.pantry = [...state.pantry.filter(i => i.ingredientId !== ingredientId), current]
          return reply(current)
        }
        if (path.startsWith('/api/history/') && request.method() === 'DELETE') { state.saved.delete(path.split('/').pop()); return route.fulfill({ status: 204 }) }
        if (path.startsWith('/api/ingredients/') && request.method() === 'PATCH') {
          const item = ingredients.find(i => i.id === path.split('/').pop())
          const body = request.postDataJSON()
          Object.assign(item, { canonicalName: body.canonicalName, category: body.category, aliases: body.aliases })
          return reply({ id: item.id })
        }
        if (path === '/api/history' && request.method() === 'POST') {
          const body = request.postDataJSON(); state.posts.push(body)
          if (state.mode === 'network') return route.abort('failed')
          if (state.mode === '503') return reply({ error: 'SIMULATED' }, 503)
          const row = { id: body.id, meal_option_id: body.mealOptionId, eaten_at: body.eatenAt, rating: body.rating ?? null, note: null }
          state.saved.set(body.id, row)
          if (state.mode === 'lost-response') return route.abort('failed')
          return reply(row, 201)
        }
        return reply({ error: 'UNEXPECTED_TEST_REQUEST' }, 400)
      })
      await page.goto('http://127.0.0.1:5180/#/explore')
      await page.evaluate(() => { sessionStorage.clear(); localStorage.clear() })
      await page.reload()
      await page.locator('input[type=search]').fill('piña')
      await page.locator('.meal-card').first().waitFor()
      assert(await page.locator('.result-count').innerText() === '14', 'piña must exclude spinach')
      if (iteration >= 2) {
        await page.locator('.filter-chip').first().click()
        await page.getByRole('button', { name: 'Siguiente' }).click()
        await page.locator('.meal-card__body').first().click()
        const detailURL = page.url()
        assert(detailURL.includes('?id='), 'detail must encode meal ID')
        await page.getByRole('button', { name: 'Volver', exact: true }).click()
        await page.waitForURL('**/#/explore')
        assert(await page.locator('input[type=search]').inputValue() === 'piña', 'return must preserve query')
        assert(await page.locator('.meal-card').count() === 2, 'return must preserve page 2')
        assert(await page.locator('.filter-chip').first().getAttribute('class').then(c => c.includes('is-selected')), 'return must preserve filters')
        await page.goForward()
        await page.waitForURL(detailURL)
        await page.reload()
        await page.getByRole('button', { name: 'Volver', exact: true }).click()
        await page.waitForURL('**/#/explore')
        assert(await page.locator('input[type=search]').inputValue() === 'piña', 'reload/back must restore query')
        assert(await page.locator('.meal-card').count() === 2, 'reload/back must restore page')
      }
      await page.locator('.meal-card').first().getByRole('button', { name: /^Cocinar / }).click()
      state.mode = '503'
      await page.getByRole('button', { name: 'Terminé', exact: true }).dblclick()
      await page.getByRole('button', { name: 'Reintentar confirmación', exact: true }).waitFor()
      assert(state.posts.length === 1, 'double tap must send one request')
      const eventId = state.posts[0].id
      state.mode = 'network'
      await page.getByRole('button', { name: 'Reintentar confirmación', exact: true }).click()
      await page.getByRole('button', { name: 'Reintentar confirmación', exact: true }).waitFor()
      assert(state.saved.size === 0, 'network failure before persistence must not create history')
      state.mode = 'lost-response'
      await page.getByRole('button', { name: 'Reintentar confirmación', exact: true }).click()
      await page.getByRole('button', { name: 'Reintentar confirmación', exact: true }).waitFor()
      state.mode = 'success'
      await page.getByRole('button', { name: 'Reintentar confirmación', exact: true }).click()
      await page.getByRole('button', { name: 'Preparado', exact: true }).waitFor()
      assert(await page.getByRole('button', { name: 'Preparado', exact: true }).isDisabled(), 'confirmed preparation must be disabled')
      assert(state.posts.every(event => event.id === eventId) && state.saved.size === 1, 'retry must reuse event ID')
      await page.goto('http://127.0.0.1:5180/#/history')
      await page.locator('.history-row').waitFor()
      assert(await page.locator('.history-row').count() === 1, 'confirmed preparation must appear once in history')
      if (iteration >= 2) {
        for (const route of ['today', 'favorites', 'week', 'history']) {
          await page.goto(`http://127.0.0.1:5180/#/${route}`)
          if (route === 'today') await page.getByRole('button', { name: 'Desayuno', exact: true }).click()
          const opener = route === 'history' ? page.locator('.history-row__main').first() : route === 'week' ? page.locator('.week-entry__title').first() : page.locator('.meal-card__body').first()
          await opener.click()
          await page.getByRole('button', { name: 'Volver', exact: true }).click()
          await page.waitForURL(`**/#/${route}`)
        }
        await page.goto(`http://127.0.0.1:5180/#/detail?id=${uuid(1)}`)
        await page.locator('.detail-header').waitFor()
        await page.reload()
        await page.locator('.detail-header').waitFor()
        await page.getByRole('button', { name: 'Volver', exact: true }).click()
        await page.waitForURL('**/#/today')
      }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'page must not overflow')
      if (iteration >= 3 && await page.getByRole('button', { name: 'Más secciones', exact: true }).isVisible()) {
        const more = page.getByRole('button', { name: 'Más secciones', exact: true })
        await more.click()
        await page.getByRole('dialog', { name: 'Más secciones' }).waitFor()
        await page.keyboard.press('Escape')
        assert(await more.evaluate(e => e === document.activeElement), 'More must restore focus')
        for (const name of ['Historial', 'Administrar']) {
          await more.click()
          await page.getByRole('dialog').getByRole('button', { name, exact: true }).click()
          await page.getByRole('heading', { name, exact: true, level: 1 }).waitFor()
          assert(await more.getAttribute('aria-current') === 'page', 'More must show secondary active route')
        }
      }
      if (iteration >= 4) {
        await page.goto('http://127.0.0.1:5180/#/week')
        await page.getByRole('button', { name: /^Cambiar / }).first().click()
        await page.locator('.change-options button').last().focus()
        await page.keyboard.press('Tab')
        assert(await page.evaluate(() => !!document.activeElement.closest('[role=dialog]')), 'Tab must stay in weekly dialog')
        await page.keyboard.press('Shift+Tab')
        assert(await page.evaluate(() => !!document.activeElement.closest('[role=dialog]')), 'Shift+Tab must stay in dialog')
        await page.keyboard.press('Escape')
        assert(await page.getByRole('button', { name: /^Cambiar / }).first().evaluate(e => e === document.activeElement), 'weekly dialog must restore focus')
        await page.goto('http://127.0.0.1:5180/#/explore')
        await page.locator('input[type=search]').waitFor()
        if (await page.getByRole('button', { name: 'Más secciones', exact: true }).isVisible()) await page.getByRole('button', { name: 'Más secciones', exact: true }).click()
        await page.getByRole('button', { name: 'Administrar', exact: true }).click()
        await page.getByRole('button', { name: 'Ingredientes', exact: true }).click()
        await page.locator('.admin-list__item').first().click()
        await page.getByLabel('Nombre', { exact: true }).fill('Piña editada')
        await page.locator('.admin-list__item').nth(1).click()
        await page.getByRole('dialog', { name: 'Cambios sin guardar' }).waitFor()
        await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
        assert(await page.getByLabel('Nombre', { exact: true }).inputValue() === 'Piña editada', 'cancel must keep ingredient draft')
        await page.evaluate(() => { window.confirm = () => false })
        await page.evaluate(() => window.history.back())
        await page.waitForFunction(() => window.location.hash === '#/admin')
        assert(await page.getByLabel('Nombre', { exact: true }).inputValue() === 'Piña editada', 'browser Back cancellation must preserve draft')
        await page.getByRole('button', { name: 'Hoy', exact: true }).click()
        assert(page.url().endsWith('/admin'), 'leaving edited admin must be guarded')
        await page.locator('.admin-list__item').nth(1).click()
        await page.getByRole('button', { name: 'Descartar cambios', exact: true }).click()
        await page.getByLabel('Nombre', { exact: true }).fill('Agua editada')
        await page.getByRole('button', { name: /Guardar (Ingredient|ingrediente)/i }).click()
        await page.getByRole('button', { name: 'Hoy', exact: true }).click()
        await page.waitForURL('**/#/today')
        if (await page.getByRole('button', { name: 'Más secciones', exact: true }).isVisible()) await page.getByRole('button', { name: 'Más secciones', exact: true }).click()
        await page.getByRole('button', { name: 'Administrar', exact: true }).click()
        await page.getByRole('button', { name: 'Ingredientes', exact: true }).click()
        await page.locator('.admin-list__item').first().click()
        await page.getByLabel('Nombre', { exact: true }).fill('Descartar al volver')
        await page.evaluate(() => { window.confirm = () => true; window.history.back() })
        await page.waitForURL('**/#/today')
      }
      if (iteration >= 5) {
        await page.goto('http://127.0.0.1:5180/#/explore')
        await page.locator('input[type=search]').fill('piña')
        const clear = await page.getByRole('button', { name: 'Limpiar búsqueda' }).boundingBox()
        assert(clear.width >= 44 && clear.height >= 44, 'clear search must have a 44px target')
        const filter = page.getByRole('button', { name: 'Favoritas', exact: true })
        await filter.click()
        assert(await filter.getAttribute('aria-pressed') === 'true', 'filter must announce selection')
        await page.locator('.meal-card__body').first().click()
        for (const button of await page.locator('.rating-buttons button').all()) {
          const box = await button.boundingBox()
          assert(box.width >= 44 && box.height >= 44, 'rating must have 44px target')
          assert(await button.getAttribute('aria-pressed') !== null, 'rating must announce selection')
        }
        await page.emulateMedia({ reducedMotion: 'reduce' })
        assert(await page.locator('.button--primary').first().evaluate(e => parseFloat(getComputedStyle(e).transitionDuration) < 0.01), 'reduced motion must disable transitions')
        await page.emulateMedia({ reducedMotion: 'no-preference' })
      }
      if (iteration >= 6) {
        await page.goto('http://127.0.0.1:5180/#/today')
        await page.getByRole('button', { name: 'Desayuno', exact: true }).click()
        await page.locator('input[type=search]').fill('pina')
        await page.getByRole('button', { name: 'Ver más en Explorar', exact: true }).waitFor()
        assert(await page.locator('.result-count').innerText() === '6 de 14 opciones', 'Today must explain truncated results')
        await page.getByRole('button', { name: 'Ver más en Explorar', exact: true }).click()
        await page.waitForURL('**/#/explore')
        assert(await page.locator('input[type=search]').inputValue() === 'pina', 'continuation must keep query')
        assert(await page.locator('.result-count').innerText() === '14', 'Explore must expose complete results')
        await page.goto('http://127.0.0.1:5180/#/pantry')
        await page.locator('input[type=search]').fill('PIÑA')
        assert(await page.locator('.pantry-row').count() === 1, 'pantry normalization must find pineapple')
        await page.goto('http://127.0.0.1:5180/#/week')
        await page.getByRole('button', { name: /^Cambiar / }).first().click()
        await page.getByRole('textbox', { name: 'Buscar alternativa' }).fill('PIÑA')
        assert(await page.locator('.change-option').count() === 14, 'weekly alternatives must use normalized ingredient search in slot')
        await page.keyboard.press('Escape')
      }
      if (iteration >= 7) {
        state.weeklyError = true
        await page.goto('http://127.0.0.1:5180/#/week')
        await page.reload()
        await page.getByRole('button', { name: 'Reintentar semana', exact: true }).waitFor()
        assert(await page.getByText('Aún no tienes una semana', { exact: true }).count() === 0, 'weekly error must not claim no plan')
        state.weeklyError = false
        await page.getByRole('button', { name: 'Reintentar semana', exact: true }).click()
        await page.locator('.week-grid').waitFor()
        assert(await page.locator('.week-scroll-hint').innerText().then(t => t.includes('Día visible')), 'weekly view must explain scroll context')
        await page.goto('http://127.0.0.1:5180/#/explore')
        await page.locator('input[type=search]').fill('piña')
        await page.locator('.meal-card__body').first().click()
        const favorite = page.locator('.detail-favorite')
        await favorite.click()
        await page.waitForFunction(() => document.querySelector('.detail-favorite')?.getAttribute('aria-pressed') === 'false')
        await favorite.click()
        await page.waitForFunction(() => document.querySelector('.detail-favorite')?.getAttribute('aria-pressed') === 'true')
        await page.getByRole('button', { name: 'Volver', exact: true }).click()
        await page.waitForURL('**/#/explore')
        await page.locator('.meal-card').first().getByRole('button', { name: /^Cocinar / }).click()
        assert(await page.locator('.kitchen-component h2').count() === 2, 'kitchen must preserve components')
        assert(await page.getByText('Sin cambiar cantidades.', { exact: true }).count() === 1, 'kitchen must preserve notes')
        await page.goto('http://127.0.0.1:5180/#/pantry')
        await page.getByRole('button', { name: /Marcar Piña de disponibles/ }).click()
        await page.getByRole('button', { name: /Quitar Piña de disponibles/ }).waitFor()
        await page.getByRole('button', { name: /Usar pronto: Piña/ }).click()
        await page.waitForFunction(() => document.querySelector('.soon-toggle')?.getAttribute('aria-pressed') === 'true')
        await page.goto('http://127.0.0.1:5180/#/week')
        await page.getByRole('button', { name: /^Bloquear / }).first().click()
        await page.getByRole('button', { name: /^Desbloquear / }).first().waitFor()
        await page.getByRole('button', { name: /^Desbloquear / }).first().click()
        await page.getByRole('button', { name: /^Bloquear / }).first().waitFor()
        state.bootstrapError = true
        await page.goto('http://127.0.0.1:5180/?diagnostics=1#/explore')
        await page.locator('.status-banner').waitFor()
        state.bootstrapError = false; state.version = 'synthetic-v2'
        const reads = state.bootstrapReads
        await page.evaluate(() => { window.dispatchEvent(new Event('online')); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('online')) })
        await page.getByText(/Fuente: api.*synthetic-v2/).waitFor()
        assert(state.bootstrapReads === reads + 1, 'recovery events must share one request')
        await page.goto('http://127.0.0.1:5180/#/admin')
        await page.getByRole('button', { name: 'Ingredientes', exact: true }).click()
        await page.locator('.admin-list__item').first().click()
        await page.getByLabel('Nombre', { exact: true }).fill('Borrador protegido')
        const before = state.bootstrapReads
        await page.evaluate(() => { window.dispatchEvent(new Event('online')); document.dispatchEvent(new Event('visibilitychange')) })
        assert(state.bootstrapReads === before, 'recovery must not run over pending edits')
        assert(await page.getByLabel('Nombre', { exact: true }).inputValue() === 'Borrador protegido', 'recovery must preserve draft')
        await page.locator('.admin-list__item').nth(1).click()
        await page.getByRole('button', { name: 'Descartar cambios', exact: true }).click()
        await page.getByRole('button', { name: 'Platillos', exact: true }).click()
        await page.locator('.admin-list__item').first().click()
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'open admin editor must not overflow')
        if (captureEvidence && size.width === 1024) await page.screenshot({ path: 'C:/Dev/dieta-app/docs/evidence/ux-ipad/admin-1024.png' })
      }
      if (captureEvidence) {
        await page.goto('http://127.0.0.1:5180/#/explore')
        await page.locator('input[type=search]').fill('piña')
        await page.screenshot({ path: `C:/Dev/dieta-app/docs/evidence/ux-ipad/search-${size.width}.png` })
        if (size.width === 768) {
          await page.locator('.meal-card').first().getByRole('button', { name: /^Cocinar / }).click()
          await page.screenshot({ path: 'C:/Dev/dieta-app/docs/evidence/ux-ipad/kitchen-768.png' })
          await page.goto('http://127.0.0.1:5180/#/week')
          await page.getByRole('button', { name: /^Cambiar / }).first().click()
          await page.screenshot({ path: 'C:/Dev/dieta-app/docs/evidence/ux-ipad/dialog-768.png' })
          await page.keyboard.press('Escape')
        }
      }
      reports.push({ size, iteration, checks: ['search boundaries', '503', 'double tap', 'network interruption', 'lost response', 'idempotent retry', 'history', ...(iteration >= 2 ? ['five navigation origins', 'back/forward', 'reload', 'direct link', 'query/filter/page restoration'] : []), ...(iteration >= 3 ? ['secondary navigation'] : []), ...(iteration >= 4 ? ['modal keyboard focus', 'draft guards', 'browser Back guard', 'confirmed admin save'] : []), ...(iteration >= 5 ? ['44px targets', 'selection semantics', 'reduced motion'] : []), ...(iteration >= 6 ? ['Today continuation', 'normalized contextual search'] : []), ...(iteration >= 7 ? ['weekly error/recovery', 'favorites', 'pantry', 'weekly lock', 'deduplicated recovery', 'protected drafts', 'cooking groups', 'open admin editor'] : [])] })
      await page.unrouteAll({ behavior: 'wait' })
    }
    assert(errors.length === 0, `JavaScript errors: ${errors.join('; ')}`)
    return reports
  } finally { page.off('pageerror', onError); await page.unrouteAll({ behavior: 'wait' }) }
}


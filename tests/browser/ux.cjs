/* global module, URL, sessionStorage, localStorage, document, innerWidth */
// Run with the available Playwright tool: require(this file)(page, iteration).
// Every API response is synthetic. No request can reach the production BFF.
module.exports = async (page, iteration = 1) => {
  const assert = (condition, message) => { if (!condition) throw new Error(message) }
  const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const sizes = [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1366, height: 900 }]
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
      const state = { mode: 'success', posts: [], saved: new Map(), pantry: [], weekly: { id: uuid(500), startDate: '2026-11-02', name: 'Semana de prueba', entries: [{ id: uuid(501), plannedDate: '2026-11-02', slot: 'breakfast', mealOptionId: uuid(1), locked: false }] } }
      const payload = () => ({ version: 'synthetic-v1', meals, ingredients, pantry: state.pantry, history: [...state.saved.values()].map(r => ({ id: r.id, mealOptionId: r.meal_option_id, eatenAt: r.eaten_at, rating: r.rating, note: null })) })
      await page.route('**/api/**', async route => {
        const request = route.request(), path = new URL(request.url()).pathname
        const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
        if (path === '/api/bootstrap') return reply(payload())
        if (path === '/api/weekly') return reply(state.weekly)
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
      await page.goto('http://127.0.0.1:5174/#/explore')
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
      await page.locator('.meal-card').first().getByRole('button', { name: 'Cocinar', exact: true }).click()
      state.mode = '503'
      await page.getByRole('button', { name: 'Terminé', exact: true }).dblclick()
      await page.getByRole('button', { name: 'Reintentar confirmación', exact: true }).waitFor()
      assert(state.posts.length === 1, 'double tap must send one request')
      const eventId = state.posts[0].id
      state.mode = 'lost-response'
      await page.getByRole('button', { name: 'Reintentar confirmación', exact: true }).click()
      await page.getByRole('button', { name: 'Reintentar confirmación', exact: true }).waitFor()
      state.mode = 'success'
      await page.getByRole('button', { name: 'Reintentar confirmación', exact: true }).click()
      await page.getByRole('button', { name: 'Preparado', exact: true }).waitFor()
      assert(await page.getByRole('button', { name: 'Preparado', exact: true }).isDisabled(), 'confirmed preparation must be disabled')
      assert(state.posts.every(event => event.id === eventId) && state.saved.size === 1, 'retry must reuse event ID')
      await page.goto('http://127.0.0.1:5174/#/history')
      await page.locator('.history-row').waitFor()
      assert(await page.locator('.history-row').count() === 1, 'confirmed preparation must appear once in history')
      if (iteration >= 2) {
        for (const route of ['today', 'favorites', 'week', 'history']) {
          await page.goto(`http://127.0.0.1:5174/#/${route}`)
          if (route === 'today') await page.getByRole('tab', { name: 'Desayuno', exact: true }).click()
          const opener = route === 'history' ? page.locator('.history-row__main').first() : route === 'week' ? page.locator('.week-entry__title').first() : page.locator('.meal-card__body').first()
          await opener.click()
          await page.getByRole('button', { name: 'Volver', exact: true }).click()
          await page.waitForURL(`**/#/${route}`)
        }
        await page.goto(`http://127.0.0.1:5174/#/detail?id=${uuid(1)}`)
        await page.locator('.detail-header').waitFor()
        await page.reload()
        await page.locator('.detail-header').waitFor()
        await page.getByRole('button', { name: 'Volver', exact: true }).click()
        await page.waitForURL('**/#/today')
      }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'page must not overflow')
      if (iteration >= 3 && size.width < 1100) {
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
      reports.push({ size, iteration, checks: 'search, 503, double tap, lost response, idempotent retry, history, overflow' })
      await page.unrouteAll({ behavior: 'wait' })
    }
    assert(errors.length === 0, `JavaScript errors: ${errors.join('; ')}`)
    return reports
  } finally { page.off('pageerror', onError); await page.unrouteAll({ behavior: 'wait' }) }
}


import { readFileSync } from 'node:fs'
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { join } from 'node:path'
import { createServer as createViteServer, type ViteDevServer } from 'vite'

type Handler = (request: Request) => Response | Promise<Response>
type ApiHandlers = Record<'bootstrap' | 'health' | 'history' | 'historyById' | 'ingredients' | 'meals' | 'mealsById' | 'pantryById' | 'preferencesById' | 'weekly' | 'weeklyEntryById', Handler>

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/sb_(?:secret|publishable)_[^\s"']+/gi, '[redacted]')
}

function loadLocalEnv() {
  try {
    const content = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
      if (!match || process.env[match[1]]) continue
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
    }
  } catch { /* local environment is optional; API reports missing config */ }
}

function route(pathname: string): Handler | null {
  if (pathname === '/api/bootstrap') return apiHandlers.bootstrap
  if (pathname === '/api/health') return apiHandlers.health
  if (pathname === '/api/history') return apiHandlers.history
  if (pathname.startsWith('/api/history/')) return apiHandlers.historyById
  if (pathname === '/api/ingredients') return apiHandlers.ingredients
  if (pathname === '/api/meals') return apiHandlers.meals
  if (pathname.startsWith('/api/meals/')) return apiHandlers.mealsById
  if (pathname.startsWith('/api/pantry/')) return apiHandlers.pantryById
  if (pathname.startsWith('/api/preferences/')) return apiHandlers.preferencesById
  if (pathname === '/api/weekly') return apiHandlers.weekly
  if (pathname.startsWith('/api/weekly/entries/')) return apiHandlers.weeklyEntryById
  return null
}

async function requestBody(request: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return Buffer.concat(chunks)
}

async function handleApi(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? '/', 'http://localhost:5173')
  const handler = route(url.pathname)
  if (!handler) return false
  const headers = new Headers()
  for (const [key, value] of Object.entries(request.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await requestBody(request)
  const apiRequest = new Request(url, { method: request.method, headers, body: body?.length ? body : undefined })
  const apiResponse = await handler(apiRequest)
  response.statusCode = apiResponse.status
  apiResponse.headers.forEach((value, key) => response.setHeader(key, value))
  response.end(Buffer.from(await apiResponse.arrayBuffer()))
  return true
}

loadLocalEnv()
process.env.VERCEL_ENV ??= 'development'
process.env.VERCEL ??= '1'

const [bootstrapModule, healthModule, historyModule, historyByIdModule, ingredientsModule, mealsModule, mealsByIdModule, pantryByIdModule, preferencesByIdModule, weeklyModule, weeklyEntryByIdModule] = await Promise.all([
  import('../api/bootstrap'),
  import('../api/health'),
  import('../api/history'),
  import('../api/history/[id]'),
  import('../api/ingredients'),
  import('../api/meals'),
  import('../api/meals/[id]'),
  import('../api/pantry/[id]'),
  import('../api/preferences/[id]'),
  import('../api/weekly'),
  import('../api/weekly/entries/[id]'),
])
const apiHandlers: ApiHandlers = {
  bootstrap: bootstrapModule.default,
  health: healthModule.default,
  history: historyModule.default,
  historyById: historyByIdModule.default,
  ingredients: ingredientsModule.default,
  meals: mealsModule.default,
  mealsById: mealsByIdModule.default,
  pantryById: pantryByIdModule.default,
  preferencesById: preferencesByIdModule.default,
  weekly: weeklyModule.default,
  weeklyEntryById: weeklyEntryByIdModule.default,
}

const appPort = Number(process.env.PORT ?? 5173)
const vite: ViteDevServer = await createViteServer({ server: { middlewareMode: true, hmr: { port: appPort + 1 } }, appType: 'spa' })
const server = createHttpServer(async (request, response) => {
  if (request.url?.startsWith('/api/')) {
    try {
      if (await handleApi(request, response)) return
    } catch (error) {
      console.error(`Local API error: ${safeErrorMessage(error)}`)
      response.statusCode = 500
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.end(JSON.stringify({ error: 'LOCAL_API_ERROR' }))
      return
    }
  }
  vite.middlewares(request, response, () => { response.statusCode = 404; response.end('Not found') })
})

server.listen(appPort, '127.0.0.1', () => {
  console.log(`Local app: http://localhost:${appPort}`)
  console.log('Local API: same process, /api/* handlers enabled')
})

async function shutdown() {
  await vite.close()
  server.close()
}
process.once('SIGINT', () => { void shutdown() })
process.once('SIGTERM', () => { void shutdown() })
process.on('unhandledRejection', (reason) => { console.error(`Local unhandled rejection: ${safeErrorMessage(reason)}`); process.exitCode = 1 })
process.on('uncaughtException', (error) => { console.error(`Local uncaught exception: ${safeErrorMessage(error)}`); process.exitCode = 1 })

const baseUrl = process.env.LOCAL_APP_URL ?? 'http://localhost:5173'
const validButUnusedId = '00000000-0000-4000-8000-000000000000'
export {}

async function check(path: string, expected: number | number[], init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, init)
  const expectedStatuses = Array.isArray(expected) ? expected : [expected]
  if (!expectedStatuses.includes(response.status)) throw new Error(`${path}: expected ${expectedStatuses.join(' or ')}, got ${response.status}`)
  console.log(`${init?.method ?? 'GET'} ${path} -> ${response.status}`)
}

await check('/api/bootstrap', 200)
await check('/api/health', 200)
await check('/api/weekly', 200)
await check(`/api/preferences/${validButUnusedId}`, 400, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ unsupported: true }) })
await check(`/api/pantry/${validButUnusedId}`, 400, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ unsupported: true }) })
await check('/api/history', 400, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
await check('/api/weekly', 400, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
console.log('Local API smoke test passed without mutating Supabase data.')

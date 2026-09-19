import type { ApiRequest, ApiResponse } from '../../api/_lib/http.js'

export function mockRequest(options: { method?: string; url?: string; headers?: Record<string, string>; body?: unknown } = {}) {
  return {
    method: options.method ?? 'GET',
    url: options.url ?? '/api/test',
    headers: options.headers ?? {},
    body: options.body,
  } as unknown as ApiRequest
}

export function mockResponse() {
  const headers = new Map<string, string | number>()
  let body = ''
  const response = {
    statusCode: 200,
    writableEnded: false,
    setHeader(name: string, value: string | number) { headers.set(name.toLowerCase(), value) },
    getHeader(name: string) { return headers.get(name.toLowerCase()) },
    end(value?: string | Buffer) {
      body = value === undefined ? '' : Buffer.from(value).toString('utf8')
      response.writableEnded = true
    },
  }
  return { response: response as unknown as ApiResponse, headers, get body() { return body } }
}

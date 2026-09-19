import type { IncomingMessage, ServerResponse } from 'node:http'

export type ApiRequest = IncomingMessage & {
  body?: unknown
  query?: Record<string, string | string[] | undefined>
}

export type ApiResponse = ServerResponse

export class InvalidJsonError extends Error {
  readonly status = 400
  readonly code = 'INVALID_JSON'

  constructor() {
    super('El cuerpo de la solicitud no es JSON valido.')
  }
}

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export function getHeader(request: ApiRequest, name: string) {
  return headerValue(request.headers[name.toLowerCase()])
}

export function pathSegment(request: ApiRequest) {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
  return pathname.split('/').filter(Boolean).pop() ?? ''
}

function parseBody(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined
  if (Buffer.isBuffer(value)) value = value.toString('utf8')
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value) as unknown
  } catch {
    throw new InvalidJsonError()
  }
}

export async function readJsonBody(request: ApiRequest) {
  if (request.body !== undefined) return parseBody(request.body)
  if (typeof request.on !== 'function' || request.readableEnded) return undefined
  const chunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    request.on('data', (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    request.on('end', resolve)
    request.on('error', reject)
  })
  return parseBody(Buffer.concat(chunks))
}

export function json(response: ApiResponse, data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  for (const [name, value] of Object.entries(extraHeaders)) response.setHeader(name, value)
  response.end(JSON.stringify(data))
}

export function empty(response: ApiResponse, status: number, extraHeaders: Record<string, string> = {}) {
  response.statusCode = status
  for (const [name, value] of Object.entries(extraHeaders)) response.setHeader(name, value)
  response.end()
}

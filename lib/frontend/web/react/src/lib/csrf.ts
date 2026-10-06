import { readCsrfToken } from './api-client'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function withCsrfHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const method = headers['X-HTTP-Method-Override'] ? 'POST' : 'GET'
  if (SAFE_METHODS.has(method)) {
    return headers
  }

  const token = readCsrfToken()
  return token ? { ...headers, 'X-CSRF-Token': token } : headers
}

export function isCsrfRequired(method: string): boolean {
  return !SAFE_METHODS.has(method.toUpperCase())
}
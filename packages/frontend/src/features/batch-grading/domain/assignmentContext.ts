const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidAssignmentId(value: string | null | undefined): boolean {
  if (typeof value !== 'string') {
    return false
  }

  return UUID_PATTERN.test(value.trim())
}

export function normalizeAssignmentId(value: string | null | undefined): string {
  if (typeof value !== 'string') {
    return ''
  }

  const normalized = value.trim()
  return UUID_PATTERN.test(normalized) ? normalized : ''
}
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const requestInterceptors: Array<(config: { method?: string; url?: string; headers: Record<string, string> }) => Promise<{ method?: string; url?: string; headers: Record<string, string> }> | { method?: string; url?: string; headers: Record<string, string> }> = []
const mockGet = vi.fn()
const mockCreate = vi.fn(() => ({
  get: mockGet,
  interceptors: {
    request: {
      use: vi.fn((handler) => {
        requestInterceptors.push(handler)
        return requestInterceptors.length - 1
      }),
    },
    response: {
      use: vi.fn(),
    },
  },
}))

function setCookie(value: string) {
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    writable: true,
    value,
  })
}

describe('api csrf interceptor', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    requestInterceptors.length = 0
    setCookie('')
  })

  afterEach(() => {
    vi.doUnmock('axios')
    setCookie('')
  })

  it('prefetches a csrf token before the first mutating request when the cookie is missing', async () => {
    vi.doMock('axios', () => ({
      default: {
        create: mockCreate,
      },
    }))

    await import('./api')

    mockGet.mockImplementationOnce(async () => {
      setCookie('XSRF-TOKEN=fresh-token')
      return { data: null }
    })

    const config = await requestInterceptors[0]({
      method: 'post',
      url: '/auth/register',
      headers: {},
    })

    expect(mockGet).toHaveBeenCalledWith('/csrf/token')
    expect(config.headers['X-XSRF-TOKEN']).toBe('fresh-token')
  })

  it('does not prefetch a csrf token when one is already present', async () => {
    vi.doMock('axios', () => ({
      default: {
        create: mockCreate,
      },
    }))

    await import('./api')
    setCookie('XSRF-TOKEN=existing-token')

    const config = await requestInterceptors[0]({
      method: 'post',
      url: '/auth/login',
      headers: {},
    })

    expect(mockGet).not.toHaveBeenCalled()
    expect(config.headers['X-XSRF-TOKEN']).toBe('existing-token')
  })
})
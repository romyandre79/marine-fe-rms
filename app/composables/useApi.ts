import { type UseFetchOptions } from '#app'

import { defu } from 'defu'

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
  code?: string
}

export const useApi = <T = any>(
  path: string | (() => string),
  options: UseFetchOptions<ApiResponse<T>> = {}
) => {
  const token = useCookie('access_token')
  const tenantId = useCookie('tenant_id') // in case we want to send it explicitly, or just rely on backend resolving it from JWT
  const config = useRuntimeConfig()
  
  // Set default API URL or fallback to localhost:8080
  let apiBase = (config.public.apiUrl as string) || 'http://localhost:8080/api/v1'
  if (apiBase.endsWith('/api/v1')) {
    apiBase = apiBase.slice(0, -7)
  }

  const defaults: UseFetchOptions<ApiResponse<T>> = {
    baseURL: apiBase,
    headers: {
      Accept: 'application/json',
      ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
      ...(tenantId.value ? { 'X-Tenant-ID': tenantId.value } : {})
    },
    async onResponseError({ response }) {
      if (response.status === 401) {
        // Handle token refresh or redirect to login
        const authStore = useAuth()
        const refreshed = await authStore.handleTokenRefresh()
        if (!refreshed) {
          authStore.logout()
        }
      }
    }
  }

  return useFetch(path, defu(options, defaults) as any)
}

// Low-level fetch wrapper for imperative calls (like submit handlers)
export const useApiFetch = async <T = any>(
  path: string,
  options: any = {}
): Promise<ApiResponse<T>> => {
  const token = useCookie('access_token')
  const tenantId = useCookie('tenant_id')
  const config = useRuntimeConfig()
  let apiBase = (config.public.apiUrl as string) || 'http://localhost:8080/api/v1'
  if (apiBase.endsWith('/api/v1')) {
    apiBase = apiBase.slice(0, -7)
  }

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
    ...(tenantId.value ? { 'X-Tenant-ID': tenantId.value } : {}),
    ...options.headers
  }

  try {
    const response = await $fetch<ApiResponse<T>>(`${apiBase}${path}`, {
      ...options,
      headers
    })
    return response
  } catch (error: any) {
    if (error.response?.status === 401) {
      const authStore = useAuth()
      const refreshed = await authStore.handleTokenRefresh()
      if (refreshed) {
        // Retry request
        headers.Authorization = `Bearer ${useCookie('access_token').value}`
        return await $fetch<ApiResponse<T>>(`${apiBase}${path}`, {
          ...options,
          headers
        })
      } else {
        authStore.logout()
      }
    }
    throw error
  }
}

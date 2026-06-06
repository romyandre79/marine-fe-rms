import { defineStore } from 'pinia'

export interface User {
  id: string
  name: string
  email: string
  role: string
  company_id: string
  avatar?: string
  is_active: boolean
  email_verified: boolean
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = useCookie<string | null>('access_token')
  const refreshToken = useCookie<string | null>('refresh_token')
  const tenantId = useCookie<string | null>('tenant_id')

  const isAuthenticated = computed(() => !!accessToken.value)
  const userRole = computed(() => user.value?.role || 'viewer')

  // Load user from cookie/state on initialization
  const loadUser = () => {
    const userCookie = useCookie<User | null>('user_data')
    if (userCookie.value) {
      user.value = userCookie.value
    }
  }

  const login = async (credentials: any) => {
    try {
      const response = await useApiFetch<any>('/api/v1/auth/login', {
        method: 'POST',
        body: credentials
      })

      if (response.success && response.data) {
        const { access_token, refresh_token, user: userData } = response.data
        accessToken.value = access_token
        refreshToken.value = refresh_token
        
        // Find default company and role from user companies
        const defaultCompany = userData.companies && userData.companies.length > 0 ? userData.companies[0] : null
        const defaultCompanyId = defaultCompany ? defaultCompany.company_id : ''
        const defaultRole = defaultCompany ? defaultCompany.role : 'viewer'

        tenantId.value = defaultCompanyId
        user.value = {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: defaultRole,
          company_id: defaultCompanyId,
          avatar: userData.avatar,
          is_active: userData.is_active,
          email_verified: userData.email_verified
        }
        
        // Save to cookie so it persists across page reloads
        const userCookie = useCookie('user_data')
        userCookie.value = user.value as any

        return true
      }
      return false
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const handleTokenRefresh = async (): Promise<boolean> => {
    if (!refreshToken.value) return false
    try {
      const response = await $fetch<any>('http://localhost:8080/api/v1/auth/refresh', {
        method: 'POST',
        body: { refresh_token: refreshToken.value }
      })

      if (response.success && response.data) {
        accessToken.value = response.data.access_token
        if (response.data.refresh_token) {
          refreshToken.value = response.data.refresh_token
        }
        return true
      }
      return false
    } catch (e) {
      console.error('Refresh token failed:', e)
      return false
    }
  }

  const logout = async () => {
    if (accessToken.value) {
      try {
        await useApiFetch('/api/v1/auth/logout', { method: 'POST' })
      } catch (e) {
        console.error('Logout request failed', e)
      }
    }
    
    // Clear cookies
    accessToken.value = null
    refreshToken.value = null
    tenantId.value = null
    user.value = null
    
    const userCookie = useCookie('user_data')
    userCookie.value = null

    // Redirect to login page
    navigateTo('/login')
  }

  return {
    user,
    isAuthenticated,
    userRole,
    loadUser,
    login,
    logout,
    handleTokenRefresh
  }
})

import { defineStore } from 'pinia'

export interface Company {
  id: string
  name: string
  slug: string
  email: string
  phone?: string
  address?: string
}

export const useTenantStore = defineStore('tenant', () => {
  const companies = ref<Company[]>([])
  const activeTenantId = useCookie<string | null>('tenant_id')
  const currentTenant = computed(() => 
    companies.value.find(c => c.id === activeTenantId.value) || null
  )

  const fetchCompanies = async () => {
    try {
      const response = await useApiFetch<Company[]>('/api/v1/companies')
      if (response.success && response.data) {
        companies.value = response.data
        // If activeTenantId is not set, set it to the first company in the list
        if (!activeTenantId.value && companies.value.length > 0) {
          activeTenantId.value = companies.value[0].id
        }
      }
    } catch (e) {
      console.error('Failed to fetch companies', e)
    }
  }

  const selectTenant = (id: string) => {
    activeTenantId.value = id
    // Force a reload of context by reloading the page or trigger state updates
    window.location.reload()
  }

  return {
    companies,
    activeTenantId,
    currentTenant,
    fetchCompanies,
    selectTenant
  }
})

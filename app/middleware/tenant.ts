export default defineNuxtRouteMiddleware(async (to, from) => {
  const tenant = useTenant()
  const auth = useAuth()

  // Only run tenant resolver if user is authenticated
  if (auth.isAuthenticated) {
    if (tenant.companies.length === 0) {
      await tenant.fetchCompanies()
    }
    if (!tenant.activeTenantId && tenant.companies.length > 0) {
      tenant.activeTenantId = tenant.companies[0].id
    }
  }
})

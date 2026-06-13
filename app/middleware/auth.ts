export default defineNuxtRouteMiddleware((to, from) => {
  const auth = useAuth()
  
  // Initialize user if not already done
  auth.loadUser()

  if (!auth.isAuthenticated) {
    if (import.meta.client) {
      const currentUrl = window.location.href
      window.location.href = `http://localhost:3003/login?redirect_back=${encodeURIComponent(currentUrl)}`
    }
  }
})

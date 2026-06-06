export default defineNuxtRouteMiddleware((to, from) => {
  const auth = useAuth()
  
  // Initialize user if not already done
  auth.loadUser()

  if (!auth.isAuthenticated) {
    return navigateTo('/login')
  }
})

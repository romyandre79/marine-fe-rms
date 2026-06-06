<script setup lang="ts">
definePageMeta({
  middleware: [
    function (to, from) {
      const auth = useAuth()
      auth.loadUser()
      if (auth.isAuthenticated) {
        return navigateTo('/dashboard')
      } else {
        return navigateTo('/login')
      }
    }
  ]
})
</script>

<template>
  <div class="flex items-center justify-center min-h-[400px]">
    <div class="animate-pulse text-sm text-slate-400">Loading context...</div>
  </div>
</template>

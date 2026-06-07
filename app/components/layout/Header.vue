<script setup lang="ts">
const tenant = useTenant()
const auth = useAuth()
const { toggleMobile, mobileOpen } = useSidebar()

onMounted(async () => {
  // Load companies if user is logged in
  if (auth.isAuthenticated) {
    await tenant.fetchCompanies()
  }
})

// Quick toggle dark mode
const isDark = ref(false)
const toggleDarkMode = () => {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}
</script>

<template>
  <header class="h-[72px] bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/80 px-8 flex items-center justify-between shrink-0">
    <!-- Mobile hamburger -->
    <button
      class="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors mr-2"
      @click="toggleMobile"
      :aria-label="mobileOpen ? 'Close menu' : 'Open menu'"
    >
      <Icon :name="mobileOpen ? 'heroicons:x-mark' : 'heroicons:bars-3'" class="w-5 h-5" />
    </button>

    <!-- Breadcrumbs / Page Title -->
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <!-- Tenant selector -->
        <div v-if="tenant.companies.length > 1" class="relative">
          <select
            :value="tenant.activeTenantId"
            @change="tenant.selectTenant(($event.target as HTMLSelectElement).value)"
            class="h-10 pl-3 pr-8 text-sm font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none cursor-pointer appearance-none"
          >
            <option v-for="c in tenant.companies" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
          <Icon name="heroicons:chevron-down" class="w-4 h-4 absolute right-2.5 top-3.5 pointer-events-none text-slate-400" />
        </div>
        <div v-else class="text-sm font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg">
          {{ tenant.currentTenant?.name || 'Loading Tenant...' }}
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-4">
      <!-- Theme toggle -->
      <button
        @click="toggleDarkMode"
        class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
      >
        <Icon :name="isDark ? 'heroicons:sun' : 'heroicons:moon'" class="w-5 h-5" />
      </button>

      <!-- User avatar -->
      <div class="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-700">
        <div class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
          {{ auth.user?.name.charAt(0) }}
        </div>
        <div class="hidden md:block">
          <p class="text-xs font-bold text-slate-800 dark:text-slate-200">{{ auth.user?.name }}</p>
          <p class="text-[10px] font-medium text-slate-400 capitalize">{{ auth.user?.role }}</p>
        </div>
      </div>
    </div>
  </header>
</template>

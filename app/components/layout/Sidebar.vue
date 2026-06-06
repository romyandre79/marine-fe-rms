<script setup lang="ts">
const route = useRoute()
const auth = useAuth()

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: 'heroicons:squares-2x2' },
  { label: 'Companies', path: '/companies', icon: 'heroicons:building-office', roles: ['super_admin'] },
  { label: 'Ships', path: '/ships', icon: 'heroicons:command-line' },
  { label: 'Monitoring', path: '/monitoring', icon: 'heroicons:computer-desktop' },
  { label: 'Devices', path: '/devices', icon: 'heroicons:cpu-chip' },
  { label: 'Device Types', path: '/device-types', icon: 'heroicons:adjustments-horizontal' },
  { label: 'Alerts', path: '/alerts', icon: 'heroicons:bell' },
  { label: 'Users', path: '/users', icon: 'heroicons:users', roles: ['company_admin', 'super_admin'] }
]

const filteredNavItems = computed(() => {
  return navItems.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(auth.userRole)
  })
})
</script>

<template>
  <aside class="w-72 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 shrink-0">
    <!-- Branding -->
    <div class="h-[72px] flex items-center gap-3 px-6 border-b border-slate-800">
      <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white shadow-md shadow-primary/30">
        M
      </div>
      <div>
        <h1 class="text-sm font-bold tracking-wide text-white uppercase">RMS Portal</h1>
        <span class="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Enterprise Monitor</span>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-4 py-6 flex flex-col gap-1.5 overflow-y-auto">
      <NuxtLink
        v-for="item in filteredNavItems"
        :key="item.path"
        :to="item.path"
        class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group"
        :class="[
          route.path.startsWith(item.path)
            ? 'bg-primary text-white shadow-md shadow-primary/20'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
        ]"
      >
        <Icon :name="item.icon" class="w-5 h-5 shrink-0" />
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <!-- Footer user summary -->
    <div class="p-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center gap-3">
      <div class="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300 ring-2 ring-slate-800">
        {{ auth.user?.name.charAt(0) }}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-bold text-slate-200 truncate">{{ auth.user?.name }}</p>
        <p class="text-[10px] font-medium text-slate-500 capitalize">{{ auth.user?.role }}</p>
      </div>
      <button
        @click="auth.logout()"
        class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        title="Logout"
      >
        <Icon name="heroicons:arrow-right-on-rectangle" class="w-5 h-5" />
      </button>
    </div>
  </aside>
</template>

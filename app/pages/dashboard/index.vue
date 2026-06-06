<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'tenant']
})

useHead({
  title: 'Dashboard'
})

const { data: dashboardRes, pending, refresh } = await useApi<any>('/api/v1/dashboard')

const stats = computed(() => dashboardRes.value?.data || {
  devices: { total: 0, online: 0, offline: 0, warning: 0, error: 0 },
  alerts: { total: 0, critical: 0, warning: 0, info: 0 },
  metrics: { avg_cpu: 0, avg_ram: 0 }
})

// WebSocket real-time updates integration
const ws = useWebSocket()

onMounted(() => {
  // Listen for real-time monitoring events
  const unsubMonitoring = ws.on('monitoring', (payload: any) => {
    // Incrementally update average CPU/RAM if possible, or trigger background refresh
    refresh()
  })

  // Listen for real-time alerts
  const unsubAlerts = ws.on('alert', (payload: any) => {
    refresh()
  })

  onUnmounted(() => {
    unsubMonitoring()
    unsubAlerts()
  })
})
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- Header Summary -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Dashboard Overview</h2>
        <p class="text-xs text-slate-500 font-medium">Real-time infrastructure performance and active incidents.</p>
      </div>
      <div class="flex items-center gap-3">
        <UiButton variant="secondary" size="sm" @click="refresh" :loading="pending">
          <Icon name="heroicons:arrow-path" class="w-4 h-4 mr-1.5" />
          Refresh
        </UiButton>
        <span
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide uppercase"
          :class="ws.isConnected.value ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'"
        >
          <span class="w-1.5 h-1.5 rounded-full animate-ping" :class="ws.isConnected.value ? 'bg-emerald-500' : 'bg-rose-500'" />
          {{ ws.isConnected.value ? 'Live Connected' : 'Disconnected' }}
        </span>
      </div>
    </div>

    <!-- KPI Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <UiCard class="relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-1">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Devices</span>
            <span class="text-3xl font-bold text-slate-800 dark:text-white">{{ stats.devices.total }}</span>
          </div>
          <div class="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
            <Icon name="heroicons:cpu-chip" class="w-6 h-6" />
          </div>
        </div>
        <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-sky-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
      </UiCard>

      <UiCard class="relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-1">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Online Devices</span>
            <span class="text-3xl font-bold text-slate-800 dark:text-white">{{ stats.devices.online }}</span>
          </div>
          <div class="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Icon name="heroicons:check-circle" class="w-6 h-6" />
          </div>
        </div>
        <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
      </UiCard>

      <UiCard class="relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-1">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Alerts</span>
            <span class="text-3xl font-bold text-slate-800 dark:text-white">{{ stats.alerts.total }}</span>
          </div>
          <div class="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Icon name="heroicons:exclamation-triangle" class="w-6 h-6" />
          </div>
        </div>
        <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
      </UiCard>

      <UiCard class="relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-1">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Critical Failures</span>
            <span class="text-3xl font-bold text-slate-800 dark:text-white">{{ stats.devices.error || stats.alerts.critical || 0 }}</span>
          </div>
          <div class="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <Icon name="heroicons:fire" class="w-6 h-6" />
          </div>
        </div>
        <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
      </UiCard>
    </div>

    <!-- Metrics Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UiCard>
        <template #header>
          <div class="flex items-center gap-2">
            <Icon name="heroicons:bolt" class="w-5 h-5 text-primary" />
            <h3 class="font-bold text-sm text-slate-800 dark:text-white">CPU Utilisation Average</h3>
          </div>
        </template>
        <div class="py-6 flex flex-col items-center gap-4">
          <div class="relative w-36 h-36 flex items-center justify-center rounded-full border-8 border-slate-100 dark:border-slate-800">
            <div class="text-center">
              <span class="text-3xl font-extrabold text-slate-800 dark:text-white">{{ stats.metrics.avg_cpu?.toFixed(1) || 0 }}%</span>
              <p class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Load Average</p>
            </div>
            <!-- Interactive gauge glow based on level -->
            <div class="absolute inset-0 rounded-full border-8 border-primary opacity-20 pointer-events-none" />
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2">
            <div class="bg-primary h-2 rounded-full transition-all duration-500" :style="{ width: `${stats.metrics.avg_cpu || 0}%` }" />
          </div>
        </div>
      </UiCard>

      <UiCard>
        <template #header>
          <div class="flex items-center gap-2">
            <Icon name="heroicons:chart-bar" class="w-5 h-5 text-purple-500" />
            <h3 class="font-bold text-sm text-slate-800 dark:text-white">RAM Utilisation Average</h3>
          </div>
        </template>
        <div class="py-6 flex flex-col items-center gap-4">
          <div class="relative w-36 h-36 flex items-center justify-center rounded-full border-8 border-slate-100 dark:border-slate-800">
            <div class="text-center">
              <span class="text-3xl font-extrabold text-slate-800 dark:text-white">{{ stats.metrics.avg_ram?.toFixed(1) || 0 }}%</span>
              <p class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Memory Pool</p>
            </div>
            <div class="absolute inset-0 rounded-full border-8 border-purple-500 opacity-20 pointer-events-none" />
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2">
            <div class="bg-purple-500 h-2 rounded-full transition-all duration-500" :style="{ width: `${stats.metrics.avg_ram || 0}%` }" />
          </div>
        </div>
      </UiCard>
    </div>
  </div>
</template>

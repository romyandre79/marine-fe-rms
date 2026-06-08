<script setup lang="ts">
import type { VesselPosition } from '~/components/map/VesselMap.vue'

definePageMeta({
  middleware: ['auth', 'tenant']
})

useHead({
  title: 'Dashboard'
})

const timeframe = ref('1d')
const showCustomRange = ref(false)
const startTime = ref('')
const endTime = ref('')

const { data: dashboardRes, pending, refresh } = await useApi<any>(() => {
  let url = `/api/v1/dashboard?timeframe=${timeframe.value}`
  if (timeframe.value === 'custom') {
    if (startTime.value) url += `&start_time=${new Date(startTime.value).toISOString()}`
    if (endTime.value) url += `&end_time=${new Date(endTime.value).toISOString()}`
  }
  return url
})

// server: false → skip SSR, always fetch fresh on client to avoid stale cache
const {
  data: vesselRes,
  error: vesselError,
  pending: vesselPending,
  refresh: refreshPositions
} = useApi<VesselPosition[]>('/api/v1/dashboard/vessel-positions', { server: false })

const stats = computed(() => dashboardRes.value?.data || {
  devices: { total: 0, online: 0, offline: 0, warning: 0, error: 0 },
  alerts: { total: 0, critical: 0, warning: 0, info: 0 },
  metrics: { avg_rpm: 0, avg_flow_rate: 0, avg_power: 0 }
})

const vesselPositions = computed<VesselPosition[]>(() => vesselRes.value?.data ?? [])

const selectedVesselId = ref<string | null>(null)

// Reset selection if the selected vessel is no longer in the list
watch(vesselPositions, (list) => {
  if (selectedVesselId.value && !list.find(p => p.ship_id === selectedVesselId.value)) {
    selectedVesselId.value = null
  }
})

// WebSocket real-time updates integration
const ws = useWebSocket()

onMounted(() => {
  const unsubMonitoring = ws.on('monitoring', (_payload: any) => {
    refresh()
    refreshPositions()
  })

  const unsubAlerts = ws.on('alert', (_payload: any) => {
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
        <p class="text-xs text-slate-500 font-medium">Real-time marine telemetries, vessel performance and active incidents.</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Timeframe Select -->
        <select
          v-model="timeframe"
          @change="refresh"
          class="h-9 pl-3 pr-8 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none cursor-pointer text-slate-700 dark:text-slate-300"
        >
          <option value="1h">Last 1 Hour</option>
          <option value="1d">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="custom">Custom Range</option>
        </select>

        <!-- Custom Range Date Pickers -->
        <div v-if="timeframe === 'custom'" class="flex items-center gap-1.5">
          <input
            v-model="startTime"
            type="datetime-local"
            @change="refresh"
            class="h-9 px-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 outline-none"
          />
          <span class="text-xs text-slate-400">–</span>
          <input
            v-model="endTime"
            type="datetime-local"
            @change="refresh"
            class="h-9 px-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 outline-none"
          />
        </div>

        <UiButton variant="secondary" size="sm" @click="refresh" :loading="pending">
          <Icon name="heroicons:arrow-path" class="w-4 h-4 mr-1.5" />
          Refresh
        </UiButton>
        <span
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide uppercase whitespace-nowrap"
          :class="ws.isConnected.value ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'"
        >
          <span class="w-1.5 h-1.5 rounded-full animate-ping" :class="ws.isConnected.value ? 'bg-emerald-500' : 'bg-rose-500'" />
          {{ ws.isConnected.value ? 'Live' : 'Offline' }}
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

    <!-- Vessel Position Map -->
    <UiCard class="overflow-hidden">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Icon name="heroicons:map" class="w-5 h-5 text-blue-500" />
            <h3 class="font-bold text-sm text-slate-800 dark:text-white">Vessel Positions</h3>
          </div>
          <div class="flex items-center gap-2">
            <!-- Vessel selector -->
            <select
              v-if="vesselPositions.length > 0"
              v-model="selectedVesselId"
              class="h-7 pl-2 pr-6 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none cursor-pointer text-slate-700 dark:text-slate-300"
            >
              <option :value="null">All Vessels</option>
              <option
                v-for="pos in vesselPositions"
                :key="pos.ship_id"
                :value="pos.ship_id"
              >{{ pos.ship_name }}</option>
            </select>

            <span v-if="vesselPending" class="text-xs text-slate-400 flex items-center gap-1 whitespace-nowrap">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              Loading...
            </span>
            <span v-else-if="vesselError" class="text-xs text-rose-500 flex items-center gap-1 whitespace-nowrap">
              <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5" />
              Error
            </span>
            <span v-else class="text-xs text-slate-400 whitespace-nowrap">
              {{ vesselPositions.filter(p => p.latitude != null).length }} of {{ vesselPositions.length }} tracked
            </span>
            <UiButton variant="ghost" size="sm" @click="refreshPositions" :loading="vesselPending">
              <Icon name="heroicons:arrow-path" class="w-3.5 h-3.5" />
            </UiButton>
            <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">OSM</span>
          </div>
        </div>
      </template>

      <!-- API error state -->
      <div v-if="vesselError" class="mx-4 my-3 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-lg">
        <p class="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-1">Vessel positions endpoint error</p>
        <p class="text-[11px] text-rose-500 font-mono">{{ (vesselError as any)?.data?.message || (vesselError as any)?.message || String(vesselError) }}</p>
        <p class="text-[10px] text-rose-400 mt-1">Pastikan backend sudah di-restart dan migration 000006 sudah dijalankan.</p>
      </div>

      <ClientOnly>
        <MapVesselMap :positions="vesselPositions" :focus-id="selectedVesselId" />
        <template #fallback>
          <div class="flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-b-xl" style="height:440px;">
            <div class="flex flex-col items-center gap-2 text-slate-400">
              <Icon name="heroicons:map" class="w-8 h-8 animate-pulse" />
              <span class="text-sm">Loading map...</span>
            </div>
          </div>
        </template>
      </ClientOnly>

      <div v-if="!vesselError && !vesselPending && vesselPositions.length === 0" class="mt-3 px-1">
        <p class="text-xs text-slate-400 text-center">
          Belum ada data GPS. Jalankan seed atau kirim data
          <code class="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">latitude</code>
          &amp; <code class="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">longitude</code>
          dari perangkat GPS kapal.
        </p>
      </div>
    </UiCard>

    <!-- Marine Metrics Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <UiCard>
        <template #header>
          <div class="flex items-center gap-2">
            <Icon name="heroicons:bolt" class="w-5 h-5 text-primary" />
            <h3 class="font-bold text-sm text-slate-800 dark:text-white">Average Engine Speed</h3>
          </div>
        </template>
        <div class="py-6 flex flex-col items-center gap-4">
          <div class="relative w-36 h-36 flex items-center justify-center rounded-full border-8 border-slate-100 dark:border-slate-800">
            <div class="text-center">
              <span class="text-3xl font-extrabold text-slate-800 dark:text-white">{{ stats.metrics.avg_rpm?.toFixed(0) || 0 }}</span>
              <p class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">RPM</p>
            </div>
            <div class="absolute inset-0 rounded-full border-8 border-primary opacity-20 pointer-events-none" />
          </div>
        </div>
      </UiCard>

      <UiCard>
        <template #header>
          <div class="flex items-center gap-2">
            <Icon name="heroicons:fire" class="w-5 h-5 text-orange-500" />
            <h3 class="font-bold text-sm text-slate-800 dark:text-white">Average Fuel Flow Rate</h3>
          </div>
        </template>
        <div class="py-6 flex flex-col items-center gap-4">
          <div class="relative w-36 h-36 flex items-center justify-center rounded-full border-8 border-slate-100 dark:border-slate-800">
            <div class="text-center">
              <span class="text-3xl font-extrabold text-slate-800 dark:text-white">{{ stats.metrics.avg_flow_rate?.toFixed(1) || 0 }}</span>
              <p class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">L/h</p>
            </div>
            <div class="absolute inset-0 rounded-full border-8 border-orange-500 opacity-20 pointer-events-none" />
          </div>
        </div>
      </UiCard>

      <UiCard>
        <template #header>
          <div class="flex items-center gap-2">
            <Icon name="heroicons:command-line" class="w-5 h-5 text-purple-500" />
            <h3 class="font-bold text-sm text-slate-800 dark:text-white">Average Generator Power</h3>
          </div>
        </template>
        <div class="py-6 flex flex-col items-center gap-4">
          <div class="relative w-36 h-36 flex items-center justify-center rounded-full border-8 border-slate-100 dark:border-slate-800">
            <div class="text-center">
              <span class="text-3xl font-extrabold text-slate-800 dark:text-white">{{ stats.metrics.avg_power?.toFixed(1) || 0 }}</span>
              <p class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">kW</p>
            </div>
            <div class="absolute inset-0 rounded-full border-8 border-purple-500 opacity-20 pointer-events-none" />
          </div>
        </div>
      </UiCard>
    </div>
  </div>
</template>

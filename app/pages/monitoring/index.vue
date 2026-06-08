<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'tenant']
})

useHead({
  title: 'Telemetry Logs'
})

const route  = useRoute()
const router = useRouter()

// Filters — ship_id & ship_name can come from URL (map popup link)
const selectedShip   = ref((route.query.ship_id as string) || '')
const selectedDevice = ref('')
const selectedMetric = ref('')
const limit          = ref(100)

// Ships dropdown
const { data: shipsRes } = await useApi<any>('/api/v1/ships')
const ships = computed(() => shipsRes.value?.data || [])

// Devices dropdown (narrowed by selected ship)
const { data: devicesRes } = await useApi<any>('/api/v1/devices')
const allDevices = computed(() => devicesRes.value?.data || [])
const devices = computed(() => {
  if (!selectedShip.value) return allDevices.value
  return allDevices.value.filter((d: any) => d.ship_id === selectedShip.value)
})

// Metric names — fetched from backend, reactive to ship selection
const {
  data: metricNamesRes,
  refresh: refreshMetricNames
} = useApi<string[]>(() =>
  `/api/v1/monitoring/metric-names${selectedShip.value ? `?ship_id=${selectedShip.value}` : ''}`,
  { server: false }
)
const metricNames = computed<string[]>(() => metricNamesRes.value?.data ?? [])

// When ship changes → reset device + metric filters, sync URL, reload metric names
watch(selectedShip, (id) => {
  selectedDevice.value = ''
  selectedMetric.value = ''
  router.replace({ query: id ? { ship_id: id } : {} })
  refreshMetricNames()
  refresh()
})

// Fetch logs
const { data: logsRes, pending, refresh } = await useApi<any>(() => {
  let q = `/api/v1/monitoring?limit=${limit.value}`
  if (selectedShip.value)   q += `&ship_id=${selectedShip.value}`
  if (selectedDevice.value) q += `&device_id=${selectedDevice.value}`
  if (selectedMetric.value) q += `&metric_name=${encodeURIComponent(selectedMetric.value)}`
  return q
})

const logs = computed(() => logsRes.value?.data || [])

// ── Grouping: Ship → Device → Metrics ────────────────────────────────────
interface MetricReading { name: string; type: string; value: number; unit: string }
interface DeviceGroup   { deviceId: string; deviceName: string; timestamp: string; metrics: MetricReading[] }
interface ShipGroup     { shipId: string; shipName: string; devices: DeviceGroup[] }

const shipGroups = computed<ShipGroup[]>(() => {
  const shipMap: Record<string, ShipGroup>  = {}
  const devMap:  Record<string, DeviceGroup> = {}

  for (const log of logs.value) {
    const devId   = log.device_id
    const shipId  = log.device?.ship?.id   || '__none__'
    const shipName = log.device?.ship?.name || 'Unassigned'
    if (!devId) continue

    // Ship bucket
    if (!shipMap[shipId]) {
      shipMap[shipId] = { shipId, shipName, devices: [] }
    }

    // Device bucket
    if (!devMap[devId]) {
      const dev: DeviceGroup = {
        deviceId:   devId,
        deviceName: log.device?.name || 'Unknown Device',
        timestamp:  log.timestamp,
        metrics:    []
      }
      devMap[devId] = dev
      shipMap[shipId].devices.push(dev)
    }

    // Latest metric reading (one row per metric_name)
    const metricName = log.metric_name || log.metric_type
    const dev = devMap[devId]
    if (!dev.metrics.some(m => m.name === metricName)) {
      dev.metrics.push({ name: metricName, type: log.metric_type, value: log.value, unit: log.unit || '' })
    }
    if (new Date(log.timestamp) > new Date(dev.timestamp)) {
      dev.timestamp = log.timestamp
    }
  }

  // Sort ships: assigned ships first, then sort devices by name inside each
  return Object.values(shipMap)
    .sort((a, b) => a.shipName.localeCompare(b.shipName))
    .map(s => ({ ...s, devices: s.devices.sort((a, b) => a.deviceName.localeCompare(b.deviceName)) }))
})

// ── WebSocket live updates ────────────────────────────────────────────────
const ws = useWebSocket()
onMounted(() => {
  const unsub = ws.on('monitoring', (payload: any) => {
    if (!selectedDevice.value || payload.device_id === selectedDevice.value) {
      if (!selectedMetric.value || payload.metric_type === selectedMetric.value) refresh()
    }
  })
  onUnmounted(() => unsub())
})

// ── Helpers ───────────────────────────────────────────────────────────────
const headers = [
  { key: 'device_name', label: 'Device Name'     },
  { key: 'metric_type', label: 'Metric Category' },
  { key: 'metric_name', label: 'Parameter'       },
  { key: 'value',       label: 'Reading Value'   },
  { key: 'timestamp',   label: 'Timestamp'       }
]

const formatTime = (ts: string) => new Date(ts).toLocaleString()

const getMetricIcon = (type: string) => {
  switch (type) {
    case 'cpu':         return 'heroicons:cpu-chip'
    case 'ram':         return 'heroicons:square-3-stack-3d'
    case 'temperature': return 'heroicons:fire'
    case 'disk':        return 'heroicons:circle-stack'
    case 'uptime':      return 'heroicons:clock'
    default:            return 'heroicons:adjustments-horizontal'
  }
}

const getMetricColor = (type: string) => {
  switch (type) {
    case 'cpu':         return 'text-sky-500'
    case 'ram':         return 'text-purple-500'
    case 'temperature': return 'text-amber-500'
    case 'disk':        return 'text-teal-500'
    case 'uptime':      return 'text-indigo-500'
    default:            return 'text-emerald-500'
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header + Filters -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Telemetry & Monitoring Logs</h2>
        <p class="text-xs text-slate-500 font-medium">Inspect real-time parameter streams, engine stats, and network telemetry logs.</p>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <!-- Ship Filter (All Ships) -->
        <select
          v-model="selectedShip"
          class="h-10 pl-3 pr-8 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none cursor-pointer text-slate-700 dark:text-slate-300"
        >
          <option value="">All Ships</option>
          <option v-for="s in ships" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>

        <!-- Device Filter -->
        <select
          v-model="selectedDevice"
          @change="refresh"
          class="h-10 pl-3 pr-8 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none cursor-pointer text-slate-700 dark:text-slate-300"
        >
          <option value="">All Devices</option>
          <option v-for="d in devices" :key="d.id" :value="d.id">{{ d.name }}</option>
        </select>

        <!-- Metric Filter (real data from DB) -->
        <select
          v-model="selectedMetric"
          @change="refresh"
          class="h-10 pl-3 pr-8 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none cursor-pointer text-slate-700 dark:text-slate-300"
        >
          <option value="">All Metrics</option>
          <option v-for="name in metricNames" :key="name" :value="name">{{ name }}</option>
        </select>

        <UiButton variant="secondary" size="sm" @click="refresh" :loading="pending">
          <Icon name="heroicons:arrow-path" class="w-4 h-4 mr-1.5" />
          Refresh
        </UiButton>
      </div>
    </div>

    <!-- Telemetry stream -->
    <div class="flex flex-col gap-6">
      <!-- Live Feed grouped by device -->
      <UiCard class="w-full">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Device Status Feed</h4>
              <span v-if="selectedShip" class="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                <Icon name="heroicons:map-pin" class="w-3 h-3" />
                {{ ships.find((s: any) => s.id === selectedShip)?.name }}
              </span>
            </div>
            <span class="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Live
            </span>
          </div>
        </template>

        <div class="py-2 max-h-[700px] overflow-y-auto pr-1 flex flex-col gap-6">
          <div v-if="shipGroups.length === 0" class="text-center text-xs text-slate-400 py-10">
            No live data stream matching query.
          </div>

          <!-- Ship group -->
          <div v-for="shipGroup in shipGroups" :key="shipGroup.shipId" class="flex flex-col gap-3">
            <!-- Ship header -->
            <div class="flex items-center gap-2 px-1">
              <Icon name="heroicons:building-storefront" class="w-4 h-4 text-primary shrink-0" />
              <span class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ shipGroup.shipName }}</span>
              <span class="text-[10px] text-slate-400 font-medium">({{ shipGroup.devices.length }} device{{ shipGroup.devices.length !== 1 ? 's' : '' }})</span>
              <div class="flex-1 h-px bg-slate-200 dark:bg-slate-700 ml-1" />
            </div>

            <!-- Device cards for this ship -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-2">
              <div
                v-for="dev in shipGroup.devices"
                :key="dev.deviceId"
                class="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-700/30 hover:border-slate-200 dark:hover:border-slate-600 transition-all"
              >
                <!-- Device header -->
                <div class="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-700/50 pb-2">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <Icon name="heroicons:cpu-chip" class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{{ dev.deviceName }}</span>
                  </div>
                  <span class="text-[9px] text-slate-400 whitespace-nowrap ml-2">{{ formatTime(dev.timestamp) }}</span>
                </div>

                <!-- Metrics grid -->
                <div class="grid grid-cols-2 gap-2">
                  <div
                    v-for="metric in dev.metrics"
                    :key="metric.name"
                    class="flex items-center gap-2 p-2 bg-white dark:bg-slate-800/80 rounded border border-slate-100 dark:border-slate-700"
                  >
                    <div class="p-1 rounded bg-slate-50 dark:bg-slate-900 shrink-0" :class="getMetricColor(metric.type)">
                      <Icon :name="getMetricIcon(metric.type)" class="w-3.5 h-3.5" />
                    </div>
                    <div class="min-w-0">
                      <div class="text-[9px] text-slate-400 font-bold truncate uppercase tracking-wider">{{ metric.name }}</div>
                      <div class="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {{ typeof metric.value === 'number' ? metric.value.toFixed(2) : metric.value }}
                        <span class="text-[9px] text-slate-400 font-normal ml-0.5">{{ metric.unit }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- Historical logs table -->
      <UiCard class="w-full">
        <template #header>
          <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Historical Logs</h4>
        </template>

        <UiTable :headers="headers" :items="logs" :loading="pending" empty-text="No metrics logs found.">
          <template #cell-device_name="{ item }">
            <div>
              <div class="font-semibold text-slate-800 dark:text-slate-200">{{ item.device?.name || 'Unknown' }}</div>
              <div v-if="item.device?.ship?.name" class="text-[10px] text-primary font-bold mt-0.5">🚢 {{ item.device.ship.name }}</div>
            </div>
          </template>

          <template #cell-metric_type="{ item }">
            <UiBadge variant="secondary" size="sm" class="capitalize">{{ item.metric_type }}</UiBadge>
          </template>

          <template #cell-metric_name="{ item }">
            <span class="font-medium text-slate-700 dark:text-slate-300">{{ item.metric_name || '-' }}</span>
          </template>

          <template #cell-value="{ item }">
            <span class="font-bold text-slate-800 dark:text-slate-200">
              {{ item.value }} <span class="text-xs text-slate-400 font-normal ml-0.5">{{ item.unit }}</span>
            </span>
          </template>

          <template #cell-timestamp="{ item }">
            <span class="text-xs text-slate-400">{{ formatTime(item.timestamp) }}</span>
          </template>
        </UiTable>
      </UiCard>
    </div>
  </div>
</template>

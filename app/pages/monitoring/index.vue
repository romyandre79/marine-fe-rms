<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'tenant']
})

useHead({
  title: 'Telemetry Logs'
})

const selectedDevice = ref('')
const selectedMetric = ref('')
const limit = ref(100) // increase limit to get enough records for grouping

// Load devices for filter dropdown
const { data: devicesRes } = await useApi<any>('/api/v1/devices')
const devices = computed(() => devicesRes.value?.data || [])

// Fetch logs
const { data: logsRes, pending, refresh } = await useApi<any>(() => {
  let query = `/api/v1/monitoring?limit=${limit.value}`
  if (selectedDevice.value) {
    query += `&device_id=${selectedDevice.value}`
  }
  if (selectedMetric.value) {
    query += `&metric_type=${selectedMetric.value}`
  }
  return query
})

const logs = computed(() => logsRes.value?.data || [])

// Group logs by device and extract the latest reading of each metric/parameter
interface MetricReading {
  name: string
  type: string
  value: number
  unit: string
}

interface DeviceGroup {
  deviceId: string
  deviceName: string
  shipName?: string
  timestamp: string
  metrics: MetricReading[]
}

const groupedLogs = computed<DeviceGroup[]>(() => {
  const groups: Record<string, DeviceGroup> = {}
  
  for (const log of logs.value) {
    const devId = log.device_id
    if (!devId) continue
    
    if (!groups[devId]) {
      groups[devId] = {
        deviceId: devId,
        deviceName: log.device?.name || 'Unknown Device',
        shipName: log.device?.ship?.name,
        timestamp: log.timestamp,
        metrics: []
      }
    }
    
    // Check if we already have this metric parameter
    const metricName = log.metric_name || log.metric_type
    const exists = groups[devId].metrics.some(m => m.name === metricName)
    if (!exists) {
      groups[devId].metrics.push({
        name: metricName,
        type: log.metric_type,
        value: log.value,
        unit: log.unit || ''
      })
    }
    
    // Track latest timestamp
    if (new Date(log.timestamp) > new Date(groups[devId].timestamp)) {
      groups[devId].timestamp = log.timestamp
    }
  }
  
  return Object.values(groups)
})

// Listen for WebSocket live monitoring events to append or refresh logs
const ws = useWebSocket()
onMounted(() => {
  const unsub = ws.on('monitoring', (payload: any) => {
    if (!selectedDevice.value || payload.device_id === selectedDevice.value) {
      if (!selectedMetric.value || payload.metric_type === selectedMetric.value) {
        refresh()
      }
    }
  })
  
  onUnmounted(() => {
    unsub()
  })
})

const headers = [
  { key: 'device_name', label: 'Device Name' },
  { key: 'metric_type', label: 'Metric Category' },
  { key: 'metric_name', label: 'Parameter' },
  { key: 'value', label: 'Reading Value' },
  { key: 'timestamp', label: 'Timestamp' }
]

const formatTime = (ts: string) => {
  return new Date(ts).toLocaleString()
}

const getMetricIcon = (type: string) => {
  switch (type) {
    case 'cpu': return 'heroicons:cpu-chip'
    case 'ram': return 'heroicons:square-3-stack-3d'
    case 'temperature': return 'heroicons:fire'
    case 'disk': return 'heroicons:circle-stack'
    case 'uptime': return 'heroicons:clock'
    default: return 'heroicons:adjustments-horizontal'
  }
}

const getMetricColor = (type: string) => {
  switch (type) {
    case 'cpu': return 'text-sky-500'
    case 'ram': return 'text-purple-500'
    case 'temperature': return 'text-amber-500'
    case 'disk': return 'text-teal-500'
    case 'uptime': return 'text-indigo-500'
    default: return 'text-emerald-500'
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Telemetry & Monitoring Logs</h2>
        <p class="text-xs text-slate-500 font-medium">Inspect real-time parameter streams, engine stats, and network telemetry logs.</p>
      </div>
      
      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-3">
        <!-- Device Filter -->
        <select
          v-model="selectedDevice"
          @change="refresh"
          class="h-10 pl-3 pr-8 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none cursor-pointer text-slate-700 dark:text-slate-300"
        >
          <option value="">All Devices</option>
          <option v-for="d in devices" :key="d.id" :value="d.id">
            {{ d.name }}
          </option>
        </select>

        <!-- Metric Filter -->
        <select
          v-model="selectedMetric"
          @change="refresh"
          class="h-10 pl-3 pr-8 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none cursor-pointer text-slate-700 dark:text-slate-300"
        >
          <option value="">All Metrics</option>
          <option value="cpu">System CPU</option>
          <option value="ram">System RAM</option>
          <option value="temperature">Temperature</option>
          <option value="disk">Storage</option>
          <option value="uptime">Uptime</option>
          <option value="custom">Custom Params</option>
        </select>

        <UiButton variant="secondary" size="sm" @click="refresh" :loading="pending">
          <Icon name="heroicons:arrow-path" class="w-4 h-4 mr-1.5" />
          Refresh
        </UiButton>
      </div>
    </div>

    <!-- Telemetry stream view -->
    <div class="flex flex-col gap-6">
      <!-- Live Feed Stream Grouped by Device -->
      <UiCard class="w-full">
        <template #header>
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Device Status Feed</h4>
            <span class="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Live
            </span>
          </div>
        </template>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-2 max-h-[650px] overflow-y-auto pr-1">
          <div v-if="groupedLogs.length === 0" class="col-span-full text-center text-xs text-slate-400 py-10">
            No live data stream matching query.
          </div>
          <div
            v-else
            v-for="group in groupedLogs"
            :key="group.deviceId"
            class="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-700/30 transition-all hover:border-slate-200 dark:hover:border-slate-600"
          >
            <!-- Device Header -->
            <div class="border-b border-slate-200/50 dark:border-slate-700/50 pb-2">
              <div class="flex items-center justify-between text-xs font-bold">
                <span class="text-slate-800 dark:text-slate-200 truncate pr-2">
                  {{ group.deviceName }}
                </span>
                <span class="text-[9px] text-slate-400 font-medium whitespace-nowrap">
                  {{ formatTime(group.timestamp) }}
                </span>
              </div>
              <div v-if="group.shipName" class="text-[10px] text-primary font-bold mt-0.5">
                🚢 {{ group.shipName }}
              </div>
            </div>

            <!-- Parameters Grid -->
            <div class="grid grid-cols-2 gap-2">
              <div
                v-for="metric in group.metrics"
                :key="metric.name"
                class="flex items-center gap-2 p-2 bg-white dark:bg-slate-800/80 rounded border border-slate-100 dark:border-slate-700"
              >
                <div class="p-1 rounded bg-slate-50 dark:bg-slate-900 shrink-0" :class="getMetricColor(metric.type)">
                  <Icon :name="getMetricIcon(metric.type)" class="w-3.5 h-3.5" />
                </div>
                <div class="min-w-0">
                  <div class="text-[9px] text-slate-400 font-bold truncate uppercase tracking-wider">{{ metric.name }}</div>
                  <div class="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {{ typeof metric.value === 'number' ? metric.value.toFixed(1) : metric.value }}
                    <span class="text-[9px] text-slate-400 font-normal ml-0.5">{{ metric.unit }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- Logs table view -->
      <UiCard class="w-full">
        <template #header>
          <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Historical Logs Logged</h4>
        </template>
        
        <UiTable :headers="headers" :items="logs" :loading="pending" empty-text="No metrics logs found.">
          <template #cell-device_name="{ item }">
            <div>
              <div class="font-semibold text-slate-800 dark:text-slate-200">{{ item.device?.name || 'Unknown' }}</div>
              <div v-if="item.device?.ship?.name" class="text-[10px] text-primary font-bold mt-0.5">🚢 {{ item.device.ship.name }}</div>
            </div>
          </template>
          
          <template #cell-metric_type="{ item }">
            <UiBadge variant="secondary" size="sm" class="capitalize">
              {{ item.metric_type }}
            </UiBadge>
          </template>

          <template #cell-metric_name="{ item }">
            <span class="font-medium text-slate-700 dark:text-slate-300">
              {{ item.metric_name || '-' }}
            </span>
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

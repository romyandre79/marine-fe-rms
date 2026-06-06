<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'tenant']
})

const selectedDevice = ref('')
const selectedMetric = ref('cpu')
const limit = ref(20)

// Load devices for filter dropdown
const { data: devicesRes } = await useApi<any>('/api/v1/devices')
const devices = computed(() => devicesRes.value?.data || [])

// Fetch logs
const { data: logsRes, pending, refresh } = await useApi<any>(() => {
  let query = `/api/v1/monitoring?limit=${limit.value}`
  if (selectedDevice.value) {
    query += `&device_id=${selectedDevice.value}`
  }
  return query
})

const logs = computed(() => logsRes.value?.data || [])

// Listen for WebSocket live monitoring events to append or refresh logs
const ws = useWebSocket()
onMounted(() => {
  const unsub = ws.on('monitoring', (payload: any) => {
    // If live logs match selected device filter, refresh or prepend
    if (!selectedDevice.value || payload.device_id === selectedDevice.value) {
      refresh()
    }
  })
  
  onUnmounted(() => {
    unsub()
  })
})

const headers = [
  { key: 'device_name', label: 'Device' },
  { key: 'cpu_usage', label: 'CPU Usage' },
  { key: 'ram_usage', label: 'RAM Usage' },
  { key: 'timestamp', label: 'Timestamp' }
]

const formatTime = (ts: string) => {
  return new Date(ts).toLocaleString()
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Telemetry Logs</h2>
        <p class="text-xs text-slate-500 font-medium">Inspect raw agent reports and metric streams.</p>
      </div>
      
      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-3">
        <select
          v-model="selectedDevice"
          @change="refresh"
          class="h-10 pl-3 pr-8 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none cursor-pointer"
        >
          <option value="">All Devices</option>
          <option v-for="d in devices" :key="d.id" :value="d.id">
            {{ d.name }}
          </option>
        </select>

        <UiButton variant="secondary" size="sm" @click="refresh" :loading="pending">
          <Icon name="heroicons:arrow-path" class="w-4 h-4 mr-1.5" />
          Query
        </UiButton>
      </div>
    </div>

    <!-- Live telemetry feeds -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <UiCard>
        <template #header>
          <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Device Stream Performance</h4>
        </template>
        <div class="flex flex-col gap-4 py-2">
          <div v-if="logs.length === 0" class="text-center text-xs text-slate-400 py-10">
            No live data stream matching query.
          </div>
          <div v-else v-for="log in logs.slice(0, 5)" :key="log.id" class="flex flex-col gap-1.5 p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-700/30">
            <div class="flex items-center justify-between text-xs font-bold">
              <span class="text-slate-700 dark:text-slate-300">{{ log.device?.name || 'Agent Node' }}</span>
              <span class="text-slate-400 font-medium">{{ formatTime(log.created_at) }}</span>
            </div>
            <div class="flex items-center gap-4 text-xs font-semibold">
              <div class="flex-1 flex items-center gap-2">
                <span class="text-slate-400">CPU:</span>
                <span class="text-primary">{{ log.cpu_usage }}%</span>
                <div class="flex-1 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div class="bg-primary h-1.5 rounded-full" :style="{ width: `${log.cpu_usage}%` }" />
                </div>
              </div>
              <div class="flex-1 flex items-center gap-2">
                <span class="text-slate-400">RAM:</span>
                <span class="text-purple-500">{{ log.ram_usage }}%</span>
                <div class="flex-1 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div class="bg-purple-500 h-1.5 rounded-full" :style="{ width: `${log.ram_usage}%` }" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- Logs table view -->
      <UiCard class="flex flex-col">
        <template #header>
          <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Historical Logs Logged</h4>
        </template>
        <UiTable :headers="headers" :items="logs" :loading="pending" empty-text="No metrics logs found.">
          <template #cell-device_name="{ item }">
            <span class="font-semibold text-slate-700 dark:text-slate-300">{{ item.device?.name || 'Unknown' }}</span>
          </template>
          <template #cell-cpu_usage="{ item }">
            <span class="font-bold text-primary">{{ item.cpu_usage }}%</span>
          </template>
          <template #cell-ram_usage="{ item }">
            <span class="font-bold text-purple-500">{{ item.ram_usage }}%</span>
          </template>
          <template #cell-timestamp="{ item }">
            <span class="text-xs text-slate-400">{{ formatTime(item.created_at) }}</span>
          </template>
        </UiTable>
      </UiCard>
    </div>
  </div>
</template>

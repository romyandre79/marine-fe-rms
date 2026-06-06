<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'tenant']
})

const auth = useAuth()
const { data: alertsRes, pending, refresh } = await useApi<any>('/api/v1/alerts')
const alerts = computed(() => alertsRes.value?.data || [])

// WebSocket connection for real-time alerts
const ws = useWebSocket()
onMounted(() => {
  const unsub = ws.on('alert', (payload: any) => {
    refresh()
  })
  
  onUnmounted(() => {
    unsub()
  })
})

const handleAcknowledge = async (id: string) => {
  try {
    const res = await useApiFetch(`/api/v1/alerts/${id}/acknowledge`, {
      method: 'PUT'
    })
    if (res.success) {
      refresh()
    }
  } catch (err: any) {
    alert(err.response?._data?.message || 'Acknowledge failed')
  }
}

const handleResolve = async (id: string) => {
  try {
    const res = await useApiFetch(`/api/v1/alerts/${id}/resolve`, {
      method: 'PUT'
    })
    if (res.success) {
      refresh()
    }
  } catch (err: any) {
    alert(err.response?._data?.message || 'Resolve failed')
  }
}

const headers = [
  { key: 'device', label: 'Device' },
  { key: 'severity', label: 'Severity' },
  { key: 'message', label: 'Message' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions' }
]

const formatTime = (ts: string) => {
  return new Date(ts).toLocaleString()
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h2 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Active Alerts & Incidents</h2>
      <p class="text-xs text-slate-500 font-medium">Acknowledge or resolve platform anomalies and host failures.</p>
    </div>

    <!-- Alerts Table -->
    <UiTable :headers="headers" :items="alerts" :loading="pending" empty-text="Hooray! No active alerts found.">
      <template #cell-device="{ item }">
        <span class="font-bold text-slate-700 dark:text-slate-300">{{ item.device?.name || 'Cluster Agent' }}</span>
      </template>

      <template #cell-severity="{ item }">
        <UiBadge
          :variant="
            item.severity === 'critical' ? 'danger' :
            item.severity === 'warning' ? 'warning' : 'info'
          "
          size="sm"
        >
          {{ item.severity }}
        </UiBadge>
      </template>

      <template #cell-status="{ item }">
        <div class="flex flex-col gap-0.5">
          <UiBadge v-if="item.resolved" variant="success" size="sm">Resolved</UiBadge>
          <UiBadge v-else-if="item.acknowledged" variant="info" size="sm">Acknowledged</UiBadge>
          <UiBadge v-else variant="danger" size="sm">Active</UiBadge>
          <span class="text-[10px] text-slate-400 font-medium mt-0.5">Created at {{ formatTime(item.created_at) }}</span>
        </div>
      </template>

      <template #cell-actions="{ item }">
        <div class="flex items-center gap-2">
          <!-- Acknowledge -->
          <UiButton
            v-if="!item.acknowledged && !item.resolved"
            variant="secondary"
            size="sm"
            @click="handleAcknowledge(item.id)"
          >
            Acknowledge
          </UiButton>
          <!-- Resolve -->
          <UiButton
            v-if="!item.resolved && ['admin', 'superadmin', 'operator'].includes(auth.userRole.value)"
            variant="success"
            size="sm"
            @click="handleResolve(item.id)"
          >
            Resolve
          </UiButton>
          <span v-if="item.resolved" class="text-xs text-slate-400 font-semibold">Closed</span>
        </div>
      </template>
    </UiTable>
  </div>
</template>

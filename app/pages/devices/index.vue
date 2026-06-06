<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'tenant']
})

useHead({
  title: 'Devices'
})

const auth = useAuth()
const { data: devicesRes, pending, refresh } = await useApi<any>('/api/v1/devices')
const devices = computed(() => devicesRes.value?.data || [])

const { data: shipsRes } = await useApi<any>('/api/v1/ships')
const shipsList = computed(() => shipsRes.value?.data || [])

const { data: typesRes } = await useApi<any>('/api/v1/device-types')
const deviceTypesList = computed(() => typesRes.value?.data || [])

// Modal state
const isModalOpen = ref(false)
const isEditMode = ref(false)
const activeDeviceId = ref<string | null>(null)

// Form fields
const name = ref('')
const deviceTypeId = ref('')
const shipId = ref('')
const variablesSchema = ref('[]')
const status = ref('online')
const formError = ref('')
const submitting = ref(false)

const openAddModal = () => {
  isEditMode.value = false
  activeDeviceId.value = null
  name.value = ''
  deviceTypeId.value = deviceTypesList.value[0]?.id || ''
  shipId.value = ''
  variablesSchema.value = '[]'
  status.value = 'online'
  formError.value = ''
  isModalOpen.value = true
}

const openEditModal = (device: any) => {
  isEditMode.value = true
  activeDeviceId.value = device.id
  name.value = device.name
  deviceTypeId.value = device.device_type_id || ''
  shipId.value = device.ship_id || ''
  variablesSchema.value = device.variables_schema ? JSON.stringify(JSON.parse(device.variables_schema), null, 2) : '[]'
  status.value = device.status
  formError.value = ''
  isModalOpen.value = true
}

const handleSubmit = async () => {
  submitting.value = true
  formError.value = ''
  
  try {
    JSON.parse(variablesSchema.value)
  } catch (e) {
    formError.value = 'Variables schema must be a valid JSON array'
    submitting.value = false
    return
  }
  
  const body = {
    name: name.value,
    device_type_id: deviceTypeId.value,
    ship_id: shipId.value || null,
    variables_schema: variablesSchema.value,
    status: status.value
  }

  try {
    let res
    if (isEditMode.value && activeDeviceId.value) {
      res = await useApiFetch(`/api/v1/devices/${activeDeviceId.value}`, {
        method: 'PUT',
        body
      })
    } else {
      res = await useApiFetch('/api/v1/devices', {
        method: 'POST',
        body
      })
    }

    if (res.success) {
      isModalOpen.value = false
      refresh()
    } else {
      formError.value = res.message || 'Operation failed'
    }
  } catch (err: any) {
    formError.value = err.response?._data?.message || 'Failed to submit form'
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (id: string) => {
  if (!confirm('Are you sure you want to delete this device?')) return
  try {
    const res = await useApiFetch(`/api/v1/devices/${id}`, {
      method: 'DELETE'
    })
    if (res.success) {
      refresh()
    }
  } catch (err: any) {
    alert(err.response?._data?.message || 'Failed to delete device')
  }
}

const headers = [
  { key: 'name', label: 'Device Name' },
  { key: 'device_type', label: 'Device Type' },
  { key: 'ship', label: 'Ship Vessel' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions' }
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Registered Devices</h2>
        <p class="text-xs text-slate-500 font-medium">Configure network node agents and monitor host vitals.</p>
      </div>
      <UiButton
        v-if="auth.userRole === 'super_admin'"
        variant="primary"
        size="md"
        @click="openAddModal"
      >
        <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
        Add Device
      </UiButton>
    </div>

    <!-- Table list -->
    <UiTable :headers="headers" :items="devices" :loading="pending" empty-text="No registered devices found.">
      <template #cell-name="{ item }">
        <div>
          <div class="font-semibold text-slate-800 dark:text-slate-200">{{ item.name }}</div>
          <div class="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5 select-all">{{ item.id }}</div>
        </div>
      </template>
      <template #cell-device_type="{ item }">
        <span class="text-xs font-semibold text-slate-600 dark:text-slate-400">
          {{ item.device_type?.name || '-' }}
        </span>
      </template>
      <template #cell-ship="{ item }">
        <span class="text-xs font-semibold text-slate-600 dark:text-slate-400">
          {{ item.ship?.name || '-' }}
        </span>
      </template>
      <template #cell-status="{ item }">
        <UiBadge
          :variant="
            item.status === 'online' ? 'success' :
            item.status === 'warning' ? 'warning' : 'danger'
          "
          size="sm"
        >
          {{ item.status }}
        </UiBadge>
      </template>
      <template #cell-actions="{ item }">
        <div class="flex items-center gap-2">
          <UiButton
            v-if="auth.userRole === 'super_admin'"
            variant="ghost"
            size="sm"
            @click="openEditModal(item)"
          >
            <Icon name="heroicons:pencil-square" class="w-4 h-4" />
          </UiButton>
          <UiButton
            v-if="auth.userRole === 'super_admin'"
            variant="ghost"
            size="sm"
            class="text-rose-500 hover:text-rose-700"
            @click="handleDelete(item.id)"
          >
            <Icon name="heroicons:trash" class="w-4 h-4" />
          </UiButton>
        </div>
      </template>
    </UiTable>

    <!-- Modal Form -->
    <UiModal
      v-model="isModalOpen"
      :title="isEditMode ? 'Edit Device Node' : 'Register New Device'"
      size="md"
    >
      <div v-if="formError" class="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 rounded-lg">
        {{ formError }}
      </div>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <UiInput
          id="device-name"
          v-model="name"
          label="Device Name"
          placeholder="e.g. Edge Gateway Singapore"
          required
        />

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-500">Device Type</label>
          <select
            v-model="deviceTypeId"
            required
            class="w-full px-4 h-11 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-primary focus:border-primary text-slate-700"
          >
            <option value="" disabled>-- Select Device Type --</option>
            <option v-for="t in deviceTypesList" :key="t.id" :value="t.id">
              {{ t.name }}
            </option>
          </select>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-500">Assigned Ship</label>
          <select
            v-model="shipId"
            class="w-full px-4 h-11 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-primary focus:border-primary text-slate-700"
          >
            <option value="">-- Unassigned --</option>
            <option v-for="ship in shipsList" :key="ship.id" :value="ship.id">
              {{ ship.name }}
            </option>
          </select>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-500">Variables Schema (JSON)</label>
          <textarea
            v-model="variablesSchema"
            rows="6"
            placeholder='e.g. [{"key": "rpm", "name": "RPM", "unit": "rpm"}]'
            class="w-full px-4 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-primary focus:border-primary text-slate-700"
          ></textarea>
        </div>

        <div v-if="isEditMode" class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-500">Device Status</label>
          <select
            v-model="status"
            class="w-full px-4 h-11 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-primary focus:border-primary text-slate-700"
          >
            <option value="online">Online</option>
            <option value="warning">Warning</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </form>

      <template #footer>
        <UiButton variant="secondary" size="md" @click="isModalOpen = false">Cancel</UiButton>
        <UiButton variant="primary" size="md" :loading="submitting" @click="handleSubmit">
          {{ isEditMode ? 'Save Changes' : 'Register Node' }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>


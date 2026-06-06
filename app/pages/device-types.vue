<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'tenant']
})

useHead({
  title: 'Device Types'
})

const auth = useAuth()
const { data: typesRes, pending, refresh } = await useApi<any>('/api/v1/device-types')
const deviceTypes = computed(() => typesRes.value?.data || [])

// Modal state
const isModalOpen = ref(false)
const isEditMode = ref(false)
const activeTypeId = ref<string | null>(null)

// Form fields
const name = ref('')
const description = ref('')
const formError = ref('')
const submitting = ref(false)

const openAddModal = () => {
  isEditMode.value = false
  activeTypeId.value = null
  name.value = ''
  description.value = ''
  formError.value = ''
  isModalOpen.value = true
}

const openEditModal = (item: any) => {
  isEditMode.value = true
  activeTypeId.value = item.id
  name.value = item.name
  description.value = item.description || ''
  formError.value = ''
  isModalOpen.value = true
}

const handleSubmit = async () => {
  if (!name.value) {
    formError.value = 'Name is required'
    return
  }

  submitting.value = true
  formError.value = ''

  const body = {
    name: name.value,
    description: description.value
  }

  try {
    let res
    if (isEditMode.value && activeTypeId.value) {
      res = await useApiFetch(`/api/v1/device-types/${activeTypeId.value}`, {
        method: 'PUT',
        body
      })
    } else {
      res = await useApiFetch('/api/v1/device-types', {
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
  if (!confirm('Are you sure you want to delete this device type? Devices mapped to this type may lose their category link.')) return
  try {
    const res = await useApiFetch(`/api/v1/device-types/${id}`, {
      method: 'DELETE'
    })
    if (res.success) {
      refresh()
    }
  } catch (err: any) {
    alert(err.response?._data?.message || 'Failed to delete device type')
  }
}

const headers = [
  { key: 'name', label: 'Type Name' },
  { key: 'description', label: 'Description' },
  { key: 'actions', label: 'Actions' }
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Device Types</h2>
        <p class="text-xs text-slate-500 font-medium">Configure and categorize telemetry sensor nodes (e.g. Generator, Main Engine).</p>
      </div>
      <UiButton
        v-if="['company_admin', 'super_admin', 'operator'].includes(auth.userRole)"
        variant="primary"
        size="md"
        @click="openAddModal"
      >
        <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
        Add Type
      </UiButton>
    </div>

    <!-- Table list -->
    <UiTable :headers="headers" :items="deviceTypes" :loading="pending" empty-text="No device types found.">
      <template #cell-name="{ item }">
        <div>
          <div class="font-semibold text-slate-800 dark:text-slate-200">{{ item.name }}</div>
          <div class="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5 select-all">{{ item.id }}</div>
        </div>
      </template>
      <template #cell-description="{ item }">
        <span class="text-xs text-slate-600 dark:text-slate-400">
          {{ item.description || '-' }}
        </span>
      </template>
      <template #cell-actions="{ item }">
        <div class="flex items-center gap-2">
          <UiButton
            v-if="['company_admin', 'super_admin', 'operator'].includes(auth.userRole)"
            variant="ghost"
            size="sm"
            @click="openEditModal(item)"
          >
            <Icon name="heroicons:pencil-square" class="w-4 h-4" />
          </UiButton>
          <UiButton
            v-if="['company_admin', 'super_admin'].includes(auth.userRole) && !['b1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222'].includes(item.id)"
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
      :title="isEditMode ? 'Edit Device Type' : 'Create Device Type'"
      size="md"
    >
      <div v-if="formError" class="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 rounded-lg">
        {{ formError }}
      </div>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <UiInput
          id="type-name"
          v-model="name"
          label="Type Name"
          placeholder="e.g. Fuel Sensor Hub"
          required
        />

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-500">Description</label>
          <textarea
            v-model="description"
            rows="3"
            placeholder="Describe what this type of device monitors..."
            class="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-primary focus:border-primary text-slate-700"
          ></textarea>
        </div>
      </form>

      <template #footer>
        <UiButton variant="secondary" size="md" @click="isModalOpen = false">Cancel</UiButton>
        <UiButton variant="primary" size="md" :loading="submitting" @click="handleSubmit">
          {{ isEditMode ? 'Save Changes' : 'Create Type' }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

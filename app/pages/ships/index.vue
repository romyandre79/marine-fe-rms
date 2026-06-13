<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'tenant']
})

useHead({
  title: 'Ships'
})

const auth = useAuth()
const { data: shipsRes, pending, refresh } = await useFetch<any>('http://localhost:3006/api/v1/vessels', {
  headers: {
    Authorization: `Bearer ${useCookie('mms_token').value}`
  }
})

// Load companies list from MMS (needed for owner company selection)
const { data: companiesRes } = await useFetch<any>('http://localhost:3004/api/v1/companies', {
  headers: {
    Authorization: `Bearer ${useCookie('mms_token').value}`
  }
})
const companiesList = computed(() => {
  const data = companiesRes.value?.data || []
  return data.map((c: any) => ({
    id: c.ID !== undefined ? c.ID : c.id,
    name: c.Name !== undefined ? c.Name : c.name
  }))
})

const ships = computed(() => {
  const data = shipsRes.value?.data || []
  return data.map((s: any) => {
    const company = companiesList.value.find((c: any) => c.id === s.company_id)
    return {
      id: s.id,
      name: s.name,
      company_id: s.company_id,
      company: company,
      description: s.description || s.type || '',
      status: s.status ? s.status.toLowerCase() : 'active'
    }
  })
})

// Modal state
const isModalOpen = ref(false)
const isEditMode = ref(false)
const activeShipId = ref<string | null>(null)

// Form fields
const name = ref('')
const companyId = ref('')
const description = ref('')
const status = ref('active')
const formError = ref('')
const submitting = ref(false)

const openAddModal = () => {
  isEditMode.value = false
  activeShipId.value = null
  name.value = ''
  companyId.value = ''
  description.value = ''
  status.value = 'active'
  formError.value = ''
  isModalOpen.value = true
}

const openEditModal = (ship: any) => {
  isEditMode.value = true
  activeShipId.value = ship.id
  name.value = ship.name
  companyId.value = ship.company_id || ''
  description.value = ship.description || ''
  status.value = ship.status
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

  // FMS vessel body
  const fmsBody: any = {
    name: name.value,
    type: 'Cargo', // Default type for RMS registered vessels
    status: status.value === 'active' ? 'Active' : 'Inactive',
    company_id: companyId.value || auth.user?.company_id
  }

  try {
    let res
    if (isEditMode.value && activeShipId.value) {
      // 1. Update in FMS
      res = await $fetch<any>(`http://localhost:3006/api/v1/vessels/${activeShipId.value}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${useCookie('mms_token').value}`,
          'Content-Type': 'application/json'
        },
        body: fmsBody
      })

      if (res.success) {
        // 2. Sync to RMS
        await useApiFetch(`/api/v1/ships/${activeShipId.value}`, {
          method: 'PUT',
          body: {
            id: activeShipId.value,
            company_id: fmsBody.company_id,
            name: fmsBody.name,
            description: description.value,
            status: status.value
          }
        })
      }
    } else {
      // 1. Create in FMS
      res = await $fetch<any>('http://localhost:3006/api/v1/vessels', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${useCookie('mms_token').value}`,
          'Content-Type': 'application/json'
        },
        body: fmsBody
      })

      if (res.success && res.data) {
        const createdVessel = res.data
        const newId = createdVessel.id
        // 2. Sync to RMS
        await useApiFetch('/api/v1/ships', {
          method: 'POST',
          body: {
            id: newId,
            company_id: fmsBody.company_id,
            name: fmsBody.name,
            description: description.value,
            status: status.value
          }
        })
      }
    }

    if (res.success) {
      isModalOpen.value = false
      refresh()
    } else {
      formError.value = res.message || 'Operation failed'
    }
  } catch (err: any) {
    formError.value = err.response?._data?.message || err.message || 'Failed to submit form'
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (id: string) => {
  if (!confirm('Are you sure you want to delete this ship? All mapped devices will be unassigned.')) return
  try {
    // 1. Delete in FMS
    const res = await $fetch<any>(`http://localhost:3006/api/v1/vessels/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${useCookie('mms_token').value}`
      }
    })

    if (res.success) {
      // 2. Sync deletion to RMS
      await useApiFetch(`/api/v1/ships/${id}`, {
        method: 'DELETE'
      })
      refresh()
    }
  } catch (err: any) {
    alert(err.response?._data?.message || err.message || 'Failed to delete ship')
  }
}

const headers = [
  { key: 'name', label: 'Ship Name' },
  { key: 'company', label: 'Company Owner' },
  { key: 'description', label: 'Description' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions' }
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Registered Ships</h2>
        <p class="text-xs text-slate-500 font-medium">Manage company vessels and monitor their telemetry device mappings.</p>
      </div>
      <UiButton
        v-if="auth.userRole === 'super_admin'"
        variant="primary"
        size="md"
        @click="openAddModal"
      >
        <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
        Add Ship
      </UiButton>
    </div>

    <!-- Table list -->
    <UiTable :headers="headers" :items="ships" :loading="pending" empty-text="No registered ships found.">
      <template #cell-name="{ item }">
        <div>
          <div class="font-semibold text-slate-800 dark:text-slate-200">{{ item.name }}</div>
          <div class="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5 select-all">{{ item.id }}</div>
        </div>
      </template>
      <template #cell-company="{ item }">
        <span class="text-xs font-semibold text-primary">
          🏢 {{ item.company?.name || 'Unknown Company' }}
        </span>
      </template>
      <template #cell-description="{ item }">
        <span class="text-xs text-slate-600 dark:text-slate-400">
          {{ item.description || '-' }}
        </span>
      </template>
      <template #cell-status="{ item }">
        <UiBadge
          :variant="item.status === 'active' ? 'success' : 'danger'"
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
      :title="isEditMode ? 'Edit Ship Vessel' : 'Register New Ship'"
      size="md"
    >
      <div v-if="formError" class="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 rounded-lg">
        {{ formError }}
      </div>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <UiInput
          id="ship-name"
          v-model="name"
          label="Ship Name"
          placeholder="e.g. KM Kelud"
          required
        />

        <div v-if="auth.userRole === 'super_admin'" class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-500">Owner Company</label>
          <select
            v-model="companyId"
            required
            class="w-full px-4 h-11 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-primary focus:border-primary text-slate-700"
          >
            <option value="" disabled>-- Select Owner Company --</option>
            <option v-for="c in companiesList" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-500">Description</label>
          <textarea
            v-model="description"
            rows="3"
            placeholder="Describe the ship vessel..."
            class="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-primary focus:border-primary text-slate-700"
          ></textarea>
        </div>

        <div v-if="isEditMode" class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-500">Status</label>
          <select
            v-model="status"
            class="w-full px-4 h-11 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-primary focus:border-primary text-slate-700"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </form>

      <template #footer>
        <UiButton variant="secondary" size="md" @click="isModalOpen = false">Cancel</UiButton>
        <UiButton variant="primary" size="md" :loading="submitting" @click="handleSubmit">
          {{ isEditMode ? 'Save Changes' : 'Register Ship' }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

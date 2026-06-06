<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'tenant']
})

useHead({
  title: 'Users'
})

const auth = useAuth()
const { data: usersRes, pending, refresh } = await useApi<any>('/api/v1/users')
const users = computed(() => usersRes.value?.data || [])

// Modal state
const isModalOpen = ref(false)
const name = ref('')
const email = ref('')
const password = ref('')
const role = ref('viewer')
const selectedCompanyId = ref('')
const formError = ref('')
const submitting = ref(false)

const tenant = useTenant()

const openAddModal = () => {
  name.value = ''
  email.value = ''
  password.value = ''
  role.value = 'viewer'
  selectedCompanyId.value = tenant.activeTenantId || ''
  formError.value = ''
  isModalOpen.value = true
}

const handleSubmit = async () => {
  submitting.value = true
  formError.value = ''
  
  const activeCompanyId = tenant.activeTenantId
  const targetCompanyId = auth.userRole === 'super_admin' ? selectedCompanyId.value : activeCompanyId

  if (!targetCompanyId) {
    formError.value = 'No company selected'
    submitting.value = false
    return
  }

  try {
    const registerRes = await useApiFetch('/api/v1/auth/register', {
      method: 'POST',
      body: {
        name: name.value,
        email: email.value,
        password: password.value,
        company_id: targetCompanyId
      }
    })

    if (registerRes.success && registerRes.data) {
      const newUser = registerRes.data.user
      
      // If a non-viewer role is selected, update it
      if (role.value !== 'viewer') {
        const roleRes = await useApiFetch(`/api/v1/users/${newUser.id}/role`, {
          method: 'PUT',
          body: { role: role.value },
          headers: {
            'X-Tenant-ID': targetCompanyId
          }
        })
        if (!roleRes.success) {
          formError.value = 'User created, but failed to assign selected role.'
          refresh()
          submitting.value = false
          return
        }
      }
      
      isModalOpen.value = false
      refresh()
    } else {
      formError.value = registerRes.message || 'Failed to create user'
    }
  } catch (err: any) {
    formError.value = err.response?._data?.message || 'An error occurred'
  } finally {
    submitting.value = false
  }
}

const handleRoleChange = async (id: string, newRole: string) => {
  try {
    const res = await useApiFetch(`/api/v1/users/${id}/role`, {
      method: 'PUT',
      body: { role: newRole }
    })
    if (res.success) {
      refresh()
    }
  } catch (err: any) {
    alert(err.response?._data?.message || 'Failed to update role')
  }
}

const handleDelete = async (id: string) => {
  if (!confirm('Are you sure you want to remove this user from the company?')) return
  try {
    const res = await useApiFetch(`/api/v1/users/${id}`, {
      method: 'DELETE'
    })
    if (res.success) {
      refresh()
    }
  } catch (err: any) {
    alert(err.response?._data?.message || 'Failed to delete user')
  }
}

const headers = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions' }
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Tenant Members</h2>
        <p class="text-xs text-slate-500 font-medium">Manage user credentials and application access roles.</p>
      </div>
      <UiButton
        v-if="['company_admin', 'super_admin'].includes(auth.userRole)"
        variant="primary"
        size="md"
        @click="openAddModal"
      >
        <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
        Add User
      </UiButton>
    </div>

    <!-- Users Table -->
    <UiTable :headers="headers" :items="users" :loading="pending" empty-text="No tenant members found.">
      <template #cell-name="{ item }">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
            {{ item.name.charAt(0) }}
          </div>
          <span class="font-bold text-slate-700 dark:text-slate-300">{{ item.name }}</span>
        </div>
      </template>

      <template #cell-role="{ item }">
        <select
          v-if="['company_admin', 'super_admin'].includes(auth.userRole) && item.id !== auth.user?.id"
          :value="item.role"
          @change="handleRoleChange(item.id, ($event.target as HTMLSelectElement).value)"
          class="h-8 pl-2 pr-6 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none cursor-pointer"
        >
          <option value="viewer">Viewer</option>
          <option value="operator">Operator</option>
          <option value="company_admin">Admin</option>
        </select>
        <span v-else class="text-xs font-bold text-slate-500 dark:text-slate-400 capitalize">
          {{ item.role }}
        </span>
      </template>

      <template #cell-status="{ item }">
        <UiBadge :variant="item.is_active ? 'success' : 'danger'" size="sm">
          {{ item.is_active ? 'Active' : 'Suspended' }}
        </UiBadge>
      </template>

      <template #cell-actions="{ item }">
        <div v-if="['company_admin', 'super_admin'].includes(auth.userRole) && item.id !== auth.user?.id">
          <UiButton
            variant="ghost"
            size="sm"
            class="text-rose-500 hover:text-rose-700"
            @click="handleDelete(item.id)"
          >
            <Icon name="heroicons:trash" class="w-4 h-4" />
          </UiButton>
        </div>
        <span v-else class="text-xs text-slate-400">-</span>
      </template>
    </UiTable>

    <!-- Modal Form -->
    <UiModal
      v-model="isModalOpen"
      title="Add New Member"
      size="md"
    >
      <div v-if="formError" class="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 rounded-lg">
        {{ formError }}
      </div>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <UiInput
          id="user-name"
          v-model="name"
          label="Full Name"
          placeholder="e.g. John Doe"
          required
        />

        <UiInput
          id="user-email"
          v-model="email"
          label="Email Address"
          type="email"
          placeholder="e.g. johndoe@company.com"
          required
        />

        <UiInput
          id="user-password"
          v-model="password"
          label="Temporary Password"
          type="password"
          placeholder="Min. 8 characters"
          required
        />

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-500">Access Role</label>
          <select
            v-model="role"
            class="w-full px-4 h-11 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          >
            <option value="viewer">Viewer</option>
            <option value="operator">Operator</option>
            <option value="company_admin">Admin</option>
          </select>
        </div>

        <div v-if="auth.userRole === 'super_admin'" class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-500">Company Access</label>
          <select
            v-model="selectedCompanyId"
            class="w-full px-4 h-11 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          >
            <option v-for="c in tenant.companies" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
        </div>
      </form>

      <template #footer>
        <UiButton variant="secondary" size="md" @click="isModalOpen = false">Cancel</UiButton>
        <UiButton variant="primary" size="md" :loading="submitting" @click="handleSubmit">
          Add Member
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'tenant']
})

useHead({
  title: 'Users'
})

const auth = useAuth()
const tenant = useTenant()
const { data: usersRes, pending, refresh } = await useApi<any>('/api/v1/users')
const users = computed(() => usersRes.value?.data || [])

// Modal state
const isModalOpen = ref(false)
const isEditing = ref(false)
const editingUserId = ref('')
const name = ref('')
const email = ref('')
const password = ref('')
const isLinkExisting = ref(false)
const selectedUserId = ref('')
const submitting = ref(false)
const formError = ref('')

// Table mappings state
const mappings = ref<{ company_id: string; role: string }[]>([])

// Get active role of user in the active tenant company
const getUserRole = (user: any) => {
  const comp = user.companies?.find((c: any) => c.company_id === tenant.activeTenantId)
  return comp?.role || 'viewer'
}

// Load all users from system for super admin linking
const { data: allUsersRes } = await useApi<any>('/api/v1/users') // Fallback endpoint or standard list
const systemUsers = computed(() => allUsersRes.value?.data || [])

const addMappingRow = () => {
  mappings.value.push({
    company_id: auth.userRole === 'super_admin' ? '' : (tenant.activeTenantId || ''),
    role: 'viewer'
  })
}

const removeMappingRow = (index: number) => {
  mappings.value.splice(index, 1)
}

const openAddModal = () => {
  isEditing.value = false
  isLinkExisting.value = false
  selectedUserId.value = ''
  name.value = ''
  email.value = ''
  password.value = ''
  mappings.value = [{
    company_id: tenant.activeTenantId || '',
    role: 'viewer'
  }]
  formError.value = ''
  isModalOpen.value = true
}

const openEditModal = (user: any) => {
  isEditing.value = true
  editingUserId.value = user.id
  name.value = user.name
  email.value = user.email
  password.value = ''
  
  if (user.companies && user.companies.length > 0) {
    mappings.value = user.companies.map((c: any) => ({
      company_id: c.company_id,
      role: c.role
    }))
  } else {
    mappings.value = [{
      company_id: tenant.activeTenantId || '',
      role: 'viewer'
    }]
  }
  formError.value = ''
  isModalOpen.value = true
}

const handleSubmit = async () => {
  submitting.value = true
  formError.value = ''

  // Validate mappings
  if (mappings.value.length === 0) {
    formError.value = 'Please map at least one company.'
    submitting.value = false
    return
  }

  for (const mapping of mappings.value) {
    if (!mapping.company_id) {
      formError.value = 'Please select a company for all mappings.'
      submitting.value = false
      return
    }
  }

  try {
    let targetUserId = ''

    if (isEditing.value) {
      // Update user details
      const updateRes = await useApiFetch(`/api/v1/users/${editingUserId.value}`, {
        method: 'PUT',
        body: {
          name: name.value
        }
      })
      if (!updateRes.success) {
        formError.value = updateRes.message || 'Failed to update user profile'
        submitting.value = false
        return
      }
      targetUserId = editingUserId.value
    } else if (isLinkExisting.value) {
      if (!selectedUserId.value) {
        formError.value = 'Please select a user to link'
        submitting.value = false
        return
      }
      targetUserId = selectedUserId.value
    } else {
      // Register new user first
      const registerRes = await useApiFetch('/api/v1/auth/register', {
        method: 'POST',
        body: {
          name: name.value,
          email: email.value,
          password: password.value,
          company_id: mappings.value[0].company_id
        }
      })

      if (registerRes.success && registerRes.data) {
        targetUserId = registerRes.data.user.id
      } else {
        formError.value = registerRes.message || 'Failed to create user'
        submitting.value = false
        return
      }
    }

    // Sync all company mappings via the table using PUT /api/v1/users/:id/companies
    const syncRes = await useApiFetch(`/api/v1/users/${targetUserId}/companies`, {
      method: 'PUT',
      body: {
        companies: mappings.value
      }
    })

    if (syncRes.success) {
      isModalOpen.value = false
      refresh()
    } else {
      formError.value = syncRes.message || 'Failed to update company access mapping'
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
          :value="getUserRole(item)"
          @change="handleRoleChange(item.id, ($event.target as HTMLSelectElement).value)"
          class="h-8 pl-2 pr-6 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none cursor-pointer"
        >
          <option value="viewer">Viewer</option>
          <option value="operator">Operator</option>
          <option value="company_admin">Admin</option>
        </select>
        <span v-else class="text-xs font-bold text-slate-500 dark:text-slate-400 capitalize">
          {{ getUserRole(item) }}
        </span>
      </template>

      <template #cell-status="{ item }">
        <UiBadge :variant="item.is_active ? 'success' : 'danger'" size="sm">
          {{ item.is_active ? 'Active' : 'Suspended' }}
        </UiBadge>
      </template>

      <template #cell-actions="{ item }">
        <div class="flex items-center gap-2" v-if="['company_admin', 'super_admin'].includes(auth.userRole) && item.id !== auth.user?.id">
          <UiButton
            variant="ghost"
            size="sm"
            class="text-slate-500 hover:text-slate-700"
            @click="openEditModal(item)"
          >
            <Icon name="heroicons:pencil" class="w-4 h-4" />
          </UiButton>
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
      :title="isEditing ? 'Edit User' : 'Add New Member'"
      size="md"
    >
      <div v-if="formError" class="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 rounded-lg">
        {{ formError }}
      </div>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <!-- Selector for registration type (Only when creating) -->
        <div v-if="!isEditing" class="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
          <label class="flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors" :class="!isLinkExisting ? 'bg-white dark:bg-slate-800 shadow text-slate-800 dark:text-white' : 'text-slate-400'">
            <input type="radio" :value="false" v-model="isLinkExisting" class="sr-only" />
            Create Account
          </label>
          <label class="flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors" :class="isLinkExisting ? 'bg-white dark:bg-slate-800 shadow text-slate-800 dark:text-white' : 'text-slate-400'">
            <input type="radio" :value="true" v-model="isLinkExisting" class="sr-only" />
            Link Existing User
          </label>
        </div>

        <template v-if="!isEditing && isLinkExisting">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-slate-500">Select User</label>
            <select
              v-model="selectedUserId"
              required
              class="w-full px-4 h-11 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <option value="" disabled>-- Select Existing User --</option>
              <option v-for="user in systemUsers" :key="user.id" :value="user.id">
                {{ user.name }} ({{ user.email }})
              </option>
            </select>
          </div>
        </template>

        <template v-else>
          <UiInput
            id="user-name"
            v-model="name"
            label="Full Name"
            placeholder="e.g. John Doe"
            required
          />

          <UiInput
            v-if="!isEditing"
            id="user-email"
            v-model="email"
            label="Email Address"
            type="email"
            placeholder="e.g. johndoe@company.com"
            required
          />

          <UiInput
            v-if="!isEditing"
            id="user-password"
            v-model="password"
            label="Temporary Password"
            type="password"
            placeholder="Min. 8 characters"
            required
          />
        </template>

        <!-- Dynamic Company Mappings Table Input -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-semibold text-slate-500">Company Access Mappings</label>
            <UiButton
              v-if="auth.userRole === 'super_admin'"
              type="button"
              variant="ghost"
              size="sm"
              class="text-primary hover:text-primary-hover font-bold text-xs"
              @click="addMappingRow"
            >
              <Icon name="heroicons:plus" class="w-4 h-4 mr-1" /> Add Mapping
            </UiButton>
          </div>
          <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                  <th class="px-3 py-2">Company</th>
                  <th class="px-3 py-2 w-36">Role</th>
                  <th v-if="auth.userRole === 'super_admin' && mappings.length > 1" class="px-3 py-2 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(mapping, idx) in mappings" :key="idx" class="border-b border-slate-100 dark:border-slate-800/50">
                  <td class="px-3 py-2">
                    <select
                      v-model="mapping.company_id"
                      :disabled="auth.userRole !== 'super_admin'"
                      class="w-full h-9 px-2 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:ring-1 focus:ring-primary dark:bg-slate-950"
                    >
                      <option value="" disabled>-- Select Company --</option>
                      <option v-for="c in tenant.companies" :key="c.id" :value="c.id">
                        {{ c.name }}
                      </option>
                    </select>
                  </td>
                  <td class="px-3 py-2">
                    <select
                      v-model="mapping.role"
                      class="w-full h-9 px-2 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:ring-1 focus:ring-primary dark:bg-slate-950"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="operator">Operator</option>
                      <option value="company_admin">Admin</option>
                      <option v-if="auth.userRole === 'super_admin'" value="super_admin">Super Admin</option>
                    </select>
                  </td>
                  <td v-if="auth.userRole === 'super_admin' && mappings.length > 1" class="px-3 py-2 text-center">
                    <button type="button" @click="removeMappingRow(idx)" class="text-rose-500 hover:text-rose-700">
                      <Icon name="heroicons:trash" class="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </form>

      <template #footer>
        <UiButton variant="secondary" size="md" @click="isModalOpen = false">Cancel</UiButton>
        <UiButton variant="primary" size="md" :loading="submitting" @click="handleSubmit">
          {{ isEditing ? 'Save Changes' : 'Add Member' }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

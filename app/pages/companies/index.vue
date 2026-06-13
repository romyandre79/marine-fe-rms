<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

useHead({
  title: 'Companies'
})

const auth = useAuth()

// Ensure only super_admin can access this page
onMounted(() => {
  if (auth.userRole !== 'super_admin') {
    navigateTo('/dashboard')
  }
})

const { data: companiesRes, pending, refresh } = await useFetch<any>('http://localhost:3004/api/v1/companies', {
  headers: {
    Authorization: `Bearer ${useCookie('mms_token').value}`
  }
})

const companies = computed(() => {
  const data = companiesRes.value?.data || []
  return data.map((c: any) => ({
    id: c.ID !== undefined ? c.ID : c.id,
    name: c.Name !== undefined ? c.Name : c.name,
    slug: c.Slug !== undefined ? c.Slug : c.slug,
    email: c.Email !== undefined ? c.Email : c.email,
    phone: c.Phone !== undefined ? c.Phone : c.phone,
    address: c.Address !== undefined ? c.Address : c.address,
    website: c.Website !== undefined ? c.Website : c.website
  }))
})

// Modal state
const isModalOpen = ref(false)
const isEditMode = ref(false)
const activeCompanyId = ref<string | null>(null)

// Form fields
const name = ref('')
const slug = ref('')
const email = ref('')
const phone = ref('')
const address = ref('')
const website = ref('')
const formError = ref('')
const submitting = ref(false)

const openAddModal = () => {
  isEditMode.value = false
  activeCompanyId.value = null
  name.value = ''
  slug.value = ''
  email.value = ''
  phone.value = ''
  address.value = ''
  website.value = ''
  formError.value = ''
  isModalOpen.value = true
}

const openEditModal = (company: any) => {
  isEditMode.value = true
  activeCompanyId.value = company.id
  name.value = company.name
  slug.value = company.slug
  email.value = company.email
  phone.value = company.phone || ''
  address.value = company.address || ''
  website.value = company.website || ''
  formError.value = ''
  isModalOpen.value = true
}

// Automatically generate slug from name
watch(name, (newName) => {
  if (!isEditMode.value) {
    slug.value = newName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
  }
})

const handleSubmit = async () => {
  submitting.value = true
  formError.value = ''
  
  const body = {
    name: name.value,
    slug: slug.value,
    email: email.value,
    phone: phone.value,
    address: address.value,
    website: website.value
  }

  try {
    let res
    if (isEditMode.value && activeCompanyId.value) {
      // 1. Update in MMS
      res = await $fetch<any>(`http://localhost:3004/api/v1/companies/${activeCompanyId.value}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${useCookie('mms_token').value}`,
          'Content-Type': 'application/json'
        },
        body
      })
      
      if (res.success) {
        // 2. Sync to RMS
        await useApiFetch(`/api/v1/companies/${activeCompanyId.value}`, {
          method: 'PUT',
          body: {
            id: activeCompanyId.value,
            ...body
          }
        })
      }
    } else {
      // 1. Create in MMS
      res = await $fetch<any>('http://localhost:3004/api/v1/companies', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${useCookie('mms_token').value}`,
          'Content-Type': 'application/json'
        },
        body
      })
      
      if (res.success && res.data) {
        const createdCompany = res.data
        const newId = createdCompany.ID || createdCompany.id
        // 2. Sync to RMS
        await useApiFetch('/api/v1/companies', {
          method: 'POST',
          body: {
            id: newId,
            ...body
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

const headers = [
  { key: 'name', label: 'Company Name' },
  { key: 'slug', label: 'Slug' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'actions', label: 'Actions' }
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Registered Companies</h2>
        <p class="text-xs text-slate-500 font-medium">Manage corporate accounts and active client tenants.</p>
      </div>
      <UiButton
        v-if="auth.userRole === 'super_admin'"
        variant="primary"
        size="md"
        @click="openAddModal"
      >
        <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
        Add Company
      </UiButton>
    </div>

    <!-- Table list -->
    <UiTable :headers="headers" :items="companies" :loading="pending" empty-text="No registered companies found.">
      <template #cell-name="{ item }">
        <div>
          <div class="font-semibold text-slate-800 dark:text-slate-200">{{ item.name }}</div>
          <div class="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5 select-all">{{ item.id }}</div>
        </div>
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
        </div>
      </template>
    </UiTable>

    <!-- Modal Form -->
    <UiModal
      v-model="isModalOpen"
      :title="isEditMode ? 'Edit Company Profile' : 'Register New Company'"
      size="md"
    >
      <div v-if="formError" class="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 rounded-lg">
        {{ formError }}
      </div>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <UiInput
          id="company-name"
          v-model="name"
          label="Company Name"
          placeholder="e.g. Acme Corporation"
          required
        />

        <UiInput
          id="company-slug"
          v-model="slug"
          label="Slug"
          placeholder="e.g. acme-corp"
          required
          :disabled="isEditMode"
        />

        <UiInput
          id="company-email"
          v-model="email"
          label="Email Address"
          type="email"
          placeholder="e.g. admin@company.com"
          required
        />

        <UiInput
          id="company-phone"
          v-model="phone"
          label="Phone Number"
          placeholder="e.g. +62812345678"
        />

        <UiInput
          id="company-website"
          v-model="website"
          label="Website URL"
          placeholder="e.g. https://company.com"
        />

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-500">Address</label>
          <textarea
            v-model="address"
            rows="3"
            placeholder="e.g. 123 Main St, Jakarta"
            class="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          ></textarea>
        </div>
      </form>

      <template #footer>
        <UiButton variant="secondary" size="md" @click="isModalOpen = false">Cancel</UiButton>
        <UiButton variant="primary" size="md" :loading="submitting" @click="handleSubmit">
          {{ isEditMode ? 'Save Changes' : 'Register Company' }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

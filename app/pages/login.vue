<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

useHead({
  title: 'Sign In'
})

const email = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')
const loading = ref(false)

const auth = useAuth()

const handleLogin = async () => {
  loading.value = true
  emailError.value = ''
  passwordError.value = ''
  
  // Basic validation
  if (!email.value.includes('@')) {
    emailError.value = 'Please enter a valid email address'
    loading.value = false
    return
  }
  if (password.value.length < 6) {
    passwordError.value = 'Password must be at least 6 characters'
    loading.value = false
    return
  }

  try {
    const success = await auth.login({
      email: email.value,
      password: password.value
    })
    
    if (success) {
      navigateTo('/dashboard')
    } else {
      emailError.value = 'Invalid email or password'
      passwordError.value = 'Invalid email or password'
    }
  } catch (err: any) {
    const msg = err.response?._data?.message || 'Login failed. Please check connection.'
    if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('user')) {
      emailError.value = msg
    } else if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('credential')) {
      passwordError.value = msg
    } else {
      emailError.value = msg
      passwordError.value = msg
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="bg-slate-800/80 backdrop-blur border border-slate-700 p-8 rounded-xl shadow-xl w-full flex flex-col gap-6">
    <div class="text-center flex flex-col gap-1.5">
      <h2 class="text-2xl font-bold tracking-tight text-white">Sign in to RMS</h2>
      <p class="text-xs text-slate-400 font-medium">Enter your credentials to access your dashboard</p>
    </div>

    <form @submit.prevent="handleLogin" class="flex flex-col gap-4">
      <UiInput
        id="email"
        v-model="email"
        label="Email address"
        type="email"
        placeholder="name@company.com"
        required
        :error="emailError"
        @input="emailError = ''"
        class="text-white"
      />

      <UiInput
        id="password"
        v-model="password"
        label="Password"
        type="password"
        placeholder="••••••••"
        required
        :error="passwordError"
        @input="passwordError = ''"
        class="text-white"
      />

      <UiButton
        type="submit"
        variant="primary"
        size="lg"
        class="w-full mt-2"
        :loading="loading"
      >
        Sign In
      </UiButton>
    </form>
  </div>
</template>

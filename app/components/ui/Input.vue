<script setup lang="ts">
interface Props {
  modelValue: string | number
  label?: string
  type?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  required?: boolean
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  error: '',
  disabled: false,
  required: false,
  id: () => `input-${Math.random().toString(36).substr(2, 9)}`
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus'])

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="w-full flex flex-col gap-1.5">
    <label
      v-if="label"
      :for="id"
      class="text-xs font-semibold text-slate-600 dark:text-slate-400"
    >
      {{ label }} <span v-if="required" class="text-danger">*</span>
    </label>
    
    <input
      :id="id"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      @input="onInput"
      @blur="emit('blur', $event)"
      @focus="emit('focus', $event)"
      class="w-full px-4 h-11 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border rounded-lg transition-all duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      :class="[
        error
          ? 'border-danger focus:ring-1 focus:ring-danger focus:border-danger'
          : 'border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-primary focus:border-primary'
      ]"
    />

    <span v-if="error" class="text-[11px] font-medium text-danger">
      {{ error }}
    </span>
  </div>
</template>

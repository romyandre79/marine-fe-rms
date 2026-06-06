<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'
  size?: 'sm' | 'md'
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md'
})
</script>

<template>
  <span
    class="inline-flex items-center font-semibold rounded-full uppercase tracking-wider"
    :class="[
      // Size styles
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',

      // Variant styles
      variant === 'primary' && 'bg-primary/10 text-primary',
      variant === 'secondary' && 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
      variant === 'success' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      variant === 'danger' && 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      variant === 'warning' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      variant === 'info' && 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
    ]"
  >
    <slot />
  </span>
</template>

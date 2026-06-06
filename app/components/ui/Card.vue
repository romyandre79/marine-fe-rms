<script setup lang="ts">
interface Props {
  hoverable?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

withDefaults(defineProps<Props>(), {
  hoverable: false,
  padding: 'md'
})
</script>

<template>
  <div
    class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm transition-all duration-300"
    :class="[
      hoverable && 'hover:shadow-md hover:translate-y-[-2px] cursor-pointer',
      padding === 'none' && 'p-0',
      padding === 'sm' && 'p-4',
      padding === 'md' && 'p-6',
      padding === 'lg' && 'p-8'
    ]"
  >
    <div v-if="$slots.header" class="pb-4 mb-4 border-b border-slate-100 dark:border-slate-700/50">
      <slot name="header" />
    </div>
    
    <div>
      <slot />
    </div>

    <div v-if="$slots.footer" class="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/50">
      <slot name="footer" />
    </div>
  </div>
</template>

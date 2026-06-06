<script setup lang="ts" generic="T = any">
interface Header {
  key: string
  label: string
  sortable?: boolean
}

interface Props {
  headers: Header[]
  items: T[]
  loading?: boolean
  emptyText?: string
}

withDefaults(defineProps<Props>(), {
  loading: false,
  emptyText: 'No data available'
})

defineEmits(['sort'])
</script>

<template>
  <div class="w-full overflow-hidden border border-slate-200 dark:border-slate-700/80 rounded-xl">
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <!-- Header -->
        <thead class="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
          <tr>
            <th
              v-for="header in headers"
              :key="header.key"
              class="px-6 py-4 border-b border-slate-200 dark:border-slate-700/80 cursor-pointer select-none"
              @click="header.sortable && $emit('sort', header.key)"
            >
              <div class="flex items-center gap-1.5">
                {{ header.label }}
                <Icon v-if="header.sortable" name="heroicons:chevron-up-down" class="w-3.5 h-3.5 text-slate-400" />
              </div>
            </th>
          </tr>
        </thead>

        <!-- Body -->
        <tbody class="divide-y divide-slate-100 dark:divide-slate-700/40 text-sm text-slate-700 dark:text-slate-300">
          <tr v-if="loading">
            <td :colspan="headers.length" class="px-6 py-8">
              <div class="flex flex-col gap-3">
                <div v-for="i in 3" :key="i" class="h-4 bg-slate-100 dark:bg-slate-800 animate-pulse rounded w-full" />
              </div>
            </td>
          </tr>
          
          <tr v-else-if="items.length === 0">
            <td :colspan="headers.length" class="px-6 py-10 text-center text-slate-400 dark:text-slate-500">
              <div class="flex flex-col items-center justify-center gap-2">
                <Icon name="heroicons:inbox" class="w-8 h-8 opacity-40" />
                <span>{{ emptyText }}</span>
              </div>
            </td>
          </tr>

          <tr
            v-else
            v-for="(item, index) in items"
            :key="index"
            class="hover:bg-slate-55/40 dark:hover:bg-slate-800/30 transition-colors"
          >
            <td
              v-for="header in headers"
              :key="header.key"
              class="px-6 py-4 whitespace-nowrap"
            >
              <slot :name="`cell-${header.key}`" :item="item">
                {{ (item as any)[header.key] }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

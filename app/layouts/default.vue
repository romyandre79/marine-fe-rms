<script setup lang="ts">
// Main layout with Sidebar and Header
</script>

<template>
  <div class="flex h-screen w-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans">
    <!-- Sidebar -->
    <LayoutSidebar />

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Header -->
      <LayoutHeader />

      <!-- Page Content -->
      <main class="flex-1 p-8 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

<template>
  <div ref="mapEl" class="w-full rounded-b-xl" style="height: 440px;" />
</template>

<script setup lang="ts">
export interface VesselPosition {
  ship_id: string
  ship_name: string
  ship_status: string
  latitude: number | null
  longitude: number | null
  last_updated: string | null
}

const props = defineProps<{
  positions: VesselPosition[]
  focusId?: string | null
}>()

const mapEl = ref<HTMLElement | null>(null)
const mapReady = ref(false)
let map: any = null
let L: any = null
const markerMap: Record<string, any> = {}

function statusColor(status: string): string {
  switch (status) {
    case 'active':   return '#10b981'
    case 'inactive': return '#94a3b8'
    default:         return '#3b82f6'
  }
}

function shipIcon(status: string) {
  const color = statusColor(status)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
    <polygon points="18,2 34,30 18,25 2,30" fill="${color}" stroke="white" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="18" cy="12" r="3.5" fill="white"/>
  </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 30],
    popupAnchor: [0, -30]
  })
}

function popupHtml(pos: VesselPosition): string {
  const lat = pos.latitude?.toFixed(6) ?? '-'
  const lng = pos.longitude?.toFixed(6) ?? '-'
  const updated = pos.last_updated
    ? new Date(pos.last_updated).toLocaleString()
    : 'Unknown'
  const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusColor(pos.ship_status)};margin-right:4px;"></span>`
  const detailUrl = `/monitoring?ship_id=${encodeURIComponent(pos.ship_id)}&ship_name=${encodeURIComponent(pos.ship_name)}`
  return `
    <div style="min-width:210px;font-family:system-ui,sans-serif;">
      <div style="font-size:14px;font-weight:700;margin-bottom:4px;">${pos.ship_name}</div>
      <div style="font-size:12px;color:#6b7280;margin-bottom:8px;">${dot}${pos.ship_status}</div>
      <div style="font-size:11px;line-height:1.9;color:#374151;margin-bottom:10px;">
        <span style="color:#9ca3af;">LAT</span> ${lat}<br/>
        <span style="color:#9ca3af;">LNG</span> ${lng}<br/>
        <span style="color:#9ca3af;">UPD</span> ${updated}
      </div>
      <a href="${detailUrl}"
         style="display:block;text-align:center;background:#3b82f6;color:#fff;font-size:11px;font-weight:600;padding:6px 12px;border-radius:6px;text-decoration:none;">
        Lihat Detail Monitoring
      </a>
    </div>
  `
}

function syncMarkers() {
  if (!mapReady.value || !map || !L) return

  const valid = props.positions.filter(p => p.latitude != null && p.longitude != null)
  const validIds = new Set(valid.map(p => p.ship_id))

  for (const id of Object.keys(markerMap)) {
    if (!validIds.has(id)) {
      markerMap[id].remove()
      delete markerMap[id]
    }
  }

  for (const pos of valid) {
    const latlng: [number, number] = [pos.latitude as number, pos.longitude as number]
    const icon = shipIcon(pos.ship_status)
    const popup = popupHtml(pos)

    if (markerMap[pos.ship_id]) {
      markerMap[pos.ship_id].setLatLng(latlng).setIcon(icon).getPopup()?.setContent(popup)
    } else {
      markerMap[pos.ship_id] = L.marker(latlng, { icon })
        .addTo(map)
        .bindPopup(popup)
    }
  }

  // If a vessel is focused, zoom to it; otherwise fit all vessels
  if (props.focusId && markerMap[props.focusId]) {
    const m = markerMap[props.focusId]
    map.flyTo(m.getLatLng(), 12, { animate: true, duration: 1.2 })
    m.openPopup()
  } else if (valid.length === 1) {
    map.setView([valid[0].latitude as number, valid[0].longitude as number], 9)
  } else if (valid.length > 1) {
    const bounds = valid.map(p => [p.latitude, p.longitude] as [number, number])
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 10 })
  }
}

// Zoom when focusId changes (null = fit all, string = fly to vessel)
watch(() => props.focusId, (id) => {
  if (!mapReady.value || !map) return
  if (id && markerMap[id]) {
    map.flyTo(markerMap[id].getLatLng(), 12, { animate: true, duration: 1.2 })
    markerMap[id].openPopup()
  } else if (!id) {
    // Back to "All Vessels" — fit all visible markers
    const valid = props.positions.filter(p => p.latitude != null && p.longitude != null)
    if (valid.length > 1) {
      map.fitBounds(
        valid.map(p => [p.latitude, p.longitude] as [number, number]),
        { padding: [60, 60], maxZoom: 10, animate: true }
      )
    } else if (valid.length === 1) {
      map.flyTo([valid[0].latitude as number, valid[0].longitude as number], 9, { animate: true })
    }
  }
})

// Re-run syncMarkers whenever map becomes ready OR positions change
watch([mapReady, () => props.positions], syncMarkers, { deep: true })

onMounted(async () => {
  if (!mapEl.value) return

  L = (await import('leaflet')).default

  map = L.map(mapEl.value, { zoomControl: true }).setView([-2.5, 118.0], 5)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map)

  // Signal that map is ready — triggers the watch above
  mapReady.value = true
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
    mapReady.value = false
  }
})
</script>

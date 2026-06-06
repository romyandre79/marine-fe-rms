export const useWebSocket = () => {
  const socket = ref<WebSocket | null>(null)
  const isConnected = ref(false)
  const listeners = new Map<string, Set<(data: any) => void>>()

  const tokenCookie = useCookie('access_token')
  const config = useRuntimeConfig()
  
  // Resolve base WebSocket URL
  const wsBaseUrl = (config.public.wsUrl as string) || 'ws://localhost:8080/ws'

  const connect = () => {
    if (socket.value || !tokenCookie.value) return

    const wsUrl = `${wsBaseUrl}?token=${tokenCookie.value}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket connection established')
      isConnected.value = true
      socket.value = ws
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        // message structure typically: { type: 'alert', channel: '...', payload: {} }
        const typeListeners = listeners.get(message.type)
        if (typeListeners) {
          typeListeners.forEach(cb => cb(message.payload || message))
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err)
      }
    }

    ws.onclose = () => {
      console.log('WebSocket connection closed')
      isConnected.value = false
      socket.value = null
      // Auto-reconnect in 5 seconds
      setTimeout(connect, 5000)
    }

    ws.onerror = (err) => {
      console.error('WebSocket error:', err)
      ws.close()
    }
  }

  const disconnect = () => {
    if (socket.value) {
      socket.value.close()
    }
  }

  const on = (type: string, callback: (data: any) => void) => {
    if (!listeners.has(type)) {
      listeners.set(type, new Set())
    }
    listeners.get(type)!.add(callback)
    
    // Auto connect if listener is registered and not connected
    if (!isConnected.value) {
      connect()
    }

    // Return unsubscribe function
    return () => {
      const typeListeners = listeners.get(type)
      if (typeListeners) {
        typeListeners.delete(callback)
      }
    }
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    isConnected,
    on,
    connect,
    disconnect
  }
}

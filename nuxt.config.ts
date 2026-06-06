// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  devServer: {
    port: parseInt(process.env.PORT || '3000')
  },
  app: {
    head: {
      title: 'Remote Monitoring System',
      titleTemplate: '%s - Remote Monitoring System',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Vessel Remote Monitoring System' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },
  css: ['~/assets/css/main.css'],
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/fonts',
    'nuxt-security',
    '@nuxt/icon'
  ],
  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1',
      wsUrl: process.env.NUXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws',
      appName: process.env.NUXT_PUBLIC_APP_NAME || 'Remote Monitoring System',
      appVersion: process.env.NUXT_PUBLIC_APP_VERSION || '1.0.0'
    }
  },
  security: {
    headers: {
      contentSecurityPolicy: {
        'img-src': ["'self'", "data:", "https:"],
        'connect-src': ["'self'", "ws:", "wss:", "http:", "https:"]
      },
      crossOriginEmbedderPolicy: 'unsafe-none'
    },
    cors: {
      origin: '*',
      methods: '*'
    }
  },
  future: {
    compatibilityVersion: 4
  }
})

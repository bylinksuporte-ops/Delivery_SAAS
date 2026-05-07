'use client'

import { useState, useEffect } from 'react'

export function usePushNotifications(orderUrl: string) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
      setSubscribed(Notification.permission === 'granted')
    }
  }, [])

  async function subscribe() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return

    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm === 'granted') {
        setSubscribed(true)
        // Notificação de confirmação
        reg.showNotification('Notificações ativadas! 🔔', {
          body: 'Você receberá atualizações do seu pedido.',
          icon: '/icon-192.png',
          tag: 'subscribe-confirm',
        })
      }
    } catch { /* silencia erros de SW */ }
  }

  function notifyLocally(title: string, body: string) {
    if (Notification.permission !== 'granted') return
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, {
        body,
        icon: '/icon-192.png',
        tag: 'order-status',
        data: { url: orderUrl },
      })
    })
  }

  return { permission, subscribed, subscribe, notifyLocally }
}

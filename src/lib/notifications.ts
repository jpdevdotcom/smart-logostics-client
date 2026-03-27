export type NotificationTone = 'info' | 'success' | 'warning' | 'error'

export type NotificationPayload = {
  title: string
  message?: string
  tone?: NotificationTone
}

type Listener = (payload: NotificationPayload) => void

const listeners = new Set<Listener>()

export function subscribeNotifications(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function pushNotification(payload: NotificationPayload) {
  listeners.forEach((listener) => listener(payload))

  const logPrefix = payload.tone ? payload.tone.toUpperCase() : 'INFO'
  const message = payload.message ? ` - ${payload.message}` : ''
  // eslint-disable-next-line no-console
  console.info(`[${logPrefix}] ${payload.title}${message}`)
}

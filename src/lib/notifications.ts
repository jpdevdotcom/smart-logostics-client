import { toast } from 'sonner'

export type NotificationTone = 'info' | 'success' | 'warning' | 'error'

export type NotificationPayload = {
  title: string
  message?: string
  tone?: NotificationTone
}

export type LoadingToast = {
  id: string | number
  updateSuccess: (payload: NotificationPayload) => void
  updateError: (payload: NotificationPayload) => void
  dismiss: () => void
}

export function pushLoading(title: string, message?: string): LoadingToast {
  const id = toast.loading(title, { description: message })
  return {
    id,
    updateSuccess: (payload) => {
      toast.success(payload.title, {
        id,
        description: payload.message,
      })
    },
    updateError: (payload) => {
      toast.error(payload.title, {
        id,
        description: payload.message,
      })
    },
    dismiss: () => {
      toast.dismiss(id)
    },
  }
}

export function pushNotification(payload: NotificationPayload) {
  const description = payload.message
  const tone = payload.tone ?? 'info'

  if (tone === 'success') {
    toast.success(payload.title, { description })
  } else if (tone === 'error') {
    toast.error(payload.title, { description })
  } else if (tone === 'warning') {
    toast.warning(payload.title, { description })
  } else {
    toast(payload.title, { description })
  }

  const logPrefix = tone.toUpperCase()
  const message = payload.message ? ` - ${payload.message}` : ''
  // eslint-disable-next-line no-console
  console.info(`[${logPrefix}] ${payload.title}${message}`)
}

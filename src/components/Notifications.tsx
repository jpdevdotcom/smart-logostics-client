import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '#/lib/utils'
import {
  type NotificationPayload,
  type NotificationTone,
  subscribeNotifications,
} from '#/lib/notifications'
import { Card } from '#/components/ui/card'
import { Button } from '#/components/ui/button'

const toneIcons: Record<NotificationTone, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
}

type NotificationItem = NotificationPayload & {
  id: string
  createdAt: number
  tone: NotificationTone
}

const DEFAULT_TONE: NotificationTone = 'info'

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  useEffect(() => {
    return subscribeNotifications((payload) => {
      const tone = payload.tone ?? DEFAULT_TONE
      const item: NotificationItem = {
        ...payload,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        tone,
      }
      setNotifications((prev) => [item, ...prev].slice(0, 4))
    })
  }, [])

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id))
  }

  const items = useMemo(() => notifications, [notifications])

  if (items.length === 0) return null

  return (
    <div className="pointer-events-none fixed right-6 top-20 z-[60] flex w-[320px] flex-col gap-3">
      {items.map((item) => {
        const Icon = toneIcons[item.tone]
        return (
          <Card
            key={item.id}
            className={cn(
              'pointer-events-auto border bg-white/95 shadow-lg backdrop-blur',
              item.tone === 'success' && 'border-emerald-200',
              item.tone === 'error' && 'border-rose-200',
              item.tone === 'warning' && 'border-amber-200'
            )}
          >
            <div className="flex items-start gap-3 p-4">
              <span
                className={cn(
                  'mt-0.5 rounded-full p-1 text-blue-600',
                  item.tone === 'success' && 'text-emerald-600',
                  item.tone === 'error' && 'text-rose-600',
                  item.tone === 'warning' && 'text-amber-600'
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {item.title}
                </p>
                {item.message ? (
                  <p className="mt-1 text-xs text-slate-600">{item.message}</p>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                className="h-6 w-6 text-slate-500"
                onClick={() => removeNotification(item.id)}
              >
                <span className="sr-only">Dismiss</span>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

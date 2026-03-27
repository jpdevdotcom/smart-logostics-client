import * as React from 'react'
import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      richColors
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            'rounded-xl border border-slate-200 bg-white text-slate-900',
          title: 'text-sm font-semibold',
          description: 'text-xs text-slate-600',
          actionButton: 'bg-blue-600 text-white',
          cancelButton: 'bg-slate-100 text-slate-700',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

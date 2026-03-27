import { Outlet, createRootRoute, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useEffect } from 'react'

import '../styles.css'
import Header from '#/components/Header'
import Footer from '#/components/Footer'
import { Toaster } from '#/components/ui/sonner'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Overview',
      '/warehouses': 'Warehouses',
      '/inventory': 'Inventory',
      '/items': 'Items',
    }
    const suffix = titles[pathname] ?? 'Dashboard'
    document.title = `Smart Logistics | ${suffix}`
  }, [pathname])

  return (
    <div className="app-shell">
      <Header />
      <Toaster position="top-right" />
      <Outlet />
      <Footer />
      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'TanStack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </div>
  )
}

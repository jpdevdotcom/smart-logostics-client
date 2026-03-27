import { createFileRoute } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <main className="page-wrap px-4 py-12">
      <section className="grid gap-6">
        <Card className="hero-card">
          <CardHeader>
            <p className="section-kicker">API Connection</p>
            <CardTitle className="text-3xl">Smart Logistics Platform</CardTitle>
            <p className="text-sm text-slate-600">
              This client is wired to the hosted Render API and surfaces server
              messages through interceptors. Update the base URL with a
              `VITE_API_BASE_URL` env value if you need to point to a different
              environment.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Base URL
              </p>
              <p className="text-sm font-semibold text-slate-900">
                https://smart-logistics-api-cb2c.onrender.com
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary">Render Hosted</Badge>
              <Badge>REST API</Badge>
              <Badge>Perishables Tracking</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Postman Documentation</CardTitle>
            <p className="text-sm text-slate-600">
              Reference the full endpoint list and payload shapes in the Postman
              documentation.
            </p>
          </CardHeader>
          <CardContent>
            <a
              href="https://documenter.getpostman.com/view/29373209/2sBXikoWvW"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Open API docs
              <ExternalLink className="h-4 w-4" />
            </a>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

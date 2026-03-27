import { Link } from '@tanstack/react-router'
import { PackageCheck } from 'lucide-react'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <nav className="page-wrap flex flex-wrap items-center gap-4 px-4 py-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
            <PackageCheck className="h-5 w-5" />
          </span>
          Smart Logistics
        </Link>

        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600">
          <Link to="/" className="nav-link">
            Overview
          </Link>
          <Link to="/warehouses" className="nav-link">
            Warehouses
          </Link>
          <Link to="/inventory" className="nav-link">
            Inventory
          </Link>
          <Link to="/items" className="nav-link">
            Items
          </Link>
        </div>
      </nav>
    </header>
  )
}

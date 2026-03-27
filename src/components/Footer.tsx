export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-slate-200/80 bg-white/70 px-4 py-10">
      <div className="page-wrap flex flex-col gap-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0">&copy; {year} Smart Logistics. All rights reserved.</p>
        <p className="m-0">
          Built for multi-warehouse operations with perishable tracking.
        </p>
      </div>
    </footer>
  )
}

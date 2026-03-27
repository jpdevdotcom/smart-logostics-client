import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { cn } from '#/lib/utils'
import { Input } from '#/components/ui/input'

export type ComboboxOption = {
  value: string
  label: string
  keywords?: string
}

type ComboboxProps = {
  value: string
  options: ComboboxOption[]
  placeholder?: string
  searchPlaceholder?: string
  onChange: (value: string) => void
}

export function Combobox({
  value,
  options,
  placeholder = 'Select option',
  searchPlaceholder = 'Search...',
  onChange,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement | null>(null)

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  )

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return options
    return options.filter((option) => {
      const target = `${option.label} ${option.keywords ?? ''}`.toLowerCase()
      return target.includes(term)
    })
  }, [options, query])

  useEffect(() => {
    if (!open) {
      setQuery('')
    }
  }, [open])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 text-left text-sm text-slate-700 transition hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200'
        )}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{selected?.label ?? placeholder}</span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open ? (
        <div className="absolute z-40 mt-2 w-full rounded-xl border border-slate-200 bg-white p-2">
          <div className="flex items-center gap-2 rounded-md border border-slate-200 px-2">
            <Search className="h-4 w-4 text-slate-400" />
            <Input
              className="h-8 border-0 px-1 shadow-none focus-visible:ring-0"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="mt-2 max-h-52 overflow-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-500">
                No matches found.
              </p>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-blue-50',
                    option.value === value && 'bg-blue-50 text-blue-700'
                  )}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <span>{option.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { getInventoryReport, type InventoryItem } from '#/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table'
import { Skeleton } from '#/components/ui/skeleton'
import { Badge } from '#/components/ui/badge'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/items')({
  component: ItemsPage,
})

type AggregatedItem = {
  itemId: number
  name: string
  sku: string
  storageRequirement: string
  totalQuantity: number
  warehouses: number
}

function ItemsPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [storageFilter, setStorageFilter] = useState<'all' | 'cold' | 'standard'>('all')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const report = await getInventoryReport()
        setItems(report.items)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const aggregated = useMemo(() => aggregateItems(items), [items])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return aggregated.filter((item) => {
      const matchesQuery = term
        ? `${item.name} ${item.sku}`.toLowerCase().includes(term)
        : true
      const storage = item.storageRequirement.toLowerCase()
      const matchesStorage =
        storageFilter === 'all' ||
        (storageFilter === 'cold' && storage === 'cold') ||
        (storageFilter === 'standard' && storage !== 'cold')
      return matchesQuery && matchesStorage
    })
  }, [aggregated, query, storageFilter])

  return (
    <main className="page-wrap px-4 py-12">
      <section className="grid gap-6">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Items Catalog</CardTitle>
            <CardDescription>
              All items currently recorded in inventory across warehouses.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-slate-600">Search</label>
                <Input
                  placeholder="Search item or SKU"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'cold', 'standard'] as const).map((value) => (
                  <Button
                    key={value}
                    variant={storageFilter === value ? 'default' : 'outline'}
                    className={
                      storageFilter === value
                        ? 'rounded-full bg-blue-600 px-4 text-white'
                        : 'rounded-full border-slate-200 px-4 text-slate-600'
                    }
                    onClick={() => setStorageFilter(value)}
                  >
                    {value.charAt(0).toUpperCase()}
                    {value.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            {loading ? (
              <div className="grid gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-slate-500">No items available yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Total Qty</TableHead>
                    <TableHead>Warehouses</TableHead>
                    <TableHead>Storage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.itemId}>
                      <TableCell>
                        <p className="font-semibold text-slate-900">{item.name}</p>
                      </TableCell>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>{item.totalQuantity}</TableCell>
                      <TableCell>{item.warehouses}</TableCell>
                      <TableCell>
                        <Badge variant={item.storageRequirement === 'COLD' ? 'warning' : 'default'}>
                          {item.storageRequirement}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

function aggregateItems(items: InventoryItem[]): AggregatedItem[] {
  const map = new Map<number, AggregatedItem>()

  items.forEach((item) => {
    if (item.itemId === undefined) return
    const existing = map.get(item.itemId)
    const quantity = item.quantity ?? 0
    if (existing) {
      existing.totalQuantity += quantity
      existing.warehouses += 1
      return
    }
    map.set(item.itemId, {
      itemId: item.itemId,
      name: item.name ?? 'Item',
      sku: item.sku ?? '—',
      storageRequirement: item.storageRequirement ?? 'STANDARD',
      totalQuantity: quantity,
      warehouses: 1,
    })
  })

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
}

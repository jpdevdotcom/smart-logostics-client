import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { getInventoryReport, type InventoryItem } from '#/lib/api'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Skeleton } from '#/components/ui/skeleton'

type StorageFilter = 'all' | 'cold' | 'standard'
type StockFilter = 'all' | 'low'

export const Route = createFileRoute('/inventory')({
  component: InventoryPage,
})

function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [storageFilter, setStorageFilter] = useState<StorageFilter>('all')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const report = await getInventoryReport(page, pageSize)
        setItems(report.items)
        setTotalPages(report.meta?.totalPages ?? 1)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [page])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return items.filter((item) => {
      const matchesQuery = term
        ? `${item.name ?? ''} ${item.sku ?? ''} ${item.warehouseName ?? ''}`
            .toLowerCase()
            .includes(term)
        : true
      const storage = (item.storageRequirement ?? '').toLowerCase()
      const matchesStorage =
        storageFilter === 'all' ||
        (storageFilter === 'cold' && storage === 'cold') ||
        (storageFilter === 'standard' && storage !== 'cold')
      const quantity = item.quantity ?? 0
      const matchesStock =
        stockFilter === 'all' || (stockFilter === 'low' && quantity <= 10)
      return matchesQuery && matchesStorage && matchesStock
    })
  }, [items, query, storageFilter, stockFilter])

  useEffect(() => {
    setPage(1)
  }, [query, storageFilter, stockFilter])

  return (
    <main className="page-wrap px-4 py-12">
      <section className="grid gap-6">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
            <CardDescription>
              Search items and filter by storage requirement or low stock.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-slate-600">
                  Search
                </label>
                <Input
                  placeholder="Search item, SKU, or warehouse"
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
              <div className="flex flex-wrap gap-2">
                {(['all', 'low'] as const).map((value) => (
                  <Button
                    key={value}
                    variant={stockFilter === value ? 'default' : 'outline'}
                    className={
                      stockFilter === value
                        ? 'rounded-full bg-blue-600 px-4 text-white'
                        : 'rounded-full border-slate-200 px-4 text-slate-600'
                    }
                    onClick={() => setStockFilter(value)}
                  >
                    {value === 'all' ? 'All stock' : 'Low stock'}
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
              <p className="text-sm text-slate-500">
                No inventory matches your filters.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Storage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item, index) => (
                    <TableRow key={item.id ?? item.sku ?? index}>
                      <TableCell>
                        <p className="font-semibold text-slate-900">
                          {item.name ?? 'Item'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.sku ?? '—'}
                        </p>
                      </TableCell>
                      <TableCell>{item.warehouseName ?? '—'}</TableCell>
                      <TableCell>{item.quantity ?? 0}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.storageRequirement === 'COLD'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {item.storageRequirement ?? 'STANDARD'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {totalPages > 1 ? (
              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-slate-200 text-slate-600"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    className="border-slate-200 text-slate-600"
                    onClick={() =>
                      setPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

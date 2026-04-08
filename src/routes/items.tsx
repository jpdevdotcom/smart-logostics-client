import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  createItem,
  getInventoryReport,
  getItems,
  type InventoryItem,
  type ItemInput,
} from '#/lib/api'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Skeleton } from '#/components/ui/skeleton'
import { Badge } from '#/components/ui/badge'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Button } from '#/components/ui/button'
import { pushLoading } from '#/lib/notifications'
import { extractMessage } from '#/lib/api/helpers'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'

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
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [totalPages, setTotalPages] = useState(1)
  const [storageFilter, setStorageFilter] = useState<
    'all' | 'cold' | 'standard'
  >('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState<ItemInput>({
    name: '',
    storageRequirement: 'STANDARD',
  })
  const [addSubmitting, setAddSubmitting] = useState(false)

  const loadItems = async (currentPage: number) => {
    const [itemsResponse, inventoryReport] = await Promise.all([
      getItems(currentPage, pageSize),
      getInventoryReport(1, 100),
    ])

    setItems(itemsResponse.items)
    setInventoryItems(inventoryReport.items)
    setTotalPages(itemsResponse.meta.totalPages)
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        await loadItems(page)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [page])

  const handleAddItem = async () => {
    if (!addForm.name.trim()) return
    setAddSubmitting(true)
    const loadingToast = pushLoading('Adding item', 'Please wait...')
    try {
      await createItem(addForm)
      loadingToast.updateSuccess({
        title: 'Item added',
        message: `${addForm.name} was created.`,
        tone: 'success',
      })
      setShowAddModal(false)
      setAddForm({ name: '', storageRequirement: 'STANDARD' })
      await loadItems(page)
    } catch (error) {
      const message =
        typeof error === 'object' && error && 'response' in error
          ? extractMessage(
              (error as { response?: { data?: unknown } }).response?.data,
            )
          : undefined
      loadingToast.updateError({
        title: 'Failed to add item',
        message: message ?? 'Please review the details and try again.',
        tone: 'error',
      })
    } finally {
      setAddSubmitting(false)
    }
  }

  const aggregated = useMemo(() => {
    const totalsByItemId = new Map<
      number,
      { totalQuantity: number; warehouses: number }
    >()

    inventoryItems.forEach((item) => {
      if (item.itemId === undefined) return
      const existing = totalsByItemId.get(item.itemId)
      const quantity = item.quantity ?? 0

      if (existing) {
        existing.totalQuantity += quantity
        existing.warehouses += item.warehouseId ? 1 : 0
        return
      }

      totalsByItemId.set(item.itemId, {
        totalQuantity: quantity,
        warehouses: item.warehouseId ? 1 : 0,
      })
    })

    return items
      .map((item) => {
        const itemId = item.itemId
        if (itemId === undefined) return null

        const totals = totalsByItemId.get(itemId)

        return {
          itemId,
          name: item.name ?? 'Item',
          sku: item.sku ?? '—',
          storageRequirement: item.storageRequirement ?? 'STANDARD',
          totalQuantity: totals?.totalQuantity ?? 0,
          warehouses: totals?.warehouses ?? 0,
        }
      })
      .filter((item): item is AggregatedItem => Boolean(item))
      .sort((left, right) => compareNames(left.name, right.name))
  }, [inventoryItems, items])

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

  useEffect(() => {
    setPage(1)
  }, [query, storageFilter])

  return (
    <main className="page-wrap px-4 py-12">
      <section className="grid gap-6">
        <Card className="glass-panel">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Items Catalog</CardTitle>
              <CardDescription>
                All items currently recorded in inventory across warehouses.
              </CardDescription>
            </div>
            <Button
              className="bg-blue-600 text-white hover:bg-blue-500"
              onClick={() => setShowAddModal(true)}
            >
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-slate-600">
                  Search
                </label>
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
                        <p className="font-semibold text-slate-900">
                          {item.name}
                        </p>
                      </TableCell>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>{item.totalQuantity}</TableCell>
                      <TableCell>{item.warehouses}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.storageRequirement === 'COLD'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {item.storageRequirement}
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

      <Dialog
        open={showAddModal}
        onOpenChange={(open) => {
          if (!addSubmitting) setShowAddModal(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new item.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Name</Label>
              <Input
                placeholder="e.g. Frozen Peas 1kg"
                value={addForm.name}
                onChange={(e) =>
                  setAddForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Storage Requirement</Label>
              <div className="flex gap-2">
                {(['STANDARD', 'COLD'] as const).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={
                      addForm.storageRequirement === value
                        ? 'default'
                        : 'outline'
                    }
                    className={
                      addForm.storageRequirement === value
                        ? 'rounded-full bg-blue-600 px-4 text-white'
                        : 'rounded-full border-slate-200 px-4 text-slate-600'
                    }
                    onClick={() =>
                      setAddForm((prev) => ({
                        ...prev,
                        storageRequirement: value,
                      }))
                    }
                  >
                    {value}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-slate-200"
              onClick={() => setShowAddModal(false)}
              disabled={addSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 text-white hover:bg-blue-500"
              onClick={() => void handleAddItem()}
              disabled={addSubmitting || !addForm.name.trim()}
            >
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function compareNames(left: string, right: string) {
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}
